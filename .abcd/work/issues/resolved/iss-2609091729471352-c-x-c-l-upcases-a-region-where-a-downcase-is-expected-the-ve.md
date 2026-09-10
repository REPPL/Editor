---
schema_version: 1
id: "iss-2609091729471352"
slug: "c-x-c-l-upcases-a-region-where-a-downcase-is-expected-the-ve"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/keys.ts"
resolution: "upcase-region keeps C-x C-u alone and a new downcase-region row takes C-x C-l. Because the vendored keymap answered both chords with the identical upcase, splitting the table was not enough: registerEditorChords in src/emacs.ts now registers editor:upcase-region and editor:downcase-region and binds each row's chords over the package's, both delegating to one changeCaseRegion helper that runs the package's own changeCase with only the direction differing. This is the same shape as the existing scroll-up/scroll-down pair from iss-2609061510051784, so it is the file's second instance of one pattern rather than a new mechanism. Proved behaviourally, not by the table: the test selects one region twice and asserts ALICE AND BOB then alice and bob, and was verified to fail with the package's upcase when the bindKey loop was removed"
impact: fix
---

C-x C-l upcases a region where a downcase is expected: the vendored package binds both C-x C-u and C-x C-l to the identical changeCase upcase call, and the upcase-region row in src/keys.ts inherited the conflation, so Editor has no way to lower-case a region at all

## Grounds

- pursued: binding Editor's own command over the package's is how this file already corrects a vendored chord that does the wrong thing, so a reader meets one pattern twice rather than two patterns once; wrong if a later package upgrade changes the registration order and the package's binding starts winning again, which the behavioural test would catch
