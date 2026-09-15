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
resolution: "Fixed in e8925bb: onPaste in src/drop-target.ts returns unless the event landed inside the focused view's contentDOM, so a paste into CodeMirror's search field stays the field's. Pinned by src/drop-target.test.ts, 'leaves a paste into CodeMirror's own search field alone'."
impact: fix
resolved_by:
  intent: "itd-2609081931493520"
  spec: "spc-2609111105376860"
  commit: "e8925bb"
---

The grid host's paste listener also caught CodeMirror's own search field, so pasting a URL into an open C-s swallowed it and wrote the address into the chapter

## Grounds

- pursued: the grid host's paste listener answers only a paste that lands inside the focused window's content; wrong if a URL pasted into an open C-s field ever reaches the chapter
