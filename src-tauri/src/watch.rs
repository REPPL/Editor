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

    /// Perform `trigger` again and again, polling `predicate` with a
    /// deadline rather than a fixed sleep, until one holds or both give up.
    ///
    /// A single filesystem operation right after `watch` returns can still
    /// race the OS's own event delivery under heavy scheduling load — the
    /// call returns once the watch is *requested*, not necessarily once
    /// delivery for it is fully armed — so waiting longer for the *one*
    /// operation already performed is not enough on its own: under load this
    /// crate's own test suite produces (and, on a machine shared with other
    /// concurrent work, `fseventsd` itself queuing behind every other
    /// watcher on the system), the first operation can be missed entirely
    /// rather than merely reported late. Repeating a fresh operation every
    /// quarter-second, spaced well past the debouncer's own `DEBOUNCE`
    /// window, for up to thirty seconds, is what a watch that is not yet
    /// truly listening eventually catches, which is what made these two
    /// tests flake under concurrent load even after they were already
    /// polling with a deadline rather than a fixed sleep
    /// (`iss-2609061520160056`).
    fn trigger_until_seen(mut trigger: impl FnMut(), predicate: impl Fn() -> bool) -> bool {
        for _ in 0..120 {
            if predicate() {
                return true;
            }
            trigger();
            std::thread::sleep(Duration::from_millis(250));
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

        // Alternates the chapter's name back and forth: every attempt is a
        // genuine rename, and one from each end exists at any given moment
        // for the next attempt to rename again.
        let mut swapped = false;
        assert!(
            trigger_until_seen(
                || {
                    let (from, to) = if swapped {
                        (base.join("02-alice.md"), base.join("01-alice.md"))
                    } else {
                        (base.join("01-alice.md"), base.join("02-alice.md"))
                    };
                    std::fs::rename(from, to).expect("rename");
                    swapped = !swapped;
                },
                || seen.load(Ordering::Relaxed) > 0
            ),
            "a rename inside the folder is reported"
        );
        drop(watch);
    }

    #[test]
    fn watches_below_the_root_as_well() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = root.path();
        let part = base.join("01-part");
        std::fs::create_dir(&part).expect("part");

        let seen = Arc::new(AtomicUsize::new(0));
        let counter = Arc::clone(&seen);
        let watch = watch(base, move || {
            counter.fetch_add(1, Ordering::Relaxed);
        })
        .expect("watcher");

        // A fresh, distinctly named chapter each attempt, so a retry is
        // never mistaken for the same write the watcher already missed.
        let mut attempt = 0u32;
        assert!(
            trigger_until_seen(
                || {
                    std::fs::write(part.join(format!("{attempt:02}-alice.md")), "# Alice\n")
                        .expect("chapter");
                    attempt += 1;
                },
                || seen.load(Ordering::Relaxed) > 0
            ),
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
