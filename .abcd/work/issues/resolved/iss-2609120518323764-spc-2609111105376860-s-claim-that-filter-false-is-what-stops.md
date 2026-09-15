---
schema_version: 1
id: "iss-2609120518323764"
slug: "spc-2609111105376860-s-claim-that-filter-false-is-what-stops"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development/specs/open"
resolution: "Corrected in three places and pinned by a test. The record itself carries the correction beneath the wrong reading; DECISIONS.md carries a line correcting its predecessor; and the spec's Risks paragraph is amended in the dated form, quoting the too-broad mechanism it first stated. filter false is load-bearing: the divergence needs a transaction that touches the table and carries no realignment, so the peer realigns where the origin did not — an undo, the caret on the delimiter row, a multi-cursor edit, or a paste ending outside the table. The canary now uses the undo case and fails without the option, reporting the peer realigned the restored table and that the windows disagree about length, 78 against 98"
impact: internal
resolved_by:
  spec: "spc-2609111105376860"
---

spc-2609111105376860's claim that filter false is what stops alignTables diverging the two windows is unreachable as stated: the realignment is idempotent, so a peer receiving an already-aligned table computes an empty change set and appends nothing, and removing the option leaves the canary green with the same text, length and caret. The option is a correct guard for any extension that is not idempotent, but the spec presents it as the fix for a failure that cannot occur

## Correction, 2026-09-12

**This record is wrong and is corrected rather than deleted.** `filter: false` is
load-bearing, and the measurement that concluded otherwise could not have seen
its removal.

That measurement put both carets in a body row of one table and typed one
character — the single case where the originating transaction already carries
the realignment, so the peer's re-run is genuinely a no-op. Idempotence fails
whenever the origin's transaction touches the table and carries **no**
realignment, because the peer then satisfies every condition the extension
tests and realigns while the origin did not:

- **Undo.** A ragged table is loaded, one character typed (both windows
  aligned), then `C-/`. The undo carries `userEvent: undo` so the origin does
  not realign; the echo carries no user event, so the peer realigns the restored
  ragged table. The two texts now differ, and the next keystroke throws at
  `ChangeSet.of`. Simple and reachable by an author doing nothing unusual.
- The origin's caret on the delimiter row, where typing `:` or `-` is echoed
  without a realignment.
- A multi-cursor edit in the origin, and a paste whose end lands outside the
  table.

A caret in padding is *not* a counter-example: the cell's distance from the
content edge is clamped to an unchanged gutter, so the peer's caret stays put.

The shipped code was always right — `src/editor.ts` keeps the option. What was
wrong was the reasoning recorded about why, which would have misled the next
person to touch either `alignTables` or the echo into removing a guard that is
doing real work. Found by the independent adversarial review of
`feat/window-splitting`. The canary in `src/document.test.ts` wants the undo case
added so the guard's removal is caught rather than argued about.

## Grounds

- pursued: a wrong reason recorded beside right code is worse than no reason, because it invites the next reader to remove a guard doing real work; wrong if a fifth reachable case exists that the four named do not cover, which the canary would not catch since it tests only the undo
