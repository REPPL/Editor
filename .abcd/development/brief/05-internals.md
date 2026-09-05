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
- **Section**, **Sub-section**, and **Sub-sub-section** are headings two,
  three, and four inside a chapter. A level-one heading is the chapter's
  own title.
- Order comes from the numeric prefix on the file or folder name. Nothing
  else records order, so renaming is reordering.
- A single-chapter document is the degenerate case: one folder, one
  Markdown file, one `assets/` folder beside it.
- Copied assets live in the `assets/` folder beside the chapter and are
  referenced by a relative path. No path in a document folder is absolute,
  and none names a machine.

`document.yaml` carries what belongs to the whole document:

```yaml
title: The Lantern Papers
author: Alice
variants: [full, talk]
default_variant: full
bibliography: references.bib
citation_style: numeric
asset_threshold_bytes: 8388608
id: 7f3a91c2e4d85b06        # minted on first publish
```

A chapter may carry its own YAML front matter for chapter-level metadata;
it is Pandoc front matter and every Markdown tool ignores what it does not
know. **Open:** whether document metadata lives in `document.yaml` or in
the front matter of the first chapter.

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

The canon is Pandoc-compatible Markdown. Every extension is a fenced div
with attributes, a heading or image attribute, or an HTML comment, so
Emacs, Pandoc, and any plain renderer read the file and degrade
gracefully. The insert palette writes exactly these forms.

### Structure and text

| Construct | Written as |
|---|---|
| Chapter title | `# The Lantern Papers` |
| Section | `## Beginnings` |
| Sub-section | `### The first year` |
| Sub-sub-section | `#### A note on dates` |
| Slide split inside a Section | a horizontal rule: `---` alone on a line, blank line either side |
| Divider heading | `## Interlude {.divider}` |
| Page break | `<!-- pagebreak -->` alone on a line |
| Citation | `[@smith2020]`, `[@smith2020, p. 4]`, or `@smith2020` in prose |
| Footnote | `^[an inline note]`, or `[^dates]` with a `[^dates]:` definition |
| Margin aside without a marker | `[a remark in the margin]{.margin}` |

### Fenced divs

A variant block, and the inline form beside it:

```
::: {.variant variant="talk"}
This paragraph appears in the talk variant only.
:::

She arrived [in the second week]{.variant variant="full"} and stayed.
```

`variant` takes one name or several separated by spaces. A block with no
variant attribute appears in every variant.

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

Speaker notes, which replace the notes the slide mapping would generate:

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
- local: assets/keynote.mp4
- site: keynote.mp4
- gated: https://media.example.org/keynote.mp4
:::
```

`local` is a path relative to the chapter, or an entry in the asset
manifest for a referenced file. `site` is a path under the published
document. `gated` is a URL on a site that asks the viewer to sign in;
Editor holds no credentials for it and never probes it at build time.

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

An image with a caption, a credit, and a layout hint:

```
![The lantern at dusk](assets/lantern.jpg "Photograph by Carol"){.full-bleed}
```

Alt text is the caption; the title attribute is the credit.

### What each rendering does with each construct

| Construct | Article | Slides | PDF |
|---|---|---|---|
| Headings | navigation and headings | the slide mapping | contents and headings |
| `variant` | filtered before rendering | filtered before rendering | filtered before rendering |
| Horizontal rule | a rule in the text | splits the slide | a rule |
| `.divider` heading | an ordinary heading | a section-break slide | an ordinary heading |
| `.columns` | ignored; content in flow | side-by-side columns | ignored; content in flow |
| `.notes` | absent | speaker notes | absent |
| `.callout` | a callout box | a callout box | a boxed aside |
| `.credit` | margin note | line at the foot of the slide | a note |
| `.video` | player, else poster and link | player, else poster and link | poster and printed link |
| `.opening` | modal, once per browser | absent | an epigraph on the first page |
| `.egg` | collectable, Konami reveal | absent | a static aside |
| `<!-- pagebreak -->` | ignored | ignored | a page break |
| Citation, footnote | margin note | credit line | numbered reference, foot of page |

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
| `render/print` | Typst source for the journal PDF |
| `anchor` | resolves and re-resolves annotation anchors |

Four hosts run it:

1. the desktop app, inside the Tauri web view;
2. the single HTML file, in a plain browser;
3. the presenter site, for reading and presenting published documents;
4. the publish pipeline, in the build runner.

A rendering difference between hosts is a bug in the core, not a host to
be patched. **Open:** whether `render/print` emits Typst source directly or
the pipeline converts through Pandoc.

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
- running the build and reporting its status;
- claiming the key combinations the platform would otherwise take before
  the editor sees them.

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
  "roots": ["media"],
  "assets": [
    {
      "id": "b1946ac92492d234",
      "kind": "video",
      "bytes": 512000000,
      "mode": "referenced",
      "root": "media",
      "path": "talks/keynote.mp4",
      "published": "assets/b1946ac92492d234.mp4",
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
- **Identity is the content hash**, so two drops of one file yield one
  asset and one copy.
- **A referenced asset names a root, never a machine path.** The root is a
  name the author's app settings resolve locally, which keeps the document
  folder free of absolute paths and leaves room for the parked feature of
  reaching assets from anywhere.
- **Conversion** happens on drop: a phone-native image becomes a web image
  and the manifest records what it came from.

**Open:** the default threshold, whether the manifest is per document or
per Part, and the fallback when conversion is unavailable.

## 7. Annotation anchors

One sidecar per chapter, named for it, plain JSON, beside it:

```json
{
  "schema_version": 1,
  "chapter": "01-opening.md",
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
5. otherwise the annotation is listed as orphaned, never silently dropped.

A published layer is the same file, published beside the document version
and rendered by the article's script. A reader's own annotations live in
their browser and export in this format; the site stores nothing.
**Open:** the anchor format's tolerance before an annotation is called
orphaned.

## 8. The production pipeline

One production system, one action.

1. Alice presses Publish. The app runs the core, filters each variant, and
   writes the built output into a working copy of the production
   repository: article, deck, assets, and the manifest.
2. The app commits under the document's stable id and pushes with the
   author's existing git configuration.
3. The pipeline renders the PDF: it runs the core to produce Typst source
   for each variant, runs Typst, and stores each PDF beside its version.
4. Cloudflare Pages deploys the repository. The repository is private; the
   site is public.
5. Gated documents carry a Cloudflare Access policy over the document's
   path, with an email allow-list the author edits in the app.

**Open:** whether the PDF renders in a repository action on push or in the
site's build step, and whether the presenter, the article script, and the
slide engine are maintained once at the site root or versioned with each
document.

## 9. The presenter site

```
/                              the presenter shell: no id, nothing shown
/<id>/                         stable link: latest version, default variant
/<id>/<variant>/               stable link for one variant
/<id>/v/<hash>/                one published version, default variant
/<id>/v/<hash>/<variant>/      one published version of one variant
      index.html               the article
      slides/                  the deck
      paper.pdf                the journal PDF
      assets/                  copied and uploaded assets
      layers/                  published annotation layers
/<id>/latest.json              the hash the stable link currently serves
```

- The **stable id** is minted on first publish and stored in
  `document.yaml`. It is the document's identity and, for an unlisted
  document, its only protection.
- The **version hash** is computed from the built output, so a republish of
  unchanged content produces the same hash.
- Publishing writes the new version folder, then rewrites the stable paths
  to serve it and updates `latest.json`. Old version paths are never
  rewritten.
- Per-variant paths are siblings and nothing links between them.
- The presenter lists nothing and enumerates nothing: with no id, or a
  wrong one, it shows an empty shell.

**Open:** the length of the stable id and of the version hash.

## 10. The publish log

`publish-log.json` in the document folder records one entry per publish:
the timestamp, the version hash, the variants published, the flag
(`unlisted` or `gated`), and the links. The app renders it as a list with
open and copy for each entry. **Open:** whether this belongs in
`document.yaml` instead.
