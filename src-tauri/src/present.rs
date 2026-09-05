//! Present: the deck the shell holds, and the pictures it will hand over.
//!
//! The deck itself is built in the web view, from the text of the buffer, and
//! is never written anywhere: this module holds the text between the moment
//! Present is pressed and the moment the second window asks for it, and reads
//! the images that text refers to.
//!
//! Reading an image is the one thing the deck needs the shell for, and it is
//! the one place a script in either web view could reach for a file. So a
//! reference is resolved against the chapter's own folder, confined to the
//! open document by [`crate::document::confine_asset`], held to the image
//! extensions this phase carries, and refused above the copied-asset
//! threshold `document.yaml` declares. What comes back is bytes, not a path.

use std::env;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;

use crate::document;
use crate::metadata;

/// The threshold when `document.yaml` names none: 8 MiB, the brief's figure.
pub const DEFAULT_ASSET_THRESHOLD_BYTES: u64 = 8 * 1024 * 1024;

/// The chapter the author asked to present, as the buffer had it.
///
/// The buffer's text, not the file's: an unsaved edit presents.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckSource {
    pub text: String,
    /// The chapter's path, which is what an image reference is relative to.
    pub chapter_path: String,
    /// What the present window puts in its title bar.
    pub chapter_title: String,
    /// The document's default variant, so the deck rehearsed is the deck
    /// published. Empty where the document declares none.
    pub variant: String,
}

/// The one deck waiting to be collected.
///
/// A second Present replaces the first: there is one present window, and the
/// deck it shows is the newest text. Nothing accumulates, and nothing is
/// written, so pressing Present twice leaves no second copy of anything.
#[derive(Default)]
pub struct PendingDeck(Mutex<Option<DeckSource>>);

impl PendingDeck {
    /// Hold a deck for the present window to collect.
    pub fn set(&self, source: DeckSource) -> Result<(), String> {
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the pending deck is unreadable".to_string())?;
        *held = Some(source);
        Ok(())
    }

    /// The deck waiting, or a refusal when Present has not been pressed.
    pub fn get(&self) -> Result<DeckSource, String> {
        self.0
            .lock()
            .map_err(|_| "the pending deck is unreadable".to_string())?
            .clone()
            .ok_or_else(|| "nothing to present".to_string())
    }
}

/// One image, as the web view can use it without a path.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AssetBytes {
    pub mime: String,
    pub base64: String,
}

/// The media type for an image extension this phase carries.
///
/// The list is [`crate::document::ASSET_EXTENSIONS`]; a name that reaches here
/// has already been held to it, and an extension with no type is a
/// programming error rather than an author's mistake.
pub fn mime_for(name: &str) -> Option<&'static str> {
    let extension = Path::new(name)
        .extension()
        .map(|e| e.to_string_lossy().to_ascii_lowercase())?;
    Some(match extension.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "avif" => "image/avif",
        _ => return None,
    })
}

/// The standard base64 alphabet, padded.
///
/// Hand-written rather than taken as a dependency: it is twenty lines, and a
/// new crate in the tree costs a sign-off and a supply chain.
pub fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = *chunk.get(1).unwrap_or(&0) as u32;
        let b2 = *chunk.get(2).unwrap_or(&0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(ALPHABET[(triple >> 18) as usize & 63] as char);
        out.push(ALPHABET[(triple >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 {
            ALPHABET[(triple >> 6) as usize & 63] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            ALPHABET[triple as usize & 63] as char
        } else {
            '='
        });
    }
    out
}

/// The chapter's own folder, which is what an image reference is relative to.
fn folder_of(chapter: &Path) -> Result<&Path, String> {
    chapter
        .parent()
        .ok_or_else(|| "the chapter is not inside a folder".to_string())
}

/// Resolve one image reference written in a chapter.
///
/// The reference's percent escapes are read back first — a drop writes
/// `assets/a%20lantern.jpg` for a file the disk calls `a lantern.jpg` — and
/// the name that comes out is taken relative to the chapter's folder and then
/// through the asset confinement: inside the open document, and carrying an
/// extension this phase reads.
pub fn resolve_asset(root: &Path, chapter_path: &str, reference: &str) -> Result<PathBuf, String> {
    let chapter = document::confine_chapter(root, chapter_path)?;
    let name = crate::assets::decode_reference(reference)?;
    let candidate = folder_of(&chapter)?.join(name);
    document::confine_asset(root, &candidate.to_string_lossy())
}

/// The copied-asset threshold the document declares, or the brief's default.
///
/// One reader: `metadata.rs`. Nothing else parses `document.yaml`.
pub fn asset_threshold(root: &Path) -> Result<u64, String> {
    let path = document::confine_path(root, metadata::METADATA_FILE)?;
    Ok(metadata::read_metadata(&path)?
        .asset_threshold_bytes
        .unwrap_or(DEFAULT_ASSET_THRESHOLD_BYTES))
}

/// Read one image, refusing anything at or above the threshold.
///
/// The threshold is the copied-asset rule, and it is one rule: a drop
/// references rather than copies a file *at or above* it, so a file of exactly
/// that size is a referenced asset — which map #4 owns and which no rendering
/// inlines — and this reads the same edge the drop wrote.
pub fn read_asset_bytes(path: &Path, threshold: u64) -> Result<AssetBytes, String> {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned());
    let metadata = fs::metadata(path).map_err(|error| format!("cannot read {name}: {error}"))?;
    if metadata.len() >= threshold {
        return Err(format!("{name} is larger than the copied-asset threshold"));
    }
    let mime =
        mime_for(&name).ok_or_else(|| format!("{name} is not an image this phase carries"))?;
    let bytes = fs::read(path).map_err(|error| format!("cannot read {name}: {error}"))?;
    Ok(AssetBytes {
        mime: mime.to_string(),
        base64: base64(&bytes),
    })
}

/// The title the present window shows: the chapter's own heading if it has one.
///
/// The first level-one heading is the chapter's title, per the canon. A
/// chapter with none falls back to its file name, which is what the sidebar
/// shows for it.
pub fn deck_title(text: &str, chapter_path: &str) -> String {
    for line in text.lines() {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("# ") {
            let heading = rest.trim().trim_end_matches('#').trim();
            // A heading attribute is the author's markup, not their title.
            let heading = match heading.rfind('{') {
                Some(brace) if heading.ends_with('}') => heading[..brace].trim(),
                _ => heading,
            };
            if !heading.is_empty() {
                return heading.to_string();
            }
        }
    }
    Path::new(chapter_path)
        .file_stem()
        .map(|stem| stem.to_string_lossy().into_owned())
        .unwrap_or_else(|| chapter_path.to_string())
}

/// The variant a Present builds, which is the one a publish would build.
///
/// The document's declared default, else the first variant it declares, else
/// nothing — the same answer the publish build takes, so the deck at the
/// lectern is the deck at the link. A document with no metadata is not a
/// failure: it simply declares no variant.
pub fn default_variant(root: &Path) -> String {
    let path = root.join(metadata::METADATA_FILE);
    let Ok(metadata) = metadata::read_metadata(&path) else {
        return String::new();
    };
    metadata
        .default_variant
        .or_else(|| metadata.variants.first().cloned())
        .unwrap_or_default()
}

/// Hold one chapter for the present window, and answer what was held.
///
/// The path is confined before it is stored, so the present window can only
/// ever be handed a chapter of the open document. Nothing is written: this is
/// the whole of what Present does to the document folder.
pub fn hold_chapter(
    root: &Path,
    pending: &PendingDeck,
    text: String,
    chapter_path: String,
) -> Result<DeckSource, String> {
    document::confine_chapter(root, &chapter_path)?;
    let source = DeckSource {
        chapter_title: deck_title(&text, &chapter_path),
        variant: default_variant(root),
        text,
        chapter_path,
    };
    pending.set(source.clone())?;
    Ok(source)
}

/// The window label the deck runs in.
pub const PRESENT_WINDOW: &str = "present";

/// The page the present window loads, from the bundle rather than from a
/// string.
///
/// `tauri.conf.json` sets `script-src 'self'`, which a `srcdoc` iframe
/// inherits, so an inline-script deck inside the editor's own window could not
/// run. A second window loading a page from the same bundle runs under that
/// policy with no relaxation — and it is also the window Alice projects.
const PRESENT_PAGE: &str = "present.html";

/// The event the present window listens for when a new deck is waiting.
pub const DECK_EVENT: &str = "present://deck";

/// Present the chapter as the buffer has it.
///
/// The text, not the file: an unsaved edit presents. Nothing is written, and
/// the deck exists only as a string in memory until the present window asks
/// for it.
#[tauri::command]
pub async fn present_chapter<R: tauri::Runtime>(
    text: String,
    chapter_path: String,
    app: tauri::AppHandle<R>,
    root: tauri::State<'_, crate::DocumentRoot>,
    pending: tauri::State<'_, PendingDeck>,
) -> Result<(), String> {
    let root = root.get()?;
    hold_chapter(&root, &pending, text, chapter_path)?;

    use tauri::{Emitter, Manager};
    if let Some(window) = app.get_webview_window(PRESENT_WINDOW) {
        window
            .emit(DECK_EVENT, ())
            .map_err(|error| format!("cannot open the present window: {error}"))?;
        return window
            .set_focus()
            .map_err(|error| format!("cannot open the present window: {error}"));
    }
    tauri::WebviewWindowBuilder::new(
        &app,
        PRESENT_WINDOW,
        tauri::WebviewUrl::App(PRESENT_PAGE.into()),
    )
    .title("Present")
    .inner_size(1100.0, 760.0)
    .min_inner_size(390.0, 420.0)
    .resizable(true)
    .build()
    .map(|_| ())
    .map_err(|error| format!("cannot open the present window: {error}"))
}

/// The deck the present window is waiting for.
#[tauri::command]
pub fn pending_deck(pending: tauri::State<'_, PendingDeck>) -> Result<DeckSource, String> {
    pending.get()
}

/// Read one image a chapter refers to, as bytes the deck can show.
///
/// The reference is the author's, relative to their chapter; the path is
/// never the web view's to give.
#[tauri::command]
pub async fn read_asset(
    chapter_path: String,
    path: String,
    root: tauri::State<'_, crate::DocumentRoot>,
) -> Result<AssetBytes, String> {
    let root = root.get()?;
    tauri::async_runtime::spawn_blocking(move || {
        let resolved = resolve_asset(&root, &chapter_path, &path)?;
        read_asset_bytes(&resolved, asset_threshold(&root)?)
    })
    .await
    .map_err(|error| format!("cannot read the image: {error}"))?
}

/// The variable naming the file the present window's state log is appended to.
///
/// Unset on every ordinary launch, and the present window writes nothing at
/// all when it is unset. It exists because the two things that went wrong in
/// the present window — a deck that showed no slide, and type that stopped
/// growing with the window — are both facts about computed layout in a real
/// WebView, and neither a jsdom test nor a person at the keyboard can report
/// them exactly. A script that presses real keys can read this file back.
pub const PRESENT_LOG_VAR: &str = "EDITOR_PRESENT_LOG";

/// The longest line the present log accepts.
///
/// One observation is a short object. A cap keeps a runaway page from filling
/// the disk one call at a time.
const MAX_LOG_LINE: usize = 8192;

/// The directories a present-log path may sit in.
///
/// The same two the key log allows: places the operating system already treats
/// as scratch space, holding nothing the author would miss. The web view is a
/// trust boundary, so the page never names the file — the path comes from the
/// environment the process was started with and is measured against these.
fn allowed_roots<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Vec<PathBuf> {
    use tauri::Manager;
    let mut roots = vec![env::temp_dir()];
    if let Ok(cache) = app.path().app_cache_dir() {
        // The cache directory need not exist yet on a first run.
        let _ = fs::create_dir_all(&cache);
        roots.push(cache);
    }
    roots
        .iter()
        .filter_map(|root| root.canonicalize().ok())
        .collect()
}

/// Resolve a present-log path, or say why it is refused.
///
/// The parent directory is canonicalised — so a path threaded through `..` or
/// a symlink is measured where it actually lands — and the file name is joined
/// back on, because the file itself need not exist yet.
fn confine_log_path(raw: &Path, roots: &[PathBuf]) -> Result<PathBuf, String> {
    let name = raw
        .file_name()
        .ok_or_else(|| format!("{PRESENT_LOG_VAR} must name a file"))?;
    let parent = match raw.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent.to_path_buf(),
        _ => env::current_dir().map_err(|error| format!("{PRESENT_LOG_VAR}: {error}"))?,
    };
    let parent = parent.canonicalize().map_err(|error| {
        format!(
            "{PRESENT_LOG_VAR}: {} is unreadable: {error}",
            parent.display()
        )
    })?;
    if !roots.iter().any(|root| parent.starts_with(root)) {
        return Err(format!(
            "{PRESENT_LOG_VAR} must sit in the cache or temporary directory, not {}",
            parent.display()
        ));
    }
    Ok(parent.join(name))
}

/// The file the present window's observations go to, if the run asked for one.
///
/// Read from the environment the process was started with, never from the web
/// view, and refused unless it lands in one of [`allowed_roots`].
pub fn present_log_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Option<PathBuf> {
    let raw = env::var_os(PRESENT_LOG_VAR)?;
    match confine_log_path(Path::new(&raw), &allowed_roots(app)) {
        Ok(resolved) => Some(resolved),
        Err(error) => {
            log::warn!("{error}");
            None
        }
    }
}

/// Append one line to a resolved present-log path.
///
/// A line with a break in it would read back as two observations, so it is
/// refused rather than escaped: the caller writes one JSON object per call.
///
/// The confined name may still be a symlink pointing out of the scratch
/// directory, and an append would follow it — so the name is refused when
/// anything but a regular file is standing at it. The check and the open are
/// two steps, which a link made between them would slip through; on this
/// path — a development-only surface, inside a directory the shell chose —
/// that is the residual the refusal leaves, and it is named here rather than
/// left to be discovered.
fn append_log_line(path: &Path, line: &str) -> Result<bool, String> {
    if line.len() > MAX_LOG_LINE {
        return Err(format!(
            "a present-log line may be at most {MAX_LOG_LINE} bytes"
        ));
    }
    if line.contains(['\n', '\r']) {
        return Err("a present-log line may not contain a line break".to_string());
    }
    if let Ok(found) = fs::symlink_metadata(path) {
        if found.file_type().is_symlink() {
            // No path in the message: what crosses to the page names no folder
            // of the author's machine.
            return Err(
                "the present log name is a link rather than a file, and the log is not written through a link"
                    .to_string(),
            );
        }
        if !found.is_file() {
            return Err("the present log name is not a file".to_string());
        }
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| format!("cannot open the present log: {error}"))?;
    writeln!(file, "{line}")
        .map_err(|error| format!("cannot write the present log: {error}"))
        .map(|()| true)
}

/// Append one observation to the present log, if the run asked for one.
///
/// Answers whether anything was written, so the page can stop asking.
#[tauri::command]
pub fn present_log<R: tauri::Runtime>(
    line: String,
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    let Some(path) = present_log_path(&app) else {
        return Ok(false);
    };
    append_log_line(&path, &line)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A document folder with one Part, one chapter, and one picture.
    fn document() -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::tempdir().expect("temp dir");
        let root = fs::canonicalize(dir.path()).expect("canonical");
        fs::create_dir_all(root.join("01-part/assets")).expect("part");
        fs::write(root.join("01-part/01-alice.md"), "# Alice\n").expect("chapter");
        fs::write(root.join("01-part/assets/lantern.png"), b"not really a png").expect("image");
        fs::write(root.join("secrets.png"), b"outside the part").expect("outside");
        (dir, root)
    }

    #[test]
    fn encodes_base64_as_the_standard_alphabet_does() {
        assert_eq!(base64(b""), "");
        assert_eq!(base64(b"f"), "Zg==");
        assert_eq!(base64(b"fo"), "Zm8=");
        assert_eq!(base64(b"foo"), "Zm9v");
        assert_eq!(base64(b"foob"), "Zm9vYg==");
        assert_eq!(base64(b"fooba"), "Zm9vYmE=");
        assert_eq!(base64(b"foobar"), "Zm9vYmFy");
        assert_eq!(base64(&[0xff, 0xfe, 0xfd]), "//79");
    }

    #[test]
    fn resolves_an_image_beside_the_chapter() {
        let (_dir, root) = document();
        let resolved = resolve_asset(&root, "01-part/01-alice.md", "assets/lantern.png")
            .expect("beside the chapter");
        assert_eq!(resolved, root.join("01-part/assets/lantern.png"));
    }

    #[test]
    fn resolves_and_reads_an_escaped_name_the_drop_wrote() {
        // The drop copies `a lantern.jpg` and writes `assets/a%20lantern.jpg`
        // into the text, so the read path has to read those escapes back or
        // the picture the author just dropped cannot be presented.
        let (_dir, root) = document();
        fs::write(
            root.join("01-part/assets/a lantern.jpg"),
            b"not really a jpeg",
        )
        .expect("image");
        let resolved = resolve_asset(&root, "01-part/01-alice.md", "assets/a%20lantern.jpg")
            .expect("beside the chapter");
        assert_eq!(resolved, root.join("01-part/assets/a lantern.jpg"));
        let asset = read_asset_bytes(&resolved, DEFAULT_ASSET_THRESHOLD_BYTES).expect("readable");
        assert_eq!(asset.mime, "image/jpeg");
        assert_eq!(asset.base64, base64(b"not really a jpeg"));
    }

    #[test]
    fn refuses_an_escape_that_decodes_to_a_climb() {
        let (_dir, root) = document();
        let message = resolve_asset(&root, "01-part/01-alice.md", "%2e%2e/%2e%2e/secrets.png")
            .expect_err("outside");
        assert!(message.contains("outside the open document"), "{message}");
    }

    #[test]
    fn refuses_an_asset_outside_the_document() {
        let (_dir, root) = document();
        let message =
            resolve_asset(&root, "01-part/01-alice.md", "../../secrets.png").expect_err("outside");
        assert!(message.contains("outside the open document"), "{message}");
        assert!(
            resolve_asset(&root, "01-part/01-alice.md", "/etc/hosts").is_err(),
            "an absolute path is refused"
        );
    }

    #[test]
    fn refuses_a_file_that_is_not_an_image_this_phase_carries() {
        let (_dir, root) = document();
        fs::write(root.join("01-part/assets/notes.txt"), b"text").expect("text file");
        let message = resolve_asset(&root, "01-part/01-alice.md", "assets/notes.txt")
            .expect_err("not an image");
        assert!(
            message.contains("not an image this phase carries"),
            "{message}"
        );
    }

    #[test]
    fn reads_an_image_as_bytes_and_names_its_type() {
        let (_dir, root) = document();
        let path = root.join("01-part/assets/lantern.png");
        let asset = read_asset_bytes(&path, DEFAULT_ASSET_THRESHOLD_BYTES).expect("readable");
        assert_eq!(asset.mime, "image/png");
        assert_eq!(asset.base64, base64(b"not really a png"));
    }

    #[test]
    fn refuses_a_file_larger_than_the_threshold() {
        let (_dir, root) = document();
        let path = root.join("01-part/assets/lantern.png");
        let message = read_asset_bytes(&path, 4).expect_err("too large");
        assert!(
            message.contains("larger than the copied-asset threshold"),
            "{message}"
        );
        // One edge, shared with the drop: at the threshold a file is a
        // referenced asset, so it is not one this reads either.
        let size = fs::metadata(&path).expect("metadata").len();
        assert!(read_asset_bytes(&path, size).is_err(), "at the threshold");
        assert!(read_asset_bytes(&path, size + 1).is_ok(), "below it");
        // And the refusal names the file, not the author's machine.
        assert!(
            !message.contains(root.to_string_lossy().as_ref()),
            "{message}"
        );
    }

    #[test]
    fn takes_the_threshold_from_the_document_metadata() {
        let (_dir, root) = document();
        assert_eq!(
            asset_threshold(&root).expect("no metadata is fine"),
            DEFAULT_ASSET_THRESHOLD_BYTES
        );
        fs::write(root.join("document.yaml"), "asset_threshold_bytes: 1024\n").expect("yaml");
        assert_eq!(asset_threshold(&root).expect("declared"), 1024);
    }

    #[test]
    fn holds_one_deck_and_refuses_before_the_first_present() {
        let pending = PendingDeck::default();
        assert_eq!(
            pending.get().expect_err("nothing yet"),
            "nothing to present"
        );
        let first = DeckSource {
            text: "# One\n".to_string(),
            chapter_path: "01-part/01-alice.md".to_string(),
            chapter_title: "One".to_string(),
            variant: "talk".to_string(),
        };
        pending.set(first.clone()).expect("held");
        assert_eq!(pending.get().expect("held"), first);
        // A second Present replaces the first rather than adding to it.
        let second = DeckSource {
            text: "# Two\n".to_string(),
            ..first
        };
        pending.set(second.clone()).expect("held");
        assert_eq!(pending.get().expect("held"), second);
    }

    /// Every file under a folder with its size, which is what "wrote nothing"
    /// means when the claim is about a folder rather than about one file.
    fn listing(folder: &Path) -> Vec<String> {
        let mut found = Vec::new();
        let mut stack = vec![folder.to_path_buf()];
        while let Some(next) = stack.pop() {
            for entry in fs::read_dir(&next).expect("read") {
                let entry = entry.expect("entry");
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                    continue;
                }
                let size = fs::metadata(&path).expect("metadata").len();
                found.push(format!("{} {size}", path.display()));
            }
        }
        found.sort();
        found
    }

    #[test]
    fn presenting_leaves_the_chapters_bytes_untouched() {
        // Through the command's own path: the chapter is confined, held in the
        // pending deck, and handed back — and the document folder is byte for
        // byte what it was, because Present writes nothing at all.
        let (_dir, root) = document();
        let chapter = root.join("01-part/01-alice.md");
        let before_bytes = fs::read(&chapter).expect("read");
        let before_listing = listing(&root);

        let pending = PendingDeck::default();
        let edited = "# Alice\n\nAn unsaved paragraph.\n".to_string();
        let held = hold_chapter(
            &root,
            &pending,
            edited.clone(),
            "01-part/01-alice.md".to_string(),
        )
        .expect("held");

        assert_eq!(
            held.text, edited,
            "the buffer's text presents, not the file's"
        );
        assert_eq!(pending.get().expect("held"), held);
        assert_eq!(fs::read(&chapter).expect("read"), before_bytes);
        assert_eq!(listing(&root), before_listing, "Present wrote a file");
    }

    #[test]
    fn presenting_carries_the_documents_default_variant() {
        let (_dir, root) = document();
        let pending = PendingDeck::default();
        // No metadata: the document declares no variant, and that is not a
        // failure.
        let none = hold_chapter(
            &root,
            &pending,
            "# Alice\n".to_string(),
            "01-part/01-alice.md".to_string(),
        )
        .expect("held");
        assert_eq!(none.variant, "");

        fs::write(
            root.join("document.yaml"),
            "variants: [talk, full]\ndefault_variant: full\n",
        )
        .expect("yaml");
        let declared = hold_chapter(
            &root,
            &pending,
            "# Alice\n".to_string(),
            "01-part/01-alice.md".to_string(),
        )
        .expect("held");
        assert_eq!(declared.variant, "full");

        // With no default declared, the first variant is the one presented.
        fs::write(root.join("document.yaml"), "variants: [talk, full]\n").expect("yaml");
        assert_eq!(default_variant(&root), "talk");
    }

    #[test]
    fn presenting_refuses_a_chapter_outside_the_open_document() {
        let (_dir, root) = document();
        let pending = PendingDeck::default();
        let message = hold_chapter(
            &root,
            &pending,
            "# Elsewhere\n".to_string(),
            "../elsewhere.md".to_string(),
        )
        .expect_err("refused");
        assert!(message.contains("outside the open document"), "{message}");
        assert!(pending.get().is_err(), "nothing was held");
    }

    /// A directory inside the temporary directory, named for one test.
    fn scratch(name: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("editor-present-log-{name}"));
        fs::create_dir_all(&dir).expect("cannot make the scratch directory");
        dir
    }

    fn log_roots() -> Vec<PathBuf> {
        vec![env::temp_dir()
            .canonicalize()
            .expect("the temporary directory is unreadable")]
    }

    #[test]
    fn takes_a_present_log_inside_the_temporary_directory() {
        let dir = scratch("inside");
        let wanted = dir.join("present.jsonl");
        let resolved = confine_log_path(&wanted, &log_roots()).expect("should be allowed");
        assert_eq!(resolved.file_name(), wanted.file_name());
        assert!(
            resolved.starts_with(env::temp_dir().canonicalize().expect("temp")),
            "{}",
            resolved.display()
        );
    }

    #[test]
    fn refuses_a_present_log_outside_the_allowed_roots() {
        let message = confine_log_path(Path::new("/etc/hosts"), &log_roots())
            .expect_err("outside the scratch directories");
        assert!(
            message.contains("cache or temporary directory"),
            "{message}"
        );
    }

    #[test]
    fn refuses_a_present_log_that_climbs_out_through_a_parent() {
        let dir = scratch("climb");
        let climb = dir.join("../".repeat(10) + "etc/hosts");
        let message =
            confine_log_path(&climb, &log_roots()).expect_err("outside the scratch directories");
        assert!(
            message.contains("cache or temporary directory"),
            "{message}"
        );
    }

    #[test]
    fn writes_one_present_log_line_per_observation() {
        let dir = scratch("append");
        let path = dir.join("written.jsonl");
        let _ = fs::remove_file(&path);

        assert!(append_log_line(&path, "{\"phase\":\"mount\"}").expect("written"));
        assert!(append_log_line(&path, "{\"phase\":\"resize\"}").expect("written"));
        let text = fs::read_to_string(&path).expect("read");
        assert_eq!(text.lines().count(), 2);

        // A line that would read back as two observations, and one over the
        // cap, are refused rather than escaped or truncated.
        let broken = append_log_line(&path, "{\"a\":1}\n{\"a\":2}").expect_err("refused");
        assert!(broken.contains("line break"), "{broken}");
        let long = append_log_line(&path, &"x".repeat(MAX_LOG_LINE + 1)).expect_err("refused");
        assert!(long.contains("at most"), "{long}");
        assert_eq!(fs::read_to_string(&path).expect("read").lines().count(), 2);
        fs::remove_file(&path).expect("clean");
    }

    #[test]
    #[cfg(unix)]
    fn refuses_a_present_log_name_a_link_is_standing_at() {
        // The name is inside the scratch directory and passes confinement; the
        // link at it points anywhere. An append would follow it, so the name
        // is refused instead.
        let dir = scratch("link");
        let target = dir.join("elsewhere.txt");
        let path = dir.join("linked.jsonl");
        let _ = fs::remove_file(&path);
        let _ = fs::remove_file(&target);
        fs::write(&target, "before\n").expect("target");
        std::os::unix::fs::symlink(&target, &path).expect("link");

        let message = append_log_line(&path, "{\"phase\":\"mount\"}").expect_err("refused");
        assert!(message.contains("link"), "{message}");
        // Nothing was written through it, and the message names no folder.
        assert_eq!(fs::read_to_string(&target).expect("read"), "before\n");
        assert!(!message.contains('/'), "{message}");
        fs::remove_file(&path).expect("clean");
        fs::remove_file(&target).expect("clean");
    }

    #[test]
    fn titles_a_deck_from_its_first_heading() {
        assert_eq!(
            deck_title("# The Lantern Papers\n\nA.\n", "x.md"),
            "The Lantern Papers"
        );
        assert_eq!(
            deck_title("# Where I'm coming from {.divider}\n", "x.md"),
            "Where I'm coming from"
        );
        assert_eq!(
            deck_title("No heading here.\n", "01-part/02-method.md"),
            "02-method"
        );
    }
}
