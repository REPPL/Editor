---
schema_version: 1
id: "iss-2609081932293752"
slug: "the-maintainer-settles-the-sidebar-s-showing-and-hiding-f2-t"
severity: "major"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/keys.ts"
wontfix_reason: "written from a reading the maintainer corrected within the minute: h stays as map #36 shipped it and F2 is added beside it, so nothing is reversed; the settled rule is recorded in the capture that follows this one"
---

The maintainer settles the sidebar's showing and hiding: F2 toggles it and nothing else does, which removes the bare h that shipped in 0.3.1 as map #36, stops C-x o opening a hidden sidebar on its way in, and frees C-x C-b for the Emacs default list-buffers; map #36 is reversed rather than refined and its shipped intent needs superseding

## Grounds

- declined: written from a reading the maintainer corrected within the minute: h stays as map #36 shipped it and F2 is added beside it, so nothing is reversed; the settled rule is recorded in the capture that follows this one
