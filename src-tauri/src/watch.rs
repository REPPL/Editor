//! One recursive watcher over the open document folder.
//!
//! The page is told only that something changed, never what: it re-walks, and
//! the walk is the only thing that decides order. A diff the page trusted
//! would be a second answer to the question the walk already answers.
//!
//! Events are debounced, because a save is several filesystem events and a
//! copy from the Finder is many. The temporary files the atomic write creates
//! start with a dot, and the walk already skips those, so a save that provokes
//! a reload finds the bytes it wrote and changes nothing on screen.
//!
//! One watcher at a time. Opening a folder replaces the one before it, which
//! is what keeps "one document folder open at a time" true in the shell as
//! well as on screen; dropping the watcher stops the thread behind it.

use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;

use notify::RecommendedWatcher;
use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};

/// How long the watcher waits for the filesystem to settle.
///
/// Long enough that one save is one notification, short enough that a rename
/// in the Finder shows up while the author is still looking at the window.
pub const DEBOUNCE: Duration = Duration::from_millis(150);

/// The event the frontend listens for when the open folder changed.
pub const CHANGED_EVENT: &str = "document://changed";

/// A running watcher. Dropping it stops watching.
pub struct FolderWatch {
    _debouncer: Debouncer<RecommendedWatcher, RecommendedCache>,
}

/// Watch `root` and everything under it, calling `on_change` when it settles.
///
/// `on_change` is called once per debounced batch, with no argument: what
/// changed is deliberately not reported.
pub fn watch<F>(root: &Path, on_change: F) -> Result<FolderWatch, String>
where
    F: Fn() + Send + 'static,
{
    let mut debouncer = new_debouncer(DEBOUNCE, None, move |result: DebounceEventResult| {
        match result {
            Ok(events) => {
                // A batch that is nothing but Editor's own temporary files is
                // not a change the author made; the walk would not show it
                // either, so saying so would only make the page re-read.
                if events
                    .iter()
                    .any(|event| event.paths.iter().any(|path| !is_temporary(path)))
                {
                    on_change();
                }
            }
            Err(errors) => {
                for error in errors {
                    log::warn!("watching the document folder: {error}");
                }
            }
        }
    })
    .map_err(|error| format!("cannot watch the folder: {error}"))?;

    debouncer
        .watch(root, RecursiveMode::Recursive)
        .map_err(|error| format!("cannot watch {}: {error}", root.display()))?;

    Ok(FolderWatch {
        _debouncer: debouncer,
    })
}

/// Whether a path is one of the dot-prefixed temporaries an atomic write makes.
///
/// The walk skips every dotted name, so a change to one is invisible on screen
/// and must not provoke a redraw.
fn is_temporary(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.starts_with('.'))
        .unwrap_or(false)
}

/// The one watcher the application holds, replaced when a folder is opened.
#[derive(Default)]
pub struct CurrentWatch(Mutex<Option<FolderWatch>>);

impl CurrentWatch {
    /// Replace whatever is running with a watcher over `root`.
    ///
    /// The previous watcher is dropped first, so two folders are never watched
    /// at once even for the moment it takes to start the new one.
    pub fn replace<F>(&self, root: &Path, on_change: F) -> Result<(), String>
    where
        F: Fn() + Send + 'static,
    {
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the watcher is unreadable".to_string())?;
        *held = None;
        *held = Some(watch(root, on_change)?);
        Ok(())
    }

    /// Whether a watcher is running.
    pub fn is_watching(&self) -> bool {
        self.0.lock().map(|held| held.is_some()).unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    /// Wait until `predicate` holds, or give up. Filesystem events are not
    /// synchronous, and a fixed sleep is either flaky or slow.
    fn wait_for(predicate: impl Fn() -> bool) -> bool {
        for _ in 0..100 {
            if predicate() {
                return true;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        predicate()
    }

    #[test]
    fn emits_a_change_when_a_chapter_is_renamed() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = root.path();
        std::fs::write(base.join("01-alice.md"), "# Alice\n").expect("chapter");

        let seen = Arc::new(AtomicUsize::new(0));
        let counter = Arc::clone(&seen);
        let watch = watch(base, move || {
            counter.fetch_add(1, Ordering::Relaxed);
        })
        .expect("watcher");

        std::fs::rename(base.join("01-alice.md"), base.join("02-alice.md")).expect("rename");

        assert!(
            wait_for(|| seen.load(Ordering::Relaxed) > 0),
            "a rename inside the folder is reported"
        );
        drop(watch);
    }

    #[test]
    fn watches_below_the_root_as_well() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = root.path();
        std::fs::create_dir(base.join("01-part")).expect("part");

        let seen = Arc::new(AtomicUsize::new(0));
        let counter = Arc::clone(&seen);
        let watch = watch(base, move || {
            counter.fetch_add(1, Ordering::Relaxed);
        })
        .expect("watcher");

        std::fs::write(base.join("01-part/01-alice.md"), "# Alice\n").expect("chapter");

        assert!(
            wait_for(|| seen.load(Ordering::Relaxed) > 0),
            "a chapter added inside a Part is reported"
        );
        drop(watch);
    }

    #[test]
    fn keeps_one_watcher_and_replaces_it() {
        let first = tempfile::tempdir().expect("temp dir");
        let second = tempfile::tempdir().expect("temp dir");
        let current = CurrentWatch::default();
        assert!(!current.is_watching());
        current.replace(first.path(), || {}).expect("first");
        assert!(current.is_watching());
        current.replace(second.path(), || {}).expect("second");
        assert!(current.is_watching());
    }

    #[test]
    fn does_not_watch_a_folder_that_is_not_there() {
        let root = tempfile::tempdir().expect("temp dir");
        let missing = root.path().join("gone");
        assert!(watch(&missing, || {}).is_err());
    }

    #[test]
    fn ignores_the_temporary_file_an_atomic_write_makes() {
        assert!(is_temporary(Path::new("/doc/.01-alice.md.1.0.tmp")));
        assert!(!is_temporary(Path::new("/doc/01-alice.md")));
    }
}
