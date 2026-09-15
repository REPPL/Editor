---
schema_version: 1
id: "iss-2609151454305437"
slug: "the-splitting-acceptance-row-that-saves-from-m-x-with-the-ke"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "manual-acceptance"
origin: researcher-authored
production_mode: hand-written
found_at: "src/keys.ts"
---

The splitting acceptance row that saves from M-x with the keyboard in the sidebar cannot be performed as shipped: M-x (command-palette) is an editor-owned row in src/keys.ts, so the sidebar does not answer it, and the letters typed for the command name fall through to the sidebar's own keys, where h hides the tree and the rest lands in the chapter. Witnessed twice in the running shell on 2026-09-15. Either the palette becomes reachable from every pane, as F2 is, or the row is amended to reach the save another way; the maintainer's call
