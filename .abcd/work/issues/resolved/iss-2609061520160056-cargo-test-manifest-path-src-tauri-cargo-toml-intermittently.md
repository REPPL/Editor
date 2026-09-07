---
schema_version: 1
id: "iss-2609061520160056"
slug: "cargo-test-manifest-path-src-tauri-cargo-toml-intermittently"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "src-tauri/src/watch.rs"
resolution: "watch.rs's two timing tests now retry the triggering filesystem operation on a poll-with-deadline loop (trigger_until_seen) rather than trusting one operation performed once; ten consecutive full-suite cargo test runs at default parallelism passed clean"
impact: fix
---

cargo test --manifest-path src-tauri/Cargo.toml intermittently fails one or two of watch::tests::emits_a_change_when_a_chapter_is_renamed / watches_below_the_root_as_well (a chapter add/rename not reported in time); passes in isolation (cargo test watch::) every time, and never touched by map #10's work — likely filesystem-watcher timing flakiness under concurrent CPU/IO load from several agents building at once, but not yet confirmed root-caused.

## Grounds

- pursued: the two tests pass reliably under the CPU/IO contention several concurrent agents building at once produce; shown wrong by any one of ten repeated full-suite runs failing
