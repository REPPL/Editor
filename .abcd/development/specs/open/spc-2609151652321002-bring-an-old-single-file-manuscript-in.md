---
id: spc-2609151652321002
slug: bring-an-old-single-file-manuscript-in
intent: itd-2609051335529787
origin: researcher-authored
production_mode: hand-written
---
# bring-an-old-single-file-manuscript-in

## Summary

Import turns one flat Markdown file into a document folder beside it: the
document's metadata file and one Part, `01-chapters/`, holding one chapter
file per top-level level-one heading, numbered in source order, with any
text before the first heading as `00-front-matter.md`. The source file is
never touched. Concatenating the chapters in numeric-prefix order returns
the source byte for byte, and that command is the proof.

Three things make it small. The gesture already has a door: `C-x C-o`
asks which kind of thing to open, and Import becomes its third answer,
travelling the same nonce the other two travel. The parser already carries
a byte span on every block, so the cut points are read, not computed. And
the shell already writes a document folder atomically for New document,
with a sweep on failure; Import writes through the same pieces with more
files.

The one boundary this spec draws deliberately: the web view parses and the
shell writes. The parser is TypeScript and lives in the web view; the file
is bytes the shell owns. So the shell reads the bytes, hands the text to
the web view, the web view returns cut offsets and heading texts from
`parseChapter`, and the shell slices its own bytes at those offsets and
writes each slice. No chapter text crosses the process boundary on the way
to disk, so byte fidelity holds by construction. The maintainer settled
this as the mechanism on 2026-09-15; it is recorded here and not promoted
to an ADR unless a later moment needs it.

## Scope

In:

- A third choice in the `C-x C-o` chooser, "Import a manuscript", which
  opens the file dialog for one `.md` or `.markdown` file, then shows a
  confirmation listing the folder, the Part, and every chapter name it will
  write, with the lines it will not cut named.
- The split itself: cut points, names, the preamble chapter, the metadata
  file with the title and the two new-document defaults, known front-matter
  keys copied as plain strings.
- The refusals, all before any write: no top-level level-one heading; not
  UTF-8; the file already inside a document folder; a folder of the
  document's name already beside the file.
- A sweep on failure after some chapters are written.
- Opening the written folder through the shipped open-folder path, so map
  #1 draws it.
- The how-to page on opening a file or a folder, updated in the same
  change.
- A committed synthetic fixture and the suite over it; the maintainer's own
  manuscript recorded in the acceptance log only.

Out:

- Any drop. A `.md` dropped on a Part is still one chapter copied; a file
  dropped on the text is still a reference.
- Any conversion, translation, or normalisation of the text; any rewriting
  of asset references; any copying of assets.
- Declaring variants. The minted metadata declares none; every `.variant`
  mark is carried through untouched (itd-2609051335537470).
- Writing a folder back out as one file (itd-2609051335586905).
- Cutting the one Part into several afterwards.

## Design

### The door

`src-tauri/src/open_source.rs` mints a nonce per pick offered to
`C-x C-o` and claims it once. A third `PickedKind`, `Manuscript`, is added
beside the folder and the single file; the chooser row in the web view
gains the third label, and the page that today opens a single file as a
one-chapter document instead calls `import_manuscript` with the nonce.
Nothing about the two shipped picks changes.

### Reading and refusing

The shell reads the file's bytes (`document::read_chapter_text` already
refuses non-UTF-8 through `read_to_string`) and answers the three
placement refusals before parsing: a `document.yaml` at or above the file
(`open_source` already walks up for it), and a sibling folder of the stem's
name (the same check `new_document::what_it_already_holds` makes). Each
refusal is one sentence naming what was found; nothing is written.

### Cutting

The shell hands the text to the web view, which runs `parseChapter` and
returns, for every top-level block whose kind is a level-one heading after
the parser's fold, its byte offset and its heading text, plus the offsets
of any level-one heading it found nested inside a fenced div, so the
confirmation can name those lines as not cut. The parser's spans are UTF-8
byte offsets computed once per source, CRLF-safe; `tree.ts`'s `sliceBytes`
is the same arithmetic the shell repeats on its own bytes. A two-line
title folds to one block and so is one cut. If there is no top-level
level-one heading the answer is the fourth refusal, before any write.

The preamble is `[0, first cut)` when it holds anything but whitespace;
each chapter is `[cut_i, cut_{i+1})`; the last runs to the end of the
file. Slices are contiguous and cover the file, which is what makes the
concatenation check hold: the split writes the bytes it read and nothing
else.

### Naming

Chapter `i` is `NN-<slugify(heading)>.md`, `NN` from `01`, using
`new_document::slugify` as it stands — accents folded, lowercase ASCII,
one hyphen per non-alphanumeric run. Two identical headings give two files
told apart by their prefixes; no suffix rule is added. The preamble is
`00-front-matter.md`, and `document::split_order` already reads `00-` as
order zero, so the sidebar and every concatenation in numeric-prefix order
put it first.

### Metadata

The metadata file is written the way `new_document::write_the_book` writes
it: `title`, `asset_threshold_bytes`, `citation_style`. The title is taken
from a known key in a preamble metadata block when there is one, otherwise
from the first level-one heading. `subtitle` and `abstract` are copied
when present as plain strings; a known key in any other shape (a list, a
map) is not copied and is named in the confirmation. `variants` is never
written. Before the folder is opened the shell reads the minted file back
through `metadata::read_metadata`, so a file it would refuse to open is a
failure of the import, swept, not a folder Alice finds broken.

### Writing

Every file goes through `document::write_chapter_text`, which writes to a
temporary and renames. The order is: the root folder, the metadata file,
the Part, then the chapters in order. A failure at any step removes the
root folder as `create_document` removes the Part on failure, and the
error names the step. The source is opened read-only and never written,
renamed, or moved.

### Opening

On success the shell returns the root path and the web view opens it
through the shipped `openFolder`, so the sidebar, the buffer model, and
the windows all see an ordinary document. Import writes and stops; map #1
draws.

### The confirmation

The confirmation is a list overlay, the same contract the insert palette
and the quit question use: a heading line with the folder and Part, one
row per chapter name, a row per uncut nested heading naming its line, a
row per known key not copied, and Return to write or `C-g` to stop. It is
drawn in the editing window, so it is legible at every width the window
allows; at 390 the rows wrap rather than scroll.

### The docs

`docs/how-to-open-a-file-or-a-folder.md` gains Import as the chooser's
third choice and drops the sentence telling Alice to build the folder by
hand. Present tense, one page.

## Acceptance Mapping

- Folder, Part `01-chapters/`, numbered chapters, lower headings inside:
  Cutting, Naming, Writing; suite over the fixture.
- Concatenation byte-identical, including a 544-character line, CRLF,
  tables, escapes, whitespace: Cutting (contiguous slices of the shell's
  own bytes); the suite concatenates and compares bytes.
- Preamble as `00-front-matter.md`, chapters from `01-`: Cutting, Naming.
- Known keys copied, block kept byte for byte, unknown keys copied
  nowhere, file reads back: Metadata.
- Source untouched: Reading (read-only), Writing (nothing writes to it);
  the suite hashes the source before and after.
- Same-titled headings, shipped slug, prefixes alone: Naming.
- No metadata: title from the first heading plus the two defaults, nothing
  else: Metadata.
- HTML comments in place: Cutting (bytes, not nodes).
- Asset references untouched: Cutting; nothing in Scope copies or rewrites.
- Variant div and attributed image arrive intact, no variant declared:
  Cutting, Metadata.
- Nested level-one heading not cut, named in the confirmation: Cutting,
  The confirmation.
- Two-line title is one chapter: Cutting (the parser's fold).
- No level-one heading: Reading and refusing.
- Not UTF-8, inside a document, folder already there: Reading and
  refusing.
- Failure after some chapters leaves nothing: Writing.
- Exactly one heading: Cutting writes one chapter; no minimum is checked.
- Confirmation legible at 1280, 820, 390: The confirmation; recorded as a
  manual row.
- Fixture in the suite, the maintainer's manuscript in the acceptance log:
  Scope; `src/local-documents.test.ts` already shows the pattern for local
  documents that are never named.
- The how-to page: The docs.
- Inherits: byte fidelity by construction; no machine in the document
  (nothing is written that names one); one source (the folder is opened
  through the shipped path); three device classes over the confirmation.

## Tasks

1. `PickedKind::Manuscript` in `open_source.rs`, the chooser's third row,
   and the `import_manuscript` command with the four refusals.
2. `cutPoints(source)` in `src/core/` returning top-level level-one cuts,
   heading texts, and nested level-one lines, with tests on the fold, the
   fenced div, setext titles, and `#` inside a fence.
3. The shell's slice-and-write, the metadata mint and read-back, and the
   sweep, with tests on the fixture and on a failing writer.
4. The confirmation overlay and the open-on-success path.
5. The committed fixture, the concatenation test, and the source hash test.
6. The how-to page; the acceptance log rows for the widths and for the
   maintainer's own manuscript.

## Risks and Open Questions

- Offsets crossing the process boundary: the web view's byte arithmetic
  and the shell's must agree on UTF-8 lengths and CRLF. The fixture's CRLF
  variant and a test that feeds a multi-byte heading are the guard; if
  they disagree the concatenation test fails loudly rather than a chapter
  being off by a byte.
- A manuscript whose only level-one headings are nested in divs is refused
  as having none; the confirmation cannot appear for it, so the refusal
  sentence must name the nested lines. Settled here: it does.
- Which chord opens the chooser is unchanged; Import adds a row, not a
  chord.
- How the one Part is later cut into several stays with the brief.
