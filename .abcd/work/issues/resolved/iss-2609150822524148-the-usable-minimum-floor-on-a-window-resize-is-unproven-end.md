---
schema_version: 1
id: "iss-2609150822524148"
slug: "the-usable-minimum-floor-on-a-window-resize-is-unproven-end"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "intent-audit"
origin: researcher-authored
production_mode: hand-written
found_at: "src/windows.ts"
resolution: "Two tests in src/focus.test.ts, 'stops narrowing the neighbour at the floor the measured split gives, and says so' and 'stops making a window taller at the floor the measured split gives', drive the resize chords through the application until the refusal is spoken and assert at every step that the yielding window's share times the measured extent never drops under MIN_WINDOW_WIDTH or MIN_WINDOW_HEIGHT, and that the final share is exactly the floor. The premise that floorShare is inert under test was wrong: the harness measures a split through the first window it contains, so the chord path is clamped. Proved non-vacuous by disabling the floor in resizeHere, which fails both tests at 200 and 144 pixels, then restoring."
impact: internal
resolved_by:
  intent: "itd-2609081931493520"
  spec: "spc-2609111105376860"
---

The usable-minimum floor on a window resize is unproven end to end: it is unit-tested with an explicit floor, inert on the chord path under test because floorShare returns null for an unmeasured extent, and never exercised against real pixels, so no automated run establishes that a window cannot be shrunk below usability

## Grounds

- pursued: the usable-minimum floor is enforced on the chord path against a measured extent, not only in stepShares given a floor; wrong if a resize chord can carry a window under 240 by 160 CSS pixels of what the harness measures
