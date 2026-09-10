---
schema_version: 1
id: "iss-2609100708579771"
slug: "the-documented-gate-command-cargo-test-manifest-path-src-tau"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "release-cut"
origin: researcher-authored
production_mode: hand-written
found_at: "src-tauri/src"
resolution: "Neither load nor parallelism: this machine's fseventsd delivers the watch stream between 0.77 and 65 seconds after watch() returns, measured across about thirty instrumented trials, with a bare notify watcher waiting as long as the debounced one and two streams opened together arming at the same microsecond. Nothing is lost — operations made before the stream opens queue and flush together. What was wrong in the repository is that trigger_until_seen bounded the wait by 120 attempts of 250ms, about 30 seconds, while the daemon routinely spent 15 to 19 of those. The tests now share one 240-second wall-clock budget across setup and assertion, and each first drives a sentinel file until the watch is provably delivering, drains the flushed backlog, then zeroes its counter before the operation under test. Both assertions are stronger, not weaker: the backlog an opening stream flushes carries events from before the watch, which the old did-anything-arrive form would have accepted in place of the rename or the chapter. Eight consecutive default-parallelism runs green, and three more verified independently"
impact: fix
---

The documented gate command cargo test --manifest-path src-tauri/Cargo.toml fails reproducibly, not intermittently: on an idle machine the default parallel run fails watch::tests::emits_a_change_when_a_chapter_is_renamed and watch::tests::watches_below_the_root_as_well every time, while --test-threads=1 passes 237 of 237 twice over, so the two watch tests interfere with each other rather than flaking under load, and one of the six commands AGENTS.md says a change must pass does not pass

## Grounds

- pursued: a gate command that does not pass is fixed at its cause rather than by weakening the command or the assertion, and a wall-clock budget spent where the daemon actually spends it is the honest shape when the wait is the operating system's and not the code's; wrong if a machine exists where fseventsd exceeds the 240-second budget, which would make the suite hang rather than fail and is why the budget is bounded at all
