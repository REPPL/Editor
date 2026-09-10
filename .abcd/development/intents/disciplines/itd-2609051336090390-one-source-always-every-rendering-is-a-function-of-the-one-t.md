---
id: itd-2609051336090390
slug: one-source-always-every-rendering-is-a-function-of-the-one-t
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

# One source, always

## Rule

The text exists once. Every rendering is a function of the one parse
tree, produced by the one core, from the chapter files the author edits;
nothing is authored twice, and no rendering is ever an input. Exported
Markdown and annotation files are inputs by design, because they are the
source and its sidecars travelling, not a rendering of them.

## Forbids

- A second copy of the text anywhere: a copy inside a rendering's content
  folder, a pre-rendered HTML copy, a deck whose slides are typed
  separately from the prose.
- Authoring the same content twice for two renderings — a slide headline
  written apart from the Section it comes from, a PDF abstract that is
  not the article's.
- A rendering that carries editable text of its own, or an export that
  round-trips through another export rather than through the source. The
  single HTML file edits the Markdown it embeds, not the article it
  renders.
- A per-host renderer with its own copy of a rule, or a host patched to
  differ from the core.
- Structure recorded twice: an index file or an order field beside the
  numeric filename prefixes that already give the order.

## Binds From

Phase 1, from the first chapter opened and the first deck presented, and
it governs every rendering added afterwards: the article in phase 2, the
single file in phase 5, the PDF in phase 6.

## How A Spec Proves It

- Given a document, When the article, the deck, and the PDF are built,
  Then each is produced from one parse of the chapter files, and no build
  output is read as the input to another build.
- Given Alice changes one sentence in one chapter, When she rebuilds,
  Then the sentence changes in all three renderings and she edits nothing
  else anywhere.
- Given a chapter's Section headline, When the deck is built, Then the
  slide headline is that heading's text, not a separate string the author
  maintains.
- Given the single HTML file, When it is searched for a distinctive
  sentence of the document, Then the sentence is present as the embedded
  source the renderers read, and any rendered occurrence is generated
  from it at open time rather than stored beside it.
- Given a chapter exported from the single file and re-imported into the
  app, When the round trip completes, Then what came back was the
  Markdown, never the article or the deck the file also rendered.
- Given a chapter is renamed in the file system from `03-method.md` to
  `05-method.md`, When Editor reloads, Then the order changes in the
  sidebar and in all three renderings with no other file touched.
- Given two hosts run the core over the same chapter, When their output
  is compared, Then any difference is recorded as a defect in the core;
  no host-specific correction is accepted as a fix.

## Why

`03-evidence.md` records the failure this discipline exists to prevent:
in the acceptance project "the same text exists in three copies: the root
file, a copy inside the reading app's content folder that has already
drifted by some thirty lines, and a pre-rendered HTML copy with one
section element per heading. Nothing reconciles them." The reviewers'
conclusion is quoted there without qualification — "One source, always.
Editor must own the single copy of the text and generate every rendering;
divergent copies are what Editor exists to end" — and the open-weight
reviewer ranked those divergent copies as the project's first problem.
The mechanism is in `05-internals.md` sections 2 and 4: one tree, one
TypeScript core, four hosts, and the rule that "a rendering difference
between hosts is a bug in the core, not a host to be patched". The cost
was accepted deliberately, as the trade-off table records: the core must
run unchanged in a web view, a plain browser, and a build runner.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
