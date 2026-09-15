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
resolution: "The lapse is recorded and answered: each of the five findings it names carries its own resolution citing the commit that fixed it and the test that pins it. No code change follows from a record of a discipline lapse."
impact: internal
resolved_by:
  intent: "itd-2609081931493520"
  spec: "spc-2609111105376860"
---

Five defects in the window-splitting build were found and fixed inside one agent pass, so the ledger records that arrived after the fix rather than before it, against the ISSUES rule that a finding is recorded before anyone fixes it; the detector in each case was the agent's own adversarial re-read rather than an armed test, and each fix was proved non-vacuous by editing forward and back

## Grounds

- declined: a record of a discipline lapse asks for the five records to be completed, not for code; wrong if any of the five findings lacks a resolution naming its fix and its test
