---
schema_version: 1
id: "iss-2609051930593419"
slug: "control-does-not-undo-in-the-running-app-although-the-bindin"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/keys.ts"
resolution: "Same cause as the Option chords: the keymap was absent from the bundle; C-/ derives from the physical key"
impact: fix
resolved_by:
  commit: "e9b510f"
---

Control-/ does not undo in the running app although the binding table names it (maintainer report; to confirm what WebKit sends for Control-slash)

## Grounds

- pursued: undo on Control-slash reaches the package once the keymap is installed; wrong if WebKit reports no code for the slash key
