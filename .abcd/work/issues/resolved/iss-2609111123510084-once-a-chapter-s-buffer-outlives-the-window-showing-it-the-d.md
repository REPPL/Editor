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
resolution: "Settled by the maintainer on 2026-09-15: openChapter in src/app.ts no longer asks on a chapter switch, and mayDiscard is gone; the switch leaves the chapter's buffer with its edits and the modeline still marks it unsaved, while quitting, replacing the document and C-x C-k keep their own questions. The shipped intent's line is amended in place, dated and quoting what it said. Pinned by src/emacs-keys.test.ts, 'switches chapter without asking, keeps the edits, and asks before they are lost'."
impact: fix
resolved_by:
  intent: "itd-2609081931493520"
---

Once a chapter's buffer outlives the window showing it, the discard prompt on a chapter switch asks about a loss that no longer happens: confirmDiscard's Discard them? wording is a shipped promise with tests, and switching chapters will discard nothing

## Grounds

- pursued: a question is asked only where an answer of yes loses something; wrong if a chapter's unsaved edits can be lost by switching away from it, or if any discarding gesture stops asking
