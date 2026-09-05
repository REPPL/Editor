//! The development harness: two environment variables, both unset by default.
//!
//! The key spike's remaining questions need a real WebView and a real keyboard,
//! and a person working down a checklist cannot say afterwards which chord the
//! page saw. These two switches let a script do it instead:
//!
//! - `EDITOR_OPEN_FOLDER` names a document folder the window opens on start,
//!   so the run begins with a chapter in the buffer and no dialog in the way.
//! - `EDITOR_KEY_LOG` names a file the key log is appended to, one JSON object
//!   per line, so the run leaves a record a script can read back.
//!
//! Neither does anything when its variable is unset, which is every ordinary
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
    fn refuses_a_path_with_no_file_name() {
        let dir = scratch("noname");
        let error = confine_log_path(&dir.join(".."), &roots()).expect_err("no file name");
        assert!(error.contains("must name a file"), "{error}");
    }
}
