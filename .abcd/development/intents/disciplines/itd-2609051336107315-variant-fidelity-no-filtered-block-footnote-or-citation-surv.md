---
id: itd-2609051336107315
slug: variant-fidelity-no-filtered-block-footnote-or-citation-surv
spec_id: null
kind: discipline
suggested_kind: discipline
reclassification_history: []
builds_on: []
severity: major
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Variant fidelity

## Rule

A block or inline span marked for a variant appears only in that
variant's renderings, and takes its footnotes and citations with it. No
page, link, or file reveals that another variant exists.

## Forbids

- A filtered block surviving into another variant's article, deck, PDF,
  single file, or published version.
- A footnote or a citation that lives inside a filtered block appearing
  in another variant's margin, foot of page, credit line, or reference
  list.
- A variant switcher, a list of variants, a canonical link, a navigation
  entry, or a search index that names a variant other than the one being
  read.
- A link that can be shortened, incremented, or guessed into another
  variant's: each variant's path token is unguessable and no path above it
  serves a variant at all.
- A variant name left in the output of another variant: a class on a
  wrapper, an empty placeholder, a comment, a gap in numbering that
  reveals what was removed.
- Conditionality expressed by anything other than the explicit marker:
  heading heuristics, positional selectors, or a rendering-time rule the
  text does not carry.

## Binds From

Phase 3, with variant marking and preview, and it governs every rendering
and every link from that point on: the per-variant links in phase 6, the
per-variant PDFs beside them, and the single file in phase 5.

## How A Spec Proves It

- Given a chapter containing `::: {.variant variant="talk"}` around a
  paragraph that carries `[@smith2020]` and a footnote, When the `full`
  variant is rendered, Then the paragraph, the citation, the footnote,
  and the reference for that key are all absent from the page and from
  the reference list.
- Given the same chapter, When the `talk` variant is rendered, Then the
  paragraph appears and its reference appears exactly once in that
  variant's generated list.
- Given the inline form `She arrived [in the second week]{.variant
  variant="full"} and stayed.`, When the `talk` variant renders, Then the
  sentence reads as a clean sentence with no marker, no double space, and
  no empty span.
- Given a document with two variants published under one id, When the
  `full` variant's page, its links, its navigation, and its assets are
  inspected, Then nothing names, links to, or hints at the `talk`
  variant.
- Given the same two variants, When each PDF and each deck is built, Then
  each contains only its own variant's blocks and its own reference list,
  and the article, deck, and PDF for one variant agree on that set.
- Given a block with no variant attribute, When every variant is
  rendered, Then the block appears in all of them.
- Given a `::: {.variant variant="full"}` block containing a `## Section`
  and its Sub-sections, When the `talk` variant is rendered, Then that
  Section is absent from the page, from the contents, from the deck, and
  from the PDF, and no gap, empty heading, or numbering jump shows that
  anything was removed.
- Given a link to the `talk` variant, When its last path segment is
  removed and the shortened link is opened, Then the empty presenter
  shows, and no shortening or alteration of it reaches the `full`
  variant.

## Why

`03-evidence.md` names this the top risk found by the strongest reviewer
of the acceptance project: "three variants share one text and the
conditionality lives in heading heuristics and positional CSS selectors,
so reordering a paragraph silently retargets a rule". The lesson drawn
there is that "Variants are a document-model feature, not an export
option", which is why `02-constraints.md` locks the marker into the
canon and puts selection in the link rather than in a switcher: "each
variant has its own link under the document's stable id, and readers
never see a switcher". The map cuts the subject into one moment and this
discipline for a reason it states plainly — intent 14 owns marking and
previewing, this rule owns "the obligation of every renderer, every
export, and every link to honour the marks". The failure mode is not
cosmetic: a paragraph written for one audience and shown to another is
the one mistake a document with variants can make that the author cannot
take back.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
