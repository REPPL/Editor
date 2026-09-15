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
resolution: "Settled by the maintainer on 2026-09-15: abcd docs lint is the seventh command a change must pass, listed in AGENTS.md beside the six with what it checks and why it stays outside npm run lint, which a contributor without the abcd binary must still be able to run. With .abcd/docs-lint.json armed (iss-2609150805260550) the command is no longer a vacuous green."
impact: internal
---

npm run lint does not run the documentation-currency check at all: its lint:docs step is node tools/generate-canon-reference.mjs --check, which verifies the generated canon reference and has nothing to do with docs currency, while abcd docs lint is a separate tool no gate invokes. The six commands a change must pass therefore never look at change narration, broken relative links or stray root markdown

## Grounds

- pursued: the documentation rule is enforced by a named gate every change runs, without making the Node gates depend on the abcd binary; wrong if a change with change narration or a dead link in docs/ can pass the documented gates
