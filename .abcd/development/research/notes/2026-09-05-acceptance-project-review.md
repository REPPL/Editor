# Acceptance project: a demanding real document, reviewed by three models

Source: an existing personal writing project of the maintainer's, reviewed
read-only on 2026-09-05 by three independent reviewers (two Claude tiers and
one open-weight model through a separate CLI), each given the same brief.
Only its form is recorded here; the subject is deliberately withheld. The
project is the acceptance test Editor must pass: lots of text, three
variants of one document, many heavy assets, and interactive material meant
for rehearsal rather than reading.

## Form, where all three reviewers agree

- One flat Markdown file holds the whole text: about 7,900 words, 814
  lines, 177 headings at four levels (5, 16, 40, 116 by level). The
  fourth level carries two thirds of the headings. Numbering lives inside
  the heading text. No front matter, no folders, no index file.
- The same text exists in three copies: the root file, a copy inside the
  reading app's content folder that has already drifted by some thirty
  lines, and a pre-rendered HTML copy with one section element per
  heading. Nothing reconciles them.
- Assets are two orders of magnitude larger than the text: six videos of
  150 to 512 MB, about 80 phone-native HEIC photographs plus PNG
  conversions that are twice their size, 17 PDFs up to 6 MB, contact
  sheets. Some 2.5 GB in all, with photograph sets duplicated.
- The Markdown references only five images, by root-relative path, into
  two different asset trees. Every video, transcript, and PDF is wired
  from JavaScript by filename convention, not from the text.
- Interactivity lives in a hand-built reading app, not in the Markdown:
  flip-card rehearsal decks derived from headings, video cards with a
  fallback chain (local file, remote host, link-out) behind a sign-in
  probe, transcript panes, four-colour highlighting, per-section notes,
  per-step reviewed marks, search, a generated contents tree, and a
  three-way variant switcher. A test suite of about 67 tests covers it.
- Reader annotations round-trip into Markdown by custom conventions: a
  fenced `note` block, a `done` HTML comment after a heading, an inline
  `mark` tag with a colour attribute. The app already serialises HTML back
  to Markdown, so a round-trip editor is prior art here, not a novelty.
- The source relies on three page-break HTML comments that a LaTeX
  preamble turns into page breaks. No build command is committed; the PDF
  route survives only as that preamble.
- Zero citations, footnotes, bibliography, code fences, or block quotes.
- The template app's data model is Parts, then Pages, then Sections from
  level-two headings, with conventions for a callout fence, a `Video:`
  line carrying pipe-separated fallback sources, and a `[part]` marker in
  a level-one heading.
- The working record is a prompt, a research note, and an append-only
  decision log with an acceptance line per iteration, plus a provenance
  layer mapping every source to the text.

## What each reviewer alone surfaced

- The strongest tier ranked **conditional content per variant** as the
  top risk: three variants share one text and the conditionality lives in
  heading heuristics and positional CSS selectors, so reordering a
  paragraph silently retargets a rule. It also found byte-identical
  duplicate images, 544-character lines, and a percent-encoded folder path
  containing a space.
- The middle tier ranked the **single monolithic file** first and noted a
  spoken-line cue convention in the prose that no other reviewer named.
- The open-weight model ranked **the divergent copies** first, listed the
  seven versioned browser-storage keys, and identified the app's
  browse/edit mode split with plain-text contenteditable blocks and a
  sidebar as structure editor as the pattern Editor should match. Its
  report opened with a stray line of its own narration and cited a test
  count from the project log rather than counting.

## What this decides for Editor

1. **Import must split.** The book model (Part = folder, Chapter = file)
   needs a split-on-import path from one flat file, and a fourth heading
   level. Sub-sub-sections exist in real documents.
2. **Variants are a document-model feature, not an export option.** One
   text rendering three variants needs an in-Markdown conditional marker
   at block and inline level. This was absent from the design.
3. **Assets are referenced, not copied, above a size.** Half-gigabyte
   videos and phone-native photographs cannot be copied beside chapters.
   Editor needs a referenced-asset mode, HEIC conversion or a placeholder,
   and de-duplication by content hash.
4. **Video carries a fallback chain and, sometimes, a gate.** The `Video:`
   line with pipe-separated sources is a proven convention worth adopting.
5. **Reader-layer state is separate from the text** and must survive
   re-edits: highlights, notes, reviewed marks, decks. The round-trip
   conventions above are the candidate syntax.
6. **Round-trip fidelity is a hard acceptance criterion:** no invented
   emphasis, no escaped numbers, no reflowed lines or tables, and the
   page-break comments preserved.
7. **One source, always.** Editor must own the single copy of the text and
   generate every rendering; divergent copies are what it exists to end.
8. **Citations are untested by this project**, so that feature needs a
   different acceptance document.

## Verdict shared by all three

An unusually good and punishing acceptance test: small where an editor is
easy and brutal where the design was thin. It comes with its own decision
log and test suite, so success and regression are both measurable.
