---
schema_version: 1
id: "iss-2609120518244372"
slug: "openchapter-held-its-window-id-across-two-awaits-so-c-x-0-mi"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/app.ts"
resolution: "Fixed in e8925bb: openChapter in src/app.ts checks alive(held) after each await and returns before giving a closed window a buffer, so no dead id enters buffer.windows. Pinned by src/document.test.ts, 'keeps the buffer's accounting honest when a window closes mid-load'."
impact: fix
resolved_by:
  intent: "itd-2609081931493520"
  spec: "spc-2609111105376860"
  commit: "e8925bb"
---

openChapter held its window id across two awaits, so C-x 0 mid-load left a dead id in the buffer's window set that leaveBuffer never removed, after which the buffer never rested its text and unsaved edits stopped counting as unsaved

## Grounds

- pursued: a window closed while its read is in flight never enters the buffer's window set; wrong if unsaved edits stop counting as unsaved after C-x 0 mid-load
