---
schema_version: 1
id: "iss-2609061132369973"
slug: "in-the-0-2-0-release-app-c-c-c-p-shows-a-single-page-with-no"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/present.ts"
---

In the 0.2.0 release app C-c C-p shows a single page with no navigation: no arrow moves to another slide (maintainer's report on a real window)

## Cause, from the present log on the maintainer's window (2026-09-06)

Two mounts logged, 5 and 9 slides, the first slide marked `present`, and
`engine: absent` both times: `globalThis.Reveal` is undefined in the
release build. `present.html` loads the vendored `reveal.js` (a UMD file)
as a module script; the bundler resolves the UMD's CommonJS branch and
exports it as a module instead of assigning the global, so the page's
`engine()` finds nothing and no navigation, controls, or keyboard exist.
The dev server serves the raw file, where the global branch runs, which is
why the window worked there and the jsdom test (which evaluates the file
into the global itself) passed.
