---
schema_version: 1
id: "iss-2609081932488182"
slug: "the-maintainer-s-settled-sidebar-rule-the-bare-h-hides-the-s"
severity: "major"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/keys.ts"
promoted_to: itd-2609091722296239
resolution: "Shipped as itd-2609091722296239 (spec spc-2609091724077315). F2 shows and hides the sidebar from every pane, answered by both key readers rather than only the editing surface's CodeMirror extension, which is what made the chord unreachable from the tree; the bare h stays exactly as map 36 shipped it; C-x C-b is freed to Emacs's own chapter-list chord, reaching the same toggle, with the one divergence named — a second press hides where Emacs's list-buffers would refresh. Hiding now hides at every width: the display rule was lifted out of the 820-pixel drawer query, which also made map 36's 390-pixel criterion true for the first time"
impact: additive
resolved_by:
  intent: "itd-2609091722296239"
  spec: "spc-2609091724077315"
---

The maintainer's settled sidebar rule: the bare h hides the sidebar while the keyboard is in it, as map #36 shipped it, and F2 shows or hides it wherever the keyboard is; C-x C-b is freed for the Emacs default list-buffers

## Grounds

- pursued: a toggle reachable from any pane is the one route an author needs to the sidebar, and freeing C-x C-b returns it to Emacs's own chapter-list shape; wrong if the maintainer reaches for C-x C-b expecting a list that never closes and finds a second press hides the tree
- pursued: a toggle both readers answer is the one route an author needs to the sidebar from anywhere, and C-x C-b returns to the shape Emacs's C-x b / C-x C-b pair already has here; wrong if F2 is eaten by the macOS function-key setting, which only the manual check can settle
