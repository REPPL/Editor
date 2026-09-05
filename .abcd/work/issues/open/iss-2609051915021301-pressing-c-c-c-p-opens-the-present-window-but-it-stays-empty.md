---
schema_version: 1
id: "iss-2609051915021301"
slug: "pressing-c-c-c-p-opens-the-present-window-but-it-stays-empty"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/present.ts"
---

Pressing C-c C-p opens the present window but it stays empty in the running app

## Observations from the maintainer, 2026-09-05

- After pressing the right arrow once, the first slide's title shows and
  nothing else.
- Enlarging the window does not scale the text.
- The back control stays grey when there is a slide to go back to.
