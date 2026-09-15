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
---

Reshaping the grid collapses the DOM selection while the state's is untouched, and CodeMirror trusts the DOM: after C-x 3 the state read head 12 while getSelection() read anchor 0 on a DIV outside .cm-content, and the next frame wrote 0 into the state, so every split silently sent the caret to the top of the chapter
