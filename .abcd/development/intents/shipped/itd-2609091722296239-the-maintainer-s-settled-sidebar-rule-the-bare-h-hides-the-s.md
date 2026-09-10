---
id: itd-2609091722296239
slug: the-maintainer-s-settled-sidebar-rule-the-bare-h-hides-the-s
spec_id: spc-2609091724077315
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609081932488182
origin: extracted-from-record
production_mode: hand-written
---

# Show and hide the sidebar from wherever the keyboard is

## Press Release

Alice is deep in a paragraph and wants to see where she is in the book. She
presses `F2`. The tree appears beside the text; her cursor has not moved and
her paragraph is untouched. She presses `F2` again and the tree folds away.
Nothing about the chord depends on where the keyboard was: it is the same one
press in the text, in the tree, or with a panel open. Later she reaches for
`C-x C-b`, the chord that has shown her the list of what is open for twenty
years, and Editor shows her the chapter list — the same tree, the same place,
the chord back where Emacs put it.

## Why This Matters

Today the sidebar is shown and hidden by `C-x C-b`, and that row is owned by
the editing surface: it is answered by the CodeMirror extension, which only
hears a chord while the text has DOM focus. So a maintainer whose keyboard is
in the tree, in a panel, or nowhere in particular cannot reach the chord that
shows the tree at all. `h` (map #36) hides the sidebar from inside it, and
nothing shows it back except a chord that only one pane can hear. That is a
one-way door, and it is why the sidebar became unreachable in 0.3.1
(`iss-2609081707572166`).

`F2` is free — unclaimed by `BINDINGS`, unclaimed by the vendored package —
and it is a function key, which means it is answerable by every reader in the
app rather than only by the surface's own extension. Putting the toggle there
gives the maintainer one chord that always works, and it frees `C-x C-b` to be
what Emacs made it: the list of what is open. Editor's sidebar already *is*
that list, drawn from the same document tree `C-x b` searches by name, so the
Emacs pair `C-x b` / `C-x C-b` — jump by name, browse the list — becomes true
here rather than nearly true.

## Mechanism

We expect `F2` to reach the sidebar from every pane because the app already
has two key readers, not one: the editing surface's CodeMirror extension and
`src/focus.ts`'s document-level capture listener, which is active exactly
while the keyboard is somewhere the surface cannot hear. A row whose chord is
answered in *both* readers is reachable everywhere; `toggle-sidebar` is
reachable in one place today only because it is registered in one of them.
This is falsifiable in one press: if `F2` in the sidebar, or `F2` with the
keys panel open, failed to hide the tree, the mechanism would be wrong.

We expect `C-x C-b` to be safe to repoint at "show the chapter list" as a
second chord on the same toggle row, rather than as a separate show-only
command, because nobody presses a list-buffers chord twice in a row expecting
the list to stay. Emacs's own `list-buffers` never closes, so this is a
knowing, named divergence, not an oversight; it is falsifiable by the
maintainer finding a second press's close surprising rather than harmless, in
which case the answer is a distinct show-only command and this claim was
wrong.

## Scope Conditions

- Population: Alice, the maintainer, editing a document she has open, with <!-- cond: cond-2609091724074390 -->
  the sidebar built — the same population map #30 (`itd-2609051921482691`)
  and map #36 (`itd-2609071216221686`) state.
- Platform: the desktop app — the Tauri 2 shell with the system web view — on <!-- cond: cond-2609091724072652 -->
  macOS. `F2` is a function key the shell must not have claimed for the
  platform; this is the same dependency map #30 already carries for `C-x`.
- `C-c C-s` takes no part in this. It is already the two-step prefix that <!-- cond: cond-2609091724078919 -->
  carries bold (`C-c C-s b`) and italic (`C-c C-s i`) from the outline
  vocabulary (`itd-2609061318091323`), and the vendored package resolves a
  prefix the instant any multi-step binding sits under it, so `C-c C-s` can
  never also be a leaf. Bold and italic keep the chord exactly as shipped.
- This intent amends the fourth acceptance criterion of shipped map #36 <!-- cond: cond-2609091724076292 -->
  (`itd-2609071216221686`): `C-x C-b` no longer toggles from the editing
  surface *as a toggle bound only there*. It still shows the sidebar, from
  the editing surface and from every other pane, because it becomes a second
  chord on the row `F2` names. The amendment is recorded against that intent
  rather than left to be inferred.
- The divergence from Emacs's own `list-buffers` is named and accepted: a <!-- cond: cond-2609091724071963 -->
  second `C-x C-b` hides the tree where Emacs's would refresh a list that
  never closes.
- Boundary with the `C-x o` rule (`itd-2609091722353838`): that intent owns <!-- cond: cond-2609091724075988 -->
  what the pane cycle does about a hidden sidebar. This one owns what shows
  and hides it. They land in one change because they amend the same shipped
  intent, but neither widens the other.

## Acceptance Criteria

- Given the sidebar hidden and the cursor in the editing text, when Alice
  presses `F2`, then the sidebar shows, the cursor stays exactly where it was
  in the text, and nothing is inserted in the chapter.
- Given the sidebar shown and the cursor in the editing text, when Alice
  presses `F2`, then the sidebar hides and the cursor stays where it was.
- Given the sidebar shown and holding the keyboard, when Alice presses `F2`,
  then the sidebar hides and the keyboard returns to the editing surface,
  exactly as `h` already leaves it.
- Given a panel open and holding the keyboard, when Alice presses `F2`, then
  the sidebar's shown-or-hidden state changes and the panel is untouched.
- Given the sidebar hidden, when Alice presses `C-x C-b` from the editing
  surface, then the sidebar shows — the chapter list, on Emacs's own chord.
- Given the sidebar shown, when Alice presses `C-x C-b`, then it hides; this
  is the named divergence from Emacs's `list-buffers`, and it is the only one.
- Given focus in the sidebar, when Alice presses `h`, then the sidebar hides
  and the keyboard returns to the text, exactly as map #36 ships it and
  unchanged by this intent.
- Given the keys panel open, when it is read, then the toggle row lists both
  `F2` and `C-x C-b`, and no row anywhere claims `C-c C-s` as a leaf.
- Inherited: one source, always — the drawer's shown-or-hidden state is read
  and written in exactly the place it already lives, and both chords reach
  that one command; legible on three device classes — the flow holds at 1280,
  820 and 390 CSS pixels; reachable by assistive technology — the changed row
  is announced through the same mechanism every other row already is.

## Open Questions

_None recorded yet._

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-53913852d306 -->
Fidelity review — receipt rcp-53913852d306 (verifier abcd:intent-auditor claude-sonnet-5).

Provenance: abcd:intent-auditor@claude-sonnet-5 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:118e4c49c550a407876830865729c46c1f401ebc1b493856adaf0c8da366db1b
Input attestations: diff:HEAD..working-tree@-;

Acceptance rollup: MET 8 · MET_WITH_CONCERNS 1 · NOT_MET 0 · INCONCLUSIVE 0

Per-criterion verdicts:
- ac-1 — MET: F2 shows the sidebar from the text, moving the cursor and text not at all, asserted by a passing test
  evidence: src/focus.test.ts:1304 — "it("shows the sidebar on F2 from the text, moving nothing else""
  evidence: src/keys.ts:823 — "chords: ["F2", "C-x C-b"]"
- ac-2 — MET: F2 hides the sidebar from the text leaving the cursor in place, asserted both in focus.test.ts and via the editing surface's own reader in emacs-keys.test.ts
  evidence: src/focus.test.ts:1319 — "it("hides the sidebar on F2 from the text, leaving the cursor where it was""
  evidence: src/emacs-keys.test.ts:1572 — "it("shows and hides the sidebar on F2 as well""
- ac-3 — MET: F2 from inside the sidebar hides it and hands the keyboard back to the editor, checked against the same facts h's own test uses (chapter, text, cursor line)
  evidence: src/focus.test.ts:1334 — "it("hides the sidebar on F2 from inside it, and hands the keyboard back""
  evidence: src/focus.ts:625 — "case TOGGLE_ID:"
- ac-4 — MET: F2 from a panel toggles the sidebar while the panel stays focused and open, asserted with the publish panel mounted
  evidence: src/focus.test.ts:1353 — "it("shows and hides the sidebar on F2 from a panel, leaving the panel alone""
- ac-5 — MET: C-x C-b from the text shows a hidden sidebar, exercised via the sequence-press test and via CodeMirror's own reader
  evidence: src/focus.test.ts:1373 — "it("shows the chapter list on C-x C-b, and hides it on a second press""
  evidence: src/emacs-keys.test.ts:1560 — "it("shows and hides the sidebar on C-x C-b""
- ac-6 — MET: a second C-x C-b hides the tree, the named divergence from list-buffers, asserted in the same test as ac-5 and doubly in emacs-keys.test.ts's widened round trip
  evidence: src/focus.test.ts:1373 — "expect(press(app, "C-x C-b")).toBe(true); expect(app.sidebar.open).toBe(false);"
  evidence: src/emacs-keys.test.ts:1560 — "expect(pressSequence(app.view, "C-x C-b")).toBe(true);"
- ac-7 — MET: h from inside the sidebar still hides it and returns the keyboard to the text; both of map #36's own h tests are present, byte-for-byte unmoved in behaviour, and not touched by the diff to the sidebar-hide case
  evidence: src/focus.test.ts:1106 — "it("hides the drawer with h and hands the keyboard back to the text""
  evidence: src/focus.test.ts:1125 — "it("hides the sidebar with h even when it was already open before focus arrived""
- ac-8 — MET: the keys panel's toggle row lists F2 then C-x C-b in that order and the global sweep for a bare C-c C-s chord returns empty while bold/italic keep theirs
  evidence: src/focus.test.ts:1397 — "expect(chords).toEqual(["F2", "C-x C-b"]);"
  evidence: src/keys.ts:1139 — "chords: ["C-c C-s b"]"
- ac-9 — MET_WITH_CONCERNS: one-source (single toggleSidebar() reached by both chords/readers) and structural assistive-tech equivalence are both code-verified; the literal '1280, 820 and 390 CSS pixels' width claim has no automated width assertion (jsdom proves no width) and its sole supporting evidence, manual check M37-1, is unticked in the acceptance log, so that sub-claim is unverified rather than demonstrated
  evidence: src/app.ts:412 — "function toggleSidebar(): void {"
  evidence: src/focus.ts:228 — "const TOGGLE_ID = "toggle-sidebar";"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609091724077315.md:10 — "## M37-1 — `F2` from all three panes, at three widths"

Gap audit:
- honoured:
  - F2 is added as the toggle-sidebar row's first chord and reached by both key readers
    evidence: src/keys.ts:823 — "chords: ["F2", "C-x C-b"]"
    evidence: src/focus.ts:228 — "const TOGGLE_ID = "toggle-sidebar";"
  - C-x C-b stays as the second chord on the same row, repointed to a second-press-hides toggle rather than a distinct show-only command
    evidence: src/focus.test.ts:1373 — "it("shows the chapter list on C-x C-b, and hides it on a second press""
  - one-source discipline: sidebar.toggle() called from exactly one place, reached by both the command table and the focus model's hook
    evidence: src/app.ts:412 — "function toggleSidebar(): void {"
  - map #36's fourth acceptance criterion is amended in place, naming this intent as the one that superseded it
    evidence: .abcd/development/intents/shipped/itd-2609071216221686-when-the-sidebar-holds-the-keyboard-s-shows-the-sidebar-if-i.md:128 — "(Amended 2026-09-09, superseded by `itd-2609091722296239`"
  - the 820px risk named in the spec (hiding shows nothing above that width) was captured to the issue ledger rather than silently left implicit
    evidence: .abcd/work/issues/resolved/iss-2609091754178640-above-820-css-pixels-hiding-the-sidebar-hides-no-pixel-src-s.md:3 — "id: "iss-2609091754178640""
- diverged: (none)
- missing:
  - the platform scope condition's own falsifier — that macOS has not claimed F2 for the display — is unverified: M37-2, the only check that presses F2 on a real keyboard, is unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609091724077315.md:27 — "## M37-2 — the chords reach the page on a real keyboard"

Scope-condition dispositions:
- cond-2609091724074390 — survived: the delivered tests exercise exactly Alice's population — a document open with the sidebar built and rows in it
  evidence: src/focus.test.ts:1304 — "await mount();"
- cond-2609091724072652 — untested: the desktop/Tauri/macOS platform and F2-not-claimed-by-the-shell assumption is exactly what manual check M37-2 exists to test, and it is unticked; jsdom's simulated keydown cannot exercise the real platform layer this condition assumes
- cond-2609091724078919 — survived: C-c C-s bold/italic chords are unchanged in src/keys.ts and a test asserts no row anywhere binds a bare C-c C-s leaf
  evidence: src/keys.ts:1139 — "chords: ["C-c C-s b"]"
  evidence: src/focus.test.ts:1397 — "expect(leaf).toEqual([]);"
- cond-2609091724076292 — survived: the amendment is recorded against map #36's own intent file, in place, naming this intent, exactly as the condition promises
  evidence: .abcd/development/intents/shipped/itd-2609071216221686-when-the-sidebar-holds-the-keyboard-s-shows-the-sidebar-if-i.md:128 — "(Amended 2026-09-09, superseded by `itd-2609091722296239`"
- cond-2609091724071963 — survived: the second-press-hides divergence from list-buffers is implemented, tested, and named in both the row's own comment and the how-to doc
  evidence: src/focus.test.ts:1373 — "// Emacs's own `list-buffers` chord, pointed at the tree it already // draws. The one named divergence"
- cond-2609091724075988 — survived: focus.ts now keeps two separate questions — available() for what the C-x o cycle may visit, canHold() for where the keyboard already is — so this intent's toggle owns showing/hiding while the boundary intent's cycle rule is left untouched by it
  evidence: src/focus.ts:396 — "available: () => sidebar.open && sidebarCanHold(),"
  evidence: src/focus.ts:384 — "canHold: sidebarCanHold,"
## Grounds

- pursued: a toggle on F2, answerable by both key readers, gives one route to the sidebar from every pane, and C-x C-b returns to Emacs's own chapter-list shape; wrong if F2 turns out to be claimed by the shell or the platform, or if a second C-x C-b press hiding the tree reads as broken rather than as a named divergence
