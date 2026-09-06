---
schema_version: 1
id: "iss-2609061141024865"
slug: "alice-cannot-change-the-editing-surface-s-text-size-from-the"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/keys.ts"
promoted_to: itd-2609061141039863
---

Alice cannot change the editing surface's text size from the keyboard: C-x C-= should enlarge the text, C-x C-- shrink it, and C-x C-0 restore the default, as Emacs's text-scale commands do, persisting per machine

## Grounds

- pursued: a text scale on Emacs's own chords lets Alice match the surface to her eyes and screen without leaving the keyboard; wrong if the system's own zoom already serves and the chords collide with something Alice uses
