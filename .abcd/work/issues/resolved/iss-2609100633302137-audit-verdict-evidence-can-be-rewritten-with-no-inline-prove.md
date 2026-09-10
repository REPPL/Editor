---
schema_version: 1
id: "iss-2609100633302137"
slug: "audit-verdict-evidence-can-be-rewritten-with-no-inline-prove"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development/intents/shipped"
resolution: "Graduated to the committed record as a convention, since the ingestion discipline that protects criteria cannot be added to verdicts from this repository. A RECORDS domain in .abcd/rules.json now injects on amend, supersede, criterion, audit notes, verdict, fidelity, shipped intent, closed spec and stale: amend a criterion in place with its date and superseding record, say when a verdict below it predates the rewrite, never hand-edit prose inside a verdict but re-run the audit or add a dated note beside it, never quote replaced text when the replacement was a privacy scrub, and amend a closed spec that contradicts the tree by naming which question was actually answered"
impact: internal
---

Audit-verdict evidence can be rewritten with no inline provenance and nothing protects it: abcd's ingestion writes one hunk at the Audit Notes heading and never touches a criterion above it, which is why post-ship criteria are structurally safe, but prose already inside a verdict has no such discipline — 588cf86 rewrote an evidence bullet and one clause of an ac-6 verdict in place, one citing a record inline and one citing nothing

## Grounds

- pursued: a discipline the tooling enforces for criteria and cannot enforce for verdicts is exactly the kind of gap a rule injected on the right keywords closes, and the four sibling rules were each learned the hard way in this session; wrong if the recall keywords miss the phrasing an agent uses when it reaches to correct a verdict, which would leave the rule true and silent
