---
schema_version: 1
id: "iss-2609120518242475"
slug: "the-divider-drag-applied-total-pointer-displacement-to-curre"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/window-grid.ts"
resolution: "Fixed in e8925bb: the divider drag in src/window-grid.ts reads the shares at pointerdown into 'began' and steps from them on every move, so travel is linear in pointer displacement. Pinned by src/window-grid.test.ts, 'moves the divider to where the pointer is, not to where it has been' and 'brings the divider back when the pointer comes back'."
impact: fix
resolved_by:
  intent: "itd-2609081931493520"
  spec: "spc-2609111105376860"
  commit: "e8925bb"
---

The divider drag applied total pointer displacement to current shares rather than to the shares at drag start, so travel grew as its square and the divider pinned against the floor within about twenty pixels and could not be dragged back

## Grounds

- pursued: a drag applies pointer displacement to the shares at drag start, never to the current ones; wrong if a divider dragged out and back does not return to where it began
