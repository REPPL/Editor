---
schema_version: 1
id: "iss-2609091858449023"
slug: "paneof-now-denies-the-sidebar-while-dom-focus-is-really-insi"
severity: "critical"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/focus.ts"
resolution: "paneOf and reconcile now ask a new canHold() predicate — is this pane drawn, with something a cursor can sit on — while cycle and to keep asking available(), which is canHold plus shown; the two questions were one only while a tree's sole way of not being a pane was having no rows. A six-case regression group in src/focus.test.ts focuses a real tree button and dispatches at document.activeElement rather than through press(), and was verified to fail against the pre-fix predicate"
impact: fix
resolved_by:
  spec: "spc-2609091724073619"
---

paneOf now denies the sidebar while DOM focus is really inside it: sidebarTarget.available() requires sidebar.open and paneOf consults it, so above 820 CSS pixels where a hidden sidebar is still a rendered column, focus arriving on a tree row by Tab or assistive technology leaves the model naming Editor while the keyboard is on a tree button, with no reader answering F2, C-x C-b, C-x o or h

## Grounds

- pursued: separating where the keyboard IS from where the cycle MAY move it keeps the model from ever naming a pane that does not have the keys; wrong if a third question turns out to be hiding inside canHold, or if reconcile asking canHold leaves a keyboard stranded in a pane that has genuinely gone away
