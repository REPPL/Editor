//! The on-disk document model.
//!
//! A document is a folder. A Part is a folder, a Chapter is a `*.md` file, and
//! a numeric filename prefix gives the order. Everything below a Chapter lives
//! inside the Markdown as headings and is not modeled here.
//!
//! The web view is a trust boundary: any script running inside it can invoke a
//! command with any argument it likes. So every path that arrives from the
//! frontend is resolved against the canonicalised root of the open document by
//! [`confine_chapter`] and refused if it lands anywhere else.

use std::cmp::Ordering;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering as AtomicOrdering};

use serde::Serialize;

/// How deep the walk descends before it stops.
///
/// The walk resolves each entry with [`fs::metadata`], which follows symlinks,
/// so a folder linking back into its own ancestry would otherwise recurse for
/// ever. A document folder is a handful of levels deep, so this bound costs
/// nothing real and is what makes the walk terminate. A Part that hits it
/// reports `truncated`, rather than passing off a partial listing as complete.
const MAX_DEPTH: usize = 8;

/// The file extensions a Chapter may carry, lower-cased.
const CHAPTER_EXTENSIONS: [&str; 2] = ["md", "markdown"];

/// Folder names the document model reserves, which are therefore not Parts.
///
/// `assets/` holds the files a chapter references and sits beside it; showing
/// it in the sidebar as an empty Part would be a phantom.
const RESERVED_FOLDERS: [&str; 1] = ["assets"];

/// Distinguishes concurrent temporary files within one process.
static NEXT_TEMP: AtomicU64 = AtomicU64::new(0);

/// A Markdown file inside a Part.
#[derive(Debug, Clone, Serialize)]
pub struct Chapter {
    /// The file name, extension included.
    pub name: String,
    /// The name with its numeric prefix and extension removed, for display.
    pub title: String,
    /// The absolute path of the file.
    pub path: String,
    /// The numeric filename prefix, when the name carries one.
    pub order: Option<u32>,
}

/// A folder: the document root, or a Part inside it.
#[derive(Debug, Clone, Serialize)]
pub struct Part {
    /// The folder name.
    pub name: String,
    /// The name with its numeric prefix removed, for display.
    pub title: String,
    /// The absolute path of the folder.
    pub path: String,
    /// The numeric filename prefix, when the name carries one.
    pub order: Option<u32>,
    /// Child Parts, in order.
    pub parts: Vec<Part>,
    /// Chapters directly inside this Part, in order.
    pub chapters: Vec<Chapter>,
    /// Whether the walk stopped here at [`MAX_DEPTH`], leaving this Part's
    /// contents unread.
    pub truncated: bool,
}

/// One opened document: the root folder and everything ordered beneath it.
#[derive(Debug, Clone, Serialize)]
pub struct DocumentTree {
    pub root: Part,
    /// Entries the walk could not read, one message each. A tree with
    /// failures is a partial tree, not a failed one: the rest is still usable
    /// and the frontend can say what is missing.
    pub failures: Vec<String>,
}

/// Split a leading run of digits off a file name.
///
/// `"03-getting-started.md"` yields `(Some(3), "getting-started.md")`. A name
/// with no digit prefix, or one whose digits do not overflow into a separator,
/// keeps its whole name.
fn split_order(name: &str) -> (Option<u32>, &str) {
    let digits: String = name.chars().take_while(char::is_ascii_digit).collect();
    if digits.is_empty() {
        return (None, name);
    }
    let rest = &name[digits.len()..];
    let trimmed = rest.trim_start_matches([' ', '-', '_', '.']);
    // A name that is nothing but digits keeps its digits as the title.
    let title = if trimmed.is_empty() { name } else { trimmed };
    (digits.parse::<u32>().ok(), title)
}

/// The name with a Chapter extension removed, whatever its case.
fn strip_chapter_extension(name: &str) -> &str {
    let lower = name.to_ascii_lowercase();
    for extension in CHAPTER_EXTENSIONS {
        let suffix = format!(".{extension}");
        if lower.ends_with(&suffix) {
            return &name[..name.len() - suffix.len()];
        }
    }
    name
}

/// The display title for a file or folder name.
fn title_of(name: &str, strip_extension: bool) -> String {
    let stem = if strip_extension {
        strip_chapter_extension(name)
    } else {
        name
    };
    let (_, rest) = split_order(stem);
    rest.replace(['-', '_'], " ")
}

/// Whether a directory entry name takes part in the document model.
fn is_visible(name: &str) -> bool {
    !name.starts_with('.')
}

/// Whether a folder name is a Part rather than one of the model's own folders.
fn is_part_folder(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    !RESERVED_FOLDERS.contains(&lower.as_str())
}

/// Whether a file name is a Chapter.
fn is_chapter(name: &str) -> bool {
    strip_chapter_extension(name).len() < name.len()
}

/// A directory entry's name as a string the IPC boundary can carry.
///
/// `to_string_lossy` would replace the offending bytes, and the path the
/// frontend then sent back would name nothing on disk: the entry would be
/// visible in the sidebar and unopenable. Leaving it out and saying so is the
/// honest reading. macOS's own filesystems refuse to store such a name in the
/// first place; a mounted volume that does not is why this exists.
fn utf8_name(raw: &std::ffi::OsStr) -> Result<&str, String> {
    raw.to_str().ok_or_else(|| {
        format!(
            "{} is not a UTF-8 name and is left out",
            raw.to_string_lossy()
        )
    })
}

/// Order two siblings: numbered ones first by number, then everything by name.
fn compare_by_order(a: (Option<u32>, &str), b: (Option<u32>, &str)) -> Ordering {
    match (a.0, b.0) {
        (Some(x), Some(y)) if x != y => x.cmp(&y),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        _ => a.1.cmp(b.1),
    }
}

/// Read `folder` and everything under it into a `Part`.
///
/// A single unreadable entry is recorded in `failures` and skipped: one bad
/// symlink must not cost the author the rest of their document.
fn read_part(folder: &Path, depth: usize, failures: &mut Vec<String>) -> Result<Part, String> {
    let name = folder
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| folder.to_string_lossy().into_owned());
    let (order, _) = split_order(&name);

    let mut parts: Vec<Part> = Vec::new();
    let mut chapters: Vec<Chapter> = Vec::new();
    let truncated = depth >= MAX_DEPTH;

    if !truncated {
        let entries =
            fs::read_dir(folder).map_err(|e| format!("cannot read {}: {e}", folder.display()))?;
        for entry in entries {
            let entry = match entry {
                Ok(entry) => entry,
                Err(e) => {
                    failures.push(format!("cannot read an entry in {}: {e}", folder.display()));
                    continue;
                }
            };
            let raw_name = entry.file_name();
            let entry_name = match utf8_name(&raw_name) {
                Ok(name) => name.to_owned(),
                Err(message) => {
                    failures.push(format!("{}: {message}", folder.display()));
                    continue;
                }
            };
            if !is_visible(&entry_name) {
                continue;
            }
            let entry_path = entry.path();
            let Some(entry_path_text) = entry_path.to_str().map(str::to_owned) else {
                failures.push(format!("{} is not a UTF-8 path", entry_path.display()));
                continue;
            };
            // `DirEntry::file_type` reports the link itself, so a symlinked
            // Part or Chapter would read as neither a folder nor a file and
            // vanish from the tree. `fs::metadata` follows the link and reports
            // what it points at, which is what the author sees in Finder.
            let metadata = match fs::metadata(&entry_path) {
                Ok(metadata) => metadata,
                Err(e) => {
                    failures.push(format!("cannot inspect {}: {e}", entry_path.display()));
                    continue;
                }
            };
            if metadata.is_dir() {
                if !is_part_folder(&entry_name) {
                    continue;
                }
                match read_part(&entry_path, depth + 1, failures) {
                    Ok(part) => parts.push(part),
                    Err(message) => failures.push(message),
                }
            } else if metadata.is_file() && is_chapter(&entry_name) {
                let (chapter_order, _) = split_order(&entry_name);
                chapters.push(Chapter {
                    title: title_of(&entry_name, true),
                    path: entry_path_text,
                    order: chapter_order,
                    name: entry_name,
                });
            }
        }
    }

    parts.sort_by(|a, b| compare_by_order((a.order, &a.name), (b.order, &b.name)));
    chapters.sort_by(|a, b| compare_by_order((a.order, &a.name), (b.order, &b.name)));

    Ok(Part {
        title: title_of(&name, false),
        path: folder.to_string_lossy().into_owned(),
        order,
        parts,
        chapters,
        truncated,
        name,
    })
}

/// Resolve a folder the user chose into the canonical root of a document.
///
/// Canonical means symlinks and `..` are already gone, so it is a prefix that
/// [`confine_chapter`] can compare against without being fooled.
pub fn canonical_root(folder: &str) -> Result<PathBuf, String> {
    let path = Path::new(folder);
    let resolved =
        fs::canonicalize(path).map_err(|e| format!("cannot open {}: {e}", path.display()))?;
    if !resolved.is_dir() {
        return Err(format!("{} is not a folder", resolved.display()));
    }
    Ok(resolved)
}

/// Resolve a chapter path from the frontend against the open document's root.
///
/// The path must name a Markdown file and must resolve, symlinks and `..`
/// resolved, to somewhere inside `root`. Everything else is refused, so a
/// script in the web view cannot reach `~/.ssh/id_rsa` or write outside the
/// document the author opened.
pub fn confine_chapter(root: &Path, requested: &str) -> Result<PathBuf, String> {
    let requested = Path::new(requested);
    let candidate = if requested.is_absolute() {
        requested.to_path_buf()
    } else {
        root.join(requested)
    };
    let name = candidate
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .ok_or_else(|| format!("{} does not name a file", candidate.display()))?;
    if !is_chapter(&name) {
        return Err(format!("{name} is not a Markdown chapter"));
    }
    // An existing chapter is canonicalised whole, so a symlink pointing out of
    // the document is caught. One that does not exist yet is resolved through
    // its folder, which must exist and is canonicalised the same way.
    let resolved = match fs::canonicalize(&candidate) {
        Ok(path) => path,
        Err(_) => {
            let parent = candidate
                .parent()
                .ok_or_else(|| format!("{name} has no folder"))?;
            fs::canonicalize(parent)
                .map_err(|e| format!("cannot resolve {}: {e}", parent.display()))?
                .join(&name)
        }
    };
    if !resolved.starts_with(root) {
        return Err(format!("{name} is outside the open document"));
    }
    Ok(resolved)
}

/// Walk a document folder into a `DocumentTree`.
pub fn read_tree(folder: &Path) -> Result<DocumentTree, String> {
    if !folder.is_dir() {
        return Err(format!("{} is not a folder", folder.display()));
    }
    let mut failures = Vec::new();
    let root = read_part(folder, 0, &mut failures)?;
    Ok(DocumentTree { root, failures })
}

/// Read one Chapter's Markdown.
pub fn read_chapter_text(path: &Path) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("cannot read {}: {e}", path.display()))
}

/// Write one Chapter's Markdown, replacing what is there.
///
/// The text goes to a temporary file beside the chapter — the same directory,
/// so the same filesystem, so the rename that follows is atomic — is flushed to
/// disk, and only then takes the chapter's place. A crash or a full disk part
/// way through leaves the original file whole rather than truncated. The
/// temporary name starts with a dot, so a walk running concurrently skips it.
pub fn write_chapter_text(path: &Path, text: &str) -> Result<(), String> {
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
        NEXT_TEMP.fetch_add(1, AtomicOrdering::Relaxed)
    ));

    let written = (|| -> std::io::Result<()> {
        let mut file = fs::File::create(&temp)?;
        file.write_all(text.as_bytes())?;
        file.sync_all()
    })();
    if let Err(error) = written {
        let _ = fs::remove_file(&temp);
        return Err(format!("cannot write {}: {error}", path.display()));
    }

    fs::rename(&temp, path).map_err(|error| {
        let _ = fs::remove_file(&temp);
        format!("cannot replace {}: {error}", path.display())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The tests read a real filesystem, so they need real permission bits.
    #[cfg(unix)]
    fn set_mode(path: &Path, mode: u32) {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(mode)).expect("permissions");
    }

    #[test]
    fn splits_a_numeric_prefix_off_a_name() {
        assert_eq!(split_order("03-second.md"), (Some(3), "second.md"));
        assert_eq!(split_order("10 first.md"), (Some(10), "first.md"));
        assert_eq!(split_order("intro.md"), (None, "intro.md"));
    }

    #[test]
    fn builds_a_display_title() {
        assert_eq!(title_of("03-getting-started.md", true), "getting started");
        assert_eq!(title_of("01_first_part", false), "first part");
    }

    #[test]
    fn recognises_a_chapter_whatever_the_case_of_its_extension() {
        assert!(is_chapter("01-alice.MD"));
        assert!(is_chapter("01-alice.Markdown"));
        assert!(!is_chapter("notes.txt"));
        assert!(!is_chapter("md"));
        assert_eq!(title_of("01-alice.MD", true), "alice");
    }

    #[test]
    fn orders_numbered_siblings_before_unnumbered_ones() {
        assert_eq!(
            compare_by_order((Some(2), "b"), (Some(10), "a")),
            Ordering::Less
        );
        assert_eq!(
            compare_by_order((Some(2), "b"), (None, "a")),
            Ordering::Less
        );
        assert_eq!(compare_by_order((None, "a"), (None, "b")), Ordering::Less);
    }

    #[test]
    fn walks_a_folder_of_chapters() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = root.path();
        fs::create_dir(base.join("02-second-part")).expect("part");
        fs::write(base.join("01-intro.md"), "# Intro\n").expect("chapter");
        fs::write(base.join("02-second-part/01-alice.md"), "# Alice\n").expect("chapter");
        fs::write(base.join("02-second-part/02-bob.md"), "# Bob\n").expect("chapter");
        fs::write(base.join("notes.txt"), "ignored").expect("other file");
        fs::write(base.join(".hidden.md"), "ignored").expect("hidden file");

        let tree = read_tree(base).expect("tree");
        assert_eq!(tree.failures, Vec::<String>::new());
        assert!(!tree.root.truncated);
        assert_eq!(tree.root.chapters.len(), 1);
        assert_eq!(tree.root.chapters[0].title, "intro");
        assert_eq!(tree.root.parts.len(), 1);
        let part = &tree.root.parts[0];
        assert_eq!(part.order, Some(2));
        assert_eq!(
            part.chapters.iter().map(|c| &c.title).collect::<Vec<_>>(),
            vec!["alice", "bob"]
        );
    }

    #[test]
    fn leaves_the_assets_folder_out_of_the_parts() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = root.path();
        fs::create_dir(base.join("assets")).expect("assets");
        fs::create_dir(base.join("Assets")).ok();
        fs::create_dir(base.join("01-part")).expect("part");
        fs::create_dir(base.join("01-part/assets")).expect("nested assets");
        fs::write(base.join("assets/lantern.jpg"), "not markdown").expect("asset");
        fs::write(base.join("01-part/01-alice.md"), "# Alice\n").expect("chapter");

        let tree = read_tree(base).expect("tree");
        assert_eq!(
            tree.root
                .parts
                .iter()
                .map(|p| p.name.as_str())
                .collect::<Vec<_>>(),
            vec!["01-part"]
        );
        assert!(tree.root.parts[0].parts.is_empty());
    }

    #[test]
    #[cfg(unix)]
    fn refuses_a_name_that_is_not_utf8_instead_of_mangling_it() {
        use std::ffi::OsStr;
        use std::os::unix::ffi::OsStrExt;

        // 0xFF is not valid UTF-8 anywhere, so this name has no lossless
        // string form to hand the frontend. macOS's own filesystems will not
        // store such a name, so the walk cannot be driven over one here; the
        // decision the walk makes about it is what this checks.
        let broken = OsStr::from_bytes(b"02-b\xffob.md");
        let message = utf8_name(broken).expect_err("a lossy name is refused");
        assert!(message.contains("not a UTF-8 name"));
        assert_eq!(utf8_name(OsStr::new("01-alice.md")), Ok("01-alice.md"));
    }

    #[test]
    #[cfg(unix)]
    fn lists_a_chapter_reached_through_a_symlink() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = root.path();
        fs::create_dir(base.join("store")).expect("store");
        fs::write(base.join("store/real.md"), "# Real\n").expect("chapter");
        std::os::unix::fs::symlink(base.join("store/real.md"), base.join("01-alice.md"))
            .expect("symlink");

        let tree = read_tree(base).expect("tree");
        assert_eq!(
            tree.root
                .chapters
                .iter()
                .map(|c| c.name.as_str())
                .collect::<Vec<_>>(),
            vec!["01-alice.md"]
        );
    }

    #[test]
    fn marks_a_part_truncated_when_the_walk_runs_out_of_depth() {
        let root = tempfile::tempdir().expect("temp dir");
        let mut deep = root.path().to_path_buf();
        for level in 0..=MAX_DEPTH {
            deep = deep.join(format!("{level:02}-level"));
            fs::create_dir(&deep).expect("folder");
        }
        fs::write(deep.join("01-hidden.md"), "# Hidden\n").expect("chapter");

        let tree = read_tree(root.path()).expect("tree");
        let mut part = &tree.root;
        let mut depth = 0;
        while !part.parts.is_empty() {
            part = &part.parts[0];
            depth += 1;
        }
        assert_eq!(depth, MAX_DEPTH);
        assert!(part.truncated, "the deepest Part reports the cut");
        assert!(part.chapters.is_empty());
        assert!(!tree.root.truncated);
    }

    #[test]
    #[cfg(unix)]
    fn records_a_bad_entry_and_keeps_the_rest_of_the_tree() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = root.path();
        fs::write(base.join("01-intro.md"), "# Intro\n").expect("chapter");
        let closed = base.join("02-closed");
        fs::create_dir(&closed).expect("part");
        set_mode(&closed, 0o000);

        let tree = read_tree(base);
        set_mode(&closed, 0o755);
        let tree = tree.expect("a partial tree, not a failure");

        assert_eq!(tree.root.chapters.len(), 1, "the readable chapter survives");
        assert_eq!(tree.failures.len(), 1, "the unreadable Part is recorded");
        assert!(tree.failures[0].contains("02-closed"));
    }

    #[test]
    fn round_trips_a_chapter() {
        let root = tempfile::tempdir().expect("temp dir");
        let path = root.path().join("01-carol.md");
        write_chapter_text(&path, "# Carol\n").expect("write");
        assert_eq!(read_chapter_text(&path).expect("read"), "# Carol\n");
    }

    #[test]
    fn round_trips_crlf_bytes_untouched() {
        let root = tempfile::tempdir().expect("temp dir");
        let path = root.path().join("01-carol.md");
        let text = "# Carol\r\n\r\nA line.\r\n";
        write_chapter_text(&path, text).expect("write");
        assert_eq!(fs::read(&path).expect("bytes"), text.as_bytes());
        assert_eq!(read_chapter_text(&path).expect("read"), text);
    }

    #[test]
    fn leaves_no_temporary_file_behind() {
        let root = tempfile::tempdir().expect("temp dir");
        let path = root.path().join("01-carol.md");
        write_chapter_text(&path, "# Carol\n").expect("write");
        let names: Vec<String> = fs::read_dir(root.path())
            .expect("read dir")
            .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
            .collect();
        assert_eq!(names, vec!["01-carol.md".to_string()]);
    }

    #[test]
    #[cfg(unix)]
    fn leaves_the_original_intact_when_the_write_fails() {
        let root = tempfile::tempdir().expect("temp dir");
        let folder = root.path().join("part");
        fs::create_dir(&folder).expect("folder");
        let path = folder.join("01-carol.md");
        fs::write(&path, "# Carol\n").expect("seed");

        // A read-only folder is the reachable stand-in for a full disk: the
        // temporary file cannot be created, so the rename never happens.
        set_mode(&folder, 0o555);
        let result = write_chapter_text(&path, "# Ruined\n");
        set_mode(&folder, 0o755);

        assert!(result.is_err(), "the failure is reported, not swallowed");
        assert_eq!(fs::read_to_string(&path).expect("read"), "# Carol\n");
    }

    #[test]
    fn confines_a_chapter_to_the_open_document() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = canonical_root(&root.path().to_string_lossy()).expect("root");
        fs::create_dir(base.join("01-part")).expect("part");
        fs::write(base.join("01-part/01-alice.md"), "# Alice\n").expect("chapter");

        let inside = base.join("01-part/01-alice.md");
        assert_eq!(
            confine_chapter(&base, &inside.to_string_lossy()).expect("inside"),
            inside
        );
        // A chapter that does not exist yet still resolves, through its folder.
        assert!(confine_chapter(&base, "01-part/02-bob.md").is_ok());
    }

    #[test]
    fn refuses_a_path_that_climbs_out_of_the_document() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = canonical_root(&root.path().to_string_lossy()).expect("root");
        let outside = root.path().parent().expect("parent").join("secrets.md");
        fs::write(&outside, "# Secrets\n").expect("outside file");

        let climb = base.join("..").join("secrets.md");
        assert!(confine_chapter(&base, &climb.to_string_lossy()).is_err());
        assert!(confine_chapter(&base, "../secrets.md").is_err());
        assert!(confine_chapter(&base, &outside.to_string_lossy()).is_err());
        fs::remove_file(&outside).expect("clean up");
    }

    #[test]
    #[cfg(unix)]
    fn refuses_a_chapter_symlinked_out_of_the_document() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = canonical_root(&root.path().to_string_lossy()).expect("root");
        let outside = root.path().parent().expect("parent").join("elsewhere.md");
        fs::write(&outside, "# Elsewhere\n").expect("outside file");
        std::os::unix::fs::symlink(&outside, base.join("01-escape.md")).expect("symlink");

        let result = confine_chapter(&base, "01-escape.md");
        fs::remove_file(&outside).expect("clean up");
        assert!(
            result.is_err(),
            "a link out of the document is not a chapter"
        );
    }

    #[test]
    fn refuses_a_path_that_is_not_a_chapter() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = canonical_root(&root.path().to_string_lossy()).expect("root");
        fs::write(base.join("secrets.txt"), "shh").expect("file");
        assert!(confine_chapter(&base, "secrets.txt").is_err());
        assert!(confine_chapter(&base, "id_rsa").is_err());
        assert!(confine_chapter(&base, "01-alice.MD").is_ok());
    }
}
