---
id: itd-2609051317463033
slug: read-a-document-as-a-tufte-style-online-article-with-margin
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051335489928, itd-2609051335492327, itd-2609051335518134]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Read a document as a Tufte online article

## Press Release

A document opens on the web as a Tufte-style article: a generous measure,
citations and footnotes in the margin beside the paragraph that made them,
navigation drawn from the parts and chapters, and images and video in the
flow. On a phone the margin notes fold into the text. Bob reads it on his
laptop, Carol on her phone, and neither scrolls sideways or pinches.

The reader has controls: light, dark, and sepia; smaller or larger text;
narrow, normal, or wide measure. Choices persist in the browser. A
document can open with a quotation shown once. And a document can hide
easter eggs in its paragraphs: small marks that open text, an image, or a
video and collect into a tray, with the Konami code revealing every one
still hidden.

## Why This Matters

The article is the primary rendering; the PDF and the single file derive
from it. Its reading experience, the margin notes above all, is what the
maintainer's own prototype proved worth keeping.

## Mechanism

We expect margin notes to work on all three device classes because the
prototype already does it with CSS alone, folding notes into the flow
below a breakpoint. We expect reader controls and easter eggs to stay
cheap because they are a script the article carries and a fenced block in
the source, with static content for the PDF.

## Scope Conditions

- Static HTML, CSS, and one script; no server component.
- Current Safari and Chromium engines on desktop, iPad, and iPhone.
- Interactive elements are the set in the article-prototype research note;
  each is a fenced div in the source with static content that the PDF
  renders.
- Video follows the source-list rule from the assets intent: embed on the
  web, poster and link otherwise.

## Acceptance Criteria

- Given a document with parts, chapters, citations, footnotes, an image,
  and a video, when it is rendered as an article and opened at iPhone,
  iPad, and desktop widths, then every element is legible without
  horizontal scrolling or pinch zoom, and citations and footnotes appear in
  the margin at desktop width and inline below it.
- Given the reader controls, when Carol chooses dark and larger text and
  reloads, then the choices persist.
- Given a document with two easter eggs and a once-only quotation, when
  Bob opens it, then the quotation shows once, each egg opens its content
  on click and moves to the tray, and the Konami code reveals the
  remaining egg.
- Given a variant-marked block, when the article for another variant is
  rendered, then the block and any footnote or citation inside it are
  absent from the page and the reference list.

## Open Questions

- Whether easter-egg content can be a variant-marked block itself.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
