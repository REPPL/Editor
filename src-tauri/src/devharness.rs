//! The development harness: three environment variables, all unset by default.
//!
//! The key spike's remaining questions need a real WebView and a real keyboard,
//! and a person working down a checklist cannot say afterwards which chord the
//! page saw. These three switches let a script do it instead:
//!
//! - `EDITOR_OPEN_FOLDER` names a document folder the window opens on start,
//!   so the run begins with a chapter in the buffer and no dialog in the way.
//! - `EDITOR_KEY_LOG` names a file the key log is appended to, one JSON object
//!   per line, so the run leaves a record a script can read back.
//! - `EDITOR_PRESENT_ON_OPEN` opens the present window on the first chapter as
//!   soon as the folder is loaded, because a script cannot press `C-c C-p`.
//!   Without it a run that wants to look at the deck — through
//!   `EDITOR_PRESENT_LOG` — produces no line at all, since nothing ever opened
//!   the window. It does nothing on its own: there is no chapter to present
//!   until `EDITOR_OPEN_FOLDER` has opened one. It is the one switch here
//!   rather than a path, so it is read as one: `1`, `true`, `yes` or `on` for
//!   on, `0`, `false`, `no` or `off` for off, and any other word refused with a
//!   warning rather than read as either.
//!
//! No switch does anything when its variable is unset, which is every ordinary
//! launch. The log path is the one that needs guarding: the web view is a trust
//! boundary, so a script running in it could call [`dev_log_key`] with a line
//! of its choosing. It cannot choose the file — the path is resolved once here,
//! from the environment the process was started with, and refused unless it
//! lands inside the application's own cache directory or the system's temporary
//! directory.

use std::env;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::Manager;

/// The variable naming a document folder to open without the dialog.
pub const OPEN_FOLDER_VAR: &str = "EDITOR_OPEN_FOLDER";

/// The variable naming the file the key log is appended to.
pub const KEY_LOG_VAR: &str = "EDITOR_KEY_LOG";

/// The variable asking for the present window on the chapter that opens.
pub const PRESENT_ON_OPEN_VAR: &str = "EDITOR_PRESENT_ON_OPEN";

/// The longest line the key log accepts.
///
/// One observation is a short object. A cap keeps a runaway page from filling
/// the disk one call at a time.
const MAX_LINE: usize = 4096;

/// What the harness was asked to do, resolved once at start.
#[derive(Default)]
pub struct DevHarness {
    open_folder: Mutex<Option<String>>,
    key_log: Mutex<Option<PathBuf>>,
    present_on_open: Mutex<bool>,
}

/// What the frontend is told about the harness.
#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize)]
pub struct HarnessSettings {
    /// The folder to open on start, if one was named.
    pub open_folder: Option<String>,
    /// Whether key-log lines will be written anywhere.
    ///
    /// The path itself never crosses: the page has no use for it, and a page
    /// that cannot name the file cannot ask for a different one.
    pub key_log: bool,
    /// Whether to present the first chapter as soon as it is open.
    pub present_on_open: bool,
}

/// The directories a key-log path may sit in.
///
/// Both are places the operating system already treats as scratch space, and
/// neither holds anything the author would miss.
fn allowed_roots<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Vec<PathBuf> {
    let mut roots = vec![env::temp_dir()];
    if let Ok(cache) = app.path().app_cache_dir() {
        roots.push(cache);
    }
    roots
        .iter()
        .filter_map(|root| root.canonicalize().ok())
        .collect()
}

/// Resolve a key-log path, or say why it is refused.
///
/// The parent directory is canonicalised — so a path threaded through `..` or a
/// symlink is measured where it actually lands — and the file name is joined
/// back on, because the file itself need not exist yet.
fn confine_log_path(raw: &Path, roots: &[PathBuf]) -> Result<PathBuf, String> {
    let name = raw
        .file_name()
        .ok_or_else(|| format!("{KEY_LOG_VAR} must name a file"))?;
    let parent = match raw.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent.to_path_buf(),
        _ => env::current_dir().map_err(|error| format!("{KEY_LOG_VAR}: {error}"))?,
    };
    let parent = parent
        .canonicalize()
        .map_err(|error| format!("{KEY_LOG_VAR}: {} is unreadable: {error}", parent.display()))?;
    if !roots.iter().any(|root| parent.starts_with(root)) {
        return Err(format!(
            "{KEY_LOG_VAR} must sit in the cache or temporary directory, not {}",
            parent.display()
        ));
    }
    Ok(parent.join(name))
}

/// Read both variables and record what they asked for.
///
/// A refusal is logged and dropped: the harness is a convenience, and a
/// mistyped path is not a reason to refuse to start the editor.
pub fn configure<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let state = app.state::<DevHarness>();

    if let Some(raw) = env::var_os(OPEN_FOLDER_VAR) {
        let path = PathBuf::from(raw);
        match path.canonicalize() {
            Ok(resolved) if resolved.is_dir() => {
                log::info!("{OPEN_FOLDER_VAR}: opening {}", resolved.display());
                store(
                    &state.open_folder,
                    Some(resolved.to_string_lossy().into_owned()),
                );
            }
            Ok(resolved) => {
                log::warn!("{OPEN_FOLDER_VAR}: {} is not a folder", resolved.display());
            }
            Err(error) => log::warn!("{OPEN_FOLDER_VAR}: {} — {error}", path.display()),
        }
    }

    if let Some(raw) = env::var_os(KEY_LOG_VAR) {
        match confine_log_path(Path::new(&raw), &allowed_roots(app)) {
            Ok(resolved) => {
                log::info!("{KEY_LOG_VAR}: appending to {}", resolved.display());
                store(&state.key_log, Some(resolved));
            }
            Err(error) => log::warn!("{error}"),
        }
    }

    if asked_for(
        PRESENT_ON_OPEN_VAR,
        env::var_os(PRESENT_ON_OPEN_VAR).as_deref(),
    ) {
        log::info!("{PRESENT_ON_OPEN_VAR}: presenting the chapter that opens");
        match state.present_on_open.lock() {
            Ok(mut held) => *held = true,
            Err(_) => log::error!("the development harness is unreadable"),
        }
    }
}

/// The words a switch-shaped variable is read as on.
const ON_WORDS: [&str; 4] = ["1", "true", "yes", "on"];

/// The words it is read as off, an empty value among them.
///
/// An empty value is what `EDITOR_PRESENT_ON_OPEN=` and an unset variable both
/// expand to in a shell, so it is off rather than a mistake.
const OFF_WORDS: [&str; 5] = ["", "0", "false", "no", "off"];

/// What a switch-shaped variable says, or `None` when it is not a switch.
///
/// A script that writes `EDITOR_PRESENT_ON_OPEN=false` means off, and a rule
/// that reads anything but empty or `0` as on answers it with the opposite of
/// what it asked for. So the two vocabularies are named and nothing else is
/// guessed at: a value in neither list is refused rather than read as either,
/// because a harness that quietly does the opposite of what a run script asked
/// for is worse than one that does nothing.
///
/// Case and surrounding space are not part of the answer: `True` and ` on `
/// are what a hand-written script writes.
fn switch_value(value: &std::ffi::OsStr) -> Option<bool> {
    let word = value.to_string_lossy().trim().to_ascii_lowercase();
    if ON_WORDS.contains(&word.as_str()) {
        return Some(true);
    }
    if OFF_WORDS.contains(&word.as_str()) {
        return Some(false);
    }
    None
}

/// Whether a switch-shaped variable is on, saying so when it is neither.
///
/// An unset variable is off and says nothing: that is every ordinary launch.
fn asked_for(var: &str, raw: Option<&std::ffi::OsStr>) -> bool {
    let Some(value) = raw else { return false };
    match switch_value(value) {
        Some(on) => on,
        None => {
            log::warn!(
                "{var}: {} is neither on ({}) nor off ({}); taking it as off",
                value.to_string_lossy(),
                ON_WORDS.join(", "),
                OFF_WORDS[1..].join(", ")
            );
            false
        }
    }
}

/// Put a value behind a mutex, treating a poisoned lock as a lost setting.
fn store<T>(cell: &Mutex<Option<T>>, value: Option<T>) {
    match cell.lock() {
        Ok(mut held) => *held = value,
        Err(_) => log::error!("the development harness is unreadable"),
    }
}

/// What the harness was asked to do.
#[tauri::command]
pub fn dev_harness(state: tauri::State<'_, DevHarness>) -> HarnessSettings {
    HarnessSettings {
        open_folder: state.open_folder.lock().ok().and_then(|held| held.clone()),
        key_log: state.key_log.lock().is_ok_and(|held| held.is_some()),
        present_on_open: state.present_on_open.lock().is_ok_and(|held| *held),
    }
}

/// Append one line to the key log, if one was asked for.
///
/// A line with a break in it would read back as two observations, so it is
/// refused rather than escaped: the caller writes one JSON object per call.
#[tauri::command]
pub fn dev_log_key(line: String, state: tauri::State<'_, DevHarness>) -> Result<(), String> {
    let path = state
        .key_log
        .lock()
        .map_err(|_| "the development harness is unreadable".to_string())?
        .clone();
    let Some(path) = path else {
        return Err(format!("{KEY_LOG_VAR} is not set"));
    };
    if line.len() > MAX_LINE {
        return Err(format!("a key-log line may be at most {MAX_LINE} bytes"));
    }
    if line.contains(['\n', '\r']) {
        return Err("a key-log line may not contain a line break".to_string());
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|error| format!("cannot open the key log: {error}"))?;
    writeln!(file, "{line}").map_err(|error| format!("cannot write the key log: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A directory inside the temporary directory, named for one test.
    fn scratch(name: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("editor-devharness-{name}"));
        std::fs::create_dir_all(&dir).expect("cannot make the scratch directory");
        dir
    }

    fn roots() -> Vec<PathBuf> {
        vec![env::temp_dir()
            .canonicalize()
            .expect("the temporary directory is unreadable")]
    }

    #[test]
    fn takes_a_path_inside_the_temporary_directory() {
        let dir = scratch("inside");
        let wanted = dir.join("keys.jsonl");
        let resolved = confine_log_path(&wanted, &roots()).expect("should be allowed");
        assert_eq!(resolved.file_name(), wanted.file_name());
        assert!(resolved.starts_with(&roots()[0]));
    }

    #[test]
    fn takes_a_path_inside_either_confined_root() {
        // `allowed_roots` gathers the temporary directory and the
        // application's cache directory into one list, and the harness
        // promises a key log is refused unless it lands in one *or* the
        // other. Every other test here passes a single-root list, which
        // cannot tell an OR from a preference for whichever root happens to
        // be checked first — this one gives `confine_log_path` two roots
        // that are not the real temporary directory and shows a path inside
        // the second is accepted on its own, not because it is also inside
        // the first.
        let first = scratch("either-root-first");
        let second = scratch("either-root-second");
        let roots = vec![
            first.canonicalize().expect("first root is unreadable"),
            second.canonicalize().expect("second root is unreadable"),
        ];
        let wanted = second.join("keys.jsonl");
        let resolved =
            confine_log_path(&wanted, &roots).expect("the second root should be allowed too");
        assert!(resolved.starts_with(&roots[1]));
        assert!(!resolved.starts_with(&roots[0]));
    }

    #[test]
    fn refuses_a_path_outside_every_root() {
        let error =
            confine_log_path(Path::new("/etc/passwd"), &roots()).expect_err("outside every root");
        assert!(error.contains("cache or temporary"), "{error}");
    }

    #[test]
    fn refuses_an_escape_through_a_parent_segment() {
        let dir = scratch("escape");
        let sneaky = dir.join("..").join("..").join("escaped.jsonl");
        // The parent canonicalises out of the temporary directory, so the
        // path is measured where it lands rather than where it is written.
        let allowed = confine_log_path(&sneaky, &roots()).is_ok();
        let landed = sneaky
            .parent()
            .and_then(|parent| parent.canonicalize().ok())
            .expect("the parent should resolve");
        assert_eq!(allowed, landed.starts_with(&roots()[0]));
    }

    #[test]
    fn the_present_switch_is_off_unless_it_is_asked_for() {
        use std::ffi::OsStr;
        assert!(!asked_for(PRESENT_ON_OPEN_VAR, None));
        for off in ["", "0", "false", "no", "off", "  ", "OFF", " False "] {
            assert!(
                !asked_for(PRESENT_ON_OPEN_VAR, Some(OsStr::new(off))),
                "{off} should be off"
            );
        }
        for on in ["1", "true", "yes", "on", "TRUE", " On "] {
            assert!(
                asked_for(PRESENT_ON_OPEN_VAR, Some(OsStr::new(on))),
                "{on} should be on"
            );
        }
    }

    #[test]
    fn a_word_that_is_neither_on_nor_off_is_refused_rather_than_guessed_at() {
        use std::ffi::OsStr;
        // `false` is how a run script turns the switch off, and a rule of
        // "anything but empty or `0` is on" gives it the present window
        // instead. Every value says on, says off, or says nothing — and
        // saying nothing is a warning and an off switch, never a guess.
        assert_eq!(switch_value(OsStr::new("false")), Some(false));
        assert_eq!(switch_value(OsStr::new("true")), Some(true));
        // An unset variable is the ordinary launch: off, and silent.
        assert!(!asked_for(PRESENT_ON_OPEN_VAR, None));
        for neither in ["maybe", "2", "-1", "yes please", "no thanks"] {
            assert_eq!(switch_value(OsStr::new(neither)), None, "{neither}");
            assert!(
                !asked_for(PRESENT_ON_OPEN_VAR, Some(OsStr::new(neither))),
                "{neither} should not turn the switch on"
            );
        }
    }

    #[test]
    fn refuses_a_path_with_no_file_name() {
        let dir = scratch("noname");
        let error = confine_log_path(&dir.join(".."), &roots()).expect_err("no file name");
        assert!(error.contains("must name a file"), "{error}");
    }
}
