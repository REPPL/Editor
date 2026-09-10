---
schema_version: 1
id: "iss-2609061509161935"
slug: "src-core-render-article-controls-js-has-three-unused-error-c"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/article-controls.js"
resolution: "the unused catch bindings were removed by the reader-controls build before it landed"
impact: internal
---

src/core/render/article-controls.js has three unused 'error' catch bindings that fail eslint's @typescript-eslint/no-unused-vars, blocking npm run lint

## Grounds

- pursued: a lint failure in an in-flight file clears when the file lands gated; wrong if the release build still failed lint
