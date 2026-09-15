---
schema_version: 1
id: "iss-2609151505091345"
slug: "the-three-commits-of-pr-2-carry-a-co-authored-by-trailer-for"
severity: "nitpick"
category: "observation"
source: "user-observation"
found_during: "committing"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/rules.json"
---

The three commits of PR #2 carry a Co-Authored-By trailer for the AI beside the Assisted-by trailer, against the COMMITTING rule that AI-assisted commits carry the Assisted-by trailer only and never Co-Authored-By. The history is merged and is not rewritten; the lapse is recorded so the next commit does not repeat it
