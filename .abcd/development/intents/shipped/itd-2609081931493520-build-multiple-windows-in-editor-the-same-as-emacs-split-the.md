---
id: itd-2609081931493520
slug: build-multiple-windows-in-editor-the-same-as-emacs-split-the
spec_id: spc-2609111105376860
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Split the editing area, the same as Emacs

## Press Release

Alice is writing the introduction and needs the methods section in front of
her. She presses `C-x 3`. The editing area divides down the middle, the same
chapter in both halves, her cursor still in the sentence she was typing.
`C-x o` moves her to the right-hand window; she opens the methods chapter
there, and now the two sit side by side. She writes in the left, checks a
figure number in the right, and moves between them with the chord her hands
have used for twenty years.

Later she wants the same chapter twice, to keep the outline at the top in view
while she works at the bottom. `C-x 2` splits above and below, both windows on
one chapter, and an edit in one appears in the other as she types — one text,
two views of it, each remembering its own place. `C-x 1` puts her back to a
single window, the one she was in. `C-x 0` closes just the one she is in and
gives its room to the rest.

## Why This Matters

Editor has exactly one editing window, and switching chapters replaces what
that window shows. For notes that is enough. For a manuscript it is not: the
whole labour of writing a long document is holding two places in mind at once,
and an editor with one window makes the author do that from memory.

Emacs solved this before any of us started, and the maintainer's hands already
know the answer — `C-x 2`, `C-x 3`, `C-x 0`, `C-x 1`, and `C-x o` to move.
Editor already answers `C-x o`; what it lacks is anything for the chord to
move between. This intent gives it that, and it does so in the shape
`adr-2609091832455881` settled rather than in a cheaper shape that would look
like splitting and not be it.

The cheaper shape is worth naming, because it was declined for a reason. A
split that refuses to open the same chapter twice is a third of the work and
most of the appearance; what it loses is the case above — one text, two views,
each with its own point — which is what a split is *for* in the editor this
one is modelled on. Two independent copies of one chapter would be worse than
refusing: the author would edit both and the last save would win.

## Mechanism

We expect the pane cycle to generalise without changing its rule, because
`PANE_ORDER`'s shape already is the answer: editor, sidebar, panel, walked in
one fixed order. Splitting makes the first slot plural and leaves the other two
alone — the sidebar and any open panel stay docked outside the split grid and
are not splittable. `other-window` walks the editing leaves in reading order,
then the sidebar, then the panel. Falsifiable directly: if `C-x o` ever visits
the sidebar before a second editing window that is shown, the order is wrong.

~~We expect two windows on one chapter to be two views over one
`EditorState`.~~ **Falsified 2026-09-12, before any code was written.** The
claim named its own falsifier — "moves the other window's cursor to the typing
window's position" — and that is exactly what one shared state does:
`EditorState` declares `selection` as its own field beside `doc` and the view
holds no selection, so two views over one state object share one caret drawn
twice. Shared state and per-window cursors are mutually exclusive in
CodeMirror 6. Found by `spc-2609111105376860` reading the installed sources
rather than reasoning from memory; recorded as `iss-2609111123501225`;
`adr-2609091832455881`'s decision 2 is amended to match.

What replaces it: each window holds its own state, and the states of every
window on one chapter are kept in lockstep by echoing the change set
synchronously — annotated so the echo does not echo back, added to no history,
and carrying no selection, so each receiving window's caret is mapped through
the change for free. The falsifier stands unchanged and still bites: if an edit
in one window fails to appear in the other, appears twice, or moves the other
window's caret to the typing window's position, the lockstep is wrong.

We expect the exclusivity rule to survive untouched — exactly one pane holds
the keyboard, which is what lets `C-n` mean next line in the text and next node
in the tree without ambiguity. Splitting adds members to the set of things that
can hold the keyboard; it does not let two hold it at once. Falsifiable if any
chord is ever answered by two editing windows in one keypress.

We expect commands to need the focused window rather than a global, because
`src/emacs.ts` holds one module-level registry whose actions resolve against
one implicit current chapter. With several windows possibly showing several
chapters, `C-x C-s` must save the chapter in the window that has the keyboard.
Falsifiable in the worst way a text editor can be: if `C-x C-s` ever writes the
wrong file.

## Scope Conditions

- Population: Alice, the maintainer, editing a document she has open in the <!-- cond: cond-2609111105374926 -->
  desktop app.
- Platform: the desktop app — the Tauri 2 shell with the system web view — on <!-- cond: cond-2609111105372066 -->
  macOS. These are splits inside the one frame, as Emacs's are. No second
  operating-system window is created, and `adr-2609051324137479` is untouched.
- The window tree is a tree: a split may itself be split, to any depth, in <!-- cond: cond-2609111105374684 -->
  either direction. `C-x 2` divides above and below, `C-x 3` left and right.
- The sidebar and any open panel are docked outside the grid. Neither can be <!-- cond: cond-2609111105377260 -->
  split, and neither becomes a leaf of the tree.
- Two windows showing one chapter agree on its text at every moment: an edit in <!-- cond: cond-2609111105378478 -->
  either appears in both immediately. Each window holds its own `EditorState`,
  and the states of every window on one chapter are kept in lockstep by a
  synchronous annotated echo of the change set. Two independent copies of a
  chapter that could drift are explicitly not built —
  `adr-2609091832455881` declines that as worse than a refusal, because the
  last save would win and the author would lose work.
  (Amended 2026-09-15. As first written this condition read "Two windows
  showing one chapter share one document state", which the delivered code does
  the opposite of. The sharing was retired before any code was written, when
  `spc-2609111105376860` found that `EditorState` owns `selection` and one
  shared state would be one caret drawn twice — `iss-2609111123501225`, with
  the Mechanism paragraph and `adr-2609091832455881`'s decision 2 amended at
  the time. This condition's prose was missed in that pass and read false
  against the tree until its own fidelity audit caught it and recorded the
  disposition as *falsified*. What the condition was protecting — one text
  staying one text, and no two copies that can drift — survives unchanged; only
  the mechanism it named was wrong.)
- Each window remembers its own position per chapter it has shown, and a <!-- cond: cond-2609111105374579 -->
  chapter keeps a last-known position for a window opening it fresh. This is
  Emacs's window-point against buffer-point, and it replaces the single
  per-chapter offset the one-window app could get away with.
- Every command that means something chapter-shaped resolves against the window <!-- cond: cond-2609111105377511 -->
  holding the keyboard. `present`, `preview`, `publish-open` and `export-open`
  act on the document and are unchanged in meaning.
- `C-x o` still never changes what is shown (`itd-2609091722353838`). It moves <!-- cond: cond-2609111105374227 -->
  the keyboard among the leaves that exist. `C-x 0` and `C-x 1` are the only
  chords that change the layout, and `C-x 2` and `C-x 3` the only ones that
  create it.
- `C-x 1` keeps the window that holds the keyboard and closes the others. <!-- cond: cond-2609111105370656 -->
  `C-x 0` closes the window that holds the keyboard and gives its space to its
  sibling; with one window it refuses and says so, as Emacs does.
- Windows are resizable by pointer, and by keyboard: `C-x {` narrows the <!-- cond: cond-2609111105372554 -->
  window that holds the keyboard, `C-x }` widens it, and `C-x ^` makes it
  taller.
  (Amended 2026-09-12. As first written this condition read "Windows are
  resizable by pointer. A keyboard vocabulary for resizing (`C-x {`, `C-x }`,
  `C-x ^`) is out of scope and is not bound." That pulled against this intent's
  own assistive-technology criterion, which asks for the feature to be operable
  without sight; the maintainer settled it by binding the chords rather than by
  narrowing the criterion to the windows alone.)
- Undo is per window, not per chapter. `history()` is a `StateField` and a <!-- cond: cond-2609120405528253 -->
  `StateField` lives in one state, which the amended mechanism gives each window
  its own of; so an undo in a window that did not make the edit does nothing.
  Settled by the maintainer on 2026-09-12 in preference to routing every undo
  chord through an app-held canonical state, which is larger than the rest of
  this design and cuts across `adr-2609092000099546`'s rule that one undo takes
  a keystroke and its table realignment back together. A real divergence from
  Emacs, confusing the first time and never destructive.

## Acceptance Criteria

- Given one editing window with the caret in a chapter, when Alice presses
  `C-x 3`, then the area divides left and right, both windows show that
  chapter, the keyboard stays in the window she was in, and the caret has not
  moved.
- Given one editing window, when Alice presses `C-x 2`, then the area divides
  above and below with the same guarantees.
- Given two windows on the same chapter, when Alice types in one, then the
  text appears in both in the same frame, and the other window's caret keeps
  its own position rather than jumping to hers.
- Given two windows on the same chapter at different positions, when Alice
  moves between them with `C-x o`, then each window restores the position it
  had, independently of the other.
- Given two windows, when Alice opens a different chapter in one, then the
  other window is untouched and still shows what it showed.
- Given several windows showing different chapters, when Alice presses
  `C-x C-s`, then the chapter in the window holding the keyboard is saved and
  no other file is written.
- Given a split window, when Alice presses `C-x 3` again inside one half, then
  that half divides again — a split is itself splittable, to any depth.
- Given three windows with the keyboard in the second, when Alice presses
  `C-x 1`, then that window remains alone, the other two close, and nothing in
  the document is changed or saved.
- Given three windows with the keyboard in the second, when Alice presses
  `C-x 0`, then that window closes, its space goes to the rest, and the
  keyboard moves to an adjacent window.
- Given exactly one editing window, when Alice presses `C-x 0`, then nothing
  closes and the modeline says so.
- Given two editing windows and a sidebar with rows shown, when Alice presses
  `C-x o` repeatedly from the first window, then the keyboard visits the second
  window, then the sidebar, then back to the first — the editing leaves in
  reading order, then the sidebar, then any open panel.
- Given two editing windows, when Alice presses `C-n`, then exactly one window
  moves its cursor, and the modeline names the window that has the keyboard.
- Given the keys panel open, when it is read, then rows for `C-x 2`, `C-x 3`,
  `C-x 0` and `C-x 1` are listed with their labels.
- Given a window holding unsaved edits, when Alice closes it with `C-x 0`, then
  the edits are not lost — the chapter's state outlives the window that showed
  it, exactly as a buffer outlives a window in Emacs.
- Given two windows side by side, when Alice presses `C-x }`, then the window
  holding the keyboard grows and its sibling shrinks by the same amount, and no
  window is reduced below a usable minimum.
- Given two windows side by side, when Alice presses `C-x {`, then the window
  holding the keyboard shrinks and its sibling grows.
- Given two windows stacked above and below, when Alice presses `C-x ^`, then
  the window holding the keyboard grows taller and its sibling shorter.
- Given exactly one editing window, when Alice presses `C-x {`, `C-x }` or
  `C-x ^`, then nothing resizes and the modeline says so.
- Given two windows on one chapter and an edit made in the first, when Alice
  presses `C-/` in the second, then nothing is undone there — undo is per
  window — and pressing `C-/` in the first undoes the edit in both.
- Inherited: one source, always — one window tree, one document state per open
  chapter, and the focused window asked for in the one place it already lives;
  legible on three device classes — splitting is available at 1280 and 820 CSS
  pixels, and at 390 the area is too narrow to divide left and right, and
  `C-x 3` says so rather than producing unusable slivers, while `C-x 2` still
  divides above and below whenever the area is tall enough for two usable
  windows; reachable by assistive technology — each window is announced as a
  region with the chapter it shows, and the focused window is discoverable
  without sight.
  (Amended 2026-09-15. As first written this clause read "at 390 the area is
  too narrow to divide and the chords say so rather than producing unusable
  slivers", which promised that both chords refuse at that width. The
  delivered code refuses only the left-and-right division there, because
  width is no reason to refuse a division above and below — Emacs's own rule,
  where `window-min-height` governs `split-window-below` and the frame's
  width does not — and the maintainer settled on the shipped behaviour on
  2026-09-15 against iss-2609150822523982. The ac-20 verdict and the
  "diverged" gap entry under Audit Notes predate this amendment and read the
  original clause; against the clause as it now stands that divergence is
  closed. `docs/how-to-split-the-editing-area.md` describes the shipped
  behaviour.)

## Open Questions

_None recorded yet._

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-5f2926b8827f -->
Fidelity review — receipt rcp-5f2926b8827f (verifier abcd:intent-auditor claude-opus-5[1m]).

Provenance: abcd:intent-auditor@claude-opus-5[1m] · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:8a3759351012cb8b81c6a57e00bdcb4dc9c05ff73c39a17b15be77e26c551074
Input attestations: diff:298366a^..a82e1d1 -- src/ docs/ (merged as 1b6977d)@sha256:2cfb59f241f5a99d1543095f0052e98366fd833d12b835aa86b1b9a0ec8ec6f1; test-run:npx vitest run src/windows.test.ts src/window-grid.test.ts src/focus.test.ts src/document.test.ts src/emacs-keys.test.ts@-; manual-acceptance:.abcd/.work.local/logs/acceptance/spc-2609111105376860.md@-;

Acceptance rollup: MET 13 · MET_WITH_CONCERNS 1 · NOT_MET 0 · INCONCLUSIVE 6

Per-criterion verdicts:
- ac-1 — INCONCLUSIVE: Three of the four clauses are demonstrated - both windows show the chapter, the keyboard and the caret stay put - but 'the area divides left and right' is drawn geometry that no engine in this run produced: jsdom measures every element at nought, the division is only a data-direction attribute plus a CSS rule, and all 13 rows of M42-1 are unticked
  evidence: src/style.css:460 — ".window-split[data-direction="columns"] {"
  evidence: src/document.test.ts:1169 — "it("keeps the caret and the keyboard in the window that divided""
  evidence: .abcd/.work.local/logs/acceptance/spc-2609111105376860.md:29 — "- [ ] One window, caret mid-chapter. `C-x 3`: the area divides left and right"
- ac-2 — INCONCLUSIVE: Same shape as ac-1: the rows direction, both texts and the caret are proven in the harness, but 'divides above and below' is geometry, and the manual row that would witness it is unticked
  evidence: src/document.test.ts:1137 — "it("divides above and below with the same guarantees""
  evidence: src/style.css:464 — ".window-split[data-direction="rows"] {"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609111105376860.md:38 — "- [ ] `C-x 1`, then `C-x 2`: the area divides above and below, equal heights"
- ac-3 — MET: The echo is dispatched synchronously inside the originating view's own dispatch and carries no selection, so the peer's caret is mapped through the change rather than moved to the typist's; both halves are exercised
  evidence: src/editor.ts:453 — "peer.dispatch({ changes: transaction.changes,"
  evidence: src/document.test.ts:1207 — "it("shows an edit made in one window in the other in the same transaction""
  evidence: src/document.test.ts:1218 — "it("keeps the other window's caret where it was when Alice types""
- ac-4 — MET: Each window carries its own points map keyed by chapter and writes to it on leaving a buffer, and the test moves the keyboard between two windows on one chapter and reads both positions back
  evidence: src/app.ts:872 — "held.points.set(held.buffer, head);"
  evidence: src/document.test.ts:1235 — "it("restores each window's own position when the keyboard moves between them""
- ac-5 — MET: showBuffer acts on one EditorWindow record and touches no other window's view; the test opens a different chapter in one window and asserts the other is unchanged
  evidence: src/app.ts:891 — "function showBuffer("
  evidence: src/document.test.ts:1270 — "it("leaves the other window untouched when a chapter is opened in one""
- ac-6 — MET: save() resolves its target through bufferHere(), which is the buffer of the window holding the keyboard, and two tests assert one file is written and it is that window's - including when the row is reached from M-x and the prefix overlay
  evidence: src/app.ts:2122 — "const buffer = bufferHere();"
  evidence: src/document.test.ts:1285 — "it("saves the chapter in the window holding the keyboard and writes no other file""
  evidence: src/document.test.ts:1307 — "it("saves the focused window's chapter however the row was reached""
- ac-7 — MET_WITH_CONCERNS: The tree nests without limit and the chord divides the half holding the keyboard rather than the whole area; the concern is that depth is bounded in the shipped app by the width floor, so 'to any depth' is a property of the data structure and not of the chord, and the four-quarters row that would show the real bound is unticked
  evidence: src/windows.test.ts:85 — "it("nests a split inside a split, to any depth""
  evidence: src/focus.test.ts:1856 — "it("divides the half that holds the keyboard and not the whole area""
  evidence: src/windows.ts:422 — "return extent >= floor * 2 + DIVIDER_PX;"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609111105376860.md:45 — "- [ ] `C-x 1`, then `C-x 3` twice: two levels of left-and-right division"
- ac-8 — MET: closeOtherWindows returns a bare leaf of the kept window, and the test presses the chord from the middle of three and asserts no text changed and no file was written
  evidence: src/windows.ts:251 — "export function closeOtherWindows("
  evidence: src/document.test.ts:1331 — "it("changes and saves nothing when the other windows close""
- ac-9 — MET: heirOf is read before the shape changes and names the neighbour on the side that receives the space, withoutShare gives the departing share to the rest in proportion, and the test asserts the keyboard lands on the adjacent window and not on the first leaf
  evidence: src/app.ts:954 — "const heir = heirOf(windowTree, leaving);"
  evidence: src/windows.ts:150 — "function withoutShare("
  evidence: src/focus.test.ts:1898 — "it("moves the keyboard to the window that took the space, not to the first window""
- ac-10 — MET: closeWindow on a bare leaf returns the refusal 'This is the only window' and the application announces it in the modeline; asserted through the chord
  evidence: src/windows.ts:201 — "tree.id === at ? "This is the only window" : "No such window""
  evidence: src/focus.test.ts:1935 — "it("says so rather than closing the only window""
- ac-11 — MET: PANE_ORDER keeps its three literals and the editor slot became the tree's leaves in reading order; both the walk and its named falsifier are tested
  evidence: src/focus.ts:72 — "export const PANE_ORDER: readonly Pane[] = ["editor", "sidebar", "panel"];"
  evidence: src/focus.test.ts:1946 — "it("walks the editing windows in reading order, then the sidebar, then the panel""
  evidence: src/focus.test.ts:1974 — "it("never visits the sidebar before a second editing window that is shown""
- ac-12 — MET: Exactly one window answers a chord, and the modeline's pane cell carries the focused window's ordinal of the leaf count, written from refresh on every transaction
  evidence: src/focus.test.ts:1988 — "it("answers a chord in exactly one editing window""
  evidence: src/app.ts:787 — "window: { at: leaves.indexOf(held.id) + 1, of: leaves.length },"
  evidence: src/modeline.ts:315 — "at && at.of > 1 ? `[${pane} ${String(at.at)}/${String(at.of)}]` : `[${pane}]`"
- ac-13 — MET: Four rows for C-x 2, C-x 3, C-x 0 and C-x 1 are in the binding table with their labels under the Panes group, and the keys panel test reads them back out of the rendered overlay
  evidence: src/keys.ts:890 — "id: "split-window-below","
  evidence: src/keyspanel.test.ts:225 — "it("lists the seven window chords with their labels""
- ac-14 — MET: leaveBuffer moves the text from the view into the buffer when the last window on it goes, so a closed window's unsaved edits rest in the buffer; the test closes a window with unsaved edits and reads them back
  evidence: src/app.ts:878 — "if (buffer.windows.size === 0) buffer.restingText = documentText(held.view);"
  evidence: src/document.test.ts:1351 — "it("keeps a chapter's unsaved edits when the window showing it closes""
- ac-15 — INCONCLUSIVE: stepShares moves exactly one step from the yielding child to the growing one and the drawn shares are asserted at 0.55/0.45, but 'grows', 'shrinks' and 'no window below a usable minimum' are pixel claims: under jsdom floorShare returns null for an unmeasured extent so no floor is applied on the chord's path in the harness, and every M42-8 resize row is unticked
  evidence: src/windows.ts:388 — "export function stepShares("
  evidence: src/focus.test.ts:2055 — "it("widens the window holding the keyboard and no other""
  evidence: src/windows.ts:430 — "if (extent <= 0) return null;"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609111105376860.md:1 — "Manual acceptance: Split the editing area, the same as Emacs"
- ac-16 — INCONCLUSIVE: The symmetric case is proven in shares - 0.45/0.55 on the drawn root split - but the criterion's observable outcome is a window drawn narrower and its sibling wider, which nothing in this run rendered and no manual row has witnessed
  evidence: src/focus.test.ts:2066 — "it("narrows the window holding the keyboard and no other""
  evidence: src/windows.ts:362 — "const neighbour = branch + 1 < node.children.length ? branch + 1 : branch - 1;"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609111105376860.md:1 — "Manual acceptance: Split the editing area, the same as Emacs"
- ac-17 — INCONCLUSIVE: resizeTarget walks to the nearest rows ancestor and the shares move 0.55/0.45 in a stacked layout, but 'grows taller' and 'its sibling shorter' are drawn heights; jsdom measures every split at nought and the manual rows are unticked
  evidence: src/focus.test.ts:2075 — "it("makes the window holding the keyboard taller and no other""
  evidence: src/windows.ts:349 — "export function resizeTarget("
  evidence: src/window-grid.ts:64 — "export function measureSplit("
- ac-18 — MET: With one window resizeTarget returns null on both axes and the chord announces 'No window beside this one' or 'No window above or below this one'; nothing is written to the tree on that path, and both refusals are asserted through the chord with exactly one window
  evidence: src/app.ts:1013 — "if (target === null) {"
  evidence: src/focus.test.ts:2087 — "it("says there is no window beside this one""
  evidence: src/focus.test.ts:2097 — "it("says there is no window above or below this one""
- ac-19 — MET: The echo carries Transaction.addToHistory.of(false), so a peer's history records no undoable event for a foreign change, and both halves of the criterion are exercised - nothing undone in the window that did not edit, and the edit undone in both when the window that made it undoes
  evidence: src/editor.ts:455 — "annotations: [echoed.of(true), Transaction.addToHistory.of(false)],"
  evidence: src/document.test.ts:1507 — "it("undoes nothing in the window that did not make the edit""
  evidence: src/document.test.ts:1524 — "it("undoes in both windows when the window that made the edit undoes""
- ac-20 — INCONCLUSIVE: The single-source half is demonstrable - one tree, one buffer per chapter, the focused window asked for in focus.ts - and each window is a role=region with an aria-label naming its chapter, but the three device widths and 'reachable by assistive technology' are exactly what jsdom cannot answer and all 81 manual rows are unticked; the record is further at odds with the code at 390, where mayDivide(390, "rows") is asserted true, so C-x 2 divides there rather than saying so
  evidence: src/app.ts:528 — "element.setAttribute("role", "region");"
  evidence: src/app.ts:772 — "if (held.element.getAttribute("aria-label") !== label)"
  evidence: src/windows.test.ts:268 — "expect(mayDivide(390, "rows")).toBe(true);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609111105376860.md:20 — "Half of this feature is geometry and jsdom has none"

Gap audit:
- honoured:
  - The pane cycle generalises without changing its rule: editor leaves in reading order, then the sidebar, then the panel
    evidence: src/focus.ts:72 — "export const PANE_ORDER: readonly Pane[] = ["editor", "sidebar", "panel"];"
    evidence: src/focus.test.ts:1974 — "it("never visits the sidebar before a second editing window that is shown""
  - A chapter is a buffer the application holds, with zero or more windows looking at it, so a window closes without losing the edits in it
    evidence: src/app.ts:335 — "interface ChapterBuffer {"
    evidence: src/document.test.ts:1351 — "it("keeps a chapter's unsaved edits when the window showing it closes""
  - C-x C-s writes the chapter of the window holding the keyboard and no other file - the falsifier the intent calls the worst a text editor can have
    evidence: src/app.ts:2122 — "const buffer = bufferHere();"
    evidence: src/document.test.ts:1285 — "it("saves the chapter in the window holding the keyboard and writes no other file""
  - Two windows on one chapter never diverge: no selection travels with the echo and the library's own length guard is kept armed in shipped code
    evidence: src/editor.ts:464 — "if (peer.state.doc.length !== view.state.doc.length)"
    evidence: src/document.test.ts:976 — "it("keeps the two windows' text equal through a run of edits""
  - The amended resize scope condition is delivered rather than narrowed away: all three chords are bound, and pointer drag and chord end in the same stepShares and the same floor
    evidence: src/app.ts:1647 — "resizeHere("columns", false);"
    evidence: src/window-grid.ts:161 — "const next = stepShares(began, target, Math.abs(fraction), floor);"
  - The feature is documented as one how-to page in the present tense, including the per-window undo divergence the intent settled
    evidence: docs/how-to-split-the-editing-area.md:62 — "**Undo is per window.** This is the one place Editor diverges from Emacs"
- diverged:
  - The intent's fifth scope condition still reads 'Two windows showing one chapter share one document state' while the delivered code gives every window its own EditorState kept in lockstep. The Mechanism paragraph and adr-2609091832455881's decision 2 were amended in place; this condition's prose was not, so the record reads false against the tree
    evidence: .abcd/development/intents/shipped/itd-2609081931493520-build-multiple-windows-in-editor-the-same-as-emacs-split-the.md:108 — "Two windows showing one chapter share one document state"
    evidence: src/editor.ts:395 — "Two windows on one chapter hold two states that agree on their text"
  - ac-20 promises that at 390 CSS pixels 'the area is too narrow to divide and the chords say so'. Only the left-and-right chord refuses there: mayDivide(390, "rows") is true, so C-x 2 divides at that width whenever the area is 326 pixels tall. The how-to page documents the delivered behaviour rather than the promised one
    evidence: src/windows.test.ts:268 — "expect(mayDivide(390, "rows")).toBe(true);"
    evidence: docs/how-to-split-the-editing-area.md:22 — "the area divides above and below once and never left and right"
  - ac-15's 'its sibling shrinks by the same amount' holds for the two-window case it names, but in a grid the chord moves a whole column: resizeTarget walks up to the nearest ancestor split on the chord's axis, so widening a bottom-left window widens the one above it too. A deliberate Emacs fidelity, documented, and wider than the criterion's wording
    evidence: src/windows.ts:357 — "for (let depth = descent.nodes.length - 2; depth >= 0; depth -= 1)"
    evidence: docs/how-to-split-the-editing-area.md:101 — "**In a grid, the widening chords move a whole column.**"
  - The delivery carries work the intent never promises: the drop router was rebuilt to resolve a window from the pointer and a paste from the keyboard, and the open-another-document path now asks about dirty buffers outside the focused window and is documented. Both follow from the buffer model but neither answers a criterion
    evidence: src/drop-target.ts:47 — "export interface DropWindow {"
    evidence: docs/how-to-open-a-file-or-a-folder.md:41 — "## Unsaved edits"
  - The keys panel carries seven window rows where ac-13 asks for four, and a successful resize speaks - 'Window 2 of 4: 45%' - where every other successful row in the table is silent. Both are defensible under the assistive-technology clause and neither was asked for
    evidence: src/keys.ts:919 — "id: "shrink-window-horizontally","
    evidence: src/app.ts:1036 — "announceBriefly("
- missing:
  - No part of the feature has been operated by a human. All 81 rows of the manual acceptance log are unticked, and that log is the only proof of the grid, the refusal at 390, the drag, the keyboard resize in pixels, the reshape and what a screen reader hears - by its own statement
    evidence: .abcd/.work.local/logs/acceptance/spc-2609111105376860.md:20 — "Half of this feature is geometry and jsdom has none, so the rows below are not a supplement to the automated run"
  - The usable-minimum floor on the chord path is unproven end to end: stepShares is unit-tested with an explicit floor, but in the running harness floorShare returns null for an unmeasured extent, so nothing clamps a chord-driven step there and the real clamp has never been exercised
    evidence: src/windows.ts:430 — "if (extent <= 0) return null;"
    evidence: src/app.ts:1026 — "const floor = floorShare(measureSplit(editorPane, target.split, axis), axis);"

Scope-condition dispositions:
- cond-2609111105374926 — untested: The population is Alice editing in the desktop app; the whole automated run is jsdom and not one manual acceptance row has been ticked, so nothing has exercised or contradicted it
- cond-2609111105372066 — survived: The substantive assumption - divisions inside the one frame, no second operating-system window - holds by construction: the grid is drawn into the editing pane and nothing in src/ touches a window-creation API
  evidence: src/window-grid.ts:233 — "host.replaceChildren(root);"
  evidence: src/window-grid.ts:222 — "The host is `.editor-pane`, which stops being the editing surface and becomes the grid's own root."
- cond-2609111105374684 — narrowed: The tree nests in either direction without limit and C-x 2 and C-x 3 map to rows and columns as the condition says, but the chord that builds it refuses below a measured floor
  narrowing: Holds without limit in the data structure; the chord that reaches it is bounded by 2 x 240 + 6 CSS pixels across and 2 x 160 + 6 down, so achievable depth is a function of the area's size, and it is unbounded in jsdom only because an unmeasured extent is treated as permission to divide
  evidence: src/windows.test.ts:85 — "it("nests a split inside a split, to any depth""
  evidence: src/windows.ts:422 — "return extent >= floor * 2 + DIVIDER_PX;"
  evidence: src/windows.ts:420 — "if (extent <= 0) return true;"
- cond-2609111105377260 — survived: The sidebar and the panel keep their own slots in the three-literal cycle and never enter the tree: only window ids are leaves, and the grid's host holds nothing else
  evidence: src/focus.ts:72 — "export const PANE_ORDER: readonly Pane[] = ["editor", "sidebar", "panel"];"
  evidence: src/windows.ts:87 — "export function leafIds(tree: WindowTree): readonly WindowId[] {"
  evidence: docs/how-to-split-the-editing-area.md:119 — "The sidebar and any open panel are docked beside the editing area, not inside it."
- cond-2609111105378478 — falsified: The condition assumed two windows on one chapter share one document state; what was delivered is the opposite - each window holds its own EditorState, kept in lockstep by a synchronous annotated echo of the change set. The observable half of the condition survives and the two-independent-copies refusal survives, but the assumption itself was falsified before code was written and this condition's prose was never amended to match the Mechanism paragraph and adr decision 2
  evidence: src/editor.ts:395 — "Two windows on one chapter hold two states that agree on their text"
  evidence: src/editor.ts:451 — "for (const peer of peers()) {"
  evidence: .abcd/development/intents/shipped/itd-2609081931493520-build-multiple-windows-in-editor-the-same-as-emacs-split-the.md:66 — "**Falsified 2026-09-12, before any code was written.**"
- cond-2609111105374579 — survived: Emacs's pair is built as the condition describes: each window carries a points map keyed by chapter, and the buffer keeps a lastPoint for a window opening it fresh
  evidence: src/app.ts:872 — "held.points.set(held.buffer, head);"
  evidence: src/app.ts:873 — "buffer.lastPoint = head;"
  evidence: src/document.test.ts:1252 — "it("opens a chapter at this window's own remembered position, not another window's""
- cond-2609111105377511 — survived: The registry's actions resolve through here(), the window holding the keyboard, rather than through a module-level current chapter; save is the case with a file at stake and it is tested from three entry points
  evidence: src/app.ts:570 — "function view(): EditorView {"
  evidence: src/app.ts:575 — "function bufferHere(): ChapterBuffer {"
  evidence: src/document.test.ts:1307 — "it("saves the focused window's chapter however the row was reached""
- cond-2609111105374227 — survived: C-x o moves the keyboard among existing leaves and changes nothing shown, and the four layout chords are the only rows bound to divideHere, closeHere and closeOthersHere
  evidence: src/app.ts:1635 — "divideHere("rows");"
  evidence: src/app.ts:1641 — "closeHere();"
  evidence: src/focus.test.ts:1946 — "it("walks the editing windows in reading order, then the sidebar, then the panel""
- cond-2609111105370656 — survived: C-x 1 collapses the tree to the kept leaf, C-x 0 removes one leaf and renormalises the rest, and closing the only window refuses in the modeline as Emacs does
  evidence: src/windows.ts:194 — "export function closeWindow(tree: WindowTree, at: WindowId): TreeChange {"
  evidence: src/windows.ts:258 — "const closed = leafIds(tree).filter((id) => id !== keep);"
  evidence: src/focus.test.ts:1935 — "it("says so rather than closing the only window""
- cond-2609111105372554 — survived: Taking the amended text as binding: all three chords are bound and tested, and the pointer route exists alongside them - both ending in the same stepShares and the same floor, so the two cannot disagree
  evidence: src/app.ts:1005 — "function resizeHere(axis: "rows" | "columns", widen: boolean): void {"
  evidence: src/window-grid.ts:95 — "function divider("
  evidence: src/window-grid.test.ts:228 — "it("stops at the floor rather than making a sliver", () => {"
- cond-2609120405528253 — survived: The echo adds nothing to the receiving window's history, which is exactly the settled divergence: an undo in a window that did not make the edit does nothing, and the how-to page warns about it in the same change
  evidence: src/editor.ts:455 — "Transaction.addToHistory.of(false)"
  evidence: src/document.test.ts:1507 — "it("undoes nothing in the window that did not make the edit""
  evidence: docs/how-to-split-the-editing-area.md:62 — "**Undo is per window.**"
## Grounds

- pursued: the pane cycle's first slot becomes plural while its rule stays intact, and two windows on one chapter are two CodeMirror views over one shared EditorState, which is what makes a split a split rather than two copies; wrong if an edit in one window fails to appear in the other, if a window's caret jumps to the typing window's position, or if C-x C-s ever writes the chapter of a window that does not hold the keyboard
