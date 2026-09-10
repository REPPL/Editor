---
schema_version: 1
id: "iss-2609100445317801"
slug: "the-modeline-s-message-budget-is-already-marginal-at-820-css"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/style.css"
resolution: "Worse than captured and fixed accordingly. The budget was not marginal above the breakpoint, it was unbounded: the message shared its line with the chapter title and no cell but the message could shrink, so a sixty-character title at 821 pixels left the message no room and pushed the line sideways. Two rules answer it — the own-line breakpoint moves from 520 to 820, the sidebar's own width so one number answers for both, and above it the message carries min-width min(52ch, 100%) while the title becomes the cell that yields. A new test reads the stylesheet and asserts the ch value equals MODELINE_BUDGET so the two cannot drift. The existing test passed because it asserted every message string is within 52 characters, which was always a promise about the messages and never about the line they are read on"
impact: fix
resolved_by:
  spec: "spc-2609091733493366"
---

The modeline's message budget is already marginal at 820 CSS pixels: MODELINE_BUDGET is 52 characters but at that width the message cell gets about 365 pixels, roughly 50 characters, and the budget is only actually guaranteed at 520 and below where the message takes its own line

## Grounds

- pursued: stating the budget in its own units in the line's own monospace face, and naming which cell yields, makes the promise true at every width for the first time; wrong if a chapter title ellipsised at a width the maintainer works at reads as lost information rather than as the title yielding
