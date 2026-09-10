---
schema_version: 1
id: "iss-2609070642209805"
slug: "the-once-only-opening-and-the-collected-eggs-are-remembered"
severity: "critical"
category: "bug"
source: "user-observation"
found_during: "three-reviewer-code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/article-eggs.js"
resolution: "Scoped the once-only opening and the collected eggs per document: article-eggs.js derives a runtime scope from a data-document-scope attribute or the pathname with /v/<hash>/ stripped, and suffixes both storage keys with it (see DECISIONS.md 2026-09-07)."
impact: fix
---

The once-only opening and the collected eggs are remembered under fixed localStorage keys shared by every document on an origin, so dismissing one document's opening hides every other document's, and the app's preview shows an opening only once ever; the keys must be scoped to the document

## Grounds

- pursued: two documents on one origin now keep independent memory, and a document's stable link shares memory with its own frozen version, proven in src/core/render/article-eggs.test.ts's new describe block
