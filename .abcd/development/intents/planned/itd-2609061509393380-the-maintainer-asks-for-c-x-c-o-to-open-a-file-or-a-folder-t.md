---
id: itd-2609061509393380
slug: the-maintainer-asks-for-c-x-c-o-to-open-a-file-or-a-folder-t
spec_id: spc-2609061617208646
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
promoted_from: iss-2609061509390620
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Open whatever is in front of me

## Press Release

Alice has a folder open in the Finder, or just one Markdown file she has
been drafting on a train with nothing else beside it, and she wants Editor
to show it. She presses `C-x C-o`, says whether it is a folder or a
single file, and picks it through the same dialog `C-x C-f` already
opens. A folder opens exactly as it always has: the sidebar draws the
book, Part by Part, Chapter by Chapter. A single file opens as a
one-chapter document rooted in the folder it already sits in — nothing is
written to that folder, not a `document.yaml`, not a Part, not a rename —
and the sidebar shows the one chapter, ready to edit, save, and read back
byte for byte. If the file she picked already lives inside a folder that
is a document folder, Editor opens the whole book and starts her on that
chapter, because a document she already has does not become a stranger to
itself just because she reached it by a different door.

`C-x C-o` used to be a second way to move to the other pane, sitting
beside `C-x o` for the same reason Emacs's own `C-x` sequences keep the
Control key down between two related steps. Emacs spends that chord on
`delete-blank-lines`, a command a writer of prose in Editor's world rarely
misses, so giving it up costs nothing an author would call a loss. The
pane cycle keeps its one chord, `C-x o`, exactly as Emacs answers it, and
`C-x C-f` keeps opening a folder exactly as it does today — `C-x C-o` is a
second door onto the same room, not a replacement for the first.

## Why This Matters

Editor's whole design rests on a document being a folder Alice already
owns, and every moment before this one assumed she would arrive at it as
a folder: `C-x C-f` asks for one, the New document panel writes one. What
none of them answer is the case the maintainer actually hit — a single
file, with no folder built around it yet, that she wants to look at or
edit in Editor without first deciding whether it is going to become a
book. Refusing that file, or worse, quietly manufacturing a `document.yaml`
and a Part folder she never asked for, either turns Editor away from
material she has in front of her or writes something into her folder she
did not choose. A one-chapter document that writes nothing lets her open
the file, edit it, and save it byte for byte, exactly as if it had always
been a document folder of one chapter — because `05-internals.md` section
1 already names that shape the degenerate case of a real document, not a
lesser one.

## Mechanism

- We expect a single Markdown file to need no folder written around it
  because the on-disk model already treats "one folder, one Markdown
  file" as an ordinary document (`05-internals.md` section 1, "a
  single-chapter document is the degenerate case"); the only thing this
  moment adds is not requiring that folder, the Part inside it, and the
  metadata file to exist beforehand. The claim is falsified if opening a
  bare file writes anything to disk before Alice has typed a single edit.
- We expect the freed `C-x C-o` to cost nothing because Emacs's own
  binding for it, `delete-blank-lines`, has no row in Editor's table
  today and nothing in the shipped keymap calls it: no chord Editor
  already answers is Emacs's `delete-blank-lines`, and no test or
  document names it as a gap. If a later author asks for that command
  specifically, it is a new row on a chord of its own, not evidence this
  one was wrong to take.
- We expect a file already inside a document folder to open that whole
  document, not a synthetic one-chapter stand-in, because a document
  Alice already has does not stop being that document depending on which
  command opened it; `document.yaml` at the document's own root is what
  `05-internals.md` section 1 already uses to say a folder is a document,
  so the same test that answers "is this folder a document" for `C-x C-n`
  answers it here.
- We expect one dialog per kind of pick — a folder dialog or a file
  dialog, never a single panel offering both — because the desktop file
  chooser Editor already uses for `C-x C-f` and the New document panel
  opens in one mode or the other and no third mode exists to ask for
  either at once; the falsifier is a native panel, on this platform, that
  lets Alice choose a folder and a plain file interchangeably in one
  dialog without Editor adding anything to ask for it.
- We expect the shell's dialog to remain the one place a path is chosen
  because every other moment that touches the file system already keeps
  the choice under a nonce rather than trusting a path the page hands
  back (`new_document.rs`, `export.rs`); a script running in the page can
  therefore ask Editor to open what Alice actually picked, and nothing
  else.

## Scope Conditions

- Platform: the desktop app only, a Tauri 2 shell around the macOS system <!-- cond: cond-2609061617204415 -->
  web view. Opening a folder or a file through a native dialog is a shell
  capability; the single HTML file and any reading view open nothing.
- Population: Alice, one author, one document open at a time — the same <!-- cond: cond-2609061617202904 -->
  population `C-x C-f` already serves. Nothing here changes how many
  documents may be open together.
- Assumption: "is this folder a document" is answered the same way New <!-- cond: cond-2609061617205743 -->
  document already answers it for a destination it refuses — the folder
  carries a `document.yaml` — walked upward from the picked file's own
  folder until either one is found or the walk runs out of ancestors.
- Boundary with map #1, `itd-2609051335399446` (Open a folder and see the <!-- cond: cond-2609061617206519 -->
  book): 1 owns walking a folder into a tree once it is chosen; this
  moment owns choosing it, whether the choice is a folder or a single
  file, and reuses 1's own walk unchanged for a folder pick and for a
  file found to sit inside an existing document.
- Boundary with map #29, `itd-2609051402191319` (Start a new document): 29 <!-- cond: cond-2609061617202280 -->
  writes the smallest folder that is already a book; this moment writes
  nothing for a bare file and never promotes one into a folder on
  Alice's behalf. A one-chapter document opened here that Alice later
  wants Parts and a metadata file for is still New document's to build.
- Boundary with map #30, `itd-2609051921482691` (Move between the editor <!-- cond: cond-2609061617200282 -->
  and the sidebar without the mouse, the pane cycle): 30 keeps `C-x o` as
  the one chord that moves between panes, exactly as Emacs answers it;
  this moment takes the second chord, `C-x C-o`, which 30's own spec
  placed beside it, and neither row answers the other's chord any
  longer.
- Excluded: export and publish of a one-chapter document opened this way. <!-- cond: cond-2609061617201811 -->
  Both already refuse when no document folder is open, and a bare file's
  synthetic tree is not backed by one; this moment does not change either
  refusal's wording or add a route around it.
- Excluded as plumbing: the on-disk model, the folder walk, and the <!-- cond: cond-2609061617202522 -->
  shell's own nonce-and-claim mechanism the chosen destination travels
  under (`05-internals.md` section 1; `new_document.rs`; `export.rs`).

## Acceptance Criteria

- Given no document is open, When Alice presses `C-x C-o` and chooses "a
  document folder" and then a folder holding a book, Then the sidebar
  shows that book exactly as `C-x C-f` would have shown it.
- Given no document is open, When Alice presses `C-x C-o`, chooses "a
  single file", and picks a Markdown file that sits in a folder with no
  `document.yaml` anywhere above it, Then the sidebar shows a document of
  exactly one chapter, that chapter is open in the editing surface, and
  the folder the file sits in gains no new file of any kind.
- Given that one-chapter document is open, When Alice edits the chapter
  and saves it, Then the file on disk is what she typed, byte for byte,
  and no other file beside it exists.
- Given a document folder already exists with a `document.yaml` at its
  root and a chapter two levels beneath it, When Alice presses `C-x C-o`,
  chooses "a single file", and picks that chapter directly, Then Editor
  opens the whole document as `C-x C-f` would, the sidebar shows every
  Part and Chapter of it, and the picked chapter is the one already open
  in the editing surface.
- Given Alice presses `C-x C-o` and chooses "a single file", When she
  picks a file that is not Markdown, Then Editor opens nothing, says the
  file is not one it can open, and writes nothing anywhere. (Negative
  case.)
- Given Alice presses `C-x C-o` and cancels either dialog without
  choosing anything, When the dialog closes, Then whatever was open
  beforehand is exactly as it was, and nothing is written.
- Given the pane cycle, When Alice presses `C-x o`, Then the keyboard
  moves to the other pane exactly as before, and `C-x C-o` no longer
  answers that gesture.
- Given a document is open through either route and the machine has no
  network connection, When Alice opens it and edits and saves the
  chapter, Then every action succeeds and no network request is
  attempted.
- Inherits: no machine in the document (`itd-2609051336080960`) — a
  bare-file open writes nothing until Alice edits; round-trip
  byte-fidelity (`itd-2609051336074533`) — either route reads and writes
  a chapter's bytes unchanged apart from her own edit; one source, always
  (`itd-2609051336090390`) — a bare file's sidebar is the one chapter on
  disk and nothing else records it; network only on publish
  (`itd-2609051336158553`) — opening a file or a folder this way makes no
  request of any kind.

## Open Questions

- Whether a later intent should let Alice promote an already-open
  one-chapter document into a full folder — a `document.yaml`, a named
  Part — without closing and recreating it through New document. This
  moment answers only opening; promoting is New document's shape already
  and is left there.
- Whether the two-step chooser this moment adds (folder, or file) is the
  answer that should stand once more of the application has a considered
  view of small confirming prompts, or whether a future design finds a
  single-dialog route this platform's own file panel does not offer
  today without a further dependency.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._

## Grounds

- pursued: one open chord that takes a file or a folder lets Alice open whatever she has in front of her without knowing the folder model first; wrong if a single file opened without a document folder behind it misleads her into editing something the publish and deck paths cannot see, or if opening a chapter that already belongs to a real document folder shows her a stand-in instead of the book it is actually part of
- pursued: C-x C-o opens a file or a folder Alice picks through the shell's own dialog under a nonce, walking a folder exactly as C-x C-f does and building a hand-made one-chapter tree for a bare file that writes nothing; it would show wrong if a bare file's open wrote anything to its folder, if a file already inside a real document opened as a stand-in instead of that document, or if C-x o stopped moving between panes once C-x C-o was taken for opening
- pursued: final check before handoff — code and tests match the spec's design
