---
schema_version: 1
id: "iss-2609120518241050"
slug: "the-grid-host-s-paste-listener-also-caught-codemirror-s-own"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/window-grid.ts"
---

The grid host's paste listener also caught CodeMirror's own search field, so pasting a URL into an open C-s swallowed it and wrote the address into the chapter
