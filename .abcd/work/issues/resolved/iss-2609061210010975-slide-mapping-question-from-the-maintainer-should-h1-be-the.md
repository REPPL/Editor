---
schema_version: 1
id: "iss-2609061210010975"
slug: "slide-mapping-question-from-the-maintainer-should-h1-be-the"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/core/deck.ts"
resolution: "Implemented the candidate rule for the whole-document deck: buildDocumentDeck and buildChapterDecks in src/core/deck.ts now run chapters horizontally with their Sections hanging vertically and Sub-sections folded into notes when a document holds more than one chapter, unchanged for one chapter and for the single-chapter present window; tests pin both shapes and docs/explanation-the-document-model.md states the rule."
impact: additive
---

Slide mapping question from the maintainer: should H1 be the presentation title with H2 horizontal and H3 vertical (as built), or H1 horizontal and H2 vertical? Candidate rule that serves both: the top heading level present in what is being presented runs horizontally and the next level hangs vertically, so a single chapter presents H2 across and H3 down while a whole document presents its chapters (H1) across and their H2 down with H3 folded into notes

## Grounds

- pursued: a published or exported deck for a document of several chapters shows each chapter as a horizontal slide with its Sections nested vertically beneath it and no Sub-section slide of its own; it would be wrong if a two-chapter document's deck still placed a second chapter's Sections on the same horizontal line as the first chapter's, or if a one-chapter document's published deck differed at all from presenting that chapter with C-c C-p
