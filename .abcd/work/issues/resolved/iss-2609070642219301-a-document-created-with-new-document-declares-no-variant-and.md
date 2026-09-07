---
schema_version: 1
id: "iss-2609070642219301"
slug: "a-document-created-with-new-document-declares-no-variant-and"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "three-reviewer-code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/publish/services.ts"
resolution: "a document that declares no variants publishes and exports as its own single default variant (src/publish/services.ts::variantFor); a document that declares variants but names no default still refuses; docs and two specs updated to say so"
impact: fix
---

A document created with New document declares no variant and publish and export refuse it, so the rewritten tutorial cannot be completed; a document that declares no variant should publish and export as its own single default variant

## Grounds

- pursued: the tutorial's own dry run at C-c C-l succeeds for the document C-x C-n just wrote; shown wrong by documentForPublish still throwing 'declares no variant' for empty variants
