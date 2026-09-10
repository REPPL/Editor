---
schema_version: 1
id: "iss-2609081716367990"
slug: "the-maintainer-proposes-a-vocabulary-redesign-the-sidebar-hi"
severity: "major"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/keys.ts"
promoted_to: itd-2609081929528479
resolution: "Settled the other way, and the settlement is built. The proposed C-x/C-c redesign was surveyed in the 2026-09-08 evidence note and declined: read against vanilla Emacs's own global map the table already agrees almost everywhere that matters, the proposal's C-c half describes space Emacs deliberately leaves free for exactly the document vocabulary Editor already puts there, and realigning a chord already shipped, tested and documented costs more than adding one that is free. Its intent draft itd-2609081929528479 is superseded, carrying the reasoning for the decline. What was built instead is Emacs's defaults plus four additions: h as shipped, F2 showing and hiding the sidebar from any pane with C-x C-b freed to Emacs's chapter-list chord, C-x o moving the keyboard and never changing what is shown, F1 on the keys-panel row, and the C-x C-h prefix overlay"
impact: fix
resolved_by:
  intent: "itd-2609081929528479"
---

The maintainer proposes a vocabulary redesign: the sidebar hidden by default; C-x as the prefix for every standard dialogue (open, close, print, save, find) with a which-key style overlay listing the prefix's commands; C-c plus a single letter for everything specific to the document; C-x C-o to switch to the other window and to open the sidebar again; C-x C-h or a bare h to hide it from the sidebar. Three parts collide with Emacs or with each other and need settling before any build

## Grounds

- pursued: an author whose hands know Emacs should find every chord where Emacs put it, and a prefix that shows its own commands removes the need to remember the rest; wrong if Editor's own moments have no room left in the spaces Emacs leaves free, or if the maintainer finds the defaults they never use crowd out the ones they do
- declined: the redesign is not worth its cost against a table that already follows Emacs where Emacs has an opinion, and the four additions buy what the redesign was reaching for in free space instead; wrong if the maintainer finds in use that the Emacs defaults they never reach for crowd out the Editor moments they do, which is the risk the original grounds named and is a finding to capture against the settled intents
