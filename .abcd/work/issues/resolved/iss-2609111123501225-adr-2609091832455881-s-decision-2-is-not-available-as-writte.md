---
schema_version: 1
id: "iss-2609111123501225"
slug: "adr-2609091832455881-s-decision-2-is-not-available-as-writte"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-plan"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development/decisions/adrs"
resolution: "adr-2609091832455881's decision 2 is amended in place and the intent's second mechanism claim is recorded as falsified, both dated and both quoting what they said. Each window now holds its own EditorState and the states of every window on one chapter are kept in lockstep by echoing the change set synchronously, annotated so the echo does not echo back, added to no history and carrying no selection, so each receiving window's caret is mapped through the change for free. The original decision's purpose survives — one text stays one text, and two drifting copies remain the wrong feature — only its mechanism changes. The cost, per-window undo, is recorded as a scope condition and was settled by the maintainer"
impact: internal
resolved_by:
  spec: "spc-2609111105376860"
---

adr-2609091832455881's decision 2 is not available as written: EditorState declares both doc and selection as its own fields and the view holds no selection, so two views sharing one state share one caret drawn twice, which is the very falsifier itd-2609081931493520's second mechanism claim names. Shared state and per-window cursor positions are mutually exclusive in CodeMirror 6, and the honest substitute is per-view states kept in lockstep by echoing the change set

## Grounds

- pursued: a mechanism claim checked against the installed sources before any code is written is the cheapest place to be wrong, and this one was wrong in exactly the way its own falsifier named; wrong if the lockstep echo drifts under an extension that writes changes the author did not type, which is why alignTables is the canary the spec tests first
