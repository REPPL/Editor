---
schema_version: 1
id: "iss-2609081929528202"
slug: "the-maintainer-settles-the-vocabulary-question-editor-follow"
severity: "major"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/keys.ts"
promoted_to: itd-2609091722353594
resolution: "Shipped across three intents. h as map 36 shipped it, unchanged. F2 showing and hiding from any pane, with C-c C-s left alone because it is already the bold and italic prefix and the vendored package resolves a prefix the instant a multi-step binding sits under it — itd-2609091722296239. F1 on the keys-panel row, from the editing surface only, and the C-x C-h prefix overlay Editor lacked, on demand rather than which-key's timer — itd-2609091722353594. The wider settlement it opens with, that Editor follows Emacs's defaults wherever Emacs has one, is evidenced in the 2026-09-08 divergence note and its full chord sweep, which found no shipped criterion naming any candidate chord except C-- for redo and C-x o"
impact: additive
resolved_by:
  intent: "itd-2609091722353594"
  spec: "spc-2609091733496272"
---

The maintainer settles the vocabulary question: Editor follows Emacs's default bindings wherever Emacs has one, rather than the proposed C-x/C-c redesign, with four additions — h hides the sidebar while it holds the keyboard (shipped), C-c C-s and F2 show it and F2 hides it again, F1 shows the prefix's commands as C-x C-h does, and the C-x C-h overlay itself, which Editor lacks

## Grounds

- pursued: an author who already knows Emacs finds every chord where Emacs put it, and a prefix that shows its own commands removes the need to remember the rest; wrong if the overlay reads as noise mid-chord, or if F1 as one chord rather than a full help prefix disappoints the hands that expect F1 b and F1 k
- pursued: four additions in the free space buy what a whole vocabulary redesign was reaching for, at a fraction of the cost of realigning chords already shipped, tested and documented; wrong if the maintainer finds in use that the Emacs defaults they never reach for crowd out the Editor moments they do
