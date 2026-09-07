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
resolution: "The article's keyboard script no longer steals the browser's own keys: reading-keys.ts drops s-f and bare Down/Up from the reading views' own honoured chords, and article-keys.js exempts a C-c/C-x prefix start from preventDefault while a text selection is non-empty (see DECISIONS.md 2026-09-07)."
impact: fix
---

The article's keyboard script takes the browser's own keys from every reader: bare Down and Up no longer scroll, Cmd-F opens the page's search instead of the browser's, and C-c and C-x alone are prevented so copy and cut stop working on Windows and Linux

## Grounds

- pursued: bare Down/Up and Cmd-F are proven unhonoured (defaultPrevented is false) in src/core/render/article-keys.test.ts's new describe blocks, and a selected C-c/C-x no longer starts the prefix window
