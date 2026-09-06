---
id: itd-2609051402083398
slug: move-through-the-article-by-keyboard
spec_id: spc-2609061318158216
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Move through the article by keyboard

## Press Release

Bob is reading Alice's article on his laptop with a cup of coffee in one
hand. He never touches the trackpad. One chord moves him to the next
Section, one moves him back, one steps through the items inside a Section,
and one opens the contents list so he can jump to a Chapter by name. He
searches the text for the word he half-remembers and steps through the
matches. Whatever is open — the search, the contents list, a panel — one
cancel chord closes it, and so does Escape.

The chords are the chords he already knows from the editing surface. Alice
does not learn one vocabulary for writing and a second for reading, and
neither does anyone she hands the document to: the reading views borrow
the editor's movement, search, and cancel, and claim nothing of their own
invention. A keys panel one chord away lists what is live on the page he
is looking at, so a reader who wants to know what the page can do asks the
page.

Carol reads the same article on her phone. Nothing here is taken away from
her: the page works by touch as it always did, the panel is reachable when
a keyboard is attached, and the chords that do not apply to a page without
a keyboard are simply not offered. And because this is the reading views'
own vocabulary, the deck at the lectern, the article in the single file,
and the rehearsal cards all move the same way.

## Why This Matters

`04-surfaces.md` section 4 promises that Bob can read the whole article
without reaching for the mouse, and until now no moment owned that
promise: the reading views were left to borrow chords nobody had listed.
That is how two vocabularies get built — one in the editor, one improvised
per rendering — and then a reader learns that the deck cancels with one
key and the article with another. It also blocks other work: the rehearsal
deck in map #25 (`itd-2609051336055362`) already assumes next, previous,
and one cancel chord exist and are shared. Naming the reading views'
chords once, in one table, makes the promise testable and gives every
later reading surface something to inherit rather than invent.

## Mechanism

- We expect the reading views to reuse the editor's vocabulary rather than
  invent one because the bindings are frontend data — one table with an
  id, a label, and the chords for each action, read by the keys panel, the
  tooltips, and the acceptance tests alike (`05-internals.md` section 5).
  A reading view therefore declares which entries it honours; it does not
  declare chords of its own. Falsifiable: a chord live on a reading page
  that is absent from the table is a defect.
- We expect one cancel rule to hold on a reading page as it does in the
  editor because the keyboard-navigation prototype proves a single check
  at the head of every overlay's handler cancels a search, a panel, an
  overlay, or a prefix, and that overlays own the keyboard while open and
  move with the same chords as the view beneath them (`03-evidence.md`,
  the keyboard-navigation prototype).
- We expect movement by structure rather than by scroll distance to be the
  right unit because the article's navigation is drawn from the document
  hierarchy and the contents list already follows it (`04-surfaces.md`
  section 4; decision to carry all four levels in the contents). Moving by
  Section is moving through the argument, which is what a reader is doing.
- We expect keyboard reading to cost the reader nothing in privacy because
  the page is static output and nothing about where a reader has moved is
  recorded anywhere but the browser they are moving in (`05-internals.md`
  section 8).
- We expect this to be the one place the reading chords are settled
  because every other reading surface consumes them: the deck at the
  lectern, the article inside the single file, and the rehearsal deck. If
  a second surface has to name a chord this intent did not, the set is
  incomplete rather than the surface special.

## Scope Conditions

- Platform: the published article on the presenter site, the same article <!-- cond: cond-2609061318150599 -->
  in the desktop app's preview, and the same article inside the single
  HTML file, in current Safari and Chromium engines at the three
  legibility widths — 390, 820, and 1280 CSS px.
- Population: Bob and Carol reading with a keyboard attached, and Alice <!-- cond: cond-2609061318153674 -->
  reading her own draft. A reader with no keyboard loses nothing: touch
  and pointer keep working exactly as they do without this moment.
- Assumption: the binding table exists and the reading views declare which <!-- cond: cond-2609061318158331 -->
  of its entries they honour. Which entries those are is the open question
  in `03-evidence.md` this moment closes for the reading views.
- Boundary with map #2, `itd-2609051335406422` (Edit with the Emacs <!-- cond: cond-2609061318158896 -->
  bindings I already know): 2 owns the editing surface's vocabulary, the
  binding table itself, and the shell claiming combinations back from the
  platform. 26 owns which of those entries a reading view honours and what
  each one does to a page that cannot be edited.
- Boundary with map #9, `itd-2609051335489928` (Read the document as a <!-- cond: cond-2609061318159357 -->
  Tufte article): 9 owns the page — layout, margin notes, the contents
  list, images and video in the flow. 26 owns moving through that page by
  keyboard and nothing about how it is laid out.
- Boundary with map #10, `itd-2609051335492327` (Read it the way I like <!-- cond: cond-2609061318158883 -->
  it): 10 owns the reader controls and their persistence. 26 owns only
  that the toolbar is reachable and operable by keyboard; which controls
  it holds is 10's.
- Boundary with map #5, `itd-2609051335447894` (Present a chapter with no <!-- cond: cond-2609061318156889 -->
  slide markup): 5 owns the deck and its movement between Sections and
  Sub-sections. 26 owns the vocabulary the deck draws its movement chords
  from, so that next, previous, and cancel mean the same thing at the
  lectern as on the page.
- Boundary with map #25, `itd-2609051336055362` (Rehearse from cards built <!-- cond: cond-2609061318153551 -->
  out of the headings): 25 owns the cards, the two modes, and the sitting.
  26 owns the chords the deck moves by, which 25 consumes rather than
  declares.
- Boundary with map #12, `itd-2609051335518134` (Find what is hidden in <!-- cond: cond-2609061318153518 -->
  the text): 12 owns the once-only quotation, the hidden marks, the tray,
  and the Konami reveal. 26 owns that the panel an egg opens takes the
  keyboard while it is open and closes on the cancel chord, as every
  overlay does.
- Excluded as plumbing: the key table's data shape, the event-to-chord <!-- cond: cond-2609061318155666 -->
  mapping, and the overlay handler (`05-internals.md` section 5).

## Acceptance Criteria

- Given a published article of two Parts holding four Chapters, When Bob
  presses the next-section chord repeatedly from the top of the page, Then
  the page moves to each Section in document order, the heading it lands
  on is brought into view, and the previous-section chord retraces the
  same order backwards.
- Given the same article, When Bob presses the contents chord, Then the
  contents list opens listing Parts, Chapters, Sections, and Sub-sections,
  the movement chords step through its entries, and choosing one moves the
  page to that heading and closes the list.
- Given the article with the contents list open and a search in progress,
  When Bob presses the cancel chord, Then whatever is open closes, the
  page keeps the reading position it had, and pressing Escape instead has
  the same effect.
- Given the article open, When Bob searches for a word that appears three
  times and steps forward through the matches and then backward, Then each
  step brings the next match in that direction into view, and cancelling
  the search returns him to the paragraph he started from.
- Given the article open, When Bob presses the keys-panel chord, Then the
  panel lists every action this page honours with its label and its live
  chords, and lists no action the page does not honour. (Negative case:
  an entry the reading view does not honour is absent from the panel
  rather than shown as inert.)
- Given a chord in the binding table that the reading views do not honour,
  When Bob presses it on the article, Then nothing happens on the page, no
  editing action is performed, and the page's reading position is
  unchanged. (Negative case.)
- Given the article at 390 CSS px with a hardware keyboard attached, When
  Carol opens the keys panel and moves by section, Then the panel and the
  headings it moves to are fully legible with no horizontal scrolling and
  no pinch zoom, and at 820 and 1280 CSS px the same chords perform the
  same actions.
- Given Bob has moved through the whole article by keyboard, When the
  network is observed for the session, Then no request carries his
  position, his search terms, or any record of where he has been.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`);
  legible on three device classes (`itd-2609051336128348`); one source,
  always (`itd-2609051336090390`); network only on publish
  (`itd-2609051336158553`).

## Open Questions

- Which navigation chords the reading views share with the editor
  (`03-evidence.md`, open questions, "Editor"). This moment is where that
  question is answered; until the answer is written into the binding
  table, the criteria above have a set to refer to but not its contents.
- Whether individual chords in that table are rebindable and persisted
  (`03-evidence.md`, open questions, "Editor"). A reader who cannot open
  the app has no way to rebind, so the answer decides whether a chord a
  browser takes for itself has any remedy on a reading page.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
