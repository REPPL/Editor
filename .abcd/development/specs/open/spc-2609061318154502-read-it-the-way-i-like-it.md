---
id: spc-2609061318154502
slug: read-it-the-way-i-like-it
intent: itd-2609051335492327
origin: researcher-authored
production_mode: dictated-and-formatted
---
# read-it-the-way-i-like-it

## Summary

This spec delivers map #10, `itd-2609051335492327`: a small toolbar the
article page's own script builds at load, offering theme (light, dark,
sepia), text size (smaller, default, larger), measure (narrow, normal, wide)
and a reset. Each choice sets the CSS custom properties
`spc-2609061318090042` already declares on the root element — plus one
`data-article-theme` attribute the two new palettes answer — so the
stylesheet, not this script, decides what a colour, a font size or a line
width is. A reader's choice is kept in `localStorage` under one key, wrapped
in `try`/`catch` so a browser that refuses storage still applies it for the
visit and shows no error; reset clears the stored value and returns every
property to the article's own defaults. Everything lands in one new file,
`src/core/render/article-controls.js`, and its own section of
`src/core/render/article.css` — exactly the plug-in seam `spc-2609061318090042`
reserved for this map — plus one additive `<script>` line wherever the
article's scripts are already linked (`src/publish/build.ts`,
`src/export/services.ts`, `src-tauri/src/publish/stage.rs`, `preview.html`).
No request this script makes ever carries a preference, because it makes
none: no `fetch`, no `XMLHttpRequest`, proven by a test that spies on both
across every control and the reset. Every control is a native `<button>`
inside a `<fieldset>`/`<legend>` group, with `aria-pressed` carrying its
state and a non-colour marker (weight and a leading mark) beside it, per
`itd-2609061324342715`.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/core/render/article-controls.js` | absent | new: the toolbar, the three controls, the reset, `localStorage` read/write/clear wrapped in `try`/`catch`, and the `ArticlePage.register` seam `spc-2609061318090042` declares (with a standalone `DOMContentLoaded` fallback for a test, or a page, that loads this file with no `ArticlePage` on it) |
| `src/core/render/article-controls.test.ts` | absent | new: every criterion below a jsdom test can reach, over a synthetic fixture built through `articleDocument` |
| `src/core/render/article.css` | carries `spc-2609061318090042`'s own rules, and a comment reserving a section for this map | adds one section, below the existing "later maps register here" comment: the `dark`/`sepia` palettes as `:root[data-article-theme="…"]` overrides, and the toolbar's own layout, button, pressed-state and focus rules |
| `src/publish/build.ts` | `articleDocument` links `article-video.js` | one additive line: `<script src="${chrome}/article-controls.js" defer></script>`, after the video script tag |
| `src/export/services.ts` | `FOLDER_CHROME_FILES.article` names the stylesheet and the video script | one additive entry: `${FOLDER_CHROME}/article-controls.js` |
| `src-tauri/src/publish/stage.rs` | `CHROME` names the stylesheet and the video script by `include_str!`; `chrome_for_folder("article")` names both | one additive `CHROME` entry (array size 10 → 11) and one additive name in `chrome_for_folder`'s `"article"` arm |
| `src-tauri/src/export.rs` | two tests hard-code the article chrome as two files | both updated to the three files (alphabetical: `article-controls.js` sorts before `article-video.js`, whose hyphen sorts before `article.css`'s dot) |
| `preview.html` | links `article-video.js` as `type="module"`, for the reason `spc-2609061318090042`'s Design section records | one additive `<script type="module" src="/src/core/render/article-controls.js" defer></script>`, after the video tag |
| `src/local-documents.test.ts` | `INTERACTION_CHECKS` carries one entry, for video, and a comment naming map #10 as pending | one additive entry: the toolbar builds itself, a control is reachable by a native button and updates `aria-pressed` and `localStorage`; the "pending" comment drops map #10 |
| `docs/how-to-preview-and-read-the-article.md` | describes the page with no reader controls | one additive section, "Reading it the way you like it" |

### Out

- The default page map #9 (`itd-2609051335489928`) owns: the layout, the <!-- cond: cond-2609061318156014 -->
  default measure, where a margin note sits, the contents list, images and
  video in the flow. This spec touches no selector `spc-2609061318090042`
  already wrote, and reads or writes only the six custom properties and the
  one data attribute that spec's own Design section names as this map's
  surface.
- Resolving a citation, the generated reference list, and citation-key <!-- cond: cond-2609061318152897 -->
  completion: map #11. Nothing here changes what a margin note carries.
- The once-only opening quotation, the easter eggs, and any memory of what a <!-- cond: cond-2609061318152897 -->
  reader has read: map #12. This toolbar remembers a display preference and
  nothing about a reading history.
- Reaching or operating this toolbar by a chord from the Emacs vocabulary, a
  keys panel on the page, search, and cancel: map #26,
  `itd-2609051402083398` (the intent's own Open Questions). Every control
  here is a native, Tab-reachable element with no chord of its own; what
  chord (if any) later moves focus *to* the toolbar is that map's question.
- Reader marks on the text, and their export as a sidecar file: map #23 <!-- cond: cond-2609061318158758 -->
  (phase 7). Both keep state in the reader's own browser; the boundary is
  what is kept — this map keeps display preferences only.
- Author themes: the three choices are three palettes of the one article <!-- cond: cond-2609061318158871 -->
  style; no control here selects, names, or hints at a style Alice supplied.
- The single-file export's own bundling: map #17. The "exported single <!-- cond: cond-2609061318099092 -->
  file" criterion below is answered, as `spc-2609061318090042`'s own Risks
  section already established for its own single-file criterion, by the
  folder export's `index.html` — the one artifact this build's own
  instructions name as the third host to compare.
- A reader's choice following them between the document at a link and the <!-- cond: cond-2609061318156570 -->
  same document opened again from a single file sent to them: the intent's
  own Assumption and Open Question. Each is its own storage origin, and a
  reader sets the toolbar twice; nothing here tries to reconcile the two.
- Author-facing settings of any kind: the intent's own Population condition <!-- cond: cond-2609061318151286 -->
  names no author-facing control in this moment, and none is added.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| Nothing is stored about a reader (`itd-2609051336145770`) | `article-controls.test.ts` › "calls neither fetch nor XMLHttpRequest while every control and reset is exercised"; every value kept lives under one `localStorage` key and nowhere else; `src/local-documents.test.ts`'s new check confirms the same against a real rendered document |
| Reachable by assistive technology (`itd-2609061324342715`) | `article-controls.test.ts` › "every control is a native, labelled button, never a widget with no name or state"; every button carries `type="button"` and `aria-pressed`; each group is a `<fieldset>` named by its own `<legend>`; the pressed state carries weight and a leading mark beside `aria-pressed`, never colour alone; every theme's own contrast (light included, review round one Fable F2/GLM F15) is measured in "every theme meets a plain contrast floor" |
| Legible on three device classes (`itd-2609051336128348`) | the toolbar's own `article.css` rules wrap rather than reserving a fixed width, and cap themselves by `calc(100vw - …)`; `--article-measure`'s two override values are `rem`, never a pixel, proven by "sets `--article-measure` from the measure control, never as a fixed pixel width"; the real look at 390/820/1280 with every control set is manual, M10-1 |
| One source, always (`itd-2609051336090390`) | one file, `article-controls.js`, `include_str!`'d by `stage.rs`, linked by `build.ts`'s `articleDocument`, `export/services.ts`'s chrome list and `preview.html` alike; none of the four names its own copy |
| Variant fidelity (`itd-2609051336107315`) | no control here names, offers, or hints at a variant; the toolbar's own markup carries no `.variant` span and reads nothing about one |

## Design

### The seam this map fills, and nothing past it

`spc-2609061318090042`'s Design section reserves exactly this surface: six
CSS custom properties (`--article-measure`, `--article-text-scale`,
`--article-bg`, `--article-fg`, `--article-muted`, `--article-rule`) on the
root element, and an `ArticlePage.register` seam `article-video.js` already
runs. `article-controls.js` never computes a colour or a font size itself —
it sets a `data-article-theme` attribute this map's own new rules in
`article.css` answer, and it sets `--article-text-scale`/`--article-measure`
directly, values `article.css`'s existing `calc()`/`max-width` rules already
read. This is why the file needs no test of what a colour or a line width
renders to: the stylesheet already carries that, proven in
`spc-2609061318090042`'s own tests, and this map's tests only have to prove
that the right value reaches the right property.

### Three controls, one shape, one reset

```js
var CONTROLS = [
  { key: "theme",    control: "theme",     label: "Theme",     options: [...] },
  { key: "textSize", control: "text-size", label: "Text size", options: [...] },
  { key: "measure",  control: "measure",   label: "Measure",   options: [...] },
];
```

One array drives `buildGroup` (one `<fieldset>` per entry, one `<button>`
per option, `aria-pressed` set from the current choice), `syncPressed` (every
button's `aria-pressed` re-read after any change), and `fieldFor` (a
`data-control` value back to the choice object's own key) — so a fourth
control, were one ever added, is one more entry rather than a fourth code
path. `boot()` reads a stored choice or copies `DEFAULTS`, applies it,
builds the toolbar, and wires one delegated `click` listener: a click inside
`.article-controls-reset` copies `DEFAULTS` and clears storage; a click on a
`button[data-control]` copies the current choice, updates the one field the
button names, and writes it. Both branches end the same way — `applyToRoot`,
then `syncPressed` — which is what keeps "the current choice is shown as
pressed" true after every kind of change, reset included.

### Why "default"/"normal" are absent from the value maps

```js
var TEXT_SCALE_BY_SIZE = { smaller: "0.875", larger: "1.25" };
var MEASURE_BY_STEP = { narrow: "30rem", wide: "46rem" };
```

Neither map carries an entry for the article's own default step. `setOrClearProperty`
calls `root.style.removeProperty(...)` where the map has no entry for the
current value, so choosing "default" text size or "normal" measure — and
resetting — leaves *no* inline override on the root at all, and
`article.css`'s own `--article-text-scale: 1` / `--article-measure: 38em`
answer it exactly as `spc-2609061318090042` already proved. This is
deliberate rather than an oversight: repeating those two numbers here would
give the article's own default two owners instead of one, the "one source"
discipline's own concern turned inward on this map's two files.

### `rem`, not `em`, for the two measure steps

`spc-2609061318090042`'s own default measure is `38em` — deliberately, so a
reader who enlarges the surface keeps roughly the same number of characters
per line. This map's own two steps (`30rem`, `46rem`) are `rem` instead,
because `rem` is relative to the root element's own font size, which this
toolbar's text-size control never touches (`--article-text-scale` is read
inside `body.article`'s own `font` shorthand, not the root's). A `rem`
measure and a `--article-text-scale` multiplier are independent lengths, so
choosing the largest text size and the widest measure together never
compounds into a desired width larger than either step means alone; and
either way, `body.article main`'s `max-width` can only ever *shrink* the
element below the width its container — ultimately the viewport, less
`body`'s own fixed padding — actually has to offer, never grow past it. That
second fact is what block-level layout already guarantees regardless of
unit, and it is also why 390 CSS px never overflows at the largest text and
the widest measure together: nothing here needs an explicit `min()` against
`100vw`, because `max-width` alone is already a ceiling, never a floor.

### The margin rail's own arithmetic does not need to hear about the measure

The intent's own falsifiable claim asks whether widening the measure at
1280 CSS px pushes a margin note out of level with its paragraph.
`spc-2609061318090042`'s margin rail reserves `padding-right:
calc(var(--article-gutter) + var(--article-margin-width))` on `main`, and
floats each `.margin-note` with a fixed `width: var(--article-margin-width)`
and a matching negative margin that lands it exactly inside that reserved
strip — independent of `--article-measure` entirely. Widening the measure
changes how much of `main`'s own width (itself capped by the viewport, as
above) is offered to the flowing text; it never changes the width or the
position of the reserved margin strip, because that strip's own two
properties (`--article-gutter`, `--article-margin-width`) are not read by
this map's controls at all. So the fold breakpoint (`760px`) and the
margin rail's own arithmetic in `article.css` are **unchanged** by this
spec — the decision is to leave them exactly as `spc-2609061318090042` wrote
them, because the two concerns (how wide the text column is, and where the
margin column sits) were already independent of one another before this map
existed. This is recorded as a decision line rather than left implicit.

### The toolbar's own accessibility shape

No ARIA role is invented where a native element already carries one: the
toolbar is a `<section aria-label="Reading preferences">` (a landmark from a
native element plus the one label it needs to be one), each group is a
`<fieldset>` named by its own `<legend>`, and every control is a
`<button type="button">`. `role="toolbar"` is deliberately not used — that
role commits to an arrow-key roving-focus pattern this toolbar does not
implement, and a role that promises a keyboard pattern it does not deliver
is worse than no role, per `itd-2609061324342715`'s own forbids. The pressed
state carries `aria-pressed` for a screen reader and, in `article.css`, a
weight change and a `::before` mark for a sighted reader who cannot
perceive colour — never colour alone. Contrast for the two new themes
is checked by computing the WCAG relative-luminance contrast ratio of each
theme's `--article-bg`/`--article-fg` pair directly from the hex values
`article.css` declares, in `article-controls.test.ts`.

### Each theme pins its own colour-scheme (review round one, Fable F2, GLM F15)

`article.css`'s `:root` originally left `color-scheme: light dark` in force
unconditionally and resolved `--article-bg`/`--article-fg`/`--article-muted`
from the OS's own `Canvas`/`CanvasText`/`GrayText` for the light default, so
"Light" under a dark OS resolved dark regardless of which button read as
pressed, and "Dark" under a light OS resolved light. `pre`'s and
`.callout`'s own box backgrounds, and the egg/opening backdrop and its
`box-shadow`, had the same defect one level down: each mixed `CanvasText`
into `Canvas` rather than into the theme's own two colours, so a box stayed
near-white (or near-black) regardless of the chosen theme. Fixed by pinning:
every one of the three `:root[data-article-theme="…"]` rules now sets its
own `color-scheme` (`light` for light and sepia, `dark` for dark) alongside
its four palette properties — light gains an explicit rule for the first
time, `#ffffff`/`#1a1a1a`/`#595959`, rather than relying on `:root`'s own
un-themed default — and every box background that used to read `Canvas`/
`CanvasText` now reads `color-mix(in srgb, var(--article-fg) …%,
var(--article-bg))`. `article-controls.test.ts`'s own contrast group is
extended to all three themes (not only dark and sepia) and to `pre`'s and
`.callout`'s own backgrounds, asserting neither names `Canvas` or
`CanvasText` literally.

### The toolbar's own toggle (review round one, Fable F6)

`itd-2609051336128348` forbids reader controls "that cannot be reached or
dismissed at the narrowest width"; the toolbar's own `position: fixed`
footprint at 390 CSS px — three `<fieldset>`s and a reset, wrapped into
several rows — sat over roughly the lower quarter of the viewport for the
whole read with nothing that hid it. `buildToolbar` now wraps the three
groups and the reset in an `.article-controls-body`, preceded by a
`<button class="article-controls-toggle" aria-expanded="true"
aria-controls="article-controls-body">`; a click toggles the body's own
`hidden` attribute and flips `aria-expanded`. Chosen over moving the
toolbar in flow at the top of the page below 760px (Fable's own alternative
fix) because it keeps the toolbar's shape, its storage behaviour, and every
existing test unchanged at every width, answering the discipline with one
small, reversible state rather than a second layout mode; the toggle
starts expanded, so a first read is unchanged, and nothing about the
toggle's own open/closed state is persisted — it is a per-visit reading
convenience, not a preference `readStored`/`writeStored` need to know
about.

### Storage: one key, wrapped, sanitised on the way back in

`readStored`, `writeStored` and `clearStored` are the only three places this
file touches `localStorage`, and every one is wrapped in `try`/`catch` with
no rethrow: a browser that refuses storage (Safari's own rule for a `file:`
page, a private window with an exhausted quota) answers exactly like a
browser being asked for the first time — `null`, applied as `DEFAULTS`, no
error shown. `sanitize` treats a stored value that is not an object, or
whose fields are not among the options this version of the script offers,
the same way: each bad field falls back to that one axis's own default
rather than refusing the whole stored choice, so a future version that adds
a fourth theme cannot make an older reader's stored file un-loadable by an
older version reading it back.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| A toolbar offers theme (light, dark, sepia), text size (smaller, default, larger), measure (narrow, normal, wide), and a reset | `article-controls.test.ts` › "offers theme, text size, measure and a reset, with the article's defaults pressed" |
| Carol's larger text size survives a reload, and the toolbar shows it as current | `article-controls.test.ts` › "keeps the larger text size, and shows it as the toolbar's current choice" |
| Sepia and narrow measure, then reset: theme, text size and measure all return to the article's defaults, and a reload keeps them | `article-controls.test.ts` › "returns theme, text size and measure to the article's defaults, and a reload keeps them" |
| No request carries a preference; a second browser on the same machine renders at the defaults | `article-controls.test.ts` › "calls neither fetch nor XMLHttpRequest while every control and reset is exercised", "renders at the defaults in a second browser, which never saw the first browser's choice" |
| 390 CSS px, largest text and widest measure together: only vertical scroll, nothing wider than the viewport; the same at 820 and 1280 | `article-controls.test.ts` › "sets --article-measure from the measure control, never as a fixed pixel width", "declares no width in article.css's toolbar section as a bare pixel value", "caps the toolbar's own width by the viewport rather than a fixed size"; the real look at three widths is manual, M10-1 |
| Reader controls can be reached or dismissed at the narrowest width — the toolbar never permanently covers the page (`itd-2609051336128348`, review round one Fable F6) | `article-controls.test.ts` › "the dismiss toggle" › "starts expanded, and collapses the three groups and the reset behind it on a press" |
| Every margin note stays level with its paragraph when the measure changes at 1280 CSS px | the Design section's own arithmetic argument (the margin rail's reserved strip does not read `--article-measure`); manual M10-2, because jsdom has no layout engine to move a note in the first place |
| The exported single HTML file: the same toolbar, the same reset, choices in force per browser and per file | `stage.rs`'s `chrome_for_folder("article")` and `export.rs`'s `an_article_export_carries_only_the_article_s_stylesheet_and_its_scripts` prove the file ships beside the article's other two; the per-file isolation is a `file:` origin's own storage behaviour, not this script's, and is manual, M10-3 |
| A browser with storage unavailable or cleared: the change applies for the visit, the next load is at the defaults, and no error shows | `article-controls.test.ts` › "applies the change for the visit, shows no error, and renders at the defaults on the next load" |
| Inherits: nothing stored about a reader; reachable by assistive technology; legible on three device classes; one source, always; variant fidelity | see Disciplines inherited, above |

## Tasks

1. `src/core/render/article-controls.js`: the control table, `readStored`/
   `writeStored`/`clearStored`/`sanitize`, `applyToRoot`, `buildToolbar`/
   `buildGroup`/`syncPressed`, `boot`, and the `ArticlePage.register` seam
   with its standalone fallback.
   Verify: `npx vitest run src/core/render/article-controls.test.ts`.
2. `article.css`'s new section: the two theme palettes and the toolbar's own
   layout, button, pressed-state and focus rules, below the existing
   "later maps register here" comment.
   Verify: `npx vitest run src/core/render/article-controls.test.ts -t "contrast"`.
3. The one additive script line in `src/publish/build.ts`'s `articleDocument`,
   `src/export/services.ts`'s `FOLDER_CHROME_FILES.article`, `stage.rs`'s
   `CHROME` and `chrome_for_folder`, and `preview.html`.
   Verify: `npx vitest run src/export/services.test.ts src/publish/build.test.ts`
   and `cargo test --manifest-path src-tauri/Cargo.toml article`.
4. Update `export.rs`'s two hard-coded article chrome lists to the three
   files.
   Verify: `cargo test --manifest-path src-tauri/Cargo.toml export::`.
5. Register the toolbar's own check in `src/local-documents.test.ts`'s
   `INTERACTION_CHECKS`.
   Verify: `npx vitest run src/local-documents.test.ts`.
6. `docs/how-to-preview-and-read-the-article.md`'s new section; the manual
   checklist; the decision lines.
   Verify: the six gates, plus `abcd lint`.

## Risks and Open Questions

- **The margin rail's independence from the measure is an arithmetic
  argument, not a rendered one.** jsdom has no layout engine
  (`spc-2609061318090042`'s own stated limit, inherited here): the claim
  that widening `--article-measure` cannot move a `.margin-note` out of
  level with its paragraph rests on reading `article.css`'s own rules
  (the reserved strip's width depends on `--article-gutter` and
  `--article-margin-width` alone), not on measuring a rendered page.
  M10-2 is where a real engine either confirms it or does not.
- **The single file's per-browser-and-per-file memory is a `file:` origin's
  own behaviour, inherited rather than built.** Two copies of an exported
  folder's `index.html` render at the defaults because most engines treat a
  `file:` URL's storage as scoped to its own path, not because this script
  does anything to make two copies disagree. M10-3 is where that is
  confirmed against a real browser; nothing here can prove an origin policy
  this script has no say over.
- **`--article-measure`'s two steps are `rem`, departing from
  `spc-2609061318090042`'s own default unit, `em`.** Recorded as a decision:
  `em` for the article's own base measure keeps a roughly constant character
  count as the surface's own font size changes; `rem` for this map's two
  steps keeps them independent of this map's own text-size control, so the
  two controls' effects never compound into a measure wider than either
  alone intends.
- **Contrast is measured against the literal hex values this spec chooses
  for the dark and sepia palettes, not against a rendered page.** A future
  change to either palette that keeps the same properties but different
  colours would need the same arithmetic re-run; `article-controls.test.ts`'s
  own contrast test reads `article.css` directly, so it fails loudly if a
  future edit drops the ratio below 4.5:1, but it cannot catch a
  perceptual problem contrast maths does not model.
