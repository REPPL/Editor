//! The Tauri shell around the web editing surface.
//!
//! Rust owns the file system; the frontend owns the editing. The shell also
//! owns the application menu, which is kept deliberately small so that it does
//! not claim keyboard combinations the Emacs bindings need.
//!
//! The web view is a trust boundary. Any script that ends up running in it —
//! today the application's own, tomorrow whatever a dependency or a rendered
//! document drags in — can invoke every command below with arguments of its
//! choosing. So the commands do not trust the paths they are given: the folder
//! the author opened is canonicalised into [`DocumentRoot`], and every chapter
//! path is resolved against it and refused if it lands anywhere else.

pub mod assets;
pub mod convert;
pub mod document;
pub mod metadata;
pub mod present;
pub mod publish;
pub mod settings;
pub mod watch;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::menu::{AboutMetadata, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{DragDropEvent, Emitter, Manager, WindowEvent};

use document::DocumentTree;
use metadata::DocumentMetadata;

/// The event the frontend listens for when the Open Folder menu item fires.
const OPEN_FOLDER_EVENT: &str = "menu://open-folder";

/// The event the frontend listens for when a close was held back because the
/// open chapter has unsaved edits.
const CLOSE_REQUESTED_EVENT: &str = "window://close-requested";

/// The event the frontend listens for when files are dropped on the window.
///
/// It carries the nonce that claims the dropped paths and the drop point in
/// logical pixels, which is the coordinate space the web view lays out in. The
/// paths themselves never cross: see [`assets::DropQueue`].
const DROPPED_EVENT: &str = "document://dropped";

/// What the shell tells the web view about a drop.
#[derive(Clone, serde::Serialize)]
struct Dropped {
    /// Claims the paths, once, within [`assets::NONCE_LIFETIME`].
    nonce: String,
    /// How many files the drop carried, so the modeline can say so.
    count: usize,
    /// The drop point, in logical pixels.
    x: f64,
    y: f64,
}

/// The folder the author opened, canonicalised.
///
/// `None` until a folder is opened, which is what makes the chapter commands
/// refuse to touch anything at all before then.
#[derive(Default)]
pub struct DocumentRoot(Mutex<Option<PathBuf>>);

impl DocumentRoot {
    pub fn get(&self) -> Result<PathBuf, String> {
        self.0
            .lock()
            .map_err(|_| "the document root is unreadable".to_string())?
            .clone()
            .ok_or_else(|| "no document folder is open".to_string())
    }

    fn set(&self, root: PathBuf) -> Result<(), String> {
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the document root is unreadable".to_string())?;
        *held = Some(root);
        Ok(())
    }
}

/// Whether the open chapter has unsaved edits, as the frontend last said.
///
/// The shell needs its own copy because the close request arrives in Rust,
/// before the frontend has any say in it.
#[derive(Default)]
struct Dirty(AtomicBool);

/// Walk a document folder into its Parts and Chapters, and make it the root
/// every later chapter path is measured against.
///
/// Opening a folder also replaces the watcher, so exactly one document folder
/// is watched at a time — the shell's half of "one document open at a time".
#[tauri::command]
async fn open_folder(
    path: String,
    app: tauri::AppHandle,
    root: tauri::State<'_, DocumentRoot>,
    watcher: tauri::State<'_, watch::CurrentWatch>,
) -> Result<DocumentTree, String> {
    let (resolved, tree) = tauri::async_runtime::spawn_blocking(move || {
        let resolved = document::canonical_root(&path)?;
        let tree = document::read_tree(&resolved)?;
        Ok::<_, String>((resolved, tree))
    })
    .await
    .map_err(|error| format!("cannot open the folder: {error}"))??;
    root.set(resolved.clone())?;
    // A folder that cannot be watched still opens. The author loses the
    // automatic redraw, not the document, and the reload chord is still there.
    if let Err(error) = watcher.replace(&resolved, move || {
        if let Err(error) = app.emit(watch::CHANGED_EVENT, ()) {
            log::error!("cannot emit {}: {error}", watch::CHANGED_EVENT);
        }
    }) {
        log::warn!("{error}");
    }
    Ok(tree)
}

/// Read many Chapters' Markdown in one round trip.
///
/// A reload draws the whole tree, so it needs every chapter's text at once;
/// one round trip per chapter would make a redraw cost as many crossings as
/// the document has files. Each path is confined separately, and one
/// unreadable chapter is a line in `failures` rather than a failed batch.
#[tauri::command]
async fn read_chapters(
    paths: Vec<String>,
    root: tauri::State<'_, DocumentRoot>,
) -> Result<document::ChapterBatch, String> {
    let root = root.get()?;
    tauri::async_runtime::spawn_blocking(move || document::read_many(&root, &paths))
        .await
        .map_err(|error| format!("cannot read the chapters: {error}"))
}

/// Add the Markdown files of a drop to a Part as its next chapters.
///
/// The source is named by the drop's nonce, never by a path: the web view does
/// not hand the shell a file to copy from, exactly as `drop_on_chapter` does
/// not. An unknown or expired nonce is refused. The whole drop is checked
/// before anything is written, so a drop carrying one file that is not
/// Markdown creates nothing at all and says what a Part accepts.
#[tauri::command]
async fn add_chapter(
    part: String,
    nonce: String,
    root: tauri::State<'_, DocumentRoot>,
    queue: tauri::State<'_, assets::DropQueue>,
) -> Result<Vec<document::Chapter>, String> {
    let root = root.get()?;
    let sources = queue.claim(&nonce)?;
    tauri::async_runtime::spawn_blocking(move || {
        let folder = document::confine_part(&root, &part)?;
        document::add_chapters_from(&folder, &sources)
    })
    .await
    .map_err(|error| format!("cannot add the chapter: {error}"))?
}

/// Read the open document's `document.yaml`.
///
/// The path is not the frontend's to give: there is one metadata file and it
/// sits at the root, so the command takes no argument and still resolves the
/// name through the confinement primitive, which is what keeps the rule "every
/// path goes through `confine_path`" true of every command rather than of most
/// of them.
#[tauri::command]
async fn read_document_metadata(
    root: tauri::State<'_, DocumentRoot>,
) -> Result<DocumentMetadata, String> {
    let root = root.get()?;
    tauri::async_runtime::spawn_blocking(move || {
        metadata::read_metadata(&document::confine_path(&root, metadata::METADATA_FILE)?)
    })
    .await
    .map_err(|error| format!("cannot read the document metadata: {error}"))?
}

/// Read one Chapter's Markdown.
#[tauri::command]
async fn read_chapter(
    path: String,
    root: tauri::State<'_, DocumentRoot>,
) -> Result<String, String> {
    let root = root.get()?;
    tauri::async_runtime::spawn_blocking(move || {
        document::read_chapter_text(&document::confine_chapter(&root, &path)?)
    })
    .await
    .map_err(|error| format!("cannot read the chapter: {error}"))?
}

/// Write one Chapter's Markdown.
#[tauri::command]
async fn write_chapter(
    path: String,
    text: String,
    root: tauri::State<'_, DocumentRoot>,
) -> Result<(), String> {
    let root = root.get()?;
    tauri::async_runtime::spawn_blocking(move || {
        document::write_chapter_text(&document::confine_chapter(&root, &path)?, &text)
    })
    .await
    .map_err(|error| format!("cannot write the chapter: {error}"))?
}

/// Tell the shell whether the open chapter has unsaved edits.
#[tauri::command]
fn set_dirty(dirty: bool, state: tauri::State<'_, Dirty>) {
    state.0.store(dirty, Ordering::Relaxed);
}

/// Build the application menu.
///
/// macOS always shows a menu bar, so the choice is which one. The default Tauri
/// menu carries an Edit submenu whose accelerators (Cmd-Z, Cmd-X, Cmd-C,
/// Cmd-V, Cmd-A) are handled by the system before the web view sees them, and a
/// View submenu that takes Ctrl-Cmd-F. This menu keeps only what the shell
/// genuinely needs: the App submenu macOS requires, one File item for opening a
/// document folder, and a Window submenu. Every other combination is left for
/// the editing surface.
fn install_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let app_menu = SubmenuBuilder::new(app, "Editor")
        .about(Some(AboutMetadata::default()))
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let open_folder_item = MenuItemBuilder::with_id("open-folder", "Open Folder…")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&open_folder_item)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .close_window()
        .build()?;

    let menu = MenuBuilder::new(app)
        .items(&[&app_menu, &file_menu, &window_menu])
        .build()?;
    app.set_menu(menu)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(DocumentRoot::default())
        .manage(Dirty::default())
        .manage(assets::DropQueue::default())
        .manage(watch::CurrentWatch::default())
        .manage(present::PendingDeck::default())
        .manage(publish::PublishInProgress::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_folder,
            read_document_metadata,
            read_chapter,
            read_chapters,
            write_chapter,
            add_chapter,
            set_dirty,
            assets::drop_on_chapter,
            assets::paste_reference,
            present::present_chapter,
            present::pending_deck,
            present::read_asset,
            settings::get_settings,
            settings::set_publish_target,
            settings::set_asset_root,
            publish::publish_preflight,
            publish::publish,
            publish::publish_dry_run,
            publish::check_deploy,
            publish::read_publish_log,
            publish::open_published_link
        ])
        .setup(|app| {
            // A release build fails as readily as a debug one, and a failure
            // nobody can see is a failure nobody can fix, so the logger is
            // installed either way — verbosely while developing, errors only
            // once shipped.
            let level = if cfg!(debug_assertions) {
                log::LevelFilter::Info
            } else {
                log::LevelFilter::Error
            };
            app.handle()
                .plugin(tauri_plugin_log::Builder::default().level(level).build())?;
            install_menu(app.handle())?;
            // The spike needs the window to own the keyboard the moment it
            // appears, so that the first chord typed is a fair test.
            if let Some(window) = app.get_webview_window("main") {
                window.set_focus()?;
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "open-folder" {
                if let Err(error) = app.emit(OPEN_FOLDER_EVENT, ()) {
                    log::error!("cannot emit {OPEN_FOLDER_EVENT}: {error}");
                }
            }
        })
        .on_window_event(|window, event| {
            // Closing the window is the one exit the frontend cannot intercept
            // for itself, so the shell holds the close back while the open
            // chapter has unsaved edits and lets the frontend ask.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.state::<Dirty>().0.load(Ordering::Relaxed) {
                    api.prevent_close();
                    if let Err(error) = window.emit(CLOSE_REQUESTED_EVENT, ()) {
                        log::error!("cannot emit {CLOSE_REQUESTED_EVENT}: {error}");
                    }
                }
            }
            // The shell, not the web view, receives the native drop, so it is
            // the shell that holds the real paths. It hands the web view a
            // nonce and the point the author let go at, and nothing else.
            if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, position }) = event {
                if paths.is_empty() {
                    return;
                }
                let queue = window.state::<assets::DropQueue>();
                let nonce = match queue.offer(paths.clone()) {
                    Ok(nonce) => nonce,
                    Err(error) => {
                        log::error!("cannot hold the drop: {error}");
                        return;
                    }
                };
                let scale = window.scale_factor().unwrap_or(1.0);
                let point = position.to_logical::<f64>(scale);
                let dropped = Dropped {
                    nonce,
                    count: paths.len(),
                    x: point.x,
                    y: point.y,
                };
                if let Err(error) = window.emit(DROPPED_EVENT, dropped) {
                    log::error!("cannot emit {DROPPED_EVENT}: {error}");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
