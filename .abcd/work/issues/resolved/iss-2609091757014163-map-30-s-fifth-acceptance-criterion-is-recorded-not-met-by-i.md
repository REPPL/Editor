---
schema_version: 1
id: "iss-2609091757014163"
slug: "map-30-s-fifth-acceptance-criterion-is-recorded-not-met-by-i"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development/intents/shipped"
resolution: "The criterion was in fact amended in 5c476f5, before this issue was raised: it now states the two-step walk for an overlay-backed panel and the three-step walk for a registered one, with the negative case named. What was missing was the amendment's own provenance, so the stale ac-5 NOT_MET verdict in the intent's Audit Notes read as a live failure against a criterion that had already moved. A dated provenance note is added to the criterion naming the commit, the cause iss-2609052115254279, and the audit verdict as the stale artefact"
impact: internal
---

Map 30's fifth acceptance criterion is recorded NOT_MET by its own ingested audit and was never amended: panelTarget.release cancels an overlay the moment the keyboard leaves it, so the three-step cycle the criterion promises holds only for the registered panels and the walk is editor, sidebar, editor for every overlay-backed one; the divergence sits in DECISIONS.md while the shipped criterion still reads as a promise

## Grounds

- pursued: an amendment that carries its own provenance stops a stale audit verdict being read as an open failure; wrong if other criteria amended in that same commit are also unprovenanced, which would make this one fix of a pattern rather than of an instance
