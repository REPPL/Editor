---
id: itd-2609061141039863
slug: alice-cannot-change-the-editing-surface-s-text-size-from-the
spec_id: spc-2609061145242761
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609061141024865
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Make the text bigger or smaller from the keyboard

## Press Release

It is late, the room is dim, and the chapter Alice is writing is set in
type she picked at midday. She presses `C-x C-=` and the text of the
chapter grows one step. She presses it again and it grows another. The
sidebar beside it, the modeline at the foot, the keys panel she left
open — none of them move or change size. Only the words she is writing
are bigger. `C-x C--` takes a step back down, and `C-x C-0` puts the
surface back to the size the app opened at.

The modeline tells her where she is: for a moment it reads the scale as
a percentage of the default, then it goes back to showing her position
in the chapter. Nothing is written to the chapter file. The bytes on
disk after three presses are the bytes that were there before, and
`document.yaml` gains nothing: how large Alice likes her text is a fact
about her eyes and her screen, not about the book.

The next morning the app opens at the size she left it. The scale is
remembered per machine, beside the other things the app knows about this
machine, so the laptop she works on at night and the machine on her desk
each keep their own. Nothing about it appears in the settings panel: it
is set by pressing a key, the way a text scale is set in Emacs, and read
back when the app starts.

The three commands are rows in the binding table like every other row.
They have labels, they are listed in the keys panel one chord away, and
they are listed by name under `M-x`, so Alice can reach them without
remembering the chords. Each begins with the `C-x` prefix, which is why
`C--` still redoes the edit she just undid and `C-=` is still free for
whatever the table wants next.

## Why This Matters

Alice's editing surface is set at one size, chosen once by whoever wrote
the stylesheet, and the only ways out of it are the operating system's
own zoom — which enlarges the sidebar, the panels, and the modeline
along with the text, so the chapter gets no wider a share of the window
than it had — and getting closer to the screen. She writes for hours at
a time, on more than one machine, at more than one time of day, and the
size that suits a bright morning at a desk is not the size that suits a
dim evening on a sofa. Every other Emacs she has ever used answers this
in one chord.

## Mechanism

- We expect the chords to be reachable without collision because they
  are two-step chords behind a prefix the app already claims: the
  keyboard-navigation prototype proves that real prefix keys work inside
  a text field in a web view, with the prefix state visible in the
  modeline; that note records "Prefix keys are real"
  (`../../research/notes/2026-09-05-prototype-keyboard-navigation.md`).
  A chord that begins with `C-x` cannot be mistaken for a bare `C--` or
  `C-=`, so redo keeps its key and no row in the table has to move.
- We expect 1.2 per step to be the right step because it is the step
  Emacs itself uses, and Alice's hands come from Emacs: the constraints
  make Emacs bindings the one set and alternative binding sets out of
  scope, so a command that behaves like its Emacs namesake needs no
  learning at all. The vocabulary note ranks exactly this kind of row —
  a command a writer presses without thinking — as what the table is
  missing (`../../research/notes/2026-09-05-emacs-vocabulary-gap.md`).
- We expect scaling the editing surface alone, rather than the window,
  to be what Alice wants because the article prototype already proves it
  for the reading side: its reader controls change the text's size and
  measure without touching the page's chrome, and 03-evidence.md records
  that as "cheap" and belonging to the artefact. The same argument holds
  on the editing side, where the chrome is a sidebar Alice is not
  reading.
- We expect the settings store to be the right home because the scale is
  a machine fact of exactly the class that store already holds — the
  asset roots, the publish target — and because the "no machine in the
  document" discipline forbids machine-local settings inside a document
  folder. Writing it there would mean a document that carries one
  author's eyesight to every other reader of the folder.
- The claim is falsifiable in the obvious way: if the system's own zoom
  already served, the maintainer would not have asked for these chords
  after a session with the app, and an Alice who never presses them
  after they ship refutes it.

## Scope Conditions

- Platform: the desktop app in its web view. The surface scaled is the <!-- cond: cond-2609061145247985 -->
  one continuous editing view the constraints describe, and the scale is
  a property of that view, not of the window or the document.
- Population: Alice, the maintainer, one machine at a time. A second <!-- cond: cond-2609061145241167 -->
  machine keeps its own scale, because the store is per machine and no
  scale travels with the folder.
- Range: the scale is bounded at five steps in each direction — about <!-- cond: cond-2609061145247418 -->
  0.40 of the default at the bottom and about 2.49 at the top. A chord
  pressed at a bound leaves the size where it is and says so; it does
  not wrap and it does not silently do nothing.
- Boundary with intent 2 (itd-2609051335406422), which owns the binding <!-- cond: cond-2609061145244537 -->
  table's shape, the keys panel, and the cancel contract: this intent
  adds three rows to that table and owns what each does to the surface,
  and owns nothing of the table, the panel, or the contract.
- Boundary with intent 32 (itd-2609051934109483), which owns the prose <!-- cond: cond-2609061145241018 -->
  commands and the `M-x` command palette: these three rows appear under
  `M-x` because every row does, and this intent owns only that they are
  there and run; 32 owns the palette itself, its filtering, and its
  prompts.
- Boundary with intent 27 (itd-2609051402126424), which owns the <!-- cond: cond-2609061145240749 -->
  settings panel and the moment of setting a number and naming a place
  in it: the scale is written and read through the same per-machine
  settings store, gains no field in that panel, and is never set by
  typing into one.
- Boundary with intent 5 (itd-2609051335447894), which owns the deck and <!-- cond: cond-2609061145245151 -->
  its typography: the present window's type scale is untouched by these
  chords, and a deck shown after two enlargements is the deck the
  mapping produces at its own size.
- Assumption: one editing surface is open at a time, so there is one <!-- cond: cond-2609061145242133 -->
  scale and no per-buffer scale to reconcile. A second editing pane
  would reopen the question and is not in this intent.

## Acceptance Criteria

- **Given** the app is open on a chapter, **when** Alice opens the keys
  panel and then types `M-x`, **then** three rows appear in both — an
  enlarge row on `C-x C-=`, a shrink row on `C-x C--`, and a restore row
  on `C-x C-0` — each with a label, and running a row from `M-x` has the
  same effect as pressing its chord.
- **Given** a chapter open at the default scale, **when** Alice presses
  `C-x C-=` once, **then** the editing surface's computed font size is
  1.2 times what it was, and the computed font size of the sidebar, the
  modeline, the keys panel, and every other element on the page is
  exactly what it was before the press.
- **Given** Alice has pressed `C-x C-=` twice and `C-x C--` once,
  **when** she presses `C-x C-0`, **then** the editing surface's computed
  font size is the default to the pixel, and the modeline shows the
  scale briefly and then returns to showing her position and mode.
- **Given** Alice has enlarged the surface two steps, **when** she quits
  the app and starts it again, **then** the surface opens at that scale,
  `get_settings` reports it, and the setting sits in the application's
  own configuration directory rather than in any document folder.
- **Given** a chapter whose bytes are recorded before the test, **when**
  Alice presses `C-x C-=`, `C-x C--`, and `C-x C-0` in turn without
  editing, **then** the chapter file's bytes are unchanged, the buffer
  is not marked as having unsaved changes, and `document.yaml` carries
  no key naming a scale.
- **Given** Alice has undone an edit and the surface is at the default
  scale, **when** she presses `C--` on its own, **then** the edit is
  redone and the surface's font size does not change; and **when** she
  presses `C-=` on its own, **then** the surface's font size does not
  change either.
- **Given** the surface is at the top of the range, **when** Alice
  presses `C-x C-=` again, **then** the font size does not change, the
  modeline says the limit is reached, and the same holds at the bottom
  of the range for `C-x C--`.
- **Given** the window is 390 CSS pixels wide with a chapter whose
  longest line is 544 characters, **when** Alice enlarges the surface
  twice, **then** the lines wrap and nothing on the page scrolls
  sideways or needs pinching.
- Inherits: no machine in the document; round-trip byte-fidelity;
  legible on three device classes; network only on publish.

## Open Questions

- Which prefix keys and which of the less common Emacs bindings count as
  "full" is open in [`03-evidence.md`](../../brief/03-evidence.md) ("The
  binding table: which prefix keys and which of the less common Emacs
  bindings count as 'full'"). Whether the text-scale commands are inside
  that line or an addition to it is settled by adding them.
- Whether individual chords are rebindable and persisted is open in the
  same place ("Whether individual chords in that table are rebindable
  and persisted"). If rebinding lands, these three rows are rebindable
  like any other, and a rebinding is a different thing to persist from
  the scale itself.
- Which combinations macOS and the web view take before the editor sees
  them is open there too ("Which key combinations macOS and the web view
  take before the editor sees them, and which of those the shell can
  claim back"). `C-=` and `C--` after a prefix are candidates, because a
  web view has its own zoom on the unprefixed forms.

## Audit Notes

<!-- abcd-review: OWED receipt=rcp-3bbfe1df5bc4 -->
Fidelity review OWED (receipt rcp-3bbfe1df5bc4).

## Grounds

- pursued: Emacs's own text-scale chords let Alice fit the surface to her eyes without leaving the keyboard; wrong if the web view's own zoom on the unprefixed chords fights them
