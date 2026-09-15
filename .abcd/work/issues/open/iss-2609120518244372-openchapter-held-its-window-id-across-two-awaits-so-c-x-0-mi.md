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
---

openChapter held its window id across two awaits, so C-x 0 mid-load left a dead id in the buffer's window set that leaveBuffer never removed, after which the buffer never rested its text and unsaved edits stopped counting as unsaved
