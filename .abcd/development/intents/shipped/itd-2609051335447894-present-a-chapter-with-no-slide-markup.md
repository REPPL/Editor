---
id: itd-2609051335447894
slug: present-a-chapter-with-no-slide-markup
spec_id: spc-2609051353412219
kind: standalone
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: the-deck
supersedes: [itd-2609051221553568, itd-2609051317473940]
---

# Present a chapter with no slide markup

## Press Release

Alice has a talk on Thursday and a chapter she wrote for readers. She
opens the folder in Editor, puts the cursor in that chapter, and presses
Present. The chapter becomes a deck. She has written nothing that looks
like a slide: the headings she already had are the slides, and the prose
beneath each heading is the note she reads from while the audience reads
the headline.

The deck keeps the shape of the chapter. Sections run along the main line
of the talk, left to right, one slide each. A Sub-section hangs beneath
the Section it belongs to, so moving down goes deeper into a point and
moving right moves on to the next one. Every image in the chapter becomes
a slide of its own, full-bleed, at the place it sits in the text, carrying
its caption and its credit. Nothing is invented and nothing is quietly
dropped: the deck is the chapter, read as a talk.

At the lectern the deck moves with the keyboard, with a swipe, or with the
on-screen controls. Bob, following from the back row on his phone, sees
the slide the projector is showing, with nothing to scroll sideways and
nothing to pinch; Carol, on an iPad in the second row, sees it again at
her own size. When Alice fixes a sentence in the chapter and presses
Present a second time, the deck is the new text.

There is no slide file to keep in step with the chapter, and no moment
where the talk and the document say different things. Alice can throw the
deck away after the talk and lose nothing, because the deck was never
where the work lived.

## Why This Matters

Today a chapter and a talk about that chapter are two documents, and the
second one begins life as a copy of the first. From then on they drift: a
figure is corrected in one and not the other, a passage is reordered in
one and not the other, and the file on the projector is the one nobody
edited last. Worse, the work of making the deck is not thinking about the
talk — it is retyping the chapter into slide shape, an afternoon spent
producing a second copy of something already written. Pressing Present
removes both costs at once: the talk is free to make, and it cannot
disagree with the chapter, because it is the chapter.

## Mechanism

- We expect the heading hierarchy alone to yield a coherent deck because
  that hierarchy already carries a reading experience unaided: the article
  prototype recorded in `03-evidence.md` has two heading levels below the
  title, and they "map onto Chapter, Section, Sub-section with no
  translation". A deck is the same tree read at a different depth, so the
  translation cost is zero in both directions.
- We expect Section-horizontal and Sub-section-vertical to be the right
  default because it is the only mapping that preserves both the order of
  the text and its containment: moving right is the argument advancing,
  moving down is one point being unpacked. Any flattening loses one of the
  two, and the author has to restore it by hand.
- We expect the default to be tested hardest by depth rather than by
  breadth, because the acceptance project in `03-evidence.md` carries 177
  headings at four levels with two thirds of them at the fourth. That is
  why the fourth level folds into its Sub-section's speaker notes rather
  than nesting deeper: a main line two thirds of which is a
  Sub-sub-section is a main line nobody can follow.
- We expect generated image slides to earn their place without being asked
  for because the slide prototype in `03-evidence.md` lists image-only
  slides among the forms an author actually reaches for, alongside
  statement slides and dividers.
- We expect the deck to stay legible on a projector, an iPad and a phone
  because it is a responsive HTML deck, and `03-evidence.md` records the
  price already paid for that: "slide layout has to survive reflow, so
  exact visual placement is not available". If a real talk needs exact
  placement to be legible, that trade-off is the thing that is wrong.
- We expect the deck never to disagree with the chapter because the deck
  is not stored: every rendering is a function of the one parse tree
  (`05-internals.md` section 2), so there is nothing that can fall out of
  date.
- We expect the same deck to run in the app and on the presenter site
  because one rendering core is shared unchanged by every host
  (`05-internals.md` section 4), and `03-evidence.md` records that the
  slide prototype already renders one source both through reveal.js and
  through a dependency-free build.

## Scope Conditions

- **Bundle.** This intent is a member of the bundle *The deck*, whose <!-- cond: cond-2609051353414168 -->
  other member is map #6 (`itd-2609051335458626`), "Shape the deck in the
  same text". One spec covers both: this intent is what the deck does when
  Alice says nothing, #6 is what it does when she says something. Neither
  ships alone, because a default mapping with no way to shape it is not a
  talk, and constructs with no default to shape are markup for its own
  sake.
- **Platform.** The desktop app on macOS — Tauri 2 with the system web <!-- cond: cond-2609051353412397 -->
  view — and the deck as built for the presenter site. The deck inside the
  single HTML file is out: map #17 (`itd-2609051335570842`), "Carry the
  document as one file that reads anywhere", owns that host, in phase 5.
- **Population.** Alice presenting her own chapter, and Bob and Carol as <!-- cond: cond-2609051353415666 -->
  audience on a projector, an iPad and an iPhone. One author on one
  machine; collaboration and concurrent editing are out of scope for the
  product entirely (`06-delivery.md`).
- **Phase.** Phase 1, the first usable slice. The chapter is presented in <!-- cond: cond-2609051353419859 -->
  the default variant, with copied assets only. Variants, citations, the
  article, the PDF, the single file, referenced assets and annotations are
  all excluded from this phase by `06-delivery.md`, so no criterion here
  depends on them.
- **Assumption.** The chapter is already open in Editor and its hierarchy <!-- cond: cond-2609051353416905 -->
  already read from the folder. Map #1 (`itd-2609051335399446`), "Open a
  folder and see the book", owns opening the folder and building the tree;
  this intent begins at the moment Alice presses Present.
- **Boundary with map #9 (`itd-2609051335489928`), "Read the document as a <!-- cond: cond-2609051353414652 -->
  Tufte article".** In: what the Slides column of the mapping table in
  `05-internals.md` section 3 says for headings, images and rules. Out:
  what the Article column says for the same constructs — #9 owns that
  column. The table is the single home for both, and neither intent
  restates the other's row.
- **Boundary with map #4 (`itd-2609051335420536`), "Drop an image and have <!-- cond: cond-2609051353416297 -->
  it just work".** In: an image reference already in the chapter becoming
  a slide of its own, in source order, with its caption and credit. Out:
  the drop gesture, the copy into the chapter's assets folder, and
  de-duplication of copied files — #4 owns those and stops at the
  reference in the text.
- **Boundary with map #25 (`itd-2609051336055362`), "Rehearse from cards <!-- cond: cond-2609051353419812 -->
  built out of the headings".** Both turn headings into something else. In:
  slides shown to an audience. Out: cards used to test recall, which live
  in an annotation sidecar and not in a deck — #25 owns those, in phase 7.
- **Boundary with map #7 (`itd-2609051335468596`), "Publish and get a link <!-- cond: cond-2609051353412520 -->
  I can open from the lectern".** In: the deck as built, wherever it runs.
  Out: the publish action, the stable id, the version hash and the link —
  #7 owns those. The deck at the link must be this deck, but the link is
  not this intent's to mint.
- **Boundary with map #11 (`itd-2609051335502171`), "Cite from a <!-- cond: cond-2609051353412029 -->
  bibliography file".** Out entirely in this phase: nothing here resolves
  a citation key or generates a reference list. #11 owns the key, the
  file and the resolution; where a resolved citation supplies the source
  credit line at the foot of a slide, the credit construct itself belongs
  to #6.

## Acceptance Criteria

- **Given** a chapter whose text is `# The Lantern Papers` followed by two
  Sections, `## Beginnings` and `## Findings`, each with one paragraph and
  no slide-only construct anywhere in the file, **when** Alice presses
  Present, **then** the deck holds two horizontal slides in source order,
  each showing its Section headline, and each Section's paragraph appears
  as that slide's speaker notes and on no slide the audience sees.
- **Given** the Section `## Beginnings` contains the Sub-sections
  `### The first year` and `### The second year`, **when** Alice moves
  right onto the Beginnings slide and then moves down, **then** she
  reaches those two Sub-section slides in source order beneath it, each
  showing its own headline with its own paragraph as its speaker notes,
  and moving right from Beginnings reaches `## Findings` rather than any
  Sub-section slide.
- **Given** a Section whose prose is followed by two paragraphs each
  holding one image, written
  `![The lantern at dusk](assets/lantern.jpg "Photograph by Carol")` and
  `![The second winter](assets/winter.jpg "Photograph by Carol")`, **when**
  the deck is built, **then** each image is a full-bleed slide of its own
  at the position its reference occupies in the text, in source order,
  with the alt text shown as the caption and the title attribute shown as
  the credit.
- **Given** a Section whose first block after the headline is a paragraph
  holding one image, **when** the deck is built, **then** that image
  shares the Section's headline slide rather than starting a slide of its
  own, and a second image later in the same Section still starts its own
  slide.
- **Given** a Sub-section containing the Sub-sub-sections
  `#### A note on dates` and `#### A note on counts`, **when** the deck is
  built, **then** no slide is made for either of them, their headings and
  their text appear in that Sub-section's speaker notes in source order,
  and moving down from the Sub-section reaches the next Sub-section
  rather than a Sub-sub-section slide.
- **Given** a chapter that contains no slide-only construct at all,
  **when** Alice presses Present, moves through every slide, and closes the
  deck, **then** the chapter file on disk is byte for byte what it was
  before, no slide-only construct has been written into it, and no deck
  file has been created anywhere in the document folder.
- **Given** the deck open at iPhone width (390 CSS px), at iPad width
  (820 CSS px), and at desktop width (1280 CSS px), **when** Bob moves
  through every slide of a chapter that includes a headline slide, a
  Sub-section slide and an image slide, **then** no slide scrolls
  horizontally or needs pinch zoom at any of the three widths, and each
  slide's headline, caption and image are wholly visible.
- **Given** the deck open at iPhone width (390 CSS px), **when** Bob
  swipes left and right, taps the on-screen controls, and presses the
  arrow keys with a keyboard attached, **then** each of the three moves
  between slides — left and right along the Sections, up and down within
  one — and none of them is offered without working.
- **Given** a Section whose only content is one paragraph, with no image
  and no Sub-section, **when** the deck is built, **then** it yields
  exactly one slide, with no empty vertical slide beneath it and no blank
  slide after it.
- **Given** Alice renames a Section, adds a paragraph, and presses Present
  a second time in the same session, **when** she moves through the deck,
  **then** the deck shows the new headline and the new speaker notes, and
  the document folder holds no second copy of the deck or of its text from
  the first build.
- Inherits: one source, always (`itd-2609051336090390`); round-trip
  byte-fidelity (`itd-2609051336074533`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; degrade
  gracefully in a plain tool (`itd-2609051336110536`); no machine in the
  document (`itd-2609051336080960`); network only on publish
  (`itd-2609051336158553`); and, from phase 3 where it binds, variant
  fidelity (`itd-2609051336107315`), which governs what a filtered deck
  may show.

## Open Questions

- The slide theme: one built-in theme, or the prototype's theme ported
  (`03-evidence.md`, open questions, "Article and slides"). The default
  mapping produces slides with no authored styling, so whatever theme
  ships is what an unshaped deck looks like.
- Which navigation chords the reading views share with the editor
  (`03-evidence.md`, open questions, "Editor"). The deck is a reading view
  that Alice drives from the lectern, so its movement chords come from
  that answer, which map #26, `itd-2609051402083398` (Move through the
  article by keyboard), owns. Until it is settled, the deck's arrow keys,
  swipe, and on-screen controls stand on their own.
- Whether the deck opens with a chapter title slide before the first
  Section, and what becomes of prose that sits between a chapter's
  level-one heading and its first Section.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-dc84ec01ebb0 -->
Fidelity review — receipt rcp-dc84ec01ebb0 (verifier intent-auditor claude-fable-5-1).

Provenance: intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:bb621a2bfb3f51fc633cebe943f22d48027979ca2f93e96ae51ebf2bb02ffdf2
Input attestations: diff:e41596a^..HEAD (1327728)@sha256:6343ab4e968dd2ce947b393ad874bb85af80f3bbb074f2d20e2e98bfd2353d7e; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609051353412219.md@-;

Acceptance rollup: MET 7 · MET_WITH_CONCERNS 2 · NOT_MET 0 · INCONCLUSIVE 2

Per-criterion verdicts:
- ac-1 — MET_WITH_CONCERNS: The two Section slides are horizontal columns in source order with each paragraph in notes and an empty face (deck.test.ts:44-59), notes are hidden from the audience (slides.css:72-74), and C-c C-p invokes present_chapter (keys.ts:726-731, main.ts:79-85); the concern is that the delivered deck holds THREE horizontal slides, not two, because a chapter-title slide is prepended (deck.test.ts:46-50, deck.ts:197-217), a divergence the spec records openly under Risks and DECISIONS.md:61 rather than a signed-off amendment of the criterion.
  evidence: src/core/deck.test.ts:46 — "["The Lantern Papers"], ["Beginnings"], ["Findings"]"
  evidence: src/core/deck.test.ts:53 — "textOf(beginnings?.notes ?? [])).toEqual(["The first winter was the coldest."])"
  evidence: src/core/render/slides.css:72 — ".reveal aside.notes { display: none; }"
  evidence: src/main.ts:79 — "app.registerCommand("present", () => {"
  evidence: .abcd/work/DECISIONS.md:61 — "a chapter title opens the deck"
- ac-2 — MET: Both Sub-sections hang beneath Beginnings in source order with their own paragraph as notes, and Findings is the next column (deck.test.ts:67-100); the renderer nests them inside one < section> so reveal.js moves down to them and right to Findings (slides.ts:237-247, slides.test.ts:37-48).
  evidence: src/core/deck.test.ts:90 — "["Beginnings", "The first year", "The second year"], ["Findings"]"
  evidence: src/core/deck.ts:211 — "if (level >= 3) { build.axis = "vertical"; hangBeneath(build, slide);"
  evidence: src/core/render/slides.test.ts:44 — "toMatch(/< section>< section [^>]*id="beginnings"/)"
- ac-3 — MET: Each image paragraph after prose becomes its own kind=image slide in source order carrying src, alt-as-caption and title-as-credit (deck.test.ts:102-127), rendered as < figure class="full-bleed"> with caption and credit spans (slides.test.ts:56-73) and a full-bleed stylesheet rule (slides.css:138).
  evidence: src/core/deck.test.ts:119 — "caption: "The lantern at dusk", credit: "Photograph by Carol""
  evidence: src/core/deck.test.ts:126 — "expect((first?.line ?? 0) < (second?.line ?? 0)).toBe(true)"
  evidence: src/core/render/slides.test.ts:71 — "< span class="caption">The lantern at dusk< /span>"
  evidence: src/core/render/slides.css:138 — ".reveal .full-bleed img {"
- ac-4 — MET: A first-block image is pushed onto the heading slide's face while a later image opens its own slide (deck.ts:245-254, deck.test.ts:129-145); the implementation widens the exception to the first block of any empty non-divider slide, which contains the promised case.
  evidence: src/core/deck.ts:247 — "if (current !== null && current.kind !== "divider" && isEmpty(current)) { current.face.push(block);"
  evidence: src/core/deck.test.ts:142 — "expect(shape(plan)).toEqual([["Beginnings"], [""]])"
- ac-5 — MET: Level-4 headings open no slide and fold heading plus text into the current slide's notes in source order (deck.ts:342-345, deck.ts:423-426), and the column shape shows the second Sub-section directly beneath the first (deck.test.ts:147-179).
  evidence: src/core/deck.ts:423 — "if (block.kind === "heading" && (block.level ?? 1) >= 4) { if (inVariant(block, variant)) foldHeading(build, block);"
  evidence: src/core/deck.test.ts:172 — "["One.", "A note on dates", "Dates were kept badly.", "A note on counts", "Counts were kept worse."]"
- ac-6 — MET: The Present path holds text in a Mutex and creates or focuses a window with no filesystem write anywhere (present.rs:226-241, 263-295), the web view builds a string (present.ts:131-141); the Rust test on the command's own path asserts chapter bytes and the full folder listing unchanged (present.rs:467-494), and the vitest asserts the same over a document folder on disk (present.test.ts:50-64); 12 Rust and 103 vitest tests pass at HEAD.
  evidence: src-tauri/src/present.rs:492 — "assert_eq!(fs::read(&chapter).expect("read"), before_bytes);"
  evidence: src-tauri/src/present.rs:493 — "assert_eq!(listing(&root), before_listing, "Present wrote a file");"
  evidence: src/present.test.ts:60 — "writes no deck file anywhere in the document folder"
  evidence: src/present.ts:131 — "Pure: text in, markup out. It reads no file, writes none"
- ac-7 — INCONCLUSIVE: Only a real layout can show no horizontal scroll and wholly visible headline/caption/image at 390/820/1280: the automated check states plainly that jsdom lays nothing out and scrollWidth is always zero (legibility.test.ts:3-13, 119-125), the spec maps this criterion to a manual width check, and every row of section 5 of the acceptance log is unticked; an unresolved risk is present.css:10-15 setting body overflow:hidden while slides are min-height 100svh normal flow, which could clip a tall slide at 390 px.
  evidence: src/core/render/legibility.test.ts:120 — "Both numbers are zero in jsdom, which lays nothing out."
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353412219.md:96 — "- [ ] **390 CSS px.** No slide scrolls sideways"
  evidence: src/present.css:14 — "overflow: hidden;"
- ac-8 — INCONCLUSIVE: The delivery turns touch, controls and keyboard on in DECK_CONFIG (slides.ts:62-75, slides.test.ts:217-221) but a flag is an offer, not a working move; the spec maps this criterion to a manual check at 390 px and the section 2 rows (arrow, on-screen controls, swipe, none inert) are all unticked, so whether each of the three moves is unverified.
  evidence: src/core/render/slides.ts:66 — "touch: true, keyboard: true,"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353412219.md:34 — "- [ ] The on-screen controls in the corner move the deck the same way."
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353412219.md:38 — "- [ ] None of the three is offered and inert"
- ac-9 — MET: A Section of one paragraph yields one column of one slide, walkSlides yields one, and an empty draft is dropped so no blank column follows (deck.test.ts:199-210, deck.ts:379-384, 434-436).
  evidence: src/core/deck.test.ts:201 — "expect(plan.columns).toHaveLength(1); expect(plan.columns[0]?.slides).toHaveLength(1);"
  evidence: src/core/deck.ts:436 — "if (slides.length > 0) columns.push({ slides });"
- ac-10 — MET: A second Present replaces the held DeckSource and emits to the existing window instead of opening another (present.rs:53-60, 275-282; test 423-444), the window replaces the mounted fragment and resyncs rather than appending (present.ts:168-182, present.test.ts:133-140), the fragment is rebuilt from the new text with the renamed headline and added paragraph (present.test.ts:108-119), and nothing is written to the folder (ac-6 evidence).
  evidence: src-tauri/src/present.rs:275 — "if let Some(window) = app.get_webview_window(PRESENT_WINDOW) { window.emit(DECK_EVENT, ())"
  evidence: src/present.ts:176 — "reveal.sync(); reveal.slide(0, 0);"
  evidence: src/present.test.ts:115 — "expect(second).toContain("Beginnings renamed");"
  evidence: src/present.test.ts:138 — "expect(slides?.querySelectorAll("section")).toHaveLength(1);"
- ac-11 — MET_WITH_CONCERNS: Five of the six binding disciplines are demonstrated: one source (examples.test.ts:103-123 builds deck and article from one parse and asserts each headline is its heading's text), byte-fidelity (present.test.ts:50-58, present.rs:467-494), degrade gracefully (degrade.test.ts), no machine in the document (assets.test.ts:48, slides.test.ts:203-208), network only on publish (vendored engine at src/vendor/reveal, present.html:16-26 loads only bundle paths, slides.test.ts:229-234); the concern is that the legibility discipline has only the unticked manual rows behind it (see ac-7), and variant fidelity does not bind until phase 3.
  evidence: src/core/examples.test.ts:112 — "makes each slide headline its heading's own text"
  evidence: src/core/assets.test.ts:48 — "reports an absolute or climbing reference and resolves nothing"
  evidence: present.html:25 — "< script type="module" src="/src/vendor/reveal/reveal.js">< /script>"
  evidence: src/core/degrade.test.ts:2 — "Degrade gracefully in a plain tool."
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353412219.md:96 — "- [ ] **390 CSS px.**"

Gap audit:
- honoured:
  - Headings are the slides and the prose beneath each is its speaker note; Sections run horizontally, Sub-sections hang beneath
    evidence: src/core/deck.ts:202 — "function openHeading(build: Build, block: Block)"
    evidence: src/core/deck.test.ts:90 — "["Beginnings", "The first year", "The second year"]"
  - Every image becomes a full-bleed slide at its place in the text, with caption and credit
    evidence: src/core/render/slides.test.ts:68 — "< figure class="full-bleed">"
  - Nothing is stored: the deck is a string in memory and Present writes nothing into the document folder
    evidence: src-tauri/src/present.rs:493 — "Present wrote a file"
    evidence: src/present.test.ts:60 — "writes no deck file anywhere"
  - Present a second time shows the new text with no second copy
    evidence: src-tauri/src/present.rs:437 — "A second Present replaces the first rather than adding to it."
  - The same deck runs in the app and on the presenter site from one renderer, engine vendored not fetched
    evidence: src/publish/build.ts:439 — "renderSlides("
    evidence: src/core/render/slides.ts:45 — "export const DECK_ENGINE_FILES"
  - Present is reachable by chord from the editor and presents the buffer's text
    evidence: src/keys.ts:728 — "chords: ["C-c C-p"]"
    evidence: src/main.ts:85 — "void presentChapter(documentText(app.view), path)"
- diverged:
  - A two-Section chapter yields two horizontal slides: the delivery prepends a chapter-title slide, giving three
    evidence: src/core/deck.test.ts:61 — "opens the deck with the chapter's title"
    evidence: .abcd/development/specs/closed/spc-2609051353412219-present-a-chapter-with-no-slide-markup.md:0 — "The title slide against the first criterion"
  - Speaker notes are read from a split view opened with `s` inside the present window, not reveal.js's speaker view, because of the script-src 'self' policy
    evidence: src/present.ts:10 — "The notes are a split view inside this window rather than reveal.js's own speaker popup."
    evidence: .abcd/work/DECISIONS.md:84 — "Speaker notes are a split view inside the present window"
  - The site deck build named in the spec as scripts/build-deck.ts landed as part of src/publish/build.ts instead
    evidence: src/publish/build.ts:90 — "export const DECK_PATH = "slides/index.html";"
  - The first-image exception applies to the first block of any empty slide, not only the first block after a heading
    evidence: src/core/deck.ts:239 — "taken here as the first block of any slide that has nothing on it yet"
- missing:
  - Bob sees the deck at phone, iPad and desktop widths with nothing to scroll sideways or pinch, every headline, caption and image wholly visible: no automated measurement exists and no manual row is ticked
    evidence: src/core/render/legibility.test.ts:3 — "jsdom performs no layout"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353412219.md:96 — "- [ ] **390 CSS px.**"
  - Swipe, on-screen controls and arrow keys each demonstrably move the deck at 390 px: only configuration flags are proven, every manual row is unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353412219.md:35 — "- [ ] With a trackpad or touch screen, a swipe left and right"
  - The deck renders in full with the network off (the discipline's manual row in section 8) is unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353412219.md:128 — "- [ ] Turn the machine's network off."

Scope-condition dispositions:
- cond-2609051353414168 — survived: The bundle's other member shipped in the same closing commit and this build reads every override from the canon table that member owns, so neither shipped alone.
  evidence: .abcd/development/intents/shipped/itd-2609051335458626-shape-the-deck-in-the-same-text.md:0 — "shipped/"
  evidence: src/core/deck.ts:270 — "placementOf(block, "slides")"
- cond-2609051353412397 — survived: The deck runs in a Tauri 2 webview window and is written for the presenter site by the publish build; nothing targets the single HTML file.
  evidence: src-tauri/src/present.rs:283 — "tauri::WebviewWindowBuilder::new("
  evidence: src/publish/build.ts:90 — "DECK_PATH = "slides/index.html""
- cond-2609051353415666 — survived: One author on one machine holds: a single Mutex< Option< DeckSource>> and one present window, with no collaboration path; the audience-device half of the condition was not exercised beyond that.
  evidence: src-tauri/src/present.rs:49 — "pub struct PendingDeck(Mutex< Option< DeckSource>>);"
- cond-2609051353419859 — survived: Phase 1 presents the document's default variant with copied assets only: the shell refuses an asset at or above the copied-asset threshold and carries the default variant on DeckSource; no criterion was made to depend on citations, the PDF or annotations.
  evidence: src-tauri/src/present.rs:166 — "if metadata.len() >= threshold {"
  evidence: src-tauri/src/present.rs:210 — "pub fn default_variant(root: &Path) -> String"
- cond-2609051353416905 — survived: Present begins at the open buffer: the command takes the editor view's text and the current path and never opens a folder or builds a tree itself.
  evidence: src/main.ts:85 — "void presentChapter(documentText(app.view), path)"
  evidence: src-tauri/src/present.rs:232 — "document::confine_chapter(root, &chapter_path)?;"
- cond-2609051353414652 — narrowed: The condition put the Article column out of scope, yet this delivery ships src/core/render/article.ts rendering headings, figures and rules from the same tree; the spec scopes it as an unstyled skeleton for the one-source proof, so the boundary now holds only for the user-facing Tufte article.
  narrowing: holds for the styled, user-facing Tufte article only; the article HTML skeleton for the same constructs was delivered under this intent
  evidence: src/core/render/article.ts:0 — "renderArticle"
  evidence: src/core/examples.test.ts:104 — "builds deck and article skeleton from one parseChapter result"
- cond-2609051353416297 — survived: The deck starts from references already in the chapter and reads their bytes through the shell; the drop gesture and the copy into assets/ shipped separately in src/drop.ts and drop-target.ts.
  evidence: src/present.ts:156 — "for (const reference of referencesOf(parseChapter(text)))"
  evidence: src/drop.ts:0 — "drop"
- cond-2609051353419812 — untested: Nothing in the delivered range touches rehearsal cards or an annotation sidecar, so the boundary with map #25 was neither exercised nor contradicted.
- cond-2609051353412520 — survived: Present mints no id, hash or link; the publish build consumes the same buildChapterDecks/renderSlides and owns the version folder, so the deck at the link is this deck.
  evidence: src/publish/build.ts:434 — "const plans = buildChapterDecks("
  evidence: src-tauri/src/present.rs:263 — "pub async fn present_chapter"
- cond-2609051353412029 — survived: A citation parses and renders as the literal text the author wrote; nothing resolves a key or builds a reference list.
  evidence: src/core/render/slides.test.ts:195 — "< span class="citation">[@smith2020, p. 4]< /span>"
## Grounds

- pursued: headline-as-slide and text-as-notes yields a usable first deck with no authoring; wrong if the maintainer's real talks need authored breaks on most sections
