---
schema_version: 1
id: "iss-2609111123510084"
slug: "once-a-chapter-s-buffer-outlives-the-window-showing-it-the-d"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "intent-plan"
origin: researcher-authored
production_mode: hand-written
found_at: "src/app.ts"
---

Once a chapter's buffer outlives the window showing it, the discard prompt on a chapter switch asks about a loss that no longer happens: confirmDiscard's Discard them? wording is a shipped promise with tests, and switching chapters will discard nothing
