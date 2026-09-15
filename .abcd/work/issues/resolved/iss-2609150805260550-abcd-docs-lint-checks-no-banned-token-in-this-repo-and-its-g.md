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
resolution: "Armed .abcd/docs-lint.json: ten present-tense banned tokens (previously, formerly, used to, to be implemented, has been replaced, we switched, renamed from, in this release as blockers; no longer and deprecated advisory), each with a successor and an allow marker, plus links_resolve and stray_root_docs as blockers. Proved against a scratch copy: planted 'Previously' and 'formerly' and a dead link are reported as blockers. On the repo it reported three link findings, captured as iss-2609151133532075 and fixed, and one advisory that is legitimate prose."
impact: internal
---

abcd docs lint checks no banned token in this repo and its green is vacuous: .abcd/docs-lint.json carries banned_tokens as an empty list and rules as an empty object, so planting Previously and formerly in a docs page inside the configured roots still reports 0 findings, 0 blockers. The DOCUMENTATION rule that docs are present tense with no change narration has therefore been unenforced, and a green from this tool has been cited as evidence that it was met

## Grounds

- pursued: a green from abcd docs lint now means the DOCUMENTATION rule was checked; wrong if change narration or a dead relative link in docs/ passes the lint
