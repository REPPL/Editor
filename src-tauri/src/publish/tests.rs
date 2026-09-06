//! The publish action, end to end, against a fake `git`.

use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use super::*;
use crate::settings::{PublishTarget, Settings};

const BASE: &str = "https://example.invalid";

/// A `git` that records its arguments and answers as its control files say.
struct FakeGit {
    dir: tempfile::TempDir,
    program: PathBuf,
}

impl FakeGit {
    fn new() -> Self {
        let dir = tempfile::tempdir().expect("temp dir");
        let program = dir.path().join("fake-git");
        let here = dir.path().display();
        let script = format!(
            r#"#!/bin/sh
printf '%s\n' "$*" >> {here}/calls.txt
case "$3" in
  rev-parse) exit 0 ;;
  symbolic-ref) echo refs/heads/main; exit 0 ;;
  status) echo ' M site/index.html'; exit 0 ;;
  remote) echo origin; exit 0 ;;
  rev-list) cat {here}/ahead 2>/dev/null || echo 0; exit 0 ;;
  commit) echo 1 > {here}/ahead; exit 0 ;;
  push)
    if [ -f {here}/push-fails ]; then
      echo 'fatal: could not read Username for https://example.invalid' >&2
      exit 128
    fi
    echo 0 > {here}/ahead
    exit 0 ;;
  *) exit 0 ;;
esac
"#
        );
        fs::write(&program, script).expect("write the fake");
        fs::set_permissions(&program, fs::Permissions::from_mode(0o755)).expect("chmod");
        Self { dir, program }
    }

    fn fail_the_push(&self) {
        fs::write(self.dir.path().join("push-fails"), b"").expect("write");
    }

    fn allow_the_push(&self) {
        let _ = fs::remove_file(self.dir.path().join("push-fails"));
    }

    /// How many times a push was attempted, whatever it answered.
    fn pushes(&self) -> usize {
        self.calls()
            .iter()
            .filter(|call| call.contains(" push "))
            .count()
    }

    fn calls(&self) -> Vec<String> {
        fs::read_to_string(self.dir.path().join("calls.txt"))
            .unwrap_or_default()
            .lines()
            .map(str::to_string)
            .collect()
    }
}

struct Fixture {
    document: tempfile::TempDir,
    repo: tempfile::TempDir,
    cache: tempfile::TempDir,
    fake: FakeGit,
}

impl Fixture {
    fn new() -> Self {
        let document = tempfile::tempdir().expect("temp dir");
        fs::write(
            document.path().join("document.yaml"),
            "title: The Lantern Papers\nvariants: [talk]\ndefault_variant: talk\n",
        )
        .expect("write");
        Self {
            document,
            repo: tempfile::tempdir().expect("temp dir"),
            cache: tempfile::tempdir().expect("temp dir"),
            fake: FakeGit::new(),
        }
    }

    fn context(&self, dry_run: bool) -> PublishContext {
        PublishContext {
            document_root: self.document.path().to_path_buf(),
            cache_dir: self.cache.path().to_path_buf(),
            settings: Settings {
                schema_version: 1,
                publish: PublishTarget {
                    repository: self.repo.path().display().to_string(),
                    remote: "origin".to_string(),
                    branch: "main".to_string(),
                    base_url: BASE.to_string(),
                    site_dir: "site".to_string(),
                },
                asset_roots: Default::default(),
                text_scale: 0,
            },
            git: Git::with_program(&self.fake.program),
            dry_run,
        }
    }

    fn site(&self) -> PathBuf {
        self.repo.path().join("site")
    }

    fn document_yaml(&self) -> String {
        fs::read_to_string(self.document.path().join("document.yaml")).expect("read")
    }

    fn log(&self) -> Vec<log::PublishEntry> {
        log::entries_newest_first(&log::log_path(self.document.path())).expect("read")
    }
}

fn request(body: &str) -> PublishRequest {
    PublishRequest {
        variant: "talk".to_string(),
        flag: "unlisted".to_string(),
        files: vec![
            BuiltFile {
                path: "index.html".to_string(),
                text: format!("<h1>{body}</h1>\n"),
            },
            BuiltFile {
                path: "slides/index.html".to_string(),
                text: format!("<section>{body}</section>\n"),
            },
        ],
        copies: Vec::new(),
    }
}

fn entries_of(path: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(path)
        .map(|read| {
            read.filter_map(Result::ok)
                .map(|entry| entry.file_name().to_string_lossy().into_owned())
                .collect()
        })
        .unwrap_or_default();
    names.sort();
    names
}

#[test]
fn first_publish_mints_an_id_and_token() {
    let fixture = Fixture::new();
    let outcome = run_publish(&fixture.context(false), &request("one")).expect("published");
    assert!(identity::is_identifier(&outcome.id));
    assert!(identity::is_identifier(&outcome.token));
    assert!(identity::is_identifier(&outcome.hash));
    assert!(outcome.created_version);
    assert!(outcome.pushed);
    assert_eq!(
        outcome.stable_link,
        format!("{BASE}/{}/{}/", outcome.id, outcome.token)
    );
    assert_eq!(outcome.deck_link, format!("{}slides/", outcome.stable_link));
}

#[test]
fn document_yaml_gains_only_the_identity_lines() {
    let fixture = Fixture::new();
    let before = fixture.document_yaml();
    let outcome = run_publish(&fixture.context(false), &request("one")).expect("published");
    let after = fixture.document_yaml();
    assert!(
        after.starts_with(&before),
        "the author's bytes moved:\n{after}"
    );
    let added: Vec<&str> = after[before.len()..].lines().collect();
    assert_eq!(
        added,
        vec![
            format!("id: {}", outcome.id).as_str(),
            "variant_tokens:",
            format!("  talk: {}", outcome.token).as_str(),
        ]
    );
    // Nothing about the machine reached the document folder.
    for forbidden in ["/Users/", "/var/", "/tmp", "origin", "example.invalid"] {
        assert!(!after.contains(forbidden), "{after}");
    }
}

#[test]
fn a_second_publish_reuses_the_names_it_minted() {
    let fixture = Fixture::new();
    let first = run_publish(&fixture.context(false), &request("one")).expect("published");
    let second = run_publish(&fixture.context(false), &request("two")).expect("published");
    assert_eq!(first.id, second.id);
    assert_eq!(first.token, second.token);
    assert_ne!(first.hash, second.hash);
    assert_eq!(fixture.document_yaml().matches("id:").count(), 1);
}

#[test]
fn publish_commits_under_the_document_id() {
    let fixture = Fixture::new();
    let outcome = run_publish(&fixture.context(false), &request("one")).expect("published");
    let commit = fixture
        .fake
        .calls()
        .into_iter()
        .find(|call| call.contains(" commit "))
        .expect("a commit");
    assert!(
        commit.contains(&format!("publish {} {}", outcome.id, outcome.hash)),
        "{commit}"
    );
    // Only the paths this publish wrote.
    assert!(commit.contains(&format!(
        "site/{}/{}/latest.json",
        outcome.id, outcome.token
    )));
    assert!(!commit.contains(" -a "), "{commit}");
}

#[test]
fn publish_pushes_to_the_configured_remote() {
    let fixture = Fixture::new();
    run_publish(&fixture.context(false), &request("one")).expect("published");
    let push = fixture
        .fake
        .calls()
        .into_iter()
        .find(|call| call.contains(" push "))
        .expect("a push");
    assert!(push.ends_with("push origin HEAD:main"), "{push}");
}

#[test]
fn publish_writes_the_site_the_presenter_expects() {
    let fixture = Fixture::new();
    let outcome = run_publish(&fixture.context(false), &request("one")).expect("published");
    let site = fixture.site();
    let stable = site.join(&outcome.id).join(&outcome.token);
    assert!(stable.join("index.html").exists());
    assert!(stable.join("slides/index.html").exists());
    assert!(stable.join("latest.json").exists());
    assert!(stable
        .join("v")
        .join(&outcome.hash)
        .join("index.html")
        .exists());
    assert!(site.join("presenter/presenter.js").exists());
    assert!(site.join("presenter/reveal/reveal.js").exists());
    assert!(fixture.repo.path().join("tools/verify-site.mjs").exists());
    assert!(fixture
        .repo
        .path()
        .join(".github/workflows/publish.yml")
        .exists());
    let latest = fs::read_to_string(stable.join("latest.json")).expect("read");
    assert!(latest.contains(&outcome.hash), "{latest}");
}

#[test]
fn republish_moves_latest_and_leaves_the_old_version() {
    let fixture = Fixture::new();
    let first = run_publish(&fixture.context(false), &request("one")).expect("published");
    let old = fixture
        .site()
        .join(&first.id)
        .join(&first.token)
        .join("v")
        .join(&first.hash)
        .join("index.html");
    let old_bytes = fs::read(&old).expect("read");

    let second = run_publish(&fixture.context(false), &request("two")).expect("published");
    assert_ne!(first.hash, second.hash);
    assert_eq!(fs::read(&old).expect("read"), old_bytes);
    let latest = fs::read_to_string(
        fixture
            .site()
            .join(&first.id)
            .join(&first.token)
            .join("latest.json"),
    )
    .expect("read");
    assert!(latest.contains(&second.hash), "{latest}");
    assert!(!latest.contains(&first.hash), "{latest}");
}

#[test]
fn an_unchanged_republish_creates_no_version_path() {
    let fixture = Fixture::new();
    let first = run_publish(&fixture.context(false), &request("one")).expect("published");
    let versions = fixture.site().join(&first.id).join(&first.token).join("v");
    assert_eq!(entries_of(&versions).len(), 1);

    let second = run_publish(&fixture.context(false), &request("one")).expect("published");
    assert_eq!(first.hash, second.hash);
    assert!(!second.created_version);
    assert_eq!(entries_of(&versions).len(), 1);
}

#[test]
fn an_unchanged_republish_still_appends_an_entry() {
    let fixture = Fixture::new();
    run_publish(&fixture.context(false), &request("one")).expect("published");
    run_publish(&fixture.context(false), &request("one")).expect("published");
    let entries = fixture.log();
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0].hash, entries[1].hash);
    assert!(!entries[0].created_version);
    assert!(entries[1].created_version);
}

#[test]
fn an_unchanged_republish_skips_the_commit() {
    let fixture = Fixture::new();
    run_publish(&fixture.context(false), &request("one")).expect("published");
    let outcome = run_publish(&fixture.context(false), &request("one")).expect("published");
    let state = |name: &str| {
        outcome
            .steps
            .iter()
            .find(|step| step.name == name)
            .map(|step| step.state.clone())
            .unwrap_or_default()
    };
    assert_eq!(state("commit"), "skipped");
    assert_eq!(state("push"), "skipped");
    assert!(!outcome.pushed);
}

#[test]
fn a_failed_push_names_the_step_and_the_reason() {
    let fixture = Fixture::new();
    fixture.fake.fail_the_push();
    let outcome = run_publish(&fixture.context(false), &request("one")).expect("reported");
    assert!(!outcome.pushed);
    let failed = outcome
        .steps
        .iter()
        .find(|step| step.state == "failed")
        .expect("a failed step");
    assert_eq!(failed.name, "push");
    assert!(
        failed.detail.contains("could not read Username"),
        "{failed:?}"
    );
    assert!(outcome.failure.is_some());
    assert!(
        !fixture
            .fake
            .calls()
            .iter()
            .any(|call| call.split_whitespace().nth(2) == Some("reset")),
        "a failed push must not reset"
    );
}

#[test]
fn a_failed_push_leaves_the_deployed_paths_untouched() {
    let fixture = Fixture::new();
    let first = run_publish(&fixture.context(false), &request("one")).expect("published");
    let stable = fixture.site().join(&first.id).join(&first.token);
    let latest_before = fs::read_to_string(stable.join("latest.json")).expect("read");
    let old = stable.join("v").join(&first.hash).join("index.html");
    let old_bytes = fs::read(&old).expect("read");

    fixture.fake.fail_the_push();
    let second = run_publish(&fixture.context(false), &request("two")).expect("reported");
    assert!(!second.pushed);
    // The earlier version is exactly as it was deployed; the site the host
    // serves is whatever the last successful push left in the repository.
    assert_eq!(fs::read(&old).expect("read"), old_bytes);
    let latest_after = fs::read_to_string(stable.join("latest.json")).expect("read");
    assert_ne!(latest_before, latest_after, "the working copy moved on");
    // And no entry claims a version reached the site.
    assert_eq!(fixture.log().len(), 1);
}

#[test]
fn a_failed_push_leaves_the_document_folder_but_for_the_id() {
    let fixture = Fixture::new();
    let before = fixture.document_yaml();
    fixture.fake.fail_the_push();
    let outcome = run_publish(&fixture.context(false), &request("one")).expect("reported");
    assert!(!outcome.pushed);
    let after = fixture.document_yaml();
    assert!(after.starts_with(&before));
    assert!(after.contains(&format!("id: {}", outcome.id)));
    assert!(
        !log::log_path(fixture.document.path()).exists(),
        "a publish that never landed left a line"
    );
}

#[test]
fn a_retry_after_a_failed_push_pushes_the_held_commit() {
    let fixture = Fixture::new();
    run_publish(&fixture.context(false), &request("one")).expect("published");

    // The second publish writes its version and commits it, and the push fails.
    fixture.fake.fail_the_push();
    let failed = run_publish(&fixture.context(false), &request("two")).expect("reported");
    assert!(!failed.pushed);
    assert_eq!(fixture.log().len(), 1, "nothing claimed to have landed");

    // Alice fixes her credential and presses Publish again. Nothing on the site
    // has changed since, so there is nothing to write and nothing to commit —
    // but the commit the failed attempt left is what the site is waiting for,
    // and skipping the push here would record a link the site never received.
    fixture.fake.allow_the_push();
    let before = fixture.fake.pushes();
    let retried = run_publish(&fixture.context(false), &request("two")).expect("published");
    assert_eq!(retried.hash, failed.hash);
    assert!(retried.pushed, "{:?}", retried.steps);
    assert_eq!(
        fixture.fake.pushes(),
        before + 1,
        "the held commit was sent"
    );
    let push = retried
        .steps
        .iter()
        .find(|step| step.name == "push")
        .expect("a push step");
    assert_eq!(push.state, "done", "{push:?}");
    // And only now does an entry say this version reached the site.
    assert_eq!(fixture.log().len(), 2);
}

#[test]
fn check_deploy_is_refused_outside_a_publish() {
    // The one outbound call in the crate is open only while a publish Alice
    // pressed is waiting for its own version to appear.
    let watch = PublishInProgress::default();
    let hash = "cccccccccccccccccccccccccc";
    let message = guard_deploy_check(&watch, hash).expect_err("refused");
    assert!(message.contains("no publish is waiting"), "{message}");
    watch.started(hash).expect("started");
    assert!(guard_deploy_check(&watch, hash).is_ok());
    assert!(
        guard_deploy_check(&watch, "dddddddddddddddddddddddddd").is_err(),
        "only the version this publish produced"
    );
}

#[test]
fn a_flow_style_variant_tokens_gains_the_token_inside_its_braces() {
    let fixture = Fixture::new();
    let yaml = fixture.document.path().join("document.yaml");
    fs::write(
        &yaml,
        "title: The Lantern Papers\nvariants: [talk, full]\ndefault_variant: talk\nvariant_tokens: {}\n",
    )
    .expect("write");

    let talk = run_publish(&fixture.context(false), &request("one")).expect("published");
    let mut full_request = request("one");
    full_request.variant = "full".to_string();
    let full = run_publish(&fixture.context(false), &full_request).expect("published");

    let after = fixture.document_yaml();
    assert_eq!(
        after.matches("variant_tokens:").count(),
        1,
        "the key was written twice:\n{after}"
    );
    assert!(
        after.contains(&format!(
            "variant_tokens: {{talk: {}, full: {}}}",
            talk.token, full.token
        )),
        "{after}"
    );
    // And the file still reads back as the metadata it was.
    let metadata = crate::metadata::read_metadata(&yaml).expect("read");
    assert_eq!(metadata.variant_tokens.get("talk"), Some(&talk.token));
    assert_eq!(metadata.variant_tokens.get("full"), Some(&full.token));
}

#[test]
fn dry_run_leaves_no_trace() {
    let fixture = Fixture::new();
    let before = fixture.document_yaml();
    let outcome = run_publish(&fixture.context(true), &request("one")).expect("dry run");

    assert!(outcome.dry_run);
    assert!(identity::is_identifier(&outcome.id));
    assert!(identity::is_identifier(&outcome.hash));
    // Nothing on disk in the document folder.
    assert_eq!(fixture.document_yaml(), before);
    assert!(!log::log_path(fixture.document.path()).exists());
    // Nothing in the repository at all.
    assert!(entries_of(fixture.repo.path()).is_empty());
    // No git ran.
    assert!(fixture.fake.calls().is_empty());
    // Only the staging tree and the step log, in the cache.
    let dry_run = fixture.cache.path().join(DRY_RUN_FILE);
    assert!(dry_run.exists());
    let text = fs::read_to_string(&dry_run).expect("read");
    assert!(text.contains("\"dry_run\": true"), "{text}");
    assert!(staging_path(fixture.cache.path()).exists());
}

#[test]
fn a_dry_run_hashes_what_a_publish_would_hash() {
    let fixture = Fixture::new();
    let dry = run_publish(&fixture.context(true), &request("one")).expect("dry run");
    let real = run_publish(&fixture.context(false), &request("one")).expect("published");
    assert_eq!(dry.hash, real.hash);
    // The names differ: the dry run minted in memory and wrote nothing.
    assert_ne!(dry.id, real.id);
}

#[test]
fn publish_preflight_refuses_an_unparsable_log() {
    let fixture = Fixture::new();
    fs::write(
        log::log_path(fixture.document.path()),
        "{ this is not the file it was",
    )
    .expect("write");
    let report = preflight(&fixture.context(false), "talk");
    assert!(
        report
            .refusals
            .iter()
            .any(|refusal| refusal.contains(log::LOG_FILE)),
        "{report:?}"
    );
    let message = run_publish(&fixture.context(false), &request("one")).expect_err("refused");
    assert!(message.contains(log::LOG_FILE), "{message}");
    // Nothing was written: the preflight asked git what it is, and the
    // publish refused before staging, committing or pushing anything.
    assert!(!fixture
        .fake
        .calls()
        .iter()
        .any(|call| ["add", "commit", "push"]
            .contains(&call.split_whitespace().nth(2).unwrap_or_default())));
    assert!(!fixture.repo.path().join("site").exists());
    assert_eq!(
        fs::read_to_string(log::log_path(fixture.document.path())).expect("read"),
        "{ this is not the file it was"
    );
}

#[test]
fn the_flag_is_recorded_as_the_document_went_out() {
    // Phase 1 enforces no gate — the access policy is map #20 — but the entry
    // records the choice Alice made at each publish, which is the history of
    // the choice rather than the current state of the gate.
    let fixture = Fixture::new();
    let mut gated = request("one");
    gated.flag = "gated".to_string();
    run_publish(&fixture.context(false), &gated).expect("published");
    assert_eq!(fixture.log().remove(0).flag, "gated");

    let mut nonsense = request("two");
    nonsense.flag = "public".to_string();
    let message = run_publish(&fixture.context(false), &nonsense).expect_err("refused");
    assert!(message.contains("unlisted or gated"), "{message}");
}

#[test]
fn publish_refuses_a_variant_the_document_does_not_declare() {
    let fixture = Fixture::new();
    let mut other = request("one");
    other.variant = "full".to_string();
    let message = run_publish(&fixture.context(false), &other).expect_err("refused");
    assert!(message.contains("full"), "{message}");
}

#[test]
fn publish_refuses_a_built_path_that_escapes_the_version_folder() {
    let fixture = Fixture::new();
    let mut escaping = request("one");
    escaping.files.push(BuiltFile {
        path: "../../escaped.html".to_string(),
        text: "no".to_string(),
    });
    let message = run_publish(&fixture.context(false), &escaping).expect_err("refused");
    assert!(
        message.contains("not a path inside the version"),
        "{message}"
    );
}

#[test]
fn the_log_entry_carries_the_links_and_no_machine() {
    let fixture = Fixture::new();
    let outcome = run_publish(&fixture.context(false), &request("one")).expect("published");
    let entry = fixture.log().remove(0);
    assert_eq!(entry.action, "publish");
    assert_eq!(entry.flag, "unlisted");
    assert_eq!(entry.variants, vec!["talk".to_string()]);
    assert!(entry.created_version);
    assert_eq!(entry.seen_at_link, None);
    let links = entry.links.get("talk").expect("the variant's links");
    assert_eq!(links.stable, outcome.stable_link);
    assert_eq!(links.deck, outcome.deck_link);
    assert_eq!(links.version, outcome.version_link);
    let text = fs::read_to_string(log::log_path(fixture.document.path())).expect("read");
    for forbidden in ["/Users/", "/var/folders", "/home/", "@"] {
        assert!(!text.contains(forbidden), "{text}");
    }
}

#[test]
fn check_deploy_refuses_a_url_outside_the_configured_site() {
    let message = check_deploy_at(
        BASE,
        "https://elsewhere.invalid/aaaaaaaaaaaaaaaaaaaaaaaaaa/latest.json",
        "cccccccccccccccccccccccccc",
    )
    .expect_err("refused");
    assert!(
        message.contains("not under the configured site"),
        "{message}"
    );
}

#[test]
fn check_deploy_refuses_a_hash_that_is_not_a_name() {
    assert!(check_deploy_at(BASE, &format!("{BASE}/x/latest.json"), "7f3a91c2e4d85b06").is_err());
}

#[test]
fn an_editing_session_makes_no_request() {
    // Against a socket that reports every connection made to it, so the claim
    // is about requests rather than about which functions were called.
    use std::net::TcpListener;
    use std::sync::mpsc;

    let listener = TcpListener::bind("127.0.0.1:0").expect("a socket");
    let port = listener.local_addr().expect("an address").port();
    let (seen, heard) = mpsc::channel();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            if seen.send(()).is_err() {
                break;
            }
            drop(stream);
        }
    });
    let base = format!("https://127.0.0.1:{port}");

    let fixture = Fixture::new();
    let mut context = fixture.context(false);
    context.settings.publish.base_url = base.clone();
    let mut dry = context.clone();
    dry.dry_run = true;

    // Everything an editing session does that touches the publish machinery.
    preflight(&context, "talk");
    run_publish(&context, &request("one")).expect("published");
    run_publish(&dry, &request("two")).expect("dry run");
    log::entries_newest_first(&log::log_path(fixture.document.path())).expect("read");

    assert!(
        matches!(heard.try_recv(), Err(mpsc::TryRecvError::Empty)),
        "an editing session reached the network"
    );

    // And the socket is listening: the one call that may leave the machine does.
    let hash = "cccccccccccccccccccccccccc";
    let _ = check_deploy_at(&base, &format!("{base}/{hash}/latest.json"), hash);
    assert!(
        heard.recv_timeout(Duration::from_secs(20)).is_ok(),
        "the request-observing socket heard nothing at all"
    );
}

#[test]
fn no_network_outside_publish() {
    // The one HTTP client in the crate is named in exactly one file.
    let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut named = Vec::new();
    let mut stack = vec![source.clone()];
    while let Some(folder) = stack.pop() {
        for entry in fs::read_dir(&folder).expect("read") {
            let entry = entry.expect("entry");
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            if path.extension().and_then(|e| e.to_str()) != Some("rs") {
                continue;
            }
            let text = fs::read_to_string(&path).expect("read");
            // Built at run time, so this test's own source does not name it.
            let needle = format!("{}::", "ureq");
            if text.contains(&needle) {
                named.push(
                    path.strip_prefix(&source)
                        .expect("inside src")
                        .display()
                        .to_string(),
                );
            }
        }
    }
    named.sort();
    assert_eq!(named, vec!["publish/mod.rs".to_string()], "{named:?}");
}
