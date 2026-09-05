//! Publishing: mint, build, stage, install, commit, push, record.
//!
//! Every step but the two that leave the machine — the push and the deploy
//! poll — runs under the dry-run flag, which is what the tests exercise. The
//! dry run mints nothing on disk: it computes the id, the token and the hash
//! in memory, stages into the application's cache, writes its step list there,
//! and touches no repository at all.
//!
//! The one outbound call in this crate lives in [`check_deploy_at`], reached
//! only from a command Alice's press invoked (`itd-2609051336158553`, network
//! only on publish). `no_network_outside_publish` holds that true.

pub mod git;
pub mod identity;
pub mod log;
pub mod stage;

use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::metadata::{self, DocumentMetadata};
use crate::settings::{check_base_url, Settings};
use git::Git;
use stage::{AssetCopy, BuiltFile, SiteLayout};

/// Where the staging tree and the dry run's step log sit, inside the cache.
pub const STAGING_FOLDER: &str = "publish-staging";
/// The dry run's step log, beside the staging tree.
pub const DRY_RUN_FILE: &str = "dry-run.json";

/// What the page asks for when Alice presses Publish.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishRequest {
    /// The variant being published.
    pub variant: String,
    /// `unlisted` here; `gated` is recorded by #20 and refused for now.
    pub flag: String,
    /// The built text files, relative to the version folder.
    pub files: Vec<BuiltFile>,
    /// The assets to copy, disk to disk.
    pub copies: Vec<AssetCopy>,
}

/// One step of a publish, as the panel shows it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishStep {
    pub name: String,
    /// `done`, `skipped` or `failed`.
    pub state: String,
    pub detail: String,
}

impl PublishStep {
    fn done(name: &str, detail: impl Into<String>) -> Self {
        Self {
            name: name.to_string(),
            state: "done".to_string(),
            detail: detail.into(),
        }
    }

    fn skipped(name: &str, detail: impl Into<String>) -> Self {
        Self {
            name: name.to_string(),
            state: "skipped".to_string(),
            detail: detail.into(),
        }
    }

    fn failed(name: &str, detail: impl Into<String>) -> Self {
        Self {
            name: name.to_string(),
            state: "failed".to_string(),
            detail: detail.into(),
        }
    }
}

/// What one publish did.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishOutcome {
    pub id: String,
    pub token: String,
    pub hash: String,
    pub created_version: bool,
    pub pushed: bool,
    pub stable_link: String,
    pub deck_link: String,
    pub version_link: String,
    pub dry_run: bool,
    pub steps: Vec<PublishStep>,
    /// The failing step's reason, where one failed.
    pub failure: Option<String>,
}

/// What a publish would meet, reported rather than refused.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Preflight {
    pub has_id: bool,
    pub repo_ready: bool,
    pub git_available: bool,
    pub remote: String,
    pub branch: String,
    pub base_url: String,
    pub refusals: Vec<String>,
}

/// What the poll saw at the link.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DeployCheck {
    pub answered: bool,
    pub hash: Option<String>,
    /// The stamp written into the log, where this check was the one that saw
    /// the link answer.
    pub seen_at: Option<String>,
}

/// How long after a publish the link may be polled.
///
/// The panel watches for five minutes; this is the outer bound on the window in
/// which the one outbound call in the crate can be made at all.
pub const DEPLOY_WATCH_WINDOW: Duration = Duration::from_secs(10 * 60);

/// The publish this session is waiting on, if any.
///
/// `check_deploy` is the only command that leaves the machine, and the promise
/// is that it does so only during a publish Alice pressed. So the publish
/// command opens this window on the hash it produced, and a poll for any other
/// hash — or outside the window — is refused before a request is built.
#[derive(Default)]
pub struct PublishInProgress(std::sync::Mutex<Option<(String, std::time::Instant)>>);

impl PublishInProgress {
    /// Open the window on the version a publish just pushed.
    pub fn started(&self, hash: &str) -> Result<(), String> {
        let mut held = self.lock()?;
        *held = Some((hash.to_string(), std::time::Instant::now()));
        Ok(())
    }

    /// Whether a poll for this hash belongs to a publish that is still running.
    pub fn watching(&self, hash: &str) -> Result<bool, String> {
        let held = self.lock()?;
        Ok(match held.as_ref() {
            Some((watched, since)) => watched == hash && since.elapsed() < DEPLOY_WATCH_WINDOW,
            None => false,
        })
    }

    #[allow(clippy::type_complexity)]
    fn lock(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, Option<(String, std::time::Instant)>>, String> {
        self.0
            .lock()
            .map_err(|_| "the publish state is unreadable".to_string())
    }
}

/// Refuse a poll that no publish asked for.
pub fn guard_deploy_check(watch: &PublishInProgress, expected_hash: &str) -> Result<(), String> {
    if watch.watching(expected_hash)? {
        return Ok(());
    }
    Err("no publish is waiting for this link".to_string())
}

/// The names one document publishes under.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Identity {
    pub id: String,
    pub token: String,
    /// Whether either name was minted by this publish.
    pub minted: bool,
}

/// Everything a publish needs from outside the request.
#[derive(Debug, Clone)]
pub struct PublishContext {
    pub document_root: PathBuf,
    pub cache_dir: PathBuf,
    pub settings: Settings,
    pub git: Git,
    pub dry_run: bool,
}

/// Report what a publish would meet: the metadata, the repository, and git.
pub fn preflight(context: &PublishContext, variant: &str) -> Preflight {
    let mut report = Preflight {
        remote: context.settings.publish.remote.clone(),
        branch: context.settings.publish.branch.clone(),
        base_url: context.settings.publish.base_url.clone(),
        ..Preflight::default()
    };
    let (has_id, mut refusals) = local_check(context, variant);
    report.has_id = has_id;
    let (repo_ready, git_available, repository) = repository_check(context);
    report.repo_ready = repo_ready;
    report.git_available = git_available;
    refusals.extend(repository);
    report.refusals = refusals;
    report
}

/// What can be answered from the document folder and the settings alone.
///
/// This runs before anything is written and before git is asked anything: an
/// unparsable publish log refuses the publish up front, and a dry run needs
/// nothing else.
fn local_check(context: &PublishContext, variant: &str) -> (bool, Vec<String>) {
    let mut refusals = Vec::new();
    let mut has_id = false;
    match read_metadata(&context.document_root) {
        Ok(metadata) => {
            has_id = metadata.id.is_some();
            if !metadata.variants.is_empty()
                && !metadata.variants.iter().any(|name| name == variant)
            {
                refusals.push(format!("{variant} is not a variant this document declares"));
            }
        }
        Err(error) => refusals.push(error),
    }
    // The record is Alice's: a log that will not parse stops the publish
    // rather than being written over.
    if let Err(error) = log::read_log(&log::log_path(&context.document_root)) {
        refusals.push(error);
    }
    if let Err(error) = check_base_url(&context.settings.publish.base_url) {
        refusals.push(error);
    }
    (has_id, refusals)
}

/// What only the production repository and git can answer.
fn repository_check(context: &PublishContext) -> (bool, bool, Vec<String>) {
    let mut refusals = Vec::new();
    let repo = Path::new(&context.settings.publish.repository);
    if context.settings.publish.repository.is_empty() {
        refusals.push("no production repository is configured".to_string());
        return (false, false, refusals);
    }
    if !repo.is_dir() {
        refusals.push(format!(
            "the production repository is not there: {}",
            repo.display()
        ));
        return (false, false, refusals);
    }
    match context.git.is_repository(repo) {
        Ok(true) => match context.git.head_branch(repo) {
            Ok(Some(_)) => (true, true, refusals),
            Ok(None) => {
                refusals.push("the production repository is on a detached HEAD".to_string());
                (true, true, refusals)
            }
            Err(error) => {
                refusals.push(error);
                (true, true, refusals)
            }
        },
        Ok(false) => {
            refusals.push(format!("{} is not a git repository", repo.display()));
            (false, true, refusals)
        }
        Err(error) => {
            refusals.push(error);
            (false, false, refusals)
        }
    }
}

/// Read the open document's metadata.
fn read_metadata(document_root: &Path) -> Result<DocumentMetadata, String> {
    metadata::read_metadata(&document_root.join(metadata::METADATA_FILE))
}

/// The id and the variant's token, minted where they are not there yet.
///
/// A dry run mints in memory and writes nothing: `document.yaml` gains `id:`
/// and `variant_tokens:` on the first real publish and never before.
pub fn mint_identity(
    document_root: &Path,
    variant: &str,
    dry_run: bool,
) -> Result<Identity, String> {
    let path = document_root.join(metadata::METADATA_FILE);
    let metadata = metadata::read_metadata(&path)?;
    let mut minted = false;

    let id = match metadata.id.clone() {
        Some(id) if identity::is_identifier(&id) => id,
        Some(id) => {
            return Err(format!(
                "the id in {} is not a published name: {id}",
                metadata::METADATA_FILE
            ))
        }
        None => {
            minted = true;
            identity::mint()?
        }
    };
    let token = match metadata.variant_tokens.get(variant).cloned() {
        Some(token) if identity::is_identifier(&token) => token,
        Some(token) => {
            return Err(format!(
                "the token for {variant} is not a published name: {token}"
            ))
        }
        None => {
            minted = true;
            identity::mint()?
        }
    };

    if minted && !dry_run {
        write_identity_lines(
            &path,
            metadata.id.is_none().then_some(id.as_str()),
            (!metadata.variant_tokens.contains_key(variant)).then_some((variant, token.as_str())),
        )?;
    }

    Ok(Identity { id, token, minted })
}

/// Write the identity into `document.yaml` by line.
///
/// Never by re-serialising: an appended line at column zero closes a block
/// scalar correctly and every other byte of the author's file is untouched.
fn write_identity_lines(
    path: &Path,
    id: Option<&str>,
    token: Option<(&str, &str)>,
) -> Result<(), String> {
    let mut text = match std::fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(error) => return Err(format!("cannot read {}: {error}", path.display())),
    };
    if !text.is_empty() && !text.ends_with('\n') {
        text.push('\n');
    }

    if let Some(id) = id {
        text.push_str(&format!("id: {id}\n"));
    }

    if let Some((variant, token)) = token {
        // A flow mapping — `variant_tokens: {}`, or `{talk: aaa}` — is one
        // line, so the entry goes inside its braces. Appending a block under it
        // would leave the file with the key written twice, which is a document
        // no YAML reader will take.
        if let Some(at) = flow_insertion(&text, "variant_tokens:") {
            let separator = if text[..at].trim_end().ends_with('{') {
                ""
            } else {
                ", "
            };
            text.insert_str(at, &format!("{separator}{variant}: {token}"));
        } else {
            let line = format!("  {variant}: {token}\n");
            match block_end(&text, "variant_tokens:") {
                Some(at) => text.insert_str(at, &line),
                None => {
                    text.push_str("variant_tokens:\n");
                    text.push_str(&line);
                }
            }
        }
    }

    crate::document::write_chapter_text(path, &text)
}

/// The offset just inside a key's closing brace, where it carries a flow value.
///
/// `None` where the key is absent or its value is a block, which is what
/// [`block_end`] then answers for.
fn flow_insertion(text: &str, key: &str) -> Option<usize> {
    let mut offset = 0usize;
    for line in text.split_inclusive('\n') {
        let trimmed = line.trim_end();
        if let Some(value) = trimmed.strip_prefix(key) {
            let value = value.trim();
            if value.starts_with('{') && value.ends_with('}') {
                let close = trimmed.rfind('}')?;
                return Some(offset + close);
            }
            return None;
        }
        offset += line.len();
    }
    None
}

/// The byte offset just past a mapping block's last indented line.
fn block_end(text: &str, key: &str) -> Option<usize> {
    let mut offset = 0usize;
    let mut found = None;
    for line in text.split_inclusive('\n') {
        if found.is_some() {
            let indented = line.starts_with(' ') || line.starts_with('\t');
            if !indented && !line.trim().is_empty() {
                break;
            }
            if indented {
                found = Some(offset + line.len());
            }
        } else if line.trim_end() == key {
            found = Some(offset + line.len());
        }
        offset += line.len();
    }
    found
}

/// The staging tree for this machine's publishes.
pub fn staging_path(cache_dir: &Path) -> PathBuf {
    cache_dir.join(STAGING_FOLDER)
}

/// Run one publish, or the dry run of one.
pub fn run_publish(
    context: &PublishContext,
    request: &PublishRequest,
) -> Result<PublishOutcome, String> {
    // The flag is recorded as the document went out. Phase 1 enforces neither
    // gate: the access policy arrives with map #20, and the panel says so.
    if request.flag != "unlisted" && request.flag != "gated" {
        return Err(format!(
            "a document goes out unlisted or gated, not {}",
            request.flag
        ));
    }
    // Everything answerable without touching anything comes first, so a
    // refusal costs nothing and runs no git.
    let (_has_id, local) = local_check(context, &request.variant);
    if let Some(refusal) = local.first() {
        return Err(refusal.clone());
    }
    // A dry run needs neither the repository nor git.
    if !context.dry_run {
        let (_ready, _available, repository) = repository_check(context);
        if let Some(refusal) = repository.first() {
            return Err(refusal.clone());
        }
    }

    let mut steps = Vec::new();
    let names = mint_identity(&context.document_root, &request.variant, context.dry_run)?;
    steps.push(PublishStep::done(
        "mint",
        if names.minted && context.dry_run {
            "a name would be minted"
        } else if names.minted {
            "minted the document's names"
        } else {
            "the document already has its names"
        },
    ));

    let staged = stage::stage_version(
        &staging_path(&context.cache_dir),
        &context.document_root,
        &request.files,
        &request.copies,
    )?;
    steps.push(PublishStep::done(
        "stage",
        format!(
            "{} files staged",
            request.files.len() + request.copies.len()
        ),
    ));

    let base = context.settings.publish.base_url.trim_end_matches('/');
    let stable_link = format!("{base}/{}/{}/", names.id, names.token);
    let deck_link = format!("{stable_link}slides/");
    let version_link = format!("{stable_link}v/{}/", staged.hash);

    if context.dry_run {
        steps.push(PublishStep::skipped(
            "install",
            "the dry run writes no version",
        ));
        steps.push(PublishStep::skipped("commit", "the dry run runs no git"));
        steps.push(PublishStep::skipped(
            "push",
            "the dry run touches no network",
        ));
        steps.push(PublishStep::skipped(
            "record",
            "the dry run appends no entry",
        ));
        let outcome = PublishOutcome {
            id: names.id,
            token: names.token,
            hash: staged.hash,
            created_version: false,
            pushed: false,
            stable_link,
            deck_link,
            version_link,
            dry_run: true,
            steps,
            failure: None,
        };
        write_dry_run_log(&context.cache_dir, &outcome)?;
        return Ok(outcome);
    }

    let layout = SiteLayout::new(
        &context.settings.publish.repository,
        &context.settings.publish.site_dir,
    );
    let mut written = stage::scaffold(&layout, base)?;
    let installed = stage::install_version(&layout, &names.id, &names.token, &staged)?;
    written.extend(installed.written.clone());
    written.extend(stage::write_latest(
        &layout,
        &names.id,
        &names.token,
        &staged.hash,
    )?);
    written.extend(stage::write_stable_shells(
        &layout,
        &names.id,
        &names.token,
    )?);
    written.sort();
    written.dedup();
    steps.push(PublishStep::done(
        "install",
        if installed.created {
            "wrote the version folder"
        } else {
            "this version was already on the site"
        },
    ));

    let mut outcome = PublishOutcome {
        id: names.id.clone(),
        token: names.token.clone(),
        hash: staged.hash.clone(),
        created_version: installed.created,
        pushed: false,
        stable_link: stable_link.clone(),
        deck_link: deck_link.clone(),
        version_link: version_link.clone(),
        dry_run: false,
        steps,
        failure: None,
    };

    let repo = layout.repo.clone();
    let mut committed = false;
    if written.is_empty() {
        outcome.steps.push(PublishStep::skipped(
            "commit",
            "nothing changed on the site",
        ));
    } else {
        let added = context.git.add(&repo, &written)?;
        if !added.ok {
            return Ok(fail(outcome, "commit", added.reason()));
        }
        if context.git.has_changes(&repo, &written)? {
            let message = format!("publish {} {}", names.id, staged.hash);
            let result = context.git.commit(&repo, &message, &written)?;
            if !result.ok {
                return Ok(fail(outcome, "commit", result.reason()));
            }
            committed = true;
            outcome.steps.push(PublishStep::done("commit", message));
        } else {
            outcome.steps.push(PublishStep::skipped(
                "commit",
                "nothing changed on the site",
            ));
        }
    }

    // What must be sent is not "did this publish commit" but "is anything on
    // this branch not at the remote yet". A publish whose push failed left a
    // commit behind; the retry writes nothing new, so it would commit nothing —
    // and skipping the push there would record links the site never received.
    let remote = &context.settings.publish.remote;
    let branch = &context.settings.publish.branch;
    let held = !committed && context.git.is_ahead(&repo, remote, branch)?;
    if !committed && !held {
        outcome.steps.push(PublishStep::skipped(
            "push",
            "the site already serves this version",
        ));
    } else {
        let pushed = context.git.push(&repo, remote, branch)?;
        if !pushed.ok {
            // The commit stays: `git reset` could destroy work that is not
            // Editor's. The site still serves what it served before.
            return Ok(fail(outcome, "push", pushed.reason()));
        }
        outcome.pushed = true;
        outcome.steps.push(PublishStep::done(
            "push",
            if held {
                "pushed the commit this machine was holding"
            } else {
                "pushed to the production repository"
            },
        ));
    }

    // Only now: an entry means a version reached the site.
    let entry = log::PublishEntry {
        action: "publish".to_string(),
        published: log::now_stamp()?,
        hash: staged.hash.clone(),
        variants: vec![request.variant.clone()],
        flag: request.flag.clone(),
        created_version: installed.created,
        links: [(
            request.variant.clone(),
            log::EntryLinks {
                stable: stable_link,
                deck: deck_link,
                version: version_link,
            },
        )]
        .into_iter()
        .collect(),
        seen_at_link: None,
    };
    log::append_entry(&log::log_path(&context.document_root), entry)?;
    outcome
        .steps
        .push(PublishStep::done("record", "wrote the publish log entry"));

    Ok(outcome)
}

fn fail(mut outcome: PublishOutcome, step: &str, reason: String) -> PublishOutcome {
    outcome
        .steps
        .push(PublishStep::failed(step, reason.clone()));
    outcome.failure = Some(reason);
    outcome
}

/// Write the dry run's step list beside the staging tree, and nothing else.
fn write_dry_run_log(cache_dir: &Path, outcome: &PublishOutcome) -> Result<(), String> {
    std::fs::create_dir_all(cache_dir)
        .map_err(|error| format!("cannot create {}: {error}", cache_dir.display()))?;
    let mut text = serde_json::to_string_pretty(outcome)
        .map_err(|error| format!("cannot write {DRY_RUN_FILE}: {error}"))?;
    text.push('\n');
    crate::document::write_chapter_text(&cache_dir.join(DRY_RUN_FILE), &text)
}

/// Ask the link whether it is serving this version yet.
///
/// The one outbound call in this crate. It is reached from `check_deploy`,
/// which the panel invokes only while a publish it started is running.
pub fn check_deploy_at(
    base_url: &str,
    url: &str,
    expected_hash: &str,
) -> Result<DeployCheck, String> {
    check_base_url(base_url)?;
    let base = base_url.trim_end_matches('/');
    if !url.starts_with(&format!("{base}/")) {
        return Err(format!("{url} is not under the configured site"));
    }
    if !identity::is_identifier(expected_hash) {
        return Err(format!("{expected_hash} is not a version hash"));
    }
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(10)))
        .build()
        .into();
    let mut response = match agent.get(url).call() {
        Ok(response) => response,
        // A site that has not deployed yet is not a failure to report; it is
        // an answer of "not yet".
        Err(_) => return Ok(DeployCheck::default()),
    };
    if response.status().as_u16() != 200 {
        return Ok(DeployCheck::default());
    }
    let body = match response.body_mut().read_to_string() {
        Ok(body) => body,
        Err(_) => return Ok(DeployCheck::default()),
    };
    let hash = serde_json::from_str::<serde_json::Value>(&body)
        .ok()
        .and_then(|value| value.get("hash")?.as_str().map(str::to_string))
        .filter(|hash| identity::is_identifier(hash));
    Ok(DeployCheck {
        answered: hash.as_deref() == Some(expected_hash),
        hash,
        seen_at: None,
    })
}

/* ---------------------------------------------------------------------------
 * The commands.
 *
 * Each is a thin wrapper over a plain function taking explicit paths, so the
 * tests reach the logic directly and the command layer holds no rule of its
 * own.
 * ------------------------------------------------------------------------- */

/// The application's own configuration and cache directories.
fn app_dirs(app: &tauri::AppHandle) -> Result<(PathBuf, PathBuf), String> {
    use tauri::Manager;
    let config = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("cannot find the configuration directory: {error}"))?;
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|error| format!("cannot find the cache directory: {error}"))?;
    Ok((config, cache))
}

fn context_for(
    app: &tauri::AppHandle,
    document_root: PathBuf,
    dry_run: bool,
) -> Result<PublishContext, String> {
    let (config, cache) = app_dirs(app)?;
    let settings = crate::settings::read_settings(&crate::settings::settings_path(&config))?;
    Ok(PublishContext {
        document_root,
        cache_dir: cache,
        settings,
        git: Git::new(),
        dry_run,
    })
}

/// Report what a publish would meet.
#[tauri::command]
pub async fn publish_preflight(
    app: tauri::AppHandle,
    variant: String,
    root: tauri::State<'_, crate::DocumentRoot>,
) -> Result<Preflight, String> {
    let document_root = root.get()?;
    let context = context_for(&app, document_root, false)?;
    tauri::async_runtime::spawn_blocking(move || preflight(&context, &variant))
        .await
        .map_err(|error| format!("cannot run the preflight: {error}"))
}

/// Publish: mint, stage, install, commit, push, record.
#[tauri::command]
pub async fn publish(
    app: tauri::AppHandle,
    request: PublishRequest,
    root: tauri::State<'_, crate::DocumentRoot>,
    watch: tauri::State<'_, PublishInProgress>,
) -> Result<PublishOutcome, String> {
    let document_root = root.get()?;
    let context = context_for(&app, document_root, false)?;
    let outcome = tauri::async_runtime::spawn_blocking(move || run_publish(&context, &request))
        .await
        .map_err(|error| format!("cannot publish: {error}"))??;
    // The one outbound call in the crate is open only while this publish is
    // waiting for its own version to appear at the link.
    if outcome.pushed {
        watch.started(&outcome.hash)?;
    }
    Ok(outcome)
}

/// Everything a publish does but the repository, git and the network.
#[tauri::command]
pub async fn publish_dry_run(
    app: tauri::AppHandle,
    request: PublishRequest,
    root: tauri::State<'_, crate::DocumentRoot>,
) -> Result<PublishOutcome, String> {
    let document_root = root.get()?;
    let context = context_for(&app, document_root, true)?;
    tauri::async_runtime::spawn_blocking(move || run_publish(&context, &request))
        .await
        .map_err(|error| format!("cannot run the dry run: {error}"))?
}

/// Poll the public link during a publish, and record the first sighting.
#[tauri::command]
pub async fn check_deploy(
    app: tauri::AppHandle,
    url: String,
    expected_hash: String,
    root: tauri::State<'_, crate::DocumentRoot>,
    watch: tauri::State<'_, PublishInProgress>,
) -> Result<DeployCheck, String> {
    guard_deploy_check(&watch, &expected_hash)?;
    let document_root = root.get()?;
    let (config, _cache) = app_dirs(&app)?;
    let settings = crate::settings::read_settings(&crate::settings::settings_path(&config))?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut check = check_deploy_at(&settings.publish.base_url, &url, &expected_hash)?;
        if check.answered {
            let at = log::now_stamp()?;
            if log::record_seen_at_link(&log::log_path(&document_root), &expected_hash, &at)? {
                check.seen_at = Some(at);
            }
        }
        Ok::<_, String>(check)
    })
    .await
    .map_err(|error| format!("cannot check the link: {error}"))?
}

/// Open one published link in the system browser.
///
/// The opener plugin's own command is deliberately not granted to the web
/// view: the site's base URL is a per-machine setting, so it cannot be written
/// into a capability file at build time, and a capability wide enough to be
/// useful would let any script in the view open any address at all. So the one
/// route out is this command, which refuses every URL that is not under the
/// configured site before it hands it to the system.
#[tauri::command]
pub async fn open_published_link(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let (config, _cache) = app_dirs(&app)?;
    let settings = crate::settings::read_settings(&crate::settings::settings_path(&config))?;
    let base = settings.publish.base_url.trim_end_matches('/');
    check_base_url(base)?;
    if !url.starts_with(&format!("{base}/")) {
        return Err(format!("{url} is not under the configured site"));
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| format!("cannot open the link: {error}"))
}

/// The publish log, newest first.
#[tauri::command]
pub async fn read_publish_log(
    root: tauri::State<'_, crate::DocumentRoot>,
) -> Result<Vec<log::PublishEntry>, String> {
    let document_root = root.get()?;
    tauri::async_runtime::spawn_blocking(move || {
        log::entries_newest_first(&log::log_path(&document_root))
    })
    .await
    .map_err(|error| format!("cannot read the publish log: {error}"))?
}

#[cfg(test)]
mod tests;
