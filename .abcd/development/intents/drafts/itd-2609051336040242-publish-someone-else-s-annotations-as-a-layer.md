---
id: itd-2609051336040242
slug: publish-someone-else-s-annotations-as-a-layer
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317516762]
---

# Publish someone else's annotations as a layer

## Press Release

Bob has read Alice's published chapter and marked it up as he went:
three passages highlighted, two notes written against them, one section
marked reviewed. He exports his annotations from the page as a file and
sends it to her. Alice opens the document in Editor, loads Bob's file,
and his marks appear against her text, each one attached to the passage
it was made about and attributed to his file rather than mixed into her
own. Where she has rewritten a paragraph since he read it, his note
still finds the sentence he quoted. Where the sentence has gone, Editor
lists his annotation as orphaned and shows her the words he quoted, so
she can see what he meant instead of losing it.

Alice reads his file beside her own, deletes one remark that was meant
for her alone, and marks the rest to publish. She presses Publish. The
version that goes up carries Bob's annotations as a layer beside the
document, and the page offers readers a control for it. Carol opens the
link, turns the layer on, and reads the chapter with Bob's highlights
and notes in place; she turns it off and the page is the page again.

Alice's own marks are not there. They stay in the sidecar beside the
chapter on her machine, and the only way one of them reaches the site is
if she publishes her own file as a layer too, deliberately, in the same
gesture. Nothing about Carol travels either: her choice to show the
layer lives in her browser, and the site records nothing about her
having been there.

## Why This Matters

Comments on a document arrive today as a second copy of it — a marked-up
file, a thread of quoted paragraphs, a set of page references that stop
matching the moment the author edits. Merging them back is manual, and
showing them to anyone else means sending that second copy on. Alice
wants Bob's reading of her chapter to attach to her chapter, to survive
her editing it, and to be something she can show to every later reader
with one decision — without her private working notes going up with it.

## Mechanism

- We expect a file Bob exported months ago to attach to Alice's current
  text without her merging anything, because each annotation carries a
  heading path, a quoted excerpt with its prefix and suffix, and byte
  offsets, and resolution runs a ladder that stops at the first success
  and ends by listing the annotation as orphaned rather than dropping it
  (`05-internals.md` section 7). The acceptance project's own reading
  app already serialises reader marks back into Markdown, so
  re-attaching marks after edits is prior art rather than a novelty
  (`03-evidence.md`, the acceptance project).
- We expect publishing to be safe by construction rather than by care,
  because a layer is a whole file chosen for publication and carried
  beside the version as it stands. A file Alice has not chosen is never
  an input to the build, so there is no filter to get wrong and no flag
  on an individual mark to forget. Falsifiable: publish with one file
  chosen and search everything the publish wrote for anything from the
  files that were not.
- We expect readers to accept a toggle where they would not accept a
  merge, because a published layer is the same JSON the reader exported,
  rendered over the article by the article's script, so the text
  underneath is unchanged whether the layer is on or off
  (`adr-2609051324177479`).
- We expect a layer to age correctly, because it is written beneath one
  version hash and old version paths are never rewritten
  (`05-internals.md` section 9). A layer published in June therefore
  does not appear on the version Bob read in March.
- We expect the site to need no storage for any of this, because the
  layer is a static file and the reader's decision to show it is a
  preference in their own browser, exactly as the prototype article's
  reader controls are (`03-evidence.md`, the article prototype).

## Scope Conditions

- Platform: review and publication happen in the desktop app; the
  published layer renders in the online article on the presenter site at
  desktop, iPad, and iPhone widths — 1280, 820, and 390 CSS px. Slides
  and the PDF carry no layer.
- Population: Alice reviews and publishes; Bob supplies a file he
  exported from the published page; Carol reads with the layer on or
  off. No account exists for any of them.
- Assumption: the file Alice loads is an annotation sidecar in the shape
  `05-internals.md` section 7 gives, holding marks of the four kinds. A
  file that is not is refused with a reason and nothing is loaded from
  it. The shape itself is plumbing; this moment asserts only that a file
  a reader exported loads with no conversion step.
- Assumption: a loaded file is kept beside the document under a label
  that says whose reading it is, so Alice can hold several and tell them
  apart before she publishes any.
- Assumption: a layer is published against one document version and one
  chapter's worth of annotations at a time; a reader may show more than
  one published layer at once. Alice's own marks are a layer like any
  other if she chooses to publish them, and are not published otherwise.
- Boundary with map #23, itd-2609051336037640: 23 owns Bob's marking of
  the published page in his browser and his export, and ends when he has
  a file. 24 begins when Alice opens that file. Nothing in 24 sends
  anything from Bob's browser to Alice; the file changes hands by her
  and Bob's own means.
- Boundary with map #7, itd-2609051335468596: 7 owns the publish action
  itself — the stable id, the version hash, the push, the link, and the
  empty presenter. 24 owns only the layer that action carries into the
  version and the control readers get for it. A publish with no layer
  selected behaves exactly as 7 specifies.
- Boundary with map #22, itd-2609051336025064: 22 owns the sidecar
  format, the anchor model, and its behaviour under editing. 24 consumes
  that model unchanged and adds no anchor behaviour of its own; what 24
  adds is review of a file that is not Alice's, and its publication.
- Out of scope: which link a layer hangs from when a document has
  several variants — map #19, itd-2609051335598083 owns per-variant
  paths; and any gate over who may read the layer — map #20,
  itd-2609051336005698 owns access policies. Where layer files sit
  beneath a published version, and where a received file waits on disk
  before it is published, are plumbing and live in `05-internals.md`
  sections 7 and 9; every criterion below is written against what Alice
  and Carol observe — which marks appear, under what label, and what a
  published version does and does not carry — rather than against a path
  or a field.
- Out of scope, and taken away by map #28, itd-2609051402150739: a layer
  goes off the site when its document does, together with the version it
  hangs from.

## Acceptance Criteria

- Given a chapter with Alice's own marks beside it, and a file Bob
  exported carrying three marks against that chapter, when Alice loads
  Bob's file, then all three appear against their passages under a label
  naming where they came from, her own marks stay visibly hers, the
  loaded file is kept beside the document rather than merged into her
  sidecar, and her sidecar is byte-identical on disk afterwards.
- Given one of Bob's marks whose quoted words no longer appear anywhere
  in the chapter, when Alice loads his file, then that mark is listed as
  orphaned, showing the words he quoted and the heading he made it under,
  and it is neither discarded nor attached to another passage. (Negative
  case.)
- Given Alice has selected Bob's file to publish and has left her own
  marks unselected, when she publishes and Carol turns the layer on, then
  Bob's three marks appear and not one of Alice's does; and when every
  file the publish wrote for that version is searched, then nothing from
  her own marks is anywhere in it — not the text of a note, not the words
  a highlight covers, and not a mark's identity. (Negative case.)
- Given Alice selects her own marks to publish as a layer as well, when
  she publishes, then both layers are offered on the page as separate
  layers, each under its own label, and a reader can show either, both,
  or neither.
- Given a published version carrying Bob's layer, when Carol opens the
  stable link, then the article offers a control to show and hide that
  layer, off until she chooses it, and turning it on shows his highlights
  in the colours he chose and his notes against the passages his marks
  resolve to.
- Given Carol reading at iPhone width (390 CSS px), when she turns the
  layer on, then the highlights and the notes are legible with no
  horizontal scrolling and no pinch zoom, the notes folding into the flow
  the way margin content does at that width; and at iPad width (820 CSS
  px) and desktop width (1280 CSS px) they sit in the margin beside the
  passages they belong to.
- Given Carol has turned the layer on and reloads the page, when it
  loads again, then her choice is restored from her own browser, and the
  files served for that version are byte-identical to those the publish
  wrote — the site has recorded nothing about her.
- Given Alice deletes one of Bob's annotations and publishes again, when
  she opens the earlier version link, then that version's layer still
  carries the deleted annotation and the new version's layer does not.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`);
  network only on publish (`itd-2609051336158553`); round-trip
  byte-fidelity (`itd-2609051336074533`); no machine in the document
  (`itd-2609051336080960`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; variant
  fidelity (`itd-2609051336107315`), since a layer hangs from one
  variant's version and may not carry a mark made against another; and
  orphan, never guess (`itd-2609051402235443`) — a mark from a file sent
  months ago either finds its own words or is reported, and never lands
  on a passage its author never read.

## Open Questions

- How much editing an anchor tolerates before an annotation is reported
  as orphaned rather than re-attached is open (`03-evidence.md`,
  "Annotations"). It decides how much of a file sent months after the
  reading attaches at all, and therefore how often Alice reviews
  orphans rather than marks.
- Whether the presenter, the article script, and the slide engine are
  maintained once in the production repository and shared by every
  document, or versioned with each published document, is open
  (`03-evidence.md`, "Publish and pipeline"). It decides whether a layer
  published today can be shown on a version published before the layer
  control existed.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
