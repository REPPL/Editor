---
schema_version: 1
id: "iss-2609051428298697"
slug: "accessibility-for-assistive-technology-has-no-discipline-scr"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "three-reviewer-intent-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: ".abcd/development/brief/07-intent-map.md"
resolution: "Added the tenth discipline, Reachable by assistive technology (itd-2609061324342715), binding from phase 2, with its row in the 07-intent-map.md Disciplines table and a locked decision in 02-constraints.md."
impact: internal
---

Accessibility for assistive technology has no discipline: screen readers, keyboard-only use for non-Emacs readers, and colour-safe highlight defaults are unaddressed

## Grounds

- pursued: every future spec from phase 2 onward names this discipline in its acceptance criteria and a fidelity audit can check keyboard operability, screen-reader semantics, and colour-safe state against it; it would be wrong if a phase-2-or-later spec ships an interactive surface with no keyboard path off the Emacs chords, no accessible name on a custom control, or a state shown by colour alone
