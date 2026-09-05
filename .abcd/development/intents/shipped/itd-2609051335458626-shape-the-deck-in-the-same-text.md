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

<!-- abcd-review: OWED receipt=rcp-eeafee535ebc -->
Fidelity review OWED (receipt rcp-eeafee535ebc).

## Grounds

- pursued: authored breaks, columns, notes, and dividers as Pandoc-compatible constructs coexist with the derived deck and are ignored by the article; wrong if the article renderer cannot cleanly skip them
