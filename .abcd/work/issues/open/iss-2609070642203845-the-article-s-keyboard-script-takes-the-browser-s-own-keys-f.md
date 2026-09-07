---
schema_version: 1
id: "iss-2609070642203845"
slug: "the-article-s-keyboard-script-takes-the-browser-s-own-keys-f"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "three-reviewer-code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/article-keys.js"
---

The article's keyboard script takes the browser's own keys from every reader: bare Down and Up no longer scroll, Cmd-F opens the page's search instead of the browser's, and C-c and C-x alone are prevented so copy and cut stop working on Windows and Linux
