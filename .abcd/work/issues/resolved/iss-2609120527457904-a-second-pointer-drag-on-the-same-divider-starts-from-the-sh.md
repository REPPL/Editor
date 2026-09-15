---
schema_version: 1
id: "iss-2609120527457904"
slug: "a-second-pointer-drag-on-the-same-divider-starts-from-the-sh"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/window-grid.ts"
resolution: "The divider reads live shares at pointerdown through sharesAt rather than the grid being redrawn after a drag. A redraw on release changes nothing visible, since the drag already wrote the shares to the DOM, yet it re-parents every view and forces the focused one's focus and selection in the middle of a pointer gesture — precisely where WebKit's blur-on-re-parent bites — to refresh a number the grid can simply ask the tree for. Reverting reports 0.501 where 0.701 is right, the snap back to half"
impact: fix
resolved_by:
  spec: "spc-2609111105376860"
---

A second pointer drag on the same divider starts from the shares before the first drag: the divider closure captures the WindowSplit node built at draw time, and commit writes new shares into the tree without redrawing the grid, so pressing the divider again snaps it back to its pre-drag position and moves from there. Keyboard resize chords are unaffected because they redraw

## Grounds

- pursued: shares live in the tree, so the drag should ask the tree rather than trust a node captured at draw time, and asking avoids a redraw in the worst frame to force focus in; wrong if a path exists that changes shares without the tree seeing them
