---
id: itd-2609051335447894
slug: present-a-chapter-with-no-slide-markup
spec_id: null
kind: null
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
  headings at four levels with two thirds of them at the fourth. If a
  chapter of that shape yields a main line nobody can follow, the default
  is wrong and the fourth level must fold into speaker notes rather than
  nest deeper.
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

- **Bundle.** This intent is a member of the bundle *The deck*, whose
  other member is map #6 (`itd-2609051335458626`), "Shape the deck in the
  same text". One spec covers both: this intent is what the deck does when
  Alice says nothing, #6 is what it does when she says something. Neither
  ships alone, because a default mapping with no way to shape it is not a
  talk, and constructs with no default to shape are markup for its own
  sake.
- **Platform.** The desktop app on macOS — Tauri 2 with the system web
  view — and the deck as built for the presenter site. The deck inside the
  single HTML file is out: map #17 (`itd-2609051335570842`), "Carry the
  document as one file that reads anywhere", owns that host, in phase 5.
- **Population.** Alice presenting her own chapter, and Bob and Carol as
  audience on a projector, an iPad and an iPhone. One author on one
  machine; collaboration and concurrent editing are out of scope for the
  product entirely (`06-delivery.md`).
- **Phase.** Phase 1, the first usable slice. The chapter is presented in
  the default variant, with copied assets only. Variants, citations, the
  article, the PDF, the single file, referenced assets and annotations are
  all excluded from this phase by `06-delivery.md`, so no criterion here
  depends on them.
- **Assumption.** The chapter is already open in Editor and its hierarchy
  already read from the folder. Map #1 (`itd-2609051335399446`), "Open a
  folder and see the book", owns opening the folder and building the tree;
  this intent begins at the moment Alice presses Present.
- **Boundary with map #9 (`itd-2609051335489928`), "Read the document as a
  Tufte article".** In: what the Slides column of the mapping table in
  `05-internals.md` section 3 says for headings, images and rules. Out:
  what the Article column says for the same constructs — #9 owns that
  column. The table is the single home for both, and neither intent
  restates the other's row.
- **Boundary with map #4 (`itd-2609051335420536`), "Drop an image and have
  it just work".** In: an image reference already in the chapter becoming
  a slide of its own, in source order, with its caption and credit. Out:
  the drop gesture, the copy into the chapter's assets folder, and
  de-duplication of copied files — #4 owns those and stops at the
  reference in the text.
- **Boundary with map #25 (`itd-2609051336055362`), "Rehearse from cards
  built out of the headings".** Both turn headings into something else. In:
  slides shown to an audience. Out: cards used to test recall, which live
  in an annotation sidecar and not in a deck — #25 owns those, in phase 7.
- **Boundary with map #7 (`itd-2609051335468596`), "Publish and get a link
  I can open from the lectern".** In: the deck as built, wherever it runs.
  Out: the publish action, the stable id, the version hash and the link —
  #7 owns those. The deck at the link must be this deck, but the link is
  not this intent's to mint.
- **Boundary with map #11 (`itd-2609051335502171`), "Cite from a
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
- **Given** a Section containing two images written
  `![The lantern at dusk](assets/lantern.jpg "Photograph by Carol")` and
  `![The second winter](assets/winter.jpg "Photograph by Carol")`, **when**
  the deck is built, **then** each image is a full-bleed slide of its own
  at the position its reference occupies in the text, in source order,
  with the alt text shown as the caption and the title attribute shown as
  the credit.
- **Given** a chapter that contains no slide-only construct at all,
  **when** Alice presses Present, moves through every slide, and closes the
  deck, **then** the chapter file on disk is byte for byte what it was
  before, no slide-only construct has been written into it, and no deck
  file has been created anywhere in the document folder.
- **Given** the deck open at iPhone width (390 points) and again at iPad
  width (820 points), **when** Bob moves through every slide of a chapter
  that includes a headline slide, a Sub-section slide and an image slide,
  **then** no slide scrolls horizontally or needs pinch zoom at either
  width, and each slide's headline, caption and image are wholly visible.
- **Given** a Section whose only content is one paragraph, with no image
  and no Sub-section, **when** the deck is built, **then** it yields
  exactly one slide, with no empty vertical slide beneath it and no blank
  slide after it.
- **Given** Alice renames a Section, adds a paragraph, and presses Present
  a second time in the same session, **when** she moves through the deck,
  **then** the deck shows the new headline and the new speaker notes, and
  the document folder holds no second copy of the deck or of its text from
  the first build.
- Inherits: *One source, always*; *Round-trip byte-fidelity*; *Legible on
  three device classes*; *Degrade gracefully in a plain tool*; *No machine
  in the document*; *Network only on publish*.

## Open Questions

- Whether Sub-sub-sections become further vertical slides or fold into
  their Sub-section's speaker notes (`03-evidence.md`, open questions,
  "Article and slides"). The acceptance project puts two thirds of its
  headings at that level, so the answer decides whether the default
  mapping is usable on a real chapter.
- The slide theme: one built-in theme, or the prototype's theme ported
  (`03-evidence.md`, open questions, "Article and slides"). The default
  mapping produces slides with no authored styling, so whatever theme
  ships is what an unshaped deck looks like.
- Which navigation chords the reading views share with the editor
  (`03-evidence.md`, open questions, "Editor"). The deck is a reading view
  that Alice drives from the lectern, so its movement chords come from
  that answer.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
