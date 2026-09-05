---
id: itd-2609051934109483
slug: the-binding-table-lacks-the-prose-vocabulary-a-writer-reache
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609051934091500
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Edit prose with the Emacs commands my hands already know

## Press Release

Alice writes a paragraph, changes her mind halfway through, and the line
runs long. She presses `M-q` and the paragraph reflows to her fill column;
the paragraph above it and the table below it are exactly the bytes they
were a moment ago. She sees that two words came out in the wrong order,
puts the cursor between them and presses `M-t`. She moves back a sentence
with `M-a`, forward a paragraph with `M-}`, capitalises a name with `M-c`,
and repairs the two spaces a kill left behind with `M-SPC`. None of this
is learning: it is the vocabulary her hands have used for twenty years,
answering in Editor the way it answers everywhere else.

When she wants a word she has already written, she types its first four
letters and presses `M-/`; Editor completes it from the document's own
words, and pressing again cycles to the next candidate. When she cannot
remember which chord does a thing, she presses `M-x` and types a few
letters of its name: a palette lists every command the binding table
carries, filtered as she types, and running the one she chooses. The
insert palette she already knows is still on `C-c i`, and its constructs
are listed under `M-x` too, so there is one place to reach anything. When
she presses a chord and something unexpected happens, `C-h k` and that
chord again name it in the modeline.

At the end of the sitting she presses `C-x C-c`. The chapter has unsaved
changes, so Editor asks before it quits, exactly as closing a chapter
does. She answers, and the window goes.

Nothing about the document changes. The Markdown is what it was, the file
Bob will read is the file Alice wrote, and the seventeen new commands are
seventeen more rows in the same table the keys panel already shows.

## Why This Matters

An editor that claims Emacs bindings and then stops short of the commands
a writer of prose uses hourly is not a familiar surface but an
approximation of one, and an approximation is worse than an unfamiliar
tool: every command Alice presses is a wager on whether this one is
present. She stops trusting her hands and starts checking, which is the
opposite of what the bindings were for. Filling a paragraph, moving by
sentence, transposing two words, and completing a word from the text she
has already written are not advanced Emacs; they are how prose is written
in it, and their absence is felt on the first page.

## Mechanism

We expect these seventeen commands to be the right ones to add, rather
than an arbitrary slice of Emacs, because they were chosen against a table
that already held eighty-three rows: the research note compares what is
present with what a writer reaches for without thinking and ranks only
what is both missing and reached for hourly, leaving the outline
vocabulary and the registers, rectangles, and macros to later tiers. The
claim is falsifiable in the obvious way — if a sitting with the app finds
Alice reaching for something this list does not carry, the ranking was
wrong.

We expect adding them to cost a row and a function each, not a change to
how keys are handled, because the bindings are data: `05-internals.md`
section 5 states that the table is "one table with an id, a label, and the
chords for each action, which the keys panel, the tooltips, and the
acceptance tests all read from", and the keyboard-navigation prototype in
`03-evidence.md` proves that shape works, with real prefix keys inside a
text field and help one chord away listing the live bindings.

We expect `M-x` to be nearly free for the same reason: every row already
carries the human label a command palette lists, so the palette is a view
over data that exists. We expect it to behave like every other overlay
because the prototype proves the contract — "overlays own the keyboard
while open and navigate with the same chords", and "`C-g` and Escape
cancel anything: a search, a panel, an overlay, a prefix".

We expect `M-q` to be safe against the round-trip byte-fidelity discipline
because the tree carries source spans: `05-internals.md` section 2 states
that "serialising an edited tree changes only the spans that were edited",
so filling rewrites the span of one paragraph and every other byte in the
chapter is copied through untouched. The same span model is what lets the
command refuse: a cursor inside a fenced div, a pipe table, a code fence,
or a heading is inside a node whose span is not a paragraph's, and a
command that would reflow it declines rather than guesses.

We expect `M-x`, `M-/`, and `M-@` to be the three rows at risk, because
the research note records them as suppressed today and `03-evidence.md`
holds open "which key combinations macOS and the web view take before the
editor sees them, and which of those the shell can claim back". If the
shell cannot claim them, these rows ship on an alternative chord or not at
all, and that is the falsification.

## Scope Conditions

- Platform: the desktop app, in the Tauri 2 system web view on macOS, with
  the shell claiming the combinations the platform would otherwise take.
  The same rows in the single HTML file on an iPad, where there is no
  shell to claim anything, belong to intent 18.
- Population: Alice, the sole author, editing the Markdown of one chapter.
  No moment here belongs to Bob or Carol; nothing these commands do
  reaches a rendering.
- Assumption: the spike named in `06-delivery.md` has run and produced the
  written binding table, and the editing surface is the one it chose.
  These rows are added to that table, not to a second one.
- Scale: tier one of the research note only — seventeen commands. Tier
  two, the document model as an outline (heading movement, folding,
  promotion and demotion, narrowing, occur, switching chapter by name),
  is a later intent of its own, together with the chord conflicts the note
  lists for the maintainer to decide. Tier three is not in scope at all.
- Boundary with intent 2, `itd-2609051335406422` (Edit with the Emacs
  bindings I already know): 2 owns the binding table's shape — the id, the
  label, the chords — the keys panel that renders it, the cancel contract,
  and the conformance sweep that checks the table. This intent adds rows
  to that table and passes under that sweep; it defines none of them. In:
  the seventeen commands and what each does to the text. Out: the table,
  the panel, the sweep.
- Boundary with intent 3, `itd-2609051335415528` (Insert a construct I
  cannot remember): 3 owns the insert palette on `C-c i` and the canonical
  form each entry writes at the cursor. In: that those same entries are
  listed by the `M-x` command palette and run from it. Out: what any of
  them inserts, and the palette's own chord, which is unchanged.
- Boundary with intent 30, `itd-2609051921482691` (Move between the editor
  and the sidebar without the mouse): 30 owns focus between panes, the
  sidebar by keyboard, and the return. In: movement of the cursor inside
  the text of one chapter, `M-r` included, which moves the cursor within
  the view. Out: any movement of focus out of the text.
- Assumption: the fill column is a document setting, defaulting to 80, so
  a document may state its own and a document that says nothing is filled
  at 80.
- Out of scope: rebinding any of these chords, which `03-evidence.md`
  leaves open for the table as a whole, and alternative binding sets,
  which `06-delivery.md` puts out of scope entirely.

## Acceptance Criteria

- **Given** the binding table with tier one added, **when** Alice opens
  the keys panel, **then** every one of the seventeen actions — fill
  paragraph, transpose words, transpose lines, capitalise word, backward
  and forward sentence, backward and forward paragraph, delete
  indentation, just one space, delete horizontal space, zap to char, mark
  word, command palette, describe key, move to window line, quit, and
  expand word — appears as a row with its label and its chord, and no
  chord in the table is claimed by two rows.
- **Given** a chapter whose second paragraph is one 544-character line,
  between a first paragraph and a pipe table captioned
  `: The counts by winter {#tbl:counts}`, **when** Alice puts the cursor
  in that second paragraph and presses `M-q`, **then** that paragraph
  alone is wrapped at the document's fill column of 80, and every byte of
  the file before its first character and after its last is identical to
  what it was.
- **Given** the cursor inside a `::: {.notes}` fenced div, inside the pipe
  table, inside a fenced code block, or on a `## Beginnings` heading line,
  **when** Alice presses `M-q`, **then** no byte of the chapter changes
  and the modeline says the command does not apply there.
- **Given** a chapter using the words `lanternlight` and `lanternkeeper`
  and no other word beginning `lant`, **when** Alice types `lant` and
  presses `M-/`, **then** the nearer word completes it; pressing `M-/`
  again replaces it with the other; pressing a third time returns the
  text to `lant`.
- **Given** the cursor between two words, **when** Alice presses `M-x`,
  types `tw`, and chooses `Transpose words` from the filtered list,
  **then** the palette closes and the two words swap; and **when** she
  presses `M-x` again and then `C-g`, **then** the palette closes and not
  one byte of the chapter has changed.
- **Given** a chapter with unsaved changes, **when** Alice presses
  `C-x C-c`, **then** Editor asks before quitting and `C-g` returns her to
  the text with the changes still unsaved; with nothing unsaved, the same
  chord quits without asking.
- **Given** the window at 390 CSS pixels wide, **when** Alice presses
  `M-z` and then, after answering it, `C-h k` followed by `M-c`, **then**
  the modeline shows the zap-to-char prompt and afterwards names
  `Capitalise word`, each on one line, with nothing clipped and no
  horizontal scrolling anywhere on the surface.
- **Given** the seventeen rows added, **when** the binding table's
  conformance sweep runs, **then** it passes unchanged: every row carries
  a label and at least one chord, no chord collides, and every chord the
  sweep presses reaches the editor rather than the web view or the
  platform.
- Inherits: round-trip byte-fidelity; no machine in the document; one
  source, always; degrade gracefully in a plain tool; legible on three
  device classes; network only on publish.

## Open Questions

- Which of the less common Emacs bindings count as "full" is open in
  `03-evidence.md` — "the binding table: which prefix keys and which of
  the less common Emacs bindings count as 'full'. A written table is the
  finite acceptance list." Tier one is this intent's answer for prose; the
  outline tier is a later one, and the question stays open until both have
  landed.
- Whether these chords are rebindable and persisted is open in
  `03-evidence.md`, which asks it of the table as a whole and notes that
  the keyboard-navigation prototype allows it. This intent adds rows on
  the same terms as every other row, whatever those turn out to be.
- Which combinations macOS and the web view take before the editor sees
  them, and which the shell can claim back, is open in `03-evidence.md`.
  It decides whether `M-x`, `M-/`, and `M-@` can carry the chords named
  here or must carry others.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
