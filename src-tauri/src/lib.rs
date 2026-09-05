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

mod document;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::menu::{AboutMetadata, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager, WindowEvent};

use document::DocumentTree;

/// The event the frontend listens for when the Open Folder menu item fires.
const OPEN_FOLDER_EVENT: &str = "menu://open-folder";

/// The event the frontend listens for when a close was held back because the
/// open chapter has unsaved edits.
const CLOSE_REQUESTED_EVENT: &str = "window://close-requested";

/// The folder the author opened, canonicalised.
///
/// `None` until a folder is opened, which is what makes the chapter commands
/// refuse to touch anything at all before then.
#[derive(Default)]
struct DocumentRoot(Mutex<Option<PathBuf>>);

impl DocumentRoot {
    fn get(&self) -> Result<PathBuf, String> {
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
#[tauri::command]
async fn open_folder(
    path: String,
    root: tauri::State<'_, DocumentRoot>,
) -> Result<DocumentTree, String> {
    let (resolved, tree) = tauri::async_runtime::spawn_blocking(move || {
        let resolved = document::canonical_root(&path)?;
        let tree = document::read_tree(&resolved)?;
        Ok::<_, String>((resolved, tree))
    })
    .await
    .map_err(|error| format!("cannot open the folder: {error}"))??;
    root.set(resolved)?;
    Ok(tree)
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
        .invoke_handler(tauri::generate_handler![
            open_folder,
            read_chapter,
            write_chapter,
            set_dirty
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
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
