---
schema_version: 1
id: "iss-2609061509390620"
slug: "the-maintainer-asks-for-c-x-c-o-to-open-a-file-or-a-folder-t"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/keys.ts"
promoted_to: itd-2609061509393380
---

The maintainer asks for C-x C-o to open a file or a folder: today C-x C-f opens a document folder and C-x C-o is a second chord for moving to the other pane beside C-x o, so the chord must move to opening, a single Markdown file must be given a meaning (a one-chapter document rooted where the file sits, nothing written), and the pane command keeps C-x o alone as Emacs does

## Grounds

- pursued: one open chord that takes a file or a folder lets Alice open whatever she has in front of her without knowing the folder model first; wrong if a single file opened without a document folder behind it misleads her into editing something the publish and deck paths cannot see
