# Internals

The plumbing behind the surfaces. Nothing here is a user moment; it is the
shared machinery every intent inherits. Where a detail is undecided it is
marked **open** and the question lives in
[`03-evidence.md`](03-evidence.md).

## 1. The document on disk

A document is a folder the author owns. Everything in it is a plain file.

```
my-document/
  document.yaml                  document metadata
  references.bib                 bibliography, named in document.yaml
  assets.json                    asset manifest
  publish-log.json               one entry per publish
  layers/                        annotation files received from readers
    bob-2026-03.annotations.json
  01-beginnings/                 a Part
    01-opening.md                a Chapter
    01-opening.annotations.json  annotation sidecar for that chapter
    02-method.md
    assets/
      lantern.jpg
  02-findings/
    01-results.md
    assets/
```

- A **Part** is a folder; a **Chapter** is a Markdown file inside it.
  Chapters only ever live inside a Part; the document folder itself holds
  no chapter.
- **Section**, **Sub-section**, and **Sub-sub-section** are headings two,
  three, and four inside a chapter. A level-one heading is the chapter's
  own title.
- Order comes from the numeric prefix on the file or folder name. Nothing
  else records order, so renaming is reordering. Names sharing a prefix,
  and names carrying none, sort after it by name, so a collision is
  untidy rather than ambiguous.
- Anything in a Part that is not a Markdown file or the `assets/` folder
  is not part of the book and is left alone.
- A single-chapter document is the degenerate case: one Part folder, one
  Markdown file, one `assets/` folder beside it.
- Copied assets live in one `assets/` folder per Part and are referenced
  by a relative path. No path in a document folder is absolute, and none
  names the author's machine.
- `layers/` holds annotation files other people sent, until Alice
  publishes one as a layer.

`document.yaml` carries what belongs to the whole document:

```yaml
title: The Lantern Papers
subtitle: Three winters on the north coast
abstract: |
  A survey of lantern keeping between 1996 and 1999.
author: Alice
affiliation: Department of History
variants: [full, talk]
default_variant: full
bibliography: references.bib
citation_style: numeric
theme: default
asset_threshold_bytes: 8388608
id: 7f3a91c2e4d85b06        # minted on first publish
```

Everything belonging to the whole document lives here and nowhere else. A
chapter may carry its own YAML front matter for chapter-level metadata; it
is Pandoc front matter and every Markdown tool ignores what it does not
know. `document.yaml` is minted when a document is created, or on import
from whatever front matter the manuscript carried.

## 2. The document in memory

Parsing produces one tree, and every rendering is a function of that tree:

```
Document
  metadata, variants, bibliography, asset manifest
  Part*
    Chapter*
      Section*            heading level 2
        Sub-section*      heading level 3
          Sub-sub-section* heading level 4
      Block*              paragraph, list, table, code, div, image, video,
                          rule, comment
      Inline*             text, emphasis, link, citation, footnote, span
```

Every node carries:

- its **attributes**: identifier, classes, and key-value pairs, exactly as
  written in the source;
- its **source span**: byte offsets into the chapter file, which is what
  makes serialisation byte-faithful and annotation anchors resolvable;
- its **variant set**: empty means every variant.

Serialising an unedited tree reproduces the file byte for byte. Serialising
an edited tree changes only the spans that were edited: no reflowed
paragraph, no re-escaped character, no realigned table.

## 3. The Markdown canon

The canon is Pandoc-compatible Markdown. Every extension is written in one
of exactly five forms — a fenced div with attributes, a heading attribute,
an image attribute, a bracketed span attribute, or an HTML comment — so
Emacs, Pandoc, and any plain renderer read the file and degrade
gracefully. Pandoc's own citation and footnote syntax is not an extension
and needs no form of its own. The insert palette writes exactly these
forms.

### Structure and text

| Construct | Written as |
|---|---|
| Chapter title | `# The Lantern Papers` |
| Section | `## Beginnings` |
| Sub-section | `### The first year` |
| Sub-sub-section | `#### A note on dates` |
| Slide split | a horizontal rule: `---` alone on a line, blank line either side |
| Divider heading | `## Interlude {.divider}`, allowed on a chapter's own `#` heading too |
| Appendix of sources | `## Sources {.refs}` |
| Page break | `<!-- pagebreak -->` alone on a line |
| Citation | `[@smith2020]`, `[@smith2020, p. 4]`, or `@smith2020` in prose |
| Footnote | `^[an inline note]`, or `[^dates]` with a `[^dates]:` definition |
| Margin aside without a marker | `[a remark in the margin]{.margin}` |
| Image size | `![Dusk](assets/lantern.jpg){width="75%"}` |
| Cross-reference target | `{#fig:lantern}` on the image, linked as `[the lantern](#fig:lantern)` |
| Table with a caption | a pipe table followed by `: The counts by winter {#tbl:counts}` |

A title that runs to two lines is one heading: the second line is joined
to the first rather than written as a second heading.

### Fenced divs

A variant block, and the inline form beside it:

```
::: {.variant variant="talk"}
This paragraph appears in the talk variant only.
:::

She arrived [in the second week]{.variant variant="full"} and stayed.
```

`variant` takes one name or several separated by spaces. A block with no
variant attribute appears in every variant. A variant block may hold
headings, so a Section or a Sub-section can belong to one variant alone:
the sidebar badges it, and every other variant's contents, deck, and
navigation omit it as if it were not written. A name `document.yaml` does
not declare is not a variant: the block is left out of every rendering and
listed in the sidebar until the name is declared or corrected. Removing an
inline span leaves the sentence around it exactly as it was, save that the
two spaces its removal would leave become one.

Columns, following Pandoc's own convention:

```
::: {.columns}
::: {.column width="50%"}
Left.
:::
::: {.column width="50%"}
Right.
:::
:::
```

Speaker notes, which replace the notes the slide mapping would generate
for the slide whose content the div follows:

```
::: {.notes}
Slow down here. The point is the date, not the number.
:::
```

A callout:

```
::: {.callout kind="warning"}
The figures before 1998 are estimates.
:::
```

A source credit, which renders as a line at the foot of the slide, a
margin note in the article, and a note in the PDF:

```
::: {.credit}
Photograph by Carol, used with permission.
:::
```

A video block with its sources in order. Each item names a role and a
reference; renderings try them top to bottom:

```
::: {.video poster="assets/keynote-poster.jpg" caption="The second half"}
- local: asset:b1946ac92492d234
- site: keynote.mp4
- gated: https://media.example.org/keynote.mp4
:::
```

`local` is a path relative to the chapter, or `asset:` followed by an
entry's id in the asset manifest for a referenced file. `site` is a path
under the published document. `gated` is a URL on a site that asks the
viewer to sign in; Editor holds no credentials for it and never probes it
at build time. Every source is tried in this order when a reader opens the
page, and one that fails to load — or answers with a sign-in page rather
than the video — falls through to the next. The poster is the `poster`
attribute if the block carries one, otherwise the frame the manifest
records for the asset, otherwise nothing and the link stands alone.

A once-only opening quotation:

```
::: {.opening once="per-browser"}
> The lantern was not the point.

— Carol
:::
```

An easter egg: an inline marker where it hides in the paragraph, and a
block carrying its content anywhere in the same chapter:

```
The survey ran for three winters[✦]{.egg egg="lantern"} without a break.

::: {.egg #lantern label="✦"}
A photograph of the lantern, and two sentences about it.
:::
```

A marker with no block renders as ordinary text; a block no marker points
at is left out of every rendering. Both are listed in the sidebar as
unresolved. The `.opening` block belongs to the first block of the first
chapter; anywhere else it is listed the same way.

An image with a caption, a credit, and a layout hint:

```
![The lantern at dusk](assets/lantern.jpg "Photograph by Carol"){.full-bleed}
```

Alt text is the caption; the title attribute is the credit.

### What each rendering does with each construct

| Construct | Article | Slides | PDF |
|---|---|---|---|
| Headings | contents and headings | the slide mapping | contents and headings |
| `variant` | filtered before rendering | filtered before rendering | filtered before rendering |
| Horizontal rule | a rule in the text | splits the slide | a rule |
| `.divider` heading | an ordinary heading | a section-break slide | an ordinary heading |
| `.refs` heading | an appendix of sources | a slide of sources | an appendix of sources |
| `.columns` | ignored; content in flow | side-by-side columns | ignored; content in flow |
| `.notes` | absent | speaker notes | absent |
| `.callout` | a callout box | a callout box | a boxed aside |
| `.credit` | margin note | line at the foot of the slide | a note |
| `.margin` span | margin note | line at the foot of the slide | a note |
| `.video` | player, else poster and link | player, else poster and link | poster and printed link |
| `.opening` | modal, once per browser | absent | an epigraph on the first page |
| `.egg` | collectable, Konami reveal | absent | a static aside |
| `<!-- pagebreak -->` | ignored | ignored | a page break |
| Citation | margin note | credit line at the foot of the slide | numbered reference in the list |
| Footnote | margin note | line at the foot of the slide | note at the foot of the page |
| Reference list | generated, at the end | none; the deck carries credit lines only | generated, numbered |
| Image attributes | width and classes honoured; `.full-bleed` runs the full measure | honoured on an in-flow image; an image slide is full-bleed already | width and classes honoured |

## 4. The rendering core

One TypeScript core, shared unchanged by every host:

| Module | Does |
|---|---|
| `parse` | Markdown text to the document tree, attributes and source spans preserved |
| `serialize` | the tree back to Markdown, byte-faithful where unedited |
| `variant` | filters a tree to one variant, including footnotes and citations inside removed blocks |
| `bibliography` | reads BibTeX, resolves keys, generates reference lists |
| `assets` | reads the manifest, resolves references, chooses a video source order |
| `render/article` | the Tufte HTML, its script, and its styles |
| `render/slides` | the deck, in a reveal.js build and a dependency-free build |
| `render/print` | Typst source for the journal PDF, with every citation already resolved |
| `anchor` | resolves and re-resolves annotation anchors |

Four hosts run it:

1. the desktop app, inside the Tauri web view;
2. the single HTML file, in a plain browser;
3. the presenter site, for reading and presenting published documents;
4. the publish pipeline, in the build runner.

A rendering difference between hosts is a bug in the core, not a host to
be patched. `render/print` emits Typst source directly from the tree, with
the references it has already resolved through `bibliography`; Typst
typesets and resolves nothing, so there is one citation resolver and not
two.

## 5. The shell

Tauri 2, with the system web view — the Safari engine on macOS, matching
the iPad and iPhone targets. Rust owns everything the web view cannot do
safely or at all:

- reading and writing chapter files, atomically, and watching the folder
  for changes made by other tools;
- the file dialogs, and native drag-and-drop of dropped files;
- content hashing, de-duplication, and image conversion on drop;
- resolving named asset roots to machine-local paths;
- git: commit and push using the author's existing configuration, with no
  token of Editor's own;
- running the build, and following a publish Alice started until its
  pipeline reports done or failed;
- claiming the key combinations the platform would otherwise take before
  the editor sees them.

What a dropped file means is decided by where it lands, and the rule is
written once, here:

- a Markdown file dropped on a Part in the sidebar becomes a new chapter
  in that Part;
- any file dropped on the editor's text becomes a reference at the cursor
  — an image reference, a video block, or a link — copied beside the
  chapter below the threshold and recorded as a referenced asset above it;
- a flat manuscript becomes a document folder only through the Import
  command, never through a drop;
- an edited chapter comes home only through the Re-import command. An
  export carries, in its own front matter, the chapter's path in the
  document and the hash of the chapter's bytes at the moment of export;
  Re-import matches on the path and reports a conflict when the chapter on
  disk no longer hashes to what the export recorded.

The bindings themselves are frontend data, not shell code: one table with
an id, a label, and the chords for each action, which the keys panel, the
tooltips, and the acceptance tests all read from. Prefix keys are a state
the table declares, and one cancel chord clears any state, panel, or
overlay.

Everything else — the editing surface, the sidebar, the palette, the
preview, every rendering — is the frontend, so it is the same code the
single file and the site run. iOS is a possible later target for the
tablet.

## 6. Assets, hashing, and the manifest

`assets.json` at the document root records every asset the document uses:

```json
{
  "schema_version": 1,
  "hash": "sha256",
  "threshold_bytes": 8388608,
  "ceiling_bytes": 26214400,
  "roots": ["media"],
  "assets": [
    {
      "id": "b1946ac92492d234",
      "kind": "video",
      "bytes": 512000000,
      "mode": "referenced",
      "root": "media",
      "path": "talks/keynote.mp4",
      "store": "object",
      "published": "https://media.magnumesque.com/7f3a91c2e4d85b06/b1946ac92492d234.mp4",
      "poster": "assets/b1946ac92492d234-poster.jpg"
    },
    {
      "id": "3f79bb7b435b0532",
      "kind": "image",
      "bytes": 240118,
      "mode": "copied",
      "path": "01-beginnings/assets/lantern.jpg",
      "converted_from": "heic"
    }
  ]
}
```

- **Mode** follows the threshold: `copied` files live beside the chapter,
  `referenced` files stay where they are and upload once on publish.
- **Store** follows the ceiling. Below `ceiling_bytes` — the host's
  per-file limit for the deployed repository, 25 MiB, a figure the first
  publish confirms — a referenced asset is published as a file under the
  document version, and `published` is a path. Above it the pipeline puts
  the file in object storage under the document's id, and `published` is
  the URL every rendering links to. The ceiling is the host's, not the
  author's: it is not a setting.
- **Identity is the content hash**, so two drops of one file yield one
  asset and one copy.
- **A referenced asset names a root, never a machine path.** The root is a
  name the author's app settings resolve locally, which keeps the document
  folder free of the author's machine and leaves room for the parked
  feature of reaching assets from anywhere. Where a machine has not named
  a root, its assets are unresolved: renderings fall back to the poster
  and the link, and publishing refuses.
- **Conversion** happens on drop, at any size: a phone-native image becomes
  a web image, the manifest records what it came from, and the original is
  not kept in the document folder.

One manifest per document, at its root.

**Open:** the default threshold, and the fallback when conversion is
unavailable.

## 7. Annotation anchors

One sidecar per chapter, named for it, plain JSON, beside it:

```json
{
  "schema_version": 1,
  "label": "Bob, March 2026",
  "chapter": "01-beginnings/01-opening.md",
  "annotations": [
    {
      "id": "an-7f3a",
      "kind": "highlight",
      "colour": "amber",
      "anchor": {
        "path": ["beginnings", "the-first-year"],
        "block": 3,
        "quote": "the sample was drawn in the second winter",
        "prefix": "By then ",
        "suffix": " and the count",
        "start": 142,
        "end": 183
      },
      "created": "2026-09-05T10:04:11Z"
    }
  ]
}
```

Kinds are `highlight` (with a colour), `note` (with text), `reviewed` (a
mark against a heading), and `card` (a rehearsal-deck entry). Resolution
runs a ladder and stops at the first success:

1. exact offsets, when the surrounding text still matches;
2. the quoted excerpt with its prefix and suffix, searched within the
   named heading path;
3. the quoted excerpt anywhere in the chapter;
4. the heading path alone, which attaches the annotation to the heading;
5. otherwise the annotation is listed as orphaned, never silently dropped
   and never attached to words it was not written against.

`label` is the name a layer is shown under; a chapter's own sidecar
carries none until Alice publishes it.

A published layer is the same file, published beside the document version
and rendered by the article's script. A reader's own annotations live in
their browser, keyed by the document's id and each chapter's path within
it — the path the published page carries for every chapter it renders —
and export as one file for the document holding the marks for all of its
chapters. That file is also an import: a reader can bring it into the page
on another device, which is the only way it travels. The site stores
nothing. Annotation files other people send Alice sit in the document
folder's `layers/` until she publishes one.

**Open:** the anchor format's tolerance before an annotation is called
orphaned.

## 8. The production pipeline

One production system, one action.

1. Alice presses Publish. The app runs the core, filters each variant, and
   writes the built output into a working copy of the production
   repository: article, deck, assets below the ceiling, the manifest, and
   — for a gated document — the access file naming the allow-list she
   edits in the publish panel. The access file lives in the production
   repository beside the document's output and never in the document
   folder, because an email address is not part of a document.
2. The app commits under the document's stable id and pushes with the
   author's existing git configuration.
3. The app uploads every asset above the ceiling straight to object
   storage under the document's id, during this publish and never
   otherwise, with a write-only upload token scoped to that store and kept
   in the system keychain. It is the one credential Editor holds; it can
   add objects and nothing else. The pipeline holds the store's full
   credential as a build secret and verifies each uploaded object's hash
   against the manifest before the deploy goes live.
4. The pipeline renders the PDF: it runs the core to produce Typst source
   for each variant, with the references already resolved, runs Typst, and
   stores each PDF beside its version.
5. The pipeline applies the access policy from the access file, with its
   own credential. The policy is over the document's id, so it covers
   every version and every variant beneath it; lifting the flag lifts the
   policy the same way.
6. Cloudflare Pages deploys the repository. The repository is private; the
   site is public.

The app follows this pipeline while the publish is running and stops when
it reports done or failed. A failed step leaves the deployed site exactly
as it was, and the app names the step that failed.

The presenter, the article script, and the slide engine are maintained
once at the site root and shared by every published version; nothing is
copied into a version folder.

**Open:** whether the PDF renders in a repository action on push or in the
site's build step.

## 9. The presenter site

```
/                              the presenter shell: no id, nothing shown
/<id>/                         the shell again: an id alone shows nothing
/<id>/<token>/                 stable link for one variant: its latest version
/<id>/<token>/v/<hash>/        one published version of that variant
      index.html               the article
      slides/                  the deck
      paper.pdf                the journal PDF
      assets/                  copied and published assets below the ceiling
      layers/                  published annotation layers
/<id>/<token>/latest.json      the hash that variant's stable link serves
```

- The **stable id** is minted on first publish and stored in
  `document.yaml`. It is the document's identity and, for an unlisted
  document, its only protection.
- Each **variant** has a path token of its own, unguessable and minted
  with the id, so a link to one variant cannot be shortened or guessed
  into another. A document with one variant has one token like any other.
- The **version hash** is computed from the built output, so a republish of
  unchanged content produces the same hash and writes no new version
  folder.
- Publishing writes the new version folder, then rewrites the variant's
  stable path to serve it and updates `latest.json`. Old version paths are
  never rewritten.
- Per-variant paths are siblings and nothing links between them.
- The presenter lists nothing and enumerates nothing. A wrong or missing
  id renders the same empty shell as the root: the site's not-found page
  *is* the shell, so what a reader sees is identical either way. The
  claim is about the page, not about what a static host answers.
- Taking a document off the site removes its version folders, its stable
  paths, and its stored assets, after which its links resolve to that same
  empty shell.

**Open:** the length of the stable id, of a variant token, and of the
version hash.

## 10. The publish log

`publish-log.json` in the document folder records one entry per publish:
the timestamp, the version hash, the variants published, the flag
(`unlisted` or `gated`), and the links. Every publish makes an entry,
including a republish of unchanged content, whose entry names the hash
already on the site and adds no version path. Taking the document off the
site makes an entry too. The app renders the log as a list with open and
copy for each entry. It is a sibling file, not part of `document.yaml`,
because it grows with every publish while the metadata does not.
