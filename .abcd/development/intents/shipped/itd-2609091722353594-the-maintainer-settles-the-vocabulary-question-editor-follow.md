---
id: itd-2609091722353594
slug: the-maintainer-settles-the-vocabulary-question-editor-follow
spec_id: spc-2609091733496272
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609081929528202
origin: extracted-from-record
production_mode: hand-written
---

# See what a prefix can do, without leaving the prefix

## Press Release

Alice has pressed `C-x` and stopped. She knows the chord she wants is under
there somewhere — it is the one that narrows to a section, or it is the one
that reloads, she cannot remember which — and twenty years of Emacs have
taught her hands what to do next: she presses `C-h`. A panel opens listing
every chord that starts with `C-x`, each beside what it does. She reads
`C-x n n`, types `n n`, and the section narrows. The panel closes as the
chord completes. She never left the prefix and she never opened a manual.
Later, wanting the whole table rather than one prefix's worth, she presses
`F1` and the keys panel opens — the same key Emacs has given help on for as
long as she has used it.

## Why This Matters

Editor has 140 rows and a keys panel that lists them all, reached by `C-h b`.
That is the right tool for reading the vocabulary and the wrong one for the
moment this intent is about: Alice does not want the table, she wants to know
what comes next, and she wants it without abandoning the prefix she has
already half-typed. Emacs answers that with `describe-prefix-bindings` — press
the help character after any prefix and see that prefix's bindings — and it is
a general fallback rather than a binding each prefix carries, which is why it
works everywhere without being written down anywhere.

Editor has no equivalent. A half-typed `C-x` shows in the modeline's prefix
cell and says nothing about what could follow it. For a maintainer settling
deliberately on Emacs's defaults (`iss-2609081929528202`), this is the one
addition of the four that is a genuine build rather than a chord choice — and
it is the one that makes the other 139 rows discoverable from the keyboard
instead of from a panel you have to know to open.

`F1` is the smaller half of the same ask. Vanilla Emacs binds it as an alias
of `help-command`, the `C-h` prefix itself. Editor's nearest thing to
`describe-bindings` is the keys panel, and giving `F1` to that row is one line
in the table for the single most useful thing `help-command` reaches.

## Mechanism

We expect an on-demand overlay to be the whole of what is wanted, rather than
a which-key idle popup, because the pattern is already proved in this codebase:
`C-h k`'s own prompt is an overlay opened by an explicit keypress that reads
the next chord as one sequence rather than letting it leak past. The prefix
overlay is that same shape with a different body. A timer, by contrast, would
be a debounced idle callback keyed off the in-progress prefix, cancelled by the
next keypress or by the chain resolving another way — genuinely new machinery
with no precedent here. It is falsifiable in use: if the maintainer finds
themselves pressing `C-h` after every prefix out of habit rather than need, the
overlay wanted to appear by itself and this claim was wrong.

We expect the overlay to need no new index, because `chordIndex`/`chordIndexIn`
in `src/keys.ts` already index every row by its full chord, and filtering
`BINDINGS` to rows whose chord begins with the live prefix plus a space is a
predicate over what is already there. Falsifiable if a prefix's rows turn out
to be reachable only through the vendored package's own map and not through
`BINDINGS` at all, in which case the overlay would show a table that does not
match what the keys actually do — which is worse than no overlay.

We expect the live prefix to be readable without new plumbing, because
`emacsStatus(view)` already exposes the in-progress chain and is already read
on every keystroke for the modeline's prefix cell, and `src/focus.ts` keeps
its own `pending` for the panes the surface cannot hear. Both are proved in
production. Falsifiable if the two disagree about what is half-typed, in which
case the overlay would show the wrong prefix's rows in one pane or the other.

## Scope Conditions

- Population: Alice, the maintainer, in the desktop app, with or without a <!-- cond: cond-2609091733494302 -->
  document loaded.
- Platform: the desktop app — the Tauri 2 shell with the system web view — on <!-- cond: cond-2609091733499576 -->
  macOS. `F1` is a function key the shell must not have claimed.
- The overlay is on demand only. It never appears unasked, on a timer or <!-- cond: cond-2609091733497194 -->
  otherwise. The which-key idle behaviour is deliberately out of scope and is
  filed separately if it is wanted after living with this.
- `F1` is a leaf, not a prefix. It opens the keys panel. `F1 b` and `F1 k` do <!-- cond: cond-2609091733498703 -->
  nothing; a genuine alias of the whole `C-h` prefix map is out of scope.
- The overlay lists rows from Editor's own binding table. A chord the vendored <!-- cond: cond-2609091733492674 -->
  package answers but `BINDINGS` does not carry is not listed, and that gap —
  if any is found — is a finding to capture, not something this intent papers
  over by inventing rows.
- The overlay works in every pane that can hold the keyboard, because both <!-- cond: cond-2609091733495425 -->
  key readers keep a prefix. It is not the editing surface's alone.
- Boundary with the keys panel (`C-h b`): that panel lists the whole table <!-- cond: cond-2609091733493528 -->
  grouped, and is unchanged but for one more chord on its row. This intent
  adds a filtered, prefix-scoped view beside it; it does not replace it.

## Acceptance Criteria

- Given the cursor in the editing text, when Alice presses `C-x` and then
  `C-h`, then an overlay opens listing every binding whose chord begins with
  `C-x`, each with its label, and nothing is inserted in the chapter.
- Given that overlay open, when Alice types the rest of a chord it lists, then
  that chord runs and the overlay closes — the prefix was not abandoned.
- Given that overlay open, when Alice presses `C-g`, then the overlay closes,
  the prefix is cancelled, and nothing runs.
- Given a two-step prefix such as `C-x n`, when Alice presses `C-h` after it,
  then the overlay lists only the rows under `C-x n`, not the whole `C-x` map.
- Given no prefix half-typed, when Alice presses `C-h` alone, then Editor
  behaves exactly as it does today — this intent binds nothing to a bare
  `C-h`.
- Given the keyboard in the sidebar with a prefix half-typed there, when Alice
  presses `C-h`, then the overlay opens and behaves exactly as it does from the
  editing surface — the same rendering, the same completion, the same cancel —
  and lists the rows that prefix reaches *in that pane*.
  (Amended 2026-09-10, at the maintainer's settlement during planning, before
  any code was written. As drafted this criterion read: "then the overlay lists
  that prefix's rows exactly as it does from the editing surface." Read
  literally, "exactly as it does from the editing surface" meant the editing
  surface's own rows, and this criterion and the second could not both hold:
  the tree answers two rows under `C-x` where the text answers twenty-five, so
  listing the text's twenty-five from the tree would put `C-x C-s` on the
  screen under a prefix that cannot reach it, and the second criterion promises
  that a chord the overlay lists runs when it is typed. The second criterion
  governs — nothing the overlay lists is ever dead — and this one gave way.
  "Exactly as" is therefore about the overlay, not about the rows: same
  overlay, same rendering, same behaviour, the pane's own vocabulary. Recorded
  here rather than left to be inferred, following `iss-2609052143457583`.)
- Given the cursor in the editing text, when Alice presses `F1`, then the keys
  panel opens, exactly as `C-h b` opens it; and given the keyboard in the
  sidebar or in a panel, when she presses `F1`, then nothing is claimed and
  nothing opens.
  (Amended 2026-09-10, at the maintainer's settlement during planning, before
  any code was written. As drafted this criterion read: "Given any pane holds
  the keyboard, when Alice presses `F1`, then the keys panel opens, exactly as
  `C-h b` opens it." The two clauses pulled against each other: `C-h b` opens
  the panel from the editing surface and from nowhere else, so "exactly as
  `C-h b` opens it" and "any pane" cannot both be honoured. Honouring "any
  pane" would have meant making `keys-panel` a row every pane answers, and a
  row is answered by every chord it carries, so `C-h b` and `C-x S-/` would
  have gained that reach too — two shipped chords changed in passing, for a
  criterion about a third. "Exactly as `C-h b` opens it" governs; `F1` is one
  more chord on an existing row and nothing else. The negative half is written
  in rather than left silent, because a leaf that does nothing in two of three
  panes is a thing to prove, not a thing to assume. This does not touch the
  sixth criterion above: the prefix overlay still works in every pane, because
  `C-h` there is the help character on a prefix already open rather than a
  prefix's own first step. Recorded here rather than left to be inferred,
  following `iss-2609052143457583`.)
- Given the keys panel open, when it is read, then its own row lists `F1`
  beside `C-h b`, and the overlay's row lists `C-h` as reached after a prefix.
- Inherited: one source, always — the overlay's rows are read from the one
  binding table every other surface already reads, with no second list written
  for it; legible on three device classes — the overlay is readable and
  dismissable at 1280, 820 and 390 CSS pixels; reachable by assistive
  technology — the overlay names itself and its rows through the same
  mechanism the existing overlays already use.

## Open Questions

_None recorded yet._

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-a39427ac5adf -->
Fidelity review — receipt rcp-a39427ac5adf (verifier abcd:intent-auditor claude-sonnet-5).

Provenance: abcd:intent-auditor@claude-sonnet-5 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:2aa7cc8c275b6138d3e7106f3cf83ce060f88292a2b9030c483b66d35488035e
Input attestations: diff:HEAD..working-tree@sha256:a7a89c8d936263a97a8f66218dc450981fd91357ecc6e18616e85cfec0ad51c;

Acceptance rollup: MET 8 · MET_WITH_CONCERNS 1 · NOT_MET 0 · INCONCLUSIVE 0

Per-criterion verdicts:
- ac-1 — MET: the handleKeyboard guard (src/emacs.ts:235, prefixHelpFor/tablePrefixFor at 268-311) claims C-h on a live chain and opens .prefix-help; the real-editing-surface test asserts every C-x row is listed with its label and documentText is byte-identical before and after
  evidence: src/emacs-keys.test.ts:1450 — "opens the prefix overlay on C-h after C-x, listing every chord under it with its label"
  evidence: src/emacs-keys.test.ts:1474 — "expect(documentText(app.view)).toBe(before);"
- ac-2 — MET: openPrefixHelp's onKey resolves a completed chord to chosenId and runs it in onClose (src/prefix-help.ts:194-229); the app-level test presses C-x, C-h, C-s and confirms the save ran once and the overlay is gone
  evidence: src/emacs-keys.test.ts:1478 — "runs the chord typed into the prefix overlay and closes it"
  evidence: src/prefix-help.ts:222 — "onClose: (chosen) => {"
- ac-3 — MET: cancellation is inherited from openOverlay's own keyboard-quit handling with no separate code, and the chain/pending are spent before the overlay opens (src/emacs.ts:235-248, src/focus.ts:703-712); tests assert the prefix is empty and nothing was written after C-g
  evidence: src/emacs-keys.test.ts:1490 — "leaves no prefix behind when C-g closes the prefix overlay"
  evidence: src/prefix-help.test.ts:229 — "keeps reading while what is typed is still a prefix, and runs the row when it completes"
- ac-4 — MET: completionsUnder narrows by canonicalChord(chord).startsWith(prefix + " ") (src/prefix-help.ts:66-94), and the test presses C-x n then C-h and asserts exactly the two C-x n rows, with C-x C-s absent
  evidence: src/emacs-keys.test.ts:1504 — "lists only the rows under C-x n when C-h follows the second step"
- ac-5 — MET: prefixHelpFor's `if (!chain) return null` (src/emacs.ts:296) means a bare C-h reaches the package's own reader unchanged; the test presses a bare C-h and confirms no overlay opens and C-h b / C-h k still complete as before
  evidence: src/emacs-keys.test.ts:1523 — "leaves a bare C-h the prefix it already was"
- ac-6 — MET: judged against the amended wording (same overlay, same rendering, same behaviour, the pane's own rows): src/focus.ts:703 catches C-h on a live `pending` and calls hooks.prefixHelp({ prefix, ids: answering(), run }); tests from the tree and from a panel each show only the pane's own rows (other-window, toggle-sidebar), completion moves the keyboard on, and a bare C-h in the tree is left unclaimed
  evidence: src/focus.test.ts:1442 — "opens the prefix overlay on C-h with the tree holding the keyboard"
  evidence: src/focus.test.ts:1470 — "runs the chord typed into the prefix overlay from the tree"
  evidence: src/focus.test.ts:1499 — "opens the prefix overlay on C-h with a panel holding the keyboard"
  evidence: src/focus.test.ts:1516 — "leaves a bare C-h unclaimed in the tree, opening nothing"
- ac-7 — MET: judged against the amended wording (F1 from the editing surface only, exactly as C-h b): keys.ts:778 appends F1 to the keys-panel row's chords and no row anywhere binds an F1-prefixed multi-step chord, so F1 stays a leaf; the surface test confirms F1 opens the panel the same as C-h b and C-x S-/, and the pane-reader negative test confirms F1 is unclaimed in the tree and in a panel
  evidence: src/emacs-keys.test.ts:1422 — "opens the keys panel on C-h b, on C-x ? and on F1"
  evidence: src/focus.test.ts:1528 — "leaves F1 unclaimed in the tree and in a panel"
  evidence: src/keys.ts:778 — "chords: ["C-h b", "C-x S-/", "F1"],"
- ac-8 — MET: the keys-panel row (src/keys.ts:778) carries F1 and the new prefix-help row (src/keys.ts:1026) carries C-h with label "What can follow this prefix"; the keyspanel test reads both rows out of a rendered panel
  evidence: src/keyspanel.test.ts:173 — "lists F1 on the keys-panel row and C-h on the prefix-help row"
- ac-9 — MET_WITH_CONCERNS: two of the three inherited disciplines have real automated coverage: 'one source' is swept against chordIndexIn over four prefixes, and the dialog/aria-label/dt-dd structure is asserted directly. The third, legibility at 1280/820/390 CSS pixels, rests only on the CSS-inheritance argument (the overlay reuses .overlay's width/max-height/overflow) and on manual check M-2, which is unticked in .abcd/.work.local/logs/acceptance/spc-2609091733496272.md — jsdom cannot measure layout, so the visual claim itself is unverified by anything in this diff
  evidence: src/prefix-help.test.ts:176 — "reads every row it lists out of the binding table, and writes no list of its own"
  evidence: src/prefix-help.test.ts:193 — "names itself and its rows the way every other overlay does"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609091733496272.md:33 — "- [ ] At 1280 CSS pixels: `C-x` then `C-h`. Every line of the twenty-five is"

Gap audit:
- honoured:
  - on-demand overlay only, no timer/debounce/idle callback anywhere in the design
    evidence: src/prefix-help.ts:6 — "only — there is no timer, no debounce and no idle callback here"
  - no new index: the filter is a predicate over the existing chordIndexIn/bindingById
    evidence: src/prefix-help.ts:66 — "export function completionsUnder("
  - the two prefix readers reconcile their different notations by mapping the table forward through toPackageChord rather than adding an inverse table
    evidence: src/emacs.ts:268 — "function tablePrefixFor(chain: string): string | null {"
  - the shipped suppression invariant is amended narrowly, with the C-h exception asserted in both directions rather than excused
    evidence: src/emacs-keys.test.ts:428 — "suppresses a chord instead of listing it, never both"
    evidence: src/emacs-keys.test.ts:437 — "const ANSWERED_ELSEWHERE = new Set(["C-h"]);"
  - the keys panel's own grouping, ordering and renderer are unchanged but for one more chord and a generalised bindingLine reused by both
    evidence: src/keyspanel.ts — "export function bindingLine("
  - docs updated in the same change: a new 'See what can follow a prefix' section, F1 named in 'See every chord', and the suppression table/never-both sentence corrected
    evidence: docs/how-to-find-and-change-the-keys.md — "## See what can follow a prefix"
- diverged:
  - cond-2609091733499576 (F1 not claimed by the shell) is verified only on the code side; the macOS system-settings half of the same condition is unverified
    evidence: src-tauri/src/lib.rs:287 — ".accelerator("CmdOrCtrl+O")"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609091733496272.md:57 — "- [ ] In System Settings › Keyboard, confirm whether "Use F1, F2, etc. keys as standard function keys" is on."
  - the 'legible on three device classes' third of ac-9 is argued from CSS inheritance rather than demonstrated; the visual check is unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609091733496272.md:33 — "- [ ] At 1280 CSS pixels: `C-x` then `C-h`. Every line of the twenty-five is"
- missing:
  - cond-2609091733494302 (population: with or without a document loaded) — every prefix-help test in this diff mounts with a document/chapter already open; no test exercises the overlay with nothing loaded
    evidence: src/focus.test.ts:347 — "async function mount(open: Chapter = ALICE_CHAPTER): Promise< App> {"
  - the whole manual acceptance checklist (M-1 through M-6, real keyboard, real widths, real macOS settings) is unticked, so nothing in this delivery independently confirms the feature outside jsdom
    evidence: .abcd/.work.local/logs/acceptance/spc-2609091733496272.md:9 — "- [ ] Put the cursor in the middle of a paragraph. Press `C-x`. The modeline's"

Scope-condition dispositions:
- cond-2609091733494302 — untested: nothing in the delivered tests exercises the prefix overlay, or F1, with no document loaded; every test mounts with a chapter already open
- cond-2609091733499576 — narrowed: the code-side half of the assumption holds — grep of src-tauri shows no accelerator claims F1 — but it now holds only under that narrower check, not under the macOS system-settings half the design itself names as the real risk
  narrowing: verified only that the Tauri shell registers no F1 accelerator (src-tauri/src/lib.rs); whether macOS actually delivers F1 to the web view depends on the 'Use F1, F2, etc. keys as standard function keys' system setting, which manual check M-4 was to confirm and is unticked
  evidence: src-tauri/src/lib.rs:287 — ".accelerator("CmdOrCtrl+O")"
- cond-2609091733497194 — survived: no timer, setTimeout, setInterval or debounce appears anywhere in the delivered prefix-help/emacs/focus code; the overlay is opened and closed only by keypresses
  evidence: src/prefix-help.ts:6 — "only — there is no timer, no debounce and no idle callback here"
- cond-2609091733498703 — survived: F1 appears in exactly one BINDINGS entry as a leaf chord; no row anywhere in the table carries an F1-prefixed multi-step chord, so EmacsHandler.bindKey never writes the null-prefix marker for F1
  evidence: src/keys.ts:778 — "chords: ["C-h b", "C-x S-/", "F1"],"
- cond-2609091733492674 — survived: the pre-existing conformance sweep 'answers no chord the table does not list' passes unmodified against the new row, so nothing invented reaches the overlay
  evidence: src/emacs-keys.test.ts:546 — "answers no chord the table does not list"
- cond-2609091733495425 — survived: both key readers keep a prefix and both feed the same openPrefixHelp: the guard in src/emacs.ts:235 for the editing surface and the branch in src/focus.ts:703 for the tree and panels, each proven by its own passing tests
  evidence: src/emacs.ts:235 — "const prefix = prefixHelpFor(this, event);"
  evidence: src/focus.ts:703 — "if (pending !== null && chordsOf(HELP_ID).includes(step)) {"
- cond-2609091733493528 — survived: keyspanel.ts's render() still draws every row grouped, in the same order, with the same movement and cancel; the only change is the generalised bindingLine call and the F1 addition to one row's chords, proven by the keyspanel test suite passing
  evidence: src/keyspanel.ts — "export function bindingLine("
## Grounds

- pursued: an on-demand overlay filtered from the existing binding table makes 140 rows discoverable mid-prefix, reusing the pattern C-h k's prompt already proves; wrong if the maintainer presses C-h after every prefix out of habit rather than need, which would mean the overlay wanted to appear by itself
