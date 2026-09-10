---
schema_version: 1
id: "iss-2609051919515730"
slug: "in-the-present-window-the-type-does-not-grow-with-the-window"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/core/render/slides.css"
resolution: "Type scales with both viewport axes; back arrows drawn only when enabled"
impact: fix
resolved_by:
  commit: "ecab097"
---

In the present window the type does not grow with the window and the navigation controls do not reflect where the deck can go: the deck should scale its type with the viewport (viewport units, no fixed canvas) and reveal's controls must track the slide state

## Grounds

- pursued: a viewport type scale grows with the window without a fixed canvas; wrong if WebKit resolves the clamp differently from the evaluator
