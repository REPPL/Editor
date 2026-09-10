---
id: itd-2609051335518134
slug: find-what-is-hidden-in-the-text
spec_id: spc-2609061318159422
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317463033]
---

# Find what is hidden in the text

## Press Release

Bob opens the link Alice sent him. Before the text, a quotation stands
over the page — the one Alice chose to open with. He reads it, dismisses
it, and starts reading. When he comes back to the same page a week later,
the quotation does not appear again; he lands straight on the first
paragraph. It greeted him once, which is what an opening is for.

Reading on, he notices a small mark sitting inside a paragraph, about
where a footnote marker would be. He clicks it, and what Alice hid there
opens: a few sentences that did not belong in the argument, a photograph,
or a short video. When he closes it, the mark leaves the paragraph and
settles into a tray at the foot of the page, so he can see how many he
has found and go back to any of them. Carol, reading the same page on her
phone, finds the same marks; the panel she opens fills the width of the
screen instead of sitting in the margin, and nothing needs pinching.

Nothing on the page announces that the marks exist, and that is the
point. A reader who suspects there is more can type the Konami code — up,
up, down, down, left, right, left, right, b, a — and every mark still
hidden flashes briefly, with the page scrolling to the first of them.

None of this follows a reader anywhere. Which quotation Bob has seen and
which marks he has collected are remembered in his browser and nowhere
else; the site records nothing about him. And where the page cannot be
interactive at all, nothing Alice wrote is lost: in the journal PDF the
quotation prints as an epigraph on the first page and each hidden piece
prints as a static aside in the text.

## Why This Matters

Alice always has material that is worth including and not worth
interrupting the argument with: the aside, the photograph, the clip, the
thing a reader would enjoy on a second pass. Without somewhere to put it
she either cuts it or breaks the flow with it, and both are losses. The
opening quotation has the mirror-image problem: it is the right way to
begin a document once and an obstacle every time after that. This moment
gives both a home — one that rewards a curious reader without taxing a
hurried one, and that costs the reader nothing in privacy to enjoy.

## Mechanism

- We expect interactive elements declared in the source and rendered by a
  script the page carries to work at article length, because the article
  prototype already does exactly this: eggs that open text, an image, or
  a video, collect into a tray, and are revealed by the Konami code
  (`03-evidence.md`, "The article prototype"). Editor changes the
  authoring syntax, not the reading behaviour, so the untested part is
  the syntax alone.
- We expect the once-per-browser rule to hold, because the prototype's
  opening quotation is remembered per browser and the brief records that
  as proven: "an authored construct with a per-browser memory is
  workable" (`03-evidence.md`). This is falsifiable — clear the browser's
  storage and the quotation must return, in that browser and no other.
- We expect these constructs to be safe in the canon because each is an
  ordinary Pandoc form: a fenced div with attributes for the quotation
  and for an egg's content, and an attributed inline span for the mark
  (`05-internals.md`, section 3). A plain Markdown reader shows the
  marker character and the block's content as text rather than failing.
- We expect nothing to need storing on the site, because what a reader
  has dismissed or collected is a fact about that browser, not about a
  person. It lives where display preferences live, and it leaves only if
  the reader takes it.
- We expect print to be the honest test of "declared in the source",
  because content that only a script can produce cannot be printed. If
  the quotation and every egg's content can be rendered from the tree
  into the PDF with no script running, the content genuinely is in the
  document rather than in the page.

## Scope Conditions

- Platform: the published online article and the same article inside the <!-- cond: cond-2609061318156671 -->
  single HTML file, at desktop, iPad, and iPhone widths — 1280, 820, and
  390 CSS px. The deck omits
  both constructs entirely; the PDF prints their static forms. Alice sees
  the same behaviour in the app's preview.
- Population: this is Bob and Carol's moment. Alice authors the <!-- cond: cond-2609061318155455 -->
  constructs and checks them in preview, but the experience being
  specified is the reader's, and it requires no account, no sign-in, and
  no instruction.
- Assumption: an egg's content is text, an image, or a video, and a video <!-- cond: cond-2609061318153365 -->
  inside an egg follows the ordinary video source rule rather than one of
  its own — including showing a poster and a link when no source is
  reachable.
- Assumption: the Konami code reveals; it does not collect. A revealed <!-- cond: cond-2609061318156143 -->
  mark is still uncollected until the reader opens it.
- Assumption: an inline marker with no block, and a block no marker <!-- cond: cond-2609061318152713 -->
  names, are both authoring mistakes rather than reader-facing features.
  Each renders harmlessly — the marker as ordinary text, the block as
  nothing — and each is listed against its chapter in the sidebar so
  Alice finds it while writing.
- Assumption: the opening quotation belongs to the first chapter's first <!-- cond: cond-2609061318151945 -->
  block. A document has one opening, not one per chapter.
- Boundary with map #9, itd-2609051335489928 (Read the document as a <!-- cond: cond-2609061318154625 -->
  Tufte article): #9 owns the page these things sit in — layout,
  navigation, margin notes, the video rule, and the reading views'
  keyboard vocabulary. In scope here is only the once-only quotation, the
  hidden marks, the tray, and the Konami reveal.
- Boundary with map #21, itd-2609051336019782 (Receive a journal-style <!-- cond: cond-2609061318155915 -->
  PDF with the document): in scope here is that the quotation and every
  egg's content reach print rather than vanishing; out of scope is what
  the epigraph and the static aside look like on the printed page, which
  #21 owns. The exact static fallback each interactive element renders is
  open in `03-evidence.md`.
- Boundary with map #14, itd-2609051335537470 (Write one text for two <!-- cond: cond-2609061318152835 -->
  audiences): #14 owns marking a block with a variant and previewing a
  variant. Whether an egg's content can itself be variant-marked is open
  in `03-evidence.md`; until it is settled, this intent assumes an egg
  block carries no variant attribute, and the *variant fidelity*
  discipline owns the obligation once it can.
- Boundary with map #3, itd-2609051335415528 (Insert a construct I cannot <!-- cond: cond-2609061318150131 -->
  remember): #3 owns only that choosing "easter egg" or "opening
  quotation" in the palette puts the canonical form at the cursor, with
  the cursor where the content goes. This intent owns what those forms do
  for a reader afterwards.
- Boundary with map #10, itd-2609051335492327 (Read it the way I like <!-- cond: cond-2609061318157089 -->
  it): #10 keeps the reader's display preferences in their browser —
  theme, text size, measure. This intent keeps only two facts about
  hidden content: whether the quotation has been shown, and which marks
  have been collected. Neither intent stores anything about who the
  reader is.

## Acceptance Criteria

- Given a chapter whose first block is `::: {.opening once="per-browser"}`
  holding a quotation and its attribution, when Bob opens the published
  article for the first time in a browser, then the quotation is shown
  over the page and dismissing it reveals the text; and when he opens the
  same link again in that same browser, then the article opens directly
  at the text with no quotation shown.
- Given a paragraph containing `The survey ran for three
  winters[✦]{.egg egg="lantern"}` and, elsewhere in the same chapter, a
  block `::: {.egg #lantern label="✦"}`, when the article renders, then
  the marker appears at that point in the paragraph, the block's content
  appears nowhere in the flow of the text, and clicking the marker opens
  that content.
- Given Bob has opened that marker, when he closes the panel, then the
  marker is gone from the paragraph and present in the tray at the foot
  of the page, and clicking it in the tray reopens the same content.
- Given a chapter with at least three eggs of which one is already
  collected, when Bob types up, up, down, down, left, right, left,
  right, b, a, then the two uncollected marks are briefly revealed, the
  page scrolls to the first of them in document order, and the collected
  one is not revealed again.
- Given an inline marker `[✦]{.egg egg="lantern"}` whose identifier
  matches no `.egg` block in that chapter, when the article renders, then
  the marker's label appears as ordinary text, nothing at that point is
  clickable, no entry is created in the tray, and the Konami reveal does
  not count it; and when Alice has that chapter open in the app, then the
  sidebar lists the marker against that chapter as unresolved. The rest
  of the chapter renders unchanged. (Negative case.)
- Given a `::: {.egg #lantern label="✦"}` block that no inline marker in
  that chapter names, when the article renders, then the block's content
  appears nowhere in the flow, nothing is added to the tray, and the
  sidebar lists the block against that chapter as unresolved for Alice to
  find. (Negative case.)
- Given a document of four chapters where the second chapter's first
  block is `::: {.opening once="per-browser"}`, when Bob opens the
  article, then no quotation is shown over the page: the opening belongs
  to the first chapter's first block alone, and the sidebar lists the
  misplaced block against that chapter. (Negative case.)
- Given the published article at iPhone width (390 CSS px), when Carol
  opens a mark, then the panel fits the width of the viewport with no
  horizontal scrolling and no pinch zoom, and closing it returns her to
  the paragraph she was reading with the tray still reachable by
  scrolling; and at iPad width (820 CSS px) and desktop width (1280 CSS
  px) the panel opens beside the text with nothing wider than the
  viewport.
- Given one chapter carrying an opening quotation and three eggs, when
  the deck is produced from it, then the deck contains neither the
  quotation nor any egg or its content. The same criterion binds against
  the paper from phase 6, when it exists to be compared: the paper then
  carries the quotation as an epigraph on its first page and each egg's
  content as a static aside.
- Given Bob has dismissed the quotation and collected two marks, when the
  published site is inspected, then nothing about his reading is held
  outside his own browser and no request carries it anywhere; and when
  that browser's storage is cleared, then the page returns to its
  first-visit state with the quotation shown and the tray empty.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`);
  legible on three device classes (`itd-2609051336128348`), at 390, 820,
  and 1280 CSS px; the renderings agree (`itd-2609051336130664`); one
  source, always (`itd-2609051336090390`); degrade gracefully in a plain
  tool (`itd-2609051336110536`); network only on publish
  (`itd-2609051336158553`); and variant fidelity
  (`itd-2609051336107315`), from phase 3 where it binds — this page is a
  rendering of an already-filtered tree, and neither a mark nor a tray
  entry may survive from a variant it does not belong to.

## Open Questions

- Whether an easter egg's content can itself be a variant-marked block
  (`03-evidence.md`, "Open questions", "Article and slides"). This
  decides whether the fifth and seventh criteria above need a variant
  case.
- The exact static fallback each interactive element renders for print
  (`03-evidence.md`, "Open questions", "Article and slides"). The
  criterion above requires the content to reach the page; its printed
  form is not yet decided.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-695f580dcd87 -->
Fidelity review — receipt rcp-695f580dcd87 (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:bec3630f80175dd538e76428eba832a162a1134b67a072659cfe7282049f8fb8
Input attestations: diff:c1bcf7b..cae1734@sha256:4a5e182af9d3f4549b332eff9cf5e02954a79320d0844b9f6d74d8d0a15cfc16; intent:.abcd/development/intents/shipped/itd-2609051335518134-find-what-is-hidden-in-the-text.md@-; spec:.abcd/development/specs/closed/spc-2609061318159422-find-what-is-hidden-in-the-text.md@-; checklist:.abcd/.work.local/logs/acceptance/spc-2609061318159422.md (M12-1..M12-8, every row unticked)@-; test-run:npx vitest run --reporter=verbose: 50 files, 1017 passed, 0 failed (eggs.test.ts 16, article-eggs.test.ts 24, article.test.ts 44, html.test.ts 11, slides.test.ts 20, sidebar.test.ts 10, document.test.ts 27, preview.test.ts 10, build.test.ts 34, local-documents.test.ts 40)@-; test-run:cargo test --manifest-path src-tauri/Cargo.toml: 237 passed, 0 failed (export::an_article_export_carries_only_the_article_s_stylesheet_and_its_scripts, export::the_page_and_the_shell_name_one_set_of_chrome_files included)@-;

Acceptance rollup: MET 8 · MET_WITH_CONCERNS 2 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: processOpening moves the valid opening into a dialog on a first visit, dismissal records the scoped seen flag, and a second boot in the same storage opens at the text with no modal
  evidence: src/core/render/article-eggs.test.ts:122 — "shows the opening as a modal over the page, and takes it out of the flow"
  evidence: src/core/render/article-eggs.test.ts:144 — "removes the modal, marks the opening seen, and never shows it again this visit"
  evidence: src/core/render/article-eggs.test.ts:162 — "opens directly at the text with no quotation shown, in the same browser"
  evidence: src/core/render/article-eggs.js:435 — "function processOpening() {"
- ac-2 — MET: the marker renders as a button in place, the block's content sits in an inert template, and a click opens a dialog carrying that content
  evidence: src/core/render/article.test.ts:567 — "renders the marker as a button in place, and the block's content nowhere in the flow"
  evidence: src/core/render/article-eggs.test.ts:302 — "opens a labelled dialog carrying the block's own content"
  evidence: src/core/render/article.ts:352 — "return \`< template${attributes(["
  evidence: src/core/render/html.ts:212 — "function eggMarker(node: Inline, context: RenderContext): string {"
- ac-3 — MET: collect hides the marker and appends a tray entry naming the same data-egg, and the test reopens the same content from the tray
  evidence: src/core/render/article-eggs.test.ts:338 — "moves the marker into a list at the foot of the page, reachable and reopenable"
  evidence: src/core/render/article-eggs.test.ts:314 — "hides the marker once its panel has been opened"
  evidence: src/core/render/article-eggs.js:366 — "marker.hidden = true;"
- ac-4 — MET: the test collects one of three eggs, types the sequence, and asserts the uncollected marks are revealed, the first is scrolled to, and nothing is collected; uncollectedMarkers skips hidden (collected) markers
  evidence: src/core/render/article-eggs.test.ts:403 — "flashes every uncollected mark and scrolls to the first, without collecting any of them"
  evidence: src/core/render/article-eggs.js:456 — "if (!markers[i].hidden) {"
  evidence: src/core/render/article-eggs.js:477 — "markers[0].scrollIntoView({ behavior: "smooth", block: "center" });"
- ac-5 — MET: an orphan marker falls back to its own text with no button, so the reveal's .egg-marker[data-egg] query never counts it and no tray entry can be made; the app lists it against the chapter
  evidence: src/core/render/article.test.ts:611 — "renders an orphan marker's own text as ordinary, unclickable text"
  evidence: src/core/render/html.ts:216 — "if (label === undefined) return renderInlines(node.children, context);"
  evidence: src/core/render/article-eggs.js:453 — "var markers = global.document.querySelectorAll(".egg-marker[data-egg]");"
  evidence: src/document.test.ts:693 — "lists an orphan egg marker against the chapter that carries it"
- ac-6 — MET: renderEgg returns nothing for a block no marker matched, and unresolvedEggsIn lists the orphan block, which app.ts hands the sidebar beside the citation facts
  evidence: src/core/render/article.test.ts:619 — "renders an orphan block nowhere at all"
  evidence: src/core/eggs.test.ts:118 — "lists an orphan marker, an orphan block, and a misplaced opening together"
  evidence: src/app.ts:23 — "import { unresolvedEggsIn } from "./core/eggs";"
- ac-7 — MET: validOpeningBlock answers null unless it is the first chapter's first block, renderOpening writes nothing otherwise, and the app lists the misplaced block against its chapter
  evidence: src/core/render/article.test.ts:518 — "renders nothing for a chapter that is not the document's first"
  evidence: src/core/eggs.test.ts:64 — "answers the first chapter's first block when it is an .opening div"
  evidence: src/document.test.ts:724 — "lists a misplaced opening against the chapter that is not the document's first"
- ac-8 — INCONCLUSIVE: focus returns to the paragraph on close by test and the panel caps its width by the viewport in CSS, but no layout engine rendered 390, 820 or 1280 and M12-4 is unticked
  evidence: src/core/render/article-eggs.test.ts:359 — "returns focus to the paragraph the marker sat in, once the panel closes"
  evidence: src/core/render/article.css:562 — "max-width: min(34rem, calc(100vw - 2rem));"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318159422.md:713 — "[ ] At 390 CSS px (an iPhone, or a browser's device toolbar at that"
- ac-9 — MET_WITH_CONCERNS: the deck omits the block, the marker and its words end to end and the canon row places both absent for slides; the paper clause is deferred to phase 6, with the content left reachable in markup but no epigraph or aside rendered
  evidence: src/core/render/slides.test.ts:231 — "omits both constructs entirely — the block, the marker, and the block's own words"
  evidence: src/core/render/html.test.ts:146 — "renders nothing in the deck, matched or not — the deck omits the construct entirely"
  evidence: src/core/canon.ts:226 — "slides: { placement: "absent", wording: "absent" },"
  evidence: src/core/render/article.ts:339 — "because a `<template>` is present in the document tree a print renderer"
- ac-10 — MET: no fetch or XMLHttpRequest fires through the opening, a marker and the tray; both facts live under scoped localStorage keys, and a storage that answers nothing returns the page to first-visit state
  evidence: src/core/render/article-eggs.test.ts:435 — "calls neither fetch nor XMLHttpRequest through the opening, a marker, and the tray"
  evidence: src/core/render/article-eggs.test.ts:452 — "applies the visit's own choices, shows no error, and returns to first-visit state next load"
  evidence: src/core/render/article-eggs.js:96 — "return global.localStorage.getItem(scopedKey(STORAGE_KEY_OPENING)) !== null;"
- ac-11 — MET_WITH_CONCERNS: nothing stored about a reader, one seam shared by article and deck, one source (stage.rs include_str!, preview.html), no-script degrade (unhidden opening, inert template) and no request from the app are cited; legible on three device classes is manual and unticked, and variant fidelity was not exercised
  evidence: src/core/render/article-eggs.test.ts:435 — "calls neither fetch nor XMLHttpRequest"
  evidence: src/core/render/html.ts:213 — "if (context.rendering !== "article") return "";"
  evidence: src-tauri/src/publish/stage.rs:133 — "include_str!("../../../src/core/render/article-eggs.js"),"
  evidence: src/core/render/article.test.ts:508 — "renders in the flow, with no `hidden` attribute, so a reader with no script sees an epigraph"
  evidence: src/preview.test.ts:181 — "never probes an external video address on its own, but still probes an already-local one"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318159422.md:707 — "## M12-4 — legible at three widths"

Gap audit:
- honoured:
  - the quotation greets a reader once per browser
    evidence: src/core/render/article-eggs.test.ts:162 — "opens directly at the text with no quotation shown, in the same browser"
  - a mark opens what Alice hid and settles into a tray at the foot of the page
    evidence: src/core/render/article-eggs.test.ts:338 — "moves the marker into a list at the foot of the page, reachable and reopenable"
  - the Konami code flashes every hidden mark and scrolls to the first
    evidence: src/core/render/article-eggs.test.ts:403 — "flashes every uncollected mark and scrolls to the first"
  - none of this follows a reader anywhere
    evidence: src/core/render/article-eggs.test.ts:435 — "calls neither fetch nor XMLHttpRequest"
  - the deck omits both constructs
    evidence: src/core/render/slides.test.ts:231 — "omits both constructs entirely"
  - memory is per document, not per site (beyond the press release)
    evidence: src/core/render/article-eggs.test.ts:192 — "keeps two documents on one site apart"
- diverged:
  - a video inside an egg follows the ordinary video rule; the panel's upgrade reuses chooseSource and probe scoped to one figure rather than the page's upgradeVideos
    evidence: src/core/render/article-eggs.js:230 — "return video.chooseSource(sources, chosen).then(function (found) {"
  - the panel fills the width of the screen on a phone: a stylesheet rule, not a rendered check
    evidence: src/core/render/article.css:562 — "max-width: min(34rem, calc(100vw - 2rem));"
- missing:
  - the journal PDF's epigraph and static asides
    evidence: src/core/render/article.ts:339 — "a print renderer"
    evidence: .abcd/development/specs/closed/spc-2609061318159422-find-what-is-hidden-in-the-text.md:323 — "What the printed page's epigraph and static aside look like"
  - a rendered check at three widths and with a real keyboard
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318159422.md:697 — "## M12-3 — the Konami code, from a real keyboard"

Scope-condition dispositions:
- cond-2609061318156671 — narrowed: the script ships with the published build, the folder export and the app preview, and the deck omits both constructs; the single HTML file and the PDF do not exist and no width was rendered
  narrowing: holds for the published article's build, the folder export and the app's preview; not yet for the single HTML file or the PDF's static forms, and unexercised at 1280, 820 or 390 CSS px on a real engine
  evidence: src-tauri/src/publish/stage.rs:132 — ""presenter/article-eggs.js","
  evidence: src/export/services.ts:92 — "`${FOLDER_CHROME}/article-eggs.js`,"
  evidence: src/core/render/slides.test.ts:231 — "omits both constructs entirely"
- cond-2609061318155455 — survived: the reader's experience needs no account or sign-in: two localStorage facts and no request
  evidence: src/core/render/article-eggs.test.ts:435 — "calls neither fetch nor XMLHttpRequest through the opening, a marker, and the tray"
- cond-2609061318153365 — survived: an egg's video renders through the same renderVideo and the panel upgrades it through article-video.js's own chooseSource, poster and links standing until a source loads
  evidence: src/core/render/article.test.ts:595 — "carries an egg's video content through the ordinary video rule"
  evidence: src/core/render/article-eggs.test.ts:320 — "upgrades a video inside the panel through the ordinary video rule when a source loads"
- cond-2609061318156143 — survived: the reveal adds a class and scrolls, and the test asserts the revealed mark is still unhidden and absent from the tray
  evidence: src/core/render/article-eggs.test.ts:403 — "flashes every uncollected mark and scrolls to the first, without collecting any of them"
- cond-2609061318152713 — survived: an orphan marker renders as text, an orphan block renders nothing, and both are listed against the chapter for Alice
  evidence: src/core/render/article.test.ts:611 — "renders an orphan marker's own text as ordinary, unclickable text"
  evidence: src/core/eggs.test.ts:118 — "lists an orphan marker, an orphan block, and a misplaced opening together"
- cond-2609061318151945 — survived: validOpeningBlock answers only the first chapter's first block and every other .opening is counted as misplaced
  evidence: src/core/eggs.ts:113 — "export function validOpeningBlock(chapter: Chapter, isFirstChapter: boolean): Block | null {"
  evidence: src/core/render/article.test.ts:518 — "renders nothing for a chapter that is not the document's first"
- cond-2609061318154625 — survived: the article renderer gains two switch cases and the behaviour lives in a script registered on map #9's seam; no margin, navigation or video rule was changed
  evidence: src/core/render/article.ts:508 — "case "collectable":"
  evidence: src/core/render/article-eggs.js:660 — "global.ArticlePage.register(boot);"
- cond-2609061318155915 — untested: the PDF does not exist in this delivery, so whether the quotation and each egg reach print was neither exercised nor contradicted
- cond-2609061318152835 — untested: no test renders a variant-marked egg block; the spec itself records that the combination is not claimed proven
- cond-2609061318150131 — untested: the insert palette's opening and egg entries were not changed or exercised by this delivery
- cond-2609061318157089 — survived: the eggs script keeps only the opening-seen and collected-ids keys, scoped per document, and never reads the toolbar's preferences key
  evidence: src/core/render/article-eggs.js:28 — "var STORAGE_KEY_OPENING = "editor-article-opening-seen";"
  evidence: src/core/render/article-eggs.js:30 — "var STORAGE_KEY_COLLECTED = "editor-article-collected-eggs";"
## Grounds

- pursued: the once-only opening and the easter eggs render and behave exactly as specced — a valid opening degrades to a flow epigraph and promotes to a once-per-browser modal, a matched egg opens beside the text and collects into a tray, an orphan marker or block and a misplaced opening are inert and sidebar-listed, the deck omits both constructs, and nothing about a reader's progress leaves localStorage; this would be shown wrong by a failing test in article.test.ts, html.test.ts, article-eggs.test.ts, slides.test.ts, eggs.test.ts, sidebar.test.ts or document.test.ts, or by the six gates failing.
