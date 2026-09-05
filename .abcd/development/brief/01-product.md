# Product

What Editor is, for whom, and the assumptions the design still rests on.
This chapter holds current state: it describes the product as it is
intended, and it is rewritten rather than appended when the intention
changes.

## One line

A lightweight Markdown editor for notes and presentations.

## Who it is for

Alice is the maintainer; others come later. Alice writes notes in Markdown
and sometimes presents them. She creates on the desktop, edits the text on
her iPad, and presents anywhere on the web. She wants one file to serve all
three, wants to drag an image onto the page instead of typing a path, and
wants the presentation to work on whatever screen is in front of her
audience. Bob and Carol are her audience: they may be looking at a
projector, a tablet, or a phone, and they may be reading months later.

## Shape

- **Document model.** A book: Parts contain Chapters, Chapters contain
  Sections, Sections contain Sub-sections, Sub-sections contain
  Sub-sub-sections. On disk a Part is a folder, a Chapter a Markdown file,
  and the three levels below are headings two, three, and four inside it.
  Numeric filename prefixes give the order. The structure is the file
  system, so it is editable with any tool. A flat single-file manuscript
  splits into this shape on import; a single-chapter document is a folder
  with one file.
- **Editor.** A desktop app with an HTML frontend in its web view. A
  sidebar shows the hierarchy; the Markdown is visible and is the source of
  truth. Editing uses full Emacs key bindings. An insert palette offers the
  Pandoc constructs an author cannot be expected to remember: divider,
  columns, speaker notes, callout, variant block, video block, citation,
  footnote, page break, easter egg, opening quotation.
  Drag and drop for images, video links, and other files.
- **Assets.** Small files copy beside the chapter and are referenced by
  relative path. Large ones are referenced rather than copied, recorded
  once by content hash, and uploaded to the site on publish. A video names
  its sources in order: a local file, the published copy, and, where the
  material lives elsewhere on purpose, a separate gated website that asks
  the viewer to sign in.
- **Variants.** One text, several audiences: a block or span marked with a
  variant belongs only to that variant's renderings, each variant has its
  own link, and no page reveals that the others exist.
- **Tablet editing.** Text only, through the single HTML file: it embeds a
  text editor, imports Markdown, and exports Markdown, so the iPad, a
  borrowed machine, or a future machine with nothing installed can all
  edit. Edited Markdown goes back into the desktop app.
- **Exports.** Three from one text. Online article: Tufte-style static
  HTML with hierarchy navigation, margin notes, videos, reader controls,
  and interactive elements, optimised for desktop screens, iPad, and
  iPhone. PDF: a modern academic-journal layout, not Tufte, with strong
  tables, numbered references, contents, and page numbers, rendered by
  Typst in the publish pipeline rather than the app. Slides: a web
  presentation whose default is the hierarchy — a Section's headline is a
  slide and its text the speaker notes, a Sub-section hangs beneath it, and
  every image becomes a slide of its own — shaped further by constructs
  written in the same text. All three share footnotes and native
  bibliography references from a bibliography file beside the document.
- **Publishing.** One action through one production system: Editor builds
  the renderings, commits them under the document's stable id, pushes to
  the production GitHub repository, and hands Alice the link. Cloudflare
  Pages deploys the site: a public presenter page plus every published
  document. The stable link shows the latest version; each publish also
  keeps its own versioned link. Per document, one flag chooses unlisted or
  gated. The pipeline renders the PDF beside the document.
- **Single file.** The local alternative: one HTML file with the article and the deck,
  every asset (large media excepted), and the editor embedded.
- **Annotations.** A sidecar file per chapter holds highlights, notes,
  reviewed marks, and rehearsal decks. Private by default; the author can
  load anyone's file and publish it as a public layer.
- **Storage.** A folder of plain files the author owns. No database, no
  account, no sync; the network is touched only on publish.

## Reference prototype

The maintainer's published prototype of an online article is the target
reading experience: a single self-contained HTML file with Tufte-style
margin notes for citations, reader controls for theme, text size, and
measure, a once-only opening quotation, and easter eggs hidden in the text
that open text, images, or video and are revealed by the Konami code. It
was generated from Emacs Org mode; Editor replaces that pipeline with a
Markdown one and keeps the experience. Details in
`../research/notes/2026-09-05-prototype-article.md`.

A quick prototype slide deck by the maintainer is the reference for
slides: Markdown with horizontal-rule slide breaks, column splits, layout
hints and source credits in comments, and `Note:` speaker notes, rendered
with reveal.js. Details in `../research/notes/2026-09-05-prototype-slides.md`.

A single-file tool the maintainer built for another task is the reference
for keyboard work: a declarative key table with a label and default chords
per action, real prefix keys, one cancel chord that cancels anything, a
help panel listing the live bindings, and a modeline showing position and
mode. Its visual style is not the reference; its navigation is. Details in
`../research/notes/2026-09-05-prototype-keyboard-navigation.md`.

An existing personal writing project of the maintainer's is the acceptance
test: one flat file with four heading levels and three variants, gigabytes
of video and photographs referenced from code rather than text, and a
hand-built reading app with rehearsal decks and annotations that round-trip
into Markdown. Reviewed by three models, form only, in
`../research/notes/2026-09-05-acceptance-project-review.md`.

## Publishing domain

The public presenter site lives at `magnumesque.com`, registered with
Cloudflare. It is the product's public address, not infrastructure.

## Constraints

Locked decisions live in [`02-constraints.md`](02-constraints.md), which is
authoritative. Evidence, open questions, and the trade-offs taken live in
[`03-evidence.md`](03-evidence.md). The table below keeps only what is
still genuinely an assumption.

## Assumptions held until overturned

| Assumption | Why it is held | How it is settled |
|---|---|---|
| Emacs bindings survive inside a web view, with the shell claiming the combinations the platform would otherwise take | CodeMirror's Emacs keymap implements them; Tauri can intercept at the window level | The spike in [`06-delivery.md`](06-delivery.md) |
| The binding table is data — an id, a label, and default chords per action — shown in a help panel rather than documented apart from the app | The keyboard-navigation prototype does exactly this | Confirmed by the spike |
| CodeMirror is the editing surface in both the app and the single file | One editor build for both, and its keymap is the candidate named in the constraints | Confirmed or replaced by the spike |
| A hardware keyboard on the iPad gives the same bindings in Safari | The tablet path is the single file opened in Safari | The spike, on the tablet target |
| Interactive elements degrade to static content the PDF can print | One source must print sensibly | Per-element fallback specified with the article |
| Document metadata lives in a YAML file at the document root | Chapters stay pure Markdown; every tool still reads them | Open question in [`03-evidence.md`](03-evidence.md) |
| The stable id is long enough that guessing it is not a threat | Unlisted documents rely on it, gated ones do not | Open question: id and hash length |
| Editor pushes with the author's existing git setup and holds no token | Nothing to store, nothing to leak | Open question: confirm with the first publish |
| The presenter and the renderers are maintained once in the production repository and shared by every document | One place to fix a bug in the reading experience | Open question: confirm against versioned output |
| Sidecar annotations re-attach after edits from a quoted excerpt plus a position | The maintainer's own reading app does this already | Anchor format, open in [`03-evidence.md`](03-evidence.md) |
| Byte-fidelity on round trip is achievable through one parser and one serialiser | The acceptance project makes it a hard criterion | Proven by the round-trip discipline's tests |
| reveal.js drives the deck on the presenter site, and a dependency-free build drives it inside the single file | The slide prototype proves both, and a CDN is unacceptable offline | Confirmed with the first published deck |
| Assets reachable from anywhere for editing is a future feature | Deferred deliberately; nothing in the design forecloses it | Revisited after the first phases ship |

## Not in scope now

Collaboration, cloud sync, a standalone tablet app, WYSIWYG editing, author
themes, alternative key binding sets, and assets reachable from anywhere
for editing away from the computer (parked as a future feature). Each is a
candidate for its own intent once the first ones ship.
