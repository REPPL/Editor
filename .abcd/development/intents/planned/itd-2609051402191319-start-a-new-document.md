---
id: itd-2609051402191319
slug: start-a-new-document
spec_id: spc-2609061318158586
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Start a new document

## Press Release

Alice has a talk to write and nothing written yet. She chooses New
document, types a title, and picks the folder to put it in. Editor writes
the smallest thing that is already a book: the document's metadata beside
one Part folder holding one Chapter, with the title she typed as that
chapter's own heading and the cursor sitting on the blank line beneath it.
The sidebar shows one Part and one Chapter. She starts typing.

Nothing was invented on her behalf. There is no sample text, no
placeholder chapter about how to use Editor, no template she has to delete
before she can write. The metadata holds what she gave — the title — and
the defaults the design already has: the size above which an asset is
referenced rather than copied, and the citation style. It holds no id
yet, because an id is minted the first time she publishes and a document
that has never been published does not have one.

What she has after ten seconds is a folder of plain files she owns. She
can close Editor and open the same folder in Emacs, put it under version
control, back it up, or hand it to Carol, and everything in it is readable
without Editor in front of her. When she is ready for a second chapter she
puts a Markdown file into the Part, and when she is ready for a second
Part she makes a folder — because the structure is the file system, and it
was the file system from the first second.

## Why This Matters

Every other moment in the design begins with a document folder that
already exists, and nothing said where the first one comes from. Two
routes were assumed and only one was owned: map #13 writes a folder by
splitting a manuscript, and map #1 opens a folder that is already there.
An author with no manuscript had to build the shape by hand — a folder, a
numbered folder inside it, a numbered file inside that, and a metadata
file whose keys she would have to know — before any of the rest of Editor
would work at all. It is also where the variants a document declares, the
bibliography it names, and the threshold it sorts assets by first come
into existence, so it is the moment that decides whether those live in one
predictable place from the start or accumulate later by hand.

## Mechanism

- We expect one Part holding one Chapter to be the right minimum because
  the design already names it as the degenerate case rather than a special
  one: "a single-chapter document is a folder with one file"
  (`02-constraints.md`), and `05-internals.md` section 1 gives it a shape.
  A document that begins in the general shape never needs converting into
  it.
- We expect the metadata file to be written at creation rather than at
  first publish because everything else reads it: the declared variants,
  the bibliography, the citation style, and the asset threshold are all
  answers other moments need before a document is ever published
  (`05-internals.md` section 1). Falsifiable: any moment that has to
  invent a default because the file is absent shows the file was written
  too late.
- We expect no id to be written at creation because the id is minted on
  first publish and is a document's identity on the site
  (`05-internals.md` section 9). A document that has never been published
  has no site identity, and inventing one early would create an id that
  might never be used and a link that has never existed.
- We expect creating a document to be silent on the network because
  nothing about it leaves the machine: it writes files inside the folder
  Alice named and nothing else (`02-constraints.md`, network only on
  publish).
- We expect a title typed once to be enough because the title is what
  names the book in the sidebar and heads the article and the paper, and
  the chapter's own level-one heading is where a chapter title lives
  (`05-internals.md` section 1). Falsifiable: if the author must type the
  title twice, once for the metadata and once as a heading, the moment has
  not finished its job.
- We expect nothing to be seeded beyond that because a template is a
  second copy of a document nobody wrote: the author would delete it, and
  the file that survived deletion by accident would be the one nobody
  meant.

## Scope Conditions

- Platform: the desktop app on macOS, Tauri 2 around the system web view. <!-- cond: cond-2609061318159118 -->
  Creating a folder on disk is a shell capability (`05-internals.md`
  section 5); the single HTML file creates no documents.
- Population: Alice, the author, creating one document in a folder she <!-- cond: cond-2609061318150427 -->
  chooses. There is no account, no workspace, and no project registry.
- Phase: phase 1. Everything else in phase 1 assumes an open document, so <!-- cond: cond-2609061318158892 -->
  this is where a document without a manuscript behind it begins.
- Assumption: the document's metadata lives in one file at the document <!-- cond: cond-2609061318154636 -->
  root, and a chapter's own front matter carries chapter-level metadata
  only.
- Assumption: what is written at creation is the title Alice typed plus <!-- cond: cond-2609061318152334 -->
  the design's own defaults. Variants, a bibliography, and a changed
  threshold are declared later, by the moments that own them.
- Boundary with map #1, `itd-2609051335399446` (Open a folder and see the <!-- cond: cond-2609061318152083 -->
  book): 1 owns reading a folder that already exists and drawing the tree
  from it, including the folder this moment just wrote. 29 owns writing
  the smallest folder that 1 can read.
- Boundary with map #13, `itd-2609051335529787` (Bring an old single-file <!-- cond: cond-2609061318159734 -->
  manuscript in): 13 owns the other route in — a flat manuscript split into
  a Part of chapters, with the metadata minted from what the manuscript
  carries. 29 owns the route in for an author with nothing written yet,
  and writes no chapter text at all.
- Boundary with map #27, `itd-2609051402126424` (Set the size threshold <!-- cond: cond-2609061318159508 -->
  and name an asset root): 29 writes the default threshold and no roots.
  Changing either afterwards is 27's.
- Boundary with map #14, `itd-2609051335537470` (Write one text for two <!-- cond: cond-2609061318153050 -->
  audiences): the declared variants and the default variant live in the
  metadata this moment writes, but declaring them is 14's. A document
  created here declares none, and renders as it does with none.
- Boundary with map #7, `itd-2609051335468596` (Publish and get a link I <!-- cond: cond-2609061318157197 -->
  can open from the lectern): 7 mints the stable id on first publish and
  writes it into the metadata. 29 writes the metadata without one.
- Boundary with map #11, `itd-2609051335502171` (Cite from a bibliography <!-- cond: cond-2609061318157252 -->
  file): 11 owns the bibliography and the citation style. A document
  created here names no bibliography file, and a document with none is an
  ordinary case rather than an error.
- Excluded as plumbing: the metadata file's exact keys and the atomic file <!-- cond: cond-2609061318158123 -->
  writes that create the folder (`05-internals.md` sections 1 and 5).

## Acceptance Criteria

- Given Alice chooses New document, types the title `The Lantern Papers`,
  and names an empty folder, When she confirms, Then that folder holds the
  document's metadata carrying that title, one numbered Part folder, and
  one numbered Chapter file inside it whose level-one heading is that
  title.
- Given that document has just been created, When Editor shows it, Then
  the sidebar lists one Part and one Chapter, the chapter is open in the
  editing surface, and the cursor sits on the blank line beneath its
  heading with no other text anywhere in the file.
- Given that document has just been created, When its metadata is read,
  Then it carries the title, the default asset threshold, and the default
  citation style, and it carries no id, no declared variants, and no
  bibliography file.
- Given the newly created document, When Alice closes Editor and opens the
  same folder in a plain Markdown tool, Then every file in it is readable
  as it stands, and no file contains an absolute path, a user name, or a
  machine name.
- Given Alice names a folder that already holds a document, When she
  confirms creation there, Then Editor refuses, says what it found, and
  writes nothing at all — no folder, no metadata, and no partial chapter.
  (Negative case.)
- Given Alice types a title containing punctuation and non-ASCII
  characters, When the document is created, Then the Part and Chapter
  names are derived by the slug rule — lowercase ASCII, non-alphanumerics
  reduced to hyphens, collapsed — while the heading inside the chapter
  carries the title exactly as she typed it, character for character.
- Given the newly created document, When Alice adds a second Markdown file
  to the Part in the Finder, Then the sidebar shows two Chapters in prefix
  order and no other file in the folder has changed.
- Given the app window narrowed to 820 CSS px and again to 390 CSS px,
  When the New document panel is open, Then the title field, the folder
  choice, and the confirmation are fully legible with no horizontal
  scrolling and no pinch zoom.
- Given a document is created with the machine offline, When outbound
  network activity is observed, Then no request leaves the machine and the
  document is created in full.
- Inherits: no machine in the document (`itd-2609051336080960`); one
  source, always (`itd-2609051336090390`); round-trip byte-fidelity
  (`itd-2609051336074533`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); network only on publish
  (`itd-2609051336158553`); legible on three device classes
  (`itd-2609051336128348`).

## Open Questions

- The default size threshold between copied and referenced assets
  (`03-evidence.md`, open questions, "Assets"), which is one of the
  defaults this moment writes.
- Which citation styles ship first (`03-evidence.md`, open questions,
  "Citations"), which decides what the default style written here is.
- Whether the first Part is named from the title or given a neutral name,
  which matters because renaming a Part is renaming a folder and the
  document's first folder is the one an author is least likely to rename.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
