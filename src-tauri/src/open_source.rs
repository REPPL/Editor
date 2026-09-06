//! Opening whatever Alice already has on disk: a document folder, exactly as
//! map #1 (`itd-2609051335399446`) reads one, or a single Markdown file with
//! nothing written for it (`itd-2609061509393380`, map #35).
//!
//! `C-x C-o` used to sit beside `C-x o` as a second way to move to the other
//! pane; the maintainer asked for it to open something instead, so the pane
//! cycle keeps `C-x o` alone, as Emacs does, and this module answers the
//! freed chord.
//!
//! The folder or file Alice picks is chosen through the shell's own dialog,
//! on the trust model `new_document.rs` and `export.rs` both use: the web
//! view never names a path, it names the nonce this module minted for
//! whatever the author actually picked, and the nonce is good for one claim.
//! A native panel can offer files or folders, never both in the same one —
//! `tauri-plugin-dialog` 2.7.3's own `desktop.rs` builds `pick_file` and
//! `pick_folder` from the same `rfd` 0.16 `FileDialogBuilder`, and the two
//! backend calls set the platform panel's own `canChooseFiles`/
//! `canChooseDirectories` pair the other way with no option to relax either
//! — confirmed by reading `rfd`'s own macOS backend rather than assumed. So
//! the page asks which kind of thing first, in its own small chooser, and
//! this module answers whichever dialog that choice opens
//! (`.abcd/work/DECISIONS.md`).

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::Emitter;

use crate::document;
use crate::metadata::METADATA_FILE;
use crate::watch;
use crate::DocumentRoot;

/// How long a pick stays claimable — the same span `new_document.rs` and
/// `export.rs` both give their own destination.
pub const PICK_LIFETIME: Duration = Duration::from_secs(30);

/// What the author picked: a folder to walk, or a single file to open on its
/// own.
#[derive(Debug, Clone, Copy)]
enum PickedKind {
    Folder,
    File,
}

/// One answer either dialog gave, held under the nonce that claims it.
struct Picked {
    nonce: String,
    kind: PickedKind,
    path: PathBuf,
    at: Instant,
}

/// The picks offered to `C-x C-o`, each under the nonce that claims it.
///
/// A third store rather than a share of `export::ExportDestinations` or
/// `new_document::NewDocumentDestinations`: this module answers a different
/// question again — what either dialog produces is a *pick*, spent by
/// opening it, not a destination a later write claims.
#[derive(Default)]
pub struct OpenSourcePicks(Mutex<Vec<Picked>>);

impl OpenSourcePicks {
    fn offer(&self, kind: PickedKind, path: PathBuf) -> Result<String, String> {
        self.offer_at(kind, path, Instant::now())
    }

    fn offer_at(&self, kind: PickedKind, path: PathBuf, now: Instant) -> Result<String, String> {
        let nonce = crate::assets::mint_nonce()?;
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the chosen source is unreadable".to_string())?;
        held.retain(|picked| now.duration_since(picked.at) < PICK_LIFETIME);
        held.push(Picked {
            nonce: nonce.clone(),
            kind,
            path,
            at: now,
        });
        Ok(nonce)
    }

    fn claim(&self, nonce: &str) -> Result<(PickedKind, PathBuf), String> {
        self.claim_at(nonce, Instant::now())
    }

    fn claim_at(&self, nonce: &str, now: Instant) -> Result<(PickedKind, PathBuf), String> {
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the chosen source is unreadable".to_string())?;
        held.retain(|picked| now.duration_since(picked.at) < PICK_LIFETIME);
        let index = held
            .iter()
            .position(|picked| picked.nonce == nonce)
            .ok_or_else(|| "that choice is no longer on offer. Choose again.".to_string())?;
        let picked = held.remove(index);
        Ok((picked.kind, picked.path))
    }
}

/// The last segment of a path, as a name a message may carry — never the
/// machine path around it.
fn name_of(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// What either dialog hands back: the nonce that claims what the author
/// picked, and its own name.
#[derive(Debug, Clone, Serialize)]
pub struct PickedSource {
    pub nonce: String,
    pub name: String,
}

/// What claiming a pick opened: the tree to show, and the chapter to select,
/// when the pick named a file rather than a folder.
#[derive(Debug, Clone, Serialize)]
pub struct OpenedSource {
    pub tree: document::DocumentTree,
    pub selected_chapter: Option<String>,
}

/// The document root above `file`, if one carries `document.yaml`.
///
/// Walked from the file's own folder upward, because a chapter can sit
/// arbitrarily deep under nested Parts (`document::read_part` recurses on the
/// way down with no shallower bound than `MAX_DEPTH`); this is the same
/// question `new_document.rs`'s own `what_it_already_holds` answers for a
/// destination it refuses, asked in the other direction.
fn document_root_above(file: &Path) -> Option<PathBuf> {
    let start = file.parent()?;
    for ancestor in start.ancestors() {
        if ancestor.join(METADATA_FILE).is_file() {
            return Some(ancestor.to_path_buf());
        }
    }
    None
}

/// Whether a tree carries a chapter at exactly this path, anywhere beneath
/// its root.
fn tree_contains_chapter(part: &document::Part, path: &str) -> bool {
    part.chapters.iter().any(|chapter| chapter.path == path)
        || part
            .parts
            .iter()
            .any(|child| tree_contains_chapter(child, path))
}

/// Resolve one pick into the folder that becomes the new `DocumentRoot`, the
/// tree to show, and the chapter to select, if any.
fn resolve_source(
    kind: PickedKind,
    path: &Path,
) -> Result<(PathBuf, document::DocumentTree, Option<String>), String> {
    match kind {
        PickedKind::Folder => {
            let resolved = document::canonical_root(&path.to_string_lossy())?;
            let tree = document::read_tree(&resolved)?;
            Ok((resolved, tree, None))
        }
        PickedKind::File => {
            let resolved = fs::canonicalize(path)
                .map_err(|error| format!("cannot resolve the file you chose: {error}"))?;
            // Refuses a file that is not Markdown before anything else is
            // asked of it, and is also the tree this pick falls back to when
            // no real document is found above it.
            let standalone = document::read_single_chapter(&resolved)?;
            if let Some(root) = document_root_above(&resolved) {
                let tree = document::read_tree(&root)?;
                let selected = resolved.to_string_lossy().into_owned();
                let selected_chapter = if tree_contains_chapter(&tree.root, &selected) {
                    Some(selected)
                } else {
                    None
                };
                return Ok((root, tree, selected_chapter));
            }
            let selected = resolved.to_string_lossy().into_owned();
            let root_path = PathBuf::from(&standalone.root.path);
            Ok((root_path, standalone, Some(selected)))
        }
    }
}

/* ---------------------------------------------------------------------------
 * The commands.
 * ------------------------------------------------------------------------- */

/// Ask the author for a folder to open, and hold the answer under a nonce.
#[tauri::command]
pub async fn pick_document_folder(
    app: tauri::AppHandle,
    picks: tauri::State<'_, OpenSourcePicks>,
) -> Result<Option<PickedSource>, String> {
    use tauri_plugin_dialog::DialogExt;

    let picked =
        tauri::async_runtime::spawn_blocking(move || app.dialog().file().blocking_pick_folder())
            .await
            .map_err(|error| format!("cannot open the folder chooser: {error}"))?;
    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked
        .into_path()
        .map_err(|error| format!("cannot read the folder you chose: {error}"))?;
    let path = fs::canonicalize(&path)
        .map_err(|error| format!("cannot resolve the folder you chose: {error}"))?;
    let name = name_of(&path);
    let nonce = picks.offer(PickedKind::Folder, path)?;
    Ok(Some(PickedSource { nonce, name }))
}

/// Ask the author for a single file to open, and hold the answer the same
/// way. The Markdown filter is a hint to the panel, not an enforced rule —
/// the author can still switch it to "All Files" — so what is actually
/// chosen is checked again on claim, by `document::read_single_chapter`.
#[tauri::command]
pub async fn pick_document_file(
    app: tauri::AppHandle,
    picks: tauri::State<'_, OpenSourcePicks>,
) -> Result<Option<PickedSource>, String> {
    use tauri_plugin_dialog::DialogExt;

    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Markdown", &["md", "markdown"])
            .blocking_pick_file()
    })
    .await
    .map_err(|error| format!("cannot open the file chooser: {error}"))?;
    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked
        .into_path()
        .map_err(|error| format!("cannot read the file you chose: {error}"))?;
    let path = fs::canonicalize(&path)
        .map_err(|error| format!("cannot resolve the file you chose: {error}"))?;
    let name = name_of(&path);
    let nonce = picks.offer(PickedKind::File, path)?;
    Ok(Some(PickedSource { nonce, name }))
}

/// Claim a pick's nonce and open what it named.
///
/// Sets `DocumentRoot` and replaces the folder watcher exactly as
/// `open_folder`'s own command body already does, whichever route
/// `resolve_source` took to get there — one canonical root, one watcher.
#[tauri::command]
pub async fn open_document_source(
    nonce: String,
    app: tauri::AppHandle,
    picks: tauri::State<'_, OpenSourcePicks>,
    root: tauri::State<'_, DocumentRoot>,
    watcher: tauri::State<'_, watch::CurrentWatch>,
) -> Result<OpenedSource, String> {
    let (kind, path) = picks.claim(&nonce)?;
    let (resolved, tree, selected_chapter) =
        tauri::async_runtime::spawn_blocking(move || resolve_source(kind, &path))
            .await
            .map_err(|error| format!("cannot open what you chose: {error}"))??;
    root.set(resolved.clone())?;
    if let Err(error) = watcher.replace(&resolved, move || {
        if let Err(error) = app.emit(watch::CHANGED_EVENT, ()) {
            log::error!("cannot emit {}: {error}", watch::CHANGED_EVENT);
        }
    }) {
        log::warn!("{error}");
    }
    Ok(OpenedSource {
        tree,
        selected_chapter,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp() -> tempfile::TempDir {
        tempfile::tempdir().expect("temp dir")
    }

    #[test]
    fn a_pick_is_the_dialog_s_answer_claimed_once() {
        let picks = OpenSourcePicks::default();
        let dir = temp();
        let nonce = picks
            .offer_at(PickedKind::Folder, dir.path().to_path_buf(), Instant::now())
            .expect("offered");
        assert_ne!(nonce, "");
        let (kind, path) = picks.claim_at(&nonce, Instant::now()).expect("claimed");
        assert!(matches!(kind, PickedKind::Folder));
        assert_eq!(path, dir.path());
        let again = picks.claim_at(&nonce, Instant::now()).expect_err("spent");
        assert!(again.contains("no longer on offer"), "{again}");
    }

    #[test]
    fn a_pick_expires_after_its_lifetime() {
        let picks = OpenSourcePicks::default();
        let dir = temp();
        let then = Instant::now();
        let nonce = picks
            .offer_at(PickedKind::File, dir.path().to_path_buf(), then)
            .expect("offered");
        let later = then + PICK_LIFETIME + Duration::from_millis(1);
        let error = picks.claim_at(&nonce, later).expect_err("expired");
        assert!(error.contains("no longer on offer"), "{error}");
    }

    #[test]
    fn resolves_a_folder_pick_exactly_as_open_folder_would() {
        let dir = temp();
        fs::create_dir(dir.path().join("01-part")).expect("part");
        fs::write(dir.path().join("01-part/01-alice.md"), "# Alice\n").expect("chapter");

        let (resolved, tree, selected) =
            resolve_source(PickedKind::Folder, dir.path()).expect("resolved");
        let canonical = fs::canonicalize(dir.path()).expect("canonical");
        assert_eq!(resolved, canonical);
        assert_eq!(tree.root.parts.len(), 1);
        assert_eq!(tree.root.parts[0].chapters.len(), 1);
        assert_eq!(selected, None);
    }

    #[test]
    fn resolves_a_bare_file_as_a_one_chapter_document_and_writes_nothing() {
        let dir = temp();
        let file = dir.path().join("01-notes.md");
        fs::write(&file, "# Notes\n\nWritten on a train.\n").expect("chapter");
        let before: Vec<_> = fs::read_dir(dir.path()).expect("read before").collect();

        let (resolved, tree, selected) = resolve_source(PickedKind::File, &file).expect("resolved");
        let canonical_file = fs::canonicalize(&file).expect("canonical");
        let canonical_folder = fs::canonicalize(dir.path()).expect("canonical folder");
        assert_eq!(resolved, canonical_folder);
        assert!(tree.root.parts.is_empty());
        assert_eq!(tree.root.chapters.len(), 1);
        assert_eq!(
            selected,
            Some(canonical_file.to_string_lossy().into_owned())
        );

        let after: Vec<_> = fs::read_dir(dir.path()).expect("read after").collect();
        assert_eq!(before.len(), after.len(), "nothing was written");
    }

    #[test]
    fn finds_the_document_root_above_a_chapter_two_levels_deep() {
        let dir = temp();
        fs::write(
            dir.path().join(METADATA_FILE),
            "title: The Lantern Papers\n",
        )
        .expect("metadata");
        let part = dir.path().join("01-beginnings");
        fs::create_dir(&part).expect("part");
        let chapter = part.join("01-opening.md");
        fs::write(&chapter, "# Opening\n").expect("chapter");

        let (resolved, tree, selected) =
            resolve_source(PickedKind::File, &chapter).expect("resolved");
        let canonical_root = fs::canonicalize(dir.path()).expect("canonical root");
        let canonical_chapter = fs::canonicalize(&chapter).expect("canonical chapter");
        assert_eq!(resolved, canonical_root);
        assert_eq!(tree.root.parts.len(), 1);
        assert_eq!(
            selected,
            Some(canonical_chapter.to_string_lossy().into_owned())
        );
    }

    #[test]
    fn refuses_a_non_markdown_file_pick_and_writes_nothing() {
        let dir = temp();
        let file = dir.path().join("notes.txt");
        fs::write(&file, "Not Markdown.").expect("file");
        let before: Vec<_> = fs::read_dir(dir.path()).expect("read before").collect();

        let error = resolve_source(PickedKind::File, &file).expect_err("refused");
        assert!(error.contains("is not a Markdown file"), "{error}");

        let after: Vec<_> = fs::read_dir(dir.path()).expect("read after").collect();
        assert_eq!(before.len(), after.len(), "nothing was written");
    }

    #[test]
    fn refuses_a_non_markdown_file_even_when_it_sits_inside_a_real_document() {
        // The Markdown check runs before the ancestor walk, so a picked file
        // that is not Markdown is refused the same way whether or not a
        // document.yaml sits above it.
        let dir = temp();
        fs::write(
            dir.path().join(METADATA_FILE),
            "title: The Lantern Papers\n",
        )
        .expect("metadata");
        let part = dir.path().join("01-beginnings");
        fs::create_dir(&part).expect("part");
        let file = part.join("notes.txt");
        fs::write(&file, "Not Markdown.").expect("file");

        let error = resolve_source(PickedKind::File, &file).expect_err("refused");
        assert!(error.contains("is not a Markdown file"), "{error}");
    }
}
