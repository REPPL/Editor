---
id: adr-2609091832455881
slug: editing-windows-are-a-split-tree
status: proposed
date: 2026-09-09
supersedes: null
superseded_by: null
related_intents: [itd-2609081931493520, itd-2609091722353838, itd-2609051921482691]
related_rfcs: []
related_adrs: [adr-2609051324137479]
---

# ADR-2609091832455881: The editing surface becomes a tree of windows, and the pane cycle's first slot becomes plural

## Context

The maintainer has asked for Emacs's own kind of split — several editing
windows inside one frame, reached by `C-x 2`, `C-x 3`, `C-x 0` and `C-x 1`
with `C-x o` cycling among them (`itd-2609081931493520`). The settlement in
`iss-2609081938037238` is explicit that these are splits inside the single
Tauri window, not separate operating-system windows; nothing here proposes a
second OS window and `adr-2609051324137479` is untouched by this record.

Two modules state, as given, an assumption the ask breaks.

`src/focus.ts` opens with "Three panes in one fixed order — the editing
surface, the sidebar, whatever panel is open — and one chord, `other-window`,
that walks it," and encodes it as `PANE_ORDER: readonly Pane[] = ["editor",
"sidebar", "panel"]`. The set of things that can hold the keyboard is fixed
and its members are named at compile time.

`src/emacs.ts` holds `commands: EditorCommands | null` as a single
module-level registry, with its own comment saying "One window, one
application; a second one would replace the first." Every command in
`APP_COMMAND_IDS` — `save-chapter`, `reload-document`, `present`, `preview`,
`publish-open` and the rest — resolves against one implicit "the current
chapter", because there has only ever been one.

Behind both sits a third fact: there is exactly one CodeMirror `EditorView`,
and exactly one chapter mapped into it. Switching chapters replaces what that
view shows. `chapterCursors`, the per-chapter cursor memory recorded in the
2026-09-07 decision log, exists precisely because of this — returning to a
chapter means restoring a remembered offset into the same view, not switching
to a second live one.

Splitting is therefore not an extension either module's existing shape
anticipates. It is a change to a documented architectural invariant, and how
much it costs depends almost entirely on four questions that have to be
answered together rather than discovered one at a time during a build. This
record answers them so the scope decision that follows is made against a
described design rather than against a guess.

The pane-exclusivity rule is not one of the four. Exactly one pane holds the
keyboard at any moment — which is what lets `C-n` mean "next line" in the
text and "next node" in the tree without either being ambiguous — and nothing
about splitting argues for two panes hearing a chord at once. That rule
survives this record unchanged and stays exactly as load-bearing as it is
today.

## Decision

**1. The editor slot becomes a tree, and the cycle order is its leaves in
reading order, then the sidebar, then the panel.**

`PANE_ORDER`'s shape is kept and its first slot is made plural. A window tree
is either a leaf (one editing window) or a split (a direction — rows for
`C-x 2`, columns for `C-x 3` — and two or more children, each itself a tree).
`other-window` walks the leaves in reading order, then the sidebar, then the
panel, and wraps. The sidebar and any open panel stay docked outside the
split grid; they are not part of it and cannot be split.

This is chosen over a flat list of at most two windows because the flat
version is not cheaper where it matters. The expensive parts of this record —
the shared state, the command scoping, the cursor shape — cost the same for
two windows as for twenty; only the layout arithmetic differs, and a
recursive flex layout is not meaningfully harder to write than a two-element
one. What the flat version would buy is a refusal to answer `C-x 3` inside an
existing split, which is a worse experience than the general case and would
have to be explained.

**2. Two windows on the same chapter are two views of one `EditorState`.**

CodeMirror supports several `EditorView`s over one shared state natively.
Editor wires that: splitting a window showing a chapter gives two views over
the same live document, so an edit in one appears in the other in the same
frame. This is what a split *means* in Emacs, and the cheaper alternative —
two independent copies of the same text — is not a cheaper version of the
feature, it is a different and wrong feature that would let the maintainer
lose work by editing the same chapter twice.

A single chapter therefore has exactly one document state, held by the
application, and zero or more views onto it. Opening a chapter into a window
attaches that window's view to the chapter's state, creating the state if
this is the first window to want it.

**3. Commands resolve against the focused window, not a global.**

`src/emacs.ts`'s single `commands` registry stays one registry — the chord
table is global and should be — but the actions it holds stop closing over
"the view" and start asking the focus model which editing window holds the
keyboard, and acting on that window's chapter. This is the largest
non-obvious change in the record: it touches every entry in `APP_COMMAND_IDS`
that means anything chapter-shaped, and it is where a half-done split would
show up as `C-x C-s` saving the wrong file.

`present`, `preview`, `publish-open` and `export-open` act on the *document*,
not on a window, and are unaffected in meaning; they still need the focused
window only to know which document is meant, which today is unambiguous and
after this record still is.

**4. Cursor memory moves from per-chapter to per-window-and-chapter.**

`chapterCursors` keys an offset by chapter. Emacs distinguishes window-point
from buffer-point: two windows on one chapter keep two independent
positions, and a chapter with no window open on it keeps the position it had
when its last window left it. So the shape becomes: each window remembers a
position per chapter it has shown, and the chapter keeps a last-known
position for a window opening it fresh. A window closing discards its own
memory; a chapter closing everywhere keeps its last position, as it does now.

**5. `C-x o` still never changes what is shown.**

`itd-2609091722353838` settles that the cycle moves the keyboard among panes
that are shown and reports when there is nowhere to go. Splitting adds leaves
to what is shown; it does not add a case where cycling creates or destroys
one. `C-x 0` and `C-x 1` are the commands that change the layout, and they
are the only ones.

## Alternatives Considered

1. **A flat pair — one split, never nested.** `C-x 2`/`C-x 3` split once,
   `C-x 3` inside a split refuses. Cheaper only in the layout, which is the
   least of the four costs; buys a refusal the maintainer would meet on the
   second day. Rejected as a false economy, but it is a legitimate *build
   order*: the tree design here admits a first delivery capped at two leaves
   without any of it being thrown away, and that is the recommended way to
   start.

2. **Independent copies of a chapter per window.** Each split gets its own
   document state. Removes the shared-state work entirely and is a genuine
   saving. Rejected because it makes the feature dangerous rather than
   limited: two windows on one chapter would silently diverge and the last
   save would win. If the shared-state work is judged too expensive, the
   right answer is to refuse a second window on a chapter already open,
   not to allow two that disagree.

3. **Splits that show only different chapters.** Sidesteps shared state by
   construction — a chapter may be open in at most one window. Cheap, honest,
   and covers the most common real use (a chapter and its notes side by side).
   Rejected as the design, kept as the recommended first slice: it is
   alternative 2's safety without its danger, and it grows into this record's
   full decision by adding shared state later rather than by undoing anything.

4. **Separate operating-system windows.** Explicitly ruled out by the
   maintainer in `iss-2609081938037238`. Recorded here only so the record
   shows it was asked and answered.

5. **Do nothing.** The maintainer works in Emacs and reaches for `C-x 2`
   without thinking. Rejected, but worth naming that the cost below is real
   and this is the one item in the current queue that is a project rather
   than a change.

## Consequences

`src/focus.ts` gains a window tree and loses its "three panes, fixed order"
statement; its doc comment is rewritten, not amended. `src/emacs.ts`'s
"one window, one application" comment becomes false and its command actions
grow a focused-window lookup. `src/app.ts` stops holding one view and starts
holding a tree of them over a map of chapter states. `chapterCursors` changes
shape. The layout grows a resizable recursive grid. New rows enter
`src/keys.ts` for `C-x 2`, `C-x 3`, `C-x 0`, `C-x 1`, and `C-x o`'s row keeps
its chord and widens its meaning.

Every one of the 21 shipped intents that names the editing surface in the
singular is still true of the *focused* window, and none is broken by this
record; that is a claim worth testing with a sweep before the spec, not an
assurance.

The recommended build order, given all of the above, is three slices, each
shippable on its own: first the window tree and the layout with a chapter
open in at most one window (alternative 3); then shared state, lifting that
restriction; then the per-window cursor memory. Command scoping is not a
slice — it belongs to the first one, because a split whose `C-x C-s` saves
the wrong chapter is worse than no split.

This record is `proposed`. It becomes `accepted` in the change that puts a
scope decision in force, and `itd-2609081931493520` is not planned into a
spec before then.
