---
schema_version: 1
id: "iss-2609061633599626"
slug: "cargo-test-s-watch-suite-flakes-intermittently-under-concurr"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "src-tauri/src/watch.rs"
wontfix_reason: "duplicate of iss-2609061520160056, which already records the watch suite flaking under concurrent load"
---

cargo test's watch:: suite flakes intermittently under concurrent load, each run failing a different one of emits_a_change_when_a_chapter_is_renamed / watches_below_the_root_as_well with a debounce timeout, though isolated single-test runs pass

## Grounds

- declined: duplicate of iss-2609061520160056, which already records the watch suite flaking under concurrent load
