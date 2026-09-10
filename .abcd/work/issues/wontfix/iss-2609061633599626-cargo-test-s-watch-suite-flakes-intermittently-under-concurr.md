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

## Sighting 2026-09-10

`--test-threads=1` is **not** a sufficient mitigation, which this record
previously implied by contrasting the flake with passing isolated runs. A
single-threaded run failed one test while a Node suite, a bundle build and a
finishing agent shared the machine, and the same single-threaded command passed
237/237 minutes later on a quieter one. The variable is machine load, not test
parallelism, so the honest advice is: re-run when the machine is idle, and never
read one failure of this module as a regression without doing so. Still not
fixed, and still not worth fixing — the debounce this depends on is the
filesystem watcher's, not the assertion's.

## Correction, 2026-09-10

The sighting above is wrong and is corrected here rather than edited away.
It concluded "the variable is machine load, not test parallelism" from a
single-threaded run that failed under heavy load. Measured properly on an idle
machine, three runs back to back: `--test-threads=1` passed 237/237 twice, and
the default parallel run failed both `watch::` tests both times it was tried.

Parallelism is the variable. Load is a second, weaker one that can break even a
serialised run.

> **This paragraph is wrong too, and is left standing so the sequence of wrong
> readings is legible.** The diagnosis under `## Fixed, 2026-09-10` below
> measured the cause directly: neither load nor parallelism, but this machine's
> `fseventsd` delivering the watch stream between 0.77 and 65 seconds after
> `watch()` returns. Parallelism only *looked* causal because both draws land in
> the same window at once — a probability shift, not a rule, which is why the
> original record's single-threaded failure was real and why an unmodified
> parallel run passed 237/237 before any fix. Two readings taken from run
> outcomes rather than from measurement, both plausible, both wrong. That matters because it makes this reproducible rather than
intermittent: `cargo test --manifest-path src-tauri/Cargo.toml`, exactly as
`AGENTS.md` documents it among the six commands a change must pass, fails on
this machine every time. That is no longer a flake to re-run — it is a gate
command that does not pass, and it is captured as such in
`iss-2609100708579771`.

## Fixed, 2026-09-10

The disposition above — "still not fixed, and still not worth fixing — the
debounce this depends on is the filesystem watcher's, not the assertion's" —
is left standing as what was believed, and is now overtaken. The first half of
it was right about the mechanism and wrong about the remedy: the wait really is
the filesystem watcher's and not the assertion's, but the assertion is still
where it had to be paid for, because the assertion is what carries the bound.

It was fixed under `iss-2609100708579771`, which recorded the same fault as a
gate command that does not pass rather than as a flake to re-run.
`src-tauri/src/watch.rs`'s two timing tests now take a wall-clock deadline
instead of a count of attempts, share one four-minute budget across arming and
assertion, and wait for the watch to begin delivering before the operation they
are about — measured, the macOS FSEvents stream opened anywhere between half a
second and sixty-five seconds after `watch` returned. Neither assertion was
relaxed. Eight consecutive full-suite runs at default parallelism passed 237 of
237, as did one at `--test-threads=1`.
