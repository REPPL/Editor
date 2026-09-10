---
schema_version: 1
id: "iss-2609091858443451"
slug: "the-opinions-rule-domain-points-every-convention-at-abcd-dev"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development"
resolution: "The seven principle files the OPINIONS domain names are written, with a README indexing them, at .abcd/development/principles/. Each states the convention, why it earns its keep, what it costs, and how to tell it is being followed — a convention with no cost stated is a slogan and one with no test stated cannot be held to. Several were being exercised in this session without their text existing: the independent adversarial review that found the paneOf regression, the record-before-fixing discipline, and the refusal to add a second answer to how a binding line is drawn"
impact: internal
---

The OPINIONS rule domain points every convention at .abcd/development/principles/ and that directory does not exist in the tree, so seven named principle files an agent is told to read rather than guess cannot be read

## Grounds

- pursued: a rule that tells every agent to read a file rather than guess the convention is only worth its tokens if the file exists, and a written convention that names its own cost and its own test can be argued with rather than merely cited; wrong if the files drift from what the bundled OPINIONS one-liners say, which would leave two answers to each convention and is the failure one-canonical-primitive itself names
