---
schema_version: 1
id: "iss-2609070642208293"
slug: "c-x-c-o-switches-the-shell-s-document-root-and-watcher-befor"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "three-reviewer-code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/app.ts"
resolution: "pickAndOpenSource now runs mayDiscard() between the pick and openDocumentSource, so a declined discard claims no nonce and never moves the shell's document root or watcher; proven by a spy test in src/open-source.test.ts"
impact: fix
---

C-x C-o switches the shell's document root and watcher before asking whether unsaved edits may be discarded, so answering keep leaves the page on the old chapter while the next save is refused as outside the open document

## Grounds

- pursued: a discard confirmed before the nonce is claimed keeps the old chapter and the old root in step; shown wrong by a test proving a refused discard still calls openDocumentSource
