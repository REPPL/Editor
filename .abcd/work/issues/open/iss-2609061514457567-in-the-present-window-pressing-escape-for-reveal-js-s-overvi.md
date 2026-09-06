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
---

In the present window, pressing Escape for reveal.js's overview shows every slide's text and images stacked on the first slide while every other slide in the overview is empty; the fix that placed every slide over the stage and hid by visibility (iss-2609061209123970) leaves the overview mode, which lays slides out itself, reading the fluid stylesheet's absolute placement
