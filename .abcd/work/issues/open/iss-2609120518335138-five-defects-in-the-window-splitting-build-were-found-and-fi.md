---
schema_version: 1
id: "iss-2609120518335138"
slug: "five-defects-in-the-window-splitting-build-were-found-and-fi"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/work/issues"
---

Five defects in the window-splitting build were found and fixed inside one agent pass, so the ledger records that arrived after the fix rather than before it, against the ISSUES rule that a finding is recorded before anyone fixes it; the detector in each case was the agent's own adversarial re-read rather than an armed test, and each fix was proved non-vacuous by editing forward and back
