---
id: itd-2609051335406422
slug: edit-with-the-emacs-bindings-i-already-know
spec_id: null
kind: null
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

# Edit with the Emacs bindings I already know

## Press Release

Alice opens a chapter and types. Her hands already know where everything
is: she moves by character, word, line, and buffer; she kills a line and
yanks it back; she sets the mark and acts on the region; she searches
forward and backward as she types; she undoes. The prefix keys work, and
so does the chord that saves. Nothing is swallowed on the way — not by
the window, not by the machine — and the Markdown she is editing is the
file itself, with no hidden copy behind it.

When she cannot recall a chord she does not leave the app to find it. One
chord opens the keys panel, which lists every action Editor claims, its
label, and the chords live for it right now; any control that has a chord
names it in its tooltip. A prefix key opens a prefix state and the
modeline at the foot of the window shows it, beside her position in the
chapter. One cancel chord cancels anything — a search in progress, the
keys panel, any overlay, a half-typed prefix — and Escape does the same,
so there is never a state Alice cannot get out of.

The bindings Editor claims are a written list rather than a promise. If a
chord is in the list, it works in the editing surface; if it is not, the
list says so and Alice can see that in the panel rather than discovering
it mid-sentence. And because the chapter on disk stays plain Markdown,
Emacs itself remains free to open the very same file whenever she prefers
it.

## Why This Matters

Alice has spent years in one editing vocabulary, and an editor that gets
it half right is worse than one that does not try: the muscle memory
fires, the wrong thing happens, and the sentence is gone. Every other
moment in Editor rests on this one, because a folder she cannot type into
comfortably is a folder she will edit somewhere else — which puts the
text back into two places, the exact failure the acceptance project shows
(`03-evidence.md`). The bindings are also why the Markdown can stay
visible and authoritative: Alice does not need a rich-text surface to
edit quickly, she needs her own keys.

## Mechanism

- We expect a real Emacs editing surface inside a web view because
  CodeMirror's Emacs keymap implements these bindings and the Tauri shell
  can claim, at the window level, the combinations the platform would
  otherwise take first (`01-product.md` assumptions; ADR
  `adr-2609051324137479`). The claim is falsifiable by the spike in
  `06-delivery.md`, and its named fallback is a different shell.
- We expect prefix keys to survive inside a text field because the
  keyboard-navigation prototype already does exactly that: a prefix chord
  opens a visible prefix state, the next key completes the chord, and
  control prefixes keep working while the caret is in a field
  (`03-evidence.md`; `2026-09-05-prototype-keyboard-navigation.md`).
  `05-internals.md` names this as the spike's central risk.
- We expect one cancel rule to hold everywhere because the prototype
  proves a single check at the head of every overlay's key handler
  cancels a search, a panel, an overlay, or a prefix
  (`03-evidence.md`). A surface that needs its own escape hatch is a bug,
  not a feature.
- We expect "full Emacs bindings" to be testable because the table is
  data — an id, a label, and default chords per action — read by the keys
  panel, by the tooltips, and by the acceptance tests from one source
  (`05-internals.md` section 5). A binding absent from the table is not
  claimed, so the promise is finite and each entry falsifies
  independently.
- We expect editing not to disturb the file because the surface holds the
  file's text and nothing else: no hidden representation and no round trip
  through a rich-text model (`04-surfaces.md`), and serialising an edited
  tree changes only the spans that were edited (`05-internals.md`
  section 2).

## Scope Conditions

- Platform: the desktop app only — a Tauri 2 shell around the macOS
  system web view, with Rust claiming the key combinations the platform
  would otherwise take (`02-constraints.md`; `05-internals.md` section 5).
- Gate: this intent is gated by the spike in `06-delivery.md`, which
  produces the binding table. Every criterion below refers to that table
  rather than to a chord written here, and the intent claims no chord the
  table does not list.
- Assumption: CodeMirror is the editing surface in both the app and the
  single file, held until the spike confirms or replaces it
  (`01-product.md`).
- Population: Alice, one author, one binding set. Alternative binding
  sets are out of scope for the product (`06-delivery.md`); rebinding one
  action is a separate open question.
- Boundary with map #18, `itd-2609051335586905` (Edit on the iPad and
  bring the text back): the boundary is the host. 2 owns the desktop app
  and the binding table itself; 18 owns which of those bindings survive
  in Safari on an iPad, where there is no shell to claim anything back.
- Boundary with the reading views: which navigation chords the article,
  the deck, and the single file share with the editor is an open question
  in `03-evidence.md`; this intent owns the editing surface's vocabulary
  and the panel that displays it, not its reuse elsewhere.
- Bundle: member of the Editing surface bundle with map #1,
  `itd-2609051335399446`, and map #3, `itd-2609051335415528`. One spec —
  an editor with no bindings is not the editor the constraints describe.
- Plumbing inherited, not owned: the editing component, key interception
  in the shell, the key table's data shape, and atomic writes to disk.

## Acceptance Criteria

- Given a chapter open with the cursor mid-paragraph, When Alice presses
  each movement chord in the binding table in turn — character, word,
  line, and buffer, forward and backward — Then the cursor moves exactly
  as that entry's label states, for every entry, and no chord in the
  table reaches macOS or the web view instead of the editor.
- Given the cursor at the start of a line, When Alice kills the line and
  yanks it back twice, Then the line is removed once and inserted twice
  at the cursor; and Given a mark set at one point and the cursor at
  another, When Alice acts on the region, Then the action applies to
  exactly the text between them.
- Given a chapter containing the word "lantern" three times, When Alice
  searches forward and steps through the matches, then searches backward,
  Then each step lands on the next match in that direction; and When she
  presses the cancel chord mid-search, Then the search closes and the
  cursor returns to where the search began.
- Given no prefix is active, When Alice presses a prefix chord from the
  table, Then the modeline shows the prefix state and the following key
  completes the chord; and When she presses the cancel chord instead,
  Then the prefix state clears, the modeline shows no prefix, and no
  character is inserted into the chapter.
- Given a chapter is open, When Alice presses the keys-panel chord, Then
  the panel lists every action in the binding table with its label and
  its live chords, Escape closes it, and the entries shown are read from
  the same table the acceptance tests read — a table entry changed in one
  place changes the panel, the tooltip, and the test together.
- Given Alice has typed a paragraph and has not pressed the save chord,
  When the chapter file is read from disk, Then it is byte for byte what
  it was before she typed; and When she then saves, Then the file differs
  only by the paragraph she typed.
- Given a chapter carrying a 544-character line, a table, an HTML
  comment, and a fenced div, When Alice opens it, moves the cursor to the
  end of the buffer, and saves without typing, Then the file is byte for
  byte identical — no reflowed line, no re-escaped character, no
  realigned table, no dropped comment.
- Given the desktop app window narrowed to iPad width, When Alice opens
  the keys panel and enters a prefix state, Then the panel and the
  modeline remain fully legible with no horizontal scrolling and no
  pinch zoom, and the cancel chord still closes the panel.
- Inherits: round-trip byte-fidelity (`itd-2609051336074533`); no machine
  in the document (`itd-2609051336080960`); one source, always
  (`itd-2609051336090390`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); legible on three device classes
  (`itd-2609051336128348`); network only on publish
  (`itd-2609051336158553`).

## Open Questions

- What "full" means. `03-evidence.md` leaves open "the binding table:
  which prefix keys and which of the less common Emacs bindings count as
  'full'. A written table is the finite acceptance list." Until the spike
  writes it, the criteria above have a list to refer to but not its
  contents.
- Whether individual chords are rebindable and persisted, as the
  keyboard-navigation prototype allows — open in `03-evidence.md`, which
  separates it from alternative binding sets.
- Which key combinations macOS and the web view take before the editor
  sees them, and which of those the shell can claim back — open in
  `03-evidence.md` and the first question the spike answers.
- Which navigation chords the reading views share with the editor — open
  in `03-evidence.md`, and the reason this intent stops at the editing
  surface.
- How concurrent edits from two devices are detected so that
  last-write-wins can be reported rather than silently applied — open in
  `03-evidence.md`, which decides what the editor does when a chapter it
  holds unsaved changes underneath it.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
