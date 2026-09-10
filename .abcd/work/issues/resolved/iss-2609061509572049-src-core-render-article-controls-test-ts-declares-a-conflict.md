---
schema_version: 1
id: "iss-2609061509572049"
slug: "src-core-render-article-controls-test-ts-declares-a-conflict"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/article-controls.test.ts"
resolution: "the two test files now share one global augmentation, fixed by the reader-controls build before it landed"
impact: internal
---

src/core/render/article-controls.test.ts declares a conflicting global Window.ArticlePage augmentation (unknown) against article-video.test.ts's own (ArticlePage), breaking tsc --noEmit and npm run build

## Grounds

- pursued: a type conflict between two in-flight tests clears when both land gated; wrong if tsc still failed at the commit
