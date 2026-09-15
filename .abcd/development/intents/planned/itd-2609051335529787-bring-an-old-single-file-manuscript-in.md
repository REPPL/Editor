---
id: itd-2609051335529787
slug: bring-an-old-single-file-manuscript-in
spec_id: spc-2609151652321002
kind: standalone
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
formatting habits inside it. She chooses Import, points Editor at the
file, and Editor shows her what it proposes to write — a document folder
beside the file, holding the document's metadata and one Part of
chapters, one chapter file for each top-level level-one heading, numbered
in the order they appear, with the name it will give each one — and she
confirms. The folder appears, and the book she has been carrying in one
buffer opens as a Part of chapters, with the document's title beside it.
The file she started from is still exactly where it was, untouched, so
she can compare the two at her leisure.

Whatever she wrote before her first level-one heading has a home too: it
goes into a front-matter chapter at the head of the Part, character for
character, so nothing is left over and nothing is silently swallowed.
Where that preamble carries a block of document metadata, the keys the
document knows — a title, a subtitle, an abstract — are copied into the
document's own metadata file; the block itself stays in the chapter
exactly as she wrote it.

Nothing in the text has changed. The line she once let run to five hundred
characters is still one line. The table she aligned by hand is aligned the
way she aligned it. The comments she wrote to control page breaks sit
where she left them, and the paths she typed to her images are the paths
she typed. If she concatenates the chapter files in their numbered order
she gets back the file she started from, byte for byte, and she can prove
it with a command she already knows.

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
in the parse tree carries its source span — UTF-8 byte offsets into the
text (05-internals section 2) — and the split never re-serialises: the
shell reads the file's bytes, the web view returns the cut offsets and
heading texts from `parseChapter`, and the shell slices its own bytes at
those offsets and writes each slice through the atomic chapter writer. Byte
fidelity then holds by construction rather than by a string surviving a
round trip. This is falsifiable in one command: concatenate the chapters in
numeric-prefix order and compare with the original.

We expect the cut points to be the parser's top-level heading blocks of
level one, after its fold, rather than every line beginning with `#`,
because that is the only reading under which a two-line title stays one
title and a `#` inside a fence or a fenced div stays where it is. A
level-one heading nested inside a fenced div is therefore not a cut point,
and the confirmation names it so Alice can see the chapter it will stay in.

We expect the fourth heading level to survive because the document model
carries headings two, three, and four as Section, Sub-section, and
Sub-sub-section, and the acceptance project puts two thirds of its 177
headings at the fourth level (03-evidence, "The acceptance project"). A
model that stopped at three levels would fail visibly on two thirds of the
document rather than subtly.

We expect import to be the first hard test of round-trip byte-fidelity
because the same document carries the hazards a normalising writer silently
eats: 544-character lines, page-break comments a print route depends on,
and a percent-encoded folder path containing a space (03-evidence). Each is
a specific thing to compare, not a general hope.

We expect one gesture to be enough because order lives in the numeric
filename prefix and nothing else records it (05-internals section 1), so
the split writes files and directories and has no index, manifest, or
ordering record to keep in step with them.

We expect the result to be a document folder holding one Part rather than
a bare set of chapters because the document model always has a Part folder
above a chapter and the metadata file at the root (05-internals section 1),
and map #1 reads only chapters inside Parts. An import that wrote chapters
at the document root would produce a folder that the rest of Editor cannot
open.

We expect the filenames to be predictable because the slug rule already
ships: `slugify` in the shell's new-document code folds accents, lowercases
to ASCII, and reduces every non-alphanumeric run to one hyphen, and every
chapter carries its own numeric prefix, so two identically titled headings
never collide as filenames. Falsifiable in one run: import a manuscript
with two identically titled headings and read the two names.

We expect no rewriting of asset references because the acceptance project
references its images by root-relative paths into two different asset trees
(the acceptance-project review note), and a rewrite would be an edit Alice
did not make — forbidden by the same discipline the concatenation check
measures.

## Scope Conditions

- Platform: the desktop app only, in the Tauri 2 shell on macOS <!-- cond: cond-2609151652324770 -->
  (adr-2609051324137479). The single HTML file does not import a flat
  manuscript, and neither does the iPad.
- Population: Alice, the maintainer, working alone on one document at a <!-- cond: cond-2609151652321403 -->
  time. There is no queue, no batch, and no second author.
- Input assumption: the file is Pandoc-compatible Markdown in valid UTF-8. <!-- cond: cond-2609151652325708 -->
  This moment does not convert from other formats, refuses a file that is
  not UTF-8 before writing anything, and does not translate any private
  convention in the file into the canon — translation would be an edit, and
  the concatenation check would fail.
- Trigger: the Import command — the third choice in the `C-x C-o` <!-- cond: cond-2609151652322244 -->
  chooser — never a drop. A Markdown file dropped on a
  Part keeps its shipped meaning, one chapter copied as it is; a file
  dropped on the text keeps its shipped meaning, a link. Import is the one
  way a flat manuscript becomes a folder (05-internals section 5, "The
  shell").
- Metadata: only a known key whose value has the shape the document's <!-- cond: cond-2609151652323138 -->
  metadata file carries is copied — a title, a subtitle, an abstract as
  plain strings. A known key in another shape is not copied and is named in
  the confirmation, so the minted file always reads back.
- Direction: one-way, from a flat file to a folder of chapters. Writing a <!-- cond: cond-2609151652329342 -->
  folder back out as one flat file is not part of this moment.
- Assets: import moves, copies, converts, and de-duplicates nothing. Map <!-- cond: cond-2609151652323785 -->
  #4 (itd-2609051335420536) owns copied assets and map #15
  (itd-2609051335541009) owns referenced ones; whatever the manuscript
  points at stays exactly where it is and is referred to exactly as it was.
- Boundary with map #1 (itd-2609051335399446, "Open a folder and see the <!-- cond: cond-2609151652329695 -->
  book"): 13 owns writing the split — the confirmation Alice gives, the
  folder, the numbered chapter files, and the fidelity of what is written.
  Reading a folder that already exists, drawing the sidebar, and showing
  what each chapter carries belong to #1, including when the folder being
  opened is the one this import just wrote.
- Boundary with map #18 (itd-2609051335586905, "Edit on the iPad and bring <!-- cond: cond-2609151652321216 -->
  the text back"): both are hard tests of the same fidelity promise, in
  opposite directions. 13 owns the one-way desktop split of a whole
  manuscript; 18 owns the export-edit-re-import loop through the single
  file, including matching an edited chapter back to the chapter it came
  from. A flat manuscript is imported through the Import command, an
  edited chapter through the Re-import command: they are two commands
  because they are two moments, and neither is a drop on the editor text,
  which is map #4's.
- Boundary with map #29 (itd-2609051402191319, "Start a new document"): <!-- cond: cond-2609151652320322 -->
  both write a document folder that did not exist. 13 writes one from a
  manuscript Alice already has; 29 writes the smallest one for an author
  with nothing written yet.
- Boundary with map #14 (itd-2609051335537470, "Write one text for two <!-- cond: cond-2609151652326541 -->
  audiences"): the acceptance project carries three variants of one text,
  so a real manuscript arrives already marked. 13 carries every mark
  through character for character and interprets none of them, and the
  minted metadata declares no variant; marking, declaring the variant set,
  and previewing are 14's.
- This surface does not render to a reader: it writes files and shows a <!-- cond: cond-2609151652327928 -->
  confirmation in the desktop app, and the legibility discipline binds
  here only over that confirmation, at 390, 820, and 1280 CSS px.
  Legibility of the imported text binds through the renderings that
  consume the result, map #9 (itd-2609051335489928) and map #5
  (itd-2609051335447894).

## Acceptance Criteria

- Given a flat manuscript with headings at four levels, When Alice confirms
  the import, Then Editor writes one document folder beside the file, named
  for it, holding the document's metadata file and one Part, `01-chapters/`,
  the same name a new document is given; inside the Part, one Markdown file
  per top-level level-one heading,
  prefixed `01-`, `02-`, and so on in source order; and every level-two,
  level-three, and level-four heading appears inside the chapter it came
  from.
- Given that import, When the chapter files are concatenated in
  numeric-prefix order, Then the result is byte-identical to the file Alice
  started from: no line rewrapped, including one of 544 characters; no
  table realigned; no character re-escaped; no line ending changed; and no
  trailing whitespace or blank line added or removed.
- Given a manuscript with a block of text before its first level-one
  heading, When it is imported, Then that text is written as the Part's
  first chapter, `00-front-matter.md`, ahead of the numbered chapters,
  character for character as it stood, and the heading chapters still
  begin at `01-`.
- Given a preamble that is a metadata block with keys the document knows —
  a title, a subtitle, an abstract — When it is imported, Then those values
  are copied into the document's metadata file, the block stays in the
  front-matter chapter byte for byte, every key the document does not know
  is left where Alice wrote it and copied nowhere, and the minted metadata
  file reads back through the shell's own reader.
- Given the import has completed, When the file Alice started from is
  read, Then it is byte for byte what it was and still sits where it sat:
  the import writes a folder beside it and never moves, renames, or deletes
  the source.
- Given a manuscript whose first level-one heading is `The Lantern
  Papers: Notes & Queries` and which carries a second heading of exactly
  the same words, When it is imported, Then both chapter names are the
  shipped slug of that heading — accents folded, lowercase ASCII, each run
  of non-alphanumerics reduced to one hyphen — told apart by their numeric
  prefixes alone, and both headings inside the files are character for
  character what Alice wrote.
- Given a manuscript with no document metadata of any kind, When Alice
  confirms the import, Then Editor writes the document's metadata file with
  the title taken from the first level-one heading and the same two
  defaults a new document is given, and no other key.
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
  character, attributes and quoting included, and the minted metadata
  declares no variant.
- Given a level-one heading written inside a fenced div, When the manuscript
  is imported, Then the div is not cut: the heading stays in the chapter
  that encloses the div, and the confirmation names the line so Alice sees
  where it will land.
- Given a two-line title — two level-one headings on adjacent lines, which
  the parser folds into one heading — When the manuscript is imported, Then
  they are one chapter, not two.
- Given a flat file with no top-level level-one heading at all, When Alice
  confirms the import, Then Editor refuses it, says which heading it needed
  and did not find, and writes nothing to disk — no folder, no partial
  chapter, and no file left half-written.
- Given a file that is not valid UTF-8, or a file that already sits inside
  a document folder, or a folder of the document's name already beside the
  file, When Alice chooses it, Then Editor refuses before writing anything
  and says which of the three it found.
- Given a write that fails after some chapters are written, When the
  failure is reported, Then nothing is left behind: no half-book, no
  partial Part, and the source untouched.
- Given a manuscript with exactly one level-one heading, When Alice imports
  it, Then Editor writes the degenerate case — one document folder holding
  one Part holding one numbered Markdown file — rather than refusing it as
  too small to be a book.
- Given the import confirmation showing what will be written, When the app
  window is at 1280 CSS px, at 820 CSS px, and at its narrowest width of
  390 CSS px, Then the proposed folder name and every proposed chapter name
  are fully legible at each width with no horizontal scrolling.
- Given a committed fixture of three headings, a 544-character line, a
  ragged table, a page-break comment, and a CRLF variant, When the suite
  runs, Then the split and the concatenation check pass on it; and Given
  the maintainer's own manuscript, When it is imported by hand, Then the
  result is recorded in the acceptance log, never in anything committed.
- Given the how-to page on opening a file or a folder, When this moment
  ships, Then the page describes Import in the present tense and no longer
  tells Alice to build the folder around a file by hand.
- Inherits: round-trip byte-fidelity (`itd-2609051336074533`) — this
  moment is its first hard test; no machine in the document
  (`itd-2609051336080960`); one source, always (`itd-2609051336090390`);
  legible on three device classes (`itd-2609051336128348`), at 390, 820,
  and 1280 CSS px.

## Open Questions

- Answered 2026-09-15 by the maintainer, in the planning interview: Import
  is the third choice in the `C-x C-o` chooser, beside "A document folder"
  and "A single Markdown file", and travels the chooser's nonce pattern; the
  Part is `01-chapters/`, the rule every folder Editor writes now shares,
  and the earlier line, the glossary, and the intent map are corrected to
  it; the minted metadata declares no variant, and every mark is carried
  through untouched for map #14 (itd-2609051335537470) to declare.
- Still open, and not this moment's to answer: how Alice later cuts the one
  Part into several — in the sidebar or in the Finder — which is the
  brief's question about whether the sidebar edits structure (03-evidence,
  "Document model and canon").

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._

## Grounds

- pursued: we expect a real manuscript to arrive whole with the concatenation check passing untouched by hand; wrong if any of its hazards, a 544-character line, a hand-aligned table, a page-break comment, needs a fix after import
