---
id: itd-2609051317516762
slug: annotate-a-document-with-highlights-notes-reviewed-marks-and
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051336025064, itd-2609051336037640, itd-2609051336040242, itd-2609051336055362]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Annotate and publish annotation layers

## Press Release

While reading, Alice highlights a passage, writes a note against it, marks
a step as reviewed, and builds a rehearsal deck from the headings. None of
that touches the text: it lives in a sidecar file beside the chapter,
anchored to the text so an edit does not orphan it. On the published page
Bob does the same in his browser, and his annotations stay his, exportable
as a file.

When Bob sends Alice his file, she loads it into Editor, reviews it beside
her own, and publishes it as a public layer on the document. Readers can
show or hide it. Her private annotations remain private.

## Why This Matters

The maintainer's own reading app proved that a document people rehearse
from needs highlights, notes, and decks, and that these must survive edits
and round trips. Keeping them out of the text keeps the text clean and
makes another person's annotations something you can receive and publish
rather than merge by hand.

## Mechanism

We expect sidecar files to survive edits because anchors combine a quoted
excerpt with a position and re-resolve on load, the approach the existing
app already uses. We expect public layers to be cheap because a layer is
the same file, published beside the document and rendered by the article's
script.

## Scope Conditions

- One sidecar per chapter, plain JSON, in the chapter's folder.
- Annotation kinds: highlight with colour, note, reviewed mark, rehearsal
  deck with cards and two modes.
- A reader's annotations on the published page live in that browser and
  export as the same file format; they are never sent to the author
  automatically.

## Acceptance Criteria

- Given a chapter, when Alice highlights a passage, adds a note, and marks
  a heading reviewed, then a sidecar file exists beside the chapter and the
  Markdown is unchanged byte for byte.
- Given the sidecar and an edit that moves the annotated passage, when
  the chapter reloads, then every annotation re-attaches to the same
  passage.
- Given the published article, when Bob highlights and exports, then the
  export is a file in the sidecar format and the site stored nothing.
- Given Bob's file, when Alice loads it and publishes it as a layer, then
  readers can toggle the layer on the published page and Alice's own
  annotations are not published.
- Given a rehearsal deck built from headings, when Carol runs it in flip
  mode and scored mode on a phone, then each card shows and the score is
  kept for the session.

## Open Questions

- Anchor format and its tolerance to edits.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
