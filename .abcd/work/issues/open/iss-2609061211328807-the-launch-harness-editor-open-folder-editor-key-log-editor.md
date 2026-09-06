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
---

The launch harness (EDITOR_OPEN_FOLDER, EDITOR_KEY_LOG, EDITOR_PRESENT_LOG, EDITOR_PRESENT_ON_OPEN) is live in release builds: a reviewer calls it a widening dev surface; the maintainer relies on it against the release binary to produce the logs that diagnosed three bugs. Decide whether it stays in release (confined log paths under temp and cache, no page-named path) or compiles out
