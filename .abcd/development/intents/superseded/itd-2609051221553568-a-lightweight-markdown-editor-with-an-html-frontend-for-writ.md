---
id: itd-2609051221553568
slug: a-lightweight-markdown-editor-with-an-html-frontend-for-writ
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051335399446, itd-2609051335406422, itd-2609051335415528, itd-2609051335420536, itd-2609051335447894, itd-2609051335458626, itd-2609051335468596, itd-2609051335479329, itd-2609051335489928, itd-2609051335492327, itd-2609051335502171, itd-2609051335518134, itd-2609051335529787, itd-2609051335537470, itd-2609051335541009, itd-2609051335568936, itd-2609051335570842, itd-2609051335586905, itd-2609051335598083, itd-2609051336005698, itd-2609051336019782, itd-2609051336025064, itd-2609051336037640, itd-2609051336040242, itd-2609051336055362]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Editor: create on the desktop, edit on a tablet, present anywhere on the web

## Press Release

Editor is a lightweight desktop Markdown editor that turns the same file into
notes and into a presentation. Authors write in an HTML frontend inside a
desktop app; it behaves like a text editor, not a word processor, the
Markdown stays visible and stays the source of truth, and the full Emacs key
binding set works for editing: movement, kill and yank, marks and regions,
incremental search, and the usual prefix keys. Images, video links, and other files are added by dragging
them onto the page; Editor stores each asset beside the document and writes
the Markdown reference for it.

A document is structured as a book: Parts contain Chapters, Chapters contain
Sections, Sections contain Sub-sections. Each Part is a folder, each Chapter
a Markdown file, and Sections and Sub-sections are the headings inside it,
so the structure is visible in the file browser and editable with any tool.
Reordering a chapter is renaming a file.

The same document exports three ways. As an **online article** in the Tufte
style: static HTML with navigation drawn from the hierarchy, citations and
footnotes as margin notes, embedded videos, and interactive elements,
optimised for desktop screens, iPad, and iPhone. As a **PDF**, rendered by Typst in the
publish pipeline rather than the app: a printable document in a modern
academic-journal layout with a table of contents, page numbers, strong
tables, numbered references, and video replaced by a poster frame and a
link. As **slides**: a web presentation where each
Section becomes a slide and each Sub-section a step within it by default,
and where the author can add horizontal rules, columns, dividers, layout
hints, and speaker notes in the same source to shape the talk, navigable
by keyboard, touch, and on-screen controls.

Publishing is one action through one production system. Editor builds the
presentation, commits it under a folder named by an unguessable hash, and
pushes to the production GitHub repository. Cloudflare Pages deploys the
site, which holds the public **presenter** page and every published
document. Editor then hands Alice the hash. She adds it to the presenter
URL and the presentation shows from anywhere, on any device; without a
hash, the presenter shows nothing and lists nothing.

The PDF is not made on the desktop. The production pipeline renders it
during deployment and stores it beside the document, so the printable book
is one more link the presenter offers.

The local alternative is a **single HTML file** with the presenter and every
asset embedded, videos excepted where they are too large. That file is also
an editor: it imports a Markdown file, lets Alice edit the text with the
same Emacs bindings, and exports the Markdown back. It is how Alice edits on
her iPad, on a borrowed machine, or years later with nothing installed. The
edited Markdown goes back into the desktop app, which exports and pushes.

Alice keeps lecture notes as Markdown. She drafts on the desktop, tidies the
wording on her iPad in the single-file editor the evening before, imports
the result back on the desktop, and pushes to her site with one action. On the day, Bob follows on his phone from the back row and
Carol reads it later at her desk. Nothing was converted, and nothing lives in
a format Alice does not own.

## Why This Matters

Presentation tools own the content: a deck lives in a proprietary format, and
notes written for it cannot be reused without export. Markdown solves the
ownership problem but existing Markdown presentation tools assume a fixed
16:9 canvas and a developer's toolchain. Editor keeps plain files, adds the
drag-and-drop convenience that makes people reach for a word processor, and
makes the presentation a responsive web page rather than a scaled slide.

## Mechanism

We expect one hierarchy to serve website, PDF, and slides because the
Part/Chapter/Section/Sub-section levels map directly onto folder, file,
heading level two, and heading level three, which every Markdown tool
already reads, and onto site navigation, PDF bookmarks, and slide-with-steps
without a second markup. We expect authors to find the structure easy to
edit because it is the file system: moving a chapter is moving a file, and
nothing else needs to change. We expect a presenter page plus hashed document
folders to keep publishing simple because Cloudflare Pages deploys from a
git push with nothing else to operate, the presenter is written once, and
publishing a document is committing a folder and reporting its hash. We expect the single HTML file to double as an
editor because a browser can read a chosen local file and offer a download,
which is all import and export need. We expect a responsive HTML render to read
better on phones than a scaled canvas because text reflows at the viewport
width instead of shrinking below legibility. We expect drag-and-drop with
assets stored beside the document to keep the format portable because a
folder of Markdown plus relative links is the lowest common denominator every
other tool reads.

## Scope Conditions

- The editor is a desktop app whose frontend is HTML running in the app's
  web view. Which desktop shell wraps it is an architecture decision for an
  ADR; the Cargo gitignore points at Tauri.
- The presentation is a static website: HTML, CSS, and assets that a plain
  file host serves. It is optimised for desktop screens, iPad, and iPhone in
  the current Safari and Chromium engines.
- Documents are plain Markdown files in a folder the author owns; assets are
  files in that folder referenced by relative path. No database.
- A document is a folder: Parts are sub-folders, Chapters are Markdown
  files, Sections are level-two headings, Sub-sections are level-three
  headings. Order comes from a numeric filename prefix. A single-chapter
  document is the degenerate case and works the same way.
- Interactive elements are declared in the Markdown source and rendered by
  a script the export carries. The first set follows the maintainer's
  prototype article (see `research/notes/2026-09-05-prototype-article.md`):
  citations as margin side notes, reader controls for theme, text size, and
  measure, a once-only opening quotation, and easter eggs hidden in the
  text with a Konami-code reveal. PDF renders their static content.
- Citations are native bibliography references: a citation key in the text
  resolves against a bibliography file kept beside the document, and every
  export renders the same reference list. Footnotes are Markdown footnotes.
  In the article and the PDF both render as Tufte margin notes; in slides
  they render as a notes line on the slide.
- Video is linked (a URL or a local file path), never transcoded or hosted by
  Editor.
- Editor runs no server and no sync. The desktop app is the only holder of
  the source files, every export is produced offline, and the network is
  touched only by the explicit publish action, which is a git push.
- The production system is one GitHub repository deployed by Cloudflare
  Pages. It holds the presenter page, the slides engine, the site shell,
  and one folder per published document named by a hash the site does not
  reveal. Editor pushes built documents there and returns the hash; the
  presenter loads a document from the hash in its URL.
- The PDF is produced by the production pipeline during deployment, not by
  the desktop app, and is stored beside the document. The app exports
  website and slides locally; it does not export PDF.
- Assets live on the author's computer and, once published, in the
  production repository. Making assets reachable from anywhere for editing
  is a future feature, not part of this intent.
- The hashed folder is unlisted, not private. Anyone holding the link can
  read the document, and a static host cannot check who asks. Content that
  must not be public does not go on this site.
- The local packaging is one self-contained HTML file: presenter, assets, and a
  text editor embedded; videos may stay external. It imports and exports
  Markdown only, never assets, so it is the tablet and anywhere-else editing
  path and the desktop app remains the place where assets are added.
- Tablet editing is text-only, through the single HTML file opened in
  Safari on the iPad with a hardware keyboard.
- Single author. Concurrent editing from two devices is not supported; the
  last write wins and the app says so.
- Emacs key bindings are the one binding set. They apply in the desktop app
  and, with a hardware keyboard, in the tablet view; the web view must not
  let the browser or OS swallow them.

## Acceptance Criteria

- Given a Markdown file on disk, when Alice opens it in Editor, then she sees
  the Markdown text in an editable HTML view and every edit writes back to
  the same file.
- Given the editor focused, when Alice uses the standard Emacs editing
  bindings (movement by character, word, line, and buffer; kill and yank;
  set mark and act on the region; incremental search forward and backward;
  undo), then each performs its Emacs meaning and none is intercepted by the
  browser or the operating system.
- Given an image file dragged onto the editor, when the drop completes, then
  the image is copied beside the document and a Markdown image reference with
  a relative path is inserted at the drop position.
- Given a video URL dragged or pasted onto the editor, when the drop
  completes, then a Markdown link is inserted and the presentation renders it
  as an embedded player.
- Given any other file dragged onto the editor, when the drop completes, then
  the file is copied beside the document and a Markdown link to it is
  inserted.
- Given a document folder with two Parts, each holding two Chapters with
  Sections and Sub-sections, when Alice opens it in Editor, then the sidebar
  shows the four-level hierarchy and selecting any node opens that chapter at
  that heading.
- Given a chapter file renamed to change its numeric prefix, when Editor
  reloads the folder, then the chapter appears in its new position in the
  sidebar and in all three exports, with no other file changed.
- Given a document, when Alice exports it as an online article, then the
  result is static HTML in the Tufte style with navigation across every
  Part, Chapter, and Section, citations and footnotes in the margin, every
  video playable, every interactive block working, and every page legible
  on iPhone, iPad, and desktop widths without horizontal scrolling or pinch
  zoom.
- Given a chapter containing a citation key, a footnote, and a bibliography
  file beside the document, when the article, the PDF, and the slides are
  produced, then all three show the same numbered reference, the same
  footnote text, and the same reference list entry.
- Given a published document, when the publish pipeline has finished, then
  a PDF is stored beside the document in a journal-style layout with a
  table of contents that follows the hierarchy, page numbers, footnotes,
  a numbered bibliography, every image, and for each video a poster frame
  with the link printed beneath it, and the presenter links to it.
- Given a document, when Alice exports it as slides, then each Section is
  one slide, each Sub-section is one step within its slide, keyboard, touch,
  and on-screen controls move between them, and the deck is legible on
  iPhone, iPad, and desktop widths.
- Given a document, when Alice exports it as a single HTML file and opens
  that file from disk on a machine with no network access, then every page
  or slide, image, style, script, and font shows, and videos either play
  from an embedded copy or show a poster frame with their link.
- Given the single HTML file open in Safari on an iPad with a hardware
  keyboard, when Alice imports a Markdown file, edits it with Emacs
  bindings, and exports, then the exported Markdown differs from the import
  only by her edits.
- Given a Markdown file exported from the single HTML file, when Alice
  imports it into the desktop app, then the document updates in place and
  every asset reference still resolves.
- Given a document and a configured production repository, when Alice
  publishes, then Editor builds the presentation, commits it under a new
  hash folder, pushes, and shows Alice the hash; and once Cloudflare Pages
  has deployed, opening the presenter URL with that hash on an iPhone, an
  iPad, and a desktop browser shows every page, asset, and video.
- Given a document published twice, when the second publish completes,
  then the first hash still shows the first version and the second hash
  shows the second, and Editor tells Alice which is current.
- Given the published site, when the presenter URL is opened without a
  hash, or with a wrong one, then it shows nothing about any document and
  lists no folders.

## Open Questions

Most questions below were settled by the product grill of 2026-09-05 and
now live in `brief/02-constraints.md`; this draft is due to be split into
standalone intents and superseded. Remaining here for the record:

- Desktop shell: Tauri is the candidate the Cargo gitignore implies. Confirm
  it in an ADR, or name the alternative.
- Single-file import and export of a book: the source is a folder of
  chapter files, but the single HTML file moves "the .md only". Either it
  imports and exports one chapter at a time, or a single combined Markdown
  with Part and Chapter markers that the desktop app splits and joins. The
  combined form keeps one-file round trips; the per-chapter form keeps the
  folder model pure.
- Document key: where does it go in the presenter URL (fragment, query, or
  path), and how long a hash is enough for unlisted-but-not-private?
- Video in the single-file packaging: always external links, or embedded
  when under a size the author sets?
- Production repository visibility. Cloudflare Pages deploys from a private
  GitHub repository exactly as from a public one, and the site is public
  either way. A private repository keeps assets out of a public git
  history, which cannot be withdrawn later, at no cost to the design. The
  intent assumes the repository is private; say if it must be public.
- PDF rendering in the pipeline: a GitHub Action on push, or a Cloudflare
  Pages build step? The Action can run a headless browser; the Pages build
  is simpler but more constrained.
- Publishing credentials: Editor uses the author's existing git setup on
  the machine to push, and holds no token of its own. Confirm.
- Presenter delivery: maintained once in the production repository and
  shared by all documents, rather than shipped with each publish. Confirm.
- Hash lifecycle: does a re-publish reuse the document's hash (one stable
  link, content changes) or mint a new one (old links keep old content)?
  The acceptance criteria assume a new hash per publish.
- From the acceptance-project review
  (`research/notes/2026-09-05-acceptance-project-review.md`), each of
  these is unaddressed by this intent and needs a home in the brief or a
  sibling intent: a split-on-import path from one flat file and a fourth
  heading level; conditional content per variant as an in-Markdown marker;
  referenced-not-copied assets above a size, HEIC conversion, and
  de-duplication; a `Video:` line with pipe-separated fallback sources;
  reader-layer state (highlights, notes, reviewed marks, rehearsal decks)
  kept beside the text with round-trip conventions; and byte-fidelity of
  the Markdown on round trip.
- Future feature, parked: assets reachable from anywhere for editing away
  from the computer. Candidates when it is picked up: a private object
  store the app and the single HTML file both read, or a synced folder.
- Editing surface: raw Markdown with live preview, or a WYSIWYG view that
  round-trips to Markdown? The press release assumes the former.
- Presentation theming: one built-in responsive theme first, with author
  themes later?
- Local video files: copied into the exported folder as-is, or left as links
  to the author's own hosting?
- Interactive elements: the first set is fixed by the prototype. How each
  is written in Markdown so the PDF has a sensible static fallback is still
  to be specified.
- Citation syntax and bibliography format: Pandoc's `[@key]` convention
  with a BibTeX or CSL-JSON file is the assumption, because it is the one
  Markdown citation syntax with an ecosystem. Confirm.
- Slide authoring versus derivation: Section as slide and Sub-section as
  step is the default, and the maintainer's slide prototype (see
  `research/notes/2026-09-05-prototype-slides.md`) shows the author also
  needs horizontal-rule splits, column splits, divider slides, layout
  hints, speaker notes, and per-slide source credits in the same text. How
  each slide-only construct is written so the article and PDF ignore it,
  and how article-only content is summarised or skipped on a slide, is the
  central open question for the spec.
- Emacs coverage: which prefix keys and which of the less common bindings
  count as "full"? A written binding table should accompany the spec so the
  acceptance test has a finite list.
- PDF engine in the pipeline, now sharpened by the Tufte requirement: a
  headless browser printing the article with paged-media CSS keeps one
  renderer but margin notes in print are the hard case; Pandoc with the
  Tufte LaTeX classes gives the canonical Tufte PDF at the cost of a second
  renderer and a TeX toolchain in the pipeline.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
