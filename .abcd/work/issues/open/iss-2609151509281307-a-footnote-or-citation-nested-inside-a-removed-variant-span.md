---
schema_version: 1
id: "iss-2609151509281307"
slug: "a-footnote-or-citation-nested-inside-a-removed-variant-span"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/article.ts"
---

A footnote or citation nested inside a removed variant span still renders and still earns a reference: the article walks inlines through walkInlines, which flattens a variant span into its neighbours, so the citation carries no variants of its own and passes inlineInVariant; src/publish/build.ts names the same hazard for assets and works around it. The discipline's proofs cover a removed block and a bare span only. Found by the design review of itd-2609051335537470
