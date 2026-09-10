---
schema_version: 1
id: "iss-2609061209123970"
slug: "in-the-present-window-navigation-now-moves-the-index-but-onl"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/core/render/slides.css"
resolution: "Slides positioned over the stage; hidden by visibility; proven on the built binary"
impact: fix
resolved_by:
  commit: "81caa12"
---

In the present window navigation now moves the index but only the title slide is visible: the log shows every slide display block and the slides box three windows tall, so reveal's inline display styles override the stylesheet and the section slides stack below the window

## Grounds

- pursued: the engine owns display inline, so the stylesheet must hide by a property the engine never writes; wrong if a future engine version writes visibility too
