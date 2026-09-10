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

<!-- abcd-review: INGESTED receipt=rcp-9c4986bcbb38 -->
Fidelity review — receipt rcp-9c4986bcbb38 (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:b982c496a86313608d8b22bd9c5c34dcec34f0446a4ae9376a747f741c9bcc01
Input attestations: diff:c1bcf7b..cae1734@sha256:4a5e182af9d3f4549b332eff9cf5e02954a79320d0844b9f6d74d8d0a15cfc16; intent:.abcd/development/intents/shipped/itd-2609051402191319-start-a-new-document.md@-; spec:.abcd/development/specs/closed/spc-2609061318158586-start-a-new-document.md@-; checklist:.abcd/.work.local/logs/acceptance/spc-2609061318158586.md (M29-1..M29-5, every row unticked)@-; test-run:npx vitest run src/core/render/article-keys.test.ts src/core/render/reading-keys.test.ts src/emacs-keys.test.ts src/local-documents.test.ts src/preview.test.ts src/export/services.test.ts src/new-document-panel.test.ts src/outline-commands.test.ts src/open-source.test.ts src/focus.test.ts — 10 files, 287 tests passed, 0 failed@-; test-run:cargo test --manifest-path src-tauri/Cargo.toml new_document — 13 passed, 0 failed@-;

Acceptance rollup: MET 4 · MET_WITH_CONCERNS 2 · NOT_MET 0 · INCONCLUSIVE 4

Per-criterion verdicts:
- ac-1 — MET: create_document on an empty temp dir writes document.yaml with the title, one Part 01-chapters, and one chapter 01-the-lantern-papers.md whose text is exactly the level-one heading plus a blank line, with the root holding exactly two entries
  evidence: src-tauri/src/new_document.rs:447 — "fn creates_the_smallest_book_a_document_can_be()"
  evidence: src-tauri/src/new_document.rs:459 — "assert_eq!(text, "# The Lantern Papers\n\n");"
  evidence: src-tauri/src/new_document.rs:277 — "document::write_chapter_text(&chapter_path, &format!("# {title}\n\n"))?;"
- ac-2 — INCONCLUSIVE: the page wires openFolder, openChapter, revealLine(view, 2) and focus.toEditor in main.ts, and the chapter's content is proven to be the heading and one blank line; but no test drives afterDocumentCreated, and the checklist row that would confirm the sidebar, the open chapter and the cursor (M29-1) is unticked
  evidence: src/main.ts:250 — "revealLine(app.view, 2);"
  evidence: src-tauri/src/new_document.rs:459 — "assert_eq!(text, "# The Lantern Papers\n\n");"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158586.md:563 — "- [ ] The cursor (and the modeline's line/column) sits on the blank line"
- ac-3 — MET: reading the written document.yaml back through metadata::read_metadata yields the title, asset_threshold_bytes 8388608, citation_style numeric, id None, empty variants and bibliography None; the file's bytes are exactly three keys
  evidence: src-tauri/src/new_document.rs:481 — "fn reads_back_with_no_id_no_variants_and_no_bibliography()"
  evidence: src-tauri/src/new_document.rs:465 — ""title: The Lantern Papers\nasset_threshold_bytes: 8388608\ncitation_style: numeric\n""
- ac-4 — MET: both files are read back with fs::read_to_string and asserted byte-exact as plain YAML and plain Markdown carrying only the title and defaults, which leaves no room for a path, a user name or a machine name in either
  evidence: src-tauri/src/new_document.rs:463 — "fs::read_to_string(root.join(metadata::METADATA_FILE))"
  evidence: src-tauri/src/new_document.rs:465 — ""title: The Lantern Papers\nasset_threshold_bytes: 8388608\ncitation_style: numeric\n""
- ac-5 — MET: a folder holding a document.yaml, or a chapter under a Part, is refused by what_it_already_holds before any write, and both tests assert 01-chapters does not exist afterwards; the panel shows the shell's message
  evidence: src-tauri/src/new_document.rs:535 — "fn refuses_a_folder_that_already_holds_a_document_yaml_and_writes_nothing()"
  evidence: src-tauri/src/new_document.rs:544 — "fn refuses_a_folder_that_already_holds_a_chapter_and_writes_nothing()"
  evidence: src-tauri/src/new_document.rs:174 — "fn what_it_already_holds(root: &Path) -> Option<&'static str>"
  evidence: src/new-document-panel.test.ts:132 — "shows the shell's own refusal and requires the folder to be chosen again"
- ac-6 — MET_WITH_CONCERNS: the heading is written as the title verbatim while the chapter name is slugged; concerns: fold_accent turns an accented letter into its plain letter (Café -> cafe) rather than reducing every non-alphanumeric to a hyphen as the criterion words the rule, the title is trimmed before writing, and DECISIONS.md line 150 still records the opposite behaviour (accents hyphenated)
  evidence: src-tauri/src/new_document.rs:498 — "fn writes_the_heading_exactly_as_typed_while_the_slug_folds_it_down()"
  evidence: src-tauri/src/new_document.rs:82 — "fn fold_accent(ch: char) -> Option< char>"
  evidence: src-tauri/src/new_document.rs:443 — "assert_eq!(slugify(" Café, 1999 "), "cafe-1999");"
  evidence: .abcd/work/DECISIONS.md:150 — "the Rust rule instead treats any non-ASCII letter as ordinary punctuation and hyphenates it"
- ac-7 — INCONCLUSIVE: nothing in the range exercises a second file added to the Part by hand; the walk and ordering this relies on are map #1's pre-existing code, and the checklist row M29-4 is unticked
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158586.md:595 — "- [ ] With the document open, add a second `.md` file directly into the Part"
  evidence: src-tauri/src/document.rs:688 — "fn orders_numbered_siblings_before_unnumbered_ones()"
- ac-8 — INCONCLUSIVE: the panel test asserts no px width in the panel's stylesheet block and overflow-wrap on the folder line, which is structural; jsdom has no layout engine and M29-2 is unticked
  evidence: src/new-document-panel.test.ts:205 — "carries no fixed width and breaks a long folder name"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158586.md:571 — "- [ ] At 820 CSS px: open the panel."
- ac-9 — INCONCLUSIVE: new_document.rs contains no HTTP client and its only I/O is std::fs, and the panel test file spies on no network call; the absence is structural rather than proven by a test, and the offline row M29-5 is unticked
  evidence: src-tauri/src/new_document.rs:204 — "pub fn create_document(destination: &Path, title: &str) -> Result< NewDocumentOutcome, String>"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158586.md:609 — "- [ ] Disconnect the machine from the network"
- ac-10 — MET_WITH_CONCERNS: no machine in the document and degrade-gracefully are proven by byte-exact read-back of plain files, one source by the title being typed once and landing in both heading and metadata; concerns: round-trip byte-fidelity is declared not applicable, and legibility and network-only-on-publish rest on unticked M29-2 and M29-5
  evidence: src-tauri/src/new_document.rs:465 — ""title: The Lantern Papers\nasset_threshold_bytes: 8388608\ncitation_style: numeric\n""
  evidence: src-tauri/src/new_document.rs:498 — "fn writes_the_heading_exactly_as_typed_while_the_slug_folds_it_down()"
  evidence: src/new-document-panel.test.ts:205 — "carries no fixed width and breaks a long folder name"

Gap audit:
- honoured:
  - Editor writes the smallest thing that is already a book: metadata beside one Part holding one Chapter
    evidence: src-tauri/src/new_document.rs:447 — "fn creates_the_smallest_book_a_document_can_be()"
  - no sample text, no placeholder, no template
    evidence: src-tauri/src/new_document.rs:459 — "assert_eq!(text, "# The Lantern Papers\n\n");"
  - it holds no id yet
    evidence: src-tauri/src/new_document.rs:481 — "fn reads_back_with_no_id_no_variants_and_no_bibliography()"
  - a refusal writes nothing at all
    evidence: src-tauri/src/new_document.rs:540 — "assert!(!dir.path().join("01-chapters").exists());"
  - the folder is chosen through the shell's dialog under a nonce, never a path the page names
    evidence: src-tauri/src/new_document.rs:604 — "fn a_folder_choice_is_the_dialog_s_answer_claimed_once()"
- diverged:
  - the slug rule is lowercase ASCII with non-alphanumerics reduced to hyphens — delivered with an accent-folding table that turns é into e rather than a hyphen, and the decision log still records the opposite
    evidence: src-tauri/src/new_document.rs:82 — "fn fold_accent(ch: char) -> Option< char>"
    evidence: .abcd/work/DECISIONS.md:150 — "treats any non-ASCII letter as ordinary punctuation and hyphenates it"
  - a document created here declares no variants and renders as it does with none — delivering that required changing map #14's publish service so a no-variant document publishes as its own single default variant instead of being refused
    evidence: src/publish/services.ts:83 — "A document that declares no variant publishes as `DEFAULT_VARIANT`"
- missing:
  - the cursor sits on the blank line beneath the heading, in the editing surface — wired but not proven by any test
    evidence: src/main.ts:250 — "revealLine(app.view, 2);"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158586.md:563 — "- [ ] The cursor (and the modeline's line/column) sits on the blank line"
  - she can close Editor and open the same folder in Emacs — confirmed only by the unticked M29-3
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158586.md:581 — "- [ ] Quit Editor entirely."

Scope-condition dispositions:
- cond-2609061318159118 — survived: the folder is created by the shell through two tauri commands reached over invoke; no reading surface carries a New document command
  evidence: src-tauri/src/lib.rs:352 — "new_document::choose_new_document_folder,"
  evidence: src/new-document.ts:44 — "return invoke< ChosenNewDocumentFolder | null>("choose_new_document_folder", {"
- cond-2609061318150427 — survived: create_document writes only inside the folder Alice chose and registers nothing anywhere else: the root holds exactly the Part and the metadata file afterwards
  evidence: src-tauri/src/new_document.rs:204 — "pub fn create_document(destination: &Path, title: &str)"
  evidence: src-tauri/src/new_document.rs:472 — ""only the Part folder and document.yaml sit at the root""
- cond-2609061318158892 — survived: the route in for an author with nothing written produces a document with no text beyond the heading, ready for the rest of phase 1 to assume an open document
  evidence: src-tauri/src/new_document.rs:459 — "assert_eq!(text, "# The Lantern Papers\n\n");"
  evidence: src/main.ts:244 — "await app.openFolder(outcome.root);"
- cond-2609061318154636 — survived: the metadata is one document.yaml at the root and the chapter carries no front matter at all
  evidence: src-tauri/src/new_document.rs:286 — "document::write_chapter_text(&root.join(METADATA_FILE), &yaml)?;"
  evidence: src-tauri/src/new_document.rs:459 — "assert_eq!(text, "# The Lantern Papers\n\n");"
- cond-2609061318152334 — survived: exactly three keys are written — the title and the two defaults — with no variants, bibliography or roots
  evidence: src-tauri/src/new_document.rs:465 — ""title: The Lantern Papers\nasset_threshold_bytes: 8388608\ncitation_style: numeric\n""
  evidence: src-tauri/src/new_document.rs:66 — "struct NewDocumentMetadata<'a> {"
- cond-2609061318152083 — survived: after the shell writes the folder, the page opens it through map #1's own app.openFolder rather than drawing a tree of its own
  evidence: src/main.ts:244 — "await app.openFolder(outcome.root);"
- cond-2609061318159734 — survived: no chapter text of the author's own is written; the only text is the heading line and a blank line
  evidence: src-tauri/src/new_document.rs:277 — "document::write_chapter_text(&chapter_path, &format!("# {title}\n\n"))?;"
- cond-2609061318159508 — survived: the default threshold 8388608 is written and no asset root key appears in the file
  evidence: src-tauri/src/new_document.rs:36 — "pub const DEFAULT_ASSET_THRESHOLD_BYTES: u64 = 8_388_608;"
  evidence: src-tauri/src/new_document.rs:465 — "asset_threshold_bytes: 8388608"
- cond-2609061318153050 — narrowed: the document declares no variants as assumed, but 'renders as it does with none' was found to be a refusal at first dry run and only holds because the range changed map #14's publish service to treat a no-variant document as its own single default variant
  narrowing: holds for declaring variants (none written, 14's to declare); rendering with none holds only under the variantFor change in src/publish/services.ts made in this range, on 14's side of the boundary
  evidence: src/publish/services.ts:83 — "A document that declares no variant publishes as `DEFAULT_VARIANT`"
  evidence: src-tauri/src/new_document.rs:481 — "assert!(read.variants.is_empty());"
- cond-2609061318157197 — survived: no id key is written and the read-back asserts id is None
  evidence: src-tauri/src/new_document.rs:481 — "fn reads_back_with_no_id_no_variants_and_no_bibliography()"
- cond-2609061318157252 — survived: no bibliography is named and the one default citation style is written for map #11's builder to honour
  evidence: src-tauri/src/new_document.rs:43 — "pub const DEFAULT_CITATION_STYLE: &str = "numeric";"
  evidence: src-tauri/src/new_document.rs:481 — "fn reads_back_with_no_id_no_variants_and_no_bibliography()"
- cond-2609061318158123 — survived: both files go through document.rs's existing atomic writer, and the keys are a fixed three rather than a redefinition of the metadata shape
  evidence: src-tauri/src/new_document.rs:277 — "document::write_chapter_text(&chapter_path"
  evidence: src-tauri/src/new_document.rs:584 — "fn writes_the_chapter_and_the_metadata_through_a_temporary_file_beside_them()"
## Grounds

- pursued: a New document command (C-x C-n) opens a panel with a title, a folder chosen through the shell's own dialog, and a Create confirmation; on confirm the shell writes document.yaml (title, default asset threshold, default citation style, no id/variants/bibliography), one numbered Part, one numbered Chapter whose heading is the title verbatim, refusing outright and writing nothing if the folder already holds a document; the page then opens the folder through map #1's own route and leaves the cursor on the blank line beneath the heading. It would show wrong if a refusal left any file behind, if the metadata carried an id or a null-valued key, if the heading text differed from what was typed, or if the panel were unusable at 390 CSS px.
