---
id: itd-2609051317473940
slug: present-slides-from-the-same-text-with-sections-as-slides-by
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051335447894, itd-2609051335458626]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Present slides from the same text

## Press Release

Alice presses Present and her chapter becomes a deck. Each section is a
slide: its headline is the slide, and its text becomes the speaker notes
she sees on her laptop while the audience sees the headline. Sections run
horizontally, the main flow of the talk. Sub-sections hang vertically
beneath their section, following the same rule: headline on the slide,
text in the notes. Any image in a section or sub-section becomes a slide
of its own, full-bleed, in sequence.

When the default is not the talk she wants, she shapes it in the same
text. A horizontal rule splits a section into more slides. A columns div
lays out two columns. A divider attribute on a heading makes a
section-break slide. A notes div overrides the generated speaker notes.
None of these appear in the article or the PDF. The insert palette offers
each of them, so she never has to remember the syntax.

The deck runs on the presenter site, from the single HTML file, and from
disk, with keyboard, touch, and on-screen controls, and reads well on a
projector, an iPad, and a phone.

## Why This Matters

A talk has a date. Slides are the first slice Alice will use, and they
must come from the same text as the article so nothing is written twice.

## Mechanism

We expect headline-as-slide and text-as-notes to produce a usable first
deck with no authoring because a well-structured chapter already has one
idea per section. We expect the horizontal-sections, vertical-sub-sections
layout to match how the maintainer already builds decks because reveal.js
navigates that way natively. We expect authored breaks to coexist with
the derived structure because they are constructs the article renderer is
told to ignore.

## Scope Conditions

- Default mapping: section headline = horizontal slide, section text =
  speaker notes; sub-section headline = vertical slide under its section,
  sub-section text = speaker notes; each image in a section or
  sub-section = its own slide in sequence.
- Authored constructs: a horizontal rule, a columns div, a notes div, and
  a divider heading attribute, all Pandoc-compatible and ignored by the
  article and PDF.
- Per-slide source credits come from citations in the section and render
  as a short line at the slide's foot.
- reveal.js on the presenter site; a dependency-free build inside the
  single HTML file.

## Acceptance Criteria

- Given a chapter with three sections, one of which has two sub-sections,
  when Alice presents, then the deck has three horizontal slides, the
  second with two vertical slides beneath it, each showing only its
  headline, and the speaker view shows each section's or sub-section's
  text as notes.
- Given a section containing two images, when presented, then two
  full-bleed image slides follow that section's headline slide in source
  order.
- Given a section with a horizontal rule, a columns div, and a notes div,
  when presented, then the section yields two slides, the second in two
  columns, with the notes div replacing the generated notes; and when the
  same chapter is rendered as an article, then no rule, column, or notes
  content appears.
- Given a heading with the divider attribute, when presented, then it
  renders as a section-break slide.
- Given the deck opened from the presenter site on a phone, an iPad, and a
  laptop, when Bob navigates by swipe, tap, and arrow keys, then every
  slide is legible and navigation follows the horizontal and vertical
  structure.

## Open Questions

- Whether sub-sub-sections (level four) become further vertical slides or
  fold into their sub-section's notes.
- Theme: one built-in, or the maintainer's existing deck theme ported.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
