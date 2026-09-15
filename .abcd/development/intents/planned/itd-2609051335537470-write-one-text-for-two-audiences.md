---
id: itd-2609051335537470
slug: write-one-text-for-two-audiences
spec_id: spc-2609151823595737
kind: standalone
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

What already ships, and is not this moment's to claim: the parser reads
`::: {.variant variant="talk"}` and `[…]{.variant variant="full"}` into
nodes that carry their variants, headings included (map #2); the insert
palette writes both forms at the cursor (map #3, itd-2609051335415528);
each renderer drops the blocks and spans that are not the variant it is
handed; and the preview window renders the document's default variant
(map #9, itd-2609051335489928, whose audit records the filter it uses).
What is new here is choosing which variant the preview renders, the
sidebar badge, and closing the leaks below.

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

We expect the preview to be trustworthy only once three things the tree
does today are closed, because the brief's single `variant` module
(05-internals section 4) does not exist: the block filter is four copies,
one per renderer (iss-2609151509292287); citation resolution takes no
variant, so a work cited only inside a removed block still earns a
reference and shifts every later number (iss-2609151509287105); the
contents list is drawn from the unfiltered outline (iss-2609151509281407);
and a note or citation nested inside a removed span survives, because the
inline walk flattens the span into its neighbours (iss-2609151509281307).
Closing them is this moment's work, not excluded plumbing, and it is
falsifiable in the preview's own reference list and contents.

We expect removal to be invisible because the rule for what an undeclared
name does is already recorded: its block is left out of every rendering and
the chapter is listed in the sidebar until the name is declared or
corrected (04-surfaces, "Variants"; DECISIONS 2026-09-05), and removing an
inline span collapses only the double space it would leave (the same
line). Neither is built yet: the preview admits an undeclared block by
side effect and nothing badges it, and the span leaves two spaces.

We expect declaring the variants once for the document to be enough because
the set of variants is declared once, in the document's metadata, and Alice
chooses which she is previewing in the app's own chrome, which is not part
of any rendering (04-surfaces, "Variants"). The shell already reads
`variants` and `default_variant`; the preview already re-renders in place
when the preview event fires again, so a switch is the same window handed
another variant, never a second window.

## Scope Conditions

- Platform: the desktop app, in the Tauri 2 shell on macOS <!-- cond: cond-2609151823592526 -->
  (adr-2609051324137479). The moment is marking a passage and previewing a
  variant while writing.
- Population: Alice, the maintainer, working on one document whose <!-- cond: cond-2609151823596949 -->
  metadata declares at least two variants and a default. A document that
  declares none never meets this moment.
- Scale assumption: the acceptance project's three variants of one text are <!-- cond: cond-2609151823599077 -->
  the working case (03-evidence). Nothing here assumes exactly two.
- Assumption: a variant block may contain headings, so a Section or <!-- cond: cond-2609151823599811 -->
  Sub-section can belong to one variant alone.
- Assumption: Alice chooses which variant she is previewing from the <!-- cond: cond-2609151823592037 -->
  app's chrome, not from a control inside the rendered page. The page is
  what a reader receives, and it never names a variant. The chrome is a
  list overlay in the editing window — the one chooser contract the insert
  palette, the command palette, and the quit question already share —
  and `C-c C-v` is what opens it when the document declares more than one
  variant; with one variant or none, `C-c C-v` previews as it does today.
- Assumption: the variant set is declared by editing the document's <!-- cond: cond-2609151823598929 -->
  metadata file by hand; a gesture in the app that declares one is a later
  moment, and no criterion here depends on it.
- Boundary with the discipline *variant fidelity* <!-- cond: cond-2609151823592672 -->
  (itd-2609051336107315): 14 owns the mark and the preview — writing the
  attribute, seeing one audience's text, and the badges that say where the
  marks are. The discipline owns the obligation of every renderer, every
  export, every reference list, and every link to honour the marks, and it
  is where a leak between variants is judged.
- Boundary with map #19 (itd-2609051335598083, "Give each audience its own <!-- cond: cond-2609151823594289 -->
  link"): 19 owns the links themselves — a path per variant under one
  stable id, and the guarantee that no page reveals another exists. 14 owns
  nothing published; its output is a filtered tree and a preview of it.
- Boundary with map #9 (itd-2609051335489928), map #5 <!-- cond: cond-2609151823594672 -->
  (itd-2609051335447894), map #21 (itd-2609051336019782), and map #17
  (itd-2609051335570842): each rendering owns its own column of the mapping
  table in 05-internals section 3, and each owns how it displays the text
  it is handed. 14 owns only that the tree they are handed has already been
  filtered.
- Boundary with map #1 (itd-2609051335399446, "Open a folder and see the <!-- cond: cond-2609151823597442 -->
  book"): #1 owns the sidebar and the tree it draws; 14 owns what a variant
  badge beside a chapter means and when it is shown.
- Boundary with map #3 (itd-2609051335415528, "Insert a construct I cannot <!-- cond: cond-2609151823599784 -->
  remember"): #3 owns that choosing an entry puts the canonical form at the
  cursor with the cursor where the content goes; 14 owns what the mark then
  does to the preview.
- In scope, not plumbing: the citation resolution and the contents list <!-- cond: cond-2609151823592744 -->
  the preview and the build hand to the article are computed for the
  variant being rendered, and a removed span is descended for the notes and
  citations inside it. The brief's `variant` module is a description of
  where that should live, not of anything that exists
  (iss-2609151509292287).

## Acceptance Criteria

- Regression, already true: Given a document declaring
  `variants: [full, talk]` and `default_variant: full`, When Alice wraps a
  paragraph in `::: {.variant variant="talk"}` and `:::` and previews the
  `talk` variant, Then the paragraph appears in the preview and the two
  fence lines do not.
- Given the same chapter, When Alice previews `full`, Then the marked
  paragraph is absent and nothing stands in its place: no ellipsis, no
  placeholder, and no spacing artefact.
- Given the rendered article page for any variant, When its markup is
  inspected, Then no element, attribute, or script names or offers another
  variant, and no control to change the variant appears in it.
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
  neighbours with nothing to show that one was removed.
- Given that same Section, When the deck is rendered for `talk`, Then no
  slide is built from it, and the sidebar badges the chapter for `full`.
- Given a block marked `variant="draft"` where `draft` is not among the
  variants the document declares, When Alice previews either declared
  variant, Then the block is absent from both, the chapter is badged in the
  sidebar with the undeclared name the way an unresolved citation key is,
  and the chapter file is unchanged. (Negative case.)
- Given a `::: {.variant variant="talk"}` block containing a footnote
  written `^[an inline note]` and a citation written `[@smith2020]`, When
  Alice previews `full`, Then neither the footnote nor the reference for
  `smith2020` appears anywhere in that preview, its footnote list, or its
  reference list, and the reference numbers that remain run consecutively
  from 1.
- Given the span `[with a cite [@smith2020]^[a note]]{.variant
  variant="talk"}` in a paragraph, When Alice previews `full`, Then neither
  the citation, the note, nor a reference for `smith2020` appears anywhere
  in that preview.
- Regression, already true: Given a block written
  `::: {.variant variant="talk full"}` and a neighbouring paragraph
  carrying no variant attribute at all, When Alice previews either
  variant, Then both appear — several names mean several variants, and no
  mark means every variant.
- Given a chapter containing `talk`-marked blocks or spans and no others,
  When Alice looks at the sidebar, Then that chapter is badged for `talk`
  and is not badged for a variant no mark in it names; a chapter with no
  marks carries no badge; and a mark with an empty name is badged as
  unnamed.
- Given the preview window open on `full`, When Alice chooses `talk` from
  the chooser, Then the same window re-renders as `talk` and no second
  window opens; and Given a document declaring one variant or none, When
  she asks for the chooser, Then it says there is nothing to choose
  between rather than opening.
- Given a document declaring no variants and a chapter with a marked block,
  When Alice previews it, Then the preview shows exactly what a publish of
  that document would build for it, so the two never disagree on that
  shape.
- Given a chapter whose easter-egg marker sits in a `talk`-marked block
  and whose egg content sits in a `full`-marked block, When Alice previews
  either variant, Then the egg analysis has run on the filtered chapter:
  no variant's preview shows an egg whose block the other variant owns,
  and the mismatch is reported the way an unresolved egg is today.
- Inherits: variant fidelity (`itd-2609051336107315`), which owns every
  renderer's, export's, and link's obligation to honour the marks this
  moment writes; one source, always (`itd-2609051336090390`); degrade
  gracefully in a plain tool (`itd-2609051336110536`); the renderings
  agree (`itd-2609051336130664`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px.

## Open Questions

- Answered 2026-09-15 by the maintainer, in the planning interview: `C-c
  C-v` becomes the chooser when the document declares more than one
  variant and previews as today otherwise, so no second chord is added;
  and the easter-egg hazard is brought in rather than left to the
  discipline — the egg analysis runs on the filtered chapter, and the
  criterion above carries it.
- Still open, and not this moment's: the gesture that declares the variant
  set from inside the app. This moment assumes the metadata file is edited
  by hand.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._

## Grounds

- pursued: we expect the acceptance project's three copies to collapse into one marked text whose previews Bob and Carol would each accept as whole; wrong if any variant's preview still leaks a reference, a contents entry, or a note from a removed passage
