---
schema_version: 1
id: "iss-2609100647546880"
slug: "the-cat-trail-s-closed-spec-contradicts-what-shipped-spc-260"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-audit"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development/specs/closed"
resolution: "The spec is amended, not the decision. A dated amendment quotes what it said and records that the maintainer declined moving the breakpoint as a way to make room for the cat — that answer stands, and the cat is hidden below 1280 — while the breakpoint moved later the same day for an independent and worse defect, the message's width above it being unbounded rather than marginal. Nine shorter markers point at it from every section that leaned on the old reading, both stale claims are corrected, and M40-9 is rewritten from a screenshot comparison against a moved baseline into a reading of the footer's own information, with a sixty-character-title row and a row at 821 for the floor above the breakpoint. The stylesheet comment that still claimed the narrow footer was unchanged is corrected too"
impact: internal
resolved_by:
  spec: "spc-2609091733493366"
---

The cat trail's closed spec contradicts what shipped: spc-2609091733493366's Design section declines raising the modeline's own-line breakpoint from 520 to 820 as out of scope and put-to-the-maintainer-and-declined, and states iss-2609100445317801 is out of scope in both directions, while the delivered stylesheet makes exactly that move for an independent reason — the budget above the breakpoint was unbounded, not merely marginal — and that issue's resolution names this spec as its fix; the spec's text was never reconciled and its manual check M40-9 now compares the footer against a baseline that has moved

## Grounds

- pursued: a closed spec that says a thing was declined while the tree does that thing is a record that reads false, and the honest repair names which question was actually answered rather than pretending one decision reversed another; wrong if a reader takes the amendment as the maintainer having changed their mind about the cat, which is the misreading it is written to prevent
