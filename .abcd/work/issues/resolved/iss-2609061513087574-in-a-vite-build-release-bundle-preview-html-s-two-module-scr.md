---
schema_version: 1
id: "iss-2609061513087574"
slug: "in-a-vite-build-release-bundle-preview-html-s-two-module-scr"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "preview.html"
resolution: "confirmed on a fresh npm run build that vite build merges article-video.js/article-controls.js/article-eggs.js into preview.ts's own dist chunk rather than preserving each as its own copied file, contradicting spc-2609061318090042's Risks note as originally worded; amended that note to say what the bundler actually does (each script is a zero-import/export IIFE with its own unconditional DOMContentLoaded fallback boot, so the merge is harmless) and proved it by importing the actual built preview chunk into jsdom and confirming ArticlePage/ArticleVideo/ArticleControls are all defined and the reader-controls toolbar is appended to the DOM"
impact: internal
---

In a `vite build` release bundle, `preview.html`'s two module script tags (article-video.js, and now article-controls.js) are inlined into the same chunk as preview.ts and the separate <script src> tags disappear from dist/preview.html, contradicting spc-2609061318090042's Risks note that a module-tagged script reference is preserved as its own copied file in the release bundle; pre-existing for article-video.js before map #10 touched anything, verified by inspecting dist/ after `npm run build`.

## Grounds

- pursued: the note claims a module-tagged script reference survives a release build as its own file; the falsifying evidence is dist/preview.html after npm run build losing the separate <script src> tags, and the reassurance is the same built chunk, loaded directly in jsdom with no source-file shortcuts, producing ArticlePage/ArticleVideo/ArticleControls plus the toolbar markup exactly as the standalone unit tests expect them
