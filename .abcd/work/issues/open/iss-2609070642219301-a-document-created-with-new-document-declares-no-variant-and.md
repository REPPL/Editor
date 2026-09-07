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
---

A document created with New document declares no variant and publish and export refuse it, so the rewritten tutorial cannot be completed; a document that declares no variant should publish and export as its own single default variant
