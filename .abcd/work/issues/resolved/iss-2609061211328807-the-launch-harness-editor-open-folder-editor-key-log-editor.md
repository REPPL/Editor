---
schema_version: 1
id: "iss-2609061211328807"
slug: "the-launch-harness-editor-open-folder-editor-key-log-editor"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "three-reviewer-code-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src-tauri/src/devharness.rs"
resolution: "Verified all four confinement claims in DECISIONS.md against src-tauri/src/devharness.rs and src/devharness.ts: each holds in code. Added a Rust test proving the cache-or-temp-directory OR (takes_a_path_inside_either_confined_root) and a new src/devharness.test.ts, since the frontend half had no test file at all, covering read-once-at-start and told-whether-never-where."
impact: internal
---

The launch harness (EDITOR_OPEN_FOLDER, EDITOR_KEY_LOG, EDITOR_PRESENT_LOG, EDITOR_PRESENT_ON_OPEN) is live in release builds: a reviewer calls it a widening dev surface; the maintainer relies on it against the release binary to produce the logs that diagnosed three bugs. Decide whether it stays in release (confined log paths under temp and cache, no page-named path) or compiles out

## Grounds

- pursued: the four confinement claims stay true as the harness evolves because a test now fails if devharness.rs accepts a log path outside both confined roots, or if devharness.ts asks the shell for settings more than once per run, or if a key-log line it writes ever carries a path; it would be wrong if any of those four regressions landed with every existing test still green
