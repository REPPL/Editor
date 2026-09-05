//! What this machine knows, kept off the document.
//!
//! The production repository's path, its remote and branch, the site's base
//! URL and the author's named asset roots are facts about Alice's machine, not
//! about her document — so they live in a JSON file in the application's own
//! configuration directory and never in a document folder
//! (`itd-2609051336080960`, no machine in the document).
//!
//! One file, one struct, read and written whole. It is small, it is the
//! author's to edit by hand, and an unknown key in it is left alone.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// The file, inside the application's configuration directory.
pub const SETTINGS_FILE: &str = "settings.json";

/// Where a publish pushes to, and what the site is reached at.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct PublishTarget {
    /// The production repository's working copy, as an absolute path.
    pub repository: String,
    /// The git remote to push to.
    pub remote: String,
    /// The branch the static host deploys.
    pub branch: String,
    /// The site's base URL, without a trailing slash.
    pub base_url: String,
    /// The directory inside the repository the host deploys.
    pub site_dir: String,
}

impl Default for PublishTarget {
    fn default() -> Self {
        Self {
            repository: String::new(),
            remote: "origin".to_string(),
            branch: "main".to_string(),
            base_url: String::new(),
            site_dir: "site".to_string(),
        }
    }
}

/// Everything the application knows about this machine.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub schema_version: u32,
    pub publish: PublishTarget,
    /// Named folders the author drops assets from, by name.
    pub asset_roots: BTreeMap<String, String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            publish: PublishTarget::default(),
            asset_roots: BTreeMap::new(),
        }
    }
}

/// The settings file's path inside a configuration directory.
pub fn settings_path(config_dir: &Path) -> PathBuf {
    config_dir.join(SETTINGS_FILE)
}

/// Read the settings.
///
/// A missing file is not a failure: a machine that has never published has
/// nothing to say yet. A file that exists and will not parse is a failure,
/// named, because guessing at a repository path is how a publish lands
/// somewhere nobody asked for.
pub fn read_settings(path: &Path) -> Result<Settings, String> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(Settings::default())
        }
        Err(error) => return Err(format!("cannot read {SETTINGS_FILE}: {error}")),
    };
    if text.trim().is_empty() {
        return Ok(Settings::default());
    }
    serde_json::from_str(&text).map_err(|error| format!("cannot read {SETTINGS_FILE}: {error}"))
}

/// Write the settings, whole, through a temporary file beside themselves.
pub fn write_settings(path: &Path, settings: &Settings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("cannot create {}: {error}", parent.display()))?;
    }
    let mut text = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("cannot write {SETTINGS_FILE}: {error}"))?;
    text.push('\n');
    crate::document::write_chapter_text(path, &text)
}

/// Record where publishing pushes to.
///
/// Every field is checked before it is stored, because the first time any of
/// them is wrong is in the middle of a publish. A remote or branch beginning
/// with `-` would be read by git as an option, so it is refused here as well
/// as at the call site.
pub fn set_publish_target_at(
    path: &Path,
    repository: &str,
    remote: &str,
    branch: &str,
    base_url: &str,
) -> Result<Settings, String> {
    let repository = repository.trim();
    let remote = remote.trim();
    let branch = branch.trim();
    let base_url = base_url.trim().trim_end_matches('/');

    if repository.is_empty() {
        return Err("the production repository has no path".to_string());
    }
    let resolved = fs::canonicalize(repository)
        .map_err(|error| format!("cannot resolve {repository}: {error}"))?;
    if !resolved.is_dir() {
        return Err(format!("{repository} is not a folder"));
    }
    check_argument("remote", remote)?;
    check_argument("branch", branch)?;
    check_base_url(base_url)?;

    let mut settings = read_settings(path)?;
    settings.publish = PublishTarget {
        repository: resolved.to_string_lossy().into_owned(),
        remote: remote.to_string(),
        branch: branch.to_string(),
        base_url: base_url.to_string(),
        site_dir: settings.publish.site_dir,
    };
    write_settings(path, &settings)?;
    Ok(settings)
}

/// Record one named asset root, or drop it when the path is empty.
pub fn set_asset_root_at(path: &Path, name: &str, root: &str) -> Result<Settings, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("an asset root needs a name".to_string());
    }
    let mut settings = read_settings(path)?;
    if root.trim().is_empty() {
        settings.asset_roots.remove(name);
    } else {
        let resolved = fs::canonicalize(root.trim())
            .map_err(|error| format!("cannot resolve {root}: {error}"))?;
        if !resolved.is_dir() {
            return Err(format!("{root} is not a folder"));
        }
        settings
            .asset_roots
            .insert(name.to_string(), resolved.to_string_lossy().into_owned());
    }
    write_settings(path, &settings)?;
    Ok(settings)
}

/// Refuse an argument git would read as an option, or that is empty.
pub fn check_argument(what: &str, value: &str) -> Result<(), String> {
    if value.is_empty() {
        return Err(format!("the {what} is empty"));
    }
    if value.starts_with('-') {
        return Err(format!("the {what} may not begin with a dash: {value}"));
    }
    if value.contains(char::is_whitespace) {
        return Err(format!("the {what} may not carry a space: {value}"));
    }
    Ok(())
}

/// Refuse a base URL that is not a plain `https://host`.
///
/// `https` and nothing else. The published link is unlisted, which is the whole
/// of its protection: over `http` the address is on the wire in clear, and an
/// unlisted link read off the wire is a link anybody holds.
pub fn check_base_url(base_url: &str) -> Result<(), String> {
    if base_url.is_empty() {
        return Err("the site has no base URL".to_string());
    }
    let rest = base_url
        .strip_prefix("https://")
        .ok_or_else(|| format!("the base URL is not https: {base_url}"))?;
    if rest.is_empty() || rest.starts_with('/') {
        return Err(format!("the base URL names no host: {base_url}"));
    }
    if base_url.contains(char::is_whitespace) {
        return Err(format!("the base URL carries a space: {base_url}"));
    }
    Ok(())
}

/* ---------------------------------------------------------------------------
 * The commands.
 *
 * The settings file's path is the application's to know, never the page's:
 * every command resolves it from the configuration directory Tauri names.
 * ------------------------------------------------------------------------- */

/// The settings file, inside the application's configuration directory.
pub fn path_for(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let config = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("cannot find the configuration directory: {error}"))?;
    Ok(settings_path(&config))
}

/// What this machine knows.
#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let path = path_for(&app)?;
    tauri::async_runtime::spawn_blocking(move || read_settings(&path))
        .await
        .map_err(|error| format!("cannot read the settings: {error}"))?
}

/// Record where publishing pushes to, and what the site is reached at.
#[tauri::command]
pub async fn set_publish_target(
    app: tauri::AppHandle,
    repository: String,
    remote: String,
    branch: String,
    base_url: String,
) -> Result<Settings, String> {
    let path = path_for(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        set_publish_target_at(&path, &repository, &remote, &branch, &base_url)
    })
    .await
    .map_err(|error| format!("cannot write the settings: {error}"))?
}

/// Record one named asset root, or drop it.
#[tauri::command]
pub async fn set_asset_root(
    app: tauri::AppHandle,
    name: String,
    root: String,
) -> Result<Settings, String> {
    let path = path_for(&app)?;
    tauri::async_runtime::spawn_blocking(move || set_asset_root_at(&path, &name, &root))
        .await
        .map_err(|error| format!("cannot write the settings: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp() -> tempfile::TempDir {
        tempfile::tempdir().expect("temp dir")
    }

    #[test]
    fn settings_start_empty_and_are_not_a_failure() {
        let dir = temp();
        let settings = read_settings(&settings_path(dir.path())).expect("a fresh machine");
        assert_eq!(settings, Settings::default());
        assert_eq!(settings.publish.remote, "origin");
        assert_eq!(settings.publish.branch, "main");
    }

    #[test]
    fn a_publish_target_round_trips() {
        let dir = temp();
        let repo = temp();
        let path = settings_path(dir.path());
        let stored = set_publish_target_at(
            &path,
            repo.path().to_str().expect("utf-8"),
            "origin",
            "main",
            "https://example.invalid/",
        )
        .expect("stored");
        assert_eq!(stored.publish.base_url, "https://example.invalid");
        let read = read_settings(&path).expect("read back");
        assert_eq!(read, stored);
    }

    #[test]
    fn a_settings_file_refuses_a_remote_that_looks_like_an_option() {
        let dir = temp();
        let repo = temp();
        let path = settings_path(dir.path());
        let message = set_publish_target_at(
            &path,
            repo.path().to_str().expect("utf-8"),
            "--upload-pack=evil",
            "main",
            "https://example.invalid",
        )
        .expect_err("refused");
        assert!(message.contains("dash"), "{message}");
    }

    #[test]
    fn a_settings_file_refuses_a_base_url_that_is_not_a_site() {
        assert!(check_base_url("file:///etc").is_err());
        assert!(check_base_url("example.invalid").is_err());
        assert!(check_base_url("https://").is_err());
        // An unlisted link is protected by being unguessable, which `http`
        // gives away on the wire.
        let plain = check_base_url("http://example.invalid").expect_err("refused");
        assert!(plain.contains("not https"), "{plain}");
        assert!(check_base_url("https://example.invalid").is_ok());
    }

    #[test]
    fn an_asset_root_is_named_and_dropped_by_name() {
        let dir = temp();
        let root = temp();
        let path = settings_path(dir.path());
        let stored = set_asset_root_at(&path, "photos", root.path().to_str().expect("utf-8"))
            .expect("stored");
        assert!(stored.asset_roots.contains_key("photos"));
        let dropped = set_asset_root_at(&path, "photos", "").expect("dropped");
        assert!(dropped.asset_roots.is_empty());
    }

    #[test]
    fn an_unparsable_settings_file_is_named_rather_than_guessed_at() {
        let dir = temp();
        let path = settings_path(dir.path());
        fs::write(&path, "{ not json").expect("write");
        let message = read_settings(&path).expect_err("refused");
        assert!(message.contains(SETTINGS_FILE), "{message}");
    }
}
