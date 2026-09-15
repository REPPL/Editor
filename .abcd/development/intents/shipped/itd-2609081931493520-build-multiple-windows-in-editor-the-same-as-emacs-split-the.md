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
- Two windows showing one chapter share one document state: an edit in either <!-- cond: cond-2609111105378478 -->
  appears in both immediately. Two independent copies of a chapter are
  explicitly not built — `adr-2609091832455881` declines that as worse than a
  refusal, because the last save would win and the author would lose work.
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
  pixels, and at 390 the area is too narrow to divide and the chords say so
  rather than producing unusable slivers; reachable by assistive technology —
  each window is announced as a region with the chapter it shows, and the
  focused window is discoverable without sight.

## Open Questions

_None recorded yet._

## Audit Notes

<!-- abcd-review: OWED receipt=rcp-5f2926b8827f -->
Fidelity review OWED (receipt rcp-5f2926b8827f).

## Grounds

- pursued: the pane cycle's first slot becomes plural while its rule stays intact, and two windows on one chapter are two CodeMirror views over one shared EditorState, which is what makes a split a split rather than two copies; wrong if an edit in one window fails to appear in the other, if a window's caret jumps to the typing window's position, or if C-x C-s ever writes the chapter of a window that does not hold the keyboard
