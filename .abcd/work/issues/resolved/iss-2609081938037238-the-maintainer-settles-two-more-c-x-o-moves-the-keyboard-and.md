---
schema_version: 1
id: "iss-2609081938037238"
slug: "the-maintainer-settles-two-more-c-x-o-moves-the-keyboard-and"
severity: "major"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/focus.ts"
promoted_to: itd-2609091722353838
resolution: "Shipped as itd-2609091722353838 (spec spc-2609091724073619). C-x o moves the keyboard among panes that are shown and never changes what is shown; a hidden sidebar is not a pane, the cycle stops one short of the pane it started in rather than reporting a move that did not happen, and announces Nowhere else to go. That one sentence answers the empty tree, the hidden tree and the unloaded app alike, which is what settled the critical bug iss-2609081707572166. The splits half of this settlement is not built: it is scoped by adr-2609091832455881, proposed, awaiting the maintainer's read before itd-2609081931493520 is planned"
impact: breaking
resolved_by:
  intent: "itd-2609091722353838"
  spec: "spc-2609091724073619"
---

The maintainer settles two more: C-x o moves the keyboard and never changes what is shown, so a hidden sidebar is not a pane and the chord skips it and says so in the modeline, which reverses the third acceptance criterion of shipped map #36; and the multiple windows asked for are Emacs's own splits inside the one frame, C-x 2, C-x 3, C-x 0, C-x 1 with C-x o cycling, not separate operating-system windows

## Grounds

- pursued: a chord that moves the keyboard and never changes what is shown is one rule an author can hold in their head, and a modeline sentence turns a dead chord into a report; wrong if skipping a hidden sidebar leaves the maintainer without a route back that their hands find
- pursued: moves-the-keyboard-never-changes-what-is-shown is one rule holdable without knowing the app's state, and a modeline sentence turns a dead chord into a report; wrong if a fourth way for the cycle to be empty turns up that the sentence does not cover
