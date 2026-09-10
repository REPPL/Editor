---
schema_version: 1
id: "iss-2609052143457583"
slug: "the-sidebar-navigation-intent-s-cycle-criterion-editor-sideb"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "intent-audit"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: ".abcd/development/intents/shipped"
resolution: "Amended ac-5 in the shipped sidebar-navigation intent and its closed spec's Design and Acceptance Mapping to state the cycle as built: registered panels hold the three-step cycle, a modal overlay closes on departure and holds a two-step cycle with a negative case; no code or docs page needed changing."
impact: internal
---

The sidebar-navigation intent's cycle criterion (editor, sidebar, panel, editor with a keys panel or palette open) is not met by design since the abandoned-overlay fix: an overlay is closed when the keyboard leaves it, so the three-step cycle holds only for the publish and settings panels; the audit records NOT_MET and the criterion wants amending to say so

## Grounds

- pursued: a fidelity audit re-run against ac-5 now finds MET against src/focus.ts and src/focus.test.ts as they already stand; it would be wrong if the amended Given-When-Then still expected a keys-panel or insert-palette overlay to survive a departing C-x o, since panelTarget.release cancels it by design
