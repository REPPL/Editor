//! Git, as the author already has it.
//!
//! Editor shells out to the author's own `git` rather than linking `git2` or
//! `gix`. The reason is the intent's promise that Editor holds no credential:
//! the author's push works because their configuration works — the keychain
//! credential helper, an `ssh` agent and its config, `includeIf`,
//! `commit.gpgsign`, `url.*.insteadOf`, a proxy — and a library reimplements a
//! subset of that without running the author's helpers. The costs accepted are
//! that `git` must be on the path and that a failure arrives as stderr text,
//! so the reason Alice reads is git's own sentence.
//!
//! Arguments pass as a vector and never as a shell string; `GIT_TERMINAL_PROMPT`
//! and `GIT_OPTIONAL_LOCKS` are off, so a missing credential fails rather than
//! prompting behind a window nobody can see; and a remote or branch beginning
//! with `-` is refused before it reaches the command line.
//!
//! Nothing here resets. On a failed push the commit stays: `git reset` could
//! destroy work that is not Editor's.

use std::ffi::OsString;
use std::path::Path;
use std::process::Command;

use crate::settings::check_argument;

/// What one `git` invocation said.
#[derive(Debug, Clone)]
pub struct GitOutput {
    pub ok: bool,
    pub stdout: String,
    pub stderr: String,
}

impl GitOutput {
    /// The reason a step failed, in git's own words.
    pub fn reason(&self) -> String {
        let text = if self.stderr.trim().is_empty() {
            self.stdout.trim()
        } else {
            self.stderr.trim()
        };
        if text.is_empty() {
            "git failed and said nothing".to_string()
        } else {
            text.to_string()
        }
    }
}

/// The `git` the publish runs.
#[derive(Debug, Clone)]
pub struct Git {
    program: OsString,
}

impl Default for Git {
    fn default() -> Self {
        Self::new()
    }
}

impl Git {
    /// The author's `git`, from the path.
    pub fn new() -> Self {
        Self {
            program: OsString::from("git"),
        }
    }

    /// A named program instead, which is how the tests watch the arguments.
    pub fn with_program(program: impl Into<OsString>) -> Self {
        Self {
            program: program.into(),
        }
    }

    fn run(&self, repo: &Path, args: &[&str]) -> Result<GitOutput, String> {
        let mut command = Command::new(&self.program);
        command
            .arg("-C")
            .arg(repo)
            .args(args)
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_OPTIONAL_LOCKS", "0");
        let output = command
            .output()
            .map_err(|error| format!("cannot run git: {error}"))?;
        Ok(GitOutput {
            ok: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        })
    }

    /// Whether the folder is a git repository at all.
    pub fn is_repository(&self, repo: &Path) -> Result<bool, String> {
        Ok(self.run(repo, &["rev-parse", "--git-dir"])?.ok)
    }

    /// The branch `HEAD` is on; `None` on a detached head.
    pub fn head_branch(&self, repo: &Path) -> Result<Option<String>, String> {
        let output = self.run(repo, &["symbolic-ref", "--quiet", "HEAD"])?;
        if !output.ok {
            return Ok(None);
        }
        Ok(Some(output.stdout.trim().to_string()))
    }

    /// Stage exactly the paths this publish wrote.
    pub fn add(&self, repo: &Path, paths: &[String]) -> Result<GitOutput, String> {
        let mut args = vec!["add", "--"];
        args.extend(paths.iter().map(String::as_str));
        self.run(repo, &args)
    }

    /// Whether any of those paths differs from `HEAD`.
    pub fn has_changes(&self, repo: &Path, paths: &[String]) -> Result<bool, String> {
        let mut args = vec!["status", "--porcelain", "--"];
        args.extend(paths.iter().map(String::as_str));
        let output = self.run(repo, &args)?;
        if !output.ok {
            return Err(output.reason());
        }
        Ok(!output.stdout.trim().is_empty())
    }

    /// Commit those paths and no others, so the author's other work is left
    /// alone and their hooks see only what Editor wrote.
    pub fn commit(
        &self,
        repo: &Path,
        message: &str,
        paths: &[String],
    ) -> Result<GitOutput, String> {
        let mut args = vec!["commit", "-m", message, "--"];
        args.extend(paths.iter().map(String::as_str));
        self.run(repo, &args)
    }

    /// Push the branch the settings name.
    pub fn push(&self, repo: &Path, remote: &str, branch: &str) -> Result<GitOutput, String> {
        check_argument("remote", remote)?;
        check_argument("branch", branch)?;
        let refspec = format!("HEAD:{branch}");
        self.run(repo, &["push", remote, &refspec])
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::os::unix::fs::PermissionsExt;
    use std::path::PathBuf;

    use super::*;

    /// A `git` that records its arguments and answers as the script says.
    ///
    /// Each test writes its own fake, so nothing is shared between them and
    /// nothing depends on the environment the test run happens to carry.
    struct FakeGit {
        dir: tempfile::TempDir,
        program: PathBuf,
    }

    impl FakeGit {
        fn new(body: &str) -> Self {
            let dir = tempfile::tempdir().expect("temp dir");
            let program = dir.path().join("fake-git");
            let log = dir.path().join("calls.txt");
            let script = format!(
                "#!/bin/sh\nprintf '%s\\n' \"$*\" >> {log}\n{body}\n",
                log = log.display()
            );
            fs::write(&program, script).expect("write the fake");
            fs::set_permissions(&program, fs::Permissions::from_mode(0o755)).expect("chmod");
            Self { dir, program }
        }

        fn git(&self) -> Git {
            Git::with_program(&self.program)
        }

        fn calls(&self) -> Vec<String> {
            fs::read_to_string(self.dir.path().join("calls.txt"))
                .unwrap_or_default()
                .lines()
                .map(str::to_string)
                .collect()
        }
    }

    fn repo() -> tempfile::TempDir {
        tempfile::tempdir().expect("temp dir")
    }

    #[test]
    fn git_runs_without_a_terminal_prompt() {
        // `git` is asked for its own environment, which is the one place the
        // variables are observable without a network.
        let fake = FakeGit::new("printf '%s' \"$GIT_TERMINAL_PROMPT$GIT_OPTIONAL_LOCKS\"\nexit 0");
        let repo = repo();
        let output = fake
            .git()
            .add(repo.path(), &["site/index.html".to_string()])
            .expect("ran");
        assert_eq!(output.stdout, "00");
    }

    #[test]
    fn git_commits_only_the_paths_the_publish_wrote() {
        let fake = FakeGit::new("exit 0");
        let repo = repo();
        let paths = vec![
            "site/aaa/bbb/v/ccc/index.html".to_string(),
            "site/aaa/bbb/latest.json".to_string(),
        ];
        fake.git()
            .commit(repo.path(), "publish aaa ccc", &paths)
            .expect("ran");
        let call = fake.calls().pop().expect("a call");
        assert!(call.contains("commit -m publish aaa ccc --"), "{call}");
        assert!(call.contains("site/aaa/bbb/v/ccc/index.html"), "{call}");
        assert!(!call.contains(" -a"), "nothing else is swept in: {call}");
    }

    #[test]
    fn git_pushes_head_to_the_configured_branch() {
        let fake = FakeGit::new("exit 0");
        let repo = repo();
        fake.git().push(repo.path(), "origin", "main").expect("ran");
        let call = fake.calls().pop().expect("a call");
        assert!(call.ends_with("push origin HEAD:main"), "{call}");
    }

    #[test]
    fn git_refuses_a_remote_or_branch_that_looks_like_an_option() {
        let fake = FakeGit::new("exit 0");
        let repo = repo();
        assert!(fake
            .git()
            .push(repo.path(), "--exec=rm -rf /", "main")
            .is_err());
        assert!(fake.git().push(repo.path(), "origin", "--force").is_err());
        assert!(fake.calls().is_empty(), "nothing was run");
    }

    #[test]
    fn a_failed_push_reports_gits_own_sentence_and_resets_nothing() {
        let fake = FakeGit::new(
            "if [ \"$3\" = push ]; then echo 'fatal: could not read Username' >&2; exit 128; fi\nexit 0",
        );
        let repo = repo();
        let output = fake.git().push(repo.path(), "origin", "main").expect("ran");
        assert!(!output.ok);
        assert!(output.reason().contains("could not read Username"));
        assert!(
            !fake.calls().iter().any(|call| call.contains("reset")),
            "a failed push must not reset"
        );
    }

    #[test]
    fn git_reads_the_head_branch_and_reports_a_detached_head() {
        let attached = FakeGit::new("echo refs/heads/main\nexit 0");
        let detached = FakeGit::new("exit 1");
        let repo = repo();
        assert_eq!(
            attached.git().head_branch(repo.path()).expect("ran"),
            Some("refs/heads/main".to_string())
        );
        assert_eq!(detached.git().head_branch(repo.path()).expect("ran"), None);
    }

    #[test]
    fn git_reports_whether_the_written_paths_changed() {
        let dirty = FakeGit::new("echo ' M site/index.html'\nexit 0");
        let clean = FakeGit::new("exit 0");
        let repo = repo();
        let paths = vec!["site/index.html".to_string()];
        assert!(dirty.git().has_changes(repo.path(), &paths).expect("ran"));
        assert!(!clean.git().has_changes(repo.path(), &paths).expect("ran"));
    }
}
