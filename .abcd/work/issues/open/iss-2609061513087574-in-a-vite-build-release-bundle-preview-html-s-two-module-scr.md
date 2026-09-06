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
---

In a `vite build` release bundle, `preview.html`'s two module script tags (article-video.js, and now article-controls.js) are inlined into the same chunk as preview.ts and the separate <script src> tags disappear from dist/preview.html, contradicting spc-2609061318090042's Risks note that a module-tagged script reference is preserved as its own copied file in the release bundle; pre-existing for article-video.js before map #10 touched anything, verified by inspecting dist/ after `npm run build`.
