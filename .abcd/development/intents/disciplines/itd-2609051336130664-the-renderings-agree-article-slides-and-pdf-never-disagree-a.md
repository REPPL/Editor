---
id: itd-2609051336130664
slug: the-renderings-agree-article-slides-and-pdf-never-disagree-a
spec_id: null
kind: discipline
suggested_kind: discipline
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# The renderings agree

## Rule

For one source and one variant, the article, the deck, and the PDF give
the same answer about every citation, footnote, reference list, and
variant filter. They differ only in the presentation the canon's mapping
table assigns each.

## Forbids

- A citation key resolving in one rendering and printing as literal
  brackets in another.
- Reference lists that disagree in membership: an entry in the PDF that
  no article margin note produced, or a key credited on a slide and
  missing from the article's and the PDF's lists. The deck carries credit
  lines and no reference list, which is a difference in presentation the
  mapping table assigns, not a disagreement about the source.
- A footnote present in one rendering and silently absent from another,
  where the mapping table says it appears in both.
- A variant filtered in one rendering and not in another, or two
  renderings of one variant containing different blocks.
- Numbering that disagrees where the mapping table gives the same source:
  two references for one key, or one number used twice.
- A host patched to correct a difference, rather than the core corrected
  once for every host.

## Binds From

Phase 2, when citations, footnotes, and generated reference lists arrive
with the article, and intent 11 carries its first hard test. It widens in
phase 3 to variant filtering and in phase 6 to the PDF and the
per-variant links.

## How A Spec Proves It

- Given a chapter citing three keys against `references.bib` and
  carrying two footnotes, When the article, the deck, and the PDF are
  built from it, Then the same set of keys resolves in all three; the
  article's and the PDF's generated reference lists hold the same entries,
  differing only in style and placement; and every key credited at the
  foot of a slide is one of the entries in those lists.
- Given a citation key that resolves to nothing, When each rendering is
  built, Then none of the three prints the raw key as prose, and each
  marks it unresolved in the form its own surface defines.
- Given a `::: {.notes}` div, a `::: {.columns}` div, and a
  `## Interlude {.divider}` heading, When the three renderings are built,
  Then each construct behaves exactly as the mapping table in
  `05-internals.md` section 3 states for that column, and no rendering
  invents a behaviour of its own.
- Given a document with two variants, When each rendering is built for
  one variant, Then the three renderings contain the same set of blocks
  and the same reference list for that variant.
- Given a `::: {.credit}` block, When the three renderings are built,
  Then it is a margin note in the article, a line at the foot of the
  slide, and a note in the PDF — one source, three presentations.
- Given a difference between two hosts running the core over the same
  chapter, When it is investigated, Then it is recorded as a defect in
  the core and fixed there; a host-specific correction is not an
  acceptable fix.

## Why

`05-internals.md` section 4 states the mechanism and the enforcement in
one line: one TypeScript core is "shared unchanged by every host", and
"a rendering difference between hosts is a bug in the core, not a host to
be patched". Section 3's mapping table is the single home for what each
construct does in each column, which is exactly why the map rejected the
alternative cut of one intent per rendering: "every construct would then
be specified three or four times, once per renderer, and the ignore rules
would have no single home". `06-delivery.md` makes agreement a condition
of a phase being done — "the phase's renderings agree with each other on
the same source: citations, footnotes, and variant filtering give the
same answer everywhere they appear". `03-evidence.md` also marks the gap
this rule has to be tested through: the acceptance project has "zero
citations, footnotes, bibliography, code fences, or block quotes", so
citations "need a different acceptance document".

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
