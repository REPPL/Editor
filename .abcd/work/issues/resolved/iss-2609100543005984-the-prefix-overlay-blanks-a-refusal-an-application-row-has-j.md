---
schema_version: 1
id: "iss-2609100543005984"
slug: "the-prefix-overlay-blanks-a-refusal-an-application-row-has-j"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/app.ts"
resolution: "The prefix overlay's wiring now guards the announcement the way src/command-palette.ts already guarded the identical call: the return is read, and only a non-empty string is announced, so a row that announced its own refusal and then returned null keeps what it said on screen. Proved by a test driving the overlay route rather than the chord route, verified to fail against the unfixed line with expected '[Editor]-- aliceL1:C3' to contain 'No region to change case'"
impact: fix
---

The prefix overlay blanks a refusal an application row has just announced: src/app.ts's prefix-help wiring runs announce(runBinding(view, id) ?? ""), so a command that announces its own refusal and then returns null has that message wiped by the empty string. It hits every prose refusal, not only the region case change, and src/command-palette.ts already guards the same call correctly with if (said !== "")

## Grounds

- pursued: two call sites of one function should guard its null the same way, and the overlay route was the only one that did not; wrong if a third caller of runBinding exists that neither guards nor needs to, which would make this a pattern to state rather than two sites to align
