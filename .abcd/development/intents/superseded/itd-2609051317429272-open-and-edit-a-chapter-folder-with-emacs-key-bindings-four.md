---
id: itd-2609051317429272
slug: open-and-edit-a-chapter-folder-with-emacs-key-bindings-four
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051335399446, itd-2609051335406422, itd-2609051335415528, itd-2609051335529787, itd-2609051335537470]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Open and edit a chapter folder with Emacs bindings

## Press Release

Editor opens a folder and shows it as a book. Parts are folders, chapters
are Markdown files, and the sidebar shows every section, sub-section, and
sub-sub-section inside them. Alice clicks a heading and the editor opens
that chapter at that line. She edits with the Emacs key bindings she
already knows: movement, kill and yank, mark and region, incremental
search, undo, and the prefix keys, none of them swallowed by the browser
engine or the operating system.

Dragging an old single-file manuscript onto Editor splits it into a
chapter folder in one step, numbering the files in order and keeping every
heading level. Nothing in the text changes.

Pandoc constructs Alice cannot remember are one key away. An insert palette
lists dividers, columns, speaker notes, callouts, variant blocks, footnotes,
citations, and page-break comments, each inserted in the canonical fenced
form at the cursor. A block or span marked with a variant class belongs
only to that variant, and the sidebar shows which variants a chapter
carries.

## Why This Matters

Writing in Markdown is cheap until the document grows past one file; then
structure lives in the author's head. A sidebar that is the file system,
plus an editor that behaves like the one the author uses everywhere else,
keeps long documents workable without leaving plain text.

## Mechanism

We expect the sidebar and the file system to stay in agreement because
they are the same thing: a part is a folder and a chapter is a file, so a
rename in either place is a rename in both. We expect the Emacs bindings
to hold in a web view because CodeMirror's Emacs keymap already implements
them and the Tauri shell can claim the few combinations the platform would
otherwise take. We expect the insert palette to keep the canon consistent
because every construct it inserts is the fenced-div form the constraints
chapter names, so the author never has to remember the syntax.

## Scope Conditions

- The desktop app on macOS, in the Tauri 2 shell; the editing surface is
  CodeMirror with its Emacs keymap.
- Documents follow the on-disk model in `brief/02-constraints.md`: Part =
  folder, Chapter = file, Sections at heading levels two to four, numeric
  prefixes for order.
- Import handles one flat Markdown file; a folder that already has the
  shape opens as it is.
- Variant marking uses a fenced div or a bracketed span with a variant
  class; the set of variants is declared once in the document's front
  matter.
- "Full" Emacs bindings means the binding table written into the spec, not
  every Emacs command.

## Acceptance Criteria

- Given a folder with two Parts holding three Chapters with headings at
  levels two, three, and four, when Alice opens it, then the sidebar shows
  all four levels and selecting any node opens that chapter scrolled to
  that heading.
- Given a chapter file renamed to change its numeric prefix, when Editor
  reloads, then the sidebar shows it in the new position and no other file
  changed.
- Given the editor focused, when Alice uses each binding in the spec's
  table, then each performs its Emacs meaning and none is intercepted by
  the web view or the operating system.
- Given a single Markdown file with level-one headings, when Alice drops
  it on Editor and confirms the import, then a chapter folder exists with
  one file per level-one heading, numbered in order, and concatenating the
  files reproduces the original text byte for byte.
- Given the insert palette, when Alice chooses "divider", "columns",
  "speaker notes", "variant block", or "citation", then the canonical
  fenced or bracketed form is inserted at the cursor with the cursor placed
  inside it.
- Given a chapter with a block marked for variant B, when Alice previews
  variant A, then the block is absent, and when she previews variant B, it
  is present.

## Open Questions

- The binding table: which prefix keys and less common bindings count.
- Whether the sidebar also edits structure (drag a chapter between parts),
  or structure edits stay in the file system for v1.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
