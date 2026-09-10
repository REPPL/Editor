---
id: itd-2609051317455985
slug: cite-from-a-bibtex-file-beside-the-document-with-pandoc-cita
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051335502171]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Cite from a bibliography file

## Press Release

Alice keeps a BibTeX file beside her document and cites with a key in
square brackets. Editor completes the key as she types, shows the
reference on hover, and renders it the same way everywhere: a margin note
in the article, a numbered reference in the PDF, a source line on the
slide. Footnotes work the same way, with Pandoc's syntax, and the
reference list at the end of every rendering is generated, never typed.

## Why This Matters

A reference typed by hand drifts from the source and from its other
copies. One bibliography file and one citation syntax that every tool
already reads means the article, the PDF, and the slides cannot disagree.

## Mechanism

We expect citations to render identically across exports because Pandoc,
Typst, and the article renderer all read BibTeX and the same citation
syntax, so one source feeds three renderers with no translation. We expect
key completion to remove the memory burden because the keys are in a file
Editor can index.

## Scope Conditions

- Pandoc citation syntax and Pandoc footnotes; a BibTeX file beside the
  document, named in front matter.
- One citation style per document, chosen in front matter from a small
  set shipped with Editor.
- Slides show a short source line per slide rather than a full reference
  list.

## Acceptance Criteria

- Given a BibTeX file with three entries, when Alice types the opening of
  a citation, then the three keys are offered for completion with their
  titles.
- Given a chapter with one citation and one footnote, when the article,
  PDF, and slides are produced, then all three show the same reference
  and the same footnote text, and the article and PDF end with a
  generated reference list containing exactly the cited entries.
- Given a citation key that is not in the file, when Alice previews, then
  the citation is marked as unresolved in the preview and listed in the
  sidebar.

## Open Questions

- Which citation styles ship first.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
