---
id: itd-2609051336145770
slug: nothing-is-stored-about-a-reader-reader-state-lives-in-the-r
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

# Nothing is stored about a reader

## Rule

The site stores nothing about a reader. Reader state — display
preferences, highlights, notes, reviewed marks, rehearsal scores, and the
memory of a once-only quotation — lives in that reader's own browser and
leaves it only as a file they choose to export.

## Forbids

- The site keeping any reader's marks, notes, preferences, or identity.
- Analytics, telemetry, beacons, or logging of what a reader opened,
  read, or collected.
- A reader's annotations being sent to the author, or to anywhere,
  without the reader exporting a file and sending it themselves.
- An account, a sign-up, or an identifier for a reader that outlives
  their browser storage.
- A published page writing anything back: no form post, no comment store,
  no shared highlight, no synchronised progress.
- The author's own private annotations reaching a published version
  unless they publish them deliberately as a layer.

## Binds From

Phase 2, when the article and its reader controls first put state in
Bob's browser, and it governs the annotation work in phase 7 — reader
marks, exports, and published layers — without exception.

## How A Spec Proves It

- Given Bob opens a published article and reads it to the end, When the
  requests the page makes are recorded, Then they are for the page and
  its assets only, and nothing is sent back.
- Given Bob sets a larger text size, dismisses the opening quotation, and
  highlights a passage, When he reloads the page, Then all three persist
  from his browser's own storage; and when Carol opens the same link on
  another device, Then she sees none of them and the opening quotation is
  shown to her for the first time.
- Given Bob exports his annotations, When the export completes, Then he
  holds a file in the sidecar format and the site holds no copy of it.
- Given Alice publishes a layer from a file Bob sent her, When a reader
  toggles that layer on, Then it is served as a file beside the document
  version and nothing about who toggled it is written anywhere.
- Given Carol runs a rehearsal deck and scores it, When she closes the
  tab, Then her score is not on the site; it lives only where her browser
  kept it for that session.
- Given the deployed site, When it is inspected for a write path, Then
  there is none: the presenter and every document version are static
  files with nothing behind them to store to.

## Why

The design has no server to store anything in — `02-constraints.md` puts
it as "no database, no account, no sync" — so this discipline is mostly a
promise not to add one. The decision record on annotations makes the
obligation explicit: "a reader's annotations on the published page live
in that browser and export as the same file format; they are never sent
to the author", and the author's own marks "stay private unless published
the same way". `03-evidence.md` shows the pattern already works at
reading scale: the article prototype's reader controls for theme, text
size, and measure are "persisted in the browser", and its once-only
opening quotation is "remembered per browser", from which the brief
concludes that "the controls are cheap and belong to the article, not the
author". The reason to hold the line is Bob and Carol: they did not
choose Editor, they only opened a link, and a document that reads its
readers is a different product from the one described here.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
