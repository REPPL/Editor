---
id: spc-2609061318151591
slug: cite-from-a-bibliography-file
intent: itd-2609051335502171
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Cite from a bibliography file

## Summary

This spec delivers map #11, `itd-2609051335502171`: a BibTeX reader and
resolver, `src/core/bibliography.ts`, that every rendering calls through and
none of them duplicates — `05-internals.md` section 4's "one resolver for
every rendering". A citation key completes and hovers in the editor
(`src/citations.ts`, built on `@codemirror/view`'s own tooltip machinery
rather than a new dependency); an unresolved key is marked in the article
and listed against its chapter in the sidebar, never printed as the literal
brackets an author wrote; and the deck names a cited work at the foot of the
Section's slide that carries it. The one style this phase configures is
`numeric`: a marker in reading order, `[1]`, the locator inside the brackets
after it, and a reference list numbered in first-citation order, one entry
per cited key and no others — generated in the article and, once the paper
exists (phase 6), in the printed page; the deck carries credit lines only.

Two agents built this feature in series on one branch. Map #9 (the Tufte
article, `spc-2609061318090042`) landed first and left the seam this spec
resolves: `renderMarginNote`, the one shape a footnote, a citation, a
`.margin` span and a `.credit` div all render as, with a citation's margin
note reading as the key exactly as written, marked unresolved, "until a
bibliography resolves it". This spec is that resolution: it replaces
nothing map #9 built, and touches `src/core/render/html.ts`'s citation case
and `src/core/render/article.ts` only in the one seam map #9 named for it.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/core/bibliography.ts` | absent | new: the BibTeX reader (`parseBibliography`), author-name and reference-text formatting, `resolveCitations` (the one resolver), `unresolvedCitationKeysIn` (the sidebar's own per-chapter question), and the citation-marker and citation-part helpers every rendering shares |
| `src/citations.ts` | absent | new: `citationTriggerAt` and `citationCandidates` (the completion list), `completedCitationAt` and `citationHoverSummary` (the hover), and the CodeMirror extensions — a `bibliographyField`, a `showTooltip`-based completion list, a `hoverTooltip`, and a `Tab`-to-accept keymap — that wire them to a view |
| `src/core/render/html.ts` | exists: the shared inline renderer, `RenderContext` | `RenderContext` gains `citations?: CitationResolution`; the `citation` inline case renders a numbered marker (with an unresolved key marked, never bracketed) when a resolution is supplied, and keeps the phase-1 literal-text fallback when it is not |
| `src/core/render/article.ts` | exists: `renderMarginNote`, the citation-margin-note placeholder, `ArticleOptions` | `ArticleOptions` gains `citations?: CitationResolution`; the citation margin note reads the resolved reference text (or the key, marked, when unresolved); a new `renderReferenceList` and `chapterHasRefsHeading`, and the `.refs` heading's `appendix` placement renders the list where the heading sits |
| `src/core/deck.ts` | exists: `FootLine` (`credit` \| `footnote`), `DeckOptions` | `FootLine` gains a `citation` kind; `DeckOptions` gains `citations?: CitationResolution`; a new `citationLinesFor`, mirroring `footLinesFor`, adds one credit line per resolved key a slide's own content cites |
| `src/core/render/slides.ts` | exists: `renderFoot` | one branch: a `citation` foot line renders `<p class="citation">…</p>`, the short "Author, Year" text `deck.ts` already computed |
| `src/publish/build.ts` | exists: `renderVariant`, `RenderOptions` | `RenderOptions` gains `bibliography?: string \| null`; `renderVariant` resolves it once against every chapter and hands the one `CitationResolution` to every chapter's `renderArticle` and to `buildChapterDecks`; appends the reference list after the last chapter when no chapter wrote a `.refs` heading |
| `src/publish/services.ts` | exists: `PublishReaders`, `documentForPublish`, `DocumentForPublish` | `PublishReaders` gains optional `readBibliography`; `DocumentForPublish` gains `bibliography: string \| null`; `createPublishServices` passes it into `renderVariant` |
| `src/export/services.ts` | exists: `createExportServices` | one line: `bibliography: document.bibliography` into its own `renderVariant` call, the same build the publish path uses |
| `src/preview.ts` | exists: `articleOf`, `renderChapter` | resolves the document's citations once from `PreviewSource.bibliography` and hands the same resolution to every chapter, with the same end-of-document reference-list rule `build.ts` follows |
| `src/doctree.ts` | exists: `DocumentMetadata`, `PreviewSource` | new `readBibliography()`; `PreviewSource` gains optional `bibliography` |
| `src/sidebar.ts` | exists: an empty badge slot reserved by comment | new `ChapterFacts` (`unresolvedCitations`); `Sidebar.show` gains an optional `facts` map; the chapter row's badge slot renders a count and a title listing the keys when `facts` names any |
| `src/app.ts` | exists: `readOutlines`, `showTree`, `AppServices` | `AppServices` gains optional `readBibliography`; `readOutlines` becomes `readSidebarData`, reading the bibliography once beside the chapters and computing each chapter's unresolved keys; `showTree` hands the sidebar its facts and calls `setBibliography` on the editor view |
| `src/editor.ts` | exists: `editorExtensions` | the citation completion keymap joins the `Prec.highest` array ahead of the Emacs keymap (the table's own `Tab` row, "fold or unfold this section", would otherwise claim it unconditionally); the bibliography field, the completion tooltip field and the hover tooltip join the surface's extensions |
| `src-tauri/src/metadata.rs` | exists: `read_metadata` | new `read_bibliography`, reading the file `document.yaml` names, `Ok(None)` for a document naming none |
| `src-tauri/src/preview.rs` | exists: `PreviewSource` | `bibliography: Option<String>`, `#[serde(default)]` |
| `src-tauri/src/lib.rs` | exists: the invoke handler | one command, `read_bibliography`, registered beside `read_document_metadata` |
| `src/core/canon.ts` | exists: the Citation, Footnote and Reference list rows, already worded to the brief | untouched — the table already states this intent's own placements |
| `docs/how-to-cite-from-a-bibliography-file.md`, `docs/README.md`, `docs/how-to-preview-and-read-the-article.md` | — | new how-to page, indexed; the preview page's own citation paragraph updated, since map #9 wrote it as "not yet resolved" |

### Out

- The catalogue of citation styles beyond `numeric`: `03-evidence.md` leaves <!-- cond: cond-2609061318151558 -->
  it open, and an unrecognised `citation_style` falls back to `numeric`
  rather than refusing to render.
- The BibTeX reader's own correctness is proven here; the printed page's <!-- cond: cond-2609061318153883 -->
  numbering agreement is asserted against the article and the deck only —
  the paper does not exist until map #21 (phase 6). `src/core/render/print`
  is not seeded.
- Where the article's margin note sits, how it folds at 390 CSS px, and the <!-- cond: cond-2609061318153081 -->
  navigation around it: map #9's own scope, untouched here.
- The slide mapping itself and where the credit line sits on the slide: <!-- cond: cond-2609061318153640 -->
  map #5's own scope. This spec adds one more source of a credit line
  (a Section's own citations) beside the `.credit` div map #5 already
  renders through the same `FootLine` shape.
- The removal of a citation inside a filtered variant block, and of its <!-- cond: cond-2609061318154649 -->
  entry from that variant's own reference list: the *variant fidelity*
  discipline's own scope, proven by that discipline's tests rather than
  invented here — `resolveCitations` is handed only the chapters (and, by
  extension, the blocks) a caller already filtered.
- What happens to a footnote on a slide beyond what `04-surfaces.md` already
  states ("in the same place as a credit"): `deck.ts`'s existing
  `footLinesFor` already does this; nothing here changes it.
- Choosing "citation" or "footnote" in the insert palette: map #3's own <!-- cond: cond-2609061318155500 -->
  scope; this spec owns what happens to the form afterwards.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| The renderings agree `itd-2609051336130664` | `src/publish/build.test.ts` › "agrees: the article's reference list and the deck's credit lines name the same works, in the same order" — the worked test the intent itself names |
| One source, always `itd-2609051336090390` | one `resolveCitations` call per document in `renderVariant` and in `articleOf`, handed to every chapter's `renderArticle` and to `buildChapterDecks` alike; `src/core/bibliography.test.ts` proves the resolver itself |
| Degrade gracefully in a plain tool `itd-2609051336110536` | untouched: `[@key]`, `@key`, and `^[a note]` are Pandoc's own forms, written and read by `src/core/markdown.ts` before this intent, and nothing here adds a construct outside the canon's five forms |
| Network only on publish `itd-2609051336158553` | `read_bibliography` reads one file from disk, confined the same way `read_document_metadata` is; no network call anywhere in `src/core/bibliography.ts` or `src/citations.ts` |
| Round-trip byte-fidelity `itd-2609051336074533` | nothing here writes a chapter; the bibliography is read-only and the editor extensions dispatch a text change only on an explicit accept (`Tab` or a click), never on a keystroke that merely narrows the list |
| Legible on three device classes `itd-2609051336128348` | the reference list and the citation marker are plain inline and block elements styled by `article.css`'s existing rules; no new breakpoint is added. Manual check **M11-1** |

## Design

### The one resolver

`src/core/bibliography.ts` is pure functions over text and the parsed tree,
nothing else:

- `parseBibliography(text)` reads BibTeX with a hand-written scanner —
  `{…}`-braced values (brace-counted, so `{The {Great} War}` parses as one
  value), `"…"`-quoted values (a brace inside protects a `"` from closing
  it, BibTeX's own quirk), and bare tokens. `@comment{…}` is skipped
  entirely; `@string{…}` is skipped with a note naming the macro, because
  expanding it is not this phase's job. A repeated key keeps its first
  definition and notes the second. Nothing throws: a malformed entry is
  read as far as it can be and the scan moves on. A new `foldLatexEscapes`
  (review round one, Fable F17) runs over every field value after
  whitespace-collapse: every remaining `{`/`}` is stripped (by the time a
  brace survives readBraced/readQuoted's own extraction, it is protective —
  `{The {Great} War}`'s own inner pair, kept for a BibTeX style's
  case-folding rule — never content a reader needs to see), a dozen common
  LaTeX accent commands fold to the Unicode character they draw whether
  braced (`{\"o}`) or bare (`\'e`), `--`/`---` fold to an en/em dash, and a
  tie (`~`) folds to an ordinary space — a reference manager's own BibTeX
  export writes all of these, and a reader has no LaTeX to render them.
  `lineAt`, which every note above cites for its own line number, is a
  `lineCounter` closure now — an O(n) running count across the file's one
  left-to-right scan, not an O(n²) rescan from the start on every note a
  hostile file of many bad entries could make real.
- `resolveCitations(chapters, bibliography, rendering?)` walks every
  chapter's blocks (a local recursive walk, not the shared
  `walkChapterBlocks`, so it can stop descending into a container itself —
  see below) and every citation inline in source order, numbering each key
  the first time it is cited and collecting every key that resolves to
  nothing. It returns `references` (the generated list, numbered),
  `numberOf`, `byKey` (a reference's own entry, for a margin note or a
  credit line), and `unresolvedKeys`. `rendering`, optional, is the
  placement filter (review round one, Fable F7): passed `"article"`, a
  block whose `canon.ts` placement for that rendering is `"absent"` — a
  `.notes` div, most namely — is skipped along with everything inside it,
  so a citation written only inside a chapter's own speaker notes earns no
  entry and no margin note on a page that never shows it. Left undefined,
  every citation counts wherever it sits, which is the shape the deck's own
  `citationLinesFor` needs — it credits a citation in a slide's own notes
  on purpose, "the Section's own words wherever it sits on the slide".
- `unresolvedCitationKeysIn(chapter, bibliography)` is the sidebar's own,
  narrower question: one chapter's own unresolved keys, first-citation
  order, deduplicated — because the sidebar reports per chapter, and a
  document-wide resolution's numbering would otherwise have to be recomputed
  per chapter for no reason the sidebar needs.
- `formatReference(entry)` writes "authors. year. title. container.
  volume(number). pages. url.", each part included only when the entry
  carries it, container being the first of `journal`, `booktitle`,
  `publisher` the entry gives. `shortReference(entry)` is the deck's own
  question: "Author, Year", falling back to two authors joined by "and",
  three or more as "First et al.", and to the bare key when an entry names
  neither an author nor a year.

`citationPartsOf(node, resolution)` splits one citation inline's keys into
the numbers that resolved and the keys that did not, which is what both
`html.ts`'s inline renderer and a caller building its own summary need.

### The shared inline renderer, resolved

`RenderContext.citations?: CitationResolution` is the one seam: absent, the
`citation` case in `html.ts`'s `inline()` keeps the phase-1 fallback — the
literal text the author wrote — which is what the deck's speaker notes still
show, because a slide's notes are not a surface a reader reaches
(`04-surfaces.md` section 5) and the deck names a cited work through its own
credit line, not through this marker. Present, it renders:

- every resolved key's own number, each linked to the reference list's own
  `id="ref-N"` (review round one, GLM F13: the list carried that id with
  nothing on the page pointing at it), comma-joined, the locator after them
  inside the brackets — `[<a href="#ref-1">1</a>, p. 4]`;
- a key that did not resolve as `<span class="citation-key unresolved">key</span>`,
  the key alone, never wrapped in brackets when nothing in the citation
  resolved at all — "render the key as a marked span, not brackets" is the
  intent's own words;
- a citation naming both a resolved and an unresolved key keeps the
  brackets for what resolved and appends the marked span beside them.

`preview.ts` and `build.ts`'s own `citationsFor` (below) hand this field
`EMPTY_RESOLUTION`, never `undefined`, for the article when a document
names no bibliography at all (review round one, GLM F4): `undefined` is
this phase-1 fallback's own signal for a caller genuinely outside a
resolution's reach — the deck's own inline rendering, whose `RenderContext`
never carries `citations` at all — not a document with nothing to resolve
against, which used to render `[@smith2020]` literally, the exact shape the
intent's own "no rendering quietly prints the brackets" forbids.

### The article: the margin note and the generated list

`article.ts`'s `citationMarginNotes` reads the same `RenderContext.citations`
and, per key, pushes a margin note carrying the resolved reference's own
text (the same string `formatReference` gives the list) or, unresolved, the
key alone, marked — the identical shape `renderMarginNote` already gives a
footnote or a `.credit` div. `renderReferenceList(citations)` writes the
generated `<ol class="reference-list">`, one `<li id="ref-N">` per entry,
nothing when there is nothing cited. `chapterHasRefsHeading(chapter)` lets
the document-level composer (`build.ts`, `preview.ts`) ask whether any
chapter wrote `## Sources {.refs}`; when one did, `renderOneBlock`'s new
`appendix` case renders the heading and the list together, in place; when
none did, the composer appends the list once, after the last chapter, with
no invented heading — the brief names no default heading text, so none is
written.

### The deck: a credit line, not a marker

`deck.ts`'s `citationLinesFor(slide, citations)` mirrors `footLinesFor`: it
walks a slide's headline, face and notes for citation inlines, and for each
key that resolves — once per slide, in first-citation order on that slide —
pushes a `FootLine` of the new `citation` kind carrying `shortReference`'s
text. An unresolved key earns no credit line; the sidebar is where it is
reported. `finish` appends these after any explicit `.credit` line and any
footnote line, so an author's own credit always leads. `render/slides.ts`
renders the kind as `<p class="citation">…</p>`, inside the same
`<footer class="slide-foot">` a `.credit` div already writes to — no new
stylesheet rule was needed, `.reveal .slide-foot p` already covers it.

### The editor: completion and hover, without a new dependency

`@codemirror/autocomplete` is not a `package.json` dependency — only a
transitive one, dragged in by `@replit/codemirror-emacs` and
`@codemirror/lang-markdown` — so `src/citations.ts` is built on
`@codemirror/view`'s own tooltip primitives instead, both already a direct
dependency:

- `citationTriggerAt(lineText, column)` finds the most recent literal `[@`
  before the cursor, on the current line, and what has been typed of the
  key since — the bare and locator forms the press release itself
  describes ("she types an opening bracket and an at sign"); a `]` or a
  space (the locator's own start) closes it.
- `citationCandidates(bibliography, prefix)` is every key beginning with
  it, case-folded, file order.
- `citationCompletionField`, a `StateField<readonly Tooltip[]>` recomputed
  after every transaction and provided to `showTooltip`, renders the
  candidate list at the trigger's position; a row accepts on `mousedown`.
- `citationCompletionKeymap` binds `Tab` to accept the first candidate, and
  declines — returns `false` — when no trigger is open, so an ordinary
  `Tab` still reaches whatever it always did. It is placed in `editor.ts`'s
  `Prec.highest` array *ahead of* the Emacs keymap, the same way
  `markdownReturn` is: `Tab` is already the binding table's own chord for
  "fold or unfold this section" (`src/keys.ts`), claimed unconditionally by
  the Emacs plugin, so completing a citation on `Tab` has to ask first.
- `completedCitationAt(lineText, column)` finds a *closed* `[@key…]` the
  position rests inside, and `citationHoverSummary` reads its keys' author,
  title and date, plainly. `citationHoverTooltip = hoverTooltip(…)` wires
  the two together; `hoverTooltip`'s own debounce is "resting" itself, so no
  further timer logic was written.
- `setBibliography(view, bibliography)` dispatches the one effect that
  updates `bibliographyField`; `app.ts`'s `showTree` calls it with the same
  `Bibliography` value the sidebar's own facts were computed from, so the
  editor, the sidebar and (once wired) every rendering read one bibliography
  per redraw, never three.

**Departure from the brief's literal instruction.** The build prompt that
opened this work named `src/overlay.ts`'s machinery as the fallback once
`@codemirror/autocomplete` was ruled out. `openOverlay`'s contract is "hold
the keyboard while it is open" — right for a panel Alice opens and closes,
wrong here, where she keeps typing letters into the document while the list
narrows beneath her; using it would mean re-implementing ordinary character
insertion for every keystroke while the overlay was open, a larger and more
fragile mechanism than the tooltip machinery already offered by a direct
dependency. Recorded as a decision line.

### The sidebar's citation badge

`ChapterFacts { unresolvedCitations: readonly string[] }` is the first fact
to fill the badge slot the sidebar's own header comment reserved. `show`
gains an optional `facts` map, keyed by chapter path exactly as `outlines`
is; a chapter with entries gets a small badge — "N unresolved", its title
listing every key — and one absent from `facts` draws no badge, exactly as
one absent from `outlines` draws no headings beneath it. `app.ts`'s
`readSidebarData` (renamed from `readOutlines`) reads the bibliography once,
beside the chapters it already batch-reads, and computes each chapter's own
`unresolvedCitationKeysIn` against it — an empty bibliography (no
`readBibliography` service, or a document naming none) still answers every
key as unresolved, which is correct: a citation nothing can resolve against
*is* unresolved, and the negative case (an ordinary document) is simply one
with no citation to report at all.

### Two resolutions where the article and the deck genuinely disagree

`renderVariant` (`build.ts`) originally resolved a document's citations
exactly once and handed that one `CitationResolution` to every chapter's
`renderArticle` call and to `buildChapterDecks`. Review round one's Fable
F7 found this too coarse: `citationLinesFor` (`deck.ts`) deliberately walks
a slide's own speaker notes for a citation to credit, which the article's
own reference list must never list an entry for (nothing on the article
page ever renders a `.notes` div at all). `citationsFor` now calls
`resolveCitations` twice — `rendering: "article"` for the resolution
`renderArticle`'s own chapter calls and `renderReferenceList` read, and no
filter at all for the resolution `buildChapterDecks` reads — sharing one
`parseBibliography` call but not one `CitationResolution`. `articleOf`
(`preview.ts`) builds only the article, so its own `citationsFor` always
resolves with `rendering: "article"`. For every citation that is *not*
`.notes`-only — the ordinary case the worked test in the *renderings
agree* discipline still asks for — both resolutions number it identically,
because the underlying walk agrees everywhere placement is not absent; the
deck's credit line still names a key the article's list also carries.

## Acceptance Mapping

| Criterion (`itd-2609051335502171`) | Proven by |
|---|---|
| A resolved `[@smith2020]` renders a numbered marker and the entry's full reference in the margin; the reference list holds exactly the chapter's cited entries | `src/core/render/html.test.ts` › "a resolved citation" (both cases); `src/core/render/article.test.ts` › "writes a resolved citation as a numbered marker, with the full reference in the margin"; `src/core/bibliography.test.ts` › `resolveCitations` describe block; `src/publish/build.test.ts` › "numbers the article's reference list in first-citation order, one entry per cited key" |
| Typing `[@smi` offers every matching key; resting on a completed key shows its author, title and date in place | `src/citations.test.ts` › `citationTriggerAt`, `citationCandidates`, "the completion tooltip" (lists every matching key); `completedCitationAt`, `citationHoverSummary` (the hover content, called directly — a real pointer hover is manual check **M11-2**) |
| `[@smith2020, p. 4]` carries its locator; `^[an inline note]` becomes a margin note; the entry appears once in the article's reference list; the deck carries a source credit line and no reference list; the credit line names a work the article's list also carries | `src/core/bibliography.test.ts` › `citationPartsOf` (`citationMarkerText` was deleted, review round one Fable F18: dead, called only by its own test, duplicating `html.ts`'s `renderResolvedCitation`); `src/core/render/article.test.ts` (existing inline-footnote tests, untouched); `src/core/deck.test.ts` › "a citation's credit line" describe block; `src/publish/build.test.ts` › "agrees: the article's reference list and the deck's credit lines name the same works, in the same order". The PDF half is out of scope (Out, above) |
| `[@nosuchkey]` is marked unresolved in the preview and listed in the sidebar; no rendering prints the literal brackets — not for an unresolved key, and not for a document that names no bibliography at all (review round one, GLM F4) | `src/core/render/html.test.ts` › "an unresolved citation" describe block; `src/core/render/article.test.ts` › "marks a key that resolves to nothing, never as the literal brackets the author wrote"; `src/preview.test.ts` › "marks an unresolved key rather than printing its brackets", "marks a citation unresolved rather than printing its brackets when the document names no bibliography at all"; `src/publish/build.test.ts` › "marks a citation unresolved, generating nothing else, when the document names no bibliography"; `src/sidebar.test.ts` and `src/document.test.ts` › "the sidebar's citation facts" |
| A citation written only inside a `.notes` div earns no article entry and no margin note, but the deck still credits it (review round one, Fable F7) | `src/core/bibliography.test.ts` › `resolveCitations` › "gives a .notes-only citation no article entry…", "still counts a .notes-only citation with no rendering filter…"; `src/preview.test.ts` › "gives a citation written only inside a .notes div no article entry"; `src/publish/build.test.ts` › "gives a .notes-only citation no article entry, but still credits it in the deck" |
| A Section's citation gives its slide a foot credit line naming the work, no margin note, no reference list | `src/core/deck.test.ts` › "names the cited work at the foot of the Section's slide"; `src/core/render/slides.test.ts` › "names the cited work at the foot of the slide, with no reference list anywhere" |
| No bibliography and no citation: every rendering is ordinary, nothing reported as an error | `src/core/bibliography.test.ts` › "resolves nothing and lists nothing for a chapter with no citations", "resolves nothing against an empty bibliography"; `src/publish/build.test.ts` › "renders a chapter with neither a citation nor a bibliography as an ordinary chapter"; `src/preview.test.ts` › "renders an ordinary document when it names no bibliography" |
| Legible at 390/820/1280 CSS px | No new breakpoint; the reference list and the citation marker use `article.css`'s existing rules. Manual check **M11-1** |
| Degrades in a plain Markdown tool | Untouched: the canon's own forms, proven before this intent (`src/core/markdown.ts`'s own tests). Manual check **M11-4** |
| Inherits the renderings-agree, one-source, byte-fidelity, network-only-on-publish and degrade-gracefully disciplines | the Scope table, one named test each |

Manual checks, `npm run tauri dev`, recorded unticked in
`.abcd/.work.local/logs/acceptance/spc-2609061318151591.md`:

- **M11-1** — the preview window at 390, 820 and 1280 CSS pixels, on a
  chapter carrying a resolved citation, an unresolved one, and a `.refs`
  heading: the margin note folds correctly at each width and nothing
  scrolls sideways.
- **M11-2** — in the real editor, type `[@` and a few letters against a
  document naming a real `.bib` file: the completion list appears beneath
  the cursor, narrows as more letters are typed, accepts on `Tab` and on a
  click; resting the pointer on a completed key shows the popup.
- **M11-3** — present a chapter carrying a resolved citation and read the
  credit line on the projected slide.
- **M11-4** — open the same chapter in a plain Markdown viewer, or in Emacs
  with no Editor-specific mode: every citation and footnote reads as
  ordinary text, and the tool renders the rest of the chapter regardless.

## Tasks

1. `src/core/bibliography.ts` and its test: the reader, the formatters, the
   resolver. — `npx vitest run src/core/bibliography.test.ts`
2. `src/core/deck.ts`, `src/core/render/slides.ts` and their tests: the
   `citation` foot line. — `npx vitest run src/core/deck.test.ts src/core/render/slides.test.ts`
3. `src-tauri/src/metadata.rs`, `src-tauri/src/lib.rs`: `read_bibliography`
   and the command. — `cargo test --manifest-path src-tauri/Cargo.toml metadata::`
4. `src/doctree.ts`: `readBibliography`. `src/sidebar.ts` and its new test:
   `ChapterFacts`, the badge. `src/app.ts`: `readSidebarData`,
   `AppServices.readBibliography`. — `npx vitest run src/sidebar.test.ts src/document.test.ts`
5. `src/citations.ts` and its test: the trigger, the candidates, the hover,
   the CodeMirror extensions. `src/editor.ts`: wired ahead of the Emacs
   keymap. — `npx vitest run src/citations.test.ts`
6. `src/core/render/html.ts`, `src/core/render/article.ts`,
   `src/core/render/article.css` and their tests: the resolved citation
   case, the margin note, the generated reference list, the `.refs`
   placement. — `npx vitest run src/core/render/html.test.ts src/core/render/article.test.ts`
7. `src-tauri/src/preview.rs`, `src/preview.ts`, `src/publish/build.ts`,
   `src/publish/services.ts`, `src/export/services.ts`, `src/main.ts` and
   their tests: the document-wide resolution, wired to every consumer. —
   `npx vitest run src/preview.test.ts src/publish/build.test.ts src/publish/services.test.ts src/export/services.test.ts`
8. Docs: the new how-to page, indexed; the preview page's own citation
   paragraph brought current. Manual checklist, decision lines. — the six
   gates, plus `abcd lint` and `abcd docs lint`.

## Risks and Open Questions

- **The catalogue of styles stays open.** Only `numeric` is implemented;
  `formatReference` and `renderResolvedCitation` (`html.ts`) are where a
  later style would be added, and an unrecognised `citation_style` falls
  back to `numeric` rather than refusing to render — an assumption, not an
  instruction the brief states.
- **The no-heading reference list gets no heading of its own.** The intent
  and the brief name no default heading text for the case where a document
  writes no `.refs` heading, so the composer appends the bare list rather
  than inventing prose. If a real document wants a heading there, it writes
  `## Sources {.refs}` itself.
- **The overlay-machinery instruction was departed from**, for the reason
  the Design section states; recorded as a decision line rather than
  silently substituted.
- **Completion accepts only the first candidate on `Tab`.** No arrow-key
  navigation of the list was built: `Tab` narrows to "the top match", which
  is sufficient for the acceptance criteria as written, but a document with
  many similarly-prefixed keys gets no keyboard way to reach the second one
  short of typing further letters or clicking. Left open rather than
  building a second interaction model this build had no evidence for.
- **The hover's "resting" is `hoverTooltip`'s own pointer debounce**, which
  jsdom cannot drive; the pure functions it calls are tested directly, and
  the on-screen behaviour is manual check M11-2.
- **`src/publish/services.ts` was touched beyond the file list the build
  prompt named** (`build.ts`, `export/services.ts`) because
  `documentForPublish` is the one place a bibliography can reach the
  publish path's `renderVariant` call; the change is the same shape as the
  other two files' (`bibliography` threaded through, optional at the
  reader) and is additive.
