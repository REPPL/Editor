---
id: itd-2609051921482691
slug: alice-cannot-move-between-the-editing-surface-and-the-sideba
spec_id: null
kind: null
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

- Platform: the desktop app — the Tauri 2 shell with the system web view —
  on macOS, which is where the shell can claim key combinations back from
  the platform. The tablet path, where there is no shell to claim
  anything, is out.
- Population: Alice, the maintainer, editing a document she has open.
  Nothing here is seen by a reader of a published rendering.
- Assumption: the binding table exists and the spike has settled what
  "full Emacs bindings" means, since every chord here is a row in that
  table rather than a chord of its own invention.
- Widths: the flow holds at 1280, 820 and 390 CSS pixels, with the sidebar
  as a column at the widest and as a drawer at the narrower two.
- Boundary with intent 1, *Open a folder and see the book*
  (`itd-2609051335399446`): 1 owns the sidebar itself — the tree drawn
  from the file system, its Parts, Chapters and heading levels, its
  badges, and what opens when a node is clicked. This intent adds no node,
  no badge and no ordering; it owns only reaching that tree from the
  keyboard, moving in it, and getting back. Where a click and Return must
  agree — a heading node opening its chapter scrolled to that heading —
  the behaviour is 1's and this intent inherits it.
- Boundary with intent 2, *Edit with the Emacs bindings I already know*
  (`itd-2609051335406422`): 2 owns the binding table's shape, the keys
  panel, the tooltips, the prefix-key state and the one-cancel-chord
  contract. This intent owns no part of that machinery; it registers rows
  in the table 2 defines and reuses 2's cancel contract for `C-g`. The
  chords the *text* answers are 2's; the chords the sidebar and the panels
  answer are this intent's.
- Boundary with intent 26, *Move through the article by keyboard*
  (`itd-2609051402083398`): 26 owns keyboard movement inside a reading
  view — the published article and what it shares with the editor's
  vocabulary. This intent stops at the app's own chrome and never reaches
  a rendering.
- Boundary with intent 3, *Insert a construct I cannot remember*: 3 owns
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
- Given the keys panel open, when Alice presses `C-x o` three times from
  the editor, then focus visits the sidebar, then the keys panel, then the
  editor, in that order every time, with the modeline naming each; and the
  same three-step cycle holds with the insert palette, the publish panel or
  settings open in the keys panel's place.
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

_Empty. Populated by intent-auditor when intent moves to shipped/._
