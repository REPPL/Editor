---
id: itd-2609051335492327
slug: read-it-the-way-i-like-it
spec_id: spc-2609061318154502
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

# Read it the way I like it

## Press Release

Carol opens Alice's article on her phone late in the evening. In the
corner of the page is a small toolbar. She chooses the dark theme and the
largest text, and the page changes under her hands: same words, same
notes, same order, set the way she can read them. She closes the tab, and
when she comes back the next morning the page is still dark and still
large. Nothing asked her to sign in, and nothing was set up in advance by
Alice.

Bob reads the same article on his laptop. He prefers a long line, so he
takes the measure out to wide, and the margin notes settle beside the
paragraphs at the new width without crowding the text. Later he wants the
page as its author framed it: one press of reset and the theme, the text
size, and the measure all return to their defaults, and stay there on the
next visit.

Their choices belong to them and go no further. Carol's dark theme does
not follow her to her laptop, does not appear on Bob's copy, and is not
recorded anywhere Alice can see. It lives in the browser Carol chose it
in, and nowhere else.

## Why This Matters

A reading page set once, by its author, suits its author. Bob wants a long
line at a desk; Carol wants large sepia text on a phone at night; both
have been told, by nearly every page they read, to cope. The alternative
that most pages take — remembering the reader through an account — makes
a reading preference into a record of who read what. This moment gives
each reader the page on their own terms and keeps the fact of it in their
own browser.

## Mechanism

- We expect a theme, text size, and measure control with a reset to be
  the right set, and to cost little, because the reference article
  prototype already ships exactly these, persisted in the browser;
  `03-evidence.md` records the lesson as "the controls are cheap and
  belong to the article, not the author". Falsifiable: the set is wrong
  if a reader has to reach for the browser's own zoom to read the page
  comfortably at any of the three widths.
- We expect per-browser memory to be enough, with no account and no
  server, because the same prototype proves a per-browser memory in use
  for the once-only opening quotation: "an authored construct with a
  per-browser memory is workable" (`03-evidence.md`).
- We expect the controls to compose with the Tufte layout rather than
  fight it, because the layout folds by width alone (`03-evidence.md`:
  "margin notes work on all three device classes with CSS alone"), so
  changing the measure re-runs the same fold the device width would have
  run. Falsifiable: set the widest measure at iPad width (820 CSS px) and
  look for a
  margin note overlapping the text.
- We expect no reader state to leave the page, because the site is static
  output deployed from the production repository (`05-internals.md`
  section 8) and has nothing to receive it. Falsifiable: record the
  network while every control is exercised; a single request carrying a
  preference disproves it.

## Scope Conditions

- Bundle: this intent belongs to the bundle **The article** (phase 2) with <!-- cond: cond-2609061318154139 -->
  map #9, `itd-2609051335489928`, "Read the document as a Tufte article".
  One spec covers both: the page and the reader's control over it.
- Platform: current Safari and Chromium engines at iPhone, iPad, and <!-- cond: cond-2609061318154083 -->
  desktop widths — 390, 820, and 1280 CSS px — wherever the article
  renders: the presenter site and the desktop app's preview now, and the
  single HTML file from phase 5, where the controls travel with the file
  and remember per browser against that file. Where a browser makes
  storage unavailable, the controls still work for the visit and simply
  do not persist.
- Population: Bob and Carol reading a published document, and Alice <!-- cond: cond-2609061318151286 -->
  reading her own draft with the same controls. There is no author-facing
  setting in this moment.
- Assumption: preferences are per browser and per device, and nothing <!-- cond: cond-2609061318156570 -->
  synchronises them. A reader on two devices sets them twice.
- Assumption: the choices are among built-in reader themes. Author themes <!-- cond: cond-2609061318158871 -->
  are out of scope for the product (`06-delivery.md`, "Out of scope"), so
  no control here selects a style Alice supplied.
- Boundary with map #9 (`itd-2609051335489928`): #9 owns the default page <!-- cond: cond-2609061318156014 -->
  — the layout, the default measure, where a margin note sits, the
  contents list, images and video in the flow. #10 owns the toolbar, the
  three controls, the reset, and the persistence.
- Boundary with map #23 (keep my own marks on someone else's page, phase <!-- cond: cond-2609061318158758 -->
  7): both keep state in Bob's browser. The boundary is what is kept —
  #10 keeps display preferences only; #23 keeps marks about the text and
  the file Bob exports them as.
- Boundary with map #12 (find what is hidden in the text): #12 owns the <!-- cond: cond-2609061318152897 -->
  once-only opening quotation and its per-browser memory of having been
  shown, and the collected easter eggs. #10 owns display preferences and
  nothing that remembers what a reader has read.

## Acceptance Criteria

- Given a published article opened for the first time in a browser, when
  Bob looks at the page, then a toolbar offers theme (light, dark,
  sepia), text size (smaller, default, larger), measure (narrow, normal,
  wide), and a reset.
- Given Carol has chosen the larger text size, when she reloads the page
  in the same browser, then the text is still at the larger size and the
  toolbar shows that choice as the current one.
- Given Bob has chosen the sepia theme and the narrow measure, when he
  presses reset, then theme, text size, and measure all return to the
  article's defaults, and a reload keeps the defaults.
- Given the network is recorded while Carol exercises every control, when
  the recording is read, then no request carries a preference, and the
  same article opened in a second browser on the same machine renders at
  the defaults.
- Given the article at iPhone width (390 CSS px), when Carol sets the
  largest text size and the wide measure together, then the page scrolls
  vertically only and no element is wider than the viewport; and the same
  holds at iPad width (820 CSS px) and desktop width (1280 CSS px).
- Given a chapter whose paragraphs carry citations and `.credit` blocks,
  when Bob changes the measure at desktop width (1280 CSS px), then every
  margin note stays level with the block it belongs to and none overlaps
  the text column.
- Given the same article inside the exported single HTML file, opened
  from disk with the network switched off, when Carol chooses the dark
  theme and the larger text and reopens the file in that browser, then
  the toolbar offers the same three controls and the same reset, and her
  choices are still in force. (The file remembers per browser and per
  file, so a second copy of the file opens at the defaults.)
- Given a browser in which stored preferences are unavailable or have
  been cleared, when Carol changes a control, then the change applies for
  that visit, the page renders at the defaults on the next load, and no
  error is shown.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`);
  legible on three device classes (`itd-2609051336128348`), at 390, 820,
  and 1280 CSS px; one source, always (`itd-2609051336090390`); and, from
  phase 3 where it binds, variant fidelity (`itd-2609051336107315`) — no
  control in this toolbar names, offers, or hints at a variant.

## Open Questions

- Which navigation chords the reading views share with the editor
  (`03-evidence.md`, open questions, "Editor"). Reaching and operating
  this toolbar without a pointer belongs to map #26,
  `itd-2609051402083398` (Move through the article by keyboard), which is
  where that list is settled; what the toolbar holds is settled here.
  `03-evidence.md` leaves no other question open for the reader controls:
  it records them as proven by the article prototype.
- Whether a reader's choices should follow the document or the browser
  when the same document is read at a link and again from a single file
  she was sent. Each is its own origin, so today she sets them twice.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-c18cd5fd571d -->
Fidelity review — receipt rcp-c18cd5fd571d (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:885988955af67e76e6b10317c193c138be2ae9261fc1e24cf37becfa4ab38348
Input attestations: diff:c1bcf7b..cae1734@sha256:4a5e182af9d3f4549b332eff9cf5e02954a79320d0844b9f6d74d8d0a15cfc16; intent:.abcd/development/intents/shipped/itd-2609051335492327-read-it-the-way-i-like-it.md@-; spec:.abcd/development/specs/closed/spc-2609061318154502-read-it-the-way-i-like-it.md@-; checklist:.abcd/.work.local/logs/acceptance/spc-2609061318154502.md (M10-1..M10-4, every row unticked)@-; test-run:npx vitest run --reporter=verbose: 50 files, 1017 passed, 0 failed (article-controls.test.ts 23, local-documents.test.ts 40, export/services.test.ts 8, build.test.ts 34)@-; test-run:cargo test --manifest-path src-tauri/Cargo.toml: 237 passed, 0 failed (export::an_article_export_carries_only_the_article_s_stylesheet_and_its_scripts, export::the_page_and_the_shell_name_one_set_of_chrome_files included)@-;

Acceptance rollup: MET 5 · MET_WITH_CONCERNS 2 · NOT_MET 0 · INCONCLUSIVE 2

Per-criterion verdicts:
- ac-1 — MET: the script builds three fieldsets from the CONTROLS table plus a reset, and the test asserts the four groups with the defaults pressed
  evidence: src/core/render/article-controls.test.ts:138 — "offers theme, text size, measure and a reset, with the article's defaults pressed"
  evidence: src/core/render/article-controls.js:35 — "var CONTROLS = ["
  evidence: src/core/render/article-controls.js:69 — "var DEFAULTS = { theme: "light", textSize: "default", measure: "normal" };"
- ac-2 — MET: the choice is written to one localStorage key and read back on the next boot, and the test asserts the larger size survives a reload and reads as pressed
  evidence: src/core/render/article-controls.test.ts:245 — "keeps the larger text size, and shows it as the toolbar's current choice"
  evidence: src/core/render/article-controls.js:161 — "global.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));"
- ac-3 — MET: reset copies DEFAULTS, clears the stored key and reapplies, and the test asserts all three axes return to the defaults and a reload keeps them
  evidence: src/core/render/article-controls.test.ts:274 — "returns theme, text size and measure to the article's defaults, and a reload keeps them"
  evidence: src/core/render/article-controls.js:171 — "global.localStorage.removeItem(STORAGE_KEY);"
- ac-4 — MET: a spy on fetch and XMLHttpRequest sees no call across every control and the reset, and a second boot over empty storage renders at the defaults
  evidence: src/core/render/article-controls.test.ts:304 — "calls neither fetch nor XMLHttpRequest while every control and reset is exercised"
  evidence: src/core/render/article-controls.test.ts:258 — "renders at the defaults in a second browser, which never saw the first browser's choice"
- ac-5 — INCONCLUSIVE: tests prove the measure is never a fixed pixel width and the toolbar caps itself by the viewport, but jsdom has no layout engine and the three-width look with the strongest settings is M10-1, unticked
  evidence: src/core/render/article-controls.test.ts:221 — "sets --article-measure from the measure control, never as a fixed pixel width"
  evidence: src/core/render/article-controls.test.ts:348 — "caps the toolbar's own width by the viewport rather than a fixed size"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318154502.md:521 — "[ ] At 390 CSS px: set the largest text size and the widest measure"
- ac-6 — INCONCLUSIVE: no test moves a margin note; the claim rests on an arithmetic reading of article.css (the rail reads --article-gutter and --article-margin-width, not the measure) and M10-2 is unticked
  evidence: src/core/render/article.css:376 — "margin: 0.3rem calc(-1 * (var(--article-gutter) + var(--article-margin-width))) 0.75rem 0;"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318154502.md:550 — "[ ] Set the measure to "narrow". Every note is still level with the same"
- ac-7 — MET_WITH_CONCERNS: the export ships the same article-controls.js beside the page and the script's per-browser memory is proven in jsdom; the concern is that the 'exported single HTML file' is the folder export's index.html and the from-disk, network-off, per-file isolation rests on file: origin behaviour that M10-3 (unticked) alone can confirm
  evidence: src-tauri/src/export.rs:639 — "fn an_article_export_carries_only_the_article_s_stylesheet_and_its_scripts() {"
  evidence: src/export/services.ts:91 — "`${FOLDER_CHROME}/article-controls.js`,"
  evidence: src/core/render/article-controls.test.ts:245 — "keeps the larger text size, and shows it as the toolbar's current choice"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318154502.md:567 — "[ ] Copy the exported folder to a second location"
- ac-8 — MET: every storage access is wrapped in try/catch and the test with a throwing localStorage shows the visit's change applied, no throw, and the defaults on the next load
  evidence: src/core/render/article-controls.test.ts:322 — "applies the change for the visit, shows no error, and renders at the defaults on the next load"
  evidence: src/core/render/article-controls.js:147 — "try {"
- ac-9 — MET_WITH_CONCERNS: nothing stored about a reader (one key, no request), one source (stage.rs include_str!, preview.html and build.ts link the same file) and no variant control are cited; legible on three device classes is manual and unticked
  evidence: src/core/render/article-controls.js:25 — "var STORAGE_KEY = "editor-article-reader-preferences";"
  evidence: src-tauri/src/publish/stage.rs:127 — "include_str!("../../../src/core/render/article-controls.js"),"
  evidence: src/publish/build.ts:719 — "`<script src="${chrome}/article-controls.js" defer></script>`,"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318154502.md:517 — "## M10-1 — legible at 390, 820, and 1280 CSS px, with the strongest settings"

Gap audit:
- honoured:
  - a small toolbar offers theme, text size, measure and a reset
    evidence: src/core/render/article-controls.test.ts:138 — "offers theme, text size, measure and a reset"
  - the choice is still in force the next morning in the same browser
    evidence: src/core/render/article-controls.test.ts:245 — "keeps the larger text size"
  - reset returns every axis to the author's defaults and stays there
    evidence: src/core/render/article-controls.test.ts:274 — "a reload keeps them"
  - the choice lives in the browser it was made in and nowhere else
    evidence: src/core/render/article-controls.test.ts:304 — "calls neither fetch nor XMLHttpRequest"
  - the toolbar can be dismissed at the narrowest width (beyond the press release)
    evidence: src/core/render/article-controls.test.ts:180 — "starts expanded, and collapses the three groups and the reset behind it on a press"
- diverged:
  - the same controls inside the exported single HTML file; delivered against the folder export's index.html
    evidence: .abcd/development/specs/closed/spc-2609061318154502-read-it-the-way-i-like-it.md:246 — "The single-file export's own bundling: map #17."
  - margin notes settle beside the paragraphs at the new width: argued from the stylesheet, not rendered
    evidence: .abcd/development/specs/closed/spc-2609061318154502-read-it-the-way-i-like-it.md:480 — "The margin rail's independence from the measure is an arithmetic argument, not a rendered one."
- missing:
  - a rendered check at 390, 820 and 1280 with the largest text and widest measure
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318154502.md:521 — "[ ] At 390 CSS px: set the largest text size and the widest measure"
  - a rendered check that every margin note stays level as the measure changes
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318154502.md:544 — "## M10-2 — a margin note stays level with its paragraph as the measure changes"

Scope-condition dispositions:
- cond-2609061318154139 — falsified: the condition assumed one spec would cover this intent and map #9 together; two separate specs were written and closed, one per intent
  evidence: .abcd/development/specs/closed/spc-2609061318154502-read-it-the-way-i-like-it.md:2 — "id: spc-2609061318154502"
  evidence: .abcd/development/specs/closed/spc-2609061318090042-read-the-document-as-a-tufte-article.md:2 — "id: spc-2609061318090042"
- cond-2609061318154083 — narrowed: the storage-unavailable clause holds by test, and the controls ship with the site build, the app preview and the folder export, but the phase-5 single HTML file does not exist and no real engine at any of the three widths was exercised
  narrowing: holds for the presenter site's build, the desktop app's preview and the folder export, with storage-unavailable behaviour proven in jsdom; not yet for the single HTML file, and unexercised on a real Safari or Chromium at 390, 820 or 1280 CSS px
  evidence: src/core/render/article-controls.test.ts:322 — "applies the change for the visit, shows no error, and renders at the defaults on the next load"
  evidence: src/export/services.ts:91 — "`${FOLDER_CHROME}/article-controls.js`,"
- cond-2609061318151286 — survived: the only controls are the three reader axes and a reset; no author-facing setting was added anywhere
  evidence: src/core/render/article-controls.js:35 — "var CONTROLS = ["
- cond-2609061318156570 — survived: one localStorage key per browser and no request means nothing synchronises; a second browser over empty storage renders at the defaults
  evidence: src/core/render/article-controls.test.ts:258 — "renders at the defaults in a second browser, which never saw the first browser's choice"
  evidence: src/core/render/article-controls.js:25 — "var STORAGE_KEY = "editor-article-reader-preferences";"
- cond-2609061318158871 — survived: the three themes are three fixed palettes in article.css answered by data-article-theme; no control reads a style the author supplied
  evidence: src/core/render/article.css:416 — ":root[data-article-theme="dark"] {"
  evidence: src/core/render/article.css:424 — ":root[data-article-theme="sepia"] {"
- cond-2609061318156014 — survived: applyToRoot sets only the theme attribute and the two custom properties map #9 declared, touching no layout rule of its own
  evidence: src/core/render/article-controls.js:195 — "root.setAttribute("data-article-theme", choice.theme);"
  evidence: src/core/render/article-controls.js:199 — "setOrClearProperty(root, "--article-measure", MEASURE_BY_STEP[choice.measure]);"
- cond-2609061318158758 — untested: map #23's reader marks do not exist in this delivery, so the boundary between display preferences and marks was neither exercised nor contradicted
- cond-2609061318152897 — survived: the toolbar keeps one preferences key and the eggs script keeps its own two scoped keys for the opening and the collection; neither reads the other's
  evidence: src/core/render/article-controls.js:25 — "var STORAGE_KEY = "editor-article-reader-preferences";"
  evidence: src/core/render/article-eggs.js:28 — "var STORAGE_KEY_OPENING = "editor-article-opening-seen";"
## Grounds

- pursued: a reader-controls toolbar (theme, text size, measure, reset) that sets spc-2609061318090042's own CSS custom properties on the root element and persists per browser in localStorage, wrapped in try/catch, with no network call ever; this would be wrong if a control failed to reach the stylesheet's own seam, if a preference ever left the browser, if the widest measure with the largest text overflowed 390 CSS px, or if a margin note fell out of level with its paragraph when the measure changed.
