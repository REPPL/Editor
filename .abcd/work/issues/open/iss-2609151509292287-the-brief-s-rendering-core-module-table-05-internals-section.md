---
schema_version: 1
id: "iss-2609151509292287"
slug: "the-brief-s-rendering-core-module-table-05-internals-section"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "intent-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development/brief/05-internals.md"
---

The brief's rendering-core module table (05-internals section 4) lists a variant module that filters a tree to one variant including footnotes and citations inside removed blocks; no such module exists, and the block filter is four hand-copied functions: src/core/render/article.ts, src/core/deck.ts, src/publish/build.ts and src/core/render/html.ts. The record describes a core the tree does not have, and itd-2609051335537470's mechanism cited it. Found by both reviews of that draft
