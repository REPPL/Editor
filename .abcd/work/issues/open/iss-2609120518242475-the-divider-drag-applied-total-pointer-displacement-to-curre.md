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
---

The divider drag applied total pointer displacement to current shares rather than to the shares at drag start, so travel grew as its square and the divider pinned against the floor within about twenty pixels and could not be dragged back
