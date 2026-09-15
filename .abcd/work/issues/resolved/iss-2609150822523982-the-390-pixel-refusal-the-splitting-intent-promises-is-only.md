---
schema_version: 1
id: "iss-2609150822523982"
slug: "the-390-pixel-refusal-the-splitting-intent-promises-is-only"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-audit"
origin: researcher-authored
production_mode: hand-written
found_at: "src/windows.ts"
resolution: "Settled by the maintainer on 2026-09-15 in favour of the shipped behaviour: width is no reason to refuse a division above and below, which is Emacs's own rule (window-min-height governs split-window-below; the frame's width does not). The criterion in itd-2609081931493520 is amended in place, dated and quoting what it said, and its Audit Notes verdict is marked as predating the amendment. No code changed; docs/how-to-split-the-editing-area.md already describes the shipped behaviour."
impact: internal
resolved_by:
  intent: "itd-2609081931493520"
  spec: "spc-2609111105376860"
---

The 390-pixel refusal the splitting intent promises is only half delivered: mayDivide answers true for a rows split at that width, so C-x 2 divides at 390 whenever the area is tall enough, while the criterion says the chords say so and the how-to page documents the delivered behaviour rather than the promised one. Only the left-and-right chord refuses there

## Grounds

- declined: the promise that both chords refuse at 390 is withdrawn rather than built, because a tall narrow area holds two usable windows above and below; wrong if C-x 2 at 390 ever produces a window under the usable minimum height
