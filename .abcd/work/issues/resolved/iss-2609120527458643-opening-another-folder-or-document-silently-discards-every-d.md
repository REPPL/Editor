---
schema_version: 1
id: "iss-2609120527458643"
slug: "opening-another-folder-or-document-silently-discards-every-d"
severity: "critical"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/app.ts"
resolution: "mayReplaceDocument, built from anyDirty and dirtyTitles in the exact shape quit and confirmClose were already widened to, now gates openFolder — so the shell's menu route too — and pickAndOpenSource. mayDiscard is left for openChapter, whose own over-asking is a separate question. The prompt's wording did need changing: it named one chapter while forgetDocument cleared three, so the one-or-many sentence is written once in discardQuestion and confirmClose reads it too, the tail being all a gesture chooses. Reverting the fix reports no question asked at all"
impact: fix
resolved_by:
  spec: "spc-2609111105376860"
---

Opening another folder or document silently discards every dirty buffer except the focused window's: mayDiscard asks only bufferHere, while openFolder and openDocumentSource gate on it and then call forgetDocument, which clears every buffer. Before splitting, one buffer was all buffers so the guard was total; quit and confirmClose were widened to anyDirty and these two open routes were not, so a window with unsaved edits that does not hold the keyboard loses them with no question asked, including edits resting in a buffer whose window was closed with C-x 0

## Grounds

- pursued: the open routes must ask about every dirty buffer once buffers outlive windows, and reusing the sentence quit already asks means one wording cannot drift from the other; wrong if a fourth route into forgetDocument exists that neither gate covers
