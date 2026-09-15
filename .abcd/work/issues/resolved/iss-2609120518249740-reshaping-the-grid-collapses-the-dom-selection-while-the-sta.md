---
schema_version: 1
id: "iss-2609120518249740"
slug: "reshaping-the-grid-collapses-the-dom-selection-while-the-sta"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/window-grid.ts"
resolution: "Fixed in e8925bb: refreshSelection in src/editor.ts writes the DOM selection from the state through domAtPos for the window holding the keyboard after every reshape, so the next flush agrees with the state. Pinned by src/document.test.ts, 'keeps the caret where it was a frame after the area divided'."
impact: fix
resolved_by:
  intent: "itd-2609081931493520"
  spec: "spc-2609111105376860"
  commit: "e8925bb"
---

Reshaping the grid collapses the DOM selection while the state's is untouched, and CodeMirror trusts the DOM: after C-x 3 the state read head 12 while getSelection() read anchor 0 on a DIV outside .cm-content, and the next frame wrote 0 into the state, so every split silently sent the caret to the top of the chapter

## Grounds

- pursued: after a reshape the DOM selection is rewritten from the state rather than trusted; wrong if the caret lands at the top of the chapter a frame after C-x 3
