---
id: itd-2609051335502171
slug: cite-from-a-bibliography-file
spec_id: spc-2609061318151591
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317455985]
---

# Cite from a bibliography file

## Press Release

Alice keeps a BibTeX file beside her document and names it in the
document's metadata. When she wants to cite something, she types an
opening bracket and an at sign, and the editor completes the key from
that file as she types. Hovering a completed key shows the matching
reference without taking her out of the sentence. One key —
`[@smith2020]`, or `[@smith2020, p. 4]` when the page matters — is the
whole gesture. Footnotes work the same way, in the same plain syntax.

That one key becomes three different things without Alice doing anything
more. Bob, reading the article on his laptop, sees a numbered marker in
the paragraph and the full reference in the margin beside it, so he never
leaves the sentence to find out who said it. Carol, in the audience while
Alice presents the same chapter, sees a short source line at the foot of
the slide. The journal PDF that arrives with every publish carries a
numbered reference and a reference list at the end. Alice types no
reference list anywhere: every one of them is built from the keys the
text actually uses, so a passage she cuts takes its reference with it.

When a key resolves to nothing — a typo, or a work she has not added to
the file yet — no rendering quietly prints the brackets as literal text.
The preview marks the citation, and the chapter's row in the sidebar
lists the unresolved key beside what else that chapter carries. Alice
finds out while she is writing, not from the projector.

## Why This Matters

A reference typed by hand is a reference that drifts. Alice writes the
same work into an article, a deck, and a paper, and the three copies
diverge the moment she corrects one of them — and correcting all three is
work she has to remember to do. Worse, a reference list typed by hand
keeps entries for passages that no longer exist and quietly loses the
ones she added last. Naming a source once, by a key, and letting every
rendering ask the same file for the answer removes both problems and the
proof-reading pass that goes with them.

## Mechanism

- We expect completion plus hover to be enough for Alice to stop typing
  references by hand, because the reading half of this is already proven:
  the article prototype renders numbered citations with their full
  reference in the margin and readers stay in the text
  (`03-evidence.md`, "The article prototype"). Only the authoring gesture
  is new, so the risk sits in one place.
- We expect a citation key to be safe to write into the canon because it
  is Pandoc's own `[@key]` form against a BibTeX file, which
  `02-constraints.md` locks. Emacs, Pandoc, and any plain renderer read
  the chapter unchanged; an unrecognised key degrades to visible text
  rather than to a broken construct.
- We expect one resolution step, shared by every rendering, to keep the
  three renderings honest, because the reference list is a function of
  the one tree and the one bibliography rather than three per-renderer
  implementations (`05-internals.md`, section 4, the `bibliography`
  module). This is falsifiable: hand the same chapter to the article, the
  deck, and the PDF, and the entries, the numbering, and the omissions
  must match, or the claim is wrong.
- We expect unresolved keys to be catchable at writing time rather than
  at publish time, because the sidebar already reports per chapter what
  that chapter carries, and an unresolved key is one more such fact
  (`04-surfaces.md`, section 1).
- We expect this moment to need a purpose-built test document, because
  the acceptance project contains zero citations, footnotes,
  bibliography, code fences, or block quotes (`03-evidence.md`, "The
  acceptance project"). Nothing in the real material exercises this, so
  a document written for the test is the only evidence available.

## Scope Conditions

- Platform: authoring happens in the desktop app, in the system web view; <!-- cond: cond-2609061318155423 -->
  display happens in the online article, the deck, and the journal PDF.
  The bibliography is a BibTeX file inside the document folder, named in
  the document's metadata, and it is read from disk with no network call.
- Population: Alice is the only person who writes a citation. Bob reads <!-- cond: cond-2609061318154843 -->
  the article, Carol watches the deck or receives the PDF; neither is
  offered any control over how a reference is displayed.
- Assumption: exactly one citation style is configured per document. Which <!-- cond: cond-2609061318151558 -->
  styles ship first is open in `03-evidence.md`, so this intent covers the
  configured style resolving, generating, and agreeing across renderings,
  not the catalogue of styles.
- Assumption: a chapter with no citations and a document with no <!-- cond: cond-2609061318157278 -->
  bibliography file are both ordinary cases, not errors. The reference
  list is simply absent.
- Boundary with map #9, itd-2609051335489928 (Read the document as a Tufte <!-- cond: cond-2609061318153081 -->
  article): in scope here is the key, the file, the resolution, and the
  generated reference list; out of scope is where the margin note sits on
  the page, how it folds on a narrow screen, and what the navigation does
  with it — #9 owns the article's layout.
- Boundary with map #5, itd-2609051335447894 (Present a chapter with no <!-- cond: cond-2609061318153640 -->
  slide markup): in scope here is that a Section's citations resolve to a
  source credit for that slide; out of scope is the slide mapping itself
  and where the credit line sits on the slide — #5 owns the deck.
- Boundary with map #21, itd-2609051336019782 (Receive a journal-style <!-- cond: cond-2609061318153883 -->
  PDF with the document): in scope here is the entries the PDF is given
  and their agreement with the other two renderings; out of scope is the
  printed artefact — numbering style on the page, the foot-of-page rule,
  the contents list — which #21 owns.
- Boundary with map #3, itd-2609051335415528 (Insert a construct I cannot <!-- cond: cond-2609061318155500 -->
  remember): #3 owns only that choosing "citation" or "footnote" in the
  palette puts the canonical form at the cursor; this intent owns what
  happens to that form afterwards, including completion, hover, and
  resolution.
- Out of scope: the BibTeX reader itself and the implementation of any <!-- cond: cond-2609061318154649 -->
  particular style, which are plumbing in `05-internals.md`; and the
  removal of a citation that sits inside a filtered variant block, which
  the *variant fidelity* discipline owns.

## Acceptance Criteria

- Given a document whose metadata names `bibliography: references.bib`,
  and a chapter containing `[@smith2020]` where that key exists in the
  file, when Alice opens the preview, then the citation renders as a
  numbered marker at that point and the entry's full reference appears in
  the margin beside its paragraph, and the generated reference list holds
  exactly the entries the chapter cites and no others.
- Given the same document, when Alice types `[@smi` in the editor, then
  the completion list offers every key in `references.bib` beginning with
  those letters, and resting on a completed key shows that entry's
  author, title, and date in place, without opening a separate window.
- Given a chapter containing `[@smith2020, p. 4]` and a Pandoc footnote
  written as `^[an inline note]`, when the article is produced from that
  chapter, then the citation carries its locator, the footnote appears as
  a margin note, and the entry appears exactly once in the article's
  generated reference list; and when the deck is produced from the same
  chapter, then the slide carries a source credit line naming that work
  and carries no reference list at all, because a deck has a credit line
  per slide and nothing else. The same criterion binds against the PDF
  from phase 6, when the paper exists to be compared: the article's list
  and the paper's must then hold the same entries in the same order, and
  the credit line on the slide must name a work that appears in both.
- Given a chapter containing `[@nosuchkey]`, where that key is in no
  entry of `references.bib`, when Alice opens the preview, then the
  citation is marked as unresolved in the preview and the key is listed
  against that chapter in the sidebar, and no rendering prints
  `[@nosuchkey]` as literal bracketed text to a reader.
- Given a Section whose text carries a citation, when Alice presents that
  chapter, then the slide for that Section shows a short source line at
  its foot naming the cited work, and the slide carries no margin note
  and no reference list.
- Given a document whose metadata names no bibliography file, and a
  chapter carrying no citation, when the article, the deck, and the
  preview are produced, then each renders the chapter in full, no
  reference list appears anywhere, and nothing is reported as an error:
  a document with no bibliography is an ordinary document. (Negative
  case.)
- Given the published article open at iPhone width (390 CSS px), when Bob
  reaches a paragraph carrying a citation, then the margin reference
  folds into the flow directly beneath that paragraph, and neither the
  page nor the reference requires horizontal scrolling or pinch zoom; and
  at iPad width (820 CSS px) and desktop width (1280 CSS px) the
  reference sits in the margin beside its paragraph with nothing wider
  than the viewport.
- Given a chapter carrying citations and footnotes, when it is opened in
  a plain Markdown tool that knows nothing of the canon, then every
  citation and footnote is readable as ordinary text and no construct
  stops the tool rendering the rest of the chapter.
- Inherits: the renderings agree (`itd-2609051336130664`) — this intent is
  its first hard test, and the worked test is that the deck's credit line
  names a key the article's and the paper's lists both carry, not that
  the deck has a list; one source, always (`itd-2609051336090390`);
  degrade gracefully in a plain tool (`itd-2609051336110536`); legible on
  three device classes (`itd-2609051336128348`), at 390, 820, and 1280
  CSS px; round-trip byte-fidelity (`itd-2609051336074533`); network only
  on publish (`itd-2609051336158553`); and variant fidelity
  (`itd-2609051336107315`), from phase 3 where it binds, which owns the
  removal of a citation inside a filtered block and of its entry from
  that variant's list.

## Open Questions

- Which citation styles ship first (`03-evidence.md`, "Open questions",
  "Citations"). Until this is settled, the acceptance criteria above
  describe one configured style, not a choice offered to Alice.
- What a footnote does on a slide. The mapping table in
  `05-internals.md` section 3 gives citations and footnotes one row, and
  `04-surfaces.md` section 5 describes only citations on the deck, so
  whether a footnote inside a Section reaches its credit line or is
  absent from the slide altogether is not yet written down.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-54bb87ee6800 -->
Fidelity review — receipt rcp-54bb87ee6800 (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:19869a347b6317fa656e15acf262277f96fb5b47c0d826a5ebc4175b2a3a64e0
Input attestations: diff:c1bcf7b..cae1734@sha256:4a5e182af9d3f4549b332eff9cf5e02954a79320d0844b9f6d74d8d0a15cfc16; intent:.abcd/development/intents/shipped/itd-2609051335502171-cite-from-a-bibliography-file.md@-; spec:.abcd/development/specs/closed/spc-2609061318151591-cite-from-a-bibliography-file.md@-; checklist:.abcd/.work.local/logs/acceptance/spc-2609061318151591.md (M11-1..M11-4, every row unticked)@-; test-run:npx vitest run --reporter=verbose: 50 files, 1017 passed, 0 failed (bibliography.test.ts 36, citations.test.ts 25, html.test.ts 11, deck.test.ts 27, slides.test.ts 20, sidebar.test.ts 10, document.test.ts 27, preview.test.ts 10, build.test.ts 34, publish/services.test.ts 7, export/services.test.ts 8)@-; test-run:cargo test --manifest-path src-tauri/Cargo.toml: 237 passed, 0 failed (metadata::reads_the_bibliography_a_document_names, metadata::reports_no_bibliography_for_a_document_that_names_none, metadata::refuses_a_bibliography_the_document_names_but_does_not_carry included)@-; probe:vite-node scratch script over parseChapter/buildDeck/renderSlides with a resolved bibliography: a rule-opened slide face rendered < span class="citation">[@nosuchkey]< /span> and < span class="citation">[@carroll1999]< /span> literally@-;

Acceptance rollup: MET 3 · MET_WITH_CONCERNS 3 · NOT_MET 1 · INCONCLUSIVE 2

Per-criterion verdicts:
- ac-1 — MET: the preview numbers a resolved key, writes the full reference in the margin and appends a list holding one entry per cited key in first-citation order and no others
  evidence: src/preview.test.ts:111 — "numbers a resolved citation and appends the generated reference list"
  evidence: src/core/render/article.test.ts:128 — "writes a resolved citation as a numbered marker, with the full reference in the margin"
  evidence: src/publish/build.test.ts:548 — "numbers the article's reference list in first-citation order, one entry per cited key"
  evidence: src/core/bibliography.test.ts:236 — "numbers keys in first-citation order, one entry per key, no others"
- ac-2 — MET_WITH_CONCERNS: the completion tooltip lists every key matching the typed prefix and the hover summary names author, title and date through a hoverTooltip in place; the concern is that the pointer-resting hover itself is jsdom-undrivable (M11-2 unticked) and Tab accepts only the first candidate
  evidence: src/citations.test.ts:180 — "lists every matching key once a bibliography is set and the trigger is typed"
  evidence: src/citations.test.ts:141 — "names a resolved key's author, title and date, plainly"
  evidence: src/citations.ts:299 — "export const citationHoverTooltip = hoverTooltip((view, pos) => {"
  evidence: src/citations.ts:288 — "{ key: "Tab", run: acceptFirstCandidate },"
- ac-3 — MET_WITH_CONCERNS: the locator is carried inside the brackets, the inline footnote is a margin note, the entry appears once in the list, the deck slide carries a credit line and no list, and the article's list and the deck's credit lines are proven to agree; the PDF clause is deferred to phase 6 and nothing was compared against a paper
  evidence: src/core/render/html.test.ts:47 — "carries a locator after the number, inside the brackets, the number still linked"
  evidence: src/core/render/article.test.ts:150 — "puts a citation and a footnote from the same paragraph in the margin"
  evidence: src/publish/build.test.ts:586 — "gives every deck slide whose Section cites a resolved key a credit line naming it, and no reference list"
  evidence: src/publish/build.test.ts:597 — "agrees: the article's reference list and the deck's credit lines name the same works, in the same order"
  evidence: .abcd/development/specs/closed/spc-2609061318151591-cite-from-a-bibliography-file.md:273 — "the paper does not exist until map #21 (phase 6). `src/core/render/print` is not seeded."
- ac-4 — NOT_MET: the preview marks the key and the sidebar lists it, but the promise that no rendering prints [@nosuchkey] as literal bracketed text to a reader is contradicted by the deck: slides.ts builds a RenderContext with no citations, html.ts falls back to the literal text, slides.test asserts that fallback, and a probe over a rule-opened slide (prose on the face, which the audience reads) rendered < span class="citation">[@nosuchkey]< /span>
  evidence: src/preview.test.ts:125 — "marks an unresolved key rather than printing its brackets"
  evidence: src/document.test.ts:592 — "lists a chapter's unresolved citation keys, from the shell's own bibliography read"
  evidence: src/core/render/slides.ts:102 — "return { resolve, rendering: "slides", variant };"
  evidence: src/core/render/html.ts:275 — "return `<span class="citation">${escapeText(node.text)}</span>`;"
  evidence: src/core/render/slides.test.ts:194 — "keeps a citation as the literal text the author wrote"
  evidence: src/core/deck.ts:131 — "A slide opened by a rule sends it to the face"
- ac-5 — MET: citationLinesFor adds a citation foot line per resolved key on the Section's slide, slides.ts renders it inside the slide foot, and the test asserts no reference list anywhere in the deck
  evidence: src/core/deck.test.ts:346 — "names the cited work at the foot of the Section's slide"
  evidence: src/core/render/slides.test.ts:199 — "names the cited work at the foot of the slide, with no reference list anywhere"
  evidence: src/core/render/slides.ts:187 — "return `<p class="citation">${escapeText(line.text ?? "")}</p>`;"
- ac-6 — MET: a document naming no bibliography reads back Ok(None) from the shell, the build and the resolver render an ordinary chapter with no list and throw nothing
  evidence: src/publish/build.test.ts:693 — "renders a chapter with neither a citation nor a bibliography as an ordinary chapter"
  evidence: src/core/bibliography.test.ts:312 — "resolves nothing against an empty bibliography, without throwing"
  evidence: src-tauri/src/metadata.rs:84 — "pub fn read_bibliography(root: &Path) -> Result< Option< String>, String> {"
- ac-7 — INCONCLUSIVE: the margin reference rides map #9's one fold rule and no new breakpoint was added, but no test renders a width and M11-1 is unticked
  evidence: src/core/render/article.css:356 — "@media (min-width: 760px)"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318151591.md:610 — "[ ] At 390: the margin note folds into the flow directly beneath its"
- ac-8 — INCONCLUSIVE: no delivered test opens a chapter in a plain Markdown tool; the claim rests on the forms being Pandoc's own, and M11-4 is unticked
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318151591.md:644 — "[ ] Open the same chapter in a plain Markdown viewer or in Emacs with no"
- ac-9 — MET_WITH_CONCERNS: renderings agree (the worked test), network only on publish (the bibliography is read from disk and the app makes no request) and byte-fidelity (parse round-trip) are cited; the concern is that 'one resolution step' became two resolutions sharing one parse, and the plain-tool and three-width disciplines are unverified
  evidence: src/publish/build.test.ts:597 — "agrees: the article's reference list and the deck's credit lines name the same works, in the same order"
  evidence: src/publish/build.ts:635 — "const citations = citationsFor(tree, options.bibliography, "article");"
  evidence: src/publish/build.ts:636 — "const deckCitations = citationsFor(tree, options.bibliography);"
  evidence: src/document.test.ts:539 — "attempts no network request while a document is open"
  evidence: src/local-documents.test.ts:546 — "parses and round-trips every chapter byte for byte"

Gap audit:
- honoured:
  - a numbered marker in the paragraph and the full reference in the margin, with the list built from the keys the text uses
    evidence: src/preview.test.ts:111 — "numbers a resolved citation and appends the generated reference list"
  - the editor completes the key from the file as Alice types
    evidence: src/citations.test.ts:180 — "lists every matching key once a bibliography is set and the trigger is typed"
  - a short source line at the foot of the slide
    evidence: src/core/deck.test.ts:346 — "names the cited work at the foot of the Section's slide"
  - an unresolved key is marked in the preview and listed against the chapter in the sidebar
    evidence: src/preview.test.ts:125 — "marks an unresolved key rather than printing its brackets"
    evidence: src/document.test.ts:592 — "lists a chapter's unresolved citation keys"
  - a document with no bibliography is an ordinary document
    evidence: src/publish/build.test.ts:693 — "renders a chapter with neither a citation nor a bibliography as an ordinary chapter"
- diverged:
  - no rendering quietly prints the brackets as literal text; the deck's slide face does
    evidence: src/core/render/slides.test.ts:194 — "keeps a citation as the literal text the author wrote"
    evidence: src/core/render/slides.ts:102 — "return { resolve, rendering: "slides", variant };"
  - one resolution step shared by every rendering; delivered as two resolutions (article-filtered and deck-unfiltered) over one parse
    evidence: src/publish/build.ts:636 — "const deckCitations = citationsFor(tree, options.bibliography);"
  - completion accepts only the first candidate on Tab, with no way to reach a second by keyboard
    evidence: src/citations.ts:288 — "{ key: "Tab", run: acceptFirstCandidate },"
- missing:
  - the journal PDF's numbered reference and reference list
    evidence: .abcd/development/specs/closed/spc-2609061318151591-cite-from-a-bibliography-file.md:273 — "`src/core/render/print` is not seeded."
  - a rendered check of the margin reference at 390, 820 and 1280 CSS px
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318151591.md:604 — "## M11-1 — legible at 390, 820, and 1280 CSS pixels"
  - a plain-tool degrade check
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318151591.md:642 — "## M11-4 — degrades in a plain tool"

Scope-condition dispositions:
- cond-2609061318155423 — narrowed: authoring happens in the app and the bibliography is read from disk with no network call, and display reaches the article and the deck; the journal PDF does not exist to display anything
  narrowing: holds for authoring in the desktop app and display in the online article and the deck; the journal PDF is absent until phase 6
  evidence: src-tauri/src/metadata.rs:84 — "pub fn read_bibliography(root: &Path) -> Result< Option< String>, String> {"
  evidence: .abcd/development/specs/closed/spc-2609061318151591-cite-from-a-bibliography-file.md:273 — "the paper does not exist until map #21 (phase 6)"
- cond-2609061318154843 — survived: the deck's credit line and the article's list are computed from the resolution with no reader-facing control, and the reader toolbar offers no reference control
  evidence: src/core/deck.ts:424 — "function citationLinesFor(slide: Draft, resolution: CitationResolution | undefined): FootLine[] {"
  evidence: src/core/render/article-controls.js:35 — "var CONTROLS = ["
- cond-2609061318151558 — survived: exactly one style, numeric, is configured and an unrecognised style falls back to it rather than offering a choice
  evidence: src/core/bibliography.ts:398 — "export const DEFAULT_CITATION_STYLE = "numeric";"
- cond-2609061318157278 — survived: a chapter with no citations and a document with no bibliography both render as ordinary, with the list simply absent and nothing thrown
  evidence: src/publish/build.test.ts:693 — "renders a chapter with neither a citation nor a bibliography as an ordinary chapter"
  evidence: src/core/bibliography.test.ts:312 — "resolves nothing against an empty bibliography, without throwing"
- cond-2609061318153081 — survived: the article's citation margin note reads the resolution into map #9's renderMarginNote and changes nothing about where it sits or folds
  evidence: src/core/render/article.ts:416 — "function citationMarginNotes(node: Inline, article: Article): string[] {"
  evidence: src/core/render/article.ts:401 — "export function renderMarginNote(kind: string, body: string, id: string | null = null): string {"
- cond-2609061318153640 — survived: a Section's citations resolve to a FootLine of a new kind rendered inside the slide foot map #5 already owns; the slide mapping itself is untouched
  evidence: src/core/deck.ts:46 — "readonly kind: "credit" | "footnote" | "citation";"
  evidence: src/core/render/slides.ts:186 — "if (line.kind === "citation") {"
- cond-2609061318153883 — untested: the PDF does not exist in this delivery, so which entries it is given and whether they agree was neither exercised nor contradicted
- cond-2609061318155500 — survived: this delivery starts at the typed '[@' and owns completion, hover and resolution from there; the insert palette was not changed
  evidence: src/citations.ts:66 — "export function citationTriggerAt(lineText: string, column: number): CitationTrigger | null {"
- cond-2609061318154649 — falsified: the condition placed the BibTeX reader and the style implementation outside this intent as plumbing; this intent's own spec built both (parseBibliography and the numeric formatReference) inside its scope, while the variant-removal half stayed with the discipline
  evidence: src/core/bibliography.ts:216 — "export function parseBibliography(text: string): Bibliography {"
  evidence: src/core/bibliography.ts:371 — "export function formatReference(entry: BibEntry): string {"
  evidence: .abcd/development/specs/closed/spc-2609061318151591-cite-from-a-bibliography-file.md:246 — "new: the BibTeX reader (`parseBibliography`)"
## Grounds

- pursued: a citation resolves against a document's bibliography the same way in the article's numbered marker and margin note, the article's generated reference list, and the deck's per-slide credit line, all read from one resolveCitations call per document; an unresolved key never prints as literal brackets anywhere and is listed against its chapter in the sidebar; the editor completes and hovers a citation key from the same bibliography with no new dependency. This would be shown wrong by: the deck's credit line naming a work the article's reference list omits or numbers differently, an unresolved key appearing as [@key] text in the article, or the editor's completion list missing a key the bibliography carries.
