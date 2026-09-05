---
id: adr-2609051324177479
slug: annotations-are-sidecar-files
status: accepted
date: 2026-09-05
supersedes: null
superseded_by: null
related_intents: []
related_rfcs: []
related_adrs: []
---

# ADR-2609051324177479: Reader annotations live in sidecar files beside chapters, private by default, publishable as layers

## Context

The maintainer's acceptance project proved that a document people rehearse from needs highlights, notes, reviewed marks, and flashcard decks, and that these must survive edits and round trips. That project stores them inline in the Markdown on export (a fenced note block, a done comment, a mark tag), which fills the source with reader markup and makes a second person's annotations a manual merge.

## Decision

Each chapter may have one sidecar file, plain JSON, holding highlights with colour, notes, reviewed marks, and rehearsal decks, anchored to the text by excerpt and position and re-resolved on load. The Markdown never carries annotations. A reader's annotations on the published page live in that browser and export as the same file format; they are never sent to the author. The author can load anyone's file into Editor, review it, and publish it as a public layer readers can toggle. The author's own annotations stay private unless published the same way.

## Alternatives Considered

1. Inline in the Markdown, as the acceptance project does. Nothing to anchor, but the source fills with reader markup and receiving another person's annotations means merging text. Rejected.
2. Inline for the author, sidecar for others. Two mechanisms for one concept. Rejected.
3. Synced annotations with accounts. A different product. Rejected.

## Consequences

Anchor robustness is the engineering cost and the first thing to test against real edits. The article's script must render layers. The sidecar format is public API from the first release because readers export it.
