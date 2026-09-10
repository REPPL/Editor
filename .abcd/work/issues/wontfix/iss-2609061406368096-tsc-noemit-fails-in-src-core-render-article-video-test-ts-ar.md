---
schema_version: 1
id: "iss-2609061406368096"
slug: "tsc-noemit-fails-in-src-core-render-article-video-test-ts-ar"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/article-video.test.ts"
wontfix_reason: "an in-flight edit by the concurrent article builder, not a defect: the file compiled once that edit landed"
---

tsc --noEmit fails in src/core/render/article-video.test.ts: ArticleVideo global type declared twice with incompatible shapes (TS2717) and a mock object missing chooseSource (TS2741), blocking npm run lint

## Grounds

- declined: an in-flight edit by the concurrent article builder, not a defect: the file compiled once that edit landed
