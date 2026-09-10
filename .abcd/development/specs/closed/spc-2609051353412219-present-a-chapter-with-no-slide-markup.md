---
id: spc-2609051353412219
slug: present-a-chapter-with-no-slide-markup
intent: itd-2609051335447894
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Present a chapter with no slide markup

## Summary

This spec delivers the rendering core's first real job for
`itd-2609051335447894`: a TypeScript core under `src/core/` that parses one
chapter of the canon into the intermediate tree of `05-internals.md` section 2
and, from that one tree, builds a reveal.js deck. It is one half of the bundle
*The deck*; `spc-2609051353425884` is the other half and owns the authored
constructs, the canon placement table both renderers read, and the ignore
obligations. The change adds the parse, the tree, the default mapping, the
slide renderer, the article HTML skeleton the phase-2 bundle will style, a
Present command that opens a second web view window on the deck, a site build
that writes the deck beside a pinned copy of reveal.js, and a snapshot harness
over real documents kept for local testing. Nothing is written into the document
folder: in the app the deck is a string in memory, and on the site it is
generated output under the build directory.

## Scope

### In, by module

| Path | Change |
|---|---|
| `src/core/tree.ts`, `src/core/parse.ts` | new: node kinds, attributes, source spans, variant sets; chapter text to tree through markdown-it and its plugins |
| `src/core/deck.ts` | new: tree to slide plan, the default mapping |
| `src/core/render/slides.ts` | new: slide plan to a reveal.js fragment and document |
| `src/core/render/article.ts` | new: tree to the article HTML skeleton |
| `src/core/assets.ts` | new: the image-reference resolver seam |
| `src/present.ts`, `present.html` | new: the present window's entry point |
| `src/app.ts`, `src/keys.ts`, `src/emacs.ts` | the Present action and its chord |
| `src/doctree.ts` | the `presentChapter`, `pendingDeck`, `readAsset` wrappers |
| `src-tauri/src/lib.rs` | the three commands and the present window |
| `src-tauri/src/document.rs` | `confine_path` extracted, `confine_asset` added |
| `src-tauri/capabilities/default.json` | permission to create the present window |
| `scripts/build-deck.ts` | new: the deck as built for the site |
| `vite.config.ts`, `package.json` | the second entry, the pinned dependencies |
| tests | `src/core/*.test.ts`, `src/core/render/*.test.ts`, `src/core/examples.test.ts`, `src/present.test.ts` |

### Out

Citations, variants, the PDF, the single file, referenced assets and
annotations, all excluded from phase 1 by `06-delivery.md`; and the article as
a user-facing rendering — this spec emits its skeleton only, unstyled, so that
the deck and the article share one parse and the ignore obligations are
provable now. Map #9 (`itd-2609051335489928`) owns the Tufte page in phase 2.

### Boundaries respected

Map #6 (`itd-2609051335458626`), the bundle's other member, owns everything that
overrides or subdivides the default mapping, and supplies `src/core/canon.ts`.
Map #1 (`itd-2609051335399446`) owns opening the folder; this spec begins at the
buffer's text. Map #4 (`itd-2609051335420536`) owns the drop and the copy into
`assets/`; this spec begins at the reference already in the chapter. Map #7
(`itd-2609051335468596`) owns publish, the id, the hash and the link; this spec
builds the deck and mints nothing. Map #11 (`itd-2609051335502171`) owns
`[@key]` resolution: a citation parses into the tree and renders as the literal
text it was written as. Map #17 (`itd-2609051335570842`) and map #25
(`itd-2609051336055362`) own the single file and rehearsal cards.

### Disciplines inherited, and how each is proven

| Discipline | Proven by |
|---|---|
| One source, always (`itd-2609051336090390`) | `src/core/examples.test.ts` builds deck and article skeleton from one `parseChapter` result, and asserts each slide headline is its heading's own text |
| Round-trip byte-fidelity (`itd-2609051336074533`) | `src/present.test.ts` hashes the chapter's bytes either side of a Present; the core takes a string and returns strings and touches no file |
| Legible on three device classes (`itd-2609051336128348`) | the manual width check in the mapping below, at 390, 820 and 1280 CSS px |
| Degrade gracefully in a plain tool (`itd-2609051336110536`) | `spc-2609051353425884`, which owns the constructs |
| No machine in the document (`itd-2609051336080960`) | `src/core/assets.test.ts`: an absolute or climbing image reference is reported, never resolved |
| Network only on publish (`itd-2609051336158553`) | reveal.js is a pinned dependency copied into the build, never a CDN; `src/core/render/slides.test.ts` asserts the built document names no absolute URL |

## Design

### The tree

`src/core/tree.ts` declares the shape `05-internals.md` section 2 names: a
`Block` carrying its kind, its attributes "exactly as written in the source",
its source span, and its variant set (empty in phase 1). Inline content is
rendered once, by the parse, into an HTML string every renderer shares — the
mechanism by which two renderings cannot disagree about a sentence.

```ts
type BlockKind = "heading" | "paragraph" | "image" | "list" | "table"
  | "quote" | "code" | "div" | "rule" | "comment" | "html";

interface Block {
  kind: BlockKind;
  attributes: { id: string | null; classes: readonly string[];
                pairs: Readonly<Record<string, string>> };
  span: { start: number; end: number };     // UTF-8 byte offsets
  variants: readonly string[];
  level?: number;                            // heading only
  html: string; text: string;                // inline content, rendered once
  image?: { src: string; caption: string; credit: string };
  children: readonly Block[];                // a div's contents
}
```

A `Chapter` holds the source, its front matter, its blocks, and the footnote
definitions by label. Spans are UTF-8 byte offsets, from a line table built
once per parse, because the shell measures the same file in bytes; markdown-it
gives a line range per block token and the table turns it into offsets. Inline
spans wait for phase 3, where the fidelity harness that needs them lands.

### The parse

`parseChapter(source: string): Chapter` in `src/core/parse.ts` runs markdown-it
14 configured `{ html: true, typographer: false }` — the typographer stays off
because no rendering may invent characters the author did not write — with
`markdown-it-attrs` for `{...}` on headings, images and spans,
`markdown-it-container` registered once per canon class,
`markdown-it-bracketed-spans`, `markdown-it-footnote`, and a citation plugin
holding an empty bibliography until map #11 fills it. Four decisions come
straight from `05-internals.md` section 3: `#`, `##`, `###` and `####` are the
chapter title, Section, Sub-section and Sub-sub-section; a paragraph whose only
content is one image becomes a block of kind `image`, and for
`![The lantern at dusk](assets/lantern.jpg "Photograph by Carol")` the
"alt text is the caption; the title attribute is the credit"; "a title that
runs to two lines is one heading", so a second heading line of the same level
with no blank line between joins the first; and `<!-- pagebreak -->` alone on a
line parses to a `comment` block, as does every other HTML comment.

### The default slide mapping

`buildDeck(chapter, options): DeckPlan` in `src/core/deck.ts` walks the blocks
in source order, keeping a current column and a current slide.

A `DeckPlan` holds `Column`s of `Slide`s — the first slide of a column
horizontal, the rest hanging beneath it — and a `Slide` holds its kind, its
headline, its `face` blocks, its `notes` (marked `generated` or `authored`),
its `foot` blocks and its id.

- The `#` heading opens the first column with a slide of kind `title`:
  `04-surfaces.md` section 5, "The chapter's title is the opening slide."
- A `##` heading closes the current column and opens a new one.
- A `###` heading appends a slide to the current column, so it hangs beneath
  its Section.
- A `####` heading opens no slide: its heading and every block under it are
  appended, in source order, to the notes of the slide in force.
- Any other block goes to the notes of the slide in force when that slide was
  opened by a heading, and to its face when it was opened by a rule — one rule
  carrying both "the audience reads the headline" and `spc-2609051353425884`'s
  first criterion, where text after a rule "appears on the second slide rather
  than in the first slide's speaker notes".
- A block of kind `image` starts a slide of its own, full-bleed, on the axis of
  the slide in force — a new column beneath a Section, a new vertical slide
  beneath a Sub-section — unless it is the first block after a heading, when it
  is appended to that heading's slide face.
- Placement for every canon construct is read from `src/core/canon.ts`, which
  `spc-2609051353425884` owns, rather than decided here.

A slide with no headline, no face and no notes is dropped, so a Section of one
paragraph yields exactly one slide with nothing beneath or after it. For the
site, `buildDocumentDeck(chapters)` concatenates each chapter's plan in order.

### The renderers

`renderSlides(plan, resolve): string` in `src/core/render/slides.ts` emits the
fragment reveal.js expects — a `<section>` per column, nested `<section>`s for
the vertical slides, `<aside class="notes">` per slide, the foot line under the
face — and nothing else: no `<html>`, no engine, no style. `deckDocument(
fragment, options)` wraps it for a host, `engine: "linked"` naming a relative
path to the engine on the site; the app uses no envelope, mounting the fragment
in a page that already carries reveal.js from the bundle. One fragment
renderer, two envelopes, so no host holds a copy of a rule.
`renderArticle(chapter, resolve): string` in `src/core/render/article.ts` emits
the article skeleton from the same tree — headings as headings, an image as a
`<figure>` with its caption and credit, a rule as `<hr>` — unstyled and
unpublished in phase 1; its job here is that one parse feeds both renderings,
which is what the one-source discipline asks a spec to show. `resolve` is the
seam in `src/core/assets.ts`: an image reference in, a URL out. The app
resolves to a `data:` URI read through the shell, the site build to the path
the file is copied to; a reference that is absolute, or that climbs above the
chapter with `..`, resolves to nothing and is reported — no machine in the
document.

### The Present command and the present window

The chord is a row in the binding table: `id: "present-chapter"`, label
"Present chapter", chords `["C-c C-p"]`, group `document`, owner `editor`,
registered through `EmacsHandler.addCommands` beside `editorSaveChapter`. The
table is the acceptance list, so the test reads the chord from it. Present
renders the buffer's text, not the file's, so an unsaved edit presents;
and it opens a second web view window rather than a pane. The reason is
`src-tauri/tauri.conf.json`: its CSP is `script-src 'self'`, which a `srcdoc`
iframe inherits, so an inline-script deck inside the editor's window cannot
run. A second window loading `present.html` from the same bundle runs under
that policy with no relaxation, and is also the window Alice projects.

### IPC commands

| Command | Arguments | Returns | Errors |
|---|---|---|---|
| `present_chapter` | `text: String`, `chapterPath: String` | `()` | "no document folder is open"; "cannot open the present window: {error}" |
| `pending_deck` | — | `{ text, chapterPath, chapterTitle }` | "nothing to present" |
| `read_asset` | `path: String` | `{ mime, base64 }` | "no document folder is open"; "{name} is outside the open document"; "{name} is not an image this phase carries"; "{name} is larger than the copied-asset threshold"; "cannot read {name}: {error}" |

`present_chapter` stores the text in a `PendingDeck(Mutex<Option<DeckSource>>)`
and creates or focuses the `present` window, which asks for the source with
`pending_deck` once it has loaded. `read_asset` resolves through
`confine_asset`: `confine_path`, extracted from today's `confine_chapter`, plus
an extension allow-list and the 8 MiB copied-asset threshold. A script in
either web view reaches nothing but images inside the folder Alice opened.

### The deck for the site, and the dependencies

`scripts/build-deck.ts` reads a document folder, parses every chapter, builds
one plan for the whole document in chapter order, writes `slides/index.html`
with `engine: "linked"`, copies each referenced asset into `slides/assets/`,
and copies `reveal.js`, `reveal.css` and the deck's own stylesheet out of
`node_modules/reveal.js/dist`. Nothing is fetched, so the deck opens from the
published folder and from a disk copy of it alike. Output goes under
`.abcd/.work.local/`, never into a tracked directory or the document folder.

The new dependencies, pinned exactly and needing the maintainer's sign-off
before they are added: `markdown-it` 14.3.1, `markdown-it-attrs` 4.5.0,
`markdown-it-container` 4.0.0, `markdown-it-footnote` 4.0.0,
`markdown-it-bracketed-spans` 1.0.3, `reveal.js` 5.2.1; and as development
types, `@types/markdown-it` 14.2.0, `@types/markdown-it-attrs` 4.1.3,
`@types/markdown-it-container` 4.0.1, `@types/markdown-it-footnote` 3.0.4.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| Two Sections, no construct: two horizontal slides in source order, each paragraph the slide's notes and on no slide | `src/core/deck.test.ts`, "maps each Section to a horizontal slide and its prose to notes" |
| Two Sub-sections reached by moving down; moving right reaches the next Section | `src/core/deck.test.ts`, "hangs each Sub-section beneath its Section"; `src/core/render/slides.test.ts`, "nests a Sub-section inside its Section's section element" |
| Two image paragraphs, each a full-bleed slide in source order, alt the caption and title the credit | `src/core/deck.test.ts`, "gives every image after the first block a slide of its own"; `src/core/render/slides.test.ts`, "renders an image slide with its caption and its credit" |
| A first-block image shares the headline slide; a later one does not | `src/core/deck.test.ts`, "keeps the first image on the heading's own slide" |
| Sub-sub-sections make no slide; heading and text fold into the Sub-section's notes in source order | `src/core/deck.test.ts`, "folds a Sub-sub-section into its Sub-section's notes" |
| Present, move through, close: the chapter's bytes unchanged, no deck file anywhere | `src-tauri/src/present.rs`, `presenting_leaves_the_chapters_bytes_untouched` — through `hold_chapter`, which is what the `present_chapter` command runs, and `PendingDeck`; `src/present.test.ts`, "writes no deck file anywhere in the document folder"; `src-tauri/src/present.rs`, `refuses_an_asset_outside_the_document` |
| No horizontal scrolling or pinch zoom at 390, 820, 1280 CSS px | manual: `npm run tauri dev`, Present a real chapter, resize the present window to each width and confirm `document.scrollingElement.scrollWidth` equals `innerWidth` on every slide |
| Swipe, on-screen controls and arrow keys all move, none offered without working | manual, at 390 CSS px, on the same chapter, supported by `src/core/render/slides.test.ts`, "turns on touch and the on-screen controls" |
| A Section of one paragraph yields exactly one slide, nothing empty beneath or after | `src/core/deck.test.ts`, "yields one slide for a Section with one paragraph" |
| Present twice in a session shows the new text and leaves no second copy | `src/present.test.ts`, "rebuilds the deck from the buffer on a second Present" |
| The deck rehearsed is the deck published: Present builds the document's default variant | `src-tauri/src/present.rs`, `presenting_carries_the_documents_default_variant`; `src/present.test.ts`, "builds the variant a publish would build" |
| Inherits: the six disciplines | the table under Scope |
| The mapping on real documents | `src/core/examples.test.ts` (removed by iss-2609061418065651; superseded by `src/local-documents.test.ts`): slide-plan and built-deck snapshots for every chapter of the documents kept for local testing |

## Tasks

1. Add the pinned dependencies once signed off — `npm install --save-exact ...`
   then `npm run lint`.
2. Write `src/core/tree.ts` and `src/core/parse.ts`, with the line table and the
   span arithmetic — `npx vitest run src/core/parse.test.ts`.
3. Write `src/core/assets.ts` and its refusal of absolute and climbing
   references — `npx vitest run src/core/assets.test.ts`.
4. Write `src/core/deck.ts`: the default mapping and the empty-slide drop —
   `npx vitest run src/core/deck.test.ts`.
5. Write `src/core/render/slides.ts`, fragment and envelope —
   `npx vitest run src/core/render/slides.test.ts`.
6. Write `src/core/render/article.ts` as the skeleton —
   `npx vitest run src/core/render/article.test.ts`.
7. Add the snapshot harness over the documents kept for local testing —
   `npx vitest run src/core/examples.test.ts` (later removed by iss-2609061418065651).
8. Extract `confine_path`; add `confine_asset`, `read_asset`, `present_chapter`
   and `pending_deck`; widen the capability — `cargo test --manifest-path
   src-tauri/Cargo.toml` and `cargo clippy --manifest-path src-tauri/Cargo.toml
   --all-targets -- -D warnings`.
9. Add `present.html`, `src/present.ts`, the Vite entry, the binding-table row
   and the Present action — `npx vitest run src/present.test.ts`.
10. Add `scripts/build-deck.ts` — `npx tsx scripts/build-deck.ts
    <a document folder>`, then open the written `slides/index.html` from disk.
11. Run the manual checks, then `npm test && npm run lint && npm run build`.

## Risks and Open Questions

- **The title slide against the first criterion.** `04-surfaces.md` section 5
  and the decision log both say the chapter title opens the deck, while the
  intent's first criterion says a chapter of two Sections yields "two
  horizontal slides". The build reads that criterion as enumerating the Section
  slides and keeps the title slide, the surface chapter being explicit and the
  criterion silent. If that is wrong, the change is one branch in `buildDeck`.
- **Prose between the chapter title and the first Section.** Open in the intent
  and unanswered in `03-evidence.md`. The build assumes the default rule
  applies unchanged, so that prose becomes the title slide's notes — which
  sends the subtitle, author, affiliation and date of
  a real chapter's opening off the
  face of its title slide. The snapshot shows it plainly, which is why the
  assumption is taken in the open.
- **What "the Section's text" covers.** `04-surfaces.md` says a Section's text
  becomes its notes; the criterion says "paragraph". The build sends every
  ordinary block — list, table, quote, code — to the notes, so a bullet list on
  a Section's face needs a rule before it. Every talk kept for local testing writes one.
- **The slide theme.** Open in `03-evidence.md` under "Article and slides". The
  build ships one stylesheet over reveal.js's own layout and reads no theme
  from `document.yaml`; `theme: plenary` there is carried and ignored.
- **A CDN on the site.** `03-evidence.md` records that "a CDN is acceptable for
  the published site", while the network-only-on-publish discipline refuses "a
  proposed dependency that fetches at runtime". The build follows the
  discipline and vendors reveal.js, which is also what opens the deck from disk.
- **The chord.** `C-c C-p` assumes the Emacs handler registers a `C-c` prefix
  as it does `C-x`. If not, the binding table is the one place it changes.
