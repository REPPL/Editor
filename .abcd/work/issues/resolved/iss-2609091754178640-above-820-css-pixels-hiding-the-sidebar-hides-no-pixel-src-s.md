---
schema_version: 1
id: "iss-2609091754178640"
slug: "above-820-css-pixels-hiding-the-sidebar-hides-no-pixel-src-s"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/style.css"
resolution: "The display rule for a hidden sidebar is lifted out of the 820-pixel drawer query and stated once, unconditionally, beside the base rules: hiding is one behaviour, and only the shape while shown — drawer over the surface, or column beside it — is a function of width. No grid track had to collapse; the layout is a flex row with the surface at flex 1 1 auto and min-width 0, so the hidden element takes its basis with it and the surface grows into the space. Shipped with itd-2609091722296239. It also made map 36's 390-pixel criterion true, which had been false against the stylesheet since that intent shipped"
impact: fix
resolved_by:
  intent: "itd-2609091722296239"
  spec: "spc-2609091724077315"
---

Above 820 CSS pixels hiding the sidebar hides no pixel: src/style.css honours .sidebar[data-open=no] only inside the max-width 820px media query, so at a wider window the tree is a column the attribute does not affect, and F2, h and the C-x o refusal all act on a state the maintainer cannot see

## Grounds

- pursued: a chord that says it hides the sidebar hides it at every width, and one unconditional rule is fewer places for the two shapes to disagree; wrong if a wide window turns out to want the column kept and only narrowed, which is a layout preference the pixels of manual check M30-1 would surface
