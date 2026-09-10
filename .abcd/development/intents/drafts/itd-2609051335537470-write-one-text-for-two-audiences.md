---
id: itd-2609051335537470
slug: write-one-text-for-two-audiences
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: major
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317429272]
---

# Write one text for two audiences

## Press Release

Alice is writing one piece for two occasions: forty minutes in front of a
conference audience, and a long read for people who were not in the room.
Most of it is the same text. Some of it is not: three paragraphs of method
that the room does not need, a digression that only works on the page, and
a sentence that is true but indiscreet in a talk. She declares her two
variants once, at the top of the document, and then writes the piece as one
piece.

When a passage belongs to one audience only, she marks it where it sits.
One key opens the insert palette; she chooses the variant block and the
canonical form appears around her paragraph, or she marks a few words
inline without breaking the sentence. The passage stays in the file, in
context, next to the text it qualifies — not in a second copy of the
chapter and not in a rule that lives somewhere else and points back at it.

Then she previews. She switches the preview to the talk and reads what Bob
will see: the method paragraphs are simply not there, and neither is the
footnote that hung off one of them, nor its entry in the reference list.
Nothing marks the gap — no ellipsis, no grey box, no note that something
has been left out — because to Bob there is nothing missing. She switches
to the reading variant and reads what Carol will get, whole. The sidebar
tells her which chapters carry marks and for which variants, so she can see
at a glance where the two texts diverge without hunting for the marks.

One text, two audiences, and one file to edit when the argument changes.

## Why This Matters

Writing for two audiences today means keeping two documents, and two
documents drift: a correction goes into one, a rewrite into the other, and
within a few months neither is the piece the author meant. The alternative
authors reach for — one text with the conditionality expressed somewhere
else, in heading heuristics or positional selectors — is worse, because
moving a paragraph silently retargets a rule and nothing announces the
change. Marking the passage itself puts the condition where the author can
see it while writing, moves it with the text when the text moves, and
leaves one copy of the argument to maintain.

## Mechanism

We expect an in-text marker to end variant drift because the acceptance
project holds three copies of one text, one of which has already drifted by
some thirty lines, with its conditionality living in heading heuristics and
positional CSS selectors — an arrangement in which reordering a paragraph
silently retargets a rule (03-evidence, "The acceptance project"; the
acceptance-project review note). A mark carried by the block itself cannot
be separated from the block by an edit.

We expect the mark to be safe to write into a manuscript that other tools
also open because it is a Pandoc fenced div with attributes and a bracketed
span with attributes, both part of the canon, so Emacs, Pandoc, and a plain
renderer read the file and show the text rather than choking on it
(05-internals section 3). Falsifiable: open a marked chapter in a plain
Markdown tool and look for a construct it cannot read past.

We expect the preview to be trustworthy because filtering is one function
in the rendering core, run unchanged by the app, the single file, the
presenter site, and the pipeline (05-internals section 4). What Alice reads
in preview is produced by the same code that produces what Bob and Carol
read, so a disagreement between preview and any published rendering is a
bug in that one function rather than a difference between two
implementations.

We expect removal to reach footnotes and citations inside a removed block
because a reference list is generated from what survives filtering, not
typed (04-surfaces section 3); a reference left behind by a removed
paragraph is therefore observable in the preview's own reference list, not
only in a later export.

We expect declaring the variants once for the document to be enough because
selection lives in the link rather than in a control on the page
(02-constraints, "Variants are core"), so no rendering needs to know that
more than one variant exists in order to render the one it was asked for.

## Scope Conditions

- Platform: the desktop app, in the Tauri 2 shell on macOS
  (adr-2609051324137479). The moment is marking a passage and previewing a
  variant while writing.
- Population: Alice, the maintainer, working on one document whose
  metadata declares at least two variants and a default. A document that
  declares none never meets this moment.
- Scale assumption: the acceptance project's three variants of one text are
  the working case (03-evidence). Nothing here assumes exactly two.
- Assumption: a variant block may contain headings, so a Section or
  Sub-section can belong to one variant alone. The sidebar badges the
  chapter that carries it, and every rendering of another variant omits
  the heading, its body, and its entry in any contents or deck.
- Assumption: Alice chooses which variant she is previewing from the
  app's chrome, not from a control inside the rendered page. The page is
  what a reader receives, and it never names a variant.
- Boundary with the discipline *variant fidelity*
  (itd-2609051336107315): 14 owns the mark and the preview — writing the
  attribute, seeing one audience's text, and the badges that say where the
  marks are. The discipline owns the obligation of every renderer, every
  export, every reference list, and every link to honour the marks, and it
  is where a leak between variants is judged.
- Boundary with map #19 (itd-2609051335598083, "Give each audience its own
  link"): 19 owns the links themselves — a path per variant under one
  stable id, and the guarantee that no page reveals another exists. 14 owns
  nothing published; its output is a filtered tree and a preview of it.
- Boundary with map #9 (itd-2609051335489928), map #5
  (itd-2609051335447894), map #21 (itd-2609051336019782), and map #17
  (itd-2609051335570842): each rendering owns its own column of the mapping
  table in 05-internals section 3, and each owns how it displays the text
  it is handed. 14 owns only that the tree they are handed has already been
  filtered.
- Boundary with map #1 (itd-2609051335399446, "Open a folder and see the
  book"): #1 owns the sidebar and the tree it draws; 14 owns what a variant
  badge beside a chapter means and when it is shown.
- Boundary with map #3 (itd-2609051335415528, "Insert a construct I cannot
  remember"): #3 owns that choosing an entry puts the canonical form at the
  cursor with the cursor where the content goes; 14 owns what the mark then
  does to the preview.
- Excluded as plumbing: the filter itself in the rendering core, and the
  removal of footnotes and citations inside filtered blocks, which is
  specified in 05-internals section 4.

## Acceptance Criteria

- Given a document declaring `variants: [full, talk]` and
  `default_variant: full`, When Alice wraps a paragraph in
  `::: {.variant variant="talk"}` and `:::` and previews the `talk`
  variant, Then the paragraph appears in the preview and the two fence
  lines do not.
- Given the same chapter, When Alice previews `full`, Then the marked
  paragraph is absent and nothing stands in its place: no ellipsis, no
  placeholder, and no spacing artefact. Alice chooses which variant she
  is previewing from the app's own chrome, outside the rendered page; the
  rendered page carries no control that names or offers another variant,
  and it is that page, not the app around it, that a reader ever
  receives.
- Given the sentence
  `She arrived [in the second week]{.variant variant="full"} and stayed.`,
  When Alice previews `talk`, Then the sentence renders as
  `She arrived and stayed.` — one space between the words either side of
  the removed span, no double space, and no stray bracket, brace, or
  attribute text; and When she previews `full`, Then it renders complete.
- Given a Section heading and its whole body wrapped in
  `::: {.variant variant="full"}`, When Alice previews `full`, Then that
  Section appears in the preview and in the preview's contents; and When
  she previews `talk`, Then the Section, its heading, and its entry in
  the contents are all absent, and the Sections either side of it read as
  neighbours with no gap in numbering or ordering to show that one was
  removed.
- Given a block marked `variant="draft"` where `draft` is not among the
  variants the document declares, When Alice previews either declared
  variant, Then the preview reports the undeclared name against that
  chapter and line rather than silently including or excluding the block,
  and the chapter file is unchanged. (Negative case.)
- Given a `::: {.variant variant="talk"}` block containing a footnote
  written `^[an inline note]` and a citation written `[@smith2020]`, When
  Alice previews `full`, Then neither the footnote nor the reference for
  `smith2020` appears anywhere in that preview, its footnote list, or its
  reference list.
- Given a block written `::: {.variant variant="talk full"}` and a
  neighbouring paragraph carrying no variant attribute at all, When Alice
  previews either variant, Then both appear — several names mean several
  variants, and no mark means every variant.
- Given a chapter containing `talk`-marked blocks and no others, When Alice
  looks at the sidebar, Then that chapter is badged for `talk` and is not
  badged for a variant no mark in it names, and a chapter with no marks
  carries no badge.
- Given the `talk` preview of that chapter, When Alice narrows the preview
  to iPhone width (390 CSS px), and again to iPad width (820 CSS px) and
  desktop width (1280 CSS px), Then the filtered text reflows at every one
  of the three widths with no horizontal scrolling and no pinch zoom, and
  the removed blocks leave no empty region behind them.
- Inherits: variant fidelity (`itd-2609051336107315`), which owns every
  renderer's, export's, and link's obligation to honour the marks this
  moment writes; one source, always (`itd-2609051336090390`); degrade
  gracefully in a plain tool (`itd-2609051336110536`); the renderings
  agree (`itd-2609051336130664`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; network only on
  publish (`itd-2609051336158553`).

## Open Questions

- Whether easter-egg content can itself be a variant-marked block
  (03-evidence, "Article and slides"). It decides whether the preview of
  one variant may contain an egg the other variant's preview does not, and
  therefore whether this moment or map #12 (itd-2609051335518134) owns the
  behaviour when an egg's marker and its content block disagree about which
  variant they belong to.
- What gesture declares the variant set. The list and the default live in
  the document's metadata, and every criterion here assumes they are
  already there; whether Alice edits that file directly or declares a
  variant from the app is not yet decided, and no moment in the map owns
  it.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
