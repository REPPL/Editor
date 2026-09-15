---
schema_version: 1
id: "iss-2609150805270660"
slug: "npm-run-lint-does-not-run-the-documentation-currency-check-a"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "package.json"
---

npm run lint does not run the documentation-currency check at all: its lint:docs step is node tools/generate-canon-reference.mjs --check, which verifies the generated canon reference and has nothing to do with docs currency, while abcd docs lint is a separate tool no gate invokes. The six commands a change must pass therefore never look at change narration, broken relative links or stray root markdown
