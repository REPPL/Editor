//! Exporting a rendering into a folder the author chooses.
//!
//! An export adds no builder. The page builds the version with the publish
//! path's own `buildVersion`, and this writes it with the publish path's own
//! `stage_version` and `copy_tree`: the folder carried into a room and the
//! version the site serves are one build, differing only in where the deck's
//! engine sits. The rules an export adds are the five this module holds — the
//! folder name is one segment, the destination is the one the author chose in
//! the shell's own dialog and no other, that destination is never the open
//! document or the application's own cache, an existing folder is never
//! written over, and the folder is revealed rather than opened.
//!
//! **The destination is not the page's to give.** The dialog is opened here,
//! by [`choose_export_destination`], and its answer stays in the shell under a
//! nonce — exactly as a drop's paths stay in `assets::DropQueue`. The request
//! carries the nonce, so a script in the web view can ask for the folder the
//! author just chose and for nothing else: not `~`, not the staging tree it
//! would then be copied out of.
//!
//! Nothing here touches the network. `no_network_outside_publish` names the
//! one file in the crate that holds an HTTP client, and this is not it.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

use crate::publish::stage::{self, AssetCopy, BuiltFile};

/// The staging tree an export builds into, beside the publish's own.
///
/// Two trees, so an export and a dry run neither clear nor hash into each
/// other.
pub const EXPORT_STAGING_FOLDER: &str = "export-staging";

/// The most folders one name may collide with before the export gives up.
const COLLISION_LIMIT: usize = 99;

/// How long the folder the author chose stays claimable.
///
/// The page asks for the export as soon as the dialog closes, so this only has
/// to cover one round trip; a nonce left lying around after it is worth
/// nothing.
pub const DESTINATION_LIFETIME: Duration = Duration::from_secs(120);

/// One answer the author gave the folder dialog.
struct ChosenFolder {
    nonce: String,
    path: PathBuf,
    at: Instant,
}

/// The folders the author has chosen, each under the nonce that claims it.
///
/// The web view never names a destination: it names a nonce this state minted
/// when the author picked a folder in the shell's own dialog. An unknown or
/// expired nonce is refused, and a nonce is good for one export.
#[derive(Default)]
pub struct ExportDestinations(Mutex<Vec<ChosenFolder>>);

impl ExportDestinations {
    /// Hold the folder the author chose and mint the nonce that claims it.
    pub fn offer(&self, path: PathBuf) -> Result<String, String> {
        let nonce = crate::assets::mint_nonce()?;
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the chosen folder is unreadable".to_string())?;
        let now = Instant::now();
        held.retain(|chosen| now.duration_since(chosen.at) < DESTINATION_LIFETIME);
        held.push(ChosenFolder {
            nonce: nonce.clone(),
            path,
            at: now,
        });
        Ok(nonce)
    }

    /// Take the folder a nonce names. An unknown or expired nonce is refused.
    pub fn claim(&self, nonce: &str) -> Result<PathBuf, String> {
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the chosen folder is unreadable".to_string())?;
        let now = Instant::now();
        held.retain(|chosen| now.duration_since(chosen.at) < DESTINATION_LIFETIME);
        let index = held
            .iter()
            .position(|chosen| chosen.nonce == nonce)
            .ok_or_else(|| {
                "that folder is no longer on offer. Choose the folder again.".to_string()
            })?;
        Ok(held.remove(index).path)
    }
}

/// What the page asks for when Alice confirms a row.
///
/// The shapes are the publish request's, because the build runs in the web
/// view and hands over exactly what it built.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRequest {
    /// `deck` or `article`: which chrome the folder carries.
    pub kind: String,
    /// The variant that was built, for the record.
    pub variant: String,
    /// The folder to create, as one path segment.
    pub folder_name: String,
    /// The nonce `choose_export_destination` minted for the folder Alice chose.
    pub destination_nonce: String,
    /// The built text files, relative to the folder.
    pub files: Vec<BuiltFile>,
    /// The assets to copy, disk to disk.
    pub copies: Vec<AssetCopy>,
}

/// What one export wrote.
///
/// The folder's name and a count, never a path: a machine's folders are not
/// put into a message the panel may show.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOutcome {
    pub folder: String,
    pub files: usize,
}

/// Everything an export needs from outside the request.
#[derive(Debug, Clone)]
pub struct ExportContext {
    pub document_root: PathBuf,
    pub cache_dir: PathBuf,
}

/// What one export wrote, and where.
///
/// The path is the shell's own business — it is what the Finder is asked to
/// reveal — and it stops at the command boundary: what crosses to the page is
/// the [`ExportOutcome`] alone, which names no folder of the author's machine.
#[derive(Debug, Clone)]
pub struct Export {
    pub outcome: ExportOutcome,
    /// The folder that was created, resolved: the path that was written to.
    pub target: PathBuf,
}

/// Whether a name is one path segment an export may create.
///
/// The page slugifies the document's title; the shell validates the result
/// rather than trusting it, because the page is a trust boundary and a name is
/// about to become a folder.
fn is_folder_name(name: &str) -> bool {
    if name.is_empty() || name.len() > 64 {
        return false;
    }
    let first = name.as_bytes()[0];
    if !first.is_ascii_lowercase() && !first.is_ascii_digit() {
        return false;
    }
    name.bytes()
        .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

/// The last segment of a path, as a name a message may carry.
fn name_of(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// The folder to create: `<name>`, or `<name>-2`, `<name>-3`, … where taken.
///
/// An export never writes over anything, so a second export of one document
/// sits beside the first rather than replacing it.
fn free_folder(destination: &Path, base: &str) -> Result<PathBuf, String> {
    let mut candidate = destination.join(base);
    let mut suffix = 2;
    while candidate.exists() {
        if suffix > COLLISION_LIMIT {
            return Err(format!(
                "{base} and every name beside it are taken in the folder you chose"
            ));
        }
        candidate = destination.join(format!("{base}-{suffix}"));
        suffix += 1;
    }
    Ok(candidate)
}

/// Write one of the chrome's files inside the exported folder.
fn write_chrome(target: &Path, name: &str, text: &str) -> Result<(), String> {
    if name.starts_with('/') || name.split('/').any(|segment| segment == "..") {
        return Err(format!("{name} is not a path inside the folder"));
    }
    let path = target.join(name);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("cannot create {}: {error}", parent.display()))?;
    }
    fs::write(&path, text.as_bytes())
        .map_err(|error| format!("cannot write {}: {error}", path.display()))
}

/// The folder the dry run staged, refusing when no dry run has been run.
///
/// The dry-run row runs `publish_dry_run` — map #7's command, unchanged — and
/// then asks for this, so Alice can look at exactly what a publish would push.
pub fn staged_version_path(cache_dir: &Path) -> Result<PathBuf, String> {
    let staged = crate::publish::staging_path(cache_dir);
    if !staged.is_dir() {
        return Err("no dry run has been staged yet, so there is no folder to open".to_string());
    }
    Ok(staged)
}

/// A path as the filesystem resolves it, or as it was written where it is not
/// there to resolve.
///
/// A destination is always resolved, because it has to exist to be exported
/// into. The trees an export refuses — the cache, the two staging folders —
/// may not exist yet, and a comparison against a folder that is not there is
/// still worth making.
fn resolved(path: &Path) -> PathBuf {
    fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf())
}

/// Write one rendering into a folder inside the destination.
///
/// In order: the name, the destination, a folder nothing is standing in, the
/// staging tree the dry run's own function builds, the copy, and the chrome.
/// Nothing is written anywhere until every refusal has been made.
///
/// The destination is the path the shell resolved from the author's own answer
/// to the folder dialog — `ExportDestinations::claim` — never a path the
/// request carried.
pub fn run_export(
    context: &ExportContext,
    request: &ExportRequest,
    destination: &Path,
) -> Result<Export, String> {
    // The chrome is looked up first: an unknown kind is refused before a
    // folder is resolved, let alone created.
    let chrome = stage::chrome_for_folder(&request.kind)?;

    if !is_folder_name(&request.folder_name) {
        return Err(format!(
            "{} is not a folder name an export writes: one segment of lower-case letters, digits and hyphens",
            request.folder_name
        ));
    }

    // Confinement compares resolved paths, so both are resolved first: a
    // folder reached through a symlink is the same folder.
    let document_root = fs::canonicalize(&context.document_root)
        .map_err(|error| format!("cannot resolve the document folder: {error}"))?;
    let destination = fs::canonicalize(destination)
        .map_err(|error| format!("cannot resolve the folder you chose: {error}"))?;
    if !destination.is_dir() {
        return Err(format!(
            "{} is not a folder to export into",
            name_of(&destination)
        ));
    }
    if destination == document_root {
        return Err(format!(
            "{} is the open document folder. A rendering written into it could be read back as one of its own sources, so an export writes anywhere else.",
            name_of(&destination)
        ));
    }
    if destination.starts_with(&document_root) {
        return Err(format!(
            "{} is inside the open document folder. A rendering written into the document could be read back as one of its own sources, so an export writes anywhere else.",
            name_of(&destination)
        ));
    }

    // The application's own working trees are not somewhere an export writes.
    // The staging folders are inside the cache, and each is named anyway: they
    // are the two an export would otherwise copy out of while copying into.
    let export_staging = context.cache_dir.join(EXPORT_STAGING_FOLDER);
    let publish_staging = crate::publish::staging_path(&context.cache_dir);
    for held in [&context.cache_dir, &export_staging, &publish_staging] {
        let held = resolved(held);
        if destination == held || destination.starts_with(&held) {
            return Err(format!(
                "{} is inside the application's own working folders, which it clears and rewrites. An export writes anywhere else.",
                name_of(&destination)
            ));
        }
    }

    let target = free_folder(&destination, &request.folder_name)?;
    // Create it here rather than leaving it to the copy: `create_dir` fails
    // where something is already standing, which is the promise "an export
    // never writes over anything" made against the filesystem itself rather
    // than against a check made a moment earlier.
    fs::create_dir(&target).map_err(|error| {
        format!(
            "cannot create {} in the folder you chose: {error}",
            name_of(&target)
        )
    })?;

    // The dry run's own function, on a staging tree of its own.
    let staged = stage::stage_version(
        &context.cache_dir.join(EXPORT_STAGING_FOLDER),
        &document_root,
        &request.files,
        &request.copies,
    )?;

    let mut files = 0usize;
    stage::copy_tree(&staged.path, &target, &mut |_| {
        files += 1;
    })?;
    for (name, text) in chrome {
        write_chrome(&target, name, text)?;
        files += 1;
    }

    Ok(Export {
        outcome: ExportOutcome {
            folder: name_of(&target),
            files,
        },
        target,
    })
}

/* ---------------------------------------------------------------------------
 * The commands.
 *
 * Each is a thin wrapper over a plain function taking explicit paths, so the
 * tests reach the logic directly and the command layer holds no rule of its
 * own.
 * ------------------------------------------------------------------------- */

/// The application's own cache directory.
fn cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    app.path()
        .app_cache_dir()
        .map_err(|error| format!("cannot find the cache directory: {error}"))
}

/// Reveal a folder in the Finder.
///
/// The opener plugin's own command is deliberately not granted to the web
/// view, exactly as `open_published_link` argues: a capability wide enough to
/// be useful would let any script in the view name any path to the Finder. So
/// the reveal happens here, on a path the shell resolved itself.
fn reveal(app: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|error| format!("cannot show the folder: {error}"))
}

/// Ask the author where to export, and hold the answer.
///
/// The dialog is the shell's, so its answer never has to be taken from the
/// page: what crosses back is a nonce, and the folder it names stays here.
/// `default_path` only says where the dialog opens; a folder that cannot be
/// resolved is simply not passed to it.
#[tauri::command]
pub async fn choose_export_destination(
    app: tauri::AppHandle,
    default_path: Option<String>,
    chosen: tauri::State<'_, ExportDestinations>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let opens_at = default_path.and_then(|path| fs::canonicalize(path).ok());
    let picked = tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = app.dialog().file();
        if let Some(folder) = opens_at {
            dialog = dialog.set_directory(folder);
        }
        dialog.blocking_pick_folder()
    })
    .await
    .map_err(|error| format!("cannot open the folder chooser: {error}"))?;

    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked
        .into_path()
        .map_err(|error| format!("cannot read the folder you chose: {error}"))?;
    // Resolved here, so the nonce names the folder itself rather than a route
    // to it, and the export's own refusals compare like with like.
    let path = fs::canonicalize(&path)
        .map_err(|error| format!("cannot resolve the folder you chose: {error}"))?;
    chosen.offer(path).map(Some)
}

/// Write one rendering into a folder, and show it.
///
/// A folder that was written and could not be revealed is reported as written:
/// the reveal is the last step and it undoes nothing.
#[tauri::command]
pub async fn export_rendering(
    app: tauri::AppHandle,
    request: ExportRequest,
    root: tauri::State<'_, crate::DocumentRoot>,
    chosen: tauri::State<'_, ExportDestinations>,
) -> Result<ExportOutcome, String> {
    let document_root = root.get()?;
    let cache = cache_dir(&app)?;
    // The one destination this export may write into: the answer the author
    // gave the shell's own dialog, claimed by the nonce the request carries.
    let destination = chosen.claim(&request.destination_nonce)?;
    let context = ExportContext {
        document_root,
        cache_dir: cache,
    };
    let export =
        tauri::async_runtime::spawn_blocking(move || run_export(&context, &request, &destination))
            .await
            .map_err(|error| format!("cannot export: {error}"))??;
    // The folder that was written, not a path assembled again from what the
    // page said: a destination reached through a symlink resolves once.
    if let Err(error) = reveal(&app, &export.target) {
        log::warn!("{error}");
    }
    Ok(export.outcome)
}

/// Show the folder the dry run staged.
#[tauri::command]
pub async fn reveal_staged_version(app: tauri::AppHandle) -> Result<(), String> {
    let cache = cache_dir(&app)?;
    let staged = staged_version_path(&cache)?;
    reveal(&app, &staged)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// One document folder, one cache, one place to export into.
    struct Fixture {
        _cache: tempfile::TempDir,
        document: tempfile::TempDir,
        outside: tempfile::TempDir,
        context: ExportContext,
    }

    fn fixture() -> Fixture {
        let cache = tempfile::tempdir().expect("temp dir");
        let document = tempfile::tempdir().expect("temp dir");
        let outside = tempfile::tempdir().expect("temp dir");
        fs::create_dir_all(document.path().join("01-part/assets")).expect("folders");
        fs::write(
            document.path().join("01-part/assets/lantern.jpg"),
            b"not really a jpeg",
        )
        .expect("write");
        fs::write(document.path().join("document.yaml"), "title: A talk\n").expect("write");
        let context = ExportContext {
            document_root: document.path().to_path_buf(),
            cache_dir: cache.path().to_path_buf(),
        };
        Fixture {
            _cache: cache,
            document,
            outside,
            context,
        }
    }

    /// The deck page a folder build produces, near enough for the shell.
    fn deck_files() -> Vec<BuiltFile> {
        vec![BuiltFile {
            path: "slides/index.html".to_string(),
            text: "<!doctype html>\n<script src=\"../presenter/reveal/reveal.js\"></script>\n"
                .to_string(),
        }]
    }

    fn article_files() -> Vec<BuiltFile> {
        vec![BuiltFile {
            path: "index.html".to_string(),
            text: "<!doctype html>\n<link rel=\"stylesheet\" href=\"presenter/article.css\">\n"
                .to_string(),
        }]
    }

    fn copies() -> Vec<AssetCopy> {
        vec![AssetCopy {
            from: "01-part/assets/lantern.jpg".to_string(),
            to: "assets/01-part/lantern.jpg".to_string(),
        }]
    }

    fn request(kind: &str) -> ExportRequest {
        ExportRequest {
            kind: kind.to_string(),
            variant: "talk".to_string(),
            folder_name: format!("a-talk-{kind}"),
            // The nonce a real request carries is minted by the dialog
            // command; every test here calls `run_export` with the folder the
            // shell resolved, which is what the command hands it.
            destination_nonce: "not-claimed-here".to_string(),
            files: if kind == "deck" {
                deck_files()
            } else {
                article_files()
            },
            copies: copies(),
        }
    }

    /// Every file under a folder, as a path relative to it and its bytes.
    fn walk(root: &Path) -> Vec<(String, Vec<u8>)> {
        let mut found = Vec::new();
        let mut stack = vec![root.to_path_buf()];
        while let Some(folder) = stack.pop() {
            for entry in fs::read_dir(&folder).expect("read") {
                let path = entry.expect("entry").path();
                if path.is_dir() {
                    stack.push(path);
                    continue;
                }
                let relative = path
                    .strip_prefix(root)
                    .expect("inside")
                    .to_string_lossy()
                    .replace('\\', "/");
                found.push((relative, fs::read(&path).expect("read")));
            }
        }
        found.sort();
        found
    }

    #[test]
    fn an_export_writes_the_page_the_engine_and_the_images() {
        let fixture = fixture();
        let export = run_export(&fixture.context, &request("deck"), fixture.outside.path())
            .expect("exported");
        let outcome = export.outcome;
        assert_eq!(outcome.folder, "a-talk-deck");
        // The path the Finder is asked to reveal is the folder that was
        // written, resolved, and not a path put together again afterwards.
        assert_eq!(
            export.target,
            fs::canonicalize(fixture.outside.path().join("a-talk-deck")).expect("resolved")
        );
        let folder = fixture.outside.path().join("a-talk-deck");
        let names: Vec<String> = walk(&folder).into_iter().map(|(name, _)| name).collect();
        assert_eq!(
            names,
            vec![
                "assets/01-part/lantern.jpg".to_string(),
                "presenter/deck.js".to_string(),
                "presenter/reveal/LICENSE".to_string(),
                "presenter/reveal/plugin/notes/notes.js".to_string(),
                "presenter/reveal/reset.css".to_string(),
                "presenter/reveal/reveal.css".to_string(),
                "presenter/reveal/reveal.js".to_string(),
                "presenter/slides.css".to_string(),
                "slides/index.html".to_string(),
            ]
        );
        assert_eq!(outcome.files, names.len());
        // The deck's page sits one folder in, which is what makes every asset
        // reference identical to the staged version's.
        assert!(folder.join("slides/index.html").is_file());
        // The engine is the site's own bytes.
        assert_eq!(
            fs::read_to_string(folder.join("presenter/deck.js")).expect("read"),
            include_str!("../../site/presenter/deck.js")
        );
    }

    #[test]
    fn an_article_export_carries_only_the_article_s_stylesheet() {
        let fixture = fixture();
        run_export(
            &fixture.context,
            &request("article"),
            fixture.outside.path(),
        )
        .expect("exported");
        let folder = fixture.outside.path().join("a-talk-article");
        let names: Vec<String> = walk(&folder).into_iter().map(|(name, _)| name).collect();
        assert_eq!(
            names,
            vec![
                "assets/01-part/lantern.jpg".to_string(),
                "index.html".to_string(),
                "presenter/article.css".to_string(),
            ]
        );
    }

    #[test]
    fn export_refuses_a_rendering_it_does_not_write() {
        let fixture = fixture();
        let mut request = request("deck");
        request.kind = "pdf".to_string();
        let message =
            run_export(&fixture.context, &request, fixture.outside.path()).expect_err("refused");
        assert!(
            message.contains("not a rendering an export writes"),
            "{message}"
        );
    }

    #[test]
    fn export_refuses_a_destination_inside_the_open_document() {
        let fixture = fixture();
        let inside = fixture.document.path().join("01-part");
        let message = run_export(&fixture.context, &request("deck"), &inside).expect_err("refused");
        assert!(
            message.contains("inside the open document folder"),
            "{message}"
        );
        assert!(!inside.join("a-talk-deck").exists());
    }

    #[test]
    fn export_refuses_the_document_root_itself() {
        let fixture = fixture();
        let message = run_export(&fixture.context, &request("deck"), fixture.document.path())
            .expect_err("refused");
        assert!(message.contains("is the open document folder"), "{message}");
        assert!(!fixture.document.path().join("a-talk-deck").exists());
    }

    #[test]
    fn a_destination_is_the_dialog_s_answer_claimed_once() {
        // The page names a nonce, never a folder. One dialog answer is one
        // export: an unknown nonce, a nonce already spent, and a nonce from
        // nowhere are the same refusal.
        let fixture = fixture();
        let chosen = ExportDestinations::default();
        let nonce = chosen
            .offer(fixture.outside.path().to_path_buf())
            .expect("minted");
        assert_ne!(nonce, "");
        assert!(!nonce.contains('/'), "the nonce carries a path: {nonce}");

        assert_eq!(
            chosen.claim(&nonce).expect("claimed"),
            fixture.outside.path()
        );
        let again = chosen.claim(&nonce).expect_err("spent");
        assert!(again.contains("no longer on offer"), "{again}");
        let invented = chosen
            .claim("aaaaaaaaaaaaaaaaaaaaaaaaaa")
            .expect_err("refused");
        assert!(invented.contains("no longer on offer"), "{invented}");
    }

    #[test]
    fn an_export_request_carries_no_folder_of_its_own() {
        // The wire shape: what the page hands the shell names a nonce and a
        // folder name, and no path on the author's machine at all.
        let request = request("deck");
        let json = serde_json::to_string(&request).expect("serialised");
        assert!(json.contains("destination_nonce"), "{json}");
        assert!(!json.contains("\"destination\""), "{json}");
        assert!(!json.contains('/') || !json.contains(":\"/"), "{json}");
    }

    #[test]
    fn export_refuses_the_application_s_own_working_folders() {
        // The cache holds both staging trees. An export into it would copy a
        // tree out of the very folder it is copying into, and the next dry run
        // would clear what Alice carried away.
        let fixture = fixture();
        let staging = fixture.context.cache_dir.join(EXPORT_STAGING_FOLDER);
        let publish_staging = crate::publish::staging_path(&fixture.context.cache_dir);
        let inside_cache = fixture.context.cache_dir.join("something-else");
        for folder in [
            fixture.context.cache_dir.clone(),
            staging.clone(),
            publish_staging.clone(),
            inside_cache.clone(),
        ] {
            fs::create_dir_all(&folder).expect("folder");
            let message =
                run_export(&fixture.context, &request("deck"), &folder).expect_err("refused");
            assert!(
                message.contains("the application's own working folders"),
                "{}: {message}",
                folder.display()
            );
            assert!(!folder.join("a-talk-deck").exists());
        }
    }

    #[test]
    #[cfg(unix)]
    fn export_creates_its_folder_before_it_stages_anything() {
        // The folder is created with `create_dir`, which fails where something
        // is already standing rather than adopting it — and it is created
        // before the staging tree is built, so a destination that cannot be
        // written leaves nothing behind anywhere.
        use std::os::unix::fs::PermissionsExt;

        let fixture = fixture();
        let destination = fixture.outside.path();
        let mode = fs::metadata(destination).expect("metadata").permissions();
        fs::set_permissions(destination, fs::Permissions::from_mode(0o555)).expect("read-only");

        let message =
            run_export(&fixture.context, &request("deck"), destination).expect_err("refused");

        fs::set_permissions(destination, mode).expect("restored");
        assert!(message.contains("cannot create a-talk-deck"), "{message}");
        assert!(
            !fixture
                .context
                .cache_dir
                .join(EXPORT_STAGING_FOLDER)
                .exists(),
            "the export staged a tree for a folder it could not create"
        );
        assert!(walk(destination).is_empty());
    }

    #[test]
    fn export_refuses_a_name_a_link_is_standing_at() {
        // `create_dir` refuses whatever is at the name, a link that resolves
        // nowhere included: an export writes into a folder it made itself.
        #[cfg(unix)]
        {
            let fixture = fixture();
            std::os::unix::fs::symlink(
                fixture.document.path().join("nothing-here"),
                fixture.outside.path().join("a-talk-deck"),
            )
            .expect("link");
            let message = run_export(&fixture.context, &request("deck"), fixture.outside.path())
                .expect_err("refused");
            assert!(message.contains("cannot create a-talk-deck"), "{message}");
            assert!(!fixture.document.path().join("nothing-here").exists());
        }
    }

    #[test]
    fn export_refuses_a_folder_name_that_is_not_one_segment() {
        let fixture = fixture();
        for name in ["../escaped", "a talk", "A-Talk", "-talk", "talk/deck", ""] {
            let mut request = request("deck");
            request.folder_name = name.to_string();
            let message = run_export(&fixture.context, &request, fixture.outside.path())
                .expect_err("refused");
            assert!(
                message.contains("not a folder name an export writes"),
                "{name}: {message}"
            );
        }
        assert!(walk(fixture.outside.path()).is_empty());
    }

    #[test]
    fn export_never_writes_over_a_folder_that_is_there() {
        let fixture = fixture();
        run_export(&fixture.context, &request("deck"), fixture.outside.path()).expect("exported");
        let first = fixture.outside.path().join("a-talk-deck");
        let before = walk(&first);
        let second = run_export(&fixture.context, &request("deck"), fixture.outside.path())
            .expect("exported")
            .outcome;
        assert_eq!(second.folder, "a-talk-deck-2");
        assert_eq!(walk(&first), before, "the first folder was written over");
        assert!(fixture.outside.path().join("a-talk-deck-2").is_dir());
    }

    #[test]
    fn export_leaves_the_document_folder_byte_for_byte() {
        let fixture = fixture();
        let before = walk(fixture.document.path());
        run_export(&fixture.context, &request("deck"), fixture.outside.path()).expect("exported");
        run_export(
            &fixture.context,
            &request("article"),
            fixture.outside.path(),
        )
        .expect("exported");
        // And a refused destination inside the document leaves it alone too.
        run_export(
            &fixture.context,
            &request("deck"),
            &fixture.document.path().join("01-part"),
        )
        .expect_err("refused");
        assert_eq!(walk(fixture.document.path()), before);
    }

    #[test]
    fn an_exported_folder_carries_no_absolute_path() {
        let fixture = fixture();
        run_export(&fixture.context, &request("deck"), fixture.outside.path()).expect("exported");
        run_export(
            &fixture.context,
            &request("article"),
            fixture.outside.path(),
        )
        .expect("exported");

        // What the machine is called, in the two spellings a written file
        // could carry it in: the temporary root the test ran under, and the
        // home folder with the user's own name in it.
        let temporary = fixture.outside.path().to_string_lossy().into_owned();
        let home = std::env::var("HOME").unwrap_or_default();
        let user = Path::new(&home)
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();

        for folder in ["a-talk-deck", "a-talk-article"] {
            for (name, bytes) in walk(&fixture.outside.path().join(folder)) {
                let text = String::from_utf8_lossy(&bytes);
                assert!(
                    !text.contains(&temporary),
                    "{name} names the folder it was written into"
                );
                if !home.is_empty() {
                    assert!(!text.contains(&home), "{name} names the home folder");
                }
                if user.len() > 2 {
                    assert!(!text.contains(&user), "{name} names the user");
                }
                // The pages the build wrote name nothing above the folder.
                if name.ends_with(".html") {
                    assert!(!text.contains("file:"), "{name} names a file URL");
                    assert!(!text.contains("=\"/"), "{name} names an absolute path");
                }
            }
        }
    }

    #[test]
    fn stage_version_writes_the_bytes_it_was_given() {
        // The export's folder is the staging tree, copied. So what the shell
        // wrote is what the build handed it, byte for byte.
        let fixture = fixture();
        run_export(&fixture.context, &request("deck"), fixture.outside.path()).expect("exported");
        let folder = fixture.outside.path().join("a-talk-deck");
        assert_eq!(
            fs::read_to_string(folder.join("slides/index.html")).expect("read"),
            deck_files()[0].text
        );
        assert_eq!(
            fs::read(folder.join("assets/01-part/lantern.jpg")).expect("read"),
            b"not really a jpeg"
        );
    }

    #[test]
    fn two_stagings_of_one_build_hash_alike() {
        // The export stages into a tree of its own, and the dry run into the
        // publish's. One build staged twice is one tree twice, so the folder
        // Alice carries and the version the site serves cannot drift.
        let fixture = fixture();
        let files = deck_files();
        let copies = copies();
        let first = stage::stage_version(
            &fixture.context.cache_dir.join(EXPORT_STAGING_FOLDER),
            fixture.document.path(),
            &files,
            &copies,
        )
        .expect("staged");
        let second = stage::stage_version(
            &crate::publish::staging_path(&fixture.context.cache_dir),
            fixture.document.path(),
            &files,
            &copies,
        )
        .expect("staged");
        assert_eq!(first.hash, second.hash);
        assert_ne!(first.path, second.path, "one tree cleared the other");
        assert_eq!(walk(&first.path), walk(&second.path));
    }

    #[test]
    fn the_dry_run_row_opens_the_folder_the_dry_run_staged() {
        let fixture = fixture();
        // Before any dry run there is nothing to open, and the row says so.
        let message = staged_version_path(&fixture.context.cache_dir).expect_err("refused");
        assert!(message.contains("no dry run has been staged"), "{message}");

        // The dry run stages into the publish's own tree; the row opens it.
        let staged = stage::stage_version(
            &crate::publish::staging_path(&fixture.context.cache_dir),
            fixture.document.path(),
            &deck_files(),
            &copies(),
        )
        .expect("staged");
        assert_eq!(
            staged_version_path(&fixture.context.cache_dir).expect("a folder"),
            staged.path
        );
    }

    #[test]
    fn folder_chrome_is_the_engine_and_the_deck_s_own_files() {
        let deck: Vec<&str> = stage::chrome_for_folder("deck")
            .expect("chrome")
            .into_iter()
            .map(|(name, _)| name)
            .collect();
        assert_eq!(
            deck,
            vec![
                "presenter/reveal/reveal.js",
                "presenter/reveal/reveal.css",
                "presenter/reveal/reset.css",
                "presenter/reveal/plugin/notes/notes.js",
                "presenter/reveal/LICENSE",
                "presenter/slides.css",
                "presenter/deck.js",
            ]
        );
        let article: Vec<&str> = stage::chrome_for_folder("article")
            .expect("chrome")
            .into_iter()
            .map(|(name, _)| name)
            .collect();
        assert_eq!(article, vec!["presenter/article.css"]);
        // The site's own root files are in neither: `index.html` would collide
        // with the article's, and none of the rest means anything in a folder.
        for kind in ["deck", "article"] {
            for (name, _) in stage::chrome_for_folder(kind).expect("chrome") {
                assert!(
                    !["index.html", "404.html", "robots.txt", "_headers"].contains(&name),
                    "{kind} carries {name}"
                );
            }
        }
    }

    #[test]
    fn the_page_and_the_shell_name_one_set_of_chrome_files() {
        // The panel states what a row writes, and the shell writes it. Two
        // lists, held to one another here rather than left to drift. The
        // engine's own file names are `DECK_ENGINE_FILES`, which the page
        // composes its `presenter/reveal/…` lines from and this crate's
        // `ENGINE` copies; everything else the page names in full.
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("..");
        let page = fs::read_to_string(root.join("src/export/services.ts")).expect("read");
        let engine = fs::read_to_string(root.join("src/core/render/slides.ts")).expect("read");
        assert!(
            page.contains("DECK_ENGINE_FILES"),
            "the page invents its own engine list"
        );
        for kind in ["deck", "article"] {
            for (name, _) in stage::chrome_for_folder(kind).expect("chrome") {
                let stated = name.strip_prefix("presenter/").unwrap_or(name);
                let source = match stated.strip_prefix("reveal/") {
                    Some(file) => (file, &engine),
                    None => (stated, &page),
                };
                assert!(source.1.contains(source.0), "the page never names {name}");
            }
        }
    }
}
