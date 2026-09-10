---
id: itd-2609051336128348
slug: legible-on-three-device-classes-no-horizontal-scrolling-or-p
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

# Legible on three device classes

## Rule

Every screen rendering is complete and readable at the three fixed widths
— iPhone 390, iPad 820, and desktop 1280 CSS pixels — with vertical
scrolling only. Nothing requires horizontal scrolling of the page or a
pinch to read. The engines measured are the current Safari and the current
Chromium; the paged PDF is measured by its own layout and not by a
viewport at all.

## Forbids

- The page scrolling sideways at any of the three widths.
- Body text that has to be pinched or zoomed to be read.
- A margin note, image, table, code block, or embedded player forcing the
  page wider than the viewport.
- A deck slide that crops, overlaps, or hides content on a phone or a
  tablet, or a fixed pixel canvas scaled to fit.
- Navigation, reader controls, or an overlay that cannot be reached or
  dismissed at the narrowest width.
- A rendering that solves a width by hiding content instead of reflowing
  it.

## Binds From

Phase 1, with the deck, and it governs each screen rendering as it lands:
the article and its reader controls in phase 2, the single file in phase
5, the published pages throughout. The three widths and the two engines
are fixed here so that no spec has to choose its own numbers, and every
spec cites them.

## How A Spec Proves It

- Given the article at 390 CSS pixels, When Carol reads to the end,
  Then the page's scroll width equals the viewport width at every point
  and she scrolls in one direction only.
- Given a citation whose full reference sits in the margin at 1280 CSS
  pixels, When the viewport narrows to 390, Then the note folds into the
  flow directly after the paragraph that made it and remains readable.
- Given a wide table and a long unbroken line of code at 390 CSS pixels,
  When they are rendered, Then each scrolls within its own container and
  the page around it does not.
- Given the deck at 390, 820, and 1280 CSS pixels, When Bob follows from
  the back row on his phone while the projector shows the same slide,
  Then every slide's content is present and legible at each width, with
  nothing cropped.
- Given the reader controls and the navigation at 390 CSS pixels, When
  Carol opens each, Then each opens within the viewport and closes
  without the page moving sideways.
- Given any rendering measured at all three widths in both engines, When
  a single element overflows the viewport, Then the discipline fails,
  whatever the rest of the page does.

## Why

`03-evidence.md` records the article prototype's proof that the layout is
achievable without a second design: "Tufte layout with numbered citations
and their full reference in the margin, folding into the flow on narrow
screens" means "margin notes work on all three device classes with CSS
alone". `01-product.md` sets the requirement from the reader's side —
Bob and Carol "may be looking at a projector, a tablet, or a phone" — and
`04-surfaces.md` states the test in Carol's words: on her phone "the
margin notes fold into the text and nothing scrolls sideways or needs
pinching". The trade-off table records the price already paid for it: a
responsive HTML deck was chosen over a fixed presentation canvas, and
"slide layout has to survive reflow, so exact visual placement is not
available". Having paid that price, a rendering that then breaks on a
phone gives away the whole benefit.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
