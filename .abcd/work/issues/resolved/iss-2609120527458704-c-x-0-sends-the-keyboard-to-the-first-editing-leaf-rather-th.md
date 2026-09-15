---
schema_version: 1
id: "iss-2609120527458704"
slug: "c-x-0-sends-the-keyboard-to-the-first-editing-leaf-rather-th"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/focus.ts"
resolution: "C-x 0 now moves the keyboard to the window that receives the closed window's space, which is Emacs's rule and satisfies both the doc page's neighbouring and the criterion's adjacent, so no doc claim had to be corrected — the fix makes the page true. heirOf takes the next child of the closing window's own split, the previous when it is last, and the nearest leaf when that child is itself a split, following the same rule resizeTarget uses so the two chords cannot disagree about which side a neighbour is on. Reverting reports w1 where w2 is right"
impact: fix
resolved_by:
  spec: "spc-2609111105376860"
---

C-x 0 sends the keyboard to the first editing leaf rather than a neighbour of the window that closed: reconcile takes editorWindows index zero, while the how-to page promises a neighbouring window and the intent's ninth criterion says adjacent. In a layout of one beside a nested pair, closing the third window moves the keyboard to the first; the criterion's own case passes only because there the first leaf happens to be adjacent

## Grounds

- pursued: the destination a reader was promised is the one Emacs gives, and sharing resizeTarget's side rule keeps two chords from disagreeing about what adjacent means; wrong if a layout exists where the heir is not the window that visibly took the space
