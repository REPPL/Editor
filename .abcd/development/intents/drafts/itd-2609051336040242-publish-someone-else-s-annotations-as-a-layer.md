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
  because a layer is a whole file chosen for publication and copied to
  the version's `layers/` folder. Alice's own sidecar is never an input
  to the build, so there is no filter to get wrong and no flag on an
  individual mark to forget.
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
  desktop, iPad, and iPhone widths. Slides and the PDF carry no layer.
- Population: Alice reviews and publishes; Bob supplies a file he
  exported from the published page; Carol reads with the layer on or
  off. No account exists for any of them.
- Assumption: the file Alice loads is an annotation sidecar in the shape
  of `05-internals.md` section 7, carrying `schema_version`, the
  `chapter` it belongs to, and `annotations` of kind `highlight`,
  `note`, `reviewed`, or `card`. A file that is not is refused with a
  reason and nothing is loaded from it.
- Assumption: a layer is published against one document version and one
  chapter's worth of annotations at a time; a reader may show more than
  one published layer at once.
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
  itd-2609051336005698 owns access policies. Layer files beside the
  version are plumbing and live in `05-internals.md` section 9.

## Acceptance Criteria

- Given a chapter `01-opening.md` with Alice's own
  `01-opening.annotations.json` beside it, and a file Bob exported
  carrying three annotations against that chapter, when Alice loads
  Bob's file, then all three appear against their passages and are shown
  as coming from his file rather than hers, and her own sidecar is
  byte-identical on disk afterwards.
- Given one of Bob's annotations whose `quote` no longer appears
  anywhere in the chapter, when Alice loads his file, then that
  annotation is listed as orphaned with its `quote`, `prefix`, and
  `suffix` shown, and it is neither discarded nor attached to another
  passage.
- Given Alice has selected Bob's file to publish and has left her own
  sidecar unselected, when she publishes, then his file appears under
  `/<id>/v/<hash>/layers/` in the built output, and searching every file
  under that version for the `id` of any annotation in her own sidecar
  returns nothing.
- Given a published version carrying Bob's layer, when Carol opens the
  stable link, then the article offers a control to show and hide that
  layer, off until she chooses it, and turning it on renders his
  `highlight` entries in their recorded `colour` and his `note` text
  against the passages their anchors resolve to.
- Given Carol reading at an iPhone width of 390 CSS pixels, when she
  turns the layer on, then the highlights and the notes are legible with
  no horizontal scrolling and no pinch zoom, the notes folding into the
  flow the way margin content does at that width.
- Given Carol has turned the layer on and reloads the page, when it
  loads again, then her choice is restored from her own browser, and the
  files served for that version are byte-identical to those the publish
  wrote — the site has recorded nothing about her.
- Given Alice deletes one of Bob's annotations and publishes again, when
  she opens the earlier version link, then that version's layer still
  carries the deleted annotation and the new version's layer does not.
- Inherits: nothing is stored about a reader; network only on publish;
  round-trip byte-fidelity; no machine in the document; legible on three
  device classes.

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
