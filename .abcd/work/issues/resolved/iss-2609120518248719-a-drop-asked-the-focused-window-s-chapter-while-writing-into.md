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
resolution: "Fixed in e8925bb: the drop router's options hand over a DropWindow, the view and the chapter it shows together, resolved from the pointer for a drop (windowAt) and from the keyboard for a paste (focused), in src/drop-target.ts. Pinned by src/drop-target.test.ts, which drops into the window under the pointer."
impact: fix
resolved_by:
  intent: "itd-2609081931493520"
  spec: "spc-2609111105376860"
  commit: "e8925bb"
---

A drop asked the focused window's chapter while writing into the window under the pointer, so the shell would copy a file beside one chapter and the reference resolve to nothing in another

## Grounds

- pursued: the chapter the shell copies a file beside is the chapter of the window under the pointer; wrong if a file dropped into one window is copied beside another window's chapter
