---
id: itd-2609051317508768
slug: receive-a-journal-style-pdf-rendered-by-typst-in-the-publish
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051336019782]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Receive a journal-style PDF

## Press Release

Every publish produces a PDF. The pipeline renders it with Typst in a
modern academic-journal layout: clean type, strong tables, numbered
references, footnotes at the foot of the page, a table of contents that
follows the parts and chapters, and page numbers. Video becomes a poster
frame with the link printed beneath it. The PDF is stored beside the
document version and the presenter offers it as one more link.

## Why This Matters

Print is where Markdown tools give up. A PDF that looks like a journal
paper, produced without the author touching a typesetter, is the
difference between a website and a publication.

## Mechanism

We expect Typst to give journal-quality output from the same source
because it reads BibTeX natively, has first-class tables and footnotes,
and renders in seconds in a pipeline with no TeX installation. We expect
the app to stay simple because it never renders PDF itself.

## Scope Conditions

- Rendering runs in the publish pipeline, not the app; the app shows a
  status, not a preview.
- One built-in journal template; variants render to separate PDFs.
- Page-break comments in the source are honoured; slide-only constructs
  are ignored.

## Acceptance Criteria

- Given a published document with citations, footnotes, two tables, an
  image, and a video, when the pipeline finishes, then a PDF exists beside
  the version with a contents page, page numbers, numbered references,
  footnotes on their pages, both tables typeset, the image placed, and the
  video as a poster with its link, and the presenter links to it.
- Given a page-break comment in a chapter, then the PDF breaks the page
  there.
- Given a document with two variants, then two PDFs exist, each without
  the other's blocks.

## Open Questions

- Whether the journal template is one of Typst's published ones or
  Editor's own.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
