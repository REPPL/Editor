---
schema_version: 1
id: "iss-2609100534172844"
slug: "the-rust-watch-test-emits-a-change-when-a-chapter-is-renamed"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src-tauri/src"
wontfix_reason: "Duplicate. The same flake is already recorded twice and settled: iss-2609061520160056 (resolved) and iss-2609061633599626 (wontfix), both naming the watch suite flaking under concurrent load rather than the assertion being wrong. Recording it a third time adds no signal, and this sighting adds nothing either: iss-2609061633599626 already names both watches_below_the_root_as_well and emits_a_change_when_a_chapter_is_renamed, and already records that each run fails a different one on a debounce timeout while isolated runs pass. This record is struck as the duplicate it is"
---

The Rust watch test emits_a_change_when_a_chapter_is_renamed is flaky: it failed once in a full cargo test run and passed both alone and in a whole re-run, which points at filesystem-watch timing rather than at the assertion

## Grounds

- declined: a third record of one settled flake is noise, and the two existing records already carry the finding and its disposition; wrong if the flake starts failing on a re-run rather than only on a first run under load, which would be a different fault and a fresh record
