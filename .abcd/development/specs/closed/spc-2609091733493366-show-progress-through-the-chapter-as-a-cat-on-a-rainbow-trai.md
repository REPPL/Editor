---
id: spc-2609091733493366
slug: show-progress-through-the-chapter-as-a-cat-on-a-rainbow-trai
intent: itd-2609081938397758
origin: researcher-authored
production_mode: hand-written
---
# A cat on a rainbow trail, in the footer

## Summary

This spec delivers map #40, `itd-2609081938397758`: one more cell in the
modeline, between the line-and-column cell and the prefix cell, holding a
short bar with a cat at its head. The bar fills from the left in proportion
to how far the caret sits into the open chapter, and the cat marks the
boundary. It answers "how far into this am I" without a number to read, and
it carries no chord, takes no keyboard, and never moves on its own.

The cell is present at 1280 CSS pixels and above and absent below — the trail
and its accessible label appear together and are together absent, on the
maintainer's settlement that the cat is an optional feature relevant to large
screens (cond-2609100513433908). Nothing stands in for it at 820 or 390.

The intent's Mechanism made two claims and this spec confirms both. The first
is that the measure needs no new state: the caret's offset and the chapter's
length are both fields of the one `EditorState` the modeline already reads
through `cursorPosition`, so the trail is a function of two numbers Editor
already has. The second is the falsifiable one — that the modeline already
redraws on selection change, finely enough to track a moving caret. **It
does.** `src/editor.ts`'s `editorExtensions` ends in
`EditorView.updateListener.of((update) => { if (update.docChanged ||
update.selectionSet) hooks.onChange?.(update.view); })`; `src/app.ts` mounts
the surface as `createEditor(editorPane, WELCOME, { onChange: () => {
refresh(); } })`; and `refresh()` calls `modeline.update(view, …)`. Every
transaction that moves the caret runs that listener synchronously inside the
same CodeMirror update cycle, so the footer is redrawn before the frame the
caret moved in is painted. The intent's falsifier does not fire: the cat
walks, it does not jump, and it needs no subscription of its own.

There is one gap in that path, and it is the one the intent's chapter-switch
criterion lands on. `setDocument` replaces the whole state with
`view.setState(stateFor(…))`, and `EditorView.setState` builds no `ViewUpdate`
and runs no update listeners at all
(`node_modules/@codemirror/view/dist/index.js`, `setState`: it destroys and
rebuilds the plugins and the doc view directly and never constructs an
update). A chapter switch therefore does not redraw through the listener. It
is covered anyway, by `announce("")` on `openChapter`'s success path and
`announce(String(error))` on its failure path, both of which reach `refresh()`
— and this spec pins that with a test rather than leaving the coverage
accidental.

The contested thing here was width, and it is settled. The trail wants 64 to
132 CSS pixels of a footer whose message cell is already the tightest it has
ever been at 820 pixels — `MODELINE_BUDGET` is fifty-two characters and about
fifty of them fit there today, recorded as `iss-2609100445317801`. Two ways of
making room were put to the maintainer and both were declined: shrinking the
trail, and moving the message's own-line breakpoint from 520 to 820. **The cell
is present at 1280 CSS pixels and above and absent below.** The footer at 820
and at 390 is the footer it is today, character for character and pixel for
pixel.

That has a cost this spec states plainly rather than dressing up: the intent's
inherited "legible on three device classes" discipline is **not met** for this
element, and the criterion resting on it is **dropped**. The trail does not
shorten at 820 and 390; it is absent, and so is its accessible label — nothing
drawn and nothing announced. The intent carries the dated amendment
(`itd-2609081938397758`, 2026-09-10), and its assistive-technology criterion is
amended in the same pass to scope itself to the widths the element exists at,
rather than reading as a promise the build does not keep at 390.

The drop is recorded on two grounds, in this order. **Why the line falls at
1280** is the width budget above. **Why a drop is acceptable at all** is that
this is a decoration, not information the application depends on: the chapter,
the pane, the position, the prefix, the mark and the message all still say what
they say at every width, and what is missing below 1280 is a pleasure rather
than a fact. That second ground is the load-bearing one for whoever reads this
next, because it is the reason nothing stands in for the trail at narrow widths
and nothing should later be added to — not a shorter bar, not a number, not an
announcement carried by other means. § The cell is a wide-window cell sets out
the mechanism.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/editor.ts` | exists: `cursorPosition(view)`, the one function through which the modeline reaches into `view.state` | adds `chapterProgress(view)` beside it — the caret's offset as a fraction of the chapter's length, with the division and the zero-length guard done once, in one place |
| `src/modeline.ts` | exists: seven cells built by `cell()`, `createModeline`, `update(view, context)` | adds `TRAIL_STEPS`, `trailLabel(step)`, and one cell — a track, a trail, and an inline cat — inserted after `positionCell`; `update` computes the step and writes the cell only when the step changes |
| `src/style.css` | exists: `.modeline` flex row, six cell rules, one `@media (max-width: 520px)` block | adds `--trail-colours` to `:root` and to the dark block, `.modeline-progress`, `.modeline-track`, `.modeline-trail`, `.modeline-cat`, and one `@media (max-width: 1279px)` block holding a single `display: none`. The existing 520 block and every existing cell rule are untouched (cond-2609100513433908) — **amended 2026-09-10**: the trail's own additions are as stated, but this row's last sentence is not what shipped. The narrow-width block's breakpoint moves from 520 to 820 and `.modeline-message` and `.modeline-chapter` both gain declarations, for `iss-2609100445317801` and not for the cat; see § The cell is a wide-window cell |
| `src/modeline.test.ts` | does not exist: the modeline is tested through `emacs-keys.test.ts`, `focus.test.ts`, `document.test.ts` and `drop-target.test.ts` | new file: the measure, the endpoints, the quantisation, zero length, a region rather than a caret, scroll-independence, the write guard, the label, and the cells that must survive |
| `src/document.test.ts` | exists: the chapter open, reload and detach tests, which already mount a real `App` | one test: after a switch, the trail reads the new chapter's caret and length, not the previous one's |
| `docs/tutorial-your-first-talk.md` | exists: the paragraph introducing the modeline — "The bottom line of the window is the modeline. It names the chapter you are editing…" | one sentence naming the trail and saying it appears in a wide window, in the one place a reader is first told what the bottom line is; no how-to page owns it, because it answers no chord. The width condition has to be in the sentence, or a reader at 820 reads a page describing something their footer does not have |
| `.abcd/development/brief/07-intent-map.md` | exists: 38 rows, #39 claimed by `spc-2609091733494078`, #41 claimed by `spc-2609091733496272` | row 40 added, with its entry beside the others |

### Out

- The scroll position as the measure, which is what nyan-mode itself uses.
  The measure is the caret's offset within the open chapter and nothing else
  (cond-2609091733491196). Scrolling ahead to check a reference is not
  progress; the cat marks where the work is, not where the eye is.
- Progress through the whole document, across chapters
  (cond-2609091733491196). The chapter is the unit, and the sidebar already
  says which chapter of how many.
- Any motion at all: waving, playing, a step cycle, a CSS `transition` on the
  trail's width, an `animation`, a `requestAnimationFrame`, a timer, or a
  `prefers-reduced-motion` branch (cond-2609091733490147). Nothing here
  animates, so there is nothing to reduce; the trail's width and the cat's
  position change on the redraw the caret's own move already triggers, and at
  no other moment.
- The cat anywhere but the footer — a gutter marker, an overlay on the
  scrollbar, a decoration in the editing surface (cond-2609091733496338).
- The cat taking the keyboard, joining the pane cycle, answering a chord,
  carrying a `title` tooltip, or responding to a click
  (cond-2609091733494632). `src/modeline.ts`'s file header says every cell
  that stands for an action names that action's chord in its tooltip; this
  cell stands for no action, so it is the one cell built without a `title`,
  and it is not registered as a panel.
- Removing, shortening, or displacing any cell the footer already carries
  (cond-2609091733494632: "the footer keeps whatever it already says"). The
  pane, the chapter, the line and column, the prefix, the mark, the keymap
  warning and the message all stay, in their existing order, saying exactly
  what they say today.
- A percentage, a fraction, or any other number drawn in the cell
  (`itd-2609081938397758` § Why This Matters: "without a number she has to
  read"). The proportion is written in words in the cell's accessible label
  and nowhere on the screen.
- The tablet and the browser build (cond-2609091733497190: the platform is
  the desktop app, the Tauri 2 shell with the system web view, on macOS).
  Nothing here is shell-specific and nothing is guarded on it; the boundary
  is only that the pixels are proven on the desktop app and nowhere else.
- The cell below 1280 CSS pixels, drawing and label together
  (cond-2609100513433908). It is not shrunk, not stacked, not moved to a second
  line, not redrawn as a shorter bar, and not kept in the accessibility tree
  with the drawing hidden: it is absent, and the footer at 820 and at 390 keeps
  exactly the layout it has today. Nothing is announced there and nothing
  stands in for it, on the maintainer's settlement that the cat is an optional
  feature relevant to large screens — see § The cell is a wide-window cell.
- Any compensating mechanism at narrow widths (cond-2609100513433908): a
  percentage in the message cell, a shorter bar, a `title` tooltip, a chord
  that says the proportion on demand, or a screen-reader-only label. The
  progress is not information the application depends on, so its absence needs
  no substitute, and adding one would answer a question nobody asked.
- Any change to the footer's existing layout at any width
  (cond-2609100513433908). The `@media (max-width: 520px)` block keeps its
  breakpoint and its rules; `.modeline-message` keeps `flex: 1 1 auto` above it
  and `flex: 1 0 100%` below it; no cell gains `min-width`, `overflow` or
  `text-overflow`; `gap`, `padding` and `font-size` are unchanged. Both
  proposals that would have changed it — shrinking the trail to
  `clamp(48px, 6vw, 96px)` with the message ellipsised, and raising the
  message's own-line breakpoint from 520 to 820 — were put to the maintainer
  and declined. **Amended 2026-09-10.** What was declined was making room *for
  the cat* by either route, and that stands: neither proposal was taken, and the
  room was found by hiding the cell below 1280. The layout did change all the
  same, later the same day and for another cause — the breakpoint is 820,
  `.modeline-message` gains `min-width: min(52ch, 100%)` and `.modeline-chapter`
  gains `flex: 1 1 auto` below it — carried by this spec as
  `iss-2609100445317801`'s fix. See § The cell is a wide-window cell.
- Fixing `iss-2609100445317801`, the message budget's pre-existing marginality
  at 820. Out of scope here in both directions: this design neither closes it
  nor worsens it, because at 820 nothing is added to the drawn footer at all.
  **Amended 2026-09-10: no longer out of scope, and closed here.** The issue
  was reopened on review and found worse than captured — the width above the
  breakpoint was unbounded rather than marginal — and its two rules shipped in
  this spec's stylesheet change, which is why it carries
  `resolved_by.spec: spc-2609091733493366`. What remains true is the second
  half: the trail adds nothing to the drawn footer at 820 and 390, so nothing
  the cat does helps or harms the budget either way.
- Persisting anything. The trail is a pure function of the open state and is
  recomputed from it; nothing is written to `document.yaml`, to the settings
  store, or to `localStorage`.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| One source, always `itd-2609051336090390` | the caret is `view.state.selection.main.head` and the length is `view.state.doc.length`, read in `chapterProgress` in `src/editor.ts` — the same module and the same field `cursorPosition` reads for `L12:C34`, so the cat and the line-and-column cell cannot disagree about where the caret is. The division happens in that one function, so no caller can divide by zero differently. The drawn step is the one number the drawing, the label and the write guard all derive from, so the cell cannot say one thing and announce another. `src/modeline.test.ts` › "reads the caret from the same field the line-and-column cell reads" |
| Legible on three device classes `itd-2609051336128348` | **NOT MET for this element, and dropped** (`itd-2609081938397758` § Acceptance Criteria, amended 2026-09-10; cond-2609100513433908). The cell is present at 1280 CSS pixels and above and absent at 820 and 390, so there is nothing there to be legible and nothing to shorten. This is not restated as met by any other reading: a cell that is not drawn is not a cell that degrades. Why the line falls at 1280 is the footer's width budget, `iss-2609100445317801`; why the drop is acceptable is that the trail is a decoration and not information the application depends on, which is also why no substitute is provided at those widths. What *is* proven at the two narrow widths is that the footer is unchanged: `src/modeline.test.ts` › "keeps every cell the footer already carries, in order", and manual check M40-9 — **amended 2026-09-10** from a screenshot comparison against the 0.3.1 build to a reading of the footer's own information, because the baseline moved when this spec also carried `iss-2609100445317801`'s breakpoint fix; what M40-9 now checks at 820 and 390 is that no trail is drawn, every cell the footer owns is present, and a fifty-two-character message is unclipped |
| Reachable by assistive technology `itd-2609061324342715` | met at the widths the element exists at, which is what the intent's amended criterion now asks. At 1280 and above the cell is `role="img"` with an `aria-label` that states the proportion in words, and the trail and the cat are both `aria-hidden="true"`, so the cat is never announced as content. Below 1280 the cell is `display: none`, so it is out of the accessibility tree along with everything else about it, and nothing is announced — deliberately, and recorded in the criterion rather than left to be discovered. `src/modeline.test.ts` › "labels the trail as a proportion in words"; `src/modeline.test.ts` › "hides the cat and the trail from assistive technology"; real announcements are manual checks M40-4 and M40-9 |

## Design

### The measure, and the one place the division happens

`src/editor.ts` gains one exported function, directly beneath
`cursorPosition`, which is the function it is modelled on:

```ts
/**
 * How far into the chapter the caret sits, as a fraction of its length.
 *
 * The caret and not the scroll position (`itd-2609081938397758`,
 * cond-2609091733491196): scrolling ahead to check a reference is not
 * progress. `selection.main.head` rather than any other offset, because that
 * is the field `cursorPosition` above reads for the line and column, and the
 * footer must not carry two answers to where the caret is.
 *
 * An empty chapter is nought, not a division by zero: there is nowhere to be
 * in a document with no length, and the start is the honest place to draw.
 */
export function chapterProgress(view: EditorView): number {
  const { doc, selection } = view.state;
  if (doc.length === 0) return 0;
  return Math.max(0, Math.min(1, selection.main.head / doc.length));
}
```

One number out, not a pair. The alternative — returning `{ at, of }` and
leaving the caller to divide — puts the zero-length guard at every call site
and invites two callers to guard it differently; the intent has a criterion
about exactly that ("nothing divides by zero"), so the guard belongs where it
can only be written once. `cursorPosition` sets the precedent: it also returns
a derived shape rather than the raw state.

The clamp is belt and braces. `selection.main.head` is always within
`[0, doc.length]` for a selection CodeMirror itself produced, so the clamp can
only matter if a future caller hands in a state whose selection has not been
reconciled with its document. It costs two comparisons and removes a class of
`NaN` and out-of-range results from the drawing permanently.

### `main.head`, and what a region does

The intent asks where the caret is; a region has two ends and no obvious
single caret. `selection.main.head` settles it three times over:

- It is CodeMirror's own answer to "which range is the cursor": `main` is the
  range at `mainIndex`, the one whose head the surface draws the blinking
  caret at, and the one that moves when Alice presses `C-f`.
- It is the *moving* end. With a region set by `C-Space` and extended with
  `C-n`, the anchor stays put and the head travels; the cat follows the head,
  which is where Alice's attention is.
- It is the field `cursorPosition` already reads. If the cat used
  `selection.main.from`, or `selection.ranges[0].head`, or the anchor, then a
  region running backwards up the chapter would put the cat and the
  `L12:C34` cell in two different places in the same footer. That is the
  one-source discipline, not a preference.

A multi-range selection — CodeMirror allows several, and
`rectangularSelection()` is on the surface — collapses to the same answer:
`main` is the one range CodeMirror itself calls primary, and the cat follows
it. The other ranges are not averaged, not spanned, and not drawn.

### The redraw already exists, and this is the path

Named in full, because the intent made this the thing to falsify.

1. `src/editor.ts`, the last extension in `editorExtensions`:
   `EditorView.updateListener.of((update) => { if (update.docChanged ||
   update.selectionSet) hooks.onChange?.(update.view); })`. `selectionSet` is
   true for every transaction that carries a `selection`, which is every
   caret move — `C-f`, `C-n`, `M-}`, a click, a drag, `revealLine`,
   `placeCursor`, and the selection CodeMirror maps through a document change.
2. `src/app.ts`, where the surface is mounted: `createEditor(editorPane,
   WELCOME, { onChange: () => { refresh(); } })`.
3. `src/app.ts`, `refresh()`: `modeline.update(view, { pane, prefix, chapter,
   dirty, detached, message })`.

An `updateListener` runs inside `EditorView.update`, synchronously, after the
doc view has been updated and before control returns to the dispatch. So the
footer and the caret are redrawn in the same turn: there is no frame in which
the caret has moved and the cat has not, which is the intent's fifth
criterion, and no debounce, throttle or animation frame anywhere on the path.

Two things on this path deserve a note.

**There is already exactly one `updateListener` on the surface**, and this
spec adds none. The intent's own suggested remedy — "a CodeMirror
`updateListener` firing on every `selectionSet`" — is the listener that is
already there, doing already what it would have been added to do. A second one
would be a second answer to when the footer refreshes.

**`createEditor` also registers a `keydown` listener on `view.contentDOM`**
that calls `onChange` unconditionally, for the chords that change no state a
transaction carries (setting the mark, opening a prefix). It will recompute
the step on every keystroke that reaches the content. That is harmless and
costs nothing measurable — see § The cost this pays — and the write guard
below means it writes nothing when the step has not changed.

**The one gap, and what closes it.** `setDocument` calls
`view.setState(stateFor(…))`, and `EditorView.setState` runs no update
listeners: read in `node_modules/@codemirror/view/dist/index.js`, its body
destroys the plugins, builds a new `ViewState` and a new `DocView`, remounts
the styles and returns — it never constructs a `ViewUpdate`, so there is
nothing for a listener to be called with. A chapter switch therefore does not
reach `refresh()` through the listener, and without something else it would
leave the footer showing the previous chapter's step. Three things close it,
and all three already exist:

- `openChapter`'s success path ends in `announce("")`, and `announce` is
  `message = text; refresh();`.
- Its failure path ends in `announce(String(error))`, likewise.
- Its same-chapter-different-heading branch calls `refresh()` directly, after
  `revealLine`.

And on the ordinary path `revealLine` or `placeCursor` dispatches a real
transaction after `setDocument`, which reaches the listener as well. The
coverage is real but it is incidental — `announce("")` is there to clear a
message, not to redraw a cat — so this spec adds a test that fails if any of
it is refactored away, rather than trusting it.

### Twenty steps, and what "one drawn step" means

The cat's position is quantised before it is drawn:

```ts
/** How many positions the cat can take along the trail. */
export const TRAIL_STEPS = 20;
```

and in `update`:

```ts
const step = view ? Math.round(chapterProgress(view) * TRAIL_STEPS) : 0;
```

`Math.round`, so the drawn position is within half a step of the true
proportion, comfortably inside the intent's "to within one drawn step".

Twenty for three reasons, in ascending order of weight. It gives every label
a round number — each step is five per cent. It is fine enough that the
quantisation is invisible: one step of a 132-pixel bar is 6.6 pixels, and the
cat that marks the position is nearly fourteen. And it is coarse enough that
the cell writes nothing on almost every keystroke — on a chapter of N
characters one step is N/20 characters, so on a 40,000-character chapter a
single-character caret move changes the drawn step once in every two
thousand moves. That last is the cost gate; see below.

nyan-mode's own `nyan-bar-length` is 32. Thirty-two would buy no visible
precision — one step of a 132-pixel bar would be four pixels, well under the
cat's own width — and would cost sixty per cent more DOM writes for it.

What "to within one drawn step" means concretely, since it is a criterion and
not a slogan: the drawn step is one twentieth of the trail at every width the
cell exists at, because the fill is a percentage of the cell rather than a
count of pixels. The cell exists from 1280 upwards, where its width runs from
64 pixels (the `clamp` floor, reached only if the footer is inside a narrower
container than the window) through 115 at 1280 to the 132-pixel cap above about
1470. Across that range a step is between 3.2 and 6.6 pixels. So the criterion
is met by construction, and the honest caveat is that at the narrow end of the
cell's own range the eye reads the bar rather than the step, because the cat is
wider than a step — a property of a short bar, not of this design.

### The drawing: a track, a trail, and a cat that is not a file

The cell is three elements, built once in `createModeline` and never rebuilt:

```
<span class="modeline-progress" role="img" aria-label="…">
  <span class="modeline-track" aria-hidden="true">
    <span class="modeline-trail"></span>
  </span>
  <svg class="modeline-cat" viewBox="0 0 16 14" aria-hidden="true"
       focusable="false"> … </svg>
</span>
```

Everything that moves is driven by one CSS custom property, `--at`, a
unitless number between nought and one, set on the outer span and inherited by
the two children:

```css
.modeline-trail { width: calc(100% * var(--at, 0)); }
.modeline-cat   { left: calc(0.575em + (100% - 1.15em) * var(--at, 0)); }
```

So `update` writes one property, not two coordinates that could fall out of
step with each other. The cat's travel is inset by half its own width at each
end, which is what keeps it inside the cell at nought and at one while the
trail still runs from edge to edge.

**The cat is an inline SVG, drawn in `currentColor`, built with
`createElementNS` in `src/modeline.ts`.** No file is fetched at runtime and
nothing is added to the asset pipeline; the whole drawing is under three
hundred bytes of markup in the module that draws it:

```
<g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round">
  <path d="M3.4 6.2 4.3 1.6 7.6 3.6"/>
  <path d="M12.6 6.2 11.7 1.6 8.4 3.6"/>
  <circle cx="8" cy="8" r="4.6"/>
</g>
<circle cx="6.3" cy="7.2" r="0.9" fill="currentColor"/>
<circle cx="9.7" cy="7.2" r="0.9" fill="currentColor"/>
```

An outline head with two open ears and two filled eyes. Outline rather than
silhouette because the cat sits over the trail at one end of its travel and
over the empty track at the other, so it cannot punch eye-holes in a fixed
colour and have them work at both ends; an outline lets whatever is behind it
show through the head, and the two eye dots are `currentColor` in both cases.

The alternative considered and declined is an emoji — `🐱` in a span, no SVG
at all. It was declined on three counts. The codebase carries no emoji
anywhere in `src/` today, and a colour-font glyph would be the only coloured
mark in a footer whose every other mark is `currentColor`. Its size, baseline
and metrics belong to Apple Color Emoji rather than to Editor, so it cannot be
made to sit on an 8-pixel bar reliably. And it does not follow the theme: it is
the same colour on paper and in the dark, which the rest of the footer is not.

The cat is sized in `em` — `1.15em`, or 13.8 pixels at the footer's 12px —
rather than in pixels, so it stays in proportion to the line it sits on if the
footer's type is ever changed. It does not have to survive the 11px the footer
drops to at 520 and below (amended 2026-09-10: at 820 and below, since
`iss-2609100445317801` moved the breakpoint — which changes the width, not the
conclusion), because the cell does not exist at that width
(cond-2609100513433908); sizing it in `em` is cheap correctness, not a
requirement this design has to meet.

### Legible without colour

The trail is a six-band rainbow. The criterion is that a reader who cannot
distinguish the bands still sees a bar filled to a proportion, so the fill has
to read as a fill in greyscale, by luminance and not by hue.

Three things carry it, and any one of them alone would do:

- **The track is `--paper` inside a one-pixel `--rule` border; the trail is a
  set of mid-tone bands.** In the light theme `--paper` is `#fdfcfa` and every
  band sits between roughly ten and twenty per cent relative luminance, giving
  the fill boundary a contrast ratio of at least 4:1 — above the 3:1 WCAG 1.4.11
  asks of a non-text boundary, at the weakest band. The dark theme uses a
  second, lighter set of bands over a `#1a1917` track, for the same reason in
  the other direction; a single mid-tone set would have put the violet band at
  about 2.2:1 against the dark paper, which is why there are two.
- **The cat marks the boundary in `--ink` on a `--shell` disc**, so the exact
  position is carried by the highest-contrast mark in the cell — about 13:1 in
  either theme — and does not depend on the fill being distinguishable at all.
- **The border draws the whole track**, so the bar's full extent is visible
  even where the fill is nought and there is nothing to compare against.

The two band sets are one declaration each, as a custom property holding the
gradient stops, beside the existing `--ink`/`--paper`/`--rule` pair in `:root`
and in the `@media (prefers-color-scheme: dark)` block that already follows it:

```css
:root { --trail-colours: #b8402f, #a86a1f, #8a7a18, #2f7a45, #2b5f92, #63407f; }
@media (prefers-color-scheme: dark) {
  :root { --trail-colours: #e07a68, #dda05a, #d6c65e, #6fbf85, #6aa4d8, #a98ad0; }
}
```

jsdom has no colour and no layout, so none of this is testable in Vitest; the
contrast is asserted here from the values and confirmed by eye and by a
greyscale screenshot in manual check M40-3. That is the same division of
labour `MODELINE_BUDGET`'s own comment already draws.

### What assistive technology hears

The footer carries no ARIA at all today: `<footer class="modeline">` and seven
plain spans, with no `aria-live`, no roles, and `title` tooltips on the cells
that stand for an action. So there is nothing here to fit into and nothing to
break. The nearest house precedent is `src/sidebar.ts`'s citation badges,
which carry a plain `aria-label` spelling out what the badge's glyph means
(`"1 citation: nosuchkey"`); this cell follows that pattern.

```ts
progressCell.setAttribute("role", "img");
progressCell.setAttribute("aria-label", trailLabel(step));
```

with the trail and the cat both `aria-hidden="true"`, set once at build time.
`role="img"` collapses the three elements into a single labelled graphic: the
label is read, and the cat is not announced as content — which is the
criterion, both halves of it, in one attribute pair.

The label comes from the step and from nothing else, so the words and the
drawing can never disagree:

```ts
/** The proportion in words, from the step the cell is drawn at. */
export function trailLabel(step: number): string {
  if (step <= 0) return "Start of the chapter";
  if (step >= TRAIL_STEPS) return "End of the chapter";
  return `${String(step * (100 / TRAIL_STEPS))} per cent through the chapter`;
}
```

The two ends are words rather than "0 per cent" and "100 per cent" because
they are two of the intent's criteria in their own right, and because a
chapter of zero length lands on the first of them, which is the honest thing
for it to say. Every other step is a multiple of five.

That split is settled, and it resolves a real tension in the intent rather
than dodging one. The intent's own criterion asks for the progress to be
"announced as a proportion in words"; its Why This Matters asks for the
question answered "without a number she has to read". Read strictly, those two
pull opposite ways. `trailLabel` is the reading that serves both: words carry
the two positions an author actually notices and remarks on — the start and
the end — and a number carries the middle, where words go vague and a
five-per-cent step is the more useful thing to hear. Quantising the number to
the same twenty steps the drawing uses is what keeps it a single source: the
label cannot say a proportion the bar is not drawn at.

A fully verbal scale — "a third of the way", "halfway", "nearly at the end" —
was considered and declined. It honours the Why more literally, but it needs a
second vocabulary mapped onto the twenty steps, and a bucket boundary that does
not fall on a step is a place the words and the drawing can disagree. If it is
ever wanted, it must be derived from the step inside `trailLabel` and not from
the fraction.

`MODELINE_BUDGET` does not apply. That budget is fifty-two characters of
*visible* text on the message cell's own line at 390 pixels; an `aria-label` is
not drawn and is not clipped, and the longest label here is thirty-one
characters in any case.

`role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
and `aria-valuetext` was considered and declined. It is the semantically
precise role, but it is a widget role: screen readers list it among controls,
some announce a value change as a live update, and the intent is explicit that
this is decoration that must never behave like a pane
(cond-2609091733494632). `role="img"` is the quiet reading, and it matches
what the rest of the application already does.

All of this describes the cell where the cell exists, which is 1280 CSS pixels
and above. Below that there is no cell and nothing is announced; the next
section says why, and why nothing is put in its place.

### The cell is a wide-window cell

This is the one place the cat would have taken something from a cell that
already exists, so the arithmetic is set out rather than asserted, and then the
settlement that follows from it.

**Amended 2026-09-10 — the breakpoint moved anyway, and not for the cat.**
This section, and § Out and § Risks with it, read as though the message's
own-line breakpoint stayed at 520. It did not: the delivered stylesheet moves
it to 820. **The maintainer's decision was not reversed.** What was put to
them and declined was moving the breakpoint *as a way of making room for the
cat*, and that answer stands — the room was found instead by hiding the cell
below 1280 (cond-2609100513433908), which is exactly what shipped. A different
question was then asked and answered later the same day.
`iss-2609100445317801`, reopened on review, found that above the breakpoint the
message's width was not merely marginal but **unbounded**: the message shared
its line with the chapter title, and no cell but the message could shrink, so a
sixty-character title at 821 pixels left the message no room at all and pushed
the line sideways. That is a defect in the footer as 0.3.1 ships it, present
whether or not a cat is ever drawn. Its fix is two rules — the own-line
breakpoint moves from 520 to 820, the sidebar's own number so that one width
answers for both, and above it `.modeline-message` carries
`min-width: min(52ch, 100%)` while the chapter title becomes the cell that
yields — and `iss-2609100445317801` names this spec as the fix that carried
them (`resolved_by.spec`). So the reconciliation belongs here rather than
standing as a contradiction (`iss-2609100647546880`).

Two consequences run through the rest of this document and are corrected once,
here. **The budget is no longer "only actually guaranteed at 520 and below".**
It is guaranteed at every width: by the `min(52ch, 100%)` floor above 820 and
by the message's own line at 820 and below, with `src/prose.test.ts` reading
the stylesheet and asserting that the floor's `ch` value is `MODELINE_BUDGET`
so the two cannot drift. **And the 520 block is not untouched.** It is the 820
block now, and `.modeline-message` and `.modeline-chapter` both gained
declarations. What remains true, and is the load-bearing claim, is that the
trail itself adds nothing to the drawn footer below 1280: the one-line
`@media (max-width: 1279px)` block is the whole of the cat's effect at 820 and
390, and it neither helps nor harms the message.

The footer is `display: flex` with `gap: 16px` and `padding: 4px 12px`, in a
12px monospace where a character advances about 7.2 pixels. At 820 CSS pixels
there are 796 pixels of content and seven gaps, 112 pixels of them. The state
cells, with a chapter title of ordinary length, come to roughly: pane
`[Editor]` 58, chapter `-- 01-the-lantern.md` 145, position `L120:C48` 58,
prefix 29, mark 29 — about 319 pixels. That leaves about 365 pixels for the
message, which is roughly fifty characters at that size.

**`MODELINE_BUDGET` is fifty-two.** So the budget is already marginal at 820
before this spec adds anything, and it is only actually guaranteed at 520 and
below, where `.modeline-message { flex: 1 0 100%; }` gives the message a line
of its own. That is what the budget's own comment says it is for — "one line
at 390 CSS pixels, which is the narrowest window the shell allows" — and 820
was never the width it was derived at. It is captured as
`iss-2609100445317801`, and this spec neither fixes it nor makes it worse.
*Amended 2026-09-10: this paragraph is the arithmetic as it stood when the
width question was settled, and both of its conclusions are superseded. The
message's share above the breakpoint was not "roughly fifty characters" but
whatever a chapter title left of it, which a long title makes nothing; and this
spec does fix it, having carried `iss-2609100445317801`'s two rules. See the
amendment at the head of this section.*

A trail at `clamp(64px, 9vw, 132px)` is 74 pixels at 820, plus its gap. Added
to the row above, the message's share would drop to about 275 pixels, or
thirty-eight characters, and a fifty-two-character refusal would clip. Two ways
of making room were put to the maintainer and both were declined:

- shrinking the trail to `clamp(48px, 6vw, 96px)` and ellipsising the message
  at all widths, which gives up on the fifty-two characters at 820; and
- raising the message's own-line breakpoint from 520 to 820, which protects the
  budget at every width but changes a shipped surface at a width this intent
  did not ask about.

**What was settled instead is that the cell is present at 1280 and above and
absent below** (cond-2609100513433908). The footer at 820 and at 390 is
byte-for-byte the footer that ships today: the 520 block keeps its breakpoint
and its rules, `.modeline-message` keeps `flex: 1 1 auto` above it and `flex: 1
0 100%` below it, and no existing cell gains a property. *Amended 2026-09-10:
the settlement stands and the cell is present at 1280 and above and absent
below, exactly as this says. The sentence after it does not: the block moved to
820 and `.modeline-message` and `.modeline-chapter` both gained declarations,
for `iss-2609100445317801` and not for the cat. What is byte-for-byte unchanged
below 1280 is the trail's own contribution, which is nothing. See the amendment
at the head of this section.*

The mechanism is one line:

```css
/* An optional pleasure on a large screen (cond-2609100513433908). Below 1280
   the footer's own information wins the space, and nothing stands in for the
   trail: `display: none` and not a clip, so the cell leaves the accessibility
   tree with the drawing rather than announcing a proportion nobody can see. */
@media (max-width: 1279px) {
  .modeline-progress { display: none; }
}
```

`display: none` and not the screen-reader-only clip recipe, deliberately, and
this is the one place the two settlements meet. A clipped cell would stay in
the accessibility tree and keep announcing the proportion at 820 and 390, which
was the earlier recommendation on the grounds that an `aria-label` costs no
pixels and the reason for the drop was pixels. The maintainer settled it the
other way: the cat is an optional feature relevant to large screens, so the
drawing and the label appear together and are together absent. The reasoning
that makes that the better answer, rather than merely the chosen one, is the
second ground for the drop — the trail is a decoration, and a decoration
absent from a narrow window is a feature that is not there, not an accessible
name withheld from a feature that is. Announcing a bar nobody can see would be
describing furniture that is not in the room.

`display: none` also costs nothing and cannot go wrong: the flex `gap` of a
`display: none` item is not laid out, so there is no residual 16 pixels to
cancel and no negative-margin correction to get wrong at one width and not
another. It is the same mechanism `.sidebar[data-open="no"]` already uses at
820, so the file carries one way of removing a thing and not two.

Above 1280 nothing competes: there are 1256 pixels of content, the state cells
and the trail take about 505 of them, and the message keeps 640 — about
eighty-eight characters, well clear of the budget.

The one honest loose end is that 1280 is a boundary and boundaries are visible.
A window dragged across it gains or loses the cat, and the other cells shift by
the trail's width plus a gap as it appears. That is the same class of
discontinuity the sidebar already has at 820, where it changes from a column to
a drawer, and it is not smoothed here: a transition would be motion
(cond-2609091733490147). Manual check M40-1 looks at the boundary crossing
directly rather than leaving it to be noticed later.

### The full CSS

```css
/* The trail through the chapter, and the cat at its head
   (`itd-2609081938397758`). Decoration carrying one fact: how far into the
   chapter the caret sits. It stands for no action, so unlike every other cell
   it carries no chord in a tooltip; and nothing here transitions or animates
   (cond-2609091733490147) — the cat moves on the redraw the caret's own move
   already causes, and at no other moment. */
.modeline-progress {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  width: clamp(64px, 9vw, 132px);
  height: 1.15em;
}

.modeline-track {
  width: 100%;
  height: 8px;
  overflow: hidden;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 4px;
}

.modeline-trail {
  width: calc(100% * var(--at, 0));
  height: 100%;
  background: linear-gradient(90deg, var(--trail-colours));
}

/* On a disc of the footer's own background, so the cat is `--ink` on
   `--shell` wherever along the trail it has got to — the highest-contrast
   mark in the cell, and the one that carries the position when the rainbow
   cannot be told apart. */
.modeline-cat {
  position: absolute;
  top: 50%;
  left: calc(0.575em + (100% - 1.15em) * var(--at, 0));
  width: 1.15em;
  height: 1.15em;
  color: var(--ink);
  background: var(--shell);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

/* An optional pleasure on a large screen (cond-2609100513433908). Below 1280
   the footer's own information wins the space and nothing stands in for the
   trail: `display: none`, so the cell leaves the accessibility tree with the
   drawing rather than announcing a proportion nobody can see. The footer at
   820 and at 390 is exactly the footer it was before this cell existed —
   `iss-2609100445317801`'s message budget is neither helped nor harmed. */
@media (max-width: 1279px) {
  .modeline-progress {
    display: none;
  }
}
```

Everything above the last block is inside the `1280`-and-wider case by
construction, because that is the only case the cell is laid out in. No
existing rule in the file is edited: the four `.modeline-*` rules and the two
`--trail-colours` declarations are additions, and the `@media (max-width:
520px)` block is untouched. *Amended 2026-09-10: true of the trail, which
edits no existing rule; not true of the file, which the
`iss-2609100445317801` fix also changes — the narrow-width block's breakpoint
is 820 and two cell rules gain declarations there. The comment quoted in the
block above is the one this spec proposed; the delivered comment says the
footer below 1280 is the footer it was before the cell existed, which the
breakpoint move makes stale, and correcting it is `iss-2609100647546880`'s
remaining thread rather than this amendment's. See § The cell is a wide-window
cell.*

### The cost this pays

The cell is recomputed on every caret move and on every keystroke that reaches
the content. What that costs, per call to `modeline.update`:

- `chapterProgress(view)`: two property reads. `state.selection.main` indexes
  `ranges[mainIndex]`; `state.doc.length` is a stored field on the `Text`
  tree's root node. Both are O(1) and neither allocates. Then one divide, two
  comparisons for the clamp.
- One multiply and one `Math.round`.
- One integer comparison against the step last drawn.

And nothing else, in the overwhelming majority of calls, because of the guard:

```ts
if (step !== drawnStep) {
  drawnStep = step;
  progressCell.style.setProperty("--at", String(step / TRAIL_STEPS));
  progressCell.setAttribute("aria-label", trailLabel(step));
  progressCell.dataset["step"] = String(step);
}
```

Three DOM writes when the step changes, none when it does not. On a chapter of
N characters, a single-character caret move changes the step at most once in
every N/20 moves: once in two thousand on a forty-thousand-character chapter,
once in fifty on a thousand-character one. No layout is read — no
`getBoundingClientRect`, no `offsetWidth`, no `getComputedStyle` — so nothing
here can force a synchronous reflow, and the three writes are all property or
attribute sets that the engine batches with the rest of the frame.

The guard is sound because everything drawn is a function of the step alone:
the trail's width, the cat's position and the words in the label all come from
`step`, so two calls at the same step must produce the same cell, whatever
else changed between them — including a chapter switch that happens to land on
the same step, where the cell would be identical anyway.

Set against what `modeline.update` already does on the same call:
`cursorPosition(view)` calls `state.doc.lineAt(head)`, a descent of the
document's B-tree, on every refresh; and `packageKeymapInstalled()` runs on
every refresh too, deliberately. The trail costs strictly less than the cell
beside it already costs, adds no subscription, no listener, no timer and no
animation frame, and removes nothing.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| Caret at the chapter's start → the cat sits at the left end of the trail and no trail is drawn behind it | `src/modeline.test.ts` › "draws the cat at the left end and no trail behind it with the caret at the start" (`data-step` is `0`, so `--at` is `0` and the trail's width is `calc(100% * 0)`) |
| Caret at the chapter's end → the cat sits at the right end and the trail spans the whole width | `src/modeline.test.ts` › "fills the trail and puts the cat at the right end with the caret at the end" (`data-step` is `TRAIL_STEPS`) |
| Caret at a known offset → the cat's position is that offset as a proportion of the chapter's length, to within one drawn step | `src/modeline.test.ts` › "puts the cat within one drawn step of the caret's proportion", which sweeps a chapter at every tenth offset and asserts `Math.abs(step / TRAIL_STEPS - at / of) <= 1 / TRAIL_STEPS` |
| Caret unmoved, the chapter scrolls → the cat does not move | `src/modeline.test.ts` › "keeps the cat where it is when the view scrolls and the caret does not": a transaction carrying only `EditorView.scrollIntoView` has `selectionSet` false, so `onChange` is not called at all, and a direct `update` on the same state redraws the same step. Structurally, the cell reads `selection.main.head` and `doc.length` and no scroll changes either. Real scrolling is M40-2 |
| Alice moves the caret; when the modeline redraws, the cat has moved with it in the same redraw — the footer never shows a stale position | `src/modeline.test.ts` › "moves the cat in the same redraw as the caret, with no timer advanced": mounts a real `App`, moves the caret with `M->`, and reads `data-step` immediately, with no `vi.advanceTimersByTime` and no microtask flush. The path is `src/editor.ts`'s `updateListener` on `selectionSet` → `src/app.ts`'s `onChange` → `refresh()` → `modeline.update`, all synchronous inside `EditorView.update` |
| A chapter of zero length → the cat is drawn at the start and nothing divides by zero | `src/modeline.test.ts` › "draws the cat at the start of an empty chapter and divides by nothing" (`data-step` is `0`, the label is `Start of the chapter`, and `chapterProgress` returns a finite `0` rather than `NaN`) |
| A switch to another chapter → the cat reflects the new chapter's caret and length, not the previous one's | `src/document.test.ts` › "shows the newly opened chapter's progress, not the one before it": opens a long chapter, moves to its end, opens a short one, and reads the cell. `setDocument`'s `view.setState` runs no update listener (`node_modules/@codemirror/view/dist/index.js`, `setState`), so this is proven through `openChapter`'s own `announce("")` → `refresh()`, which the test pins |
| At 1280 CSS pixels or wider, read by assistive technology → the progress is announced as a proportion in words, and the cat is not announced as content (amended 2026-09-10 to scope itself to the widths the element exists at) | `src/modeline.test.ts` › "labels the trail as a proportion in words" (`role="img"`, and `aria-label` reading `Start of the chapter`, `35 per cent through the chapter`, `End of the chapter` at three offsets); `src/modeline.test.ts` › "hides the cat and the trail from assistive technology" (both children carry `aria-hidden="true"`, and the cell carries no `title`). Real VoiceOver output at 1280 is M40-4; that nothing is announced at 820 and 390 is M40-9. jsdom applies no media queries, so the width half of this is manual by necessity, exactly as `src/focus.test.ts`'s own file header already says of the drawer |
| The cell is present at 1280 and above and absent below, drawing and label together, with nothing standing in for it (cond-2609100513433908) | not reachable in Vitest: jsdom has no layout and evaluates no media queries, so the cell is in the DOM at every width under test and only a real engine can prove the rule. Manual check M40-9, which reads the footer and runs VoiceOver over it at 820 and 390. What Vitest does prove is that nothing else was disturbed: `src/modeline.test.ts` › "keeps every cell the footer already carries, in order" |
| Inherits: one source, always (met); legible on three device classes (**NOT MET, dropped** — see Disciplines inherited); reachable by assistive technology (met at the widths the element exists at) | see Disciplines inherited, above |
| The footer keeps whatever it already says (cond-2609091733494632) | `src/modeline.test.ts` › "keeps every cell the footer already carries, in order": asserts the eight class names in document order and that the pane, chapter, position, prefix, mark, keymap and message cells still say what the existing tests in `emacs-keys.test.ts` and `focus.test.ts` expect of them |
| The cell writes nothing when the caret moves inside one drawn step (the cost gate) | `src/modeline.test.ts` › "writes nothing to the cell when the caret moves inside one drawn step": counts `setAttribute` and `style.setProperty` calls on the cell through a spy across a run of single-character moves on a long chapter, and asserts the count is nought |

Manual checks, run with `npm run tauri dev` and recorded as an unticked list
in `.abcd/.work.local/logs/acceptance/spc-2609091733493366.md`:

- **M40-1** — the pixels at 1280, and the boundary: the trail is drawn, the cat
  is recognisably a cat, nothing scrolls sideways, and the footer's other cells
  are where they were. Then drag the window across 1280 in both directions and
  watch the cell appear and disappear.
- **M40-2** — the caret and the eye: scroll a long chapter with the trackpad,
  with `M-v`, and with the scrollbar, without moving the point; the cat does
  not move. Then move the point and watch it walk rather than jump.
- **M40-3** — colour: the fill boundary is visible in a greyscale screenshot,
  in both the light and the dark theme, at every position along the bar.
- **M40-4** — VoiceOver at 1280: the cell is announced once as its label, the
  cat is not announced, and moving the caret does not spam the announcement.
- **M40-9** — the footer below 1280 is the footer it ships today, and silent:
  at 820 and 390 nothing of the cell is drawn, a fifty-two-character message is
  unclipped exactly as it is today, and VoiceOver announces no progress at all.
  **Amended 2026-09-10**: "the footer it ships today" is no longer the test,
  because this spec also carried `iss-2609100445317801`'s breakpoint fix and the
  0.3.1 baseline moved. What the row checks now is the footer's own information
  — no trail drawn, every cell present, a fifty-two-character message unclipped
  and on its own line, and no progress announced.

## Tasks

1. Add `chapterProgress(view)` to `src/editor.ts`, beneath `cursorPosition`,
   with the zero-length guard and the clamp.
   Verify: `npx vitest run src/modeline.test.ts -t "within one drawn step"`.
2. Add `TRAIL_STEPS`, `trailLabel(step)`, and the progress cell to
   `src/modeline.ts` — the outer span with `role="img"`, the track, the trail,
   and the inline SVG cat, inserted between `positionCell` and `prefixCell` —
   and the step computation and write guard in `update`.
   Verify: `npx vitest run src/modeline.test.ts`.
3. Add `--trail-colours` to `:root` and to the dark block in `src/style.css`,
   and the four `.modeline-*` rules.
   Verify: `npm run lint` (eslint and `tsc --noEmit`; the CSS itself is
   proven by M40-1 and M40-3).
4. Add the `@media (max-width: 1279px)` block with its single
   `.modeline-progress { display: none; }`, and confirm by diff that the
   `@media (max-width: 520px)` block and every existing `.modeline-*` rule are
   untouched.
   Verify: `git diff src/style.css` shows additions only below the existing
   cell rules and no edit inside the 520 block; then M40-9.
   **Amended 2026-09-10**: the narrow-width block was edited after all, by the
   `iss-2609100445317801` fix this spec went on to carry — its breakpoint is
   820 and `.modeline-message` and `.modeline-chapter` both gain declarations.
   The diff to confirm is that no edit is made *for the trail* outside the
   one-line 1279 block; M40-9 checks the footer's own information rather than
   sameness against 0.3.1. See § The cell is a wide-window cell.
5. Write `src/modeline.test.ts` with the ten tests named in Acceptance
   Mapping, and the one new test in `src/document.test.ts`.
   Verify: `npx vitest run src/modeline.test.ts src/document.test.ts`.
6. Add the sentence to `docs/tutorial-your-first-talk.md`, where the modeline
   is introduced, naming the trail and saying it appears in a wide window.
   Verify: `npm run lint` (the docs-currency check reads the page).
7. Add row 40 and its entry to `.abcd/development/brief/07-intent-map.md`.
   Verify: read-through; no automated check covers prose intent-map text.
8. Write the manual acceptance checklist and run the full gate list.
   Verify: `npm test && npm run lint && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo fmt --manifest-path src-tauri/Cargo.toml --check`.

## Risks and Open Questions

**Nothing in this spec is blocked. Both of the questions it opened have been
settled and are recorded below as settled rather than left as risks.**

- **Settled 2026-09-10 — the cell is a wide-window cell.** The trail and its
  accessible label are present at 1280 CSS pixels and above and together absent
  below (cond-2609100513433908), on the maintainer's settlement that the cat is
  an optional feature relevant to large screens. Both alternatives were
  declined: shrinking the trail with the message ellipsised, and raising the
  message's own-line breakpoint from 520 to 820. The consequence is stated
  rather than softened — the "legible on three device classes" discipline is not
  met for this element and its criterion is dropped, and the intent's
  assistive-technology criterion is scoped to the widths the element exists at.
  Task 4 is a one-line media query and is unblocked.
- **`MODELINE_BUDGET` was already marginal at 820 before this spec, and is
  captured as `iss-2609100445317801`.** About fifty characters of a
  fifty-two-character budget fit there today with a chapter title of ordinary
  length, and fewer with a long one; the budget is only actually guaranteed at
  520 and below, where the message takes its own line. **This design
  deliberately neither fixes it nor makes it worse**: at 820 and 390 nothing is
  added to the drawn footer at all, so the message's share is what it is today
  to the pixel, and M40-9 confirms it by reading a fifty-two-character message
  at both widths. The issue is why the 1280 line exists; closing it is separate
  work and is not part of this build. **Settled 2026-09-10 — it was closed
  here after all, and for a reason this bullet did not know.** Re-read on
  review, the budget above the breakpoint turned out to be unbounded and not
  marginal: the message shared its line with the chapter title and no cell but
  the message could shrink. The fix is two rules, the breakpoint at 820 and a
  `min(52ch, 100%)` floor above it with the title yielding, and it landed in
  this spec's stylesheet change. The budget is now guaranteed at every width,
  and `src/prose.test.ts` reads the stylesheet and asserts the floor's `ch`
  value is `MODELINE_BUDGET` so the two cannot drift. The maintainer's
  settlement about the cat is untouched by this: the cell is still present at
  1280 and above and absent below. See § The cell is a wide-window cell.
- **The colour work is asserted, not measured.** jsdom has no layout and no
  colour, so the contrast ratios in § Legible without colour are computed from
  the hex values and confirmed by eye in M40-3. That is the same division
  `MODELINE_BUDGET`'s own comment draws between a budget and a measurement,
  and it is the limit of what the automated gates can reach.
- **The chapter-switch coverage is incidental until the test pins it.**
  `openChapter` calls `announce("")` to clear a message, not to redraw a cat;
  it happens to close the gap `view.setState` leaves. The test named in
  Acceptance Mapping is what stops a future refactor of `announce` silently
  leaving the footer showing the previous chapter's step, and it is worth a
  comment in the test saying so.
- **The cat is a drawing and drawings are taste.** The SVG in § The drawing is
  a specification of *a* cat, not the last word on which cat; the maintainer
  may want a different one, and swapping the five shapes changes nothing else
  in this spec. What is load-bearing is that it is inline, `currentColor`,
  sized in `em`, and `aria-hidden` — not the particular curve of the ears.
- **Settled 2026-09-10 — the label splits the difference, as specced.** Words
  at both ends, a rounded percentage between, quantised to the same twenty
  steps so the number is always a multiple of five. The tension it resolves is
  the intent's own: its criterion asks for "a proportion in words" while its
  Why This Matters asks for the question answered "without a number she has to
  read", and read strictly those pull opposite ways. This is the reading that
  serves both — the words handle the two positions an author actually notices,
  the start and the end, and the number handles the middle, where words go
  vague. Quantising to the drawn step is what keeps it one source: the label
  cannot say a proportion the bar is not drawn at. Set out in full in § What
  assistive technology hears, along with the fully verbal scale that was
  considered and declined.
- **The 1280 boundary is a visible discontinuity, and is left visible.** A
  window dragged across it gains or loses the cat, and the neighbouring cells
  shift by the trail's width plus a gap. It is not smoothed, because a
  transition would be motion (cond-2609091733490147), and it is the same class
  of jump the sidebar already makes at 820. M40-1 looks at the crossing
  directly so it is seen rather than reported later as a surprise.
- **No new plumbing and no new dependency.** Every call this spec makes —
  `view.state.selection.main.head`, `view.state.doc.length`,
  `document.createElementNS`, `style.setProperty`, `setAttribute` — is either
  already in the codebase or a platform primitive. The genuinely new code is
  one function in `src/editor.ts`, one cell and one guard in
  `src/modeline.ts`, and four rules, two custom-property declarations and one
  media query in `src/style.css`.
