---
id: spc-2609061318090042
slug: read-the-document-as-a-tufte-article
intent: itd-2609051335489928
origin: researcher-authored
production_mode: dictated-and-formatted
---
# read-the-document-as-a-tufte-article

## Summary

This spec delivers map #9, `itd-2609051335489928`: the online article as a
Tufte-style page — one page per document, a contents list to four levels
(Part, Chapter, Section, Sub-section), margin notes for a footnote, a
citation, a `.margin` span and a `.credit` div, a callout box, full-bleed
images, and a video rule a small script upgrades at runtime. The whole page
is one rendering, `src/core/render/article.ts`, styled by one stylesheet,
`src/core/render/article.css`, and upgraded by one script,
`src/core/render/article-video.js`; every host that shows the article — the
desktop app's new preview window, the build the publish action pushes, and
the folder export — reads or copies those two files unchanged. Margin
notes fold into the flow at 390 CSS px and sit beside their paragraph at 820
and 1280 through one set of stylesheet rules, with no script and no branch
in the renderer: the note is written once, as the paragraph's own next
sibling, and only `article.css`'s media query decides what a reader sees.
Citations render through the same generic margin-note function a footnote
does, carrying the unresolved key as written; map #11 replaces the body
later without touching where it sits. The intent's disciplines — one source,
the renderings agree, legible on three device classes, degrades gracefully
in a plain tool, no machine in the document, nothing stored about a reader —
are each proven by a named test below.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/core/render/article.ts` | phase-1 skeleton: headings, a per-chapter contents list, figures, footnotes printed at the foot, citations as literal text, video as poster and links | rewritten: [`renderMarginNote`] as the one generic shape a footnote, a citation, a `.margin` span and a `.credit` div all render through; a callout box; a document-wide contents list to four levels, grouped by Part; the chapter's own title gains an anchor; the stylesheet is imported and re-exported as `ARTICLE_STYLESHEET` for a test to read |
| `src/core/render/article.css` | absent (`site/presenter/article.css` was a hand-kept copy of a page never built) | new: the one canonical stylesheet — the measure, the margin rail, the fold breakpoint, the callout, full-bleed, and the CSS custom properties map #10 sets on the root element |
| `src/core/render/article-video.js` | absent | new: the one canonical script — tries a `.video` block's sources in the order written, stands a player up on the first that plays, touches nothing when none do; a `register`/`boot` seam later maps add a module to with one call |
| `src/core/render/article.test.ts` | phase-1 coverage | rewritten: margin notes beside a paragraph and not at the foot, the callout, full-bleed, the video markup, and a four-level, two-Part contents list |
| `src/core/render/article-video.test.ts` | absent | new: the script loaded as the file it ships, its source-order and no-player-on-failure behaviour, and its module-registration seam |
| `src/publish/build.ts` | `renderVariant` wrote a flat, per-chapter contents list; `articleDocument` carried no script | `renderVariant` derives each chapter's Part label from its own path (`partTitleOf`, mirroring `title_of` in `document.rs`) and passes it to `renderDocumentContents`; `articleDocument` adds `<script src="…/article-video.js" defer>`; `folderOf` exported for `preview.ts` to reuse |
| `src/publish/build.test.ts` | read `site/presenter/article.css` directly | reads `src/core/render/article.css` instead, the one source it now is |
| `src/export/services.ts` | `FOLDER_CHROME_FILES.article` named only the stylesheet | names the script too |
| `src-tauri/src/publish/stage.rs` | `CHROME`'s `presenter/article.css` entry `include_str!`'d a copy under `site/presenter/`; `chrome_for_folder("article")` named only the stylesheet | both `include_str!` `src/core/render/article.css` and `.../article-video.js` directly, the same arrangement `slides.css` already has |
| `src-tauri/src/export.rs` | two tests hard-coded the article chrome as one file | both updated to the two files |
| `site/presenter/article.css` | a hand-kept copy | removed: the core file is the one source, read directly by `stage.rs`, with no copy left to drift |
| `preview.html`, `src/preview.ts`, `src/preview.css`, `src/preview.test.ts` | absent | new: the app's article preview, a second window in the manner of `present.html`/`present.ts`, rendering the whole document from the buffers the shell holds |
| `src-tauri/src/preview.rs` | absent | new: `PendingPreview`, `preview_document`, `pending_preview` — the same shape `present.rs` holds a deck by, for a whole document's chapters instead of one |
| `src-tauri/capabilities/preview.json` | absent | new: the preview window's own capability file, the same shape `present.json` grants the present window |
| `src/doctree.ts` | `presentChapter`/`pendingDeck` for one chapter | adds `previewDocument`/`pendingPreview` and their types, the same shape for a whole document |
| `src/keys.ts` | 219 rows | one row: `preview`, `C-c C-v`, group `document`, owner `app` |
| `src/main.ts` | wires `present` | wires `preview`: gathers every chapter's text (the open one from the buffer, the rest from disk) and calls `previewDocument` |
| `vite.config.ts` | two page entries | a third, `preview.html` |
| `vitest.config.ts` | `css.include` matched `slides.css` | matches `article.css` too, so a test can read the real file |
| `docs/how-to-preview-and-read-the-article.md` | absent | new how-to page |
| `docs/README.md` | — | one line indexing the new page |

### Out

- The reader-controls toolbar — theme, text size, measure, reset — and its <!-- cond: cond-2609061318097929 -->
  persistence: map #10, `itd-2609051335492327`. This spec sets the CSS custom
  properties (`--article-measure`, `--article-text-scale`, `--article-bg`,
  `--article-fg`, `--article-muted`, `--article-rule`) map #10 will set on the
  root element, and touches no selector that reads anything else to decide
  the measure, the text size, or the palette.
- Resolving a citation against a bibliography, the generated reference list, <!-- cond: cond-2609061318091537 -->
  and the citation key completion the editor offers while typing: map #11.
  This spec owns only where a citation sits and how it folds, through
  [`renderMarginNote`]; map #11 replaces an unresolved citation's body and
  changes nothing about where it sits.
- The once-only opening quotation and the easter eggs: map #12. Nothing here <!-- cond: cond-2609061318092133 -->
  implements the modal, the marks, the tray, or the Konami reveal; the
  page's script carries a `register`/`boot` seam for that map's own module.
- The order video sources are tried in, and what happens when none is <!-- cond: cond-2609061318090890 -->
  reachable at the level of *which* fallback content is chosen: map #16
  owns that policy. This spec owns that the article honours the order
  written and places whichever markup the block carries — poster, caption,
  links — at that point in the flow, and upgrades to a player through
  `article-video.js` when a source loads.
- Embedding the article, its assets and its script into one offline HTML <!-- cond: cond-2609061318099092 -->
  file: map #17. `src/export/services.ts`'s folder export is a folder on
  disk, not a single file; the acceptance criterion's "exported single
  file" is answered by that folder export's own `index.html`, per this
  build's own instructions, and the single-file bundling map #17 owns is
  untouched.
- Moving through the article by keyboard — chords, a keys panel on the page, <!-- cond: cond-2609061318090837 -->
  search, cancel: map #26. This page implements none of that; the preview
  window's own keyboard behaviour is whatever the browser gives a page with
  no script claiming a key.
- The deck's own column of the construct table, and anything about <!-- cond: cond-2609061318097375 -->
  `render/slides`: maps #5 and #6. Touched here only where the deck's own
  chrome file list (`FOLDER_CHROME_FILES`, `chrome_for_folder`) had to grow
  by one line to keep the article's files beside it.
- Variant filtering beyond what phase 1 already does. The assumption <!-- cond: cond-2609061318096567 -->
  (cond-2609061318096567) holds: the article renders the tree it is handed,
  and `inVariant`/`inlineInVariant` — already present — are exercised, not
  extended.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| One source, always (`itd-2609051336090390`) | `article.css` and `article-video.js` are read or copied, never re-authored, by every host — `stage.rs`'s `CHROME`/`chrome_for_folder` `include_str!` the core files directly, `preview.html` links the core file directly, and `build.ts`/`export/services.ts` add no rule of their own; `src/publish/build.test.ts` reads `src/core/render/article.css` as the file every host serves |
| The renderings agree (`itd-2609051336130664`) | `src/publish/build.test.ts` › `gives the whole document one contents list, chapter by chapter`; `src/preview.test.ts` › `articleOf` against the same shape `renderVariant` builds; the manual check M9-6 compares the three hosts for real |
| Legible on three device classes (`itd-2609051336128348`) | `article.css`'s own rules (viewport meta in every host's page, `max-width: 100%` on media, the 760px fold breakpoint, no fixed pixel width on the measure) held against a jsdom-reachable test in `article.test.ts`; the actual look at 390/820/1280 is manual, M9-2 and M9-3 |
| Degrades gracefully in a plain tool (`itd-2609051336110536`) | every construct's canon placement is unchanged from phase 1 for a plain Markdown reader; the video block's poster, caption and links are in the markup regardless of script, proven by `article.test.ts` and `article-video.test.ts`'s "no script at all" cases |
| No machine in the document (`itd-2609051336080960`) | nothing this spec adds writes to a document folder; the preview window reads buffers and files and writes nothing, and `src-tauri/src/preview.rs`'s `PendingPreview` lives in application memory only |
| Nothing stored about a reader (`itd-2609051336145770`) | the article page stores nothing in this map; no cookie, no `localStorage` key, no request the page makes of its own |
| Variant fidelity, from phase 3 (`itd-2609051336107315`) | not yet binding (cond-2609061318096567); `renderArticle` already renders only the tree it is handed, which is what binds this discipline when it starts to |

## Design

### One generic margin note, and the DOM trick that makes it fold

`renderMarginNote(kind, body, id?)` in `article.ts` is the one function a
footnote, a citation, a `.margin` span, and a `.credit` div all call:

```ts
export function renderMarginNote(kind: string, body: string, id: string | null = null): string {
  return `<aside${attributes([["id", id]])} class="margin-note ${escapeAttribute(kind)}">${body}</aside>`;
}
```

`kind` doubles as a class list — `footnote`, `margin`, `credit`, or `citation
unresolved` — so `article.css` answers every one of them with the same
selector, `.margin-note`, and a narrower rule where one of them needs to look
different (the unresolved citation's monospace key).

The note is written as the block's own next sibling. `renderBlocks` computes
every block's own body, then appends `inlineMarginNotes(block, article)` —
every citation, footnote, and `.margin` span the block's own inline content
carries, in source order — after it:

```ts
function renderBlocks(blocks, article) {
  return blocks
    .filter((block) => inVariant(block, article.variant))
    .map((block) => renderOneBlock(block, article) + inlineMarginNotes(block, article))
    .join("");
}
```

This is the whole of how "beside the paragraph at 820 and 1280" and "in the
flow directly after it at 390" come to be one answer rather than two code
paths: the note's position in the markup never changes with the width, and
`article.css`'s one breakpoint is what decides whether it floats into the
margin or stays an ordinary block. A `.credit` div already sits where it was
written — directly after the block it credits — so rendering it through
`renderMarginNote` costs nothing beyond the shape change from phase 1's
`<aside class="credit">`.

A footnote and a citation each leave a marker in the sentence — a footnote's
own superscript (unchanged from phase 1, in `html.ts`), a citation's own
literal key (also unchanged) — because that marker is what lets an eye follow
the sentence to the note beside it. A `.margin` span carries none: the canon
calls it "a margin aside without a marker", so `withoutMarginSpans` removes it
from the inline content that renders inline, and its words live only in the
margin note `inlineMarginNotes` builds from the very same node. Removing
`html.ts`'s shared citation/footnote rendering from this design was
deliberate: touching it would have reached the deck too, which owns its own
column of the construct table (`05-internals.md` section 3) and is out of
scope here (cond-2609061318097375).

### The contents list: Part, Chapter, Section, Sub-section

The intent's own words — "a contents list appears carrying the Parts, the
Chapters, the Sections, and the Sub-sections" — name four levels, one short of
`outline.ts`'s own fifth (Sub-sub-section). `forContents` filters a
Sub-sub-section out of the list without touching the heading itself, which
still renders and still gets an anchor:

```ts
function forContents(nodes) {
  return nodes
    .filter((node) => node.kind !== "subsubsection")
    .map((node) => ({ ...node, children: forContents(node.children) }));
}
```

A chapter's own title (`# …`) carries no anchor from `outline.ts`, which
draws only the levels below it, so `anchorsByLine` now also maps the
chapter's title line to `${prefix}${slugify(title)}` — the id a "Chapter"
contents entry sends a reader to.

`renderDocumentContents` takes `{ chapter, idPrefix, part? }[]`. With no
`part` named anywhere (a single-chapter preview, and every existing call
site before this spec), it renders the flat, one-entry-per-chapter list
phase 1 always wrote. Where a `part` is named, consecutive entries sharing
one label are grouped under it. A Part has no heading of its own on the
page — it is a folder, not a canon construct — so its own entry is a label,
`<span class="part">`, not a link: linking it to its first Chapter would
duplicate that Chapter's own href in the same list, which is exactly what
`src/publish/build.test.ts`'s pre-existing
`gives_the_whole_document_one_contents_list` held every href to being unique
against; making the Part a label rather than a second link to the same place
keeps that invariant true rather than loosening it.

`build.ts`'s `renderVariant` supplies the `part` label from each chapter's own
path, through a new `partTitleOf`, deliberately mirroring `title_of` in
`src-tauri/src/document.rs` — the numeric prefix and its separator gone, the
remaining hyphens turned to spaces — so a reader sees the sidebar's own name
for a Part rather than the app's and the article's disagreeing. `preview.ts`
calls the same function, imported from `build.ts` rather than reimplemented,
because `partTitleOf`/`folderOf` are pure and carry no Tauri dependency.

### The callout and full-bleed

`renderCallout` answers the `"callout"` placement `canon.ts` already declares
for `.callout` at phase 2, writing the `kind=` attribute as `data-kind` — the
same discipline a declared image width already follows under this site's
`style-src 'self'` — and `article.css` shows it with a small-caps label via
`content: attr(data-kind)`. `.full-bleed` in the article means the full
width of the measure, not the viewport: `article.css`'s `.full-bleed { width:
100%; max-width: 100%; }` reads as "as wide as the reading column", because
the article has no gutter to bleed into at 390 CSS px and bleeding past the
measure at 820 and 1280 would run an image under the margin notes sharing the
page with it.

### The video rule: markup that always stands, a script that upgrades it

`html.ts`'s `renderVideo` is unchanged: a `<figure class="video">` carrying
the poster, the caption, and an ordered `<ul class="video-sources">` of
`<li data-role="…"><a href="…">`. A source's reachability is a fact about the
reader's moment, not the moment the tree is rendered (05-internals.md
section 1: "tried when the reader opens the page, never when the document is
built"), so nothing in `article.ts` or `article.css` ever inserts a `<video>`
element; `article-video.js` does, at runtime, and only after trying.

`article-video.js` is a plain, global-attaching script — `ArticlePage`
(`register`, `modules`, `boot`) and `ArticleVideo` (`chooseSource`,
`upgradeVideos`, `probe`) — because the site serves under `script-src 'self'`
with no `'unsafe-inline'`, so a `<script src>` tag is the only shape that
runs anywhere. `chooseSource` tries each source's `href` through a real
`<video>` element's `loadedmetadata`/`error` events (a `fetch` would count a
gated site's sign-in page as success), in the order written, and resolves to
the first that plays or to `null`. `upgrade` stands a `<video controls>` up
in the poster's place on success and sets `data-player-ready` on the figure,
which `article.css` uses to hide the poster and the source list — the script
changes what shows only by setting an attribute the stylesheet already
answers, never by removing markup a plain-CSS reader depends on. Every
public function is a pure, injectable-prober function or a DOM operation
gated behind one, so `article-video.test.ts` drives the whole rule with a
fake prober and no network.

### The registration seam for #10, #12, and #26

`ArticlePage.register(module)` runs `module` once the page's own boot has
run, or immediately if it already has. Map #10's toolbar, map #12's opening
quotation and easter eggs, and map #26's keyboard movement each add one
`<script>` tag of their own to the page and one `ArticlePage.register(...)`
call in it — never an edit to `article-video.js`'s own boot sequence.
`article.css` carries a comment naming where each of those maps' own
stylesheet sections belongs, and the six CSS custom properties on `:root`
are the only surface map #10 needs: nothing below them reads anything else
to decide the measure, the text size, or the palette.

### The preview window

A second window, in the manner of `present.html`/`present.ts`/`present.rs`,
because the shell's CSP (`script-src 'self'`) rules out rendering the whole
article inline in the editing window the same way it ruled out an inline
deck. Where it differs from Present: Present hands the present window *one*
chapter's buffer text; the article is one page for the *whole* document, so
Preview hands the preview window *every* chapter's text — the open one from
`documentText(app.view)`, so an unsaved edit previews, and every other
chapter read fresh from disk through the existing `readChapters` the publish
path already uses. `main.ts`'s `loadForPreview` assembles this without a new
Rust read: `src-tauri/src/preview.rs`'s `preview_document` only holds what it
is given (confining each chapter path to the open document first, the same
discipline `present::hold_chapter` follows) and opens or focuses the window;
`pending_preview` hands it back. Rendering happens inside the preview window
itself — `preview.ts` parses, resolves images through the shell's own
`read_asset` (unchanged, already confinement-checked per call), and calls
`renderArticle`/`renderDocumentContents` directly — exactly the division
`present.ts` already keeps between "the shell holds text" and "the window
builds the page".

`preview.html` links `/src/core/render/article.css` directly, the same
arrangement `present.html` uses for `slides.css`, and loads
`/src/core/render/article-video.js` as `type="module"`: Vite's HTML
transform only bundles (and therefore only copies into a release build) a
page's own `<script>` reference when it is a module, which was confirmed
empirically against this exact file before the design was accepted as
correct — the plain, non-module tag builds silently past `npm run build`
with a working `dist/preview.html` that names a file the release bundle
never wrote. `article-video.js` itself needs no change for this: it already
reads and assigns through `globalThis`, which is unaffected by a module's
stricter scope.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| Two Parts, four chapters: one page, a four-level contents list, choosing an entry moves to that heading | `article.test.ts` › "carries the Parts, the Chapters, the Sections and the Sub-sections…", "choosing an entry moves the page to that heading…"; `build.test.ts` › "gives the whole document one contents list, chapter by chapter"; `preview.test.ts` › "renders the whole document as one page…"; manual M9-1 |
| A citation and a footnote in one paragraph: both in the margin at desktop width, neither at the foot | `article.test.ts` › "puts a citation and a footnote from the same paragraph in the margin…", "writes a footnote as a margin note beside its paragraph, not at the foot of the page" |
| A `.credit` div and a `.margin` span: each a margin note beside the block it follows, at 1280 CSS px | `article.test.ts` › "writes a credit as a margin note, beside the block it follows", "writes a `.margin` span as a margin note, and leaves no marker behind in the sentence" |
| A `.callout kind="warning"`: a box in the flow at 1280, carrying its kind; full measure at 390 with nothing scrolling sideways | `article.test.ts` › "writes a callout as a box in the flow, carrying its kind"; `article.css`'s `.callout` rules hold no fixed width; manual M9-3 |
| `.notes`, `.columns`, a divider heading, and a page-break comment leave no trace | `article.test.ts` › "puts columns in the flow, omits notes, keeps a divider an ordinary heading", "ignores a page-break comment"; "reads its placements from the canon table rather than deciding for itself"; manual M9-4 |
| 390 CSS px: every margin note in the flow, only vertical scroll, no element wider than the viewport; 820 and 1280: the margin returns, same constraint | `article.css`'s own rules read back in `article.test.ts`'s stylesheet assertions (viewport-safe media, no `.margin-note` width past 100%, the 760px breakpoint); manual M9-2, which is where the real look at three widths is proven |
| A video block with `local`/`site`/`gated` all unreachable: poster, caption, link in the flow, no player inserted | `article.test.ts` › "tries a video's sources in the order written, and inserts no player when they are all unreachable at render time"; `article-video.test.ts` › "inserts no player and marks nothing when every source is unreachable"; manual M9-5 |
| A `.full-bleed` image: alt as caption, title as credit, full-bleed width | `article.test.ts` › "runs a `.full-bleed` image the full measure" |
| Three hosts compared — app preview, the site build, the folder export — one document: same headings and order, same margin notes against the same paragraphs, same reference list, same video fallbacks | `build.test.ts`, `preview.test.ts`, and `article.test.ts` each exercise the one `renderArticle`/`renderDocumentContents`/`article.css`/`article-video.js` no host re-implements; manual M9-6 compares the three for real, including a network-panel check that the stylesheet each loads is the same file |
| Inherits: one source; the renderings agree; legible on three device classes; degrades gracefully; no machine in the document; nothing stored about a reader; variant fidelity (not yet binding) | see Disciplines inherited, above |

## Tasks

1. `renderMarginNote`, `inlineMarginNotes`, `withoutMarginSpans`, and the
   `renderOneBlock`/`renderBlocks` split in `article.ts`; remove the
   phase-1 foot-of-page footnotes section.
   Verify: `npx vitest run src/core/render/article.test.ts -t "margin"`.
2. The callout, and the document-wide, Part-grouped, four-level contents
   list (`forContents`, `chapterItem`, `renderDocumentContents`'s grouping).
   Verify: `npx vitest run src/core/render/article.test.ts`.
3. `article.css`: the measure, the margin rail and its 760px breakpoint, the
   callout, full-bleed, the contents list, the CSS custom properties, and
   the video figure's `data-player-ready` rule; import it into `article.ts`
   as `ARTICLE_STYLESHEET`; add `article.css` to `vitest.config.ts`'s
   `css.include`.
   Verify: `npx vitest run src/core/render/article.test.ts`.
4. `article-video.js` and `article-video.test.ts`: `chooseSource`,
   `upgradeVideos`, the `register`/`boot` seam.
   Verify: `npx vitest run src/core/render/article-video.test.ts`.
5. Wire the script tag into `articleDocument`, `partTitleOf`/`folderOf` (now
   exported) into `renderVariant`, and the chrome file lists in
   `src/export/services.ts`, `src-tauri/src/publish/stage.rs`, and
   `src-tauri/src/export.rs`; remove `site/presenter/article.css`; repoint
   `build.test.ts`'s file read.
   Verify: `npx vitest run src/publish/build.test.ts src/export/services.test.ts`
   and `cargo test --manifest-path src-tauri/Cargo.toml article`.
6. `preview.html`, `src/preview.ts`, `src/preview.css`,
   `src-tauri/src/preview.rs`, `src-tauri/capabilities/preview.json`; the
   `preview` row in `src/keys.ts`; the `preview_document`/`pending_preview`
   wrappers in `src/doctree.ts`; the command wiring in `src/main.ts`; the
   `preview.html` entry in `vite.config.ts`.
   Verify: `npx vitest run src/preview.test.ts src/emacs-keys.test.ts` and
   `cargo test --manifest-path src-tauri/Cargo.toml preview`, then
   `npm run build`.
7. `docs/how-to-preview-and-read-the-article.md`, indexed in
   `docs/README.md`; the manual checklist; the decision lines.
   Verify: the six gates, plus `abcd lint`.

## Risks and Open Questions

- **The margin's exact width is a manual call, not an automated one.**
  jsdom has no layout engine (`legibility.test.ts`'s own stated limit, which
  this spec's tests inherit): the float-and-negative-margin technique is
  read back as text — the right rules exist, in the right media query, with
  no fixed pixel width — but whether 16em beside a 38em measure looks right
  on an actual iPad is M9-2's question, not a test's.
- **The Part label duplicating its Chapter's own href was found, not
  assumed.** The first design gave a Part its own link to its first
  Chapter; `build.test.ts`'s pre-existing uniqueness check on contents
  hrefs caught the duplicate immediately. The departure — a label instead of
  a link — is recorded as a decision line rather than left as a silent
  choice, because the intent's own scenario names Parts as something a
  contents list "carries" without saying every entry must be a link.
- **`article-video.js` loaded as `type="module"` in `preview.html`, plain
  everywhere else, was confirmed by building and inspecting `dist/`, not
  merely reasoned about — and the confirmation found the note's own claim
  wrong.** `iss-2609061513087574`: `vite build` does not preserve a
  module-tagged script reference as its own copied file the way this note
  first assumed. `article-video.js`, `article-controls.js` and
  `article-eggs.js` all have zero `import`/`export` statements — each is a
  plain global-attaching IIFE, `type="module"` only being the spelling that
  makes the bundler notice the reference at all — so `vite build` merges
  all three straight into `preview.ts`'s own output chunk rather than
  emitting one file per `<script src>`. The separate `<script src>` tags
  the source `preview.html` carries genuinely disappear from `dist/preview.html`;
  what survives is the effect, not the file. Each script is written to
  tolerate exactly this: `article-video.js` establishes the shared
  `ArticlePage.register` seam and boots itself unconditionally on
  `DOMContentLoaded`, and `article-controls.js`/`article-eggs.js` each fall
  back to the same unconditional boot when `ArticlePage` is not there to
  register with — so whichever order the merged chunk runs them in, all
  three still run. Proven by loading the actual built chunk from a fresh
  `dist/` into jsdom: `ArticlePage`, `ArticleVideo` and `ArticleControls`
  all end up defined, and the reader-controls toolbar's markup is appended
  to `document.body` exactly as `article-controls.test.ts` expects it
  standalone. A future change that gave any of the three a real
  `import`/`export` — or a boot path that assumed `ArticlePage` exists
  rather than falling back — would need re-confirming against a fresh
  build the same way; nothing about the merge itself is enforced by a test,
  because the failure mode a real regression would take (a script that
  silently stops running once merged) is exactly the kind of thing
  inspecting a fresh `dist/` catches and a unit test, which imports the
  source file directly rather than the bundle, cannot.
- **The exported single file, named in the acceptance criterion's own
  words, is this map's folder export.** The brief's map #17 owns bundling a
  single offline HTML file; this build's own instructions name
  `src/export/services.ts` — a folder on disk — as the third host to
  compare. Both readings answer to "one renderer, three hosts, compared for
  one document"; which literal artifact map #17 later produces is out of
  this spec's scope either way (cond-2609061318099092).
- **Whether every one of `article-video.js`'s network-dependent behaviours
  can be trusted from `chooseSource`'s pure logic alone.** The 4-second
  timeout, the choice of `loadedmetadata` over `canplaythrough`, and the
  behaviour of a genuinely gated site that redirects to a sign-in page
  rather than erroring are all real-network questions M9-5 is written to
  catch; the test suite proves the *decision procedure*, not the browser's
  actual video-loading behaviour against a real gated host.
