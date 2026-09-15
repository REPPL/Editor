---
schema_version: 1
id: "iss-2609120518248719"
slug: "a-drop-asked-the-focused-window-s-chapter-while-writing-into"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/drop-target.ts"
---

A drop asked the focused window's chapter while writing into the window under the pointer, so the shell would copy a file beside one chapter and the reference resolve to nothing in another
