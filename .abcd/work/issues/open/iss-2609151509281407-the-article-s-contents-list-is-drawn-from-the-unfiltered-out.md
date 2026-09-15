---
schema_version: 1
id: "iss-2609151509281407"
slug: "the-article-s-contents-list-is-drawn-from-the-unfiltered-out"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/article.ts"
---

The article's contents list is drawn from the unfiltered outline: renderDocumentContents in src/core/render/article.ts takes no variant and chapterItem reads outlineOf(chapter) as it stands, although OutlineNode already carries variants. A Section that belongs to one variant alone is listed in the other variant's contents with nothing to link to. Found by the design review of itd-2609051335537470
