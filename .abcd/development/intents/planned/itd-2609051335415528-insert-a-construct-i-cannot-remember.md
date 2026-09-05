---
id: itd-2609051335415528
slug: insert-a-construct-i-cannot-remember
spec_id: spc-2609051353398011
kind: standalone
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: editing-surface
supersedes: [itd-2609051221553568, itd-2609051317429272]
---

# Insert a construct I cannot remember

## Press Release

Alice wants the next slide to hold two columns. She does not remember how
a columns div is written, and she does not have to. She presses one chord,
the insert palette opens, she types "col", and Return puts the exact form
at her cursor — the outer div, both column divs with their widths, the
closing fences — with the cursor sitting inside the first column, where
the words go. She types. The palette has closed and taken nothing with it.

The palette lists the constructs the canon defines: divider, columns,
speaker notes, callout, margin aside, credit, variant block, variant
span, video block, citation, footnote, page break, easter egg, and
opening quotation. Each writes the canonical
form and nothing else. It is the only place the syntax has to live in
anyone's memory, which is why Alice can write in a deliberately verbose,
plain-Markdown canon without ever having learned it — and why what lands
in her chapter is something Emacs and any other Markdown tool read
happily.

The palette is an overlay like every other overlay in Editor: it takes the
keyboard while it is open, moves with the same chords as the text, and
closes on the same cancel chord. Alice never reaches for the mouse and
never leaves the chapter. When a construct's rendering arrives in a later
phase, the palette gains an entry — Alice does not gain a thing to
remember.

## Why This Matters

The canon is verbose on purpose. Every extension is a fenced div with
attributes, a heading or image attribute, or an HTML comment, precisely so
that Emacs, Pandoc, and any plain renderer can read the file and degrade
gracefully — and `03-evidence.md` records the cost of that choice in the
same breath: "more verbose source; the author needs the insert palette to
remember it". Without the palette the canon is a private dialect Alice
mistypes, or worse, invents around, and the prototypes show her doing
exactly that when the syntax is not to hand. The palette is what makes the
plain-tool guarantee affordable to the person paying for it.

## Mechanism

- We expect the palette to remove the memory burden rather than move it
  because it writes the forms `05-internals.md` section 3 spells out
  character for character, so what Alice must recall is a construct's
  name, which she has, rather than its punctuation, which she has not.
- We expect a palette entry to be testable without a screenshot because
  the inserted text parses to the node the mapping table in
  `05-internals.md` section 3 describes, with its attributes exactly as
  written, and serialises back byte for byte. An entry that produces
  something the core does not recognise fails a unit test, not a review.
- We expect a small, fixed set to be enough because the slide prototype's
  fifty hand-written slides reached for precisely this set: rules between
  slides, a column split, comments carrying layout and credit, and
  speaker notes (`03-evidence.md`). The palette names them rather than
  inventing new ones.
- We expect the palette to be usable without the mouse because overlays
  in the keyboard-navigation prototype own the keyboard while open and
  navigate with the same chords as the main view, cancelling on the same
  chord (`03-evidence.md`;
  `2026-09-05-prototype-keyboard-navigation.md`).
- We expect this to prevent dialect drift because the palette is the only
  writer of these forms in the app, so there is one implementation of each
  construct's spelling and a change to the canon is a change in one place
  (ADR `adr-2609051324147479`, which rejects a private dialect "in favour
  of an insert palette that makes the canonical forms one key away").

## Scope Conditions

- Platform: the desktop app only — a Tauri 2 shell around the macOS <!-- cond: cond-2609051353399760 -->
  system web view (`02-constraints.md`). The palette is frontend, so the
  code is shared, but no other host is claimed here.
- Population: Alice, one author, editing one chapter. The palette acts at <!-- cond: cond-2609051353399534 -->
  the cursor in the chapter she has open.
- Phase: seeded with the slide constructs, because phase 1 is the deck <!-- cond: cond-2609051353392265 -->
  (`06-delivery.md`; `07-intent-map.md`) — the horizontal rule split, the
  divider heading attribute, columns, speaker notes, and credit. An entry
  is added when its construct's rendering arrives; that addition is an
  entry, not a new intent. The full list the palette carries once every
  phase has landed is divider, columns, speaker notes, callout, margin
  aside, credit, variant block, variant span, video block, citation,
  footnote, page break, easter egg, and opening quotation.
- Boundary with the intents that define constructs — map #6, <!-- cond: cond-2609051353398378 -->
  `itd-2609051335458626`; map #9, `itd-2609051335489928`, which owns the
  callout and the margin aside; map #11, `itd-2609051335502171`; map #12,
  `itd-2609051335518134`; map #14, `itd-2609051335537470`; map #16,
  `itd-2609051335568936`; and map #21, `itd-2609051336019782`: each of
  those owns what its construct means in a rendering. 3 owns only that
  the canonical form appears at the cursor, correct and complete. What a
  `.notes` div does to a deck, what a callout or a margin aside looks
  like on the page, what `[@key]` resolves against, what a variant block
  hides — all out of scope here.
- Bundle: member of the Editing surface bundle with map #1, <!-- cond: cond-2609051353396605 -->
  `itd-2609051335399446`, and map #2, `itd-2609051335406422`. One spec —
  a canon nobody can type is a canon nobody uses.
- Plumbing inherited, not owned: the canon itself, which is <!-- cond: cond-2609051353396144 -->
  `05-internals.md` section 3, and the parse and serialise path that
  proves an inserted form round-trips.

## Acceptance Criteria

- Given the cursor is on a blank line in a chapter, When Alice opens the
  palette and chooses Columns, Then the text inserted is exactly the
  columns form of `05-internals.md` section 3 — outer `::: {.columns}`,
  two `::: {.column width="50%"}` blocks, and their closing fences — and
  the cursor sits inside the first column's body.
- Given the cursor is anywhere in a chapter, When Alice chooses Speaker
  notes, Then a `::: {.notes}` block with its closing fence is inserted
  with the cursor on its body line, and no other line of the chapter has
  changed.
- Given the cursor is on the line `## Interlude`, When Alice chooses
  Divider, Then the heading reads `## Interlude {.divider}` and no new
  block is inserted above or below it.
- Given a chapter into which every construct the palette lists has been
  inserted once, When the chapter is parsed and serialised without
  editing, Then the file returns byte for byte, and each construct parses
  to the node the mapping table in `05-internals.md` section 3 names,
  with its attributes exactly as written.
- Given the palette is open with "col" typed into it, When Alice presses
  the cancel chord, Then the palette closes, nothing is inserted, and the
  chapter is byte for byte what it was — and the same holds for Escape.
- Given a chapter holding one of every palette construct, When it is
  rendered by a plain Markdown tool that knows none of these extensions,
  Then the tool renders every paragraph and reaches the end of the file:
  no construct stops it and none swallows the text that follows it.
- Given the palette lists an entry, When that entry's inserted form is
  compared against `05-internals.md` section 3, Then it matches a form
  written there; the palette offers no construct outside the canon.
- Given the desktop app window narrowed to iPad width (820 CSS px), and
  again at iPhone width (390 CSS px) and desktop width (1280 CSS px),
  When Alice opens the palette and filters it by typing, Then the list
  and its labels are fully legible at every one of the three widths with
  no horizontal scrolling and no pinch zoom, and Return still inserts at
  the cursor.
- Inherits: round-trip byte-fidelity (`itd-2609051336074533`); no machine
  in the document (`itd-2609051336080960`); one source, always
  (`itd-2609051336090390`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); legible on three device classes
  (`itd-2609051336128348`); network only on publish
  (`itd-2609051336158553`).

## Open Questions

- Whether the video block the palette inserts can name a poster when
  Alice supplies none: `03-evidence.md` leaves open "which poster frame a
  video block uses when the author supplies none", which decides whether
  the palette's video entry writes a `poster` attribute at all.
- Whether the easter-egg entry may write a variant-marked block:
  `03-evidence.md` leaves open "whether easter-egg content can itself be
  a variant-marked block", which decides whether one palette choice can
  produce a nested pair of divs.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._

## Grounds

- pursued: an insert palette removes the need to remember fenced-div syntax; wrong if authors still hand-type constructs incorrectly or the palette's forms drift from the canon
