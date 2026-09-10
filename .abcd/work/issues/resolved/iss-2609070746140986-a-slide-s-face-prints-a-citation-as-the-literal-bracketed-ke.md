---
schema_version: 1
id: "iss-2609070746140986"
slug: "a-slide-s-face-prints-a-citation-as-the-literal-bracketed-ke"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-audit"
origin: researcher-authored
production_mode: hand-written
found_at: "src/core/render/slides.ts"
resolution: "src/core/render/slides.ts's renderSlides now takes the deck's own citations resolution and threads it into the headline and face context (never the speaker notes); publish/build.ts's citationsFor always returns EMPTY_RESOLUTION for the deck instead of undefined, and hands it to renderSlides; present.ts resolves the chapter's citations the same way preview.ts does, through doctree.ts's readBibliography. A resolved key on the face now renders the same numbered marker as the article, an unresolved key the marked bare key, never literal brackets; the foot's credit line is unchanged and speaker notes keep the literal text."
impact: fix
---

A slide's face prints a citation as the literal bracketed key: slides.ts builds its render context without the resolved citations, so [@smith2020] and [@nosuchkey] both reach the audience as written, although the intent promises no rendering prints the brackets to a reader; the face should carry the same numbered marker as the article for a resolved key and the marked bare key for an unresolved one, with the credit line at the foot unchanged

## Grounds

- pursued: the failing-test-first fix in src/core/render/slides.test.ts and src/present.test.ts, proving a rule-opened slide's face renders the numbered marker (resolved) or the marked bare key (unresolved) rather than the literal [@key] brackets the fidelity audit's probe found, with the notes-only and article-deck-agreement tests still passing
