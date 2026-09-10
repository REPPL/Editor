---
schema_version: 1
id: "iss-2609061514457567"
slug: "in-the-present-window-pressing-escape-for-reveal-js-s-overvi"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/slides.css"
resolution: "src/core/render/slides.css scopes the fluid layout's transform:none!important to :not(.overview) and adds a .reveal.overview block making every slide visible/displayed (not only .present), so reveal.js's own Overview.layout()/update() inline transforms and grid positions take effect instead of being pinned to the stage's one resting position; src/present.ts gains a BoxReport.transform field and overviewshown/overviewhidden log phases"
impact: fix
---

In the present window, pressing Escape for reveal.js's overview shows every slide's text and images stacked on the first slide while every other slide in the overview is empty; the fix that placed every slide over the stage and hid by visibility (iss-2609061209123970) leaves the overview mode, which lays slides out itself, reading the fluid stylesheet's absolute placement

## Grounds

- pursued: a jsdom test in src/present.test.ts drives the real vendored reveal.js engine's own toggleOverview()/isOverview() and expects every top-level slide to get a distinct, non-empty inline transform and visibility:visible while overview is on, reverting on toggle-off; it was written and run failing against the unmodified stylesheet first (the visibility assertion failed exactly as diagnosed) and passes only with the CSS change. A regression would show as that test failing again, or as the byte-for-byte present.test.ts sweep of the ordinary one-slide-at-a-time behaviour breaking. The one thing this cannot prove automatically is a live Escape keypress on the built app in this sandbox, since GUI keystroke automation needs Accessibility permission this session does not have; that step is left for the maintainer's own keyboard
