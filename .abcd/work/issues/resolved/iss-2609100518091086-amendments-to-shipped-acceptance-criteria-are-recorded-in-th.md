---
schema_version: 1
id: "iss-2609100518091086"
slug: "amendments-to-shipped-acceptance-criteria-are-recorded-in-th"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development/intents/shipped"
resolution: "The premise was wrong and the sweep is the finding. Across all twelve commits that have ever touched shipped intents there is exactly ONE post-ship criterion amendment without inline provenance — map 30's ac-5, already annotated by hand earlier today — so what was captured as a pattern is a single instance. The reason is mechanical: abcd's audit ingestion writes one hunk at the Audit Notes heading and never touches a byte above it, which makes a criterion structurally hard to amend silently. Counts: 1 found, 0 annotated, 4 left alone with reasons, one of them deliberately — annotating it in this repository's form would mean quoting the text it replaced, which was a privacy scrub of a local document folder's name and would put a banned name back into a committed record. The real exposure the sweep found is one layer down and is captured separately as iss-2609100633302137"
impact: internal
---

Amendments to shipped acceptance criteria are recorded in the ledger and the commit message but not inline in the criterion, so a stale audit verdict beside an already-amended criterion reads as a live failure; 5c476f5 amended map 30's cycle criterion this way and iss-2609091757014163 was raised against a criterion that had already moved

## Grounds

- pursued: the sweep was worth running precisely because it could have found many and found one, and a captured pattern that turns out to be a single instance is a finding to record rather than a fix to make; wrong if a future hand-edit to a criterion lands in a commit whose message does not say so, which no ingestion discipline would catch and this sweep's method would miss
