---
id: itd-2609051336055362
slug: rehearse-from-cards-built-out-of-the-headings
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

# Rehearse from cards built out of the headings

## Press Release

Alice has to know her own chapter by Thursday. She opens it, asks for a
rehearsal deck, and chooses the heading level to build from. Editor
makes one card per heading at that level: the heading is the front, the
text beneath it is the back. She types nothing, and the chapter's
Markdown does not change by a single byte — the cards sit in the
sidecar beside it, alongside her highlights and her notes.

She runs the deck in flip mode: a card, a pause while she answers it in
her head, a tap, the text she wrote. When she wants a harder session she
runs it in scored mode and marks each card right or wrong as she goes;
at the end of the deck she gets a score for the sitting. It is a score
for that sitting only. Close the deck and it is gone; the next run
starts clean.

Carol, who is being taught from the same document, runs the deck on her
phone on the bus. The cards fill the screen, a swipe moves her on, and
nothing is stored about how she did. Later Alice rewrites two headings
and the paragraphs beneath them. She opens the deck again: the cards
have followed the headings, the rewritten backs show the new text, and
the card whose heading she deleted is listed as orphaned with the
heading path it was made against, rather than quietly disappearing.

## Why This Matters

Learning material you wrote yourself means making a second copy of it:
cards typed out by hand into another application, which stop matching
the document the first time you edit it, and which nobody else can run
without you sending them the cards as well. Alice wants the deck to be
the document — generated from the headings she already wrote, kept
beside the chapter, updated when the chapter is, and runnable by anyone
holding the document without a second tool or an account.

## Mechanism

- We expect headings alone to yield a usable deck, with no card written
  by hand, because the acceptance project's reading app already derives
  flip-card decks from headings, and that document carries 177 headings
  at four levels with two thirds of them at the fourth — the level at
  which a heading names one idea and the text beneath it is the answer
  (`03-evidence.md`, the acceptance project).
- We expect building a deck to cost the text nothing, because a card is
  a `card` annotation in the chapter's sidecar keyed by its heading
  path (`05-internals.md` section 7). Building, editing, and deleting a
  deck writes only JSON beside the chapter, so the Markdown is
  byte-identical before and after and Emacs or any other tool is free to
  hold the file open throughout.
- We expect cards to survive editing better than highlights do, because
  they resolve through the same anchor ladder but are anchored at its
  fourth rung — the heading path alone — which is what a card is about
  in the first place. Rewriting a paragraph therefore changes a card's
  back rather than orphaning the card.
- We expect a phone to be enough for a run, because every rendering is
  held to the three device classes, and the reading views share the
  editor's navigation vocabulary — next, previous, and one cancel chord
  that closes whatever is open — so a deck needs no controls of its own
  invention (`03-evidence.md`, the keyboard-navigation prototype).
- We expect a score to need no storage anywhere, because it is a count
  held for the sitting: the site keeps nothing about a reader, and a
  reader's own state leaves their browser only as a file they export
  (`adr-2609051324177479`).

## Scope Conditions

- Platform: the deck is built in the desktop app from one chapter, and
  runs wherever the article's script runs — the app and the published
  page — at desktop, iPad, and iPhone widths.
- Population: Alice builds and runs a deck from her own document; Carol
  runs a deck that reaches her with a document she has been given. Bob
  is not involved in this moment.
- Assumption: cards come from the headings of one chapter and are stored
  in that chapter's sidecar. A deck spanning a Part or a whole document
  is not in this intent.
- Assumption: the two modes are flip and scored, and no more. There is
  no spaced repetition, no schedule, and no history across sittings,
  because none can exist where nothing about a reader is kept.
- Boundary with map #22, itd-2609051336025064: 22 owns the sidecar file,
  the anchor model, and how an anchor behaves when the chapter is
  edited. 25 owns generating cards from headings and running them in two
  modes; its cards are `card` entries in 22's schema and add no new
  anchor behaviour.
- Boundary with map #5, itd-2609051335447894: 5 turns headings into
  slides for an audience by the default mapping; 25 turns headings into
  cards to test one person's recall. The artefacts are different and
  neither consumes the other's output: a deck is not built from the
  slide mapping, and no slide-only construct appears on a card.
- Boundary with map #24, itd-2609051336040242: getting a deck to a
  reader means publishing a sidecar as a layer, which 24 owns. 25 owns
  what a deck is and how it runs once it is in front of someone.
- Excluded plumbing: card generation from the heading tree, and session
  scoring, both of which live in `05-internals.md` section 7.

## Acceptance Criteria

- Given a chapter with 4 Sections, 12 Sub-sections, and 30
  Sub-sub-sections, when Alice builds a deck at the Sub-sub-section
  level, then the chapter's sidecar gains 30 entries with
  `"kind": "card"`, each carrying the heading `path` it was made from,
  and the chapter's Markdown file is byte-identical to before.
- Given a heading with no text between it and the next heading, when the
  deck is built, then that heading yields a card marked as having no
  back, and it does not take the following heading's text as its answer.
- Given a Section containing `::: {.notes}` speaker notes and a
  `::: {.columns}` block, when the deck is built, then neither the notes
  nor the column markup appears on any card back.
- Given Carol running the deck in flip mode at an iPhone width of 390
  CSS pixels, when she taps a card, then it turns to show the back, next
  and previous move both by swipe and by the reading views' navigation
  chords, and nothing scrolls sideways or needs pinch zoom.
- Given Carol running the deck in scored mode, when she has marked ten
  cards right or wrong and reaches the end, then the sitting's score is
  shown; and when she reloads the page, the deck starts unscored and
  nothing about the previous sitting is held anywhere but her own
  browser.
- Given a deck already built, when Alice rewrites the text under one
  heading and deletes another heading entirely, then reopening the deck
  shows the new text on the first heading's card and lists the second
  heading's card as orphaned with its heading `path`, rather than
  dropping it.
- Given a chapter carrying a deck as well as highlights and notes, when
  Alice deletes the deck, then every `card` entry is gone from the
  sidecar and every `highlight`, `note`, and `reviewed` entry is
  unchanged.
- Inherits: nothing is stored about a reader; round-trip byte-fidelity;
  one source, always; legible on three device classes; network only on
  publish.

## Open Questions

- How much editing an anchor tolerates before an annotation is reported
  as orphaned rather than re-attached is open (`03-evidence.md`,
  "Annotations"). For a deck it decides the common case: whether a card
  whose heading has merely been reworded follows the heading or is
  listed as orphaned.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
