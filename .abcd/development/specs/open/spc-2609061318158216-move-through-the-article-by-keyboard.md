---
id: spc-2609061318158216
slug: move-through-the-article-by-keyboard
intent: itd-2609051402083398
origin: researcher-authored
production_mode: dictated-and-formatted
---
# move-through-the-article-by-keyboard

## Summary

This spec delivers map #26, `itd-2609051402083398`: the article's own
keyboard vocabulary, drawn entirely from the editing surface's binding table
and inventing no chord of its own. Nine rows of `src/keys.ts`'s table are
declared honoured — `outline-next-heading`/`outline-previous-heading` for
moving by Section (every heading on the page, regardless of level, the same
order `outline.ts`'s own movement already walks), `next-line`/`previous-line`
for moving by item inside a Section (the flow blocks between one heading and
the next), `outline-occur` for the contents list, `isearch-forward`/
`isearch-backward` for an incremental search of the page's own text,
`keyboard-quit` for cancel, and `keys-panel` for a keys panel listing exactly
these nine and nothing else. Because the article's own script runs on the
published site under `script-src 'self'` with no bundler, it cannot import
`src/keys.ts` at all; `src/core/render/reading-keys.ts` is the one function
that turns the table's own rows into the `<script type="application/json"
id="article-keys-data">` block `articleDocument` and the app's preview window
both write, so the site build, the folder export and the app's preview agree
on one list. `src/core/render/article-keys.js` is the plain script that reads
that data, reimplements the event-to-chord mapping faithfully (proven against
`chordFromEvent` over one shared fixture), and holds the reading position —
which Section, which item, what search term — in memory alone, never in
storage and never in a request. Coordination with map #12's own script,
`article-eggs.js`, is by DOM convention (its `.egg-panel-backdrop` class)
rather than by editing that file: while its panel or its opening modal is
open, this script does nothing but relay `C-g` as the `Escape` keydown that
script already listens for.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/keys.ts` | 139 rows, `SUPPRESSED`, `scopeOf`, `bindingById` | adds `READING_BINDING_IDS` (nine ids) and `readingBindings()`; nothing else |
| `src/emacs-keys.test.ts` | exercises the table's own invariants | one additive `describe` block: `READING_BINDING_IDS` names only rows that exist, in the order it names them |
| `src/core/render/reading-keys.ts` | absent | new: `readingBindingData()`, `readingBindingDataJson()`, `readingKeysDataScript()`, `READING_KEYS_DATA_ID` |
| `src/core/render/reading-keys.test.ts` | absent | new |
| `src/core/render/article-keys.js` | absent | new: the whole reading-view script — the chord mapping, Section and item movement, the contents overlay, incremental search, cancel, the keys panel, the visible help button, and the egg-panel coordination |
| `src/core/render/article-keys.test.ts` | absent | new: every criterion below a jsdom test can reach, over a synthetic fixture built through `articleDocument`, never a document under `examples/` |
| `src/core/render/chord-mapping.fixture.ts` | absent | new: the one list `chordFromEvent` (`src/keys.ts`) and the script's own copy are both driven against |
| `src/core/render/article.css` | carries map #9's and map #10's own sections, and the marker comment reserving one for this map | adds one section, below the existing comment: the help button, the three panels, the contents list's current-row mark, the search field, and the keys list — no fixed pixel width anywhere |
| `src/publish/build.ts` | `articleDocument` links `article-video.js`, `article-controls.js`, `article-eggs.js` | one additive import and two additive lines: `readingKeysDataScript()`'s own `<script type="application/json">` block, then `<script src="…/article-keys.js" defer></script>` |
| `src/export/services.ts` | `FOLDER_CHROME_FILES.article` names four files | one additive entry: `article-keys.js` |
| `src-tauri/src/publish/stage.rs` | `CHROME` (12 entries), `chrome_for_folder("article")` names four files | one additive `CHROME` entry (`include_str!` of `article-keys.js`, array size 12 → 13) and one additive name in `chrome_for_folder`'s `"article"` arm |
| `src-tauri/src/export.rs` | two tests hard-code the article chrome as four files | both updated to the five files, in the order each test already keeps (alphabetical for the folder walk, landing order for `chrome_for_folder`) |
| `preview.html` | links `article-video.js`, `article-controls.js`, `article-eggs.js` | one additive `<script type="module" src="/src/core/render/article-keys.js" defer>` |
| `src/preview.ts` | renders the article, calls `articleVideo()?.upgradeVideos()` and `articleEggs()?.boot()` | one additive import, one additive module-load-time write of the same data block `articleDocument` writes (the preview window's `<head>` is `preview.html`'s own static markup, so this is the one other place it has to be written), an `articleKeys()` accessor, and one additive `articleKeys()?.boot()` call in `show()` |
| `src/local-documents.test.ts` | `INTERACTION_CHECKS` carries entries for video, the reader-controls toolbar and the once-only opening/easter eggs; a comment on the video check named map #26 as pending | one additive entry: the keys panel lists exactly the honoured rows, and the movement chords reach a real heading when the document has one; the "pending" comment is dropped |
| `docs/how-to-preview-and-read-the-article.md` | describes the preview window and the reader-controls toolbar | one additive section, "Moving through the article by keyboard" |
| `.abcd/development/brief/03-evidence.md` | names "which navigation chords the reading views share with the editor" as an open question, under Editor | that line removed: this spec is where it is answered |
| `.abcd/development/brief/04-surfaces.md` | section 4's "Moving by keyboard" is a two-sentence stub | rewritten, present tense, naming the settled chords |

### Out

- The binding table's own shape, the keys panel's own component <!-- cond: cond-2609061318155666 -->
  (`src/keyspanel.ts`), the event-to-chord mapping (`chordFromEvent`) and the
  overlay handler (`src/overlay.ts`): map #2, `itd-2609051335406422`. This
  spec adds two rows' worth of data (`READING_BINDING_IDS`, `readingBindings`)
  and a faithful, independent copy of the mapping for a host that cannot
  import the original; it changes none of the three.
- What the article page contains — layout, margin notes, the contents list's <!-- cond: cond-2609061318090837 -->
  own markup, images and video in the flow: map #9, `itd-2609051335489928`.
  This spec reads `<nav class="contents">` back as data; it writes none of
  it.
- The reader-controls toolbar and its persistence: map #10, <!-- cond: cond-2609061318158883 -->
  `itd-2609051335492327`. This spec owns only that the toolbar is reachable
  and operable by keyboard, which it already is — every control is a native
  `<button>` — and adds nothing to that file.
- The once-only quotation, the easter eggs, the tray and the Konami reveal: <!-- cond: cond-2609061318153518 -->
  map #12, `itd-2609051335518134`. This spec owns that the panel an egg opens
  takes the keyboard while open and closes on the cancel chord, which it
  proves by coordinating through that script's own DOM convention rather
  than by editing it.
- The deck's own movement between Sections and Sub-sections: map #5, <!-- cond: cond-2609061318156889 -->
  `itd-2609051335447894`. This spec is the vocabulary that deck draws its
  movement chords from; it renders no deck.
- The rehearsal cards, the two modes, and the sitting: map #25, <!-- cond: cond-2609061318153551 -->
  `itd-2609051336055362`. That map consumes the chords this one declares.
- Whether individual chords in the table are rebindable and persisted <!-- cond: cond-2609061318158331 -->
  (the intent's own second Open Question, still open in `03-evidence.md`).
  Every row this spec honours carries an id like every other, which is all a
  later answer needs.
- A document with no keyboard attached: touch and pointer are unchanged. <!-- cond: cond-2609061318153674 -->

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| Nothing is stored about a reader (`itd-2609051336145770`) | `article-keys.test.ts` › "calls neither fetch nor XMLHttpRequest while every action is exercised", "keeps a search term in memory only — nothing is left once the panel closes"; the reading position (`sectionIndex`, `itemIndex`, the search term) lives in module-level variables and nowhere else |
| Reachable by assistive technology (`itd-2609061324342715`) | the visible "Keyboard shortcuts" button — a native, Tab-reachable `<button type="button">` first in `<body>` — answers the forbid on a panel reachable only by a chord it would otherwise be; `article-keys.test.ts` › "opens the same panel from the visible help button, reachable by Tab alone"; every movement chord is an enhancement over content (the contents list, the headings) that is already reachable and already a correct heading hierarchy with no script at all |
| Legible on three device classes (`itd-2609051336128348`) | `article-keys.test.ts`'s own stylesheet assertions — no bare pixel width in map #26's own section of `article.css`, every panel's width bounded by `calc(100vw …)`; manual check M26-1 at 390, 820 and 1280 CSS px |
| One source, always (`itd-2609051336090390`) | the chords come from `readingBindings()` against the one table; the JSON both `articleDocument` and `src/preview.ts` write is built by the one function, `readingBindingDataJson`; `article-keys.js` is `include_str!`'d by `stage.rs`, linked by `build.ts`, named in `export/services.ts`'s chrome list and `preview.html` alike — none of the four names its own copy |
| Network only on publish (`itd-2609051336158553`) | inherited by construction: this map adds no code path that ever calls `fetch` or `XMLHttpRequest`, proven directly above |

## Design

### Why these nine rows, and not others

The intent's own Mechanism draws movement from the document's structure
rather than from scroll distance, and the outline vocabulary
(`spc-2609061341298538`) already gives the editing surface exactly that
shape. `outline-next-heading`/`outline-previous-heading` (`C-c C-n`, `C-c p`)
already move "to every heading regardless of level" in the editor; reused
here unchanged, they are what "next/previous Section" means on a page whose
headings are Chapter, Section and Sub-section stops in one continuous
argument — the Press Release's own "one chord moves him to the next Section"
does not distinguish a Chapter stop from a Section stop, and neither does
this table. `next-line`/`previous-line` (`C-n`/`Down`, `C-p`/`Up`) are reused
for "moving by item inside a Section": on a page with no text cursor, an
"item" is the next flow block — a paragraph, a list, a figure, a callout, a
margin note — read straight off the `<article>` map #9 already wraps one
chapter in, so this spec builds no structure of its own to walk.

`outline-occur` (`M-s o`) is the contents chord, deliberately not
`outline-switch-chapter`: "switch chapter by name" moves between different
open files on the editing surface, a concept the article's one page has no
equivalent of, while occur's own shape — a list, filtered or not, choosing
one moves the position and closes it — is exactly "opens a list overlay …
navigable with the movement chords, Return jumps, cancel closes." What
occur's list is built *from* is the one question this map answers
differently for a reading page than the editing surface answers for a
buffer: instead of matching lines, `contentsEntries()` in `article-keys.js`
reads `<nav class="contents">` back as data — the intent's own boundary with
map #9 ("26 owns … what each one does to a page that cannot be edited")
licenses exactly this, and it keeps the contents overlay's own hierarchy from
ever disagreeing with the page's own nav, because it is read from it rather
than rebuilt beside it.

`isearch-forward`/`isearch-backward` (`C-s`/`s-f`, `C-r`) are the search
chords the design brief itself names; unlike occur's list, a live isearch
matches character sequences across the page's own text, so the two rows are
reused with their existing dual meaning — the first press opens the search,
each further press of the same chord steps in that direction.
`keyboard-quit` (`C-g`, `Escape`) and `keys-panel` (`C-h b`, `C-x S-/`) are
reused unchanged, because a reading page's cancel and its keys panel are the
editing surface's own, not a second implementation of either idea.

### The chord mapping, reimplemented once, proven against the original

`article-keys.js` cannot import `src/keys.ts` — the published site serves it
under `script-src 'self'` with no bundler, and the intent's own Excluded
condition (`cond-2609061318155666`) puts the mapping itself out of this
map's scope to redesign. `chordFromEvent` inside `article-keys.js` is a line
-for-line copy of the algorithm in `src/keys.ts`'s own function of the same
name: the same `Key[A-Z]`/`Digit[0-9]` regexes read off `event.code` before
anything else is consulted, the same `CODE_NAMES`/`KEY_NAMES` tables, the
same Dead-key fallback for a macOS accent composed on a key neither regex
reaches. `chord-mapping.fixture.ts` is the one list of keyboard-event
descriptors both are driven against — plain letters, digits, arrows, Escape,
every modifier in canonical order, a Dead key composed with Option, and the
punctuation `S-/` reads off its physical key — and `article-keys.test.ts`
asserts the table's own `chordFromEvent` and the script's own copy agree on
every one of them, not merely that each matches the fixture's own expected
value in isolation.

### Where the reading position lives, and how it moves

Three module-level variables in `article-keys.js` — `sectionIndex`,
`itemIndex`, `currentElement` — are the whole of the reading position, held
in memory for the life of the page and touched by nothing that would let
them survive a reload or reach a request. `moveSection(delta)` reads every
`h1`–`h6` with an `id` under `<main>`, in document order (`article.ts`'s own
anchors are what give every one of them that id), and moves the index one
step, wrapping at either end — the same "a list that stops dead at its ends
makes the reader look at the screen to find out why" reasoning
`src/overlay.ts` already states for the editing surface's own overlays,
restated here because this file cannot import that module either.
`moveItem(delta)` reads the current heading's enclosing `<article>` and
walks its direct children from the heading forward until the next heading of
any level, which is the flat, sibling-level shape `renderBlocks` already
writes one chapter's blocks in — a margin note is one of these siblings too,
because `inlineMarginNotes` appends it as the block's own next sibling
(`spc-2609061318090042`'s own Design), so stepping through items already
visits a footnote or a citation beside the paragraph that made it.

Reaching a heading by any route — Section movement, item movement, or the
contents list — calls one function, `reveal`, itself two calls: a guarded
`scrollIntoView` (guarded because jsdom carries no implementation of it at
all, proven directly by inspection rather than assumed) and `focusOnce`, a
temporary `tabindex="-1"` removed again on `blur` — the identical idiom
`article-eggs.js` already uses to return focus to a paragraph, kept here as
its own independent copy because a plain script has nothing to import
another one's function from. Focus, not merely scroll position, is what
"brought into view" means for a screen reader as well as a sighted reader,
and it is also what every automated test below reads back: jsdom implements
`document.activeElement` and `focus()` perfectly well even with no layout
engine to confirm the scroll.

### The contents overlay, search, and the keys panel

All three are variations on one internal shape, `overlay`, closed by exactly
one function and opened by exactly one of three builders — never
`src/overlay.ts`'s own `openOverlay`, which this file cannot import, but the
same shape independently: one thing at a time holds the keyboard, movement
and cancel are read before anything overlay-specific, and closing restores
focus to whatever had it before. The contents overlay's rows are read from
`<nav class="contents">` as described above; `next-line`/`previous-line`
move the highlighted row and `Return` jumps, exactly the movement chords the
page already answers elsewhere, given a second meaning while the overlay
holds the keyboard — the same double duty `src/overlay.ts`'s own list
overlay already gives them for the palette and the quit confirmation. Search
opens a real, labelled `<input>` rather than capturing characters at the
document level, so typing, Backspace and an arrow inside the field are left
alone entirely: the field is the "prompt" shape `src/overlay.ts`'s own
`onKey` hook describes, mirrored here because this page cannot import that
contract either. `findMatches(query)` walks every text node under `<main>`
with a `TreeWalker`, matching case-insensitively, and reports one match per
text node that carries the term — a reading page bringing a reader to a
paragraph, not a find-in-page tool counting character offsets — with each
step calling `reveal` on the match's own containing block. Cancelling search
restores focus to `searchState.originElement`, the element `currentElement`
named the moment the search opened; accepting with `Return` simply closes,
leaving the reader at the match they stopped on. The keys panel reads
`HONOURED` — the same array `loadHonoured()` parsed from the page's own data
block — and nothing else, which is what makes "lists no action the page
does not honour" true by construction rather than by a second list a future
edit could let drift.

### Cancel, and the one door into map #12's own panel

`handleOverlayKey` checks the cancel chord before anything overlay-specific,
mirroring `src/overlay.ts`'s own stated rule ("a single check at the head of
every overlay's handler") independently, because this file cannot import
that module. Where nothing of this page's own is open, `eggPanelOpen()` —
one `document.querySelector(".egg-panel-backdrop")` — asks whether map #12's
own script holds the keyboard instead; if it does, every chord but the
cancel one is left alone entirely (map #12's panel "takes the keyboard while
it is open", the intent's own boundary condition), and `C-g` alone is
translated into a synthetic `Escape` keydown, because `article-eggs.js`
listens for `Escape` literally and never for `C-g`. A marker property on the
dispatched event (`articleKeysRelayed`), not `event.isTrusted`, is what
keeps this from relaying its own relay back to itself: a real browser marks
every script-dispatched event untrusted, which would have worked in
production, but a test has no way to dispatch a *trusted* keydown at all, so
proving the guard holds needed a property this script controls either way.

### The visible door to the keys panel

`itd-2609061324342715` forbids "a control, panel, or overlay reachable only
by an Emacs chord, with no Tab-and-Enter … path to the same action for a
reader who does not know the binding table" — which the keys panel, built
from nothing but `C-h b`, would otherwise be. `ensureHelpButton()` inserts
one native `<button type="button">`, labelled "Keyboard shortcuts", as the
very first child of `<body>` — reachable by one Tab from the top of the page
regardless of how long the article beneath it runs — that opens the same
panel a click would. Contents and search are not given an equivalent button:
each already has a fully accessible way in with no chord at all — the
on-page `<nav class="contents">` for the first, and every browser's own
native find for the second — so the forbid does not reach either, and this
spec adds no second entrance to what already has one.

### What was found rather than assumed

The reader-controls toolbar (`article-controls.js`) is appended to
`document.body` at boot, after every article element, which the intent's own
boundary text left this map to "decide" whether Tab order alone reaches. It
does — every native `<button>` stays in the tab order wherever it sits — but
not quickly on a long article, and this spec does not move it, invent a
jump chord for it (the design brief itself forbids inventing one), or touch
`article-controls.js`, which map #10 owns. This is recorded as a decision
rather than a silent choice, and the one thing this map does guarantee is
that its own listener never calls `preventDefault` on `Tab` and never traps
focus outside an open overlay, so whatever the toolbar's own reachability is
today, this map does not make it worse.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| Two Parts, four Chapters: the next-section chord moves to each heading in document order from the top, and the previous-section chord retraces it | `article-keys.test.ts` › "moves to each heading in document order, and back, from the top of the page", "wraps from the last heading back to the first, and from the first to the last" |
| The contents chord opens a list of Parts, Chapters and Sections; the movement chords step through it; Return jumps and closes | `article-keys.test.ts` › "opens listing Parts, Chapters and Sections, moves with the movement chords, and Return jumps and closes", "does not open when there is nothing to jump to" |
| With the contents list open and a search in progress, the cancel chord closes whatever is open and keeps the reading position; Escape does the same | `article-keys.test.ts` › "closes the contents list on C-g, keeping the reading position", "closes the contents list on Escape too" |
| A word appearing three times: stepping forward and backward brings each match into view in turn, and cancelling returns to the paragraph search started from | `article-keys.test.ts` › "steps forward and backward through three matches, and cancel returns to the paragraph it started from", "keeps typing in the field for a plain character" |
| The keys panel lists every honoured action with its label and live chords, and no action the page does not honour | `article-keys.test.ts` › "lists every honoured action with its label and chords, and no other action" |
| A chord in the table the reading views do not honour does nothing: no editing action, no change to the reading position | `article-keys.test.ts` › "does nothing: no overlay, no movement, and the event is left unclaimed" |
| At 390 CSS px, the keys panel and the headings it moves to are fully legible with no horizontal scroll and no pinch; the same chords do the same at 820 and 1280 | `article-keys.test.ts`'s own stylesheet assertions (no bare pixel width in map #26's section, every panel capped by `calc(100vw …)`); manual check M26-1, because jsdom carries no layout engine |
| Moving through the whole article by keyboard sends no request carrying a position, a search term, or any record of where the reader has been | `article-keys.test.ts` › "calls neither fetch nor XMLHttpRequest while every action is exercised", "keeps a search term in memory only — nothing is left once the panel closes"; manual check M26-2, for a real network panel over a real load |
| The panel an egg opens takes the keyboard while it is open and closes on the cancel chord | `article-keys.test.ts` › "does nothing but relay C-g as Escape while an egg panel is open" |
| Inherits: nothing stored about a reader; legible on three device classes; one source, always; network only on publish | see Disciplines inherited, above |

Manual checks, `npm run tauri dev` and a real browser against a folder
export, recorded unticked in
`.abcd/.work.local/logs/acceptance/spc-2609061318158216.md`:

- **M26-1** — at 390, 820 and 1280 CSS pixels, open the keys panel and move
  by Section on a real document. Nothing scrolls sideways, nothing needs a
  pinch, and the visible "Keyboard shortcuts" button and every panel stay
  inside the viewport.
- **M26-2** — with the browser's network panel open, move through a whole
  article by Section, by item, through the contents list and through a
  search, then reload. No request carries a position, a query string, or a
  fragment a search term wrote.
- **M26-3** — with a real keyboard and no mouse, reach the reader-controls
  toolbar by Tab alone from the top of the page, confirming it is still
  reachable (unquickened by this map, per its own Risks) and that none of
  this map's own chords interferes with Tab reaching it.

## Tasks

1. Add `READING_BINDING_IDS` and `readingBindings()` to `src/keys.ts`; the
   conformance test in `src/emacs-keys.test.ts`.
   Verify: `npx vitest run src/emacs-keys.test.ts -t "reading views"`.
2. Add `src/core/render/reading-keys.ts` and its test: the serialised data,
   the escaped JSON, and the `<script>` block.
   Verify: `npx vitest run src/core/render/reading-keys.test.ts`.
3. Add `src/core/render/chord-mapping.fixture.ts`.
   Verify: `npx tsc --noEmit`.
4. Add `src/core/render/article-keys.js`: the chord mapping, Section and
   item movement, the contents overlay, search, the keys panel, the help
   button, and the egg-panel coordination.
   Verify: `npx vitest run src/core/render/article-keys.test.ts`.
5. Wire `readingKeysDataScript()` and the script tag into `articleDocument`
   (`src/publish/build.ts`); the chrome file lists in
   `src/export/services.ts`, `stage.rs` and `export.rs`; the script tag in
   `preview.html`; the data write and the `articleKeys()?.boot()` call in
   `src/preview.ts`.
   Verify: `npx vitest run src/core/render/article-keys.test.ts src/preview.test.ts src/export/services.test.ts` and `cargo test --manifest-path src-tauri/Cargo.toml article`.
6. Add map #26's own section to `src/core/render/article.css`.
   Verify: `npx vitest run src/core/render/article-keys.test.ts -t "legible"`.
7. Add the `INTERACTION_CHECKS` entry in `src/local-documents.test.ts`.
   Verify: `npx vitest run src/local-documents.test.ts`.
8. Write the docs section, the manual checklist, the brief edits, and the
   decision lines.
   Verify: the six gates, plus `abcd lint`.

## Risks and Open Questions

- **The reader-controls toolbar's own reachability was found, not assumed,
  to be slow rather than absent.** `article-controls.js` appends the toolbar
  at the very end of `document.body`; Tab alone reaches it, but only after
  every link and every egg marker the article carries. The design brief's own
  wording ("Tab order suffices if the toolbar is early in the DOM; decide")
  left the decision to this map: a jump chord was considered and rejected,
  because the same brief forbids inventing one, and moving the toolbar in the
  DOM is map #10's file to change, not this one's. M26-3 is where this is
  confirmed for real; the departure from "early in the DOM" is recorded as a
  decision rather than left implicit.
- **The visible "Keyboard shortcuts" button is this map's own addition
  beyond the intent's literal Acceptance Criteria**, added to answer
  `itd-2609061324342715`'s forbid on a panel reachable only by a chord.
  Contents and search were judged not to need an equivalent, because each
  already has a fully accessible route with no chord at all (the on-page nav,
  and the browser's own native find); a future audit could find that
  judgement wrong, and would need a button for one or both then.
- **Which occur-like row of the outline vocabulary should stand for
  "contents" was a genuine choice, not a foregone one.**
  `outline-switch-chapter` was considered and rejected because it names a
  different action on the editing surface (choosing a different open file)
  than the one this map needs (jumping within the one page a whole document
  already is); `outline-occur`'s own shape was judged the closer fit. A
  future map that finds readers reaching for `C-x b` on the article instead
  would be evidence this judgement was wrong.
- **The event-to-chord mapping is proven only against the fixture's own
  list, not against every physical keyboard layout a browser might report.**
  `chord-mapping.fixture.ts` is deliberately the same shape
  `src/emacs-keys.test.ts`'s own dead-key and Option-composition tests
  already trust for the editing surface; a layout that composes a key
  neither test's fixture anticipates would need a new fixture entry proven
  against both implementations at once, which is the whole reason the
  fixture is shared rather than duplicated.
- **What the intent leaves silent, with this build's own assumption rather
  than an invented answer**: a chord's prefix (`C-c`, `M-s`, `C-h`, `C-x`) is
  held for 2000 ms before it is dropped — a number the intent does not fix,
  chosen only to be generous rather than to mean anything on its own; and an
  item's boundary is the enclosing `<article>`'s own direct children, so a
  block nested inside a `.callout` or a generic `<div>` is not itself a
  separate item — moving into an image's caption or a table's own cells is
  not something this map's Assumption (`cond-2609061318158331`'s neighbour,
  the binding table's declared entries) was asked to reach.
