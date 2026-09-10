---
id: itd-2609091722353838
slug: the-maintainer-settles-two-more-c-x-o-moves-the-keyboard-and
spec_id: spc-2609091724073619
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609081938037238
origin: extracted-from-record
production_mode: hand-written
---

# `C-x o` moves the keyboard and never changes what is shown

## Press Release

Alice has the sidebar put away and the whole width of the window for her
prose. She presses `C-x o` out of habit. Nothing appears, nothing is hidden,
and her cursor stays in the sentence she was writing — but the modeline tells
her why: there is nowhere else for the keyboard to go. She presses `F2`, the
tree appears, and `C-x o` walks her into it and back out again, exactly as it
always has. The chord that moves the keyboard moves the keyboard. It does not
rearrange her window behind her back, and it never sits there silently doing
nothing.

## Why This Matters

`C-x o` currently opens a hidden sidebar on its way into it — map #36's own
mechanism, which was the right answer while `C-x C-b` was the only other
route and the editing surface was the only pane that could hear it. With `F2`
(`itd-2609091722296239`) reaching the sidebar from anywhere, that route is no
longer load-bearing, and keeping it makes `C-x o` two commands wearing one
chord: a focus move *and* a layout change, depending on state Alice cannot
see from the keyboard.

Worse, the shipped chord is dead in exactly the situation it was built for.
In the 0.3.1 app with no document loaded, the sidebar has no rows, so it is
not an available pane; no panel is open; and the cycle walks back round to
the editor it started in and calls it a move. `C-x o`, `C-x C-o` and
`C-c C-o` all appear broken (`iss-2609081707572166`) — and they are not
broken so much as mute. One rule fixes both: the cycle visits panes that are
shown, and when there is nowhere to go it says so.

## Mechanism

We expect "moves the keyboard, never changes what is shown" to be a rule
Alice can hold in her head without knowing the app's state, because it makes
`C-x o`'s effect a pure function of what she can see. A hidden sidebar is not
a pane for the same reason a closed panel is not one — the cycle already
skips a panel that is not open, and this makes the sidebar obey the rule the
rest of the cycle already obeys, rather than adding a special case. It is
falsifiable directly: if the maintainer, with the sidebar hidden, presses
`C-x o` and finds themselves in the tree, the rule is not the one shipped.

We expect a modeline sentence to be the whole fix for the dead chord, rather
than a separate no-document case to detect, because "nowhere else to go" is
one condition however it arose — no rows in the tree, no panel open, nothing
loaded at all. `cycle()` already knows when it found no other available pane;
it simply does not say so. This is falsifiable if the maintainer meets a
fourth way for the cycle to be empty that this sentence does not cover.

## Scope Conditions

- Population: Alice, the maintainer, in the desktop app, with or without a <!-- cond: cond-2609091724070248 -->
  document loaded — this intent deliberately includes the empty state, which
  is where the defect was found.
- Platform: the desktop app — the Tauri 2 shell with the system web view — on <!-- cond: cond-2609091724076120 -->
  macOS, the same platform the pane cycle already depends on.
- This intent amends the third acceptance criterion of shipped map #36 <!-- cond: cond-2609091724072933 -->
  (`itd-2609071216221686`), and the Mechanism claim beneath it. As shipped,
  `C-x o` on a hidden sidebar showed it and moved into it. That behaviour is
  retired, not extended. The amendment is recorded against that intent,
  following `iss-2609052143457583`'s pattern, rather than left to be inferred
  from this one.
- `C-x C-o` is not restored to the cycle. It answers `open-file-or-folder` <!-- cond: cond-2609091724074053 -->
  (`itd-2609061509393380`, map #35) and keeps doing so; the maintainer found
  it dead because they reached for it, not because it should cycle.
- `C-c C-o` is not bound by this intent and stays unbound. <!-- cond: cond-2609091724076182 -->
- The sidebar's availability rule is unchanged in kind: a tree with no rows <!-- cond: cond-2609091724071724 -->
  still cannot hold a cursor. What changes is that a hidden tree is also not
  a pane, and that the cycle reports finding nowhere to go.
- Boundary with `itd-2609091722296239`: that intent owns what shows and hides <!-- cond: cond-2609091724076918 -->
  the sidebar. This one owns only where the keyboard goes.

## Acceptance Criteria

- Given the sidebar hidden and the cursor in the editing text, when Alice
  presses `C-x o`, then the keyboard stays in the editing surface, the
  sidebar stays hidden, and the modeline announces that there is nowhere else
  to go.
- Given no document loaded, so the tree is empty and no panel is open, when
  Alice presses `C-x o`, then the modeline announces that there is nowhere
  else to go rather than the chord doing nothing with no report.
- Given the sidebar shown with rows and the cursor in the editing text, when
  Alice presses `C-x o`, then the keyboard moves into the tree exactly as it
  does today, with the cursor placed the same way.
- Given the sidebar shown and holding the keyboard, when Alice presses
  `C-x o`, then the keyboard moves on to the next available pane and the
  sidebar stays shown — leaving a pane is not hiding it.
- Given a panel open, when Alice cycles through it and away, then the panel
  behaves exactly as it does today, including an overlay being cancelled on
  the way out.
- Given the sidebar hidden, when Alice presses `F2` and then `C-x o`, then
  the tree is shown and the keyboard is in it — the two chords compose, and
  neither does the other's job.
- Inherited: one source, always — "is this pane available" is asked in the
  one place it already lives, and the hidden case is added there rather than
  tested again at each call site; legible on three device classes — the flow
  holds at 1280, 820 and 390 CSS pixels; reachable by assistive technology —
  the modeline's announcement reaches a screen reader through the same
  mechanism the modeline's other announcements already use.

## Open Questions

_None recorded yet._

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-1674a0c1a8fd -->
Fidelity review — receipt rcp-1674a0c1a8fd (verifier abcd:intent-auditor claude-sonnet-5).

Provenance: abcd:intent-auditor@claude-sonnet-5 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:c37bd8cf570a8d740f806f840bcd1f5aa814d31bab9c531be77268fd23036d14
Input attestations: diff:HEAD..working-tree@sha256:6733dcee2e2e10ed3318829710f2e0e7f59c8b3f083f972efde48c085a1f3b52;

Acceptance rollup: MET 6 · MET_WITH_CONCERNS 1 · NOT_MET 0 · INCONCLUSIVE 0

Per-criterion verdicts:
- ac-1 — MET: cycle() stops one step short of a full turn and announces the fall-through; the negative-state test confirms pane, sidebar state and text are untouched
  evidence: src/focus.ts:464-473 — "for (let step = 1; step < PANE_ORDER.length; step += 1) { ... } hooks.announce("Nowhere else to go");"
  evidence: src/focus.test.ts:1561-1575 — "it("stays in the text and says so when the sidebar is hidden" ... expect(modeline(app)).toContain("Nowhere else to go");"
- ac-2 — MET: the empty-tree/no-document reproduction of iss-2609081707572166 is exercised directly and asserts the announcement rather than a silent cycle
  evidence: src/focus.test.ts:1577-1590 — "it("says so with no document loaded at all" ... expect(app.sidebar.rows()).toEqual([]); ... expect(modeline(app)).toContain("Nowhere else to go");"
- ac-3 — MET: the pre-existing map #30 test for moving into a shown tree is unmoved and still passes against the new available()/canHold() split
  evidence: src/focus.test.ts:367 — "it("moves the keyboard to the sidebar on C-x o and starts on the open chapter""
- ac-4 — MET: leaving a shown sidebar via C-x o does not hide it, asserted directly against sidebar.open and the DOM data-open attribute
  evidence: src/focus.test.ts:1592-1603 — "it("leaves the tree shown when the keyboard moves on from it" ... expect(app.sidebar.open).toBe(true);"
- ac-5 — MET: the five-panel sweep proves a registered panel is retained across the cycle while an overlay panel is cancelled on departure, exactly as before this change
  evidence: src/focus.test.ts:433-527 — "it("cycles editor, sidebar, panel, editor in one fixed order" ... Cancelled on the way out, so there is no third place to come back to"
- ac-6 — MET: F2 then C-x o composes: C-x o alone reports nowhere to go, F2 shows the tree without moving the keyboard, and a second C-x o then walks in
  evidence: src/focus.test.ts:1140-1161 — "it("shows a hidden sidebar again on F2, and C-x o then moves the keyboard into it""
  evidence: src/focus.test.ts:1605-1616 — "it("finds the tree again once F2 has shown it""
- ac-7 — MET_WITH_CONCERNS: one-source and three-width legs are demonstrably realised, but the modeline's message cell carries no aria-live/role=status anywhere in the codebase, so the assistive-technology leg has no automated corroboration and rests solely on the unticked VoiceOver row
  evidence: src/focus.ts:74-85 — "canHold(): boolean; ... available(): boolean;"
  evidence: src/focus.ts:396 — "available: () => sidebar.open && sidebarCanHold(),"
  evidence: src/modeline.ts:207 — "const messageCell = cell("modeline-message");"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609091724073619.md:M38-3 — "With VoiceOver on, the sentence is announced the same way the modeline's other messages are."

Gap audit:
- honoured:
  - a hidden or absent sidebar is not a pane the cycle visits, and the cycle stops short of a full turn rather than reporting a return to the start as a move
    evidence: src/focus.ts:464-473 — "for (let step = 1; step < PANE_ORDER.length; step += 1)"
  - 'may the cycle move here' and 'is the keyboard genuinely there' are kept as two separate questions (available vs canHold), each asked in exactly one place
    evidence: src/focus.ts:499 — "if (pane !== "editor" && !targetFor(pane).canHold()) toEditor();"
    evidence: src/focus.ts:555 — "if (sidebar.element.contains(landed) && sidebarTarget.canHold())"
  - takeFocus/releaseFocus no longer show or hide the drawer; the openedForFocus flag is retired
    evidence: src/sidebar.ts — "The drawer is not shown on the way in. ... the cycle now visits only panes that are already shown"
  - C-x C-o stays open-file-or-folder and is not restored to the cycle
    evidence: src/emacs-keys.test.ts:461-476 — "expect(other?.chords).toEqual(["C-x o"]); ... expect(openSource?.chords).toEqual(["C-x C-o"]);"
  - the third acceptance criterion of shipped map #36 is amended in place, naming this intent, rather than left to be inferred
    evidence: .abcd/development/intents/shipped/itd-2609071216221686-when-the-sidebar-holds-the-keyboard-s-shows-the-sidebar-if-i.md — "(Amended 2026-09-09, superseded by `itd-2609091722353838`, *`C-x o` moves the keyboard and never changes what is shown*."
  - the boundary with itd-2609091722296239 held: this delivery's own mechanism (available/canHold split, cycle stopping short, announce) touches only which panes the cycle visits, not the toggle command itself
    evidence: src/focus.ts:225-226 — "The command itself stays where it lives, in the application; this reader reaches it through `hooks.toggleSidebar`."
- diverged:
  - 'reachable by assistive technology' is claimed as inherited via the same announce() mechanism every other modeline message already uses
    evidence: src/modeline.ts — "no occurrence of aria-live, role="status" or role="alert" anywhere in modeline.ts (grep across src/*.ts finds aria-live only in new-document-panel.ts, unrelated)"
- missing:
  - the manual acceptance pass that closes iss-2609081707572166 on a real window, at three widths, and confirms VoiceOver behaviour
    evidence: .abcd/.work.local/logs/acceptance/spc-2609091724073619.md — "- [ ] Start the app and open no document at all. Press `C-x o`."

Scope-condition dispositions:
- cond-2609091724070248 — survived: the empty/no-document population this intent deliberately includes is exercised directly by an automated test
  evidence: src/focus.test.ts:1577-1590 — "it("says so with no document loaded at all""
- cond-2609091724076120 — untested: the desktop/macOS/Tauri runtime the condition names is exercised only by the manual checklist, which is entirely unticked; the automated evidence runs under jsdom, not the real shell
- cond-2609091724072933 — survived: the amendment is recorded in place on itd-2609071216221686's third criterion and Mechanism paragraph, naming this intent
  evidence: .abcd/development/intents/shipped/itd-2609071216221686-when-the-sidebar-holds-the-keyboard-s-shows-the-sidebar-if-i.md — "As shipped this criterion read: "then the sidebar shows and focus moves into it...""
- cond-2609091724074053 — survived: the binding table still routes C-x C-o to open-file-or-folder alone; other-window keeps only C-x o
  evidence: src/emacs-keys.test.ts:461-476 — "expect(openSource?.chords).toEqual(["C-x C-o"]); expect(openSource?.owner).toBe("editor");"
- cond-2609091724076182 — survived: no row in the binding table or elsewhere in src/ claims C-c C-o; a repo-wide search of the delivered code found zero occurrences
  evidence: src/keys.ts — "no "C-c C-o" entry found in the binding table (grep across src/*.ts and docs/*.md returns no matches)"
- cond-2609091724071724 — survived: the no-rows rule is unchanged in kind — sidebarCanHold() still asks rows().length > 0 — with 'shown' added only to available(), the separate question
  evidence: src/focus.ts:377-379,396 — "function sidebarCanHold(): boolean { return sidebar.rows().length > 0; } ... available: () => sidebar.open && sidebarCanHold(),"
- cond-2609091724076918 — survived: this delivery's own changes (available/canHold split, cycle stopping short, the takeFocus/releaseFocus auto-show/hide removal) govern only where the keyboard goes; the toggle-sidebar command it reaches is documented as staying owned by the application layer
  evidence: src/focus.ts:225-226 — "The command itself stays where it lives, in the application; this reader reaches it through `hooks.toggleSidebar`."
## Grounds

- pursued: C-x o moving the keyboard and never changing what is shown is one rule holdable without knowing the app's state, and one modeline sentence turns the dead chord into a report; wrong if the maintainer meets a fourth way for the cycle to be empty that the sentence does not cover, or finds skipping a hidden sidebar leaves them without a route their hands find
