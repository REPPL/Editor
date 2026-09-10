---
id: itd-2609051402235443
slug: orphan-never-guess-an-annotation-whose-anchor-no-longer-reso
spec_id: null
kind: discipline
suggested_kind: discipline
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Orphan, never guess

## Rule

An annotation resolves to the words it was made against or it resolves to
nothing. When the resolution ladder reaches its end without finding those
words, the annotation is reported as orphaned — kept, quoted, and shown
with the heading it was made under — and it is never re-attached to
different words, never approximated onto nearby text, and never silently
discarded. The same rule holds wherever an annotation is resolved: in the
app against Alice's own chapter, in a reader's browser against a published
page, and when Alice loads a file someone else exported.

## Forbids

- A highlight, note, reviewed mark, or card drawn over text it was not
  made against, by nearest match, by fuzzy similarity, by block index
  alone, or by any fallback that lands somewhere rather than nowhere.
- Dropping an annotation whose anchor no longer resolves, or removing it
  from the file it lives in, without the person who owns that file asking
  for it.
- Reporting an annotation as attached when it resolved only to a heading:
  the rung it resolved at is visible, so a mark that found its Section but
  not its sentence is not shown as if it found the sentence.
- Presenting an orphan without the evidence a person needs to judge it —
  the quoted words, and the heading path it was made under.
- Re-anchoring an orphan without the owner of the annotation choosing
  where it goes.
- An orphan that is invisible: an annotation that cannot be listed,
  counted, or reached from the surface it belongs to.
- Changing the chapter's text to make an anchor resolve. The text is never
  the thing that moves.

## Binds From

Phase 7, with sidecar annotations, and it governs every surface that
resolves an anchor from that point on: map #22 (`itd-2609051336025064`)
in the app, map #23 (`itd-2609051336037640`) in a reader's browser, map
#24 (`itd-2609051336040242`) when a received file is loaded and when a
published layer is rendered over a version its author never read, and map
#25 (`itd-2609051336055362`) for cards whose headings have been reworded
or removed.

## How A Spec Proves It

- Given an annotation whose quoted excerpt appears nowhere in the chapter,
  When the chapter is loaded, Then the annotation is listed as orphaned
  with its quote and its heading path, it remains in its file, and no mark
  is drawn anywhere in the text.
- Given a chapter in which the annotated sentence has been rewritten and a
  similar sentence exists two paragraphs later, When the annotation is
  resolved, Then it is orphaned rather than attached to the similar
  sentence. (Negative case: a mark that lands on the similar sentence
  fails this discipline outright.)
- Given an annotation whose excerpt is gone but whose heading path still
  exists, When it resolves at the heading, Then it is shown as attached to
  that heading and not to any passage within it, and the surface says
  which of the two it is.
- Given a published layer rendered over a version whose text has moved on,
  When a reader opens it, Then each of its annotations either covers its
  own quoted words or is reported as orphaned, and no highlight in the
  layer covers words the layer's author never saw.
- Given a card whose heading has been deleted, When the deck is reopened,
  Then the card is listed as orphaned with its heading path rather than
  taking the next heading as its front.
- Given a chapter with three orphaned annotations, When its file is read
  afterwards, Then all three are still in it, byte for byte as they were,
  and the chapter's own text is unchanged.

## Why

`05-internals.md` section 7 already ends its resolution ladder in the only
honest place — "otherwise the annotation is listed as orphaned, never
silently dropped" — and four intents restate that sentence in their own
words because none of them owns it. That is the signature of a rule with
no moment of its own: it belongs to every surface that resolves an anchor
and to none of them in particular.

The failure it forbids is the specific one an anchor model makes easy.
`03-evidence.md` leaves open "the anchor format and how much editing it
tolerates before an annotation is reported as orphaned rather than
re-attached", and every widening of that tolerance is a step towards
guessing. A guess is worse than an orphan in both directions: Alice reads
a note she wrote about one sentence as though she wrote it about another,
and Bob's objection, published as a layer, appears against a paragraph he
never objected to. The acceptance project shows why the pressure to guess
is real — its annotations were written into the text itself, where they
could not come unstuck — and `03-evidence.md` records the cost of moving
them out as "an anchor model that must survive edits". Surviving is not
the same as always finding something, and this rule fixes which of the two
the model is held to.

The remedy is cheap, which is the other half of the argument. An orphan
carries its quoted words and its heading path, so a person can see what
was meant and put it back; a wrong attachment carries nothing, reads as
correct, and is discovered — if ever — long after the reason for it has
gone.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
