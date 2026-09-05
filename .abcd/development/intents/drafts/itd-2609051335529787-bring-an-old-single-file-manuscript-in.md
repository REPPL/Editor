---
id: itd-2609051335529787
slug: bring-an-old-single-file-manuscript-in
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317429272]
---

# Bring an old single-file manuscript in

## Press Release

Alice has a manuscript she has been writing for years: one Markdown file,
eight hundred lines, headings four levels deep, and a decade of small
formatting habits inside it. She drags it onto Editor. Editor shows her
what it proposes to write — one chapter file for each level-one heading,
numbered in the order they appear, with the name it will give each one —
and she confirms. A folder appears, and the book she has been carrying in
one buffer is a folder of chapters.

Nothing in the text has changed. The line she once let run to five hundred
characters is still one line. The table she aligned by hand is aligned the
way she aligned it. The comments she wrote to control page breaks sit
where she left them, and the paths she typed to her images are the paths
she typed. If she concatenates the chapter files in their numbered order
she gets back the file she dropped, byte for byte, and she can prove it
with a command she already knows.

What she gains is the rest of Editor. The folder opens as a book, the
sidebar shows all four heading levels she actually uses, and the article
Bob reads and the deck Carol follows are drawn from that one text rather
than from a second copy of it. The manuscript arrives whole, in one
gesture, and Alice does not spend an evening cutting it up by hand and
then wondering what she broke.

## Why This Matters

Today the only way into a structured document is to do the splitting
yourself, and an author who does that either loses an evening or, more
often, does not do it at all and keeps the flat file — after which a second
copy appears for the reading app, a third for the rendered page, and one of
them quietly drifts. The manuscript that most needs Editor is exactly the
one most expensive to hand over, because every tool that rewrites Markdown
on the way through reflows a long line, re-escapes a character, or tidies a
table, and an author who cannot check the result has to trust it instead.
Import by split removes both costs at once: one gesture instead of an
evening, and a check anyone can run instead of trust.

## Mechanism

We expect the split to return the source byte for byte because every node
in the parse tree carries its source span — byte offsets into the chapter
file — and the split writes slices of the original bytes rather than
re-serialised text (05-internals sections 2 and 4). This is falsifiable in
one command: concatenate the chapters and compare with the original.

We expect the fourth heading level to survive because the document model
carries headings two, three, and four as Section, Sub-section, and
Sub-sub-section, and the acceptance project puts 116 of its 177 headings at
the fourth level (03-evidence, "The acceptance project"). A model that
stopped at three levels would fail visibly on two thirds of the document
rather than subtly.

We expect import to be the first hard test of round-trip byte-fidelity
because the same document carries the hazards a normalising writer silently
eats: 544-character lines, page-break comments a print route depends on,
and a percent-encoded folder path containing a space (03-evidence). Each is
a specific thing to compare, not a general hope.

We expect one gesture to be enough because order lives in the numeric
filename prefix and nothing else records it (05-internals section 1), so
the split writes files and directories and has no index, manifest, or
ordering record to keep in step with them.

We expect no rewriting of asset references because the acceptance project
references its images by root-relative paths into two different asset trees
(the acceptance-project review note), and a rewrite would be an edit Alice
did not make — forbidden by the same discipline the concatenation check
measures.

## Scope Conditions

- Platform: the desktop app only, in the Tauri 2 shell on macOS
  (adr-2609051324137479). The single HTML file does not import a flat
  manuscript, and neither does the iPad.
- Population: Alice, the maintainer, working alone on one document at a
  time. There is no queue, no batch, and no second author.
- Input assumption: the dropped file is Pandoc-compatible Markdown. This
  moment does not convert from other formats, and it does not translate any
  private convention in the file into the canon — translation would be an
  edit, and the concatenation check would fail.
- Direction: one-way, from a flat file to a folder of chapters. Writing a
  folder back out as one flat file is not part of this moment.
- Assets: import moves, copies, converts, and de-duplicates nothing. Map
  #4 (itd-2609051335420536) owns copied assets and map #15
  (itd-2609051335541009) owns referenced ones; whatever the manuscript
  points at stays exactly where it is and is referred to exactly as it was.
- Boundary with map #1 (itd-2609051335399446, "Open a folder and see the
  book"): 13 owns writing the split — the confirmation Alice gives, the
  folder, the numbered chapter files, and the fidelity of what is written.
  Reading a folder that already exists, drawing the sidebar, and showing
  what each chapter carries belong to #1, including when the folder being
  opened is the one this import just wrote.
- Boundary with map #18 (itd-2609051335586905, "Edit on the iPad and bring
  the text back"): both are hard tests of the same fidelity promise, in
  opposite directions. 13 owns the one-way desktop split of a whole
  manuscript; 18 owns the export-edit-re-import loop through the single
  file, including matching an edited chapter back to the chapter it came
  from.
- This surface does not render to a reader: it writes files and shows a
  confirmation in the desktop app. Legibility at reader widths binds
  through the renderings that consume the result, map #9
  (itd-2609051335489928) and map #5 (itd-2609051335447894).

## Acceptance Criteria

- Given a flat manuscript of some 814 lines with 177 headings at four
  levels, When Alice drops it on Editor and confirms the import, Then
  Editor writes one folder containing one Markdown file per level-one
  heading, prefixed `01-`, `02-`, and so on in source order, and every
  level-two, level-three, and level-four heading appears inside the chapter
  it came from.
- Given that import, When the chapter files are concatenated in filename
  order, Then the result is byte-identical to the file Alice dropped: no
  line rewrapped, including one of 544 characters; no table realigned; no
  character re-escaped; and no trailing whitespace or blank line added or
  removed.
- Given a manuscript carrying HTML comments, among them the page-break
  comments a print route depends on, When it is imported, Then every
  comment is present in the chapter it belongs to, in its original position
  and spelling, and none is interpreted, moved, or dropped.
- Given a manuscript whose image references are root-relative paths into an
  asset tree, one of them percent-encoded and containing a space, When it
  is imported, Then no reference is rewritten and no file is copied,
  converted, or de-duplicated, and the concatenation check above still
  holds.
- Given a manuscript containing a fenced div written as
  `::: {.variant variant="talk"}` with `:::` closing it, and an image
  written as
  `![The lantern at dusk](assets/lantern.jpg "Photograph by Carol"){.full-bleed}`,
  When it is imported, Then both arrive in their chapter character for
  character, attributes and quoting included.
- Given a flat file with no level-one heading at all, When Alice confirms
  the import, Then Editor refuses it, says which heading it needed and did
  not find, and writes nothing to disk — no folder, no partial chapter, and
  no file left half-written.
- Given a manuscript with exactly one level-one heading, When Alice imports
  it, Then Editor writes the degenerate case — one folder holding one
  numbered Markdown file — rather than refusing it as too small to be a
  book.
- Inherits: round-trip byte-fidelity (this moment is its first hard test);
  no machine in the document; one source, always; degrade gracefully in a
  plain tool; network only on publish.

## Open Questions

- Where document metadata lives — a YAML file at the document root or front
  matter in the first chapter (03-evidence, "Document model and canon").
  Import is the moment that must write it for a manuscript that has none,
  so the answer decides what appears beside the chapters and whether
  writing it can disturb the first chapter's bytes.
- Whether the sidebar edits structure, dragging a chapter between Parts, or
  whether structure edits stay in the file system for the first release
  (03-evidence, "Document model and canon"). If they stay in the file
  system, the split may write one folder of chapters and leave Alice to
  make Parts by hand; if the sidebar edits structure, import has a shape to
  propose.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
