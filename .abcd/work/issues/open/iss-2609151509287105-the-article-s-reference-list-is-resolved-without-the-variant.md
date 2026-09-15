---
schema_version: 1
id: "iss-2609151509287105"
slug: "the-article-s-reference-list-is-resolved-without-the-variant"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/bibliography.ts"
---

The article's reference list is resolved without the variant: citationsIn and resolveCitations in src/core/bibliography.ts take a placement filter and no variant, src/preview.ts and src/publish/build.ts call them that way, and the reference list is rendered from that unfiltered resolution. A work cited only inside a removed variant block therefore appears in the other variant's reference list, and because numbering is first-citation order every later number shifts, which is the numbering gap the variant-fidelity discipline forbids. Found by the design review of itd-2609051335537470 with a throwaway probe
