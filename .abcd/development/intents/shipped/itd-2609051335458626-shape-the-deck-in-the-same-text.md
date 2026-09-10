---
id: itd-2609051335458626
slug: shape-the-deck-in-the-same-text
spec_id: spc-2609051353425884
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

# Shape the deck in the same text

## Press Release

Alice's deck is close, but it is not the talk. The second half needs a
breath before it starts. One Section is really two slides, and the seam is
obvious once she says it out loud. A comparison wants two columns rather
than a list. And the note the deck generated for one Section is the
paragraph she wrote for readers, which is not the thing she will say
standing up.

She does not open a slide editor. She stays in the chapter, presses the
palette key, chooses the construct, and types into it. A rule on its own
line splits a Section into two slides. A `{.divider}` on a heading turns
that Section into a section break, so the talk has its breath. A columns
div lays the comparison side by side. A notes div replaces the generated
note with the one she wants. A credit div puts a photograph's source at the
foot of the slide where it belongs. Each is one line she chose from a list
rather than one line she had to remember.

None of this is slide markup bolted onto the document. It is the document.
When Bob reads the same chapter as an article, the columns simply flow as
text, the divider is an ordinary heading, and Alice's speaker notes are not
there at all — he never learns that a talk was shaped in the file he is
reading. The same is true of the printed paper. And because every
construct is a fenced div, an attribute, or a comment, the chapter still
opens in Emacs, still converts through a plain Markdown tool, and still
reads as prose to anyone who has never heard of Editor.

So the talk and the document stay one file. Alice edits a sentence once,
and it is corrected in the deck, in the article, and in the paper, because
there was only ever one place to correct it.

## Why This Matters

A generated deck is a first draft of a talk, not a talk. The prototype
decks that work have statement slides, dividers, image-only slides and
columns in them, and no hierarchy produces those on its own. The usual
answer is to export the deck and then edit the export, which is the moment
the second copy is born: from then on the talk is edited in one file and
the chapter in another, and by the third revision nobody can say which is
right. Shaping the deck inside the chapter keeps the count at one. Alice
gets the talk she wants without paying for it in divergence, and without
having to remember how a columns div is spelled.

## Mechanism

- We expect authored constructs to be necessary, not merely convenient,
  because the slide prototype recorded in `03-evidence.md` shows that "the
  default mapping alone does not make a usable talk": some fifty slides
  authored by hand, with statement slides, dividers, image-only slides,
  columns, and repeated slides with one line added.
- We expect the set of constructs to be small and closed because
  `03-evidence.md` records what an author actually reached for in that
  prototype — rules between slides, a column separator, layout hints and
  source credits in comments, and `Note:` speaker notes — and the canon in
  `05-internals.md` section 3 gives each of those exactly one Pandoc form.
  If an author needs a sixth construct in the first real talk, the closed
  set is wrong.
- We expect the constructs to cost the article and the paper nothing
  because each one is a fenced div, a heading attribute, or a comment, and
  the mapping table in `05-internals.md` section 3 assigns every construct
  a defined behaviour in all three renderings, including "ignored" and
  "absent". The table, not each renderer, is where an ignore rule lives.
- We expect a plain tool to survive them because that is what the fenced
  div buys: `03-evidence.md` records the rejection of a bespoke dialect in
  favour of Pandoc-compatible forms, at the accepted cost of "more verbose
  source; the author needs the insert palette to remember it". The bar is
  not that a plain tool understands the fence — it will not — but that it
  reads past it: if a plain conversion of a shaped chapter loses a
  paragraph, or stops before the end of the file, the trade did not pay.
- We expect Alice to reach these forms without memorising them because
  every one of them is an entry in the insert palette, which
  `05-internals.md` names as the one place the syntax lives. The
  keyboard-navigation prototype in `03-evidence.md` shows the same
  pattern working: a declarative table shown to the user rather than
  documented apart from the app.
- We expect shaping to leave the source otherwise untouched because
  serialising an edited tree changes only the spans that were edited
  (`05-internals.md` section 2), so inserting a construct cannot reflow a
  paragraph or realign a table elsewhere in the chapter.

## Scope Conditions

- **Bundle.** This intent is a member of the bundle *The deck*, whose <!-- cond: cond-2609051353420101 -->
  other member is map #5 (`itd-2609051335447894`), "Present a chapter with
  no slide markup". One spec covers both halves of one rule: #5 is what
  the deck does when the author says nothing, this intent is what it does
  when they say something. Neither ships alone. The article's and the
  paper's obligation to ignore these constructs is stated once, here, for
  the whole bundle.
- **Platform.** The desktop app on macOS — Tauri 2 with the system web <!-- cond: cond-2609051353425331 -->
  view — and the deck as built for the presenter site. The same constructs
  inside the single HTML file are out: map #17
  (`itd-2609051335570842`) owns that host, in phase 5.
- **Population.** Alice, shaping her own chapter into her own talk, with <!-- cond: cond-2609051353429583 -->
  Bob and Carol as the audience and, later, as readers of the same text.
  One author on one machine.
- **Phase.** Phase 1, seeded with the slide constructs only: the <!-- cond: cond-2609051353423719 -->
  horizontal rule split, the `.divider` heading attribute, the `.columns`
  div, the `.notes` div, and the `.credit` div. `06-delivery.md` excludes
  variants, citations, the article, the PDF, the single file and
  referenced assets from this phase, so no criterion here depends on them.
- **Boundary with map #3 (`itd-2609051335415528`), "Insert a construct I <!-- cond: cond-2609051353420579 -->
  cannot remember".** In: what each construct means in the deck, and that
  the palette carries an entry for each of this phase's slide constructs.
  Out: the palette itself — how it opens, how it is searched, and the
  guarantee that the canonical form arrives at the cursor with the cursor
  where the content goes. #3 owns all of that; a construct arriving in a
  later phase adds a palette entry, not a new intent.
- **Boundary with map #9 (`itd-2609051335489928`), "Read the document as a <!-- cond: cond-2609051353428349 -->
  Tufte article".** In: the obligation, stated here for the bundle, that
  these constructs change nothing in the article — `.columns` content
  appears in the flow, `.notes` is absent, a `.divider` heading is an
  ordinary heading, and a rule is a rule. Out: everything the article does
  render, which is #9's, in phase 2.
- **Boundary with map #21 (`itd-2609051336019782`), "Receive a <!-- cond: cond-2609051353422379 -->
  journal-style PDF with the document".** In: the same obligation for
  print — slide-only constructs do not appear in the paper. Out: the
  printed artefact, the Typst step and the template, which are #21's, in
  phase 6.
- **Boundary with map #5 (`itd-2609051335447894`).** In: constructs that <!-- cond: cond-2609051353424864 -->
  override or subdivide the default mapping. Out: the default mapping
  itself — Section to horizontal slide, Sub-section to vertical slide,
  image to its own slide, prose to generated speaker notes — which is #5's.
- **Boundary with map #11 (`itd-2609051335502171`), "Cite from a <!-- cond: cond-2609051353428737 -->
  bibliography file".** In: the `.credit` div as the phase-1 way to put a
  source line at the foot of a slide. Out: resolving a citation key
  against a bibliography file and generating a reference list, which is
  #11's, in phase 2, and which supplies the same credit line from a
  different source.
- **Assumption.** The chapter is open and the default deck already builds, <!-- cond: cond-2609051353426648 -->
  which map #1 (`itd-2609051335399446`) and map #5 own respectively.

## Acceptance Criteria

- **Given** a Section `## Beginnings` whose prose contains `---` alone on a
  line with a blank line either side, **when** the deck is built, **then**
  the Section becomes two horizontal slides split at that rule, both
  carrying the Section's place in the main line, and the text after the
  rule appears on the second slide rather than in the first slide's
  speaker notes.
- **Given** a Section written `## Interlude {.divider}`, **when** the deck
  is built, **then** that Section's slide is a section-break slide showing
  the headline alone on the slide face, and the `.divider` attribute
  appears nowhere in the rendered text of any slide.
- **Given** a Section containing exactly the canonical form —
  `::: {.columns}`, then `::: {.column width="50%"}` with content, then a
  second `::: {.column width="50%"}` with content, then the closing fences
  — **when** the deck is built, **then** the two columns sit side by side
  in the declared proportions at desktop width (1280 CSS px) and at iPad
  width (820 CSS px), and at iPhone width (390 CSS px) they stack in
  source order with no horizontal scrolling and no pinch zoom.
- **Given** a Section with one paragraph of prose and a `::: {.notes}` div
  holding different text, **when** Alice presents the deck, **then** the
  speaker-notes view shows the notes div's text alone, the Section's own
  paragraph is not shown as generated notes, and the notes text appears on
  no slide the audience sees.
- **Given** a Section split by a rule into two slides, with a
  `::: {.notes}` div written after the content of the second slide,
  **when** Alice presents the deck, **then** the notes attach to the
  second slide alone and the first slide keeps its own generated notes.
- **Given** a Section holding a photograph and a `::: {.credit}` div,
  **when** the deck is built, **then** the credit renders as a line at the
  foot of that Section's slide, and it renders as a line rather than as a
  paragraph of body text.
- **Given** a chapter carrying one of each of this phase's constructs —
  a rule, a `{.divider}` heading, a `.columns` div, a `.notes` div and a
  `.credit` div — and a copy of the same chapter with every one of those
  constructs stripped out, **when** both are converted by a plain
  Markdown tool that knows none of them, **then** the prose of the two
  outputs is the same prose in the same order: no paragraph is lost, none
  is swallowed by a construct, and the tool reaches the end of the file
  in both cases.
- **Given** a chapter containing `<!-- pagebreak -->` alone on a line
  inside a Section, **when** the deck is built, **then** the comment
  produces no slide break, no blank slide and no visible output anywhere
  in the deck.
- **Given** Alice inserts a `.notes` div into a chapter and saves, **when**
  the chapter file is compared with its previous contents, **then** the
  only difference is the inserted div and its surrounding blank lines: no
  paragraph elsewhere is reflowed, no character is re-escaped, and no
  table is realigned.
- Inherits: one source, always (`itd-2609051336090390`); degrade
  gracefully in a plain tool (`itd-2609051336110536`); round-trip
  byte-fidelity (`itd-2609051336074533`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; no machine in
  the document (`itd-2609051336080960`); network only on publish
  (`itd-2609051336158553`). From phase 2, the renderings agree
  (`itd-2609051336130664`) governs the ignore obligations stated above,
  and from phase 3, variant fidelity (`itd-2609051336107315`) governs
  what a shaped deck may show once the text is filtered.

## Open Questions

- The slide theme: one built-in theme, or the prototype's theme ported
  (`03-evidence.md`, open questions, "Article and slides"). Dividers,
  columns and credit lines have no appearance of their own until that is
  settled, so what a shaped slide looks like is downstream of it.
- Where a horizontal rule may split, now that a Sub-sub-section folds
  into its Sub-section's speaker notes rather than becoming a slide: what
  a rule does inside a Sub-sub-section's text, and what it does before
  the chapter's first Section, is not yet decided.
- What becomes of prose written beneath a `{.divider}` heading: whether
  it feeds that slide's speaker notes or is dropped, since a section-break
  slide shows its headline alone.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-eeafee535ebc -->
Fidelity review — receipt rcp-eeafee535ebc (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:0f0bc2d483f5553cb2754e01efe6444f8eda28386566c412abd4c79a99841b65
Input attestations: diff:e41596a^..HEAD (4228d9b..1327728)@sha256:6343ab4e968dd2ce947b393ad874bb85af80f3bbb074f2d20e2e98bfd2353d7e; intent:.abcd/development/intents/shipped/itd-2609051335458626-shape-the-deck-in-the-same-text.md@-; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609051353425884.md@-;

Acceptance rollup: MET 6 · MET_WITH_CONCERNS 3 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: A rule opens a face-mode continuation draft on the axis in force (deck.ts:230-233), and the test shows two columns, the second slide of kind continuation with 'After the rule.' on its face and absent from the first slide's notes; a following Section is a third column, so both halves sit in the main line.
  evidence: src/core/deck.ts:230-233 — "function splitAtRule(build: Build, block: Block): void { build.folding = false; place(build, draft("continuation", block.line, "face")); }"
  evidence: src/core/shaping.test.ts:30-54 — "expect(textOf(second?.face ?? [])).toEqual(["After the rule."]); ... expect(textOf(first?.notes ?? [])).not.toContain("After the rule.");"
  evidence: src/core/shaping.test.ts:56-61 — "expect(plan.columns.map((column) => column.slides.length)).toEqual([1, 1, 1]);"
- ac-2 — MET: A heading carrying .divider opens a slide of kind divider (deck.ts:195-196) whose face stays empty, even an image is kept off it (deck.ts:247), and the rendered markup carries 'divider' only as a class on the section element, never in the text.
  evidence: src/core/deck.ts:195-199 — "if (divider) return "divider";"
  evidence: src/core/shaping.test.ts:113-121 — "expect(slide?.kind).toBe("divider"); expect(slide?.headline).toBe("Interlude"); expect(slide?.face).toEqual([]);"
  evidence: src/core/shaping.test.ts:134-139 — "expect(markup.replace(/<[^>]*>/g, "")).not.toContain("divider");"
  evidence: src/core/render/slides.test.ts:75-79 — "expect(html).toContain('class="slide slide-divider divider"'); expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/divider/);"
- ac-3 — INCONCLUSIVE: The mechanism is present and cited: columns render as flex items with data-width from the declared percentages, the stylesheet gives each a flex-basis of that share, collapses the row to display:block below 820 CSS px so source order is what stacks, and the Present window declares width=device-width. But the criterion is an observable at three real widths, the spec assigns that proof to the manual checklist, every width row there is unticked, no browser is available to me to measure it, and widthBucket rounds a declared width to the nearest 5% (html.ts:81) so 'declared proportions' hold only on a scale of fives. The width behaviour is unverified, not failed.
  evidence: src/core/render/slides.css:188-224 — ".reveal .column[data-width="50"] { flex: 0 0 calc(50% - var(--column-gap)); }"
  evidence: src/core/render/slides.css:263-271 — "@media (max-width: 819px) { .reveal .columns { display: block; }"
  evidence: src/core/render/html.ts:75-82 — "return String(Math.min(100, Math.max(5, Math.round(value / 5) * 5)));"
  evidence: src/core/render/slides.test.ts:81-110 — "expect(html).toContain('< div class="column" data-width="60">< p>Left.< /p>< /div>');"
  evidence: present.html:6-7 — "name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover""
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353425884.md:25-33 — "- [ ] **1280 CSS px.** The two columns sit side by side, in equal halves."
- ac-4 — MET: A notes div sets the slide's authored notes, and finish() takes authored over generated (deck.ts:292-297, 381), so the test sees notesSource 'authored', the notes equal to the div's text alone, the Section's paragraph neither in the notes nor on the face; aside.notes is display:none in the deck and the Present window's notes view reads that aside, and the face markup does not contain the note text.
  evidence: src/core/deck.ts:292-297 — "slide.authored = [...(slide.authored ?? []), ...contentsOf(block)];"
  evidence: src/core/deck.ts:381 — "const notes = slide.authored ?? slide.generated;"
  evidence: src/core/shaping.test.ts:182-201 — "expect(slide?.notesSource).toBe("authored"); expect(textOf(slide?.notes ?? [])).toEqual(["Slow down here."]); ... expect(slide?.face).toEqual([]);"
  evidence: src/core/shaping.test.ts:247-254 — "expect(face).not.toContain("A private remark.");"
  evidence: src/core/render/slides.css:72-74 — ".reveal aside.notes { display: none; }"
  evidence: src/present.test.ts:183-189 — "expect(notesOf(slides[0] ?? null)).toContain("Say the thing");"
- ac-5 — MET: A notes div attaches to currentSlide(), which after a rule is the continuation draft; the test shows the first slide generated with its own paragraph and the second authored with the div's text alone.
  evidence: src/core/deck.ts:292-297 — "const slide = currentSlide(build, block.line);"
  evidence: src/core/shaping.test.ts:203-226 — "expect(first?.notesSource).toBe("generated"); expect(textOf(first?.notes ?? [])).toEqual(["Generated for the first slide."]); expect(second?.notesSource).toBe("authored");"
- ac-6 — MET: A credit div becomes a FootLine on the slide in force (deck.ts:300-309), rendered as < footer class="slide-foot">< p class="credit"> under the face and styled as one small line pushed to the foot (margin-block-start:auto, font-size 0.62em, p margin 0) rather than as body type; the test with a photograph on the slide shows the credit in foot and not in notes.
  evidence: src/core/deck.ts:300-309 — "slide.foot.push({ kind: "credit", label: null, blocks: contentsOf(block), inlines: [] });"
  evidence: src/core/render/slides.ts:165-183 — "return `<footer class="slide-foot">${rendered}</footer>`;"
  evidence: src/core/render/slides.css:155-172 — ".reveal .slide-foot { margin-block-start: auto; padding-block-start: 0.6em; border-block-start: 1px solid rgba(0, 0, 0, 0.12); }"
  evidence: src/core/shaping.test.ts:258-279 — "expect(slide?.foot[0]?.kind).toBe("credit"); ... expect(slide?.notes).toEqual([]);"
  evidence: src/core/render/slides.test.ts:174-191 — "expect(DECK_STYLESHEET).toMatch(/\.reveal \.slide-foot p \{\s*margin: 0;/);"
- ac-7 — MET_WITH_CONCERNS: A bare markdown-it with no Editor plugin converts SHAPED and STRIPPED (one of each phase-1 construct versus the same prose bare) to equal prose lines in the same order, both ending with the last paragraph, with 'Left.' and 'Right.' surviving the fences; the shaped chapter also carries a pagebreak comment. Concerns: (1) the comparison first strips ':::' fence lines, '< !--' lines and a trailing '{.x}' from the plain output (degrade.test.ts:110-118), so the plain tool does print the fence markers and the heading attribute as visible text, which the criterion's 'same prose' wording tolerates only if those are read as markup rather than prose; (2) Pandoc, the tool the canon is written against, is a manual row and every Pandoc row is unticked.
  evidence: src/core/degrade.test.ts:24 — "const plain = new MarkdownIt();"
  evidence: src/core/degrade.test.ts:120-140 — "expect(shaped).toEqual(stripped); ... expect(shaped[shaped.length - 1]).toBe("The last paragraph of the file."); ... expect(shaped).toContain("Left.");"
  evidence: src/core/degrade.test.ts:110-118 — ".filter((line) => !/^:{3,}/.test(line)).filter((line) => !/^< !--/.test(line)).map((line) => line.replace(/\s*\{\.[^}]*\}$/, ""));"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353425884.md:68-69 — "- [ ] `pandoc -f markdown -t plain shaped.md > shaped.txt`"
- ac-8 — MET: The canon row for the pagebreak comment places it 'ignored' in slides and article; deck.ts returns without opening or touching a slide, the slide renderer emits the empty string, and the test shows one column of one slide with 'Before.' and 'After.' both in that slide's notes and 'pagebreak' absent from the deck and article markup.
  evidence: src/core/canon.ts:241-249 — "slides: { placement: "ignored", wording: "ignored" }, ... matches: (block) => block.kind === "comment" && block.comment === "pagebreak","
  evidence: src/core/deck.ts:315-317 — "case "ignored": case "absent": return;"
  evidence: src/core/render/slides.ts:144-146 — "case "ignored": case "absent": return "";"
  evidence: src/core/shaping.test.ts:301-315 — "expect(plan.columns[0]?.slides).toHaveLength(1); expect(textOf(plan.columns[0]?.slides[0]?.notes ?? [])).toEqual(["Before.", "After."]); ... expect(markup).not.toContain("pagebreak");"
- ac-9 — MET_WITH_CONCERNS: The app's path is one CodeMirror change transaction of the form text plus at most a blank line either side (palette.ts:86-107), the save writes sliceDoc() unchanged (editor.ts:211, app.ts:541-543), the Rust side writes the bytes as given (document.rs:458), and the buffer keeps the file's own line separator (editor.ts:199-222); the test shows the bytes before and after an inserted speaker-notes div are identical to the original and that stripping the inserted span gives the original back. Concern: the test deliberately performs the insertion with its own function 'rather than by a module that might normalise something on the way' (degrade.test.ts:153-159), so the palette-to-disk round trip the criterion describes is verified by reading the chain, not by a test, and the manual row for it is unticked.
  evidence: src/core/degrade.test.ts:176-185 — "expect(next.slice(0, at)).toBe(SHAPED.slice(0, at)); expect(next.slice(at + length)).toBe(SHAPED.slice(at)); ... expect(next.replace(next.slice(at, at + length), "")).toBe(SHAPED);"
  evidence: src/core/degrade.test.ts:153-159 — "the insertion is done by the test rather than by a module that might normalise something on the way."
  evidence: src/palette.ts:86-107 — "const insert = `${prefix}${form.text}${suffix}`; ... view.dispatch({ changes: { from: planned.from, to: planned.to, insert: planned.insert },"
  evidence: src/app.ts:541-543 — "const text = documentText(view); try { await services.writeChapter(path, text);"
  evidence: src/editor.ts:211-213 — "export function documentText(view: EditorView): string { return view.state.sliceDoc(); }"
  evidence: src-tauri/src/document.rs:456-459 — "file.write_all(text.as_bytes())?;"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353425884.md:83 — "- [ ] `diff .abcd/.work.local/scratch/before.md <the chapter>` shows only the inserted div"
- ac-10 — MET_WITH_CONCERNS: One source: deck and article skeleton are built from one parseChapter result and the article never carries the notes text (shaping.test.ts:339-364, examples.test.ts:105). Degrade gracefully and byte fidelity: degrade.test.ts. No machine in the document: the forms are text only and no example carries an absolute or climbing reference (examples.test.ts:155). Network only on publish: no built deck names an absolute URL (examples.test.ts:141) and none of deck.ts, canon.ts, inserts.ts, slides.ts, slides.css or article.ts contains a fetch or URL. Concern: legible on three device classes at 390, 820 and 1280 CSS px is proven only by the unticked manual width rows, the same gap as ac-3; the phase-2 and phase-3 governance clauses are not yet in force and are not judged.
  evidence: src/core/shaping.test.ts:339-364 — "const plan = buildDeck(chapter); const article = renderArticle(chapter); ... expect(article).not.toContain("A remark.");"
  evidence: src/core/examples.test.ts:105 — "it("builds deck and article skeleton from one parseChapter result""
  evidence: src/core/examples.test.ts:141 — "it("names no absolute URL in any built deck, only what the chapter wrote""
  evidence: src/core/examples.test.ts:155 — "it("finds no absolute or climbing image reference in any example""
  evidence: src/core/degrade.test.ts:187-192 — "expect(chapter.source).toBe(before);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353425884.md:20-33 — "## 1. Columns at three widths (AC3)"

Gap audit:
- honoured:
  - A rule on its own line splits a Section into two slides, the second in the main line with the following text on its face
    evidence: src/core/deck.ts:230-233 — "place(build, draft("continuation", block.line, "face"))"
    evidence: src/core/shaping.test.ts:30-61 — "splits a Section at a rule and puts the following text on the second slide"
  - A {.divider} heading is a section-break slide showing the headline alone
    evidence: src/core/shaping.test.ts:113-139 — "expect(slide?.face).toEqual([]);"
  - A notes div replaces the generated note and attaches to the slide whose content it follows
    evidence: src/core/shaping.test.ts:182-226 — "attaches a notes div to the slide whose content it follows"
  - A credit div is a line at the foot of the slide in the credit style
    evidence: src/core/render/slides.ts:179-182 — "< p class="credit">...< footer class="slide-foot">"
    evidence: src/core/render/slides.css:163-172 — "A credit is a line at the foot of the slide, not a paragraph of body text."
  - The table, not each renderer, is where an ignore rule lives: both renderers read placementOf from one canon table
    evidence: src/core/canon.ts:121-309 — "export const CANON_ROWS: readonly CanonRow[] = ["
    evidence: src/core/deck.ts:270 — "const placement: Placement | undefined = placementOf(block, "slides");"
    evidence: src/core/render/article.ts:142 — "switch (placementOf(block, "article")) {"
  - The article ignores the constructs: columns in flow, notes absent, divider an ordinary heading, rule a rule, pagebreak nothing (bundle obligation)
    evidence: src/core/render/article.ts:142-162 — "case "absent": return ""; ... if (block.kind === "div") return renderColumnsInFlow(block, article);"
    evidence: src/core/render/article.test.ts:154-183 — "expect(html).toContain("< p>Left.< /p>< p>Right.< /p>"); ... expect(html).not.toContain("Slow down here.");"
  - Every phase-1 slide construct is an entry the palette offers, in its canonical form
    evidence: src/core/inserts.ts:93-182 — "id: "slide-split" ... id: "divider" ... id: "columns" ... id: "speaker-notes" ... id: "credit" ... id: "page-break""
    evidence: src/palette.ts:27 — "export const PALETTE_PHASE = 1;"
    evidence: src/core/inserts.ts:351-353 — "return INSERT_FORMS.filter((form) => form.visibleFrom <= phase);"
  - The constructs on real documents: a chapter of the maintainer's own local test material carries dividers, rules, columns, notes and credits and its snapshot passed at the time (iss-2609061418065651 later untracked that material and dropped the snapshot)
    evidence: src/core/examples.test.ts (removed by iss-2609061418065651; superseded by src/local-documents.test.ts) — "# ... {.divider} ... ::: {.columns} ... ::: {.credit}"
  - The pagebreak comment produces nothing in the deck
    evidence: src/core/shaping.test.ts:301-315 — "ignores a page-break comment"
- diverged:
  - The spec names src/core/palette.ts as the new module holding the canonical forms; the forms live in src/core/inserts.ts and src/palette.ts is the palette surface owned by map #3
    evidence: src/core/inserts.ts:1-10 — "The canonical form of every construct, as data."
    evidence: .abcd/development/specs/closed/spc-2609051353425884-shape-the-deck-in-the-same-text.md:30 — "| `src/core/palette.ts` | new: the canonical form of each phase-1 slide construct, as data |"
  - Columns take the 'declared proportions' only to the nearest 5%: a declared width is bucketed before it reaches the stylesheet
    evidence: src/core/render/html.ts:81 — "return String(Math.min(100, Math.max(5, Math.round(value / 5) * 5)));"
    evidence: src/core/render/slides.css:183-184 — "a declared width reaches the page as `data-width` — a whole percentage on a scale of fives"
  - The plain-tool comparison is against markdown-it and normalises away the fence markers and heading attribute the plain tool prints as visible text; Pandoc is left to an unticked manual row
    evidence: src/core/degrade.test.ts:104-118 — "a plain tool prints them as text ... They are taken out here; every other line has to match."
  - The byte-fidelity test inserts with its own function rather than the palette's insertForm, so the app's insert-and-save round trip is inferred from code, not tested
    evidence: src/core/degrade.test.ts:153-159 — "the insertion is done by the test rather than by a module that might normalise something on the way."
    evidence: src/palette.ts:99-107 — "export function insertForm(view: EditorView, form: InsertForm): string | null {"
  - The intent left open what becomes of prose beneath a {.divider} heading; the build decides it becomes that slide's generated notes
    evidence: src/core/shaping.test.ts:119-120 — "// The decision log: prose under a divider heading becomes its notes. expect(textOf(slide?.notes ?? [])).toEqual(["Prose beneath it."]);"
    evidence: src/core/deck.ts:205 — "const slide = draft(headingKind(level, divider), block.line, "notes");"
  - The intent left open what a rule does inside a Sub-sub-section and before the first Section; the build decides both (Sub-section axis; splits the opening slide)
    evidence: src/core/shaping.test.ts:78-109 — "splits on the Sub-section's axis from inside a Sub-sub-section ... splits the opening slide when it sits before the first Section"
- missing:
  - Columns measured side by side at 1280 and 820 CSS px and stacked in source order at 390 with no sideways scroll: every width row of the manual checklist is unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353425884.md:25-33 — "- [ ] **390 CSS px.** The two columns are stacked, the left column's content above the right column's"
  - The Pandoc run of the shaped-versus-stripped comparison: every row unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353425884.md:55-77 — "## 4. The plain tool: Pandoc (AC7)"
  - The in-app insert-and-save byte diff: the manual row is unticked and no automated test drives insertForm through to writeChapter
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353425884.md:79-85 — "## 5. Byte fidelity of an insert (AC9)"

Scope-condition dispositions:
- cond-2609051353420101 — survived: Both bundle members ship in the same range (map #5's intent sits in shipped/ beside this one), and the article's ignore obligation is stated once in the canon table and proved by the article tests, as the condition assumed.
  evidence: .abcd/development/intents/shipped/itd-2609051335447894-present-a-chapter-with-no-slide-markup.md:1 — "itd-2609051335447894 (shipped)"
  evidence: src/core/render/article.test.ts:7-9 — "the bundle's obligation, stated in `spc-2609051353425884`: the slide-only constructs cost the article nothing"
- cond-2609051353425331 — survived: The deck is rendered in the Tauri present window and by the presenter-site build from the same renderSlides and DECK_CONFIG; nothing in the range renders the constructs inside a single HTML file.
  evidence: src/present.ts:28 — "import { DECK_CONFIG, renderSlides } from "./core/render/slides";"
  evidence: src/publish/build.ts:480 — "< meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">"
  evidence: src-tauri/tauri.conf.json:29-31 — ""bundle": { ... "targets": "all","
- cond-2609051353429583 — untested: Nothing in the delivered range exercises more than one author or one machine; the shaping path is a single buffer on one checkout and no test or code contradicts or depends on the assumption.
- cond-2609051353423719 — survived: The palette offers only rows whose canon phase is 1 (rule, divider, columns, notes, credit, pagebreak), later-phase rows are in the table but hidden, and no criterion depended on variants, citations, the article, the PDF or assets; the deck also puts a footnote at the foot, which is native Markdown rather than an authored construct, and its variant filter is inert with variant null.
  evidence: src/palette.ts:27 — "export const PALETTE_PHASE = 1;"
  evidence: src/core/inserts.ts:351-353 — "return INSERT_FORMS.filter((form) => form.visibleFrom <= phase);"
  evidence: src/core/canon.ts:142-249 — "phase: 1 on rule, divider, columns, notes, credit, pagebreak"
  evidence: src/core/deck.ts:262-265 — "if (variant === null || block.variants.length === 0) return true;"
- cond-2609051353420579 — survived: This spec supplies only the forms as data in src/core/inserts.ts (one entry per phase-1 slide construct), while how the palette opens, filters and lands the cursor is in src/palette.ts under map #3, which shipped in the same range.
  evidence: src/core/inserts.ts:93-182 — "id: "slide-split" ... "divider" ... "columns" ... "speaker-notes" ... "credit" ... "page-break""
  evidence: src/palette.ts:4-5 — "Nothing about a construct's spelling lives here. `src/core/inserts.ts` is"
  evidence: .abcd/development/intents/shipped/itd-2609051335415528-insert-a-construct-i-cannot-remember.md:1 — "itd-2609051335415528 (shipped)"
- cond-2609051353428349 — survived: The article renderer reads the canon's Article column: columns content in flow with the fence gone, notes absent, a divider heading an ordinary heading with its class, a rule an < hr />; the article's own styling is not touched.
  evidence: src/core/render/article.ts:142-158 — "case "flow": if (block.kind === "rule") return "< hr />"; if (block.kind === "heading") return renderHeading(block, article); if (block.kind === "div") return renderColumnsInFlow(block, article);"
  evidence: src/core/render/article.test.ts:175-182 — "expect(html).toContain('< h2 id="interlude" class="divider">Interlude< /h2>'); ... expect(html).not.toContain("Slow down here.");"
- cond-2609051353422379 — untested: No print rendering exists in the range; the canon table carries a print column as data but nothing renders it, so the obligation that slide-only constructs do not appear in the paper is neither exercised nor contradicted.
- cond-2609051353424864 — survived: Every override is a canon row read through placementOf, and the default mapping (heading to slide, image to its own slide, prose to notes) is the fall-through in the same walk; the module's header says both come from one table rather than a branch it invented.
  evidence: src/core/deck.ts:4-8 — "everything that overrides it is a row in `canon.ts` rather than a branch this module invented"
  evidence: src/core/deck.ts:267-333 — "function placeBlock(build: Build, block: Block, variant: string | null): void { ... const placement: Placement | undefined = placementOf(block, "slides");"
- cond-2609051353428737 — survived: The credit div is the phase-1 foot line and a citation stays the literal key the author wrote in both renderings, so nothing resolves against a bibliography.
  evidence: src/core/render/slides.test.ts:193-196 — "expect(html).toContain('< span class="citation">[@smith2020, p. 4]< /span>');"
  evidence: src/core/canon.ts:251-261 — "id: "citation" ... phase: 2"
- cond-2609051353426648 — survived: Map #1 and map #5 both sit in shipped/ in the same range, and Present builds the deck from the open chapter's text through the same parseChapter and buildDeck the tests use.
  evidence: .abcd/development/intents/shipped/itd-2609051335399446-open-a-folder-and-see-the-book.md:1 — "itd-2609051335399446 (shipped)"
  evidence: src/present.ts:140 — "return renderSlides(buildDeck(parseChapter(text), { variant }), resolve, variant);"
## Grounds

- pursued: authored breaks, columns, notes, and dividers as Pandoc-compatible constructs coexist with the derived deck and are ignored by the article; wrong if the article renderer cannot cleanly skip them
