---
schema_version: 1
id: "iss-2609150805260550"
slug: "abcd-docs-lint-checks-no-banned-token-in-this-repo-and-its-g"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/docs-lint.json"
---

abcd docs lint checks no banned token in this repo and its green is vacuous: .abcd/docs-lint.json carries banned_tokens as an empty list and rules as an empty object, so planting Previously and formerly in a docs page inside the configured roots still reports 0 findings, 0 blockers. The DOCUMENTATION rule that docs are present tense with no change narration has therefore been unenforced, and a green from this tool has been cited as evidence that it was met
