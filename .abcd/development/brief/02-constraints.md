# Constraints

Locked decisions, each from the product grill of 2026-09-05. A constraint
here is current state: change it by a decision line and an edit, not by a
note that it used to be otherwise. Rationale for the architecture-shaping
ones graduates to ADRs under `../decisions/adrs/`.

## Audience and order

- **Alice is the maintainer first, others later.** Design for one user;
  onboarding and settings are a planned second phase, not an afterthought.
  The file format is generic from day one so that phase costs no migration.
- **The online article is the rendering that must be perfect first.** The
  single HTML file derives from it. Slides are the first usable slice,
  because a talk has a date; the article is the primary artefact.

## Editor

- **The app is the editor.** Emacs key bindings are ported into the web
  editing surface (CodeMirror's Emacs keymap is the candidate) and tested
  against a written binding table. Emacs itself remains free to edit the
  files, because the format is plain.
- **Desktop shell is Tauri 2.** System web view (the Safari engine on
  macOS, matching iPad and iPhone), Rust for files, hashing, git, and the
  build. iOS is a possible later target for the tablet.

## Document model

- **On disk: a folder of chapters.** Part = folder, Chapter = Markdown
  file, Section = H2, Sub-section = H3, Sub-sub-section = H4. Numeric
  filename prefixes give the order. A flat single-file document is split
  into chapters on import. A single-chapter document is a folder with one
  file.
- **Markdown canon: Pandoc-compatible plus fenced divs.** Every extension
  is a fenced div with attributes, a heading attribute, or an HTML
  comment, so Emacs, Pandoc, and any plain renderer read the file and
  degrade gracefully. Citations are `[@key]` against a BibTeX file beside
  the document; footnotes are Pandoc footnotes.
- **Variants are core.** A document can carry several variants of one
  text. A block or inline span marked with a variant class is included
  only in that variant's renderings. Selection lives in the link: each
  variant has its own link under the document's stable id, and readers
  never see a switcher.
- **Slides are hybrid.** Section = slide and Sub-section = step by
  default; inside a section, a horizontal rule splits further, a `notes`
  div carries speaker notes, a `columns` div lays out columns, and a
  heading attribute marks a divider slide. The article and PDF ignore all
  of these.
- **Annotations are sidecar files, one per chapter.** Highlights, notes,
  reviewed marks, and rehearsal decks live beside the chapter, keyed to
  text anchors that survive edits. A reader's annotations are private to
  their browser and exportable as a file. The author can load anyone's
  annotation file, review it, and publish it as a public layer.

## Exports

- **Three renderings from one text.** The online article in the Tufte
  style with margin notes; the PDF in a modern academic-journal layout
  with strong tables and numbered references, explicitly not Tufte; web
  slides. All three share footnotes and bibliography.
- **PDF engine is Typst**, run in the publish pipeline, never in the app.
- **Assets: embed small, link large.** Below a size threshold the author
  sets, assets embed in the single HTML file and copy into the published
  folder. Above it, they upload to the site once and every export links
  there. The single file works offline except for large media, which
  shows a poster and a link.
- **The single HTML file is reader and editor.** It imports and exports
  Markdown only; assets are added in the desktop app.

## Publishing

- **One production system.** Editor builds, commits under the document's
  id, pushes to the production GitHub repository, and Cloudflare Pages
  deploys the public presenter page plus every document. The repository
  is private; the site is public.
- **Stable link plus versioned hashes.** Each document has one stable
  unguessable id; each publish adds a content hash beneath it. The stable
  link shows the latest; old hashes keep old versions.
- **Per document: unlisted or gated.** One flag at publish time. Unlisted
  documents rely on the unguessable id; gated ones sit behind Cloudflare
  Access with an allow-list. The flag exists from the first publish.
- **Network only on publish.** No server, no sync, no cloud service.
