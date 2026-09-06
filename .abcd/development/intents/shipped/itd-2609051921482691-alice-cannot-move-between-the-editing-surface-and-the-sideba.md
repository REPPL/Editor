---
id: itd-2609051921482691
slug: alice-cannot-move-between-the-editing-surface-and-the-sideba
spec_id: spc-2609051925374395
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609051921384677
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Move between the editor and the sidebar without the mouse

## Press Release

Alice is three paragraphs into a chapter and wants the section before it.
Her hands stay on the keys. She presses `C-x o`; the text lets go of the
keyboard, the sidebar takes it, and the modeline at the foot of the window
says so by naming the pane that has focus. The node for the chapter she is
in is already highlighted, so she starts from where she is. `C-n` and `C-p`
walk down and up the tree — Parts, Chapters, Sections, Sub-sections,
Sub-sub-sections, in the order the sidebar shows them. `C-f` opens a closed
node and `C-b` closes an open one; Right and Left do the same, for the
times her hand is already there. Nothing opens while she is only looking.

When she reaches the heading she wants, Return opens that chapter scrolled
to that heading and hands the keyboard straight back to the text, with the
cursor on the heading, ready to type. If she changes her mind, `C-g` puts
her back in the text with nothing opened and her cursor where she left it,
and a second `C-x o` does the same. She has not touched the mouse, and she
has not learnt a new key: `C-x o` is the chord she has pressed to change
window for twenty years, and `C-n`, `C-p`, `C-f`, `C-b`, Return and `C-g`
are the chords she is already using in the text.

The same vocabulary reaches everything else that can hold the keyboard.
With the keys panel open, `C-x o` cycles the editor, the sidebar and the
keys panel in that fixed order and back to the editor; with the insert
palette, the publish panel or settings open, that panel takes the third
place instead. Wherever the keyboard is, the modeline names the pane that
has it, so Alice never has to press a key to find out where she is. Every
chord in the flow is a row in the binding table, listed with its label in
the keys panel like every other action, and one cancel chord still cancels
anything.

On a narrow window the sidebar is a drawer rather than a column, and the
flow does not change: `C-x o` slides the drawer open and gives it the
keyboard, the tree moves under the same chords, Return opens the chapter
and closes the drawer behind it, and `C-g` closes it having changed
nothing.

## Why This Matters

Today the sidebar is reachable only by pointing at it, so the one part of
the app that knows the shape of the whole book is the one part Alice
cannot reach from the keyboard. Every jump between chapters breaks a
sentence: hand off the keys, find the pointer, aim at a row, come back and
find the cursor again. For a writer who edits by chord all day that is not
a small friction but a change of posture, repeated hundreds of times a
sitting, and it makes the sidebar feel like someone else's application
bolted to the side of the editor rather than another window of the same
one.

## Mechanism

We expect Alice to use this without being taught it because the chords are
not new: `C-x o` already means "other window" in the editor she comes
from, and the movement, open and cancel chords are the ones the editing
surface answers in the text. The brief already commits to porting the
Emacs bindings into the editing surface
([`02-constraints.md`](../../brief/02-constraints.md), Editor), so this
intent adds destinations for a vocabulary Alice has, not a vocabulary to
learn.

We expect this to cost rows in a table rather than a second navigation
system because the keyboard-navigation prototype already works this way:
its overlays own the keyboard while they are open and move with the same
`C-n` and `C-p` as the main view
(`../../research/notes/2026-09-05-prototype-keyboard-navigation.md`).
The binding table is declared as data — id, label, chords, read by the keys
panel, the tooltips and the tests
([`05-internals.md`](../../brief/05-internals.md) section 5) — so the
sidebar and each panel become further readers of the one table, and
[`03-evidence.md`](../../brief/03-evidence.md) records that shape as
proven prior art.

We expect the same chord to mean two things without collision because
focus is single and exclusive: `C-n` is answered by whichever pane holds
the keyboard, so it is next line in the text and next node in the tree, and
never both. This is falsifiable in the ugliest direction: if a sidebar
chord ever fires while the cursor is in the text, or a keystroke leaks into
the chapter while the tree has focus, the mechanism is wrong.

We expect Alice to trust where she is because the modeline is already
where she looks for state — it carries the unsaved-changes mark, her
position in the chapter and the live prefix state
([`04-surfaces.md`](../../brief/04-surfaces.md), Editing and Keys, help,
and cancel) — so naming the focused pane there adds a word to a line she
reads rather than a new indicator to notice.

We expect the prefix half of `C-x o` to survive in the web view because
that is precisely what the delivery spike answers before any product code
runs ([`06-delivery.md`](../../brief/06-delivery.md)), and because the
prototype shows real prefix keys working inside a text field. If the spike
finds that the platform takes `C-x`, this moment fails visibly at its first
keystroke rather than degrading quietly, and the shell's claim on that
combination becomes its precondition.

## Scope Conditions

- Platform: the desktop app — the Tauri 2 shell with the system web view — <!-- cond: cond-2609051925377283 -->
  on macOS, which is where the shell can claim key combinations back from
  the platform. The tablet path, where there is no shell to claim
  anything, is out.
- Population: Alice, the maintainer, editing a document she has open. <!-- cond: cond-2609051925378745 -->
  Nothing here is seen by a reader of a published rendering.
- Assumption: the binding table exists and the spike has settled what <!-- cond: cond-2609051925379060 -->
  "full Emacs bindings" means, since every chord here is a row in that
  table rather than a chord of its own invention.
- Widths: the flow holds at 1280, 820 and 390 CSS pixels, with the sidebar <!-- cond: cond-2609051925372330 -->
  as a column at the widest and as a drawer at the narrower two.
- Boundary with intent 1, *Open a folder and see the book* <!-- cond: cond-2609051925372563 -->
  (`itd-2609051335399446`): 1 owns the sidebar itself — the tree drawn
  from the file system, its Parts, Chapters and heading levels, its
  badges, and what opens when a node is clicked. This intent adds no node,
  no badge and no ordering; it owns only reaching that tree from the
  keyboard, moving in it, and getting back. Where a click and Return must
  agree — a heading node opening its chapter scrolled to that heading —
  the behaviour is 1's and this intent inherits it.
- Boundary with intent 2, *Edit with the Emacs bindings I already know* <!-- cond: cond-2609051925374969 -->
  (`itd-2609051335406422`): 2 owns the binding table's shape, the keys
  panel, the tooltips, the prefix-key state and the one-cancel-chord
  contract. This intent owns no part of that machinery; it registers rows
  in the table 2 defines and reuses 2's cancel contract for `C-g`. The
  chords the *text* answers are 2's; the chords the sidebar and the panels
  answer are this intent's.
- Boundary with intent 26, *Move through the article by keyboard* <!-- cond: cond-2609051925377047 -->
  (`itd-2609051402083398`): 26 owns keyboard movement inside a reading
  view — the published article and what it shares with the editor's
  vocabulary. This intent stops at the app's own chrome and never reaches
  a rendering.
- Boundary with intent 3, *Insert a construct I cannot remember*: 3 owns <!-- cond: cond-2609051925377969 -->
  the palette's entries and what each one inserts at the cursor. This
  intent owns only that the palette is one of the panes `C-x o` reaches
  and leaves, in the same order as any other panel.

## Acceptance Criteria

- Given a chapter open with the cursor in the text, when Alice presses
  `C-x o`, then focus moves to the sidebar, the node for the open chapter
  is the highlighted one, and the modeline names the sidebar as the pane
  holding the keyboard.
- Given focus in the sidebar on a collapsed Part, when Alice presses `C-n`,
  `C-p`, `C-f` and `C-b`, and again with Down, Up, Right and Left, then the
  selection moves through the tree and the node expands and collapses, no
  chapter is opened, and the text of the open chapter is unchanged byte for
  byte.
- Given focus in the sidebar on a Sub-section node, when Alice presses
  Return, then that chapter opens scrolled to that heading, focus returns
  to the editing surface with the cursor on the heading, and the modeline
  names the editor.
- Given focus in the sidebar with a node selected, when Alice presses `C-g`,
  and again in a fresh run with `C-x o` and no panel open, then focus
  returns to the editing surface with no chapter opened and the cursor
  where she left it.
- Given the publish panel or settings open, when Alice presses `C-x o`
  three times from the editor, then focus visits the sidebar, then that
  panel, then the editor, in that order every time, with the modeline
  naming each, because a registered panel cycled away from stays open.
  Given the keys panel or the insert palette open instead, when Alice
  presses `C-x o` twice from the editor, then focus visits the sidebar and
  then the editor, and the overlay itself has closed rather than waiting
  in a third place: a modal overlay is closed the moment the keyboard
  leaves it, so its cycle is editor, sidebar, editor rather than the
  three-step cycle a registered panel holds. (Negative case: a third press
  finding the overlay still open and holding the third place, rather than
  the editor, fails this criterion.)
- Given the cursor in the editing text, when Alice presses `C-n`, `C-p`,
  `C-f`, `C-b` or Return, then the editing surface's own actions run and no
  sidebar node moves, expands, collapses or opens; and given focus in the
  sidebar, when she types printable characters, then nothing is inserted
  into the chapter and no chord of the editing surface fires.
- Given the binding table and the keys panel opened from its own chord,
  when the panel is read, then every chord this flow answers — the focus
  cycle, tree movement, expand, collapse, open, and cancel — appears as a
  row with an id, a label and its chords; and no chord the sidebar or a
  panel answers is absent from the table, and no row this intent adds is
  answered by nothing.
- Given the window at 820 CSS pixels, where the sidebar is a drawer, when
  Alice runs the whole flow from `C-x o` through movement and expansion to
  Return and to `C-g`, then the drawer opens with the keyboard, behaves as
  above, closes on Return and on cancel, nothing scrolls horizontally, and
  no step requires the pointer.
- Inherits: round-trip byte-fidelity; no machine in the document; one
  source, always; degrade gracefully in a plain tool; legible on three
  device classes; network only on publish.

## Open Questions

From [`03-evidence.md`](../../brief/03-evidence.md), Editor: which key
combinations macOS and the web view take before the editor sees them, and
which of those the shell can claim back — `C-x` as a prefix is the one this
moment cannot do without. Also open there: whether individual chords in the
table are rebindable and persisted, which decides whether the rows this
intent adds are Alice's to change. And from the same chapter, Document
model and canon: whether the sidebar edits structure — dragging a chapter
between Parts — or whether structure edits stay in the file system for the
first release; if it does, that gesture needs a chord and this vocabulary
is where it would sit.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-07cbd79aadbf -->
Fidelity review — receipt rcp-07cbd79aadbf (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:6277de53164b641aa44a1787a24f462003721c64e790b5a29397fee697cb3fc1
Input attestations: diff:052d3dc..HEAD (c15eda3); src/focus.ts and src/focus.test.ts were created in 052d3dc itself, which the half-open range excludes, so the code was judged at HEAD as instructed@sha256:e0800f0581f9c33b73a00ad17116b33b2b974f9c28dddf51e5a75fee21008dab; intent:.abcd/development/intents/shipped/itd-2609051921482691-alice-cannot-move-between-the-editing-surface-and-the-sideba.md@-; spec:.abcd/development/specs/closed/spc-2609051925374395-alice-cannot-move-between-the-editing-surface-and-the-sideba.md@-; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609051925374395.md (every row unticked)@-; test-run:npx vitest run src/focus.test.ts src/emacs-keys.test.ts at c15eda3: 2 files, 129 passed@-;

Acceptance rollup: MET 4 · MET_WITH_CONCERNS 3 · NOT_MET 1 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: C-x o from the content DOM moves the pane to sidebar, the nav takes DOM focus, the cursor ring lands on the open chapter's row (chapter:ALICE_PATH, marked row text contains 'Alice'), and the modeline reads [Sidebar]; takeFocus starts the cursor on the selected chapter via revealSelected and the modeline pane cell is fed from focus.label.
  evidence: src/focus.test.ts:366-381 — "expect(press(app, "C-x o")).toBe(true); ... expect(cursorRow(app)).toBe(`chapter:${ALICE_PATH}`); ... expect(modeline(app)).toContain("[Sidebar]");"
  evidence: src/sidebar.ts:601-621 — "const start = revealSelected(); ... element.tabIndex = -1; element.focus(); paintCursor();"
  evidence: src/app.ts:284-285 — "pane: focus.label, prefix: focus.prefix,"
  evidence: src/modeline.ts:112-114 — "const pane = context.pane ?? "Editor"; paneCell.textContent = `[${pane}]`;"
- ac-2 — MET_WITH_CONCERNS: C-n/C-p and Down/Up walk the flat row list and clamp at the ends; C-f/C-b and Right/Left expand and collapse without moving the cursor; chapterPath stays ALICE and the text is byte-equal, and the hazardous fixture survives every sidebar chord twice round with a save that writes the identical bytes. Concern: the criterion's Given is a collapsed Part, and no test starts on one — expand/collapse is exercised on a Chapter row; expandAtCursor is generic over row.expandable so a Part takes the same path, but that path is untested for the Part case.
  evidence: src/focus.test.ts:576-594 — "expect(press(app, "C-n")).toBe(true); ... expect(press(app, "Down")).toBe(true); ... expect(app.sidebar.cursor).toBe(app.sidebar.rows().length - 1); ... expect(documentText(app.view)).toBe(ALICE);"
  evidence: src/focus.test.ts:603-633 — "expect(press(app, "C-f")).toBe(true); ... expect(press(app, "Right")).toBe(true); ... expect(press(app, "Left")).toBe(true); ... expect(written).toBeNull();"
  evidence: src/focus.test.ts:736-757 — "expect(documentText(app.view)).toBe(HAZARDOUS); ... expect(written).toEqual({ path: HAZARD_PATH, text: HAZARDOUS });"
  evidence: src/sidebar.ts:654-669 — "if (!row || !row.expandable || row.expanded) return; expanded.add(row.key); draw();"
  evidence: src/sidebar.ts:447 — "const clamped = Math.min(Math.max(index, 0), rowList.length - 1);"
- ac-3 — MET: Return on the Bob sub-section row calls the same onOpenChapter hook a click calls; the app opens BOB, revealLine puts the cursor on line 9 (the ### heading), and because the tree held the keyboard the app hands it back with focus.toEditor() once the chapter has loaded, so pane is editor, sidebar.focused is false and the modeline reads [Editor].
  evidence: src/focus.test.ts:649-658 — "expect(press(app, "Return")).toBe(true); ... expect(app.chapterPath).toBe(BOB_PATH); ... expect(cursorPosition(app.view).line).toBe(9); expect(app.focus.pane).toBe("editor"); ... expect(modeline(app)).toContain("[Editor]");"
  evidence: src/sidebar.ts:677-682 — "if (row.node === undefined) hooks.onOpenChapter(row.chapter); else hooks.onOpenChapter(row.chapter, row.node);"
  evidence: src/app.ts:210-218 — "const handBack = focus.pane === "sidebar"; void (async () => { await app.openChapter(chapter, node); if (handBack) focus.toEditor(); })();"
  evidence: src/app.ts:745 — "if (node) revealLine(view, node.line);"
- ac-4 — MET: C-g (and Escape, the row's second chord) from the sidebar returns the pane to editor with chapterPath still ALICE, the text byte-equal and cursorPosition equal to the value captured before C-x o; a second C-x o with no panel open does the same, the cycle finding only the editor because the panel target is unavailable.
  evidence: src/focus.test.ts:673-694 — "expect(press(app, "C-g")).toBe(true); expect(app.focus.pane).toBe("editor"); ... expect(cursorPosition(app.view)).toEqual(before);"
  evidence: src/focus.test.ts:391-404 — "press(app, "C-x o"); expect(app.focus.pane).toBe("editor"); ... expect(cursorPosition(app.view)).toEqual(before); expect(modeline(app)).toContain("[Editor]");"
  evidence: src/focus.ts:492-494 — "case "sidebar-quit": toEditor(); return;"
  evidence: src/focus.ts:296-299 — "pane: "panel", ... available: () => activePanel() !== null,"
- ac-5 — NOT_MET: Promised: with the keys panel open, three C-x o presses visit sidebar, keys panel, editor, and the same with the insert palette, publish or settings. Delivered at HEAD: panelTarget.release closes any overlay the moment the keyboard leaves it (c0a856f, iss-2609052115254279), so the keys panel and the insert palette are cancelled on the first departure and the walk is editor, sidebar, editor — the test itself asserts the third press lands on 'editor' for every overlay-backed panel. The three-step cycle holds only for the registered panels (publish, settings). The divergence is recorded in DECISIONS.md but the criterion was not amended.
  evidence: src/focus.test.ts:505-518 — "press(app, "C-x o"); if (panel.overlay) { // Cancelled on the way out ... expect(app.focus.pane, panel.label).toBe("editor"); } else { expect(app.focus.pane, panel.label).toBe("panel");"
  evidence: src/focus.ts:317-321 — "So an overlay is closed, cancelled, the moment the keyboard leaves it. ... heldOverlay()?.close(false);"
  evidence: src/focus.test.ts:443-455 — "{ label: "Keys", overlay: true, ... }, { label: "Insert", overlay: true,"
  evidence: .abcd/work/DECISIONS.md:0 — "An overlay that loses the keyboard is closed, not left open. ... `focus.ts`'s `panelTarget.release` now closes the overlay in the third place, cancelled"
- ac-6 — MET: With the text focused, C-n/C-p/C-f/C-b/Return/Down/Up leave the row list, cursor and pane untouched while Return inserts a newline into the buffer; with the tree focused, printable keys and the editing chords C-k/C-y/C-d/M-d/C-t leave the document byte-equal and dirty false. The reader returns early while pane is editor, and the Emacs sweep skips non-editor rows so no sidebar row is bound in the CodeMirror keymap.
  evidence: src/focus.test.ts:705-716 — "for (const chord of ["C-n", "C-p", "C-f", "C-b", "Return", "Down", "Up"]) ... expect(app.sidebar.cursor).toBe(cursorBefore); ... expect(documentText(app.view)).not.toBe(ALICE);"
  evidence: src/focus.test.ts:723-733 — "for (const key of ["a", "b", "z", "1", "Space", "S-q"]) ... expect(documentText(app.view)).toBe(ALICE); expect(app.dirty).toBe(false);"
  evidence: src/focus.ts:514-515 — "if (pane !== "editor") reconcile(); if (pane === "editor") return;"
  evidence: src/emacs-keys.test.ts:727-728 — "// sidebar answers it, and only while the tree holds the keyboard. if (scopeOf(binding) !== "editor") continue;"
- ac-7 — MET_WITH_CONCERNS: The six sidebar rows and other-window carry id, label and chords; every chord in the flow (C-x o, C-x C-o, C-n, C-p, C-f, C-b, Return, C-g, Escape, arrows) is in the table; each sidebar chord is claimed when pressed in the tree; the keys panel renders every one of those rows with a 'sidebar' owner note; and uniqueness is proven per scope. Concerns: the 'no chord a panel answers is absent' half is proven for the chord this intent adds to panels (other-window) only — the panels' own keys were not swept; and other-window ships in group 'document', not the 'control' group the spec's table names (a recorded departure).
  evidence: src/keys.ts:917-957 — "id: "sidebar-next-node", label: "Next node", chords: ["C-n", "Down"], group: "panes", owner: "sidebar","
  evidence: src/keys.ts:760-764 — "id: "other-window", label: "Move to the other pane", chords: ["C-x o", "C-x C-o"], group: "document", owner: "editor","
  evidence: src/focus.test.ts:759-811 — "expect(sidebarRows.length).toBe(6); ... expect(pressAt(app.sidebar.element, chord), `${binding.id}: ${chord}`).toBe(true); ... expect(listed.has(canonicalChord(chord)), chord).toBe(true);"
  evidence: src/focus.test.ts:813-831 — "expect(ids, binding.id).toContain(binding.id); ... expect(row?.textContent).toContain("sidebar");"
  evidence: src/emacs-keys.test.ts:337-353 — "for (const scope of ["editor", "sidebar"] as const) { for (const [chord, rows] of chordIndexIn(scope)) ... expect(shared).toEqual([]);"
  evidence: src/keyspanel.ts:25-30 — "sidebar: "sidebar","
- ac-8 — INCONCLUSIVE: The mechanism is present and test-proven in jsdom: with the drawer closed, C-x o opens it (data-open=yes), Return opens Bob and closes it, C-g closes it having changed nothing, and an already-open column is left alone; the 820 px breakpoint lives only in style.css. But the criterion is stated at 820 CSS pixels with 'nothing scrolls horizontally' and 'no step requires the pointer', jsdom has no layout or media queries, the spec assigns that proof to manual check M30-1, and every M30-1 row is unticked. Unverified, not failed.
  evidence: src/focus.test.ts:1031-1045 — "app.sidebar.setOpen(false); ... press(app, "C-x o"); expect(app.sidebar.open).toBe(true); ... expect(app.sidebar.open).toBe(false); expect(app.sidebar.element.dataset["open"]).toBe("no");"
  evidence: src/focus.test.ts:1048-1063 — "press(app, "C-g"); expect(app.sidebar.open).toBe(false); ... expect(documentText(app.view)).toBe(before);"
  evidence: src/sidebar.ts:644-651 — "if (openedForFocus) { openedForFocus = false; this.setOpen(false); }"
  evidence: src/style.css:222-236 — "@media (max-width: 820px) { .sidebar { position: absolute; ... } .sidebar[data-open="no"] { display: none; }"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051925374395.md:0 — "- [ ] 820: nothing scrolls sideways at any point, and no step needed the pointer."
- ac-9 — MET_WITH_CONCERNS: Byte-fidelity is tested over the hazardous fixture (save writes the identical bytes); network-only-on-publish is tested with fetch/XHR/beacon/WebSocket/EventSource stubs across the whole flow; one source holds because the reader resolves every chord through bindingById/canonicalChord and the rows come from the sidebar's own draw walk; no-machine and degrade-gracefully hold structurally because nothing here dispatches a transaction or writes a construct. Concern: 'legible on three device classes' rests on M30-1 at 1280/820/390, and every row is unticked.
  evidence: src/focus.test.ts:752-756 — "expect(documentText(app.view)).toBe(HAZARDOUS); expect(app.dirty).toBe(false); ... expect(written).toEqual({ path: HAZARD_PATH, text: HAZARDOUS });"
  evidence: src/focus.test.ts:1079-1141 — "it("attempts no network request while moving between panes" ... expect(attempts).toEqual([]);"
  evidence: src/focus.ts:172-174 — "function chordsOf(id: string): readonly string[] { return (bindingById(id)?.chords ?? []).map(canonicalChord); }"
  evidence: src/focus.test.ts:684 — "// Her cursor is where she left it: nothing here dispatched a transaction."
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051925374395.md:0 — "- [ ] 390: the same three checks as 820 — drawer opens, flow runs, both exits close it."

Gap audit:
- honoured:
  - C-x o hands the keyboard from the text to the sidebar, starting on the open chapter, and the modeline names the pane
    evidence: src/focus.test.ts:366-381 — "expect(cursorRow(app)).toBe(`chapter:${ALICE_PATH}`); ... expect(modeline(app)).toContain("[Sidebar]");"
  - C-x C-o cycles as well as C-x o (maintainer note, 2026-09-05)
    evidence: src/keys.ts:762 — "chords: ["C-x o", "C-x C-o"],"
    evidence: src/focus.test.ts:383-389 — "it("answers C-x C-o as well, without lifting the Control key""
  - C-n/C-p walk, C-f/C-b and the arrows expand and collapse, nothing opens while only looking
    evidence: src/focus.test.ts:597-634 — "expect(app.chapterPath).toBe(ALICE_PATH); expect(documentText(app.view)).toBe(ALICE); expect(written).toBeNull();"
  - Return opens the chapter at the heading through the hook a click calls and hands the keyboard straight back
    evidence: src/app.ts:210-218 — "if (handBack) focus.toEditor();"
  - C-g returns to the text with nothing opened and the cursor where she left it; a second C-x o does the same with no panel open
    evidence: src/focus.test.ts:673-694 — "expect(cursorPosition(app.view)).toEqual(before);"
  - Focus is single and exclusive: no sidebar chord fires from the text, no keystroke leaks into the chapter from the tree
    evidence: src/focus.test.ts:698-734 — "expect(documentText(app.view)).toBe(ALICE); expect(app.dirty).toBe(false);"
  - Every chord in the flow is a row in the binding table, listed in the keys panel, with uniqueness stated per scope
    evidence: src/emacs-keys.test.ts:337-353 — "expect(shared).toEqual([]);"
    evidence: src/focus.test.ts:813-831 — "expect(ids, binding.id).toContain(binding.id);"
  - A half-typed C-x in the sidebar shows in the modeline's one prefix cell and C-g clears it
    evidence: src/focus.test.ts:533-545 — "expect(prefix?.textContent).toBe("C-x-"); ... expect(press(app, "C-g")).toBe(true); expect(app.focus.prefix).toBeNull();"
  - Publish and settings take the third place and the three-step cycle holds with them
    evidence: src/focus.test.ts:511-517 — "expect(app.focus.pane, panel.label).toBe("panel"); ... press(app, "C-x o"); expect(app.focus.pane, panel.label).toBe("editor");"
  - The drawer opens with the keyboard and closes behind Return and behind cancel (mechanism)
    evidence: src/focus.test.ts:1026-1063 — "expect(app.sidebar.open).toBe(true); ... expect(app.sidebar.open).toBe(false);"
- diverged:
  - With the keys panel (or insert palette) open, C-x o cycles editor, sidebar, keys panel and back to the editor — delivered: leaving an overlay cancels it, so the walk is editor, sidebar, editor and the overlay is gone
    evidence: src/focus.test.ts:505-510 — "if (panel.overlay) { // Cancelled on the way out, so there is no third place to come back to ... expect(app.focus.pane, panel.label).toBe("editor");"
    evidence: src/focus.ts:320 — "heldOverlay()?.close(false);"
  - other-window in the 'control' group per the spec's table — delivered in group 'document'
    evidence: src/keys.ts:763 — "group: "document","
    evidence: .abcd/work/DECISIONS.md:0 — "`other-window` ships in `group: "document"`, not the `control` group its spec's table names."
  - This intent 'owns no part of' intent 2's prefix-key state and one-cancel-chord contract — delivered: a second reader with its own pending prefix feeds the modeline, and the pane cycle itself now cancels an overlay
    evidence: src/focus.ts:180-181 — "/** The prefix step in progress in this reader, such as `C-x`. */ let pending: string | null = null;"
    evidence: src/modeline.ts:127-147 — "// One prefix cell, two readers."
- missing:
  - Manual checks M30-1 through M30-4 run and recorded (the only proof of 820/390 px behaviour, horizontal scroll, and the real-keyboard reach of C-x)
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051925374395.md:0 — "Every row is unticked."
  - Spike checklist row 17 (C-x o on a real keyboard) recorded against the table, as the spec's task 9 promised
    evidence: docs/spike-emacs-keys.md:320 — "| 17 | `C-x o` from the text, then `C-x o` again from the sidebar, and `C-x C-o` for both | The log shows both steps"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051925374395.md:0 — "- [ ] Record the result as row 17 of the checklist in `docs/spike-emacs-keys.md`."
  - A test that starts on a collapsed Part, the criterion's stated Given for tree movement
    evidence: src/focus.test.ts:597-601 — "press(app, "C-x o"); press(app, "C-n"); expect(cursorRow(app)).toBe(`chapter:${BOB_PATH}`);"

Scope-condition dispositions:
- cond-2609051925377283 — untested: Nothing in the delivery exercises the Tauri/macOS shell's claim on C-x: the tests run in jsdom, M30-2 (the real-keyboard rows) is unticked, and spike row 17 carries no recorded result.
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051925374395.md:0 — "- [ ] `C-x o` from the text: the log shows `C-x` and then `o`, both claimed"
- cond-2609051925378745 — survived: The focus model, the cursor ring and the pane cell live in the application's own modules and stylesheet; focus.ts imports only keys, overlay and sidebar, and no module under src/publish, src/core, src/export or src/present.ts references focus or other-window, so a reader of a rendering sees none of it.
  evidence: src/focus.ts:21-29 — "from "./keys"; import { currentOverlay, focusOverlay, onOverlayChange } from "./overlay"; import type { Sidebar } from "./sidebar";"
  evidence: src/style.css:206-209 — ".sidebar[data-focused="yes"] { border-right-color: var(--accent);"
- cond-2609051925379060 — narrowed: The binding table exists and every chord here is a row in it, resolved through bindingById; but the spike's settlement of the Emacs bindings on a real macOS keyboard is still open — the bundler had silently dropped the whole keymap (fixed, then guarded in this range), row 17 has no result, and M30-2 is unticked.
  narrowing: holds for the table's existence and the rows' registration in it; does not yet hold for the spike having settled what reaches the page on a real keyboard
  evidence: src/keys.ts:917-957 — "owner: "sidebar","
  evidence: src/focus.ts:172-174 — "return (bindingById(id)?.chords ?? []).map(canonicalChord);"
  evidence: docs/spike-emacs-keys.md:320 — "| 17 | `C-x o` from the text, then `C-x o` again from the sidebar"
  evidence: .abcd/work/DECISIONS.md:0 — "dropping them left the running app with a keymap that had no bindings and no commands while every test passed"
- cond-2609051925372330 — untested: The breakpoint is consistent with the condition (column above 820 px, drawer at 820 and below, so 390 is a drawer too), but no width is read in TypeScript, jsdom has no layout, and every 1280/820/390 row of M30-1 is unticked, so the flow at those widths was neither exercised nor contradicted.
  evidence: src/style.css:222-223 — "@media (max-width: 820px) { .sidebar {"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051925374395.md:0 — "- [ ] 1280: `C-x o` from the text. The keyboard moves to the sidebar"
- cond-2609051925372563 — survived: Return calls the same onOpenChapter hook a click calls and a Part row opens nothing; the flat row list is collected from the sidebar's existing draw walk, and the range adds no node, badge or ordering to sidebar.ts (31 added lines, all focus/cursor plumbing).
  evidence: src/sidebar.ts:677-682 — "if (!row || row.chapter === undefined) return false; if (row.node === undefined) hooks.onOpenChapter(row.chapter); else hooks.onOpenChapter(row.chapter, row.node);"
  evidence: src/app.ts:211-212 — "// Return in the tree and a click on a row are the same hook."
  evidence: src/focus.test.ts:661-671 — "it("opens nothing on a Part row, because a Part is not a chapter""
- cond-2609051925374969 — narrowed: The table's shape, the keys panel and the tooltips are untouched (one owner note added, rows registered under a new scope); but the prefix-key state now has a second reader with its own pending step feeding the modeline, and since c0a856f the pane cycle itself cancels an overlay on release rather than leaving cancellation to the one cancel contract.
  narrowing: holds for the table's shape, the keys panel and the tooltips; the prefix state and the cancelling of an overlay now have a second trigger in src/focus.ts
  evidence: src/keyspanel.ts:28-29 — "// Which pane answers the row, for the six that answer in one pane only. sidebar: "sidebar","
  evidence: src/focus.ts:180-181 — "let pending: string | null = null;"
  evidence: src/focus.ts:317-320 — "So an overlay is closed, cancelled, the moment the keyboard leaves it. ... heldOverlay()?.close(false);"
  evidence: src/modeline.ts:127-129 — "// One prefix cell, two readers. The editing surface's own handler // cannot hear a key while another pane holds the keyboard"
- cond-2609051925377047 — survived: The reader is a document listener installed by the application's focus model and stops at the app's chrome; nothing under src/publish, src/core, src/export or src/present.ts imports focus.ts or names other-window, so no rendering carries this vocabulary.
  evidence: src/focus.ts:561-563 — "document.addEventListener("keydown", onKeydown, true); document.addEventListener("focusin", onFocusIn, true);"
  evidence: src/app.ts:247 — "const focus: FocusModel = createFocusModel({"
- cond-2609051925377969 — narrowed: The palette is reached as the third place in the same order as any other panel and keeps its own keys while it holds the keyboard; but leaving it with C-x o cancels it, unlike a registered panel which stays open, so the cycle with the palette is two steps after the first departure.
  narrowing: holds for reaching the palette and for the order of the cycle; does not hold for leaving it the way any other panel is left, because an overlay is cancelled on cycle-away while publish and settings stay open
  evidence: src/focus.test.ts:1201-1215 — "// The palette's own filter field still receives what is typed at it: the reader answers `other-window` in a panel and nothing else."
  evidence: src/focus.test.ts:451-456 — "label: "Insert", overlay: true,"
  evidence: src/focus.ts:304-306 — "// A *registered* panel cycled away from stays open"
## Grounds

- pursued: one window-switching vocabulary shared by the editor, the sidebar, and every panel keeps the hands on the keyboard; wrong if the tree needs gestures a chord cannot express

## Maintainer note, 2026-09-05

- The chord for the other window is `C-x C-o` as well as `C-x o`; both
  cycle focus.
