---
id: spc-2609061318159422
slug: find-what-is-hidden-in-the-text
intent: itd-2609051335518134
origin: researcher-authored
production_mode: dictated-and-formatted
---
# find-what-is-hidden-in-the-text

## Summary

This spec delivers map #12, `itd-2609051335518134`: the once-only opening
quotation and the easter eggs the article hides in its paragraphs. Both are
ordinary canon constructs already seeded in `canon.ts` (`.opening`, modal
once per browser; `.egg`, collectable with a Konami reveal) and already
parsed correctly — `parse.test.ts`'s own fixtures for both predate this spec
and pass unchanged, so nothing in `parse.ts` needed a fix. What was missing
was the rendering and the reading behaviour: `article.ts`'s `renderOneBlock`
fell through to `renderDiv` for both placements, and neither `article.css`
nor a script gave a reader anything to interact with.

A new module, `src/core/eggs.ts`, matches an egg's marker to its block by id,
chapter by chapter, and answers the one position question the opening asks —
is this block the document's own first chapter's own first block — so that
both `article.ts`'s renderer and `sidebar.ts`'s badge read one analysis
rather than two. `article.ts` renders a valid opening in the flow as a plain
epigraph (the no-script degrade) and a matched egg's content into a hidden
`<template>` a script alone can open; an orphan marker renders as the plain
text a plain Markdown reader already shows, and an orphan block or a
misplaced opening render nothing, each reported to the sidebar the same way
an unresolved citation key already is (map #11). The marker itself — a
button placed exactly where the author wrote `[✦]{.egg …}` — is rendered by
`html.ts`'s shared `inline()`, the one seam both the article and the deck
already share, so the deck's own "absent" placement for an egg marker is
answered in the same place its "collectable" placement for the article is:
one function, one `context.rendering` check, not two renderers agreeing by
convention.

A new script, `src/core/render/article-eggs.js`, is the one source every
host reads or copies, in the manner `article-video.js` and
`article-controls.js` already established: it takes the opening out of the
flow and into a modal the first time a browser sees it, turns a matched
marker into an openable panel, moves a collected mark into a tray, answers
the Konami code, and remembers only two facts — the opening seen, and which
ids are collected — in that browser's own `localStorage`, in a `try`/`catch`
that never lets a refusing browser fail the visit. The deck is untouched:
`deck.ts`'s existing "absent" placement for both blocks, and the marker
fix above, already prove it omits both constructs, which `slides.test.ts`
now asserts end to end rather than leaving it to a table lookup alone.

## Scope

### In, by module

| Module | Current state | This spec |
|---|---|---|
| `src/core/eggs.ts` | absent | new: `analyseEggs` (chapter-scoped marker/block matching), `validOpeningBlock`, `misplacedOpeningsIn`, `unresolvedEggsIn` — the one analysis `article.ts` and `sidebar.ts`'s facts both read |
| `src/core/eggs.test.ts` | absent | new: matching, orphans, opening position, and the combined sidebar wording |
| `src/core/render/html.ts` | `RenderContext` carries no egg data; a `.egg` span rendered as a generic `<span>` | additive: `RenderContext.eggLabels`; `inline()`'s `span` case calls a new `eggMarker` helper — a button when matched, the marker's own text when orphaned, nothing at all outside the article |
| `src/core/render/html.test.ts` | no egg coverage | additive: the marker button, the id prefix, the orphan fallback, and the deck's "absent" case, driven through `renderInlines` directly |
| `src/core/render/article.ts` | `placementOf` cases `"modal"` and `"collectable"` fell through to `renderDiv` | additive: `ArticleOptions.isFirstChapter`; `Article.eggs`/`Article.validOpening`; `renderOpening` and `renderEgg`; two new `switch` cases |
| `src/core/render/article.test.ts` | no opening/egg coverage | additive: the flow epigraph, a misplaced opening, a matched marker and its template, an orphan marker's plain text, an orphan block's silence, an egg's video content |
| `src/core/render/article-eggs.js` | absent | new: the one canonical script — the opening modal, a marker's panel, the tray, and the Konami reveal |
| `src/core/render/article-eggs.test.ts` | absent | new: first visit, dismissal, reload, a second browser, marker click, the tray, the video upgrade, the Konami reveal, storage unavailable, no network |
| `src/core/render/article.css` | a "later maps register here" comment named this map | additive: the modal/panel/tray/marker/reveal rules, appended in their own section |
| `src/core/render/slides.test.ts` | no end-to-end confirmation that both constructs are absent | additive: one test rendering a chapter carrying both, asserting neither the block, the marker, nor its content survives |
| `src/publish/build.ts` | `renderVariant` never named `isFirstChapter`; `articleDocument` carried no third script | additive: `isFirstChapter: index === 0` on every chapter's own render call; one more `<script>` line |
| `src/preview.ts` | `renderChapter` never named `isFirstChapter`; `show` re-invoked only the video upgrade after a re-render | additive: `isFirstChapter: index === 0`; a new `articleEggs()` accessor, and `.boot()` called again after `main.innerHTML` is rewritten, the same discipline the video re-invocation already follows |
| `preview.html` | two script tags (video, controls) | additive: one more `<script type="module" … defer>` line |
| `src/export/services.ts` | `FOLDER_CHROME_FILES.article` named two scripts | additive: a third entry |
| `src-tauri/src/publish/stage.rs` | `CHROME`'s 11 entries and `chrome_for_folder("article")`'s two-script list | additive: one more `include_str!` tuple (`CHROME` becomes 12 entries) and one more named file |
| `src-tauri/src/export.rs` | two hard-coded article chrome lists named two scripts | additive: both updated to three |
| `src/sidebar.ts` | `ChapterFacts.unresolvedCitations`; `badgeSlot` drew one badge | additive: optional `ChapterFacts.unresolvedEggs`; `badgeSlot` draws a second badge, `.tree-badge-egg`, when it is non-empty |
| `src/sidebar.test.ts` | citation badge coverage only | additive: the egg badge, alone and beside the citation badge |
| `src/app.ts` | `readSidebarData` computed only `unresolvedCitations` | additive: `unresolvedEggsIn`, and `firstChapterPath` to answer its `isFirstChapter` argument |
| `src/document.test.ts` | citation facts covered end to end | additive: an orphan marker and a misplaced opening, each through the real `createApp` |
| `src/style.css` | `.tree-badge-citation` | additive: `.tree-badge-egg`, the same palette |
| `src/local-documents.test.ts` | `INTERACTION_CHECKS` had a "pending" comment naming this map | additive: one registered check; the comment's "pending" list drops this map |
| `docs/how-to-preview-and-read-the-article.md` | no mention of either construct | additive: a "What is hidden in the text" section; the "same page from every host" section names the third script |
| `docs/how-to-hide-things-in-the-text.md` | absent | new: the author-facing how-to, indexed in `docs/README.md` |
| `docs/README.md` | — | one line indexing the new how-to |

### Out

- The article's own page shell, its margin notes, its contents list, and the <!-- cond: cond-2609061318154625 -->
  video rule's own upgrade path: map #9, `itd-2609051335489928`. This spec adds
  two `switch` cases to `renderOneBlock` and reuses `ArticlePage.register` and
  `RenderContext` exactly as map #9 declared them; it changes no margin-note,
  contents-list, or video behaviour.
- The reader-controls toolbar and its persisted theme, text size, and <!-- cond: cond-2609061318157089 -->
  measure: map #10. This spec reads the same CSS custom properties map #10
  sets and adds no control of its own; the panel and the toolbar coexist on
  the page without either reading the other's storage key.
- Resolving a citation, and the sidebar's citation badge itself: map #11. <!-- cond: cond-2609061318152835 -->
  This spec's own sidebar badge, `.tree-badge-egg`, is a second badge beside
  the citation one `badgeSlot` already draws, added the same way.
- What the printed page's epigraph and static aside look like, and the exact <!-- cond: cond-2609061318154625 -->
  page they land on: map #21, `itd-2609051336019782`. In scope here is only
  that the content reaches print at all: [`renderOpening`] writes the opening
  in the flow with no `hidden` attribute (a print stylesheet or a Typst
  reader sees ordinary content), and [`renderEgg`] writes an egg's content
  into a `<template>` — present in the markup, inert until a script opens it,
  and therefore still there for a future print renderer to walk. Neither
  function decides what a printed page does with what it finds.
- Whether an egg's content may itself carry a `variant` attribute: open in <!-- cond: cond-2609061318152835 -->
  the intent's own Open Questions. This spec's `renderEgg` renders an egg
  block's children through the same `renderBlocks` every other block uses,
  which already filters by variant; nothing here adds or forbids a variant on
  an egg block, and no test claims the combination is proven.
- The palette's "opening quotation" and "easter egg" entries, and where the <!-- cond: cond-2609061318150131 -->
  cursor lands after inserting one: map #3, `itd-2609051335415528`. This spec
  owns only what the two canonical forms do once written, not how Alice comes
  to write them.
- Moving through the article by keyboard, and a keys panel on the page: map <!-- cond: cond-2609061318157089 -->
  #26. The panel this spec opens is dismissed by Escape and a labelled close
  button; no chord is claimed, and nothing here answers to the editor's own
  binding table.
- Bundling the article into one offline HTML file: map #17. `article-eggs.js` <!-- cond: cond-2609061318099092 -->
  is copied by the folder export exactly as `article-video.js` and
  `article-controls.js` already are; single-file embedding is untouched here.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| Nothing is stored about a reader (`itd-2609051336145770`) | `article-eggs.test.ts` › "no reader progress ever leaves the browser… calls neither fetch nor XMLHttpRequest…"; every storage read and write in `article-eggs.js` is wrapped in `try`/`catch`, the same discipline `article-controls.js` already holds |
| Reachable by assistive technology (`itd-2609061324342715`) | the marker is a real `<button>` with `aria-haspopup="dialog"` and an `aria-label` (`html.ts`'s `eggMarker`); the opening and the egg panel are both `role="dialog"` with `aria-modal="true"` and a labelled close, proven in `article-eggs.test.ts`'s "marker click" and "dismissal" groups; focus returns to the paragraph on close (`article-eggs.test.ts` › "returns focus to the paragraph…"); Escape closes either overlay (`article-eggs.test.ts` › "Escape also dismisses the modal"); the Konami reveal is never colour alone (`article.css`'s `.egg-marker-revealed`: an outline and a scale change together) |
| Degrades gracefully in a plain tool (`itd-2609051336110536`) | the opening renders in the flow with no `hidden` attribute (`article.test.ts` › "renders in the flow, with no `hidden` attribute…"); an egg's content sits in a `<template>`, present in the markup and inert with no script (`article.test.ts`'s own template assertions); `parse.test.ts`'s pre-existing fixtures show a plain Markdown reader shows the marker character and the block's content as ordinary text |
| The renderings agree (`itd-2609051336130664`) | one `eggMarker` function in `html.ts` answers the article and the deck alike, proven in `html.test.ts`; `slides.test.ts`'s new end-to-end test; `local-documents.test.ts`'s registered check against real documents |
| Variant fidelity, from phase 3 (`itd-2609051336107315`) | `renderEgg` renders an egg block's children through the same `renderBlocks` every block uses, which already filters by variant; not newly exercised here beyond that inheritance (cond-2609061318152835) |
| One source, always (`itd-2609051336090390`) | `article-eggs.js` is read or copied, never re-authored, by every host — `stage.rs`'s `CHROME`/`chrome_for_folder` `include_str!` it directly, `preview.html` links it directly, `services.ts`/`build.ts` add no rule of their own |

## Design

### One analysis, chapter scoped: `src/core/eggs.ts`

`analyseEggs(chapter)` walks every block (`walkChapterBlocks`, which already
descends into a div's children and a footnote's own body) collecting every
`.egg` block by its `id`, and every `.egg` marker's own `egg=` id from every
inline node any block carries (`walkInlines`). Matching is a plain id lookup:
a marker id present among the blocks is `matched`, carried forward with the
block and a `label` — the block's own `label` attribute, or the id itself
where an author left it out, so a marker or a tray entry is never a blank
button. An id absent from the blocks is an `orphanMarker`; a block id no
marker claimed is an `orphanBlock`.

The opening is a position question, not a matching one: `validOpeningBlock`
answers null unless `isFirstChapter` is true and `chapter.blocks[0]` is
itself an `.opening` div — reference equality later, in `article.ts`, is
what tells one valid instance from every other `.opening` block the canon
still routes through the same `switch` case. `misplacedOpeningsIn` counts
every `.opening` block in the chapter that is not that one instance, and
`unresolvedEggsIn` joins that count with the orphan lists into the strings
`sidebar.ts`'s badge shows, the same shape `unresolvedCitationKeysIn`
(map #11) already established.

### The marker, rendered where the deck and the article already share a seam

`html.ts`'s `inline()` already special-cases a citation by reading
`context.citations`; the egg marker follows the identical shape, reading a
new optional `context.eggLabels: ReadonlyMap<string, string>` article.ts
populates once per chapter from `analyseEggs`' own `matched` map:

```ts
function eggMarker(node: Inline, context: RenderContext): string {
  if (context.rendering !== "article") return "";
  const id = node.attributes.pairs["egg"] ?? "";
  const label = context.eggLabels?.get(id);
  if (label === undefined) return renderInlines(node.children, context);
  const target = `${context.idPrefix ?? ""}egg-${id}`;
  return `<button type="button" class="egg-marker" data-egg="${target}" ` +
    `aria-haspopup="dialog" aria-label="Reveal hidden content">${label}</button>`;
}
```

This is the whole of how the deck's own "absent" placement for an egg marker
(`canon.ts`) is honoured without `deck.ts` or `slides.ts` knowing the
construct exists: `context.rendering !== "article"` answers it in the one
function both renderings already call for every inline node, rather than a
second exclusion rule kept in step with the first by hand. An id with no
`eggLabels` entry — an orphan marker, or the article rendered with no
resolution handed in at all — falls back to `renderInlines(node.children,
context)`, which is the marker's own written text: identical to what a plain
`<span>` would have shown, and identical to what a plain Markdown tool shows
a `[✦]{.egg …}` span as, because nothing about the canon's own attribute
syntax is special to a reader that does not know it.

`target`'s own shape — `${idPrefix}egg-${id}` — is deliberately the same
string `article.ts`'s `renderEgg` gives the matching `<template>`'s own
`id`, so `article-eggs.js` finds one from the other with a plain
`getElementById` and no string arithmetic of its own to keep in step with
two renderers.

### Rendering the two blocks: `renderOpening` and `renderEgg`

`Article` (the per-chapter render state `article.ts` already threads through
every block) gains two fields computed once in `renderArticle`: `eggs:
EggAnalysis` and `validOpening: Block | null`. `renderOneBlock`'s `switch`
gains two cases answering the canon's own `"modal"` and `"collectable"`
placements:

```ts
case "modal":
  return renderOpening(block, article);
case "collectable":
  return renderEgg(block, article);
```

`renderOpening` renders nothing unless `block === article.validOpening` —
reference equality is safe because neither `renderBlocks` nor
`renderOneBlock` ever copies a block before reaching this switch, so a
misplaced `.opening` the canon still routes here is the same object seen
from the same array, never a clone identity would miss. The valid instance
renders as `<div class="opening" data-once="per-browser">…</div>`, its
children rendered through the ordinary `renderBlocks` — no `hidden`
attribute, ever, from this renderer: that is `article-eggs.js`'s own job,
and its absence here is what proves the no-script degrade rather than
merely asserting it.

`renderEgg` renders nothing unless the block's own id is a key of
`article.eggs.matched` and that entry's own block is the one being
rendered (guarding against two `.egg` blocks that, mistakenly, share one
id — the first found wins the match, in `eggBlocksById`, and the second is
an ordinary orphan). A matched block renders as a `<template
id="{idPrefix}egg-{id}" data-egg-label="{label}" class="egg-content">`, its
children rendered through the same `renderBlocks`, so an egg's `.video`
child is rendered by the same `renderVideo` any other video in the article
is — no special case for the video source rule inside an egg, which is
this map's own falsifiable assumption (`cond-2609061318153365`) held simply
by reusing the one function that already implements it.

### The script: `article-eggs.js`

One more plain, global-attaching IIFE, in the shape `article-video.js` and
`article-controls.js` already established — `script-src 'self'` forbids an
inline script, so a `<script src>` tag naming this exact file is the only
form that runs anywhere it is served.

- **The opening.** `processOpening` finds `.opening[data-once]`, hides it
  (`el.hidden = true`) unconditionally, and — only where `localStorage`
  has never recorded `editor-article-opening-seen` — moves it (never
  clones it) into a `role="dialog"` wrapper appended to `document.body`,
  unhides it there, and shows a "Continue reading" button. Dismissing
  it — by clicking that button, clicking the backdrop, or pressing
  Escape — records the seen flag and removes the whole wrapper, which
  the opening's own DOM node is now inside.
- **A marker.** A delegated `click` listener (bound once, on `document`,
  so a re-render that replaces `<main>` never loses it) opens the
  `<template>` a marker's `data-egg` names, in a `role="dialog"` panel
  `article.css` positions beside the text at 820 and 1280 CSS px and full
  width below 760. The first time a given id is opened, the marker is
  hidden and a fresh entry — a `<button>` reading the same `data-egg-label`
  the template carries — is appended to a `<ul>` inside a `<nav
  class="egg-tray">` this script builds the first time it is needed.
  Reopening from the tray does not collect again; nothing here ever
  collects twice.
- **Video inside a panel.** `article-video.js`'s own `upgradeVideos` walks
  every `figure.video` on the page with no guard against a figure already
  upgraded, so calling it again after a panel opens would risk a second
  `<video>` beside an already-standing one elsewhere on the page. Rather
  than change that file, `article-eggs.js` upgrades only the figure inside
  the panel it just opened, reusing `ArticleVideo.chooseSource` and
  `ArticleVideo.probe` — the two pure, injectable primitives that file
  already exports — for the same probe-then-swap behaviour, scoped to one
  figure. This is the departure recorded below.
- **The tray.** A plain list (`itd-2609061324342715`: "the tray is a
  list"), reachable by scrolling at 390 CSS px because it is an ordinary
  block at the foot of the page, never a fixed overlay.
- **Focus.** Closing a panel or the opening modal calls a small
  `focusOnce` helper: a temporary `tabindex="-1"` on the return target (an
  ordinary paragraph has none of its own), a `.focus()` call, and the
  attribute removed again on the next `blur` — the standard shape for
  handing focus to an element with no place in the tab order, so the page
  reads exactly as it did before to anything walking it afterwards.
- **Konami.** A ten-key rolling buffer, compared case-insensitively
  against `arrowup, arrowup, arrowdown, arrowdown, arrowleft, arrowright,
  arrowleft, arrowright, b, a`. A match adds `.egg-marker-revealed` to
  every marker not currently `hidden` (an already-collected mark is
  `hidden` and is skipped, so it is never revealed again), scrolls the
  first of them into view, and removes the class after two seconds. It
  never touches the collected set: revealing is not collecting
  (`cond-2609061318156143`).

`preview.ts`'s `show()` calls `window.ArticleEggs?.boot()` again after every
`main.innerHTML` rewrite, exactly the way it already calls
`ArticleVideo.upgradeVideos()` again: `boot()` is written to be safe to call
more than once, re-reading storage fresh each time, which is also what
makes "a browser that already dismissed the opening, on a second Preview,
does not see it again" true with no extra bookkeeping — `readSeenOpening()`
already answers that from storage, not from a variable this module would
otherwise have to remember across calls.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| First visit: the opening shown until dismissed; second visit: none | `article-eggs.test.ts` › "first visit" group, "dismissal" group, "reload" › "opens directly at the text with no quotation shown, in the same browser" |
| A matched marker and block: the marker appears in place, the block's content nowhere in the flow, clicking opens it | `article.test.ts` › "easter eggs" › "renders the marker as a button in place, and the block's content nowhere in the flow", "keeps the marker's own text where it sits…"; `article-eggs.test.ts` › "marker click" group |
| Closing moves the marker into the tray; reopening from the tray shows the same content | `article-eggs.test.ts` › "closing a panel and the tray" › "moves the marker into a list at the foot of the page, reachable and reopenable" |
| Three uncollected marks; Konami reveals the two still hidden, scrolls to the first, does not reveal the collected one | `article-eggs.test.ts` › "the Konami code" › "flashes every uncollected mark and scrolls to the first, without collecting any of them" |
| An orphan marker: plain text, nothing clickable, no tray entry, not counted by the Konami reveal; listed in the sidebar; rest of the chapter unchanged (negative case) | `article.test.ts` › "renders an orphan marker's own text as ordinary, unclickable text"; `html.test.ts` › "renders the marker's own text where the id names no eggLabels entry"; `eggs.test.ts` › "reports a marker whose id names no block as an orphan marker"; `document.test.ts` › "lists an orphan egg marker against the chapter that carries it" |
| An orphan block: renders nowhere, nothing added to the tray, listed in the sidebar for Alice (negative case) | `article.test.ts` › "renders an orphan block nowhere at all"; `eggs.test.ts` › "reports a block no marker names as an orphan block" |
| A misplaced opening (second chapter's first block): no quotation shown, sidebar lists the chapter (negative case) | `article.test.ts` › "the once-only opening quotation" › "renders nothing for a chapter that is not the document's first", "renders nothing when the .opening block is not the chapter's own first block"; `eggs.test.ts` › `misplacedOpeningsIn` group; `document.test.ts` › "lists a misplaced opening against the chapter that is not the document's first" |
| iPhone width: the panel fills the viewport, no horizontal scroll, no pinch, closing returns focus and the tray stays reachable; iPad and desktop: beside the text, nothing wider than the viewport | `article.css`'s own rules (the 759px panel-width query, no fixed pixel width on `.egg-panel`, the tray an ordinary flow block); `article-eggs.test.ts` › "returns focus to the paragraph the marker sat in, once the panel closes"; manual M12-4 and M12-5, which is where the real look at three widths is proven |
| The deck omits both constructs entirely | `slides.test.ts` › "the once-only opening and easter eggs" › "omits both constructs entirely…"; `html.test.ts` › "renders nothing in the deck, matched or not…"; `deck.ts`'s own pre-existing `"absent"` placement, confirmed rather than changed |
| Nothing about a reader's dismissal or collection is held outside the browser; clearing storage returns the page to first-visit state | `article-eggs.test.ts` › "no reader progress ever leaves the browser", "a browser where storage is unavailable" (which is also what a cleared storage reads back as) |
| Inherits: nothing stored about a reader; reachable by assistive technology; legible on three device classes; the renderings agree; one source, always; degrades gracefully; variant fidelity (not newly exercised) | see Disciplines inherited, above |

## Tasks

1. `src/core/eggs.ts` and `src/core/eggs.test.ts`: `analyseEggs`,
   `validOpeningBlock`, `misplacedOpeningsIn`, `unresolvedEggsIn`.
   Verify: `npx vitest run src/core/eggs.test.ts`.
2. `html.ts`'s `eggMarker` and `RenderContext.eggLabels`; `html.test.ts`'s
   coverage of the matched, orphan, and deck-absent cases.
   Verify: `npx vitest run src/core/render/html.test.ts`.
3. `article.ts`'s `renderOpening`, `renderEgg`, the two new `switch` cases,
   `ArticleOptions.isFirstChapter`, and `Article.eggs`/`Article.validOpening`;
   `article.test.ts`'s coverage.
   Verify: `npx vitest run src/core/render/article.test.ts`.
4. `article-eggs.js` and `article-eggs.test.ts`: the opening modal, a
   marker's panel, the tray, the scoped video upgrade, the Konami reveal,
   storage unavailable, no network.
   Verify: `npx vitest run src/core/render/article-eggs.test.ts`.
5. `article.css`'s new section; `slides.test.ts`'s end-to-end confirmation
   that the deck omits both constructs.
   Verify: `npx vitest run src/core/render/`.
6. Wire the script and `isFirstChapter` into `build.ts`, `preview.ts`, and
   `preview.html`; the chrome file lists in `services.ts`, `stage.rs`, and
   `export.rs`.
   Verify: `npx vitest run src/publish/build.test.ts src/preview.test.ts
   src/export/services.test.ts` and `cargo test --manifest-path
   src-tauri/Cargo.toml article`.
7. `sidebar.ts`'s `unresolvedEggs` field and its badge; `app.ts`'s
   `unresolvedEggsIn` call; `style.css`'s `.tree-badge-egg`;
   `sidebar.test.ts` and `document.test.ts`'s end-to-end coverage.
   Verify: `npx vitest run src/sidebar.test.ts src/document.test.ts`.
8. `local-documents.test.ts`'s registered check.
   Verify: `npx vitest run src/local-documents.test.ts`.
9. `docs/how-to-hide-things-in-the-text.md`, indexed in `docs/README.md`;
   the "What is hidden in the text" section in
   `docs/how-to-preview-and-read-the-article.md`; the manual checklist; the
   decision lines.
   Verify: the six gates, plus `abcd docs lint`.

## Risks and Open Questions

- **`article-eggs.js` upgrades a panel's own video without calling
  `article-video.js`'s `upgradeVideos`, and this was found, not assumed.**
  That function re-probes every `figure.video` on the page with no guard
  against one already carrying `data-player-ready`; calling it again after
  a panel opens would risk a second `<video>` standing beside an
  already-upgraded one elsewhere in the article. The departure — a small,
  scoped upgrade reusing `chooseSource`/`probe` alone — is recorded as a
  decision line rather than left as a silent choice, and it captures no
  issue against `article-video.js` itself: the file is not wrong for a
  page that never asks it to upgrade the same figure twice, which is what
  every other caller of it already does.
- **The panel's exact width beside the text, and the real look at an
  iPad's own 820 CSS px, is a manual call.** jsdom has no layout engine,
  the same limit `legibility.test.ts` already states for map #9's own
  margin rules; the right rule exists, in the right query, with no fixed
  pixel width, but whether it reads well beside a 38em measure on a real
  iPad is M12-4's question.
- **`article-eggs.js` loaded as `type="module"` in `preview.html`, plain
  everywhere else, follows the identical, already-confirmed arrangement
  `article-video.js` and `article-controls.js` use.** Nothing new was
  re-confirmed by inspecting `dist/` for this file specifically beyond
  running `npm run build`, because the shape — a plain IIFE with no
  `import`/`export` of its own — is identical to the two files the
  original confirmation covered.
- **Whether an egg's content may carry a `variant` attribute is still
  open**, per the intent's own Open Questions: this spec renders an egg's
  children through the ordinary variant-filtering `renderBlocks`, which is
  necessary but not a claim that the combination has been exercised.
- **The exact static fallback the printed page gives the opening and an
  egg is still open**, per the intent's own Open Questions and map #21's
  own scope. This spec's obligation — the content reaches the markup with
  no script needed to produce it — is met by an unhidden flow `<div>` and
  an inert `<template>`; what a print renderer does with either is map
  #21's to decide.
