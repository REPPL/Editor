//! Preview: the whole document the editing window holds, and the window
//! that reads it.
//!
//! The article is one page for the whole document (spc-2609061318090042), so
//! unlike [`crate::present`], which hands the present window one chapter's
//! text, this hands the preview window every chapter's — the open one from
//! its buffer, the rest as the frontend last read them, so an unsaved edit
//! previews the same way an unsaved edit presents. Rendering happens in the
//! preview window itself, from the rendering core the whole application
//! shares: nothing here parses Markdown or builds a page.

use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::document;

/// One chapter of the document waiting to be previewed.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewChapter {
    /// Relative to the document root, the same shape the build renders by.
    pub path: String,
    pub text: String,
}

/// The document waiting to be previewed, as the editing window holds it.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewSource {
    pub title: String,
    pub variant: String,
    pub chapters: Vec<PreviewChapter>,
}

/// The one document waiting to be collected.
///
/// A second Preview replaces the first: there is one preview window, and the
/// document it shows is the newest text. Nothing accumulates, and nothing is
/// written, so previewing twice leaves no second copy of anything.
#[derive(Default)]
pub struct PendingPreview(Mutex<Option<PreviewSource>>);

impl PendingPreview {
    /// Hold a document for the preview window to collect.
    pub fn set(&self, source: PreviewSource) -> Result<(), String> {
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the pending preview is unreadable".to_string())?;
        *held = Some(source);
        Ok(())
    }

    /// The document waiting, or a refusal when Preview has not been pressed.
    pub fn get(&self) -> Result<PreviewSource, String> {
        self.0
            .lock()
            .map_err(|_| "the pending preview is unreadable".to_string())?
            .clone()
            .ok_or_else(|| "nothing to preview".to_string())
    }
}

/// The window label the preview runs in.
pub const PREVIEW_WINDOW: &str = "preview";

/// The page the preview window loads, from the bundle rather than from a
/// string — the same reasoning `present.rs` gives `PRESENT_PAGE`: the site's
/// `script-src 'self'` forbids an inline-script page, and a second window
/// loading a page from the same bundle runs under that policy with no
/// relaxation.
const PREVIEW_PAGE: &str = "preview.html";

/// The event the preview window listens for when a new document is waiting.
pub const PREVIEW_EVENT: &str = "preview://document";

/// Preview the whole document: hold its chapters, and open or focus the
/// preview window.
///
/// Every chapter's own path is confined to the open document before it is
/// stored — the same discipline [`crate::present::hold_chapter`] holds a
/// deck's chapter to — so a script in the web view cannot make the preview
/// window carry a path outside it, even though nothing here reads a file:
/// the page later resolves an asset through [`crate::present::read_asset`],
/// which confines again at the moment it touches disk.
#[tauri::command]
pub async fn preview_document<R: tauri::Runtime>(
    source: PreviewSource,
    app: tauri::AppHandle<R>,
    root: tauri::State<'_, crate::DocumentRoot>,
    pending: tauri::State<'_, PendingPreview>,
) -> Result<(), String> {
    let root = root.get()?;
    for chapter in &source.chapters {
        document::confine_chapter(&root, &chapter.path)?;
    }
    pending.set(source)?;

    use tauri::{Emitter, Manager};
    if let Some(window) = app.get_webview_window(PREVIEW_WINDOW) {
        window
            .emit(PREVIEW_EVENT, ())
            .map_err(|error| format!("cannot open the preview window: {error}"))?;
        return window
            .set_focus()
            .map_err(|error| format!("cannot open the preview window: {error}"));
    }
    tauri::WebviewWindowBuilder::new(
        &app,
        PREVIEW_WINDOW,
        tauri::WebviewUrl::App(PREVIEW_PAGE.into()),
    )
    .title("Preview")
    .inner_size(1100.0, 760.0)
    .min_inner_size(390.0, 420.0)
    .resizable(true)
    .build()
    .map(|_| ())
    .map_err(|error| format!("cannot open the preview window: {error}"))
}

/// The document the preview window is waiting for.
#[tauri::command]
pub fn pending_preview(pending: tauri::State<'_, PendingPreview>) -> Result<PreviewSource, String> {
    pending.get()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_pending_preview_holds_one_document_and_refuses_before_it_is_set() {
        let pending = PendingPreview::default();
        assert!(pending.get().is_err());
        let source = PreviewSource {
            title: "The Lantern Papers".to_string(),
            variant: "talk".to_string(),
            chapters: vec![PreviewChapter {
                path: "01-beginnings/01-opening.md".to_string(),
                text: "# The Lantern Papers\n".to_string(),
            }],
        };
        pending.set(source.clone()).expect("held");
        assert_eq!(pending.get().expect("read"), source);
        // A second Preview replaces the first, rather than accumulating.
        let second = PreviewSource {
            chapters: vec![],
            ..source
        };
        pending.set(second.clone()).expect("held");
        assert_eq!(pending.get().expect("read"), second);
    }
}
