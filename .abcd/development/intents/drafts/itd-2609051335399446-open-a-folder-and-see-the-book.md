---
id: itd-2609051335399446
slug: open-a-folder-and-see-the-book
spec_id: null
kind: null
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: editing-surface
supersedes: [itd-2609051221553568, itd-2609051317429272]
---

# Open a folder and see the book

## Press Release

Alice chooses a folder on her machine and Editor opens it as a book. The
sidebar shows exactly what is there: each Part is a folder, each Chapter
is a Markdown file inside it, and inside each Chapter the Sections,
Sub-sections, and Sub-sub-sections drawn from its second, third, and
fourth heading levels. The numeric prefixes on the file and folder names
give the order. Alice clicks any node and that chapter opens in the
editing surface, scrolled to that heading with the cursor on it.

There is no import step, no index file, and nothing to keep in step by
hand. The sidebar is the folder, so it cannot disagree with it. Alice
renames a chapter in the Finder from `03-method.md` to `05-method.md`,
and Editor reloads: the chapter has moved in the sidebar, and no other
file in the document folder has been touched. She adds a chapter by
putting a Markdown file into a Part. She reorders the book by renaming.

A folder with one Part and one chapter opens just as readily as a book of
five Parts, so a set of talk notes is not a lesser case of anything. And
because the structure is the file system and the text is plain Markdown,
the folder Alice opens in Editor is the same folder Emacs opens, the same
folder her backup copies, and the same folder she will still be able to
read when Editor is not in front of her.

## Why This Matters

Alice's material is either one long file whose structure lives inside its
headings, or a folder shadowed by an index that something has to keep
current. Both make a second record of the same truth, and second records
drift: the acceptance project already holds three copies of one text, one
of them thirty lines out of date, with nothing reconciling them
(`03-evidence.md`). Opening the folder and seeing the book removes the
second record entirely — there is one place the order is written, it is
the file names, and every tool she owns can edit it.

## Mechanism

- We expect the sidebar never to disagree with the folder because it
  keeps no ordering of its own: order comes from the numeric prefix on
  the file or folder name and nothing else records it, so renaming is
  reordering (`05-internals.md` section 1). The claim is falsified the
  moment any reorder requires writing a second file.
- We expect four levels of hierarchy to be the right depth because the
  acceptance project carries 177 headings at exactly four levels, with
  two thirds of them at the fourth (`03-evidence.md`). A tree that stops
  at three would hide two thirds of a real document.
- We expect reloading the whole book on every external change to stay
  imperceptible because the text of a demanding real document is about
  7,900 words over 814 lines, while its 2.5 GB of assets are never read
  to draw the tree (`03-evidence.md`).
- We expect Alice to accept the file system as the structure editor
  because renaming already reorders in Finder, in a terminal, and in
  Emacs, so the gesture she learns in Editor is one she can perform when
  Editor is closed.
- We expect the article prototype's hierarchy to map without translation
  because it uses two heading levels below the title and Chapter,
  Section, and Sub-section land on them directly (`03-evidence.md`).

## Scope Conditions

- Platform: the desktop app only — a Tauri 2 shell around the macOS
  system web view (`02-constraints.md`). Reading views and the single
  HTML file are not in scope here.
- Population: Alice, one author, one document folder open at a time.
  Collaboration and concurrent editing from two devices are out of scope
  for the product (`06-delivery.md`).
- Assumption: document-level metadata is read from `document.yaml` at the
  document root, which `05-internals.md` assumes and `03-evidence.md`
  leaves open.
- Boundary with map #13, `itd-2609051335529787` (Bring an old single-file
  manuscript in): 13 owns writing the split that creates a chapter
  folder; 1 owns reading whatever is already on disk. Dropping a flat
  manuscript on Editor is out of scope here, and 1 makes no promise about
  folders it did not find.
- Boundary with map #14, `itd-2609051335537470` (Write one text for two
  audiences): 1 owns the tree, its ordering, and opening a node; 14 owns
  the variant badges beside a chapter and what they mean. In this phase
  the sidebar carries no variant badge.
- Boundary with the phase: `06-delivery.md` excludes variants, citations,
  and referenced assets from phase 1, so the asset counts and unresolved
  citation marks that `04-surfaces.md` describes beside a chapter arrive
  with map #11, `itd-2609051335502171`, and map #15,
  `itd-2609051335541009`. What ships here is the tree and its labels.
- Bundle: member of the Editing surface bundle with map #2,
  `itd-2609051335406422`, and map #3, `itd-2609051335415528`. One spec,
  and none of the three ships alone — a sidebar with no editor is a file
  browser.
- Plumbing inherited, not owned: the on-disk model, the parse tree, and
  folder watching (`05-internals.md`).

## Acceptance Criteria

- Given a document folder holding `01-beginnings/` and `02-findings/`,
  each with numbered chapter files, When Alice opens the folder, Then the
  sidebar lists both Parts in prefix order, lists each Part's Chapters in
  prefix order beneath it, and labels each Chapter with its level-one
  heading.
- Given a chapter containing `## Beginnings`, `### The first year`, and
  `#### A note on dates`, When Alice expands that chapter in the sidebar,
  Then all three appear as Section, Sub-section, and Sub-sub-section
  nodes, nested and in source order.
- Given the sidebar is showing that chapter, When Alice clicks the
  `#### A note on dates` node, Then the chapter opens in the editing
  surface scrolled to that heading with the cursor on it.
- Given the document is open in Editor, When Alice renames
  `03-method.md` to `05-method.md` in the Finder, Then the sidebar shows
  the chapter in its new position without Alice reopening the folder, and
  every file in the document folder is byte for byte what it was apart
  from the rename.
- Given a single-chapter document — one folder, one Markdown file, one
  `assets/` folder beside it — When Alice opens it, Then the sidebar
  shows that one Chapter with its headings, with no empty Part row and no
  error.
- Given a folder holding no Markdown file at any depth, When Alice opens
  it, Then Editor reports that the folder holds no chapters, shows an
  empty sidebar, and writes no file of any kind inside that folder.
- Given the desktop app window narrowed to iPad width, When Alice opens a
  document whose deepest chapter title runs to sixty characters, Then the
  sidebar and the editing surface remain legible side by side or stacked,
  with no horizontal scrolling and no pinch zoom.
- Given a document is open and the machine has no network connection,
  When Alice browses the sidebar and opens every chapter in the book,
  Then every action succeeds and no network request is attempted.
- Inherits: round-trip byte-fidelity (`itd-2609051336074533`); no machine
  in the document (`itd-2609051336080960`); one source, always
  (`itd-2609051336090390`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); legible on three device classes
  (`itd-2609051336128348`); network only on publish
  (`itd-2609051336158553`).

## Open Questions

- Whether the sidebar edits structure at all. `03-evidence.md` leaves
  open "whether the sidebar edits structure — dragging a chapter between
  Parts — or whether structure edits stay in the file system for the
  first release". This intent is written for the second answer; the first
  would add a gesture, not change the tree.
- Where document metadata lives: `03-evidence.md` leaves open whether it
  sits in "a YAML file at the document root, or front matter in the first
  chapter", which decides where the sidebar reads the book's title from.
- How a reload behaves against unsaved work. `03-evidence.md` leaves open
  "how concurrent edits from two devices are detected so that
  last-write-wins can be reported rather than silently applied"; the same
  question decides what Editor does when a chapter changes on disk while
  Alice has it open and edited.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
