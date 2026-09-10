---
schema_version: 1
id: "iss-2609051921384677"
slug: "alice-cannot-move-between-the-editing-surface-and-the-sideba"
severity: "major"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/keys.ts"
promoted_to: itd-2609051921482691
resolution: "shipped as the sidebar-navigation intent in 0.2.0"
impact: additive
shipped_in: v0.2.0
resolved_by:
  intent: "itd-2609051921482691"
  spec: "spc-2609051925374395"
---

Alice cannot move between the editing surface and the sidebar without the mouse: Emacs window-switching chords (C-x o to cycle focus, C-n and C-p to move through the tree, Return to open, C-g back to the editor) are missing, and the same vocabulary should reach every panel

## Grounds

- pursued: one Emacs window vocabulary across the editor, the sidebar, and every panel lets Alice keep her hands on the keyboard; wrong if the sidebar needs pointer-only gestures the tree cannot express
- pursued: one Emacs window vocabulary across the editor, the sidebar and every panel keeps Alice's hands on the keyboard; wrong if the sidebar needs pointer-only gestures
