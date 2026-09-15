---
schema_version: 1
id: "iss-2609151133532075"
slug: "once-abcd-docs-lint-is-armed-it-reports-three-unresolved-lin"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "docs-lint"
origin: researcher-authored
production_mode: hand-written
found_at: "docs/how-to-move-through-the-outline.md"
resolution: "The article's image example moved into a fenced markdown block, which the linter skips, and the two outline table rows show the syntax as split code spans, the label and the address in separate spans, so no inline code reads as a link. abcd docs lint reports zero blockers. The linter's reading inside inline code is left for abcd upstream."
impact: internal
---

Once abcd docs lint is armed it reports three unresolved links in docs/ that are not links: the C-c l and C-c C-i rows of docs/how-to-move-through-the-outline.md show the syntax as inline code, [label](url) and ![alt](src), and docs/how-to-preview-and-read-the-article.md shows an image with a caption and a credit the same way. The linter reads inside inline code but skips a fenced block, so the three examples need a form the linter does not mistake for a link: a fenced block for the article example and split code spans for the two table rows. The skipping of inline code is the linter's to fix upstream, not this repo's

## Grounds

- pursued: the three examples keep their syntax visible while no inline code parses as a link; wrong if a reader can no longer see what C-c l or an image with a credit produces
