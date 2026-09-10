---
schema_version: 1
id: "iss-2609081707572166"
slug: "in-the-0-3-1-release-app-the-maintainer-cannot-reach-the-sid"
severity: "critical"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/focus.ts"
resolution: "Answered against all three chords. C-x o was mute rather than broken: the cycle walked back round to the pane it started in and called that a move; it now stops one short and announces Nowhere else to go through the modeline, and F2 is the route to a hidden sidebar. C-x C-o is doing its job — it answers open-file-or-folder from itd-2609061509393380 and is not a cycle chord. C-c C-o is bound to nothing and stays unbound"
impact: fix
resolved_by:
  spec: "spc-2609091724073619"
---

In the 0.3.1 release app the maintainer cannot reach the sidebar from the editing surface: C-x o, C-x C-o and C-c C-o all do nothing, so with the sidebar hidden or the keyboard in the text there is no way back to the tree

## Grounds

- pursued: nowhere else to go is one condition however it arose, so one modeline sentence answers the empty tree, the hidden tree and the unloaded app alike; wrong if the maintainer meets a fourth way for the cycle to be empty that the sentence does not cover, or if the real cause of the dead chords in the 0.3.1 app was the web view never handing keys to the surface at all, which only the manual check can settle
