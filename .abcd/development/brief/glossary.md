# Glossary

One entry per term the brief uses in a particular way. Terms are defined
here once; the chapters use them without redefining them.

## The document

**Part** — a folder inside a document folder, holding chapters. The top
level of the book hierarchy. Its numeric filename prefix gives its order.

**Chapter** — a Markdown file inside a Part. The unit that opens in the
editor, carries one annotation sidecar, and moves through the single HTML
file's import and export. Its level-one heading is its title.

**Section** — a level-two heading inside a chapter, and everything under it
up to the next level-two heading. The unit the slide mapping turns into a
horizontal slide.

**Sub-section** — a level-three heading. The slide mapping turns it into a
vertical slide beneath its Section.

**Sub-sub-section** — a level-four heading. Present because real documents
use it; two thirds of the acceptance project's headings are at this level.

**document** — a folder holding one book: its metadata, its bibliography,
its manifest, its Parts and Chapters, and their assets. It is the thing
that has a stable id and gets published.

**document metadata** — `document.yaml` at the document root: title,
subtitle, abstract, author, affiliation, variants, default variant,
bibliography, citation style, theme, asset threshold, and the stable id.
Everything belonging to the whole document lives there; a chapter's own
front matter is chapter-level only.

**variant** — one of several renderings of a document's text for different
audiences. A block or span marked with a variant belongs to that variant
alone; unmarked content belongs to all of them. Variants are declared once
in the document's metadata, selected by link, and never exposed as a
switcher. A variant block may contain headings, so a Section can belong to
one audience alone.

**round trip** — reading a document's Markdown and writing it back, through
any path: the editor, the split on import, the single HTML file. A round
trip must return the source byte for byte except where the author edited.

## Publishing

**stable id** — the unguessable identifier minted for a document on its
first publish and stored in its metadata. It names the document's place on
the presenter site for the rest of its life, and its stable link always
shows the latest version.

**variant token** — the unguessable path segment minted for each of a
document's variants, sitting between the stable id and the version in
every link. It is not the variant's name, so no link to one variant can be
shortened or guessed into another.

**version hash** — a hash computed from one publish's built output. Each
publish keeps its own path under the variant token, so a link shared in
March still shows what it showed in March. Unchanged content republishes to
the same hash and adds no version.

**presenter** — the public page at the root of the published site. It shows
a document when its URL carries a variant token, and otherwise shows the
same empty page — which is also the site's not-found page — listing
nothing and enumerating nothing.

**unlisted** — published so that anyone holding the link can read it, with
nothing on the site linking to it or listing it. Unlisted is not private:
a link, once shared, cannot be recalled.

**gated** — published behind an access policy with an email allow-list, so
that a reader is asked to sign in and only an allow-listed address gets
through. The choice between unlisted and gated is made at every publish and
applies to the whole document: every version and every variant under its
id. The pipeline applies the policy from a file committed beside the
document's output, so Editor holds no credential for the access provider.

**publish log** — the record inside the document folder of every publish:
its timestamp, version hash, variants, flag, and links. Every publish makes
an entry, including a republish that changes nothing and the withdrawal
that takes a document off the site.

**production repository** — the private GitHub repository that Editor
pushes built documents to and that Cloudflare Pages deploys as the public
site.

**object store** — the storage the pipeline puts assets in when they pass
the host's per-file ceiling, under the same document id. The credential for
it is the pipeline's; the app never holds one.

## Assets

**referenced asset** — an asset above the size threshold, which Editor does
not copy into the document folder. It is recorded once in the manifest by
content hash, against a named root the author's machine resolves, and it
uploads to the site once on publish. Below the threshold an asset is
*copied* instead: it lives in the `assets/` folder beside its chapter and
is referenced by a relative path.

**threshold** — the size, set per document, that decides between a copied
and a referenced asset.

**ceiling** — the host's per-file limit for the deployed repository. A
referenced asset above it is published through the object store instead of
the repository. The ceiling belongs to the host, not to the author, and is
not a setting.

**asset root** — a name for a place on the author's machine where large
assets live, resolved by app settings rather than written into the
document. It keeps machine paths out of the document folder.

**video source list** — the ordered list of places a video block may be
played from: the local file, the copy on the published site, and a copy on
a separate gated website that asks the viewer to sign in. Renderings try
them in order and fall back to a poster and a link.

## Renderings

**article** — the online rendering: Tufte-style static HTML with margin
notes, navigation drawn from the hierarchy, reader controls, and
interactive elements. The primary artefact; the single file derives from
it.

**slides** — the web presentation rendering, produced from the same text by
the default mapping and the authored slide constructs.

**PDF** — the print rendering, in a modern academic-journal layout,
produced by Typst in the publish pipeline and never in the app.

**single file** — one self-contained HTML file holding one variant of the
document: the article, the deck, and every embedded asset, opening from
disk with no network. It is also an editor, a chapter at a time: it imports
a chapter's Markdown, edits it with the same bindings, and exports the
Markdown back.

**rendering core** — the one TypeScript implementation of parsing,
serialising, variant filtering, and every rendering, shared unchanged by
the desktop app, the single file, the presenter site, and the pipeline.

## Editing

**insert palette** — the list, one key away in the editor, of the canonical
Pandoc constructs: divider, columns, speaker notes, callout, margin aside,
credit, variant block, variant span, video block, citation, footnote, page
break, easter egg, opening quotation. Choosing one inserts its exact form
at the cursor.

**canon** — the Markdown Editor writes and reads: Pandoc-compatible, with
every extension expressed in one of five forms — a fenced div with
attributes, a heading attribute, an image attribute, a bracketed span
attribute, or an HTML comment. Pandoc's own citations and footnotes are
not extensions and need no form of their own.

**credit** — the fenced div that names a source: a margin note in the
article, a line at the foot of the slide, a note in the PDF. A citation in
the same Section supplies a slide's credit line the same way.

**margin aside** — a bracketed span marked `.margin`, a remark that sits in
the margin of the article without a marker in the text.

**binding table** — the finite list of Emacs key bindings the editor
supports: one entry per action with an id, a label, and its chords, held as
data, shown to the user in a keys panel, produced by the spike, and used as
the acceptance list.

**import by split** — turning one flat Markdown file into a document
folder beside it: the document's metadata and one Part, `01-chapters/`,
the same name a new document is given, holding one chapter file per
top-level level-one heading, numbered in order, with any text before the
first heading as the first chapter and the text otherwise unchanged.

## Annotations

**sidecar** — the plain JSON file beside a chapter that holds annotations
for it. The chapter's Markdown is never modified by annotating.

**anchor** — the record that ties one annotation to a passage: a heading
path, a block index, a quoted excerpt with its surrounding text, and
offsets. It is re-resolved on load so that annotations survive edits.

**orphaned** — what an annotation becomes when its anchor no longer
resolves: listed, kept, and shown to be adrift, never re-attached to words
it was not written against.

**layer** — a named annotation file published beside a document version so
that readers can show or hide it. Alice makes a layer from her own
annotations or from a file someone sends her; no layer is on until a
reader turns it on, and private annotations stay private.

**rehearsal deck** — cards generated from a chapter's headings and stored
in the sidecar, run in flip mode or scored mode for recall rather than for
an audience.

## Structure of the work

**intent** — one user-facing moment, with its own press release and
Given-When-Then acceptance criteria. Standalone, a bundle-member, or a
discipline; see [`07-intent-map.md`](07-intent-map.md).

**discipline** — a cross-cutting rule with no user moment of its own, which
every spec inherits and every acceptance list repeats.

**plumbing** — machinery with no user moment. It has no intent and is
described in [`05-internals.md`](05-internals.md) instead.

**spike** — a throwaway experiment run to settle a risk before product code
depends on it. There is one: Emacs bindings inside the desktop shell.

**acceptance project** — the maintainer's existing personal writing
project, recorded by form only, which Editor must be able to hold: four
heading levels, three variants, gigabytes of media, and reader-layer state.
