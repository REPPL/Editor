---
id: spc-2609151823595737
slug: write-one-text-for-two-audiences
intent: itd-2609051335537470
origin: researcher-authored
production_mode: hand-written
---
# write-one-text-for-two-audiences

## Summary

One text, two audiences, finished. Marking already ships: the parser reads
the fenced div and the bracketed span with their `variant` attributes,
the insert palette writes both, each renderer drops what is not the
variant it is handed, and the preview window renders the document's
default variant. What this spec adds is the three things that make the
marks usable while writing: a chooser, so `C-c C-v` asks which variant to
preview when the document declares more than one and re-renders the same
window; a sidebar badge naming the variants a chapter marks, unnamed and
undeclared marks included; and the closing of four leaks, so that a
variant's preview is what its reader would get — no reference, contents
entry, note, or egg from a passage that variant does not own.

The leaks are closed behind one module. The brief's rendering-core table
names a `variant` module that filters a tree to one variant including the
footnotes and citations inside removed blocks; the tree has four
hand-copied block filters instead and nothing for citations or contents.
This spec builds that module and routes the four callers through it,
which makes the brief true rather than amending it, and gives the
discipline one place to prove.

## Scope

In:

- `src/core/variant.ts`: one filter that takes a tree and a variant and
  returns the tree that variant owns — blocks, inlines inside spans,
  headings, footnotes and citations inside removed content, and the egg
  analysis run on the result. The four callers (article, deck, HTML
  inlines, publish build) call it and keep no filter of their own.
- Citation resolution and the reference list computed for the variant;
  the contents list drawn from the filtered outline.
- Span removal collapsing the double space it would leave.
- The undeclared-name rule as decided: the block out of every rendering,
  the chapter badged.
- The chooser: `C-c C-v` opens a list overlay of the declared variants
  when there are two or more, then previews the chosen one in the open
  preview window through the existing preview event; with one or none it
  previews as today.
- The badge: `ChapterFacts` gains the variants a chapter marks, the
  unnamed marks, and the undeclared names; the sidebar draws them beside
  the unresolved-citation badge; `readSidebarData` reads the metadata to
  know what is declared.
- A document declaring no variants renders in the preview what a publish
  would build for it.
- The docs page on previewing the article, updated in the same change.

Out:

- Declaring the variant set from inside the app; the metadata file is
  edited by hand.
- Per-variant links and everything published (map #19); the export and
  the single file beyond calling the one module.
- Any control inside the rendered page.

## Design

### One module

`variant.ts` exports `filterTree(tree, variant)` and, for callers that
hold a chapter, `filterChapter(chapter, variant)`. A block belongs to a
variant when it carries no `variants`, when it lists the variant, or when
`variant` is null and the document declares none — the rule the four
copies share today. Inline spans are walked, not flattened: a span the
variant does not own is dropped with everything inside it, so a citation
or note nested in it never reaches the inline walk; a span it does own
contributes its children, and the whitespace either side is joined to one
space (DECISIONS 2026-09-05). Headings inside a removed block go with it,
so the outline computed from the filtered tree has no entry for them.

`article.ts`, `deck.ts`, `html.ts`, and `publish/build.ts` delete their
own `inVariant`, `inlineInVariant`, and `belongsTo` and call the module.
`belongsTo`'s stricter reading — a document declaring none renders the
`default` variant and drops every marked block — is the reading the module
adopts for both preview and publish, so the no-variants criterion holds
by there being one rule.

### Citations, references, contents, eggs

`citationsIn` and `resolveCitations` in `bibliography.ts` are called on
the filtered tree by `preview.ts` and `build.ts`, so `renderReferenceList`
numbers only what survives, from 1. `renderDocumentContents` and
`chapterItem` take the filtered chapters and read `outlineOf` on them,
so a Section the variant does not own has no contents entry.
`analyseEggs` runs on the filtered chapter, so an egg marker and its
block are judged in the same variant; a marker whose block the variant
does not own is reported the way an unresolved egg is today.

### The chooser

The `preview` row keeps its chord. Its action reads the document metadata;
with fewer than two declared variants it previews the default as today.
With two or more it opens `openListOverlay` over the declared names, the
default first, the question line naming the chapter, and on a choice
calls the preview command with a `PreviewSource` carrying that variant.
`preview.rs` already emits `PREVIEW_EVENT` to the open window on a second
call and `preview.ts` already redraws on it, so the same window re-renders
and no second window opens. The rendered page keeps `article-controls.js`
as it is; nothing in it names a variant.

### The badge

`ChapterFacts` gains `variants`, `unnamedMarks`, and `undeclaredVariants`.
`readSidebarData` computes them per chapter from the parse — every
`variants` value on a block or span, `UNRESOLVED_VARIANT` counted as
unnamed — and from the metadata's declared list, which it reads through
`readDocumentMetadata`, already an optional service of the app. The
sidebar renders a `variant` badge per declared name marked, an
`unresolved` badge for unnamed and undeclared ones, in the slot the
unresolved-citation badge uses. The outline's `Badge` kind `"variant"`
exists for this and is computed here for the first time.

### The docs

`docs/how-to-preview-and-read-the-article.md` describes choosing a
variant with `C-c C-v` when a document declares more than one, and what
the sidebar's badges mean. Present tense, one page.

## Acceptance Mapping

- Regression, `talk` block in `talk`: One module.
- `full` preview absent with nothing in its place: One module.
- No control names another variant: The chooser (the page is untouched).
- Span sentence with one space: One module (collapse).
- Section in and out of the contents: Citations, references, contents.
- No slide in the `talk` deck, badge for `full`: One module via `deck.ts`;
  The badge.
- Undeclared `draft`: One module (out of every rendering); The badge.
- Note and citation inside a removed block, numbers from 1: Citations,
  references, contents.
- The same inside a removed span: One module (spans walked, not
  flattened).
- Regression, `talk full` and unmarked: One module.
- Badge for `talk` only, none, unnamed: The badge.
- Chooser re-renders the same window; nothing to choose between: The
  chooser.
- No variants declared, preview equals publish: One module (one rule).
- Egg marker and block in one variant: Citations, references, contents,
  eggs.
- Inherits: variant fidelity (one module is the place the discipline
  proves); one source; degrade gracefully (the marks are canon and
  unchanged); the renderings agree (one rule); three device classes (the
  preview reflows as shipped).

## Tasks

1. `src/core/variant.ts` with tests for blocks, spans, nested notes and
   citations, headings, the collapse, and the no-variants rule; the four
   callers routed through it and their copies deleted.
2. Citations, reference list, contents, and eggs over the filtered tree in
   `preview.ts`, `build.ts`, and `article.ts`, with the leak probes from
   the review turned into tests, each citing its issue.
3. The chooser in the `preview` action and the preview re-render test.
4. `ChapterFacts` and the sidebar badge, with metadata read in
   `readSidebarData`.
5. The docs page; resolve the five issues in the change that lands this.

## Risks and Open Questions

- Routing publish through the same module changes what a publish builds
  for a document declaring no variants only if it differs from
  `belongsTo` today; it does not, and the test that pins publish output
  guards it.
- The badge reads metadata on every sidebar refresh; the metadata file is
  small and already read for the title, so no new cost is expected.
- The gesture that declares the variant set is a later intent; until it
  ships, a chapter with marks and no declaration shows undeclared badges,
  which is the decided behaviour, not a defect.
