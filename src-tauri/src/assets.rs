//! What a dropped file becomes on disk.
//!
//! The shell owns every part of this: the native drop event, classification,
//! hashing, de-duplication, phone-native conversion, the atomic copy, and the
//! manifest. The web view is handed a finished reference relative to the
//! chapter and never sees an operating-system path.
//!
//! Two rules give the module its shape.
//!
//! **The web view never names a file.** The drop arrives in Rust as a window
//! event; the paths are held in [`DropQueue`] under a fresh nonce that expires
//! in [`NONCE_LIFETIME`], and [`drop_on_chapter`] takes the nonce rather than
//! the paths. A script inside the web view can therefore ask the shell to
//! process the files the author just dropped, and nothing else — not
//! `~/.ssh/id_rsa`, not a file it invented.
//!
//! **Identity is the content hash**, so two drops of one file under two names
//! cost one copy and one manifest entry (`05-internals.md` section 6).

use std::collections::BTreeMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use percent_encoding::{percent_decode_str, utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::convert;
use crate::document;

/// The manifest, at the document root. One per document.
pub const MANIFEST_FILE: &str = "assets.json";

/// The folder a copied asset lands in, beside the chapter.
pub const ASSETS_FOLDER: &str = "assets";

/// The threshold when `document.yaml` names none: 8 MiB.
pub const DEFAULT_THRESHOLD_BYTES: u64 = 8 * 1024 * 1024;

/// How long the paths from one drop stay claimable.
///
/// Long enough for the web view to map the drop point and call back, short
/// enough that a nonce left lying around is worth nothing.
pub const NONCE_LIFETIME: Duration = Duration::from_secs(30);

/// The longest a written asset name may be, in bytes.
const MAX_NAME_BYTES: usize = 200;

/// How many bytes classification looks at.
const MAGIC_BYTES: usize = 32;

/// The root name recorded for a referenced asset whose own folder cannot be
/// named without naming the author's machine.
const FALLBACK_ROOT: &str = "dropped";

/// Distinguishes concurrent temporary files within one process.
static NEXT_TEMP: AtomicU64 = AtomicU64::new(0);

/// Everything outside the set a Markdown destination reads unquoted.
///
/// The space, the parentheses, the angle brackets, the quotes, the backslash,
/// the backtick and the percent sign all break a destination, so the encode is
/// an allow-list: letters, digits, and `-._~/`.
const REFERENCE_SET: &AsciiSet = &NON_ALPHANUMERIC
    .remove(b'-')
    .remove(b'.')
    .remove(b'_')
    .remove(b'~')
    .remove(b'/');

/// What a file is, as far as the canon is concerned.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AssetKind {
    Image,
    Video,
    File,
}

/// Whether the bytes were copied into the document folder or left in place.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AssetMode {
    Copied,
    Referenced,
}

/// What classification decided, before the threshold has a say.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Class {
    Image,
    /// A format only a phone writes, and the name of the format it came from.
    PhoneNative(&'static str),
    Video,
    File,
}

impl Class {
    /// The kind the manifest records for this class.
    pub fn kind(self) -> AssetKind {
        match self {
            Class::Image | Class::PhoneNative(_) => AssetKind::Image,
            Class::Video => AssetKind::Video,
            Class::File => AssetKind::File,
        }
    }
}

/// One accepted file.
#[derive(Debug, Clone, Serialize)]
pub struct DropOutcome {
    pub kind: AssetKind,
    /// Percent-encoded, relative to the chapter, ready for the text.
    pub reference: String,
    pub id: String,
    /// The size of the source, before any conversion.
    pub bytes: u64,
    pub mode: AssetMode,
    pub converted_from: Option<String>,
    pub deduplicated: bool,
}

/// One file the gesture would not take, and why.
#[derive(Debug, Clone, Serialize)]
pub struct DropRefusal {
    pub name: String,
    pub reason: String,
}

/// What one drop produced. One bad file does not cost the author the others.
#[derive(Debug, Clone, Default, Serialize)]
pub struct DropReport {
    pub accepted: Vec<DropOutcome>,
    pub refused: Vec<DropRefusal>,
}

/// What a pasted or dragged address turns out to be.
#[derive(Debug, Clone, Serialize)]
pub struct PasteOutcome {
    /// `video` for a direct media address, `other` for everything else.
    pub kind: String,
    /// The role a video block would name it under: `remote` or `gated`.
    pub role: Option<String>,
    /// The address, verbatim. Nothing is fetched and nothing is guessed at.
    pub reference: String,
}

/// One entry in `assets.json`, per `05-internals.md` section 6.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetEntry {
    pub id: String,
    pub kind: AssetKind,
    pub bytes: u64,
    pub mode: AssetMode,
    /// The named root a referenced asset lives under. Never a machine path.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub root: Option<String>,
    /// Relative to the document root when copied, to the named root when
    /// referenced. Never absolute.
    pub path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub converted_from: Option<String>,
    /// The full digest of the source bytes, so de-duplication does not rest on
    /// a truncation.
    pub source_sha256: String,
    /// Anything a later phase wrote — `store`, `published`, `poster` — kept
    /// as it was found rather than dropped on the next write.
    #[serde(flatten)]
    pub extra: BTreeMap<String, serde_json::Value>,
}

/// `assets.json` itself.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub schema_version: u32,
    pub hash: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub threshold_bytes: Option<u64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub roots: Vec<String>,
    #[serde(default)]
    pub assets: Vec<AssetEntry>,
    #[serde(flatten)]
    pub extra: BTreeMap<String, serde_json::Value>,
}

impl Default for Manifest {
    fn default() -> Self {
        Manifest {
            schema_version: 1,
            hash: "sha256".to_string(),
            threshold_bytes: None,
            roots: Vec::new(),
            assets: Vec::new(),
            extra: BTreeMap::new(),
        }
    }
}

// ---------------------------------------------------------------- the nonce

/// The paths from one drop, waiting to be claimed.
struct PendingDrop {
    nonce: String,
    paths: Vec<PathBuf>,
    at: Instant,
}

/// Every drop the shell has seen and the web view has not claimed yet.
#[derive(Default)]
pub struct DropQueue(Mutex<Vec<PendingDrop>>);

impl DropQueue {
    /// Hold a drop's paths and mint the nonce that claims them.
    pub fn offer(&self, paths: Vec<PathBuf>) -> Result<String, String> {
        let nonce = mint_nonce()?;
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the drop queue is unreadable".to_string())?;
        let now = Instant::now();
        held.retain(|pending| now.duration_since(pending.at) < NONCE_LIFETIME);
        held.push(PendingDrop {
            nonce: nonce.clone(),
            paths,
            at: now,
        });
        Ok(nonce)
    }

    /// Take the paths a nonce names. An unknown or expired nonce is refused.
    pub fn claim(&self, nonce: &str) -> Result<Vec<PathBuf>, String> {
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the drop queue is unreadable".to_string())?;
        let now = Instant::now();
        held.retain(|pending| now.duration_since(pending.at) < NONCE_LIFETIME);
        let index = held
            .iter()
            .position(|pending| pending.nonce == nonce)
            .ok_or_else(|| "that drop is no longer on offer".to_string())?;
        Ok(held.remove(index).paths)
    }
}

/// Sixteen random bytes as lower-case unpadded base32: twenty-six characters.
fn mint_nonce() -> Result<String, String> {
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).map_err(|error| format!("cannot mint a nonce: {error}"))?;
    Ok(base32(&bytes))
}

/// RFC 4648 base32, lower-cased and unpadded.
fn base32(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 32] = b"abcdefghijklmnopqrstuvwxyz234567";
    let mut out = String::with_capacity(bytes.len().div_ceil(5) * 8);
    let mut buffer: u16 = 0;
    let mut bits = 0u32;
    for byte in bytes {
        buffer = (buffer << 8) | u16::from(*byte);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            let index = ((buffer >> bits) & 0x1f) as usize;
            out.push(ALPHABET[index] as char);
        }
    }
    if bits > 0 {
        let index = ((buffer << (5 - bits)) & 0x1f) as usize;
        out.push(ALPHABET[index] as char);
    }
    out
}

// ------------------------------------------------------------ classification

/// What a file is, decided on its first bytes rather than on its extension.
///
/// An extension is what the sender typed; the magic number is what the file
/// says about itself, and the whole gesture is about not making the author
/// type anything.
pub fn classify(head: &[u8], name: &str) -> Class {
    let lower = name.to_ascii_lowercase();
    if head.starts_with(&[0xFF, 0xD8, 0xFF])
        || head.starts_with(b"\x89PNG\r\n\x1a\n")
        || head.starts_with(b"GIF8")
    {
        return Class::Image;
    }
    if head.len() >= 12 && head.starts_with(b"RIFF") {
        if &head[8..12] == b"WEBP" {
            return Class::Image;
        }
        return Class::File;
    }
    if head.starts_with(&[0x1A, 0x45, 0xDF, 0xA3]) {
        return Class::Video;
    }
    if head.len() >= 12 && &head[4..8] == b"ftyp" {
        let brand = &head[8..12];
        return match brand {
            b"heic" | b"heix" | b"heim" | b"heis" | b"hevc" | b"hevx" | b"hevm" | b"hevs" => {
                Class::PhoneNative("heic")
            }
            b"mif1" | b"msf1" => Class::PhoneNative("heif"),
            b"avif" | b"avis" => Class::Image,
            _ => Class::Video,
        };
    }
    // TIFF, which is what a DNG is. Only the name tells the two apart.
    if head.starts_with(b"II*\0") || head.starts_with(b"MM\0*") {
        if lower.ends_with(".dng") {
            return Class::PhoneNative("dng");
        }
        return Class::Image;
    }
    // SVG has no magic number, so the name has to carry it.
    if lower.ends_with(".svg") {
        let start = String::from_utf8_lossy(head);
        let start = start.trim_start();
        if start.starts_with("<?xml") || start.starts_with("<svg") || start.starts_with("<!--") {
            return Class::Image;
        }
    }
    Class::File
}

/// Whether an image carries metadata a copy must not take with it.
///
/// EXIF on a phone photograph holds GPS coordinates and the camera owner's
/// name, which is exactly what "no machine in the document" forbids. ICC
/// colour profiles are not metadata about the author and are left alone.
pub fn carries_metadata(bytes: &[u8]) -> bool {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return jpeg_carries_metadata(bytes);
    }
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return png_carries_metadata(bytes);
    }
    if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        return riff_carries_metadata(bytes);
    }
    if is_gif(bytes) {
        return gif_carries_metadata(bytes);
    }
    if is_svg(bytes) {
        return svg_carries_metadata(bytes);
    }
    false
}

/// The format of a picture whose metadata this phase can neither read past nor
/// take out, or `None` where the copy is safe to make.
///
/// AVIF keeps EXIF and XMP as items inside the ISO base media container, where
/// removing one means rewriting the item table and every offset that points
/// through it. Rewriting a container to strip a box is how a picture is quietly
/// corrupted, so the drop is refused and the author is told what to do instead.
pub fn unstrippable_metadata(bytes: &[u8]) -> Option<&'static str> {
    if is_avif(bytes) && avif_carries_metadata(bytes) {
        return Some("AVIF");
    }
    None
}

/// APP1 (EXIF and XMP), APP13 (IPTC), and comment segments.
///
/// Anything the walk cannot make sense of counts as metadata: a marker where
/// none belongs means this is not the JPEG it claims to be, and the safe answer
/// to "is there something in here" is yes.
fn jpeg_carries_metadata(bytes: &[u8]) -> bool {
    let mut at = 2usize;
    while at + 4 <= bytes.len() {
        if bytes[at] != 0xFF {
            return true;
        }
        let marker = bytes[at + 1];
        // Start of scan, or the end: no more headers to read.
        if marker == 0xDA || marker == 0xD9 {
            return false;
        }
        if matches!(marker, 0xE1 | 0xED | 0xFE) {
            return true;
        }
        let length = usize::from(u16::from_be_bytes([bytes[at + 2], bytes[at + 3]]));
        if length < 2 {
            return true;
        }
        at += 2 + length;
    }
    false
}

/// Whether the bytes open as a GIF.
fn is_gif(bytes: &[u8]) -> bool {
    bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a")
}

/// Whether the bytes open as an AVIF: an ISO base media file branded `avif`.
fn is_avif(bytes: &[u8]) -> bool {
    bytes.len() >= 12 && &bytes[4..8] == b"ftyp" && bytes[8..].starts_with(b"avif")
}

/// Whether the bytes look like an SVG document.
fn is_svg(bytes: &[u8]) -> bool {
    let head = &bytes[..bytes.len().min(1024)];
    let text = String::from_utf8_lossy(head);
    text.contains("<svg") || (text.contains("<?xml") && bytes.len() > 4)
}

/// Where a GIF's blocks start: past the header, the screen descriptor, and the
/// global colour table where one is declared.
fn gif_blocks_start(bytes: &[u8]) -> Option<usize> {
    if bytes.len() < 13 {
        return None;
    }
    let flags = bytes[10];
    let mut at = 13usize;
    if flags & 0x80 != 0 {
        let size = 3usize << ((flags & 0x07) + 1);
        at = at.checked_add(size)?;
    }
    (at <= bytes.len()).then_some(at)
}

/// Comment (`0x21 0xFE`) and application (`0x21 0xFF`) extension blocks.
///
/// The application block is where a GIF carries XMP, which is where an editor
/// writes the file's history and, with it, the author's own paths.
fn gif_carries_metadata(bytes: &[u8]) -> bool {
    let Some(mut at) = gif_blocks_start(bytes) else {
        return true;
    };
    while at < bytes.len() {
        match bytes[at] {
            0x3B => return false,
            0x21 => {
                let Some(&label) = bytes.get(at + 1) else {
                    return true;
                };
                if label == 0xFE || label == 0xFF {
                    return true;
                }
                let Some(next) = gif_skip_sub_blocks(bytes, at + 2) else {
                    return true;
                };
                at = next;
            }
            0x2C => {
                let Some(next) = gif_skip_image(bytes, at) else {
                    return true;
                };
                at = next;
            }
            // Not a block this reader knows: treat it as something to strip
            // rather than as nothing at all.
            _ => return true,
        }
    }
    false
}

/// Step past a run of length-prefixed sub-blocks and the zero that ends them.
fn gif_skip_sub_blocks(bytes: &[u8], mut at: usize) -> Option<usize> {
    loop {
        let length = usize::from(*bytes.get(at)?);
        at = at.checked_add(1 + length)?;
        if length == 0 {
            return (at <= bytes.len()).then_some(at);
        }
    }
}

/// Step past one image descriptor, its local colour table, and its data.
fn gif_skip_image(bytes: &[u8], at: usize) -> Option<usize> {
    let flags = *bytes.get(at + 9)?;
    let mut next = at.checked_add(10)?;
    if flags & 0x80 != 0 {
        next = next.checked_add(3usize << ((flags & 0x07) + 1))?;
    }
    // The LZW minimum code size, then the image's own sub-blocks.
    next = next.checked_add(1)?;
    gif_skip_sub_blocks(bytes, next)
}

/// A GIF without its comment and application extension blocks.
fn strip_gif(bytes: &[u8]) -> Vec<u8> {
    let Some(start) = gif_blocks_start(bytes) else {
        return bytes.to_vec();
    };
    let mut out = Vec::with_capacity(bytes.len());
    out.extend_from_slice(&bytes[..start]);
    let mut at = start;
    while at < bytes.len() {
        match bytes[at] {
            0x3B => {
                out.push(0x3B);
                return out;
            }
            0x21 => {
                let Some(&label) = bytes.get(at + 1) else {
                    break;
                };
                let Some(next) = gif_skip_sub_blocks(bytes, at + 2) else {
                    break;
                };
                if label != 0xFE && label != 0xFF {
                    out.extend_from_slice(&bytes[at..next]);
                }
                at = next;
            }
            0x2C => {
                let Some(next) = gif_skip_image(bytes, at) else {
                    break;
                };
                out.extend_from_slice(&bytes[at..next]);
                at = next;
            }
            _ => break,
        }
    }
    // A file this reader lost its place in keeps its tail rather than being
    // truncated into something no reader will open.
    out.extend_from_slice(&bytes[at..]);
    out
}

/// Whether an SVG carries a comment, a metadata element, or a local path.
fn svg_carries_metadata(bytes: &[u8]) -> bool {
    let text = String::from_utf8_lossy(bytes);
    strip_svg_text(&text) != text
}

/// The elements an SVG editor writes its own record into.
const SVG_METADATA_ELEMENTS: [&str; 3] =
    ["metadata", "sodipodi:namedview", "inkscape:templateinfo"];

/// An SVG without its comments, its metadata elements, and any attribute whose
/// value names a file on the machine it was drawn on.
fn strip_svg_text(text: &str) -> String {
    let mut out = remove_between(text, "<!--", "-->");
    for element in SVG_METADATA_ELEMENTS {
        out = remove_between(&out, &format!("<{element}"), &format!("</{element}>"));
        out = remove_empty_element(&out, element);
    }
    remove_local_path_attributes(&out)
}

/// Everything from each `open` to the `close` that follows it, taken out.
fn remove_between(text: &str, open: &str, close: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(start) = rest.find(open) {
        out.push_str(&rest[..start]);
        let after = &rest[start + open.len()..];
        match after.find(close) {
            Some(end) => rest = &after[end + close.len()..],
            None => {
                // No closing tag: this is not the element it looked like, and
                // dropping the rest of the file would be a worse answer than
                // leaving it alone.
                out.push_str(open);
                out.push_str(after);
                return out;
            }
        }
    }
    out.push_str(rest);
    out
}

/// A self-closing `<name ... />` with no closing tag of its own.
fn remove_empty_element(text: &str, name: &str) -> String {
    let open = format!("<{name}");
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(start) = rest.find(&open) {
        let after = &rest[start + open.len()..];
        let Some(end) = after.find('>') else {
            break;
        };
        if !after[..end].ends_with('/') {
            let keep = start + open.len() + end + 1;
            out.push_str(&rest[..keep]);
            rest = &rest[keep..];
            continue;
        }
        out.push_str(&rest[..start]);
        rest = &after[end + 1..];
    }
    out.push_str(rest);
    out
}

/// Every `name="value"` whose value names a file on somebody's machine.
fn remove_local_path_attributes(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(quote) = rest.find('"') {
        let after = &rest[quote + 1..];
        let Some(end) = after.find('"') else {
            break;
        };
        let value = &after[..end];
        if !names_a_local_file(value) {
            out.push_str(&rest[..quote + 1 + end + 1]);
            rest = &rest[quote + 1 + end + 1..];
            continue;
        }
        // Back up over ` name=` so the whole attribute goes, not its value.
        let before = &rest[..quote];
        let cut = before
            .rfind(|c: char| c.is_whitespace())
            .map(|at| at + 1)
            .unwrap_or(0);
        out.push_str(&before[..cut]);
        rest = &rest[quote + 1 + end + 1..];
    }
    out.push_str(rest);
    out
}

/// Whether an attribute value names a file on the machine it was written on.
fn names_a_local_file(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.starts_with("file:") {
        return true;
    }
    // A Windows drive letter, or a POSIX absolute path with a folder in it.
    if trimmed.len() > 2
        && trimmed.as_bytes()[1] == b':'
        && matches!(trimmed.as_bytes()[2], b'/' | b'\\')
    {
        return true;
    }
    trimmed.starts_with('/') && trimmed[1..].contains('/')
}

/// Whether an AVIF declares an EXIF or XMP item in its `meta` box.
///
/// Read as a declaration rather than parsed out: the item table names what the
/// container carries, and a container that names either is refused.
fn avif_carries_metadata(bytes: &[u8]) -> bool {
    bytes
        .windows(4)
        .any(|window| window == b"Exif" || window == b"iTXt")
        || bytes
            .windows(19)
            .any(|window| window == b"application/rdf+xml")
}

/// `eXIf` and the three text chunks.
fn png_carries_metadata(bytes: &[u8]) -> bool {
    let mut at = 8usize;
    while at + 8 <= bytes.len() {
        let length = u32::from_be_bytes([bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]]);
        let kind = &bytes[at + 4..at + 8];
        if matches!(kind, b"eXIf" | b"tEXt" | b"iTXt" | b"zTXt") {
            return true;
        }
        if kind == b"IEND" {
            return false;
        }
        let Some(step) = (length as usize).checked_add(12) else {
            return false;
        };
        let Some(next) = at.checked_add(step) else {
            return false;
        };
        at = next;
    }
    false
}

/// The same bytes with every metadata segment or chunk taken out.
///
/// Lossless: the image data is not touched, only the boxes around it. It runs
/// over a conversion as well as over a copy, because ImageIO writes an EXIF
/// block of its own when it encodes a JPEG, and "no EXIF" has to mean none.
pub fn without_metadata(bytes: &[u8]) -> Vec<u8> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return strip_jpeg(bytes);
    }
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return strip_png(bytes);
    }
    if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        return strip_riff(bytes);
    }
    if is_gif(bytes) {
        return strip_gif(bytes);
    }
    if is_svg(bytes) {
        return strip_svg_text(&String::from_utf8_lossy(bytes)).into_bytes();
    }
    bytes.to_vec()
}

/// A JPEG without its APP1, APP13 and comment segments.
fn strip_jpeg(bytes: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(bytes.len());
    out.extend_from_slice(&bytes[..2]);
    let mut at = 2usize;
    while at + 4 <= bytes.len() {
        if bytes[at] != 0xFF {
            break;
        }
        let marker = bytes[at + 1];
        if marker == 0xDA || marker == 0xD9 {
            break;
        }
        let length = usize::from(u16::from_be_bytes([bytes[at + 2], bytes[at + 3]]));
        if length < 2 {
            break;
        }
        let end = (at + 2 + length).min(bytes.len());
        if !matches!(marker, 0xE1 | 0xED | 0xFE) {
            out.extend_from_slice(&bytes[at..end]);
        }
        at = end;
    }
    out.extend_from_slice(&bytes[at..]);
    out
}

/// A PNG without its `eXIf` and text chunks.
fn strip_png(bytes: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(bytes.len());
    out.extend_from_slice(&bytes[..8]);
    let mut at = 8usize;
    while at + 8 <= bytes.len() {
        let length =
            u32::from_be_bytes([bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]]) as usize;
        let kind = &bytes[at + 4..at + 8];
        let Some(end) = at
            .checked_add(length + 12)
            .filter(|end| *end <= bytes.len())
        else {
            break;
        };
        if !matches!(kind, b"eXIf" | b"tEXt" | b"iTXt" | b"zTXt") {
            out.extend_from_slice(&bytes[at..end]);
        }
        at = end;
        if kind == b"IEND" {
            break;
        }
    }
    out.extend_from_slice(&bytes[at..]);
    out
}

/// A WebP without its `EXIF` and `XMP ` chunks, with the RIFF size corrected.
fn strip_riff(bytes: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(bytes.len());
    out.extend_from_slice(&bytes[..12]);
    let mut at = 12usize;
    while at + 8 <= bytes.len() {
        let length =
            u32::from_le_bytes([bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]])
                as usize;
        let padded = length + (length % 2);
        let Some(end) = at.checked_add(8 + padded).filter(|end| *end <= bytes.len()) else {
            break;
        };
        let kind = &bytes[at..at + 4];
        if kind != b"EXIF" && kind != b"XMP " {
            out.extend_from_slice(&bytes[at..end]);
        }
        at = end;
    }
    out.extend_from_slice(&bytes[at..]);
    let size = u32::try_from(out.len().saturating_sub(8)).unwrap_or(0);
    out[4..8].copy_from_slice(&size.to_le_bytes());
    out
}

/// `EXIF` and `XMP ` chunks in a RIFF container.
fn riff_carries_metadata(bytes: &[u8]) -> bool {
    let mut at = 12usize;
    while at + 8 <= bytes.len() {
        let kind = &bytes[at..at + 4];
        if kind == b"EXIF" || kind == b"XMP " {
            return true;
        }
        let length =
            u32::from_le_bytes([bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]])
                as usize;
        let Some(next) = at.checked_add(8 + length + (length % 2)) else {
            return false;
        };
        at = next;
    }
    false
}

// ------------------------------------------------------------------- naming

/// The name a copy is written under.
///
/// The author's own file name, kept: leading dots stripped so the copy is not
/// hidden from the walk, control characters and the separators replaced, and
/// truncated on a character boundary so the name is still valid UTF-8.
pub fn safe_name(name: &str, extension: Option<&str>) -> String {
    let base = Path::new(name)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| name.to_string());
    let mut cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_control() || matches!(c, ':' | '/' | '\\') {
                '-'
            } else {
                c
            }
        })
        .collect();
    cleaned = cleaned.trim_start_matches('.').trim().to_string();
    if cleaned.is_empty() {
        cleaned = "asset".to_string();
    }
    if let Some(extension) = extension {
        let stem = match cleaned.rsplit_once('.') {
            Some((stem, _)) if !stem.is_empty() => stem.to_string(),
            _ => cleaned.clone(),
        };
        cleaned = format!("{stem}.{extension}");
    }
    truncate_bytes(&cleaned, MAX_NAME_BYTES)
}

/// Cut a string to at most `limit` bytes, on a character boundary.
fn truncate_bytes(text: &str, limit: usize) -> String {
    if text.len() <= limit {
        return text.to_string();
    }
    let mut end = limit;
    while end > 0 && !text.is_char_boundary(end) {
        end -= 1;
    }
    text[..end].to_string()
}

/// The stem and extension of a name, for building `-2`, `-3` variants.
fn split_name(name: &str) -> (&str, Option<&str>) {
    match name.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() => (stem, Some(extension)),
        _ => (name, None),
    }
}

/// The name a referenced asset's root is recorded under.
///
/// A referenced file stays where it is, so the manifest names the folder it
/// sits in rather than the path to it. A folder named after the author — the
/// home directory, or the account name — would put the machine into the
/// document, so it falls back to a generic name and the author names the root
/// properly in the app's settings.
pub fn root_name_for(parent: Option<&str>, forbidden: &[&str]) -> String {
    let Some(parent) = parent else {
        return FALLBACK_ROOT.to_string();
    };
    let cleaned = safe_name(parent, None);
    if cleaned.is_empty()
        || forbidden
            .iter()
            .any(|name| name.eq_ignore_ascii_case(&cleaned))
    {
        return FALLBACK_ROOT.to_string();
    }
    cleaned
}

/// The names a referenced root must not take, read from the environment.
fn forbidden_root_names() -> Vec<String> {
    let mut names = Vec::new();
    if let Ok(user) = std::env::var("USER") {
        names.push(user);
    }
    if let Ok(home) = std::env::var("HOME") {
        if let Some(name) = Path::new(&home).file_name() {
            names.push(name.to_string_lossy().into_owned());
        }
    }
    names
}

// ------------------------------------------------------------------- paths

/// `target` written relative to `base`, with `/` separators.
///
/// Both are absolute and already canonical. A path with no common root — two
/// volumes — has no relative form and returns `None`.
pub fn relative_from(base: &Path, target: &Path) -> Option<String> {
    let base: Vec<Component> = base.components().collect();
    let target: Vec<Component> = target.components().collect();
    let shared = base
        .iter()
        .zip(target.iter())
        .take_while(|(a, b)| a == b)
        .count();
    if shared == 0 {
        return None;
    }
    let mut parts: Vec<String> = Vec::new();
    for _ in shared..base.len() {
        parts.push("..".to_string());
    }
    for component in &target[shared..] {
        parts.push(component.as_os_str().to_string_lossy().into_owned());
    }
    if parts.is_empty() {
        return None;
    }
    Some(parts.join("/"))
}

/// A reference the Markdown destination reads unquoted.
pub fn encode_reference(path: &str) -> String {
    utf8_percent_encode(path, REFERENCE_SET).to_string()
}

/// The name a reference points at, with its percent escapes read back.
///
/// The inverse of [`encode_reference`], and the shell's one decode: the deck's
/// image reader and the publish stage both open a file named by a reference
/// the author's text carries, and this is what turns `assets/a%20lantern.jpg`
/// back into the `a lantern.jpg` the drop wrote to disk. Everything else in
/// the shell handles a reference without reading its escapes, so a name is
/// never decoded twice.
///
/// An escape that decodes to a path separator or to `..` is refused: what a
/// reference may name is what it names in plain text, and an escape must not
/// be able to widen that. A segment written `..` is passed through for
/// [`crate::document::confine_path`] to refuse on the resolved path, so a
/// climb is reported the same way whether or not it was spelt out.
pub fn decode_reference(reference: &str) -> Result<String, String> {
    let mut decoded = Vec::new();
    for segment in reference.split(['/', '\\']) {
        let read = percent_decode_str(segment)
            .decode_utf8()
            .map_err(|_| format!("{reference} is not a name this document can read"))?;
        if read.contains('/') || read.contains('\\') || (read == ".." && segment != "..") {
            return Err(format!("{reference} is outside the open document"));
        }
        decoded.push(read.into_owned());
    }
    Ok(decoded.join("/"))
}

/// Write bytes where a half-written file can never be seen.
///
/// The same shape as `document::write_chapter_text`: a dot-prefixed temporary
/// in the destination folder, so the same filesystem and an atomic rename,
/// and the dot keeps a concurrent walk from listing it.
pub fn write_atomically(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("{} has no folder", path.display()))?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .ok_or_else(|| format!("{} does not name a file", path.display()))?;
    let temp = parent.join(format!(
        ".{name}.{}.{}.tmp",
        std::process::id(),
        NEXT_TEMP.fetch_add(1, Ordering::Relaxed)
    ));
    let written = (|| -> std::io::Result<()> {
        let mut file = fs::File::create(&temp)?;
        file.write_all(bytes)?;
        file.sync_all()
    })();
    if let Err(error) = written {
        let _ = fs::remove_file(&temp);
        return Err(format!("cannot write {name}: {error}"));
    }
    fs::rename(&temp, path).map_err(|error| {
        let _ = fs::remove_file(&temp);
        format!("cannot replace {name}: {error}")
    })
}

// ------------------------------------------------------------------ hashing

/// The digest of a file's bytes, without holding the file in memory.
pub fn hash_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|e| format!("cannot read the file: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 64 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|e| format!("cannot read the file: {e}"))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

/// The digest of bytes already in hand.
pub fn hash_bytes(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

/// The id a digest yields: its first sixteen hex characters, as section 6.
pub fn id_of(digest: &str) -> String {
    digest.chars().take(16).collect()
}

// ------------------------------------------------------------------ manifest

/// Read `assets.json`, or an empty manifest when there is none.
pub fn read_manifest(path: &Path) -> Result<Manifest, String> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(Manifest::default())
        }
        Err(error) => return Err(format!("cannot read {MANIFEST_FILE}: {error}")),
    };
    if text.trim().is_empty() {
        return Ok(Manifest::default());
    }
    serde_json::from_str(&text).map_err(|error| format!("cannot read {MANIFEST_FILE}: {error}"))
}

/// Write `assets.json` back, atomically.
pub fn write_manifest(path: &Path, manifest: &Manifest) -> Result<(), String> {
    let mut text = serde_json::to_string_pretty(manifest)
        .map_err(|error| format!("cannot write {MANIFEST_FILE}: {error}"))?;
    text.push('\n');
    write_atomically(path, text.as_bytes())
}

// -------------------------------------------------------------------- ingest

/// What one drop is measured against.
pub struct DropContext<'a> {
    /// The open document's canonical root.
    pub root: &'a Path,
    /// The folder the chapter sits in, which is where `assets/` goes.
    pub chapter_folder: &'a Path,
    /// The size at or above which an asset is referenced rather than copied.
    pub threshold: u64,
}

/// Take one file into the document.
///
/// The steps are section 6's, in order: resolve, classify, hash the source,
/// de-duplicate, name, convert or copy, record.
pub fn ingest(
    context: &DropContext,
    source: &Path,
    manifest: &mut Manifest,
) -> Result<DropOutcome, String> {
    let source = fs::canonicalize(source).map_err(|e| format!("cannot read the file: {e}"))?;
    let metadata = fs::metadata(&source).map_err(|e| format!("cannot read the file: {e}"))?;
    if metadata.is_dir() {
        return Err("a folder is not a file to drop".to_string());
    }
    let bytes = metadata.len();
    let name = source
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .ok_or_else(|| "that does not name a file".to_string())?;

    let mut head = vec![0u8; MAGIC_BYTES];
    let read = {
        let mut file = fs::File::open(&source).map_err(|e| format!("cannot read the file: {e}"))?;
        read_at_most(&mut file, &mut head)?
    };
    head.truncate(read);
    let class = classify(&head, &name);

    let digest = hash_file(&source)?;
    let id = id_of(&digest);

    // Two drops of one file into one Part cost one copy, under any file name.
    if let Some((entry, reference)) = reuse(context, manifest, &digest) {
        return Ok(DropOutcome {
            kind: entry.kind,
            reference,
            id: entry.id.clone(),
            bytes: entry.bytes,
            mode: entry.mode,
            converted_from: entry.converted_from.clone(),
            deduplicated: true,
        });
    }

    // Conversion belongs to the drop at any size: a phone-native image is
    // never refused for being large, because the format is what makes it
    // unreadable elsewhere.
    let phone_native = matches!(class, Class::PhoneNative(_));
    if !phone_native && bytes >= context.threshold {
        return reference_in_place(manifest, &source, &name, class, bytes, &digest, &id);
    }

    let converted_from = match class {
        Class::PhoneNative(format) => Some(format.to_string()),
        _ => None,
    };

    let (payload, extension) = prepare(&source, class)?;

    let assets = context.chapter_folder.join(ASSETS_FOLDER);
    fs::create_dir_all(&assets).map_err(|e| format!("cannot make the assets folder: {e}"))?;

    let wanted = safe_name(&name, extension);
    let chosen = choose_name(&assets, &wanted, &payload)?;
    let destination = assets.join(&chosen);
    match payload {
        Payload::Bytes(ref bytes) => write_atomically(&destination, bytes)?,
        Payload::Copy => copy_atomically(&source, &destination)?,
    }

    let recorded = relative_from(context.root, &destination)
        .ok_or_else(|| "the copy landed outside the document".to_string())?;
    record(
        manifest,
        AssetEntry {
            id: id.clone(),
            kind: class.kind(),
            bytes,
            mode: AssetMode::Copied,
            root: None,
            path: recorded,
            converted_from: converted_from.clone(),
            source_sha256: digest,
            extra: BTreeMap::new(),
        },
    );

    Ok(DropOutcome {
        kind: class.kind(),
        reference: encode_reference(&format!("{ASSETS_FOLDER}/{chosen}")),
        id,
        bytes,
        mode: AssetMode::Copied,
        converted_from,
        deduplicated: false,
    })
}

/// Read as much as the buffer holds, or as much as there is.
fn read_at_most(file: &mut fs::File, buffer: &mut [u8]) -> Result<usize, String> {
    let mut filled = 0usize;
    while filled < buffer.len() {
        let read = file
            .read(&mut buffer[filled..])
            .map_err(|e| format!("cannot read the file: {e}"))?;
        if read == 0 {
            break;
        }
        filled += read;
    }
    Ok(filled)
}

/// What goes into the assets folder.
enum Payload {
    /// Bytes that exist only in memory: a conversion, or a strip.
    Bytes(Vec<u8>),
    /// The source's own bytes, copied.
    Copy,
}

/// Decide what bytes to write, and under what extension.
///
/// A phone-native image is converted, because no other machine reads the
/// format and a re-encode is the only way out of it. A copy is never
/// re-encoded: an image carrying EXIF loses the boxes around the picture and
/// keeps the picture, so a JPEG the author dropped arrives with the same
/// compressed scan it left with. Everything else is a byte copy, so a
/// chapter's own PNGs and a spreadsheet arrive unchanged.
fn prepare(source: &Path, class: Class) -> Result<(Payload, Option<&'static str>), String> {
    if let Class::PhoneNative(format) = class {
        // The ceiling is checked before the file is read, so an image too large
        // to decode never becomes memory in the first place.
        let size = fs::metadata(source)
            .map_err(|e| format!("cannot read the file: {e}"))?
            .len();
        convert::check_source_size(size)?;
        let bytes = fs::read(source).map_err(|e| format!("cannot read the file: {e}"))?;
        let jpeg = convert::to_web_jpeg(&bytes)
            .map_err(|error| format!("the {format} image could not be converted: {error}"))?;
        return Ok((Payload::Bytes(without_metadata(&jpeg)), Some("jpg")));
    }
    if class == Class::Image {
        let bytes = fs::read(source).map_err(|e| format!("cannot read the file: {e}"))?;
        if let Some(format) = unstrippable_metadata(&bytes) {
            return Err(format!(
                "this {format} image carries metadata Editor cannot take out; export it without metadata and drop it again"
            ));
        }
        if carries_metadata(&bytes) {
            // Every format, JPEG included, keeps its own bytes and loses only
            // the boxes. Turning a picture the author already has back through
            // an encoder to strip a text segment would cost them image quality
            // for nothing the segment strip does not already do.
            return Ok((Payload::Bytes(without_metadata(&bytes)), None));
        }
    }
    Ok((Payload::Copy, None))
}

/// The name the copy takes, adopting an identical file already there.
fn choose_name(assets: &Path, wanted: &str, payload: &Payload) -> Result<String, String> {
    let (stem, extension) = split_name(wanted);
    let mut attempt = 1u32;
    loop {
        let candidate = if attempt == 1 {
            wanted.to_string()
        } else {
            match extension {
                Some(extension) => format!("{stem}-{attempt}.{extension}"),
                None => format!("{stem}-{attempt}"),
            }
        };
        let Some(existing) = existing_named(assets, &candidate)? else {
            return Ok(candidate);
        };
        // APFS is case-insensitive, so the comparison above already found a
        // file whose name differs only in case. Equal bytes are adopted.
        if same_bytes(&existing, payload)? {
            return Ok(existing
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or(candidate));
        }
        attempt += 1;
        if attempt > 1000 {
            return Err("too many files of that name".to_string());
        }
    }
}

/// The file in `assets` whose name matches `candidate`, case-insensitively.
fn existing_named(assets: &Path, candidate: &str) -> Result<Option<PathBuf>, String> {
    let entries = match fs::read_dir(assets) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("cannot read the assets folder: {error}")),
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.eq_ignore_ascii_case(candidate) {
            return Ok(Some(entry.path()));
        }
    }
    Ok(None)
}

/// Whether the file already there holds what would be written.
fn same_bytes(existing: &Path, payload: &Payload) -> Result<bool, String> {
    match payload {
        Payload::Bytes(bytes) => Ok(hash_file(existing)? == hash_bytes(bytes)),
        Payload::Copy => Ok(false),
    }
}

/// Copy a file into the folder without a half-written file ever being seen.
fn copy_atomically(source: &Path, destination: &Path) -> Result<(), String> {
    let parent = destination
        .parent()
        .ok_or_else(|| "the copy has no folder".to_string())?;
    let name = destination
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .ok_or_else(|| "the copy does not name a file".to_string())?;
    let temp = parent.join(format!(
        ".{name}.{}.{}.tmp",
        std::process::id(),
        NEXT_TEMP.fetch_add(1, Ordering::Relaxed)
    ));
    let copied = (|| -> std::io::Result<()> {
        fs::copy(source, &temp)?;
        fs::File::open(&temp)?.sync_all()
    })();
    if let Err(error) = copied {
        let _ = fs::remove_file(&temp);
        return Err(format!("cannot copy {name}: {error}"));
    }
    fs::rename(&temp, destination).map_err(|error| {
        let _ = fs::remove_file(&temp);
        format!("cannot put {name} in place: {error}")
    })
}

/// The reference an entry already in the manifest still resolves to, if it
/// does.
fn reuse<'a>(
    context: &DropContext,
    manifest: &'a Manifest,
    digest: &str,
) -> Option<(&'a AssetEntry, String)> {
    let entry = manifest
        .assets
        .iter()
        .find(|entry| entry.source_sha256 == digest)?;
    if entry.mode == AssetMode::Referenced {
        return Some((entry, format!("asset:{}", entry.id)));
    }
    let on_disk = context.root.join(&entry.path);
    let metadata = fs::metadata(&on_disk).ok()?;
    if !metadata.is_file() {
        return None;
    }
    let resolved = fs::canonicalize(&on_disk).ok()?;
    if !resolved.starts_with(context.root) {
        return None;
    }
    let relative = relative_from(context.chapter_folder, &resolved)?;
    // A Part is self-contained: its chapters reference the pictures in its own
    // `assets/` folder and nothing above it. A copy that lives in another Part
    // is not reused — the bytes are copied into this Part as well — because a
    // reference that climbs out of the Part is one the build refuses and one
    // that breaks the moment either Part is moved.
    if relative.starts_with("../") {
        return None;
    }
    Some((entry, encode_reference(&relative)))
}

/// Record an asset that stays where it is, above the threshold.
///
/// The manifest names a root rather than a path, so nothing of the author's
/// machine reaches the document folder. Naming that root so the file can be
/// found again belongs to map #27; until then the asset is unresolved, which
/// is what section 6 says an unnamed root means.
#[allow(clippy::too_many_arguments)]
fn reference_in_place(
    manifest: &mut Manifest,
    source: &Path,
    name: &str,
    class: Class,
    bytes: u64,
    digest: &str,
    id: &str,
) -> Result<DropOutcome, String> {
    let forbidden = forbidden_root_names();
    let borrowed: Vec<&str> = forbidden.iter().map(String::as_str).collect();
    let parent = source
        .parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().into_owned());
    let root = root_name_for(parent.as_deref(), &borrowed);
    if !manifest.roots.contains(&root) {
        manifest.roots.push(root.clone());
    }
    record(
        manifest,
        AssetEntry {
            id: id.to_string(),
            kind: class.kind(),
            bytes,
            mode: AssetMode::Referenced,
            root: Some(root),
            path: safe_name(name, None),
            converted_from: None,
            source_sha256: digest.to_string(),
            extra: BTreeMap::new(),
        },
    );
    Ok(DropOutcome {
        kind: class.kind(),
        reference: format!("asset:{id}"),
        id: id.to_string(),
        bytes,
        mode: AssetMode::Referenced,
        converted_from: None,
        deduplicated: false,
    })
}

/// Append an entry, or replace the one for the same bytes in the same place.
///
/// Matched on the whole digest rather than on the id, which is sixteen hex
/// characters of it: two different files sharing those sixteen characters must
/// be two entries, not one entry silently overwriting the other. The path is
/// part of the match because one file may be copied into two Parts, and each
/// Part's copy is an entry of its own.
fn record(manifest: &mut Manifest, entry: AssetEntry) {
    match manifest
        .assets
        .iter_mut()
        .find(|held| held.source_sha256 == entry.source_sha256 && held.path == entry.path)
    {
        Some(held) => {
            let extra = std::mem::take(&mut held.extra);
            *held = AssetEntry { extra, ..entry };
        }
        None => manifest.assets.push(entry),
    }
}

// -------------------------------------------------------------- the address

/// The extensions that make an address a direct media address.
const MEDIA_EXTENSIONS: [&str; 5] = ["mp4", "m4v", "mov", "webm", "ogv"];

/// What a pasted or dragged address is.
///
/// Nothing is fetched and nothing is guessed at: a page URL from a site that
/// offers no media address is not a video, because a paste that rewrites what
/// the author pasted is a paste they cannot use.
pub fn classify_address(text: &str) -> PasteOutcome {
    let trimmed = text.trim();
    let lower = trimmed.to_ascii_lowercase();
    let is_url = lower.starts_with("https://") || lower.starts_with("http://");
    let path = lower.split(['?', '#']).next().unwrap_or(&lower).to_string();
    let media = MEDIA_EXTENSIONS
        .iter()
        .any(|extension| path.ends_with(&format!(".{extension}")));
    if is_url && media {
        return PasteOutcome {
            kind: "video".to_string(),
            // A plain public address is the canon's `remote` role; `gated` is
            // for a site that asks the viewer to sign in, which Editor cannot
            // know without probing, and it never probes.
            role: Some("remote".to_string()),
            reference: trimmed.to_string(),
        };
    }
    PasteOutcome {
        kind: "other".to_string(),
        role: None,
        reference: trimmed.to_string(),
    }
}

// ------------------------------------------------------------------ commands

/// Take the files of one drop into the chapter's Part.
///
/// The nonce is the whole of the web view's authority here: it names a set of
/// paths the shell saw the author drop, and nothing else. An unknown or
/// expired nonce is refused.
#[tauri::command]
pub async fn drop_on_chapter(
    chapter: String,
    nonce: String,
    root: tauri::State<'_, crate::DocumentRoot>,
    queue: tauri::State<'_, DropQueue>,
) -> Result<DropReport, String> {
    let root = root.get()?;
    let paths = queue.claim(&nonce)?;
    tauri::async_runtime::spawn_blocking(move || run_drop(&root, &chapter, &paths))
        .await
        .map_err(|error| format!("cannot take the drop: {error}"))?
}

/// The drop, off the main thread and away from Tauri's state.
pub fn run_drop(root: &Path, chapter: &str, paths: &[PathBuf]) -> Result<DropReport, String> {
    let chapter = document::confine_chapter(root, chapter)?;
    let chapter_folder = chapter
        .parent()
        .ok_or_else(|| "the chapter has no folder".to_string())?
        .to_path_buf();

    let threshold = metadata_threshold(root)?;
    let manifest_path = document::confine_path(root, MANIFEST_FILE)?;
    let mut manifest = read_manifest(&manifest_path)?;
    if manifest.threshold_bytes.is_none() {
        manifest.threshold_bytes = Some(threshold);
    }

    let context = DropContext {
        root,
        chapter_folder: &chapter_folder,
        threshold,
    };

    let mut report = DropReport::default();
    for path in paths {
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "that file".to_string());
        match ingest(&context, path, &mut manifest) {
            Ok(outcome) => report.accepted.push(outcome),
            Err(reason) => report.refused.push(DropRefusal { name, reason }),
        }
    }
    if !report.accepted.is_empty() {
        write_manifest(&manifest_path, &manifest)?;
    }
    Ok(report)
}

/// The threshold, read once through the one metadata reader.
///
/// A `document.yaml` that will not parse is named rather than swallowed: the
/// silent fall back to 8 MiB would copy in a file the author had said to leave
/// where it is, and the first time they learn of it is when the folder is
/// bigger than they meant it to be.
fn metadata_threshold(root: &Path) -> Result<u64, String> {
    let path = document::confine_path(root, crate::metadata::METADATA_FILE)?;
    Ok(crate::metadata::read_metadata(&path)?
        .asset_threshold_bytes
        .unwrap_or(DEFAULT_THRESHOLD_BYTES))
}

/// What a pasted or dragged address should become. Nothing is written.
///
/// Separate from [`drop_on_chapter`] because it takes no paths at all: the
/// chapter is confined only so that the command refuses when no folder is
/// open or the chapter is not in it.
#[tauri::command]
pub async fn paste_reference(
    chapter: String,
    text: String,
    root: tauri::State<'_, crate::DocumentRoot>,
) -> Result<PasteOutcome, String> {
    let root = root.get()?;
    document::confine_chapter(&root, &chapter)?;
    Ok(classify_address(&text))
}

#[cfg(test)]
mod tests {
    use super::*;

    const PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8,
        0xCF, 0xC0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    /// A minimal JPEG: start of image, an APP1 EXIF segment, end of image.
    fn jpeg_with_exif() -> Vec<u8> {
        let payload = b"Exif\0\0GPS 51.4 N";
        let mut bytes = vec![0xFF, 0xD8, 0xFF, 0xE1];
        let length = u16::try_from(payload.len() + 2).expect("short");
        bytes.extend_from_slice(&length.to_be_bytes());
        bytes.extend_from_slice(payload);
        bytes.extend_from_slice(&[0xFF, 0xD9]);
        bytes
    }

    /// Append one JPEG marker segment: `FF`, the marker, a two-byte length
    /// that counts itself, and the payload.
    fn push_segment(bytes: &mut Vec<u8>, marker: u8, payload: &[u8]) {
        bytes.push(0xFF);
        bytes.push(marker);
        let length = u16::try_from(payload.len() + 2).expect("a short segment");
        bytes.extend_from_slice(&length.to_be_bytes());
        bytes.extend_from_slice(payload);
    }

    /// A JPEG with only a JFIF header, which is not the author's metadata.
    fn jpeg_without_exif() -> Vec<u8> {
        let payload = b"JFIF\0\x01\x02\0\0\x01\0\x01\0\0";
        let mut bytes = vec![0xFF, 0xD8, 0xFF, 0xE0];
        let length = u16::try_from(payload.len() + 2).expect("short");
        bytes.extend_from_slice(&length.to_be_bytes());
        bytes.extend_from_slice(payload);
        bytes.extend_from_slice(&[0xFF, 0xD9]);
        bytes
    }

    /// A document folder with one Part and one chapter in it.
    fn document(threshold: Option<u64>) -> (tempfile::TempDir, PathBuf, PathBuf) {
        let temp = tempfile::tempdir().expect("temp dir");
        let root = document::canonical_root(&temp.path().to_string_lossy()).expect("root");
        fs::create_dir(root.join("01-beginnings")).expect("part");
        let chapter = root.join("01-beginnings/01-opening.md");
        fs::write(&chapter, "# Opening\n\nA paragraph.\n").expect("chapter");
        if let Some(threshold) = threshold {
            fs::write(
                root.join("document.yaml"),
                format!("title: Test\nasset_threshold_bytes: {threshold}\n"),
            )
            .expect("metadata");
        }
        (temp, root, chapter)
    }

    /// A folder outside the document, for the files a test drops.
    fn desktop() -> tempfile::TempDir {
        tempfile::tempdir().expect("temp dir")
    }

    #[test]
    fn classifies_on_the_magic_bytes_rather_than_the_name() {
        assert_eq!(
            classify(&[0xFF, 0xD8, 0xFF, 0xE0], "photo.txt"),
            Class::Image
        );
        assert_eq!(classify(PNG, "anything"), Class::Image);
        assert_eq!(classify(b"GIF89a...", "a.gif"), Class::Image);
        assert_eq!(classify(b"RIFF\0\0\0\0WEBPVP8 ", "a.webp"), Class::Image);
        assert_eq!(
            classify(&[0x1A, 0x45, 0xDF, 0xA3, 0, 0], "a.webm"),
            Class::Video
        );
        assert_eq!(
            classify(b"\0\0\0\x20ftypheic\0\0\0\0", "IMG_0001.HEIC"),
            Class::PhoneNative("heic")
        );
        assert_eq!(
            classify(b"\0\0\0\x20ftypmif1\0\0\0\0", "IMG_0001.heif"),
            Class::PhoneNative("heif")
        );
        assert_eq!(
            classify(b"\0\0\0\x20ftypavif\0\0\0\0", "a.avif"),
            Class::Image
        );
        assert_eq!(
            classify(b"\0\0\0\x20ftypisom\0\0\0\0", "keynote.mp4"),
            Class::Video
        );
        assert_eq!(
            classify(b"II*\0\x08\0\0\0", "IMG_0002.DNG"),
            Class::PhoneNative("dng")
        );
        assert_eq!(classify(b"II*\0\x08\0\0\0", "scan.tif"), Class::Image);
        assert_eq!(classify(b"<svg xmlns=", "figure.svg"), Class::Image);
        assert_eq!(classify(b"<svg xmlns=", "figure.txt"), Class::File);
        assert_eq!(classify(b"counts\t3\n", "counts.xlsx"), Class::File);
    }

    #[test]
    fn finds_the_metadata_a_copy_must_not_carry() {
        assert!(carries_metadata(&jpeg_with_exif()));
        assert!(!carries_metadata(&jpeg_without_exif()));
        assert!(!carries_metadata(PNG));
        assert!(!carries_metadata(b"counts"));
    }

    #[test]
    fn takes_the_metadata_out_without_touching_the_image() {
        let stripped = without_metadata(&jpeg_with_exif());
        assert!(!carries_metadata(&stripped));
        assert_eq!(&stripped[..2], &[0xFF, 0xD8], "still a JPEG");
        assert!(
            !stripped.windows(4).any(|window| window == b"Exif"),
            "the EXIF segment is gone"
        );
        assert_eq!(
            without_metadata(&jpeg_without_exif()),
            jpeg_without_exif(),
            "a file with nothing to strip is untouched"
        );

        // A PNG keeps its own bytes: the text chunk goes, the image stays.
        let mut png = PNG[..33].to_vec();
        let text = b"tEXtComment\0Alice's machine";
        png.extend_from_slice(&u32::try_from(text.len() - 4).expect("short").to_be_bytes());
        png.extend_from_slice(text);
        png.extend_from_slice(&[0, 0, 0, 0]);
        png.extend_from_slice(&PNG[33..]);
        assert!(carries_metadata(&png));
        let stripped = without_metadata(&png);
        assert!(!carries_metadata(&stripped));
        assert_eq!(stripped, PNG, "the original PNG, byte for byte");
    }

    /// A one-pixel GIF: header, screen descriptor, image, terminator.
    fn gif_without_metadata() -> Vec<u8> {
        let mut bytes = b"GIF89a".to_vec();
        // 1x1, no global colour table.
        bytes.extend_from_slice(&[0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);
        // One image descriptor at 0,0, 1x1, no local colour table.
        bytes.extend_from_slice(&[0x2C, 0, 0, 0, 0, 0x01, 0x00, 0x01, 0x00, 0x00]);
        // LZW minimum code size, one sub-block, the block terminator.
        bytes.extend_from_slice(&[0x02, 0x02, 0x44, 0x01, 0x00]);
        bytes.push(0x3B);
        bytes
    }

    /// The same GIF with a comment extension carrying the author's machine.
    fn gif_with_a_comment() -> Vec<u8> {
        let plain = gif_without_metadata();
        let mut bytes = plain[..13].to_vec();
        let comment = b"drawn on alice-macbook";
        bytes.extend_from_slice(&[0x21, 0xFE]);
        bytes.push(u8::try_from(comment.len()).expect("short"));
        bytes.extend_from_slice(comment);
        bytes.push(0x00);
        bytes.extend_from_slice(&plain[13..]);
        bytes
    }

    #[test]
    fn takes_a_gifs_comment_and_application_blocks_out() {
        let plain = gif_without_metadata();
        assert!(!carries_metadata(&plain));
        let commented = gif_with_a_comment();
        assert!(carries_metadata(&commented));
        let stripped = without_metadata(&commented);
        assert!(!carries_metadata(&stripped));
        assert_eq!(stripped, plain, "the original GIF, byte for byte");
        assert!(
            !stripped.windows(5).any(|window| window == b"alice"),
            "the comment survived"
        );
    }

    #[test]
    fn takes_an_svgs_comments_metadata_and_local_paths_out() {
        // The absolute paths below are the illustrative machine paths this test
        // exists to strip out. abcd-lint:allow illustrative refusal path
        let drawn_on = "/Users/alice/figures"; // abcd-lint:allow illustrative refusal path
        let svg = format!(
            concat!(
                "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\">",
                "<!-- drawn by Alice on 2026-09-05 -->",
                "<metadata><dc:title>{root}/lantern.svg</dc:title></metadata>",
                "<sodipodi:namedview id=\"base\" />",
                "<image sodipodi:absref=\"{root}/lantern.png\" ",
                "xlink:href=\"file://{root}/lantern.png\" width=\"10\" />",
                "<path d=\"M 0 0 L 10 10\" />",
                "</svg>",
            ),
            root = drawn_on
        );
        let svg = svg.as_str();
        assert!(carries_metadata(svg.as_bytes()));
        let stripped = String::from_utf8(without_metadata(svg.as_bytes())).expect("utf-8");

        assert!(!stripped.contains("<!--"), "{stripped}");
        assert!(!stripped.contains("<metadata"), "{stripped}");
        assert!(!stripped.contains("sodipodi:namedview"), "{stripped}");
        assert!(!stripped.contains(drawn_on), "{stripped}");
        assert!(!stripped.contains("file://"), "{stripped}");
        // And the picture itself is still there.
        assert!(stripped.contains("<path d=\"M 0 0 L 10 10\""), "{stripped}");
        assert!(stripped.contains("viewBox=\"0 0 10 10\""), "{stripped}");
        assert!(stripped.contains("width=\"10\""), "{stripped}");
        assert!(!carries_metadata(stripped.as_bytes()));
    }

    #[test]
    fn refuses_an_avif_carrying_metadata_it_cannot_take_out() {
        let mut plain = b"\0\0\0\x20ftypavif".to_vec();
        plain.extend_from_slice(b"\0\0\0\0mif1miafMA1B");
        assert_eq!(unstrippable_metadata(&plain), None);

        let mut with_exif = plain.clone();
        with_exif.extend_from_slice(b"\0\0\0\x20metainfe\0\0\0\0Exif\0");
        assert_eq!(unstrippable_metadata(&with_exif), Some("AVIF"));

        // And the drop says so rather than copying it.
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let source = desk.path().join("figure.avif");
        fs::write(&source, &with_exif).expect("source");
        let report = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");
        assert!(report.accepted.is_empty());
        assert!(
            report.refused[0].reason.contains("cannot take out"),
            "{:?}",
            report.refused
        );
        assert!(!root.join("01-beginnings/assets").exists());
    }

    #[test]
    fn a_jpeg_this_reader_loses_its_place_in_is_treated_as_carrying_metadata() {
        // Fail closed: a marker where none belongs means this is not the file
        // it claims to be, and the safe answer to "is anything in here" is yes.
        let mut broken = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
        broken.extend_from_slice(&[0u8; 14]);
        broken.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]);
        assert!(carries_metadata(&broken), "a stray byte reads as metadata");

        let mut zero_length = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x00, 0x00, 0x00];
        zero_length.extend_from_slice(&[0xFF, 0xD9]);
        assert!(carries_metadata(&zero_length), "a zero-length segment");
    }

    #[test]
    fn a_second_drop_into_another_part_copies_rather_than_climbing_out_of_it() {
        // A Part is self-contained: a reference that climbs out of it is one the
        // publish build refuses and one that breaks when either Part moves.
        let (_temp, root, chapter) = document(None);
        fs::create_dir(root.join("02-middle")).expect("part");
        let second_chapter = root.join("02-middle/01-method.md");
        fs::write(&second_chapter, "# Method\n").expect("chapter");

        let desk = desktop();
        let source = desk.path().join("lantern.png");
        fs::write(&source, PNG).expect("source");

        let first = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");
        let second = run_drop(
            &root,
            &second_chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");

        assert_eq!(first.accepted[0].reference, "assets/lantern.png");
        assert_eq!(second.accepted[0].reference, "assets/lantern.png");
        assert!(!second.accepted[0].deduplicated, "each Part keeps its own");
        assert!(root.join("01-beginnings/assets/lantern.png").is_file());
        assert!(root.join("02-middle/assets/lantern.png").is_file());

        // Two copies, two entries: one entry naming one of them would leave the
        // other unrecorded.
        let manifest = read_manifest(&root.join(MANIFEST_FILE)).expect("manifest");
        assert_eq!(manifest.assets.len(), 2, "{:?}", manifest.assets);
        let paths: Vec<&str> = manifest
            .assets
            .iter()
            .map(|entry| entry.path.as_str())
            .collect();
        assert!(
            paths.contains(&"01-beginnings/assets/lantern.png"),
            "{paths:?}"
        );
        assert!(paths.contains(&"02-middle/assets/lantern.png"), "{paths:?}");

        // A third drop into the first Part is still one copy, not two.
        let again = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");
        assert!(again.accepted[0].deduplicated);
        assert_eq!(
            read_manifest(&root.join(MANIFEST_FILE))
                .expect("manifest")
                .assets
                .len(),
            2
        );
    }

    #[test]
    fn an_unparsable_document_yaml_stops_the_drop_rather_than_guessing() {
        let (_temp, root, chapter) = document(None);
        fs::write(root.join("document.yaml"), "title: [unclosed\n").expect("metadata");
        let desk = desktop();
        let source = desk.path().join("lantern.png");
        fs::write(&source, PNG).expect("source");
        let message = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect_err("refused");
        assert!(message.contains("document.yaml"), "{message}");
        assert!(
            !root.join("01-beginnings/assets").exists(),
            "nothing copied"
        );
    }

    #[test]
    fn names_a_copy_after_the_file_the_author_dropped() {
        assert_eq!(safe_name("lantern.jpg", None), "lantern.jpg");
        assert_eq!(safe_name(".hidden.jpg", None), "hidden.jpg");
        assert_eq!(safe_name("a:b/c.jpg", None), "c.jpg");
        assert_eq!(safe_name("IMG_0001.HEIC", Some("jpg")), "IMG_0001.jpg");
        assert_eq!(safe_name("a lantern.jpg", None), "a lantern.jpg");
        assert_eq!(safe_name("...", None), "asset");
        assert_eq!(safe_name(&"x".repeat(300), None).len(), MAX_NAME_BYTES);
    }

    #[test]
    fn writes_a_relative_reference_with_no_machine_in_it() {
        let base = Path::new("/doc/01-part");
        assert_eq!(
            relative_from(base, Path::new("/doc/01-part/assets/lantern.jpg")).as_deref(),
            Some("assets/lantern.jpg")
        );
        assert_eq!(
            relative_from(base, Path::new("/doc/02-part/assets/lantern.jpg")).as_deref(),
            Some("../02-part/assets/lantern.jpg")
        );
    }

    #[test]
    fn percent_encodes_a_reference_whose_name_contains_a_space() {
        assert_eq!(
            encode_reference("assets/a lantern (1).jpg"),
            "assets/a%20lantern%20%281%29.jpg"
        );
        assert_eq!(encode_reference("assets/lantern.jpg"), "assets/lantern.jpg");
    }

    #[test]
    fn reads_a_reference_back_to_the_name_on_disk() {
        assert_eq!(
            decode_reference("assets/a%20lantern%20%281%29.jpg").expect("a name"),
            "assets/a lantern (1).jpg"
        );
        assert_eq!(
            decode_reference(&encode_reference("assets/a lantern.jpg")).expect("a name"),
            "assets/a lantern.jpg",
            "what the drop wrote is what the read path opens"
        );
        assert_eq!(
            decode_reference("assets/lantern.jpg").expect("a name"),
            "assets/lantern.jpg"
        );
    }

    #[test]
    fn refuses_an_escape_that_decodes_to_a_climb_or_a_separator() {
        for reference in [
            "%2e%2e/secrets.jpg",
            "assets/%2E%2E/secrets.jpg",
            "assets/one%2Ftwo.jpg",
            "assets/one%5Ctwo.jpg",
        ] {
            let message = decode_reference(reference).expect_err(reference);
            assert!(message.contains("outside the open document"), "{message}");
        }
        // A climb in plain sight is the confinement's to refuse on the path it
        // resolves to, so it passes through here unchanged.
        assert_eq!(
            decode_reference("../secrets.jpg").expect("passed through"),
            "../secrets.jpg"
        );
    }

    #[test]
    fn refuses_a_nonce_it_never_minted_and_one_that_has_expired() {
        let queue = DropQueue::default();
        let nonce = queue
            .offer(vec![PathBuf::from("/tmp/a.jpg")])
            .expect("offer");
        assert_eq!(nonce.len(), 26, "sixteen bytes as base32");
        assert!(queue.claim("not-a-nonce").is_err());
        assert_eq!(queue.claim(&nonce).expect("claim").len(), 1);
        assert!(
            queue.claim(&nonce).is_err(),
            "a nonce is spent once it is claimed"
        );

        // Expiry, without waiting thirty seconds for it.
        let stale = DropQueue::default();
        let nonce = stale
            .offer(vec![PathBuf::from("/tmp/a.jpg")])
            .expect("offer");
        {
            let mut held = stale.0.lock().expect("lock");
            held[0].at = Instant::now() - NONCE_LIFETIME - Duration::from_secs(1);
        }
        assert!(stale.claim(&nonce).is_err(), "an expired nonce is refused");
    }

    #[test]
    fn refuses_a_chapter_outside_the_open_document() {
        let (_temp, root, _chapter) = document(None);
        let outside = root.parent().expect("parent").join("secrets.md");
        let report = run_drop(&root, &outside.to_string_lossy(), &[]);
        assert!(report.is_err(), "a chapter outside the document is refused");
        assert!(run_drop(&root, "../secrets.md", &[]).is_err());
    }

    #[test]
    fn copies_a_dropped_image_into_the_assets_folder_beside_the_chapter() {
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let source = desk.path().join("lantern.png");
        fs::write(&source, PNG).expect("source");

        let report = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");

        assert!(report.refused.is_empty(), "{:?}", report.refused);
        let outcome = &report.accepted[0];
        assert_eq!(outcome.kind, AssetKind::Image);
        assert_eq!(outcome.reference, "assets/lantern.png");
        assert_eq!(outcome.mode, AssetMode::Copied);
        assert!(!outcome.deduplicated);
        let copied = root.join("01-beginnings/assets/lantern.png");
        assert_eq!(fs::read(&copied).expect("copy"), PNG);

        let manifest = read_manifest(&root.join(MANIFEST_FILE)).expect("manifest");
        assert_eq!(manifest.schema_version, 1);
        assert_eq!(manifest.hash, "sha256");
        assert_eq!(manifest.assets.len(), 1);
        assert_eq!(manifest.assets[0].path, "01-beginnings/assets/lantern.png");
        assert_eq!(manifest.assets[0].mode, AssetMode::Copied);
    }

    #[test]
    fn writes_one_copy_for_two_drops_of_the_same_bytes() {
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let folder = desk.path().to_path_buf();
        let first = folder.join("lantern.png");
        let second = folder.join("a different name.png");
        fs::write(&first, PNG).expect("source");
        fs::write(&second, PNG).expect("source");

        let one = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&first),
        )
        .expect("drop");
        let two = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&second),
        )
        .expect("drop");

        assert!(!one.accepted[0].deduplicated);
        assert!(two.accepted[0].deduplicated, "the bytes were already here");
        assert_eq!(one.accepted[0].reference, two.accepted[0].reference);

        let assets = root.join("01-beginnings/assets");
        let names: Vec<String> = fs::read_dir(&assets)
            .expect("assets")
            .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
            .collect();
        assert_eq!(names, vec!["lantern.png".to_string()], "one file, not two");
        let manifest = read_manifest(&root.join(MANIFEST_FILE)).expect("manifest");
        assert_eq!(manifest.assets.len(), 1, "one entry, not two");
    }

    #[test]
    fn gives_a_different_file_of_the_same_name_a_number() {
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let folder = desk.path().to_path_buf();
        let first = folder.join("lantern.png");
        fs::write(&first, PNG).expect("source");
        run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&first),
        )
        .expect("drop");

        let mut other = PNG.to_vec();
        other.extend_from_slice(b"\n");
        fs::write(&first, &other).expect("source");
        let second = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&first),
        )
        .expect("drop");

        assert!(second.refused.is_empty(), "{:?}", second.refused);
        assert_eq!(second.accepted[0].reference, "assets/lantern-2.png");
        assert!(root.join("01-beginnings/assets/lantern-2.png").is_file());
    }

    #[test]
    fn records_a_referenced_entry_for_a_file_above_the_threshold() {
        let (_temp, root, chapter) = document(Some(64));
        let desk = desktop();
        let source = desk.path().join("keynote.mp4");
        let mut bytes = b"\0\0\0\x20ftypisom\0\0\0\0".to_vec();
        bytes.resize(4096, 0);
        fs::write(&source, &bytes).expect("source");

        let report = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");

        let outcome = &report.accepted[0];
        assert_eq!(outcome.mode, AssetMode::Referenced);
        assert_eq!(outcome.kind, AssetKind::Video);
        assert_eq!(outcome.reference, format!("asset:{}", outcome.id));
        assert!(
            !root.join("01-beginnings/assets").exists(),
            "nothing is copied above the threshold"
        );
        let manifest = read_manifest(&root.join(MANIFEST_FILE)).expect("manifest");
        let entry = &manifest.assets[0];
        assert_eq!(entry.mode, AssetMode::Referenced);
        assert!(entry.root.is_some(), "a referenced asset names a root");
        assert_eq!(entry.path, "keynote.mp4");
        assert_eq!(manifest.roots.len(), 1);
    }

    #[test]
    fn records_no_absolute_path_in_the_manifest() {
        let (_temp, root, chapter) = document(Some(64));
        let desk = desktop();
        let folder = desk.path().to_path_buf();
        let image = folder.join("lantern.png");
        let big = folder.join("keynote.mp4");
        fs::write(&image, PNG).expect("source");
        let mut bytes = b"\0\0\0\x20ftypisom\0\0\0\0".to_vec();
        bytes.resize(4096, 0);
        fs::write(&big, &bytes).expect("source");
        run_drop(
            &root,
            &chapter.to_string_lossy(),
            &[image.clone(), big.clone()],
        )
        .expect("drop");

        let manifest = fs::read_to_string(root.join(MANIFEST_FILE)).expect("manifest");
        let root_text = root.to_string_lossy().into_owned();
        assert!(!manifest.contains(&root_text), "no fixture root");
        for forbidden in forbidden_root_names() {
            assert!(
                !manifest.contains(&forbidden),
                "the manifest names {forbidden}"
            );
        }
        assert!(!manifest.contains("/Users/"), "no home directory");
        assert!(!manifest.contains("/private/"), "no volume path");
    }

    /// A copied JPEG loses its metadata segments and nothing else: the
    /// compressed scan arrives byte for byte, because a copy is never handed
    /// back to an encoder. Only a format conversion may re-encode.
    #[test]
    fn copies_a_jpeg_without_re_encoding_it() {
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let source = desk.path().join("lantern.jpg");

        // Entropy-coded data no encoder would ever reproduce: if anything
        // re-encodes this file, these bytes cannot survive.
        let scan: Vec<u8> = (0u8..=255).chain(0u8..=200).collect();
        let jfif: &[u8] = b"JFIF\0\x01\x02\0\0\x01\0\x01\0\0";
        let sos: &[u8] = b"\0\x01\0\0\x3F\0";

        // What the strip should leave: the JFIF header, which says nothing
        // about the author, then the scan and the end of image.
        let mut expected = vec![0xFF, 0xD8];
        push_segment(&mut expected, 0xE0, jfif);
        push_segment(&mut expected, 0xDA, sos);
        expected.extend_from_slice(&scan);
        expected.extend_from_slice(&[0xFF, 0xD9]);

        // The same file with an APP1, an APP13 and a comment segment in it.
        let mut dropped = vec![0xFF, 0xD8];
        push_segment(&mut dropped, 0xE0, jfif);
        push_segment(&mut dropped, 0xE1, b"Exif\0\0GPS 51.4 N, 0.5 W");
        push_segment(&mut dropped, 0xED, b"Photoshop 3.0\0IPTC: Alice");
        push_segment(&mut dropped, 0xFE, b"made on Alice's machine");
        push_segment(&mut dropped, 0xDA, sos);
        dropped.extend_from_slice(&scan);
        dropped.extend_from_slice(&[0xFF, 0xD9]);
        assert!(carries_metadata(&dropped), "the fixture carries metadata");
        fs::write(&source, &dropped).expect("source");

        let report = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");
        assert!(report.refused.is_empty(), "{:?}", report.refused);

        let outcome = &report.accepted[0];
        assert_eq!(outcome.reference, "assets/lantern.jpg");
        assert_eq!(
            outcome.converted_from, None,
            "stripping a copy is not a conversion"
        );

        let written = fs::read(root.join("01-beginnings/assets/lantern.jpg")).expect("the copy");
        assert_eq!(
            written, expected,
            "the file the author dropped, less exactly the metadata segments"
        );

        // Said again the other way round, so a failure names what went wrong.
        let mut tail = scan.clone();
        tail.extend_from_slice(&[0xFF, 0xD9]);
        assert!(
            written.ends_with(&tail),
            "the compressed scan survived unchanged, so nothing re-encoded it"
        );
        assert!(!carries_metadata(&written));
        assert!(
            !written.windows(4).any(|window| window == b"Exif"),
            "the APP1 segment is gone"
        );
        assert!(
            !written.windows(9).any(|window| window == b"Photoshop"),
            "the APP13 segment is gone"
        );
        assert!(
            !written.windows(7).any(|window| window == b"made on"),
            "the comment segment is gone"
        );
        assert!(
            written.windows(4).any(|window| window == b"JFIF"),
            "the JFIF header, which is not about the author, stays"
        );

        let manifest = read_manifest(&root.join(MANIFEST_FILE)).expect("manifest");
        assert_eq!(manifest.assets[0].converted_from, None);
    }

    #[test]
    fn strips_metadata_from_a_copied_image() {
        // The fixture is a real JPEG made by ImageIO, so the test only runs
        // where ImageIO is.
        if !convert::available() {
            return;
        }
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let source = desk.path().join("photo.jpg");
        // A real JPEG, made by ImageIO, with an EXIF segment spliced in.
        let plain = convert::to_web_jpeg(PNG).expect("a JPEG");
        let mut with_exif = plain[..2].to_vec();
        let payload = b"Exif\0\0GPS 51.4 N and the camera owner's name";
        with_exif.extend_from_slice(&[0xFF, 0xE1]);
        with_exif.extend_from_slice(
            &u16::try_from(payload.len() + 2)
                .expect("short")
                .to_be_bytes(),
        );
        with_exif.extend_from_slice(payload);
        with_exif.extend_from_slice(&plain[2..]);
        assert!(carries_metadata(&with_exif));
        fs::write(&source, &with_exif).expect("source");

        let report = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");

        assert!(report.refused.is_empty(), "{:?}", report.refused);
        let copied = root.join("01-beginnings/assets/photo.jpg");
        let written = fs::read(&copied).expect("the copy");
        assert!(!carries_metadata(&written), "the copy carries no EXIF");
        assert!(
            !written.windows(3).any(|window| window == b"GPS"),
            "the coordinates did not travel"
        );
        // ImageIO writes an EXIF block of its own, so the copy is not `plain`
        // itself; it is `plain` with the boxes taken off. That it is exactly
        // that, and not something an encoder made, is the point.
        assert_eq!(
            written,
            without_metadata(&plain),
            "the JPEG ImageIO wrote, less its metadata segments and nothing else"
        );
        let manifest = read_manifest(&root.join(MANIFEST_FILE)).expect("manifest");
        assert_eq!(
            manifest.assets[0].converted_from, None,
            "stripping a copy is not a conversion"
        );
    }

    #[test]
    fn copies_a_file_that_is_neither_image_nor_video() {
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let source = desk.path().join("the counts.xlsx");
        fs::write(&source, b"counts\t3\n").expect("source");
        let report = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");

        let outcome = &report.accepted[0];
        assert_eq!(outcome.kind, AssetKind::File);
        assert_eq!(outcome.reference, "assets/the%20counts.xlsx");
        assert!(root.join("01-beginnings/assets/the counts.xlsx").is_file());
    }

    #[test]
    fn refuses_a_folder_and_keeps_the_other_files() {
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let folder = desk.path().to_path_buf();
        let a_folder = folder.join("a-folder");
        fs::create_dir_all(&a_folder).expect("folder");
        let image = folder.join("lantern.png");
        fs::write(&image, PNG).expect("source");

        let report = run_drop(
            &root,
            &chapter.to_string_lossy(),
            &[a_folder.clone(), image.clone()],
        )
        .expect("drop");

        assert_eq!(report.refused.len(), 1);
        assert_eq!(report.refused[0].name, "a-folder");
        assert_eq!(report.accepted.len(), 1, "the good file still lands");
    }

    #[test]
    fn leaves_no_temporary_file_behind() {
        let (_temp, root, chapter) = document(None);
        let desk = desktop();
        let source = desk.path().join("lantern.png");
        fs::write(&source, PNG).expect("source");
        run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&source),
        )
        .expect("drop");

        let names: Vec<String> = fs::read_dir(root.join("01-beginnings/assets"))
            .expect("assets")
            .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
            .collect();
        assert_eq!(names, vec!["lantern.png".to_string()]);
    }

    #[test]
    fn keeps_a_manifest_key_a_later_phase_wrote() {
        let root = tempfile::tempdir().expect("temp dir");
        let path = root.path().join(MANIFEST_FILE);
        fs::write(
            &path,
            r#"{"schema_version":1,"hash":"sha256","ceiling_bytes":26214400,
               "assets":[{"id":"b1946ac92492d234","kind":"video","bytes":512000000,
               "mode":"referenced","root":"media","path":"talks/keynote.mp4",
               "store":"object","source_sha256":"b1946ac92492d234"}]}"#,
        )
        .expect("manifest");
        let manifest = read_manifest(&path).expect("read");
        write_manifest(&path, &manifest).expect("write");
        let text = fs::read_to_string(&path).expect("read back");
        assert!(text.contains("ceiling_bytes"), "{text}");
        assert!(text.contains("\"store\": \"object\""), "{text}");
    }

    #[test]
    fn reads_a_direct_media_address_and_guesses_at_nothing_else() {
        let video = classify_address(" https://videos.example.org/keynote.mp4 ");
        assert_eq!(video.kind, "video");
        assert_eq!(video.role.as_deref(), Some("remote"));
        assert_eq!(video.reference, "https://videos.example.org/keynote.mp4");

        let query = classify_address("https://videos.example.org/keynote.webm?t=30");
        assert_eq!(query.kind, "video");

        let page = classify_address("https://example.org/talks/keynote");
        assert_eq!(page.kind, "other");
        assert_eq!(page.role, None);

        let words = classify_address("just some text");
        assert_eq!(words.kind, "other");
    }

    #[test]
    fn falls_back_when_a_root_would_name_the_author() {
        assert_eq!(root_name_for(Some("Pictures"), &["alice"]), "Pictures");
        assert_eq!(root_name_for(Some("alice"), &["alice"]), FALLBACK_ROOT);
        assert_eq!(root_name_for(Some("Alice"), &["alice"]), FALLBACK_ROOT);
        assert_eq!(root_name_for(None, &[]), FALLBACK_ROOT);
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn converts_a_heic_photograph_to_a_web_jpeg() {
        // `sips` makes the fixture from the PNG above, so the test runs on any
        // Mac without a photograph checked into the repository.
        let temp = tempfile::tempdir().expect("temp dir");
        let png = temp.path().join("seed.png");
        let heic = temp.path().join("IMG_0001.heic");
        fs::write(&png, PNG).expect("seed");
        let made = std::process::Command::new("sips")
            .args(["-s", "format", "heic"])
            .arg(&png)
            .arg("--out")
            .arg(&heic)
            .output();
        let Ok(output) = made else {
            eprintln!("sips is not available; the conversion test is skipped");
            return;
        };
        if !output.status.success() || !heic.is_file() {
            eprintln!("sips cannot write HEIC here; the conversion test is skipped");
            return;
        }
        let head = fs::read(&heic).expect("fixture");
        assert!(
            matches!(
                classify(&head[..32], "IMG_0001.heic"),
                Class::PhoneNative(_)
            ),
            "the fixture really is phone-native"
        );

        let (_doc, root, chapter) = document(None);
        let report = run_drop(
            &root,
            &chapter.to_string_lossy(),
            std::slice::from_ref(&heic),
        )
        .expect("drop");
        assert!(report.refused.is_empty(), "{:?}", report.refused);
        let outcome = &report.accepted[0];
        assert_eq!(outcome.reference, "assets/IMG_0001.jpg");
        assert_eq!(outcome.converted_from.as_deref(), Some("heic"));

        let written = fs::read(root.join("01-beginnings/assets/IMG_0001.jpg")).expect("the copy");
        assert_eq!(&written[..3], &[0xFF, 0xD8, 0xFF], "a JPEG");
        assert!(!carries_metadata(&written), "and no EXIF");

        let names: Vec<String> = fs::read_dir(root.join("01-beginnings/assets"))
            .expect("assets")
            .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
            .collect();
        assert_eq!(
            names,
            vec!["IMG_0001.jpg".to_string()],
            "no phone-native original is left in the document folder"
        );
    }
}
