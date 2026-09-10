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
    use std::time::Instant;

    /// The whole of the time one of these tests is allowed to spend waiting
    /// on the operating system's watcher, arming and assertion together.
    ///
    /// `watch` returns once the watch has been *requested*, which is not the
    /// moment events start arriving. On macOS the FSEvents stream behind it
    /// opens when `fseventsd` gets round to it, and afterwards delivers in
    /// bursts with quiet gaps in between; how long either takes is the
    /// daemon's to decide, not the caller's. Measured across some thirty
    /// trials on one machine, opening took anywhere from half a second to
    /// sixty-five, and gaps after opening reached eight — for a bare `notify`
    /// watcher exactly as much as for the debounced one, for a folder under
    /// the home directory exactly as much as for one under the temporary
    /// directory, and for a second watcher opened alongside the first at the
    /// very same microsecond as for that first one. So the wait is not this
    /// crate's debounce, not the two tests sharing state, not where the
    /// folder lives and not one test's watcher disturbing the other's: it is
    /// how loaded the daemon is (`iss-2609100708579771`). Nothing is lost
    /// meanwhile — operations made before the stream opens queue up, and the
    /// whole queue arrives at once when it does — so waiting is the only
    /// thing to do, and the question is only how patiently.
    ///
    /// Four minutes is therefore chosen against a badly loaded daemon rather
    /// than a healthy one, because a gate that passes only on a quiet machine
    /// is not a gate. It costs nothing when the daemon is well: every wait
    /// below ends the moment its condition holds. It is one budget rather
    /// than one per phase so that a slow opening spends time the assertion
    /// after it would not have needed, and the test as a whole still cannot
    /// run away.
    const BUDGET: Duration = Duration::from_secs(240);

    /// Perform `trigger` every quarter-second until `predicate` holds, giving
    /// up at `deadline`.
    ///
    /// A quarter-second is comfortably past the debouncer's own `DEBOUNCE`
    /// window, so each attempt is a batch of its own. What the test waits for
    /// is the condition; what limits the wait is the clock.
    fn trigger_until_seen(
        deadline: Instant,
        mut trigger: impl FnMut(),
        predicate: impl Fn() -> bool,
    ) -> bool {
        loop {
            if predicate() {
                return true;
            }
            if Instant::now() >= deadline {
                return false;
            }
            trigger();
            std::thread::sleep(Duration::from_millis(250));
        }
    }

    /// Wait until the watch over `base` is really delivering, and leave the
    /// count back at zero with the backlog drained.
    ///
    /// Waiting for this before, and separately from, whatever the test goes
    /// on to assert is what keeps the assertion about the operation it names.
    /// The queue an opening stream flushes can carry events from *before* the
    /// watch — the folder's own creation among them — and a test asking only
    /// "did anything arrive?" would accept one of those in place of the
    /// rename or the chapter it is really about.
    ///
    /// The trigger is a sentinel file at the root: undotted, because
    /// `is_temporary` keeps dotted names out of the callback, and at the root
    /// rather than below it, so that a test about reaching below the root
    /// still has that left to prove.
    fn arm(base: &Path, seen: &AtomicUsize, deadline: Instant) {
        let mut sentinel = 0u32;
        assert!(
            trigger_until_seen(
                deadline,
                || {
                    std::fs::write(base.join(format!("arming-{sentinel:03}")), "")
                        .expect("sentinel");
                    sentinel += 1;
                },
                || seen.load(Ordering::Relaxed) > 0,
            ),
            "the watch never began delivering events"
        );

        // Let the flushed backlog finish arriving before zeroing the count. A
        // debounced batch landing just after the reset would answer the next
        // assertion instead of the operation that assertion is about.
        let mut last = seen.load(Ordering::Relaxed);
        let mut quiet = 0;
        while quiet < 5 {
            std::thread::sleep(DEBOUNCE * 2);
            let now = seen.load(Ordering::Relaxed);
            if now == last {
                quiet += 1;
            } else {
                quiet = 0;
                last = now;
            }
        }
        seen.store(0, Ordering::Relaxed);
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
        let deadline = Instant::now() + BUDGET;
        arm(base, &seen, deadline);

        // Alternates the chapter's name back and forth: every attempt is a
        // genuine rename, and one from each end exists at any given moment
        // for the next attempt to rename again.
        let mut swapped = false;
        assert!(
            trigger_until_seen(
                deadline,
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
        let deadline = Instant::now() + BUDGET;
        arm(base, &seen, deadline);

        // A fresh, distinctly named chapter each attempt, so a retry is
        // never mistaken for the same write the watcher already missed.
        let mut attempt = 0u32;
        assert!(
            trigger_until_seen(
                deadline,
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
