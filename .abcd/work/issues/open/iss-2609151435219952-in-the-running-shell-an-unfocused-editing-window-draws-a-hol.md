---
schema_version: 1
id: "iss-2609151435219952"
slug: "in-the-running-shell-an-unfocused-editing-window-draws-a-hol"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "manual-acceptance"
origin: researcher-authored
production_mode: hand-written
found_at: "src/style.css"
---

In the running shell an unfocused editing window draws a hollow outline at its point, at 1280 with C-x 3 and in a four-window grid alike, where the splitting acceptance row M42-1 expects no caret at all. src/style.css says CodeMirror's drawSelection hides the caret in an unfocused window, but the block caret the Emacs keymap draws is a separate element that drawSelection does not govern, and its unfocused form is the outline. The active line is correctly not highlighted. Witnessed 2026-09-15 through the shell with real screenshots, not jsdom
