---
id: itd-2609051335489928
slug: read-the-document-as-a-tufte-article
spec_id: spc-2609061318090042
kind: standalone
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: the-article
supersedes: [itd-2609051221553568, itd-2609051317463033]
---

# Read the document as a Tufte article

## Press Release

Bob opens the link Alice sent him and reads. The whole document is one
page: it carries the document's title, a contents list drawn from the
Parts, the Chapters, the Sections, and the Sub-sections, and a
generous measure with a wide margin beside it. Where Alice cited a source
or wrote a footnote, the reference sits in that margin, level with the
paragraph that made it, so Bob reads the note without leaving the
sentence. Images sit in the flow with their captions beneath them and
their credits alongside. He reads the whole thing top to bottom and never
jumps to a foot of a page.

Carol opens the same link on her phone. The margin folds away: each note
appears in the flow, just after the paragraph it belongs to, at the same
size as the text around it. Nothing scrolls sideways and nothing needs
pinching. On her iPad the margin comes back. It is the same page, the same
link, and the same file behind it.

Where the text carries a video, the article plays it if a source is
reachable. Carol on a train, out of reach of every source, sees the poster
frame and a link, in the place the video would have been, with its caption
under it.

Alice writes nothing extra to get this. The article is rendered from the
same chapter files that make the deck, so the constructs she wrote for the
talk leave no mark on the page: a speaker-notes div produces nothing, a
columns div puts its content in the flow, a divider heading is an ordinary
heading, and a page-break comment produces nothing. She writes one text,
and this is what a reader gets.

## Why This Matters

Alice's readers meet her long-form writing in one of two bad shapes: a
page that is comfortable on a laptop and unreadable on a phone, or a page
whose references sit at the foot so that following one costs the reader
their place. Serving Bob on a projector-lit laptop and Carol on a phone
has meant keeping more than one rendering, which is how copies of a text
drift apart. This moment gives every reader the same page, at the width in
front of them, with the sources beside the sentence, from a single source
text.

## Mechanism

- We expect margin notes to hold at iPhone, iPad, and desktop widths with
  stylesheet rules alone, because the reference article prototype already
  does exactly this: numbered citations with their full reference in the
  margin, "folding into the flow on narrow screens", which
  `03-evidence.md` reads as "margin notes work on all three device classes
  with CSS alone". Falsifiable: render one page at the three widths and
  look for any element wider than the viewport.
- We expect the book hierarchy to need no translation into a reading
  experience, because the prototype's title, two heading levels beneath
  it, and clickable contents list "map onto Chapter, Section, Sub-section
  with no translation" (`03-evidence.md`, the article prototype).
- We expect the article to need no article-specific authoring, because the
  construct table in `05-internals.md` section 3 gives the article its own
  column and every slide-only construct is marked ignored or absent in it.
  Falsifiable: a chapter containing every slide construct renders a page
  with no trace of them.
- We expect the video rule to be right rather than a compromise, because
  the prototype proves it in use: video "embeds on the web and shows a
  thumbnail with a link when the file is opened from disk"
  (`03-evidence.md`), which is the same fallback a reader out of reach of
  every source meets.
- We expect one renderer to serve every host, because `05-internals.md`
  section 4 makes the article renderer one module of a core shared
  unchanged by the app, the single file, the presenter site, and the
  pipeline, and calls a difference between hosts a bug in the core.
  Falsifiable, and against the hosts that actually render an article: the
  app's preview, the article pushed to the site by the publish action,
  and the article inside the single HTML file are compared for one
  document and must not differ. The pipeline renders the paper, not the
  page, so it is not one of the three.

## Scope Conditions

- Bundle: this intent belongs to the bundle **The article** (phase 2) with <!-- cond: cond-2609061318099562 -->
  map #10, `itd-2609051335492327`, "Read it the way I like it". One spec
  covers both: a Tufte page with no way to change the measure is half the
  reading experience.
- Platform: current Safari and Chromium engines at iPhone, iPad, and <!-- cond: cond-2609061318091913 -->
  desktop widths — 390, 820, and 1280 CSS px — on the
  presenter site and in the desktop app's preview. Native reading apps are
  out.
- Population: Bob and Carol reading a published document, and Alice <!-- cond: cond-2609061318092215 -->
  reading her own draft. No authoring gesture belongs to this moment.
- Assumption: in phase 2 the article renders the document's default <!-- cond: cond-2609061318096567 -->
  variant only. Variant marking and filtering are map #14 and the
  variant-fidelity discipline, in phase 3; from that phase the article
  renders whichever variant it is handed, and the discipline binds here.
- Boundary with map #10 (`itd-2609051335492327`): #9 owns the default page <!-- cond: cond-2609061318097929 -->
  — layout, measure, where a note sits, the contents list, the video rule.
  #10 owns the toolbar that changes theme, text size, and measure, and the
  persistence of those choices.
- Boundary with map #11 (cite from a bibliography file): #11 owns the <!-- cond: cond-2609061318091537 -->
  citation key, the bibliography file, resolution, and the generated
  reference list. #9 owns only where a resolved citation or footnote sits
  on the page and how it folds at narrow widths.
- Boundary with map #12 (find what is hidden in the text): #12 owns the <!-- cond: cond-2609061318092133 -->
  once-only opening quotation and the easter eggs — the marks, the tray,
  the collection, and the Konami reveal. #9 owns the page around them and
  implements none of that behaviour.
- Boundary with map #16 (point a video at several sources): #16 owns the <!-- cond: cond-2609061318090890 -->
  order in which sources are tried and what a reader sees when none is
  reachable. #9 owns only that the article honours that order and places
  the player, or the poster and link, in the flow at that point.
- Boundary with map #5 and map #6 (the deck): each rendering owns its own <!-- cond: cond-2609061318097375 -->
  column of the construct table in `05-internals.md` section 3. #9 owns
  the Article column, including its obligation to ignore the slide
  constructs; #5 and #6 own the Slides column.
- Boundary with map #17 (carry the document as one file): #17 owns <!-- cond: cond-2609061318099092 -->
  embedding this page, its assets, and its script into one offline file.
  #9 owns the page itself, wherever it is served from.
- Boundary with map #26, `itd-2609051402083398` (Move through the article <!-- cond: cond-2609061318090837 -->
  by keyboard): #26 owns moving through this page by keyboard — the
  chords, the contents list opened from a chord, search, and the cancel
  rule. #9 owns the page those chords move through, and asserts nothing
  about which chord does what.
- In this moment, from the canon: the callout and the margin aside. The <!-- cond: cond-2609061318099438 -->
  article bundle owns what `::: {.callout kind="…"}` and
  `[…]{.margin}` look like on the page, because the article is the
  rendering where each of them has a form of its own; the deck and the
  paper read their own columns of the mapping table in
  `05-internals.md` section 3.

## Acceptance Criteria

- Given a document folder of two Parts holding four chapters in all, with
  Sections and Sub-sections inside them, when Bob opens the article, then
  the whole document is one page, a contents list appears carrying the
  Parts, the Chapters, the Sections, and the Sub-sections, and choosing
  any entry moves the page to that heading.
- Given a paragraph carrying the citation `[@smith2020, p. 4]` and the
  footnote `^[an inline note]`, when the article renders at desktop
  width, then both appear in the margin level with that paragraph, and
  neither is printed at the foot of the page.
- Given a chapter carrying `::: {.credit}` and `[a remark in the
  margin]{.margin}`, when the article renders at desktop width (1280 CSS
  px), then each appears as a margin note beside the block it follows.
- Given a chapter carrying `::: {.callout kind="warning"}`, when the
  article renders at desktop width (1280 CSS px), then the callout
  appears as a box in the flow, set apart from the body text and
  carrying its kind, and at iPhone width (390 CSS px) it keeps the full
  measure with nothing scrolling sideways.
- Given a chapter carrying `::: {.notes}`, `::: {.columns}` with two
  `.column` children, `## Interlude {.divider}`, and `<!-- pagebreak -->`,
  when the article renders, then the notes div produces nothing, the
  columns' content appears in the flow with no side-by-side layout, the
  divider heading renders as an ordinary heading, and the page-break
  comment produces nothing.
- Given the same page at iPhone width (390 CSS px), when Carol reads it,
  then every margin note appears in the flow directly after the paragraph
  that made it, the page scrolls vertically only, and no element is wider
  than the viewport; and at iPad width (820 CSS px) and desktop width
  (1280 CSS px) the margin returns and no element is wider than the
  viewport at either.
- Given a video block opened as
  `::: {.video poster="assets/keynote-poster.jpg" caption="Part two"}`
  whose `local`, `site`, and `gated` sources are all unreachable, when
  the article renders, then the poster frame, the caption, and a link
  appear at that point in the flow and no player is inserted.
- Given the image
  `![The lantern at dusk](assets/lantern.jpg "By Carol"){.full-bleed}`,
  when the article renders, then the alt text is the caption, the title
  attribute is the credit, and the image sits in the flow at full-bleed
  width.
- Given one document rendered as the article three ways — in the desktop
  app's preview, in the build the publish action pushes to the site, and
  inside the exported single file — when the three are compared, then
  they carry the same headings in the same order, the same margin notes
  against the same paragraphs, the same reference list, and the same
  video fallbacks. (The pipeline is not compared here: it renders the
  paper, which map #21 owns.)
- Inherits: one source, always (`itd-2609051336090390`); the renderings
  agree (`itd-2609051336130664`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; degrade
  gracefully in a plain tool (`itd-2609051336110536`); no machine in the
  document (`itd-2609051336080960`); nothing is stored about a reader
  (`itd-2609051336145770`); and, from phase 3 where it binds, variant
  fidelity (`itd-2609051336107315`) — the article is a rendering, so the
  tree it is handed is already filtered and no page of it may reveal that
  another variant exists.

## Open Questions

- Which navigation chords the reading views share with the editor
  (`03-evidence.md`, open questions, "Editor"). The article's keyboard
  movement belongs to map #26, `itd-2609051402083398`, and cannot be
  specified there until that list exists.
- Which poster frame a video block uses when the author supplies none
  (`03-evidence.md`, open questions, "Assets"). The article's fallback
  needs an image whether or not `poster` is written.
- Whether the presenter, the article script, and the slide engine are
  maintained once in the production repository and shared by every
  document, rather than copied into each published version
  (`03-evidence.md`, open questions, "Publish and pipeline"). A fix to the
  reading experience reaches old versions only under the first answer.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-f251a03663ef -->
Fidelity review — receipt rcp-f251a03663ef (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:60a6366288794e8e8e8ab2c2ee78f4d3b51a712fb4e6cfc22d00853a8cce8711
Input attestations: diff:c1bcf7b..cae1734@sha256:4a5e182af9d3f4549b332eff9cf5e02954a79320d0844b9f6d74d8d0a15cfc16; intent:.abcd/development/intents/shipped/itd-2609051335489928-read-the-document-as-a-tufte-article.md@-; spec:.abcd/development/specs/closed/spc-2609061318090042-read-the-document-as-a-tufte-article.md@-; checklist:.abcd/.work.local/logs/acceptance/spc-2609061318090042.md (M9-1..M9-7, every row unticked)@-; test-run:npx vitest run --reporter=verbose: 50 files, 1017 passed, 0 failed (article.test.ts 44, article-video.test.ts 8, preview.test.ts 10, build.test.ts 34, export/services.test.ts 8, local-documents.test.ts 40)@-; test-run:cargo test --manifest-path src-tauri/Cargo.toml: 237 passed, 0 failed (preview::, export::, publish::stage:: included)@-;

Acceptance rollup: MET 5 · MET_WITH_CONCERNS 4 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET_WITH_CONCERNS: the whole document composes as one page with a Part-grouped four-level contents list whose every href resolves, but a Part's own entry is a label that moves nowhere, so 'choosing any entry moves the page' holds for Chapter, Section and Sub-section entries only
  evidence: src/core/render/article.test.ts:328 — "carries the Parts, the Chapters, the Sections and the Sub-sections, and each entry points at that heading"
  evidence: src/core/render/article.test.ts:352 — "choosing an entry moves the page to that heading: every href names an id the chapter's own rendering writes"
  evidence: src/publish/build.test.ts:166 — "gives the whole document one contents list, chapter by chapter"
  evidence: src/preview.test.ts:46 — "renders the whole document as one page, with a contents list carrying every chapter's own heading"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318090042.md:669 — "Choosing a Part's own label does nothing by itself"
- ac-2 — MET: renderBlocks appends every citation and footnote as a margin-note aside directly after its paragraph, and the test asserts both sit beside the paragraph with no foot-of-page section
  evidence: src/core/render/article.test.ts:150 — "puts a citation and a footnote from the same paragraph in the margin, in source order, beside it rather than at the foot"
  evidence: src/core/render/article.test.ts:96 — "writes a footnote as a margin note beside its paragraph, not at the foot of the page"
  evidence: src/core/render/article.ts:540 — ".map((block) => renderOneBlock(block, article) + inlineMarginNotes(block, article))"
- ac-3 — MET: a .credit div and a .margin span each render through renderMarginNote as the block's next sibling, and article.css floats .margin-note into the reserved rail from 760px upward, which covers 1280
  evidence: src/core/render/article.test.ts:403 — "writes a credit as a margin note, beside the block it follows"
  evidence: src/core/render/article.test.ts:415 — "writes a `.margin` span as a margin note, and leaves no marker behind in the sentence"
  evidence: src/core/render/article.css:356 — "@media (min-width: 760px)"
  evidence: src/core/render/article.css:375 — "width: var(--article-margin-width);"
- ac-4 — MET_WITH_CONCERNS: the callout renders as a div carrying data-kind that article.css labels, and .callout declares no fixed width, but the 390 CSS px clause (full measure, nothing scrolling sideways) has no test and M9-3 is unticked
  evidence: src/core/render/article.test.ts:221 — "writes a callout as a box in the flow, carrying its kind"
  evidence: src/core/render/article.ts:294 — "["data-kind", kind],"
  evidence: src/core/render/article.css:245 — "body.article .callout {"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318090042.md:698 — "[ ] At 390 CSS px the callout keeps the full measure"
- ac-5 — MET: renderOneBlock returns nothing for the absent placement, puts columns in the flow, renders a divider as an ordinary heading, and the page-break comment test passes
  evidence: src/core/render/article.test.ts:372 — "puts columns in the flow, omits notes, keeps a divider an ordinary heading"
  evidence: src/core/render/article.test.ts:424 — "ignores a page-break comment"
  evidence: src/core/render/article.ts:477 — "case "absent":"
  evidence: src/core/canon.ts:180 — "article: { placement: "absent", wording: "absent" },"
- ac-6 — INCONCLUSIVE: the fold rule exists in article.css, but no test reads the stylesheet's breakpoint back (the spec's claimed 'stylesheet assertions' in article.test.ts do not exist: no test file references ARTICLE_STYLESHEET or 760) and the three-width look is M9-2, unticked
  evidence: src/core/render/article.css:356 — "@media (min-width: 760px)"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318090042.md:684 — "[ ] At 390 CSS px: every one of the four notes has folded into the flow"
  evidence: .abcd/development/specs/closed/spc-2609061318090042-read-the-document-as-a-tufte-article.md:547 — "article.css's own rules read back in article.test.ts's stylesheet assertions"
- ac-7 — MET: the renderer writes the poster, caption and an ordered source list with no video element, and article-video.js inserts no player when every probe fails
  evidence: src/core/render/article.test.ts:240 — "tries a video's sources in the order written, and inserts no player when they are all unreachable at render time"
  evidence: src/core/render/article-video.test.ts:146 — "inserts no player and marks nothing when every source is unreachable"
  evidence: src/core/render/html.ts:480 — "< figure class="video">${poster}${caption}< ul class="video-sources">${links}< /ul>< /figure>"
- ac-8 — MET: the figure test asserts alt text as the caption span and the title as the credit span inside a figure.full-bleed, and article.css runs .full-bleed to the full measure
  evidence: src/core/render/article.test.ts:230 — "runs a `.full-bleed` image the full measure"
  evidence: src/core/render/html.ts:422 — "Alt text is the caption; the title attribute is the credit"
  evidence: src/core/render/article.css:313 — "body.article .full-bleed {"
- ac-9 — MET_WITH_CONCERNS: the site build and the preview call one exported composeArticle and are proven to emit the identical fragment, and the exported page is the staged page byte for byte; the concern is that the 'exported single file' is the folder export's index.html (map #17 undelivered) and the three-host comparison M9-6 is unticked
  evidence: src/publish/build.test.ts:648 — "composes the identical article fragment preview.ts's articleOf renders for the same chapters (Fable F8)"
  evidence: src/publish/build.test.ts:446 — "an exported page is the staged page with the chrome base substituted, byte for byte"
  evidence: src/preview.ts:38 — "import { composeArticle, folderOf, partTitleOf, type ComposedChapter } from "./publish/build";"
  evidence: src/export/services.ts:88 — "article: ["
- ac-10 — MET_WITH_CONCERNS: one source (stage.rs include_str!s the core files and preview.html links them), renderings agree (composeArticle test), no machine in the document (PendingPreview in memory) and no-script markup are cited; legible on three device classes is manual and unticked, and variant fidelity is not yet binding
  evidence: src-tauri/src/publish/stage.rs:116 — "include_str!("../../../src/core/render/article.css"),"
  evidence: preview.html:13 — "< link rel="stylesheet" href="/src/core/render/article.css" />"
  evidence: src-tauri/src/preview.rs:49 — "pub struct PendingPreview(Mutex< Option< PreviewSource>>);"
  evidence: src/publish/build.test.ts:648 — "composes the identical article fragment"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318090042.md:672 — "## M9-2 — margin notes at 390, 820, and 1280 CSS px"

Gap audit:
- honoured:
  - the whole document is one page with a contents list to four levels
    evidence: src/core/render/article.test.ts:328 — "carries the Parts, the Chapters, the Sections and the Sub-sections"
  - references sit in the margin level with the paragraph, never at a foot of the page
    evidence: src/core/render/article.test.ts:150 — "beside it rather than at the foot"
  - slide-only constructs leave no mark on the page
    evidence: src/core/render/article.test.ts:372 — "puts columns in the flow, omits notes, keeps a divider an ordinary heading"
  - out of reach of every source, the poster frame and a link appear with the caption
    evidence: src/core/render/article-video.test.ts:146 — "inserts no player and marks nothing when every source is unreachable"
  - one renderer, one stylesheet, one script serve every host
    evidence: src-tauri/src/publish/stage.rs:119 — ""presenter/article-video.js","
    evidence: preview.html:44 — "< script type="module" src="/src/core/render/article-video.js" defer>< /script>"
- diverged:
  - the third host is an 'exported single file'; delivered as the folder export's index.html
    evidence: src/export/services.ts:88 — "article: ["
    evidence: .abcd/development/specs/closed/spc-2609061318090042-read-the-document-as-a-tufte-article.md:308 — "the acceptance criterion's "exported single file" is answered by that folder export's own `index.html`"
  - choosing any contents entry moves the page; a Part entry is a label with no href
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318090042.md:669 — "Choosing a Part's own label does nothing by itself"
  - the spec names stylesheet assertions in article.test.ts that the file does not contain
    evidence: .abcd/development/specs/closed/spc-2609061318090042-read-the-document-as-a-tufte-article.md:547 — "article.css's own rules read back in article.test.ts's stylesheet assertions"
- missing:
  - a rendered check that the margin folds at 390 and returns at 820 and 1280 with nothing wider than the viewport
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318090042.md:687 — "[ ] At all three widths, nothing on the page scrolls sideways"
  - a comparison of the three hosts for one document
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318090042.md:737 — "[ ] The three pages carry the same headings, in the same order."

Scope-condition dispositions:
- cond-2609061318099562 — falsified: the condition assumed one spec would cover this intent and map #10 together; two separate specs were written and closed, one per intent
  evidence: .abcd/development/specs/closed/spc-2609061318090042-read-the-document-as-a-tufte-article.md:2 — "id: spc-2609061318090042"
  evidence: .abcd/development/specs/closed/spc-2609061318154502-read-it-the-way-i-like-it.md:2 — "id: spc-2609061318154502"
- cond-2609061318091913 — untested: no delivered run exercised Safari or Chromium at 390, 820 or 1280 CSS px; every test is jsdom and every checklist row is unticked
- cond-2609061318092215 — survived: the preview holds chapter text in application memory and writes nothing; no authoring gesture was added to the reading moment
  evidence: src-tauri/src/preview.rs:49 — "pub struct PendingPreview(Mutex< Option< PreviewSource>>);"
- cond-2609061318096567 — survived: the article renders the tree it is handed and filters by the declared variant through the pre-existing inVariant, exactly as the phase-2 assumption states
  evidence: src/preview.test.ts:76 — "renders the document's declared variant, filtering a block marked for another"
  evidence: src/core/render/article.ts:539 — ".filter((block) => inVariant(block, article.variant))"
- cond-2609061318097929 — survived: the article declares the custom properties on :root and the toolbar script sets only those and one data attribute, so the boundary with map #10 held
  evidence: src/core/render/article.css:29 — "--article-measure: 38em;"
  evidence: src/core/render/article-controls.js:198 — "setOrClearProperty(root, "--article-text-scale", TEXT_SCALE_BY_SIZE[choice.textSize]);"
- cond-2609061318091537 — survived: resolution lives in bibliography.ts and the article only reads the resolution into the same renderMarginNote shape, so #9 owns placement and #11 owns the key and the list
  evidence: src/core/render/article.ts:416 — "function citationMarginNotes(node: Inline, article: Article): string[] {"
  evidence: src/core/bibliography.ts:483 — "export function resolveCitations("
- cond-2609061318092133 — survived: the opening, marks, tray and Konami reveal live in article-eggs.js registered through the ArticlePage seam; the article renderer adds only two switch cases and no behaviour
  evidence: src/core/render/article-eggs.js:660 — "global.ArticlePage.register(boot);"
  evidence: src/core/render/article.ts:505 — "case "modal":"
- cond-2609061318090890 — survived: chooseSource tries the sources in the order written and the renderer places the poster and links at that point in the flow, deciding no policy of its own
  evidence: src/core/render/article-video.js:110 — "function chooseSource(sources, prober) {"
  evidence: src/core/render/article.test.ts:240 — "tries a video's sources in the order written"
- cond-2609061318097375 — survived: the article reads its own column of the canon table and the deck keeps its own render context; slides.ts changed only for map #11's foot line
  evidence: src/core/canon.ts:180 — "article: { placement: "absent", wording: "absent" },"
  evidence: src/core/render/slides.ts:102 — "return { resolve, rendering: "slides", variant };"
- cond-2609061318099092 — survived: no single-file bundling was attempted; the folder export copies the page's chrome files beside it and map #17's embedding is untouched
  evidence: src/export/services.ts:88 — "article: ["
- cond-2609061318090837 — survived: keyboard movement shipped as its own file under map #26 and the article renderer claims no key, so #9 asserts nothing about chords
  evidence: src-tauri/src/publish/stage.rs:139 — ""presenter/article-keys.js","
- cond-2609061318099438 — survived: the article gives the callout and the margin aside their own forms through renderCallout and renderMarginNote, and the canon table keeps the deck's column separate
  evidence: src/core/render/article.ts:290 — "function renderCallout(block: Block, article: Article): string {"
  evidence: src/core/canon.ts:189 — "article: { placement: "callout", wording: "a callout box" },"
## Grounds

- pursued: the article as a Tufte page — margin notes that fold at 390 CSS px and sit beside the paragraph at 820 and 1280 through stylesheet rules alone, a four-level contents list grouped by Part, a callout box, full-bleed images, and a video rule a small runtime script upgrades; one renderer and one stylesheet and one script read or copied unchanged by the app's new preview window, the site build, and the folder export. It would be wrong if a margin note ever duplicated its paragraph's text inline, if the three hosts disagreed on headings or margin placement for one document, if any slide-only construct left a trace in the article, or if a video block ever showed a player before a source actually loaded.
