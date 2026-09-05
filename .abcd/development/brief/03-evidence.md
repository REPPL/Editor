# Evidence

What is already proven, what is still open, and what each locked decision
cost. Evidence comes from three sources, all recorded by form only under
[`../research/notes/`](../research/notes/): the maintainer's published
prototype article, their prototype slide deck, and the personal writing
project that serves as the acceptance test.

## What the prototypes prove

### The article prototype

| Proven | What it means for Editor |
|---|---|
| One self-contained HTML file, under half a megabyte, with images embedded as data URIs, opening identically from disk and from the web | The single-file packaging is a primary reading artefact, not a fallback |
| Two heading levels below the title, an abstract, keywords, an epigraph, and a clickable contents list | Chapter, Section, Sub-section map onto the reading experience with no translation |
| Tufte layout with numbered citations and their full reference in the margin, folding into the flow on narrow screens | Margin notes work on all three device classes with CSS alone |
| Reader controls for theme, text size, and measure, persisted in the browser | The controls are cheap and belong to the article, not the author |
| A once-only opening quotation, remembered per browser | An authored construct with a per-browser memory is workable |
| Easter eggs that open text, an image, or a video, collect into a tray, and are revealed by the Konami code | Interactive elements can be declared in the source and rendered by a script the file carries |
| Video embeds on the web and shows a thumbnail with a link when the file is opened from disk | The video rule for every rendering |

Nothing in that reading experience depends on Org mode: it depends on the
heading structure and the rendering script, both of which Editor supplies
from Markdown.

### The slide prototype

| Proven | What it means for Editor |
|---|---|
| Roughly fifty slides authored by hand in one Markdown file | A talk is authored, not only derived from a hierarchy |
| Horizontal rules between slides, a column separator line, layout and source credits in HTML comments, `Note:` speaker notes | The set of slide-only constructs an author actually reaches for |
| Statement slides, dividers, image-only slides, columns, and repeated slides with one line added | The default mapping alone does not make a usable talk |
| reveal.js with a CDN for the published render, and a dependency-free single-file render with the source embedded in a script tag | A CDN is acceptable on the site and unacceptable in the single file |

### The keyboard-navigation prototype

A single-file tool the maintainer built for another task is the reference
for how keys are organised, recorded in
`../research/notes/2026-09-05-prototype-keyboard-navigation.md`.

| Proven | What it means for Editor |
|---|---|
| A declarative key table: each action has an id, a label, and default chords, rendered in a keys panel and in tooltips | The binding table the constraints ask for is data, not code, and it can be shown to the user rather than documented elsewhere |
| Explicit modifier mapping, with chords built from the event | One vocabulary across the editor and the reading views |
| Real prefix keys, with the prefix state visible, working inside a text field | Prefix keys are achievable in a web view, which is the spike's central risk |
| `C-g` and Escape cancel anything: a search, a panel, an overlay, a prefix | One cancel rule every surface obeys |
| Help one chord away, listing the live bindings | The binding table doubles as the help |
| Overlays own the keyboard while open and navigate with the same chords | The presenter, the single file, and the palette inherit the same navigation |

### The acceptance project

| Proven or demanded | What it means for Editor |
|---|---|
| One flat file: about 7,900 words, 814 lines, 177 headings at four levels, two thirds of them at the fourth | Import must split, and the fourth heading level is not optional |
| Three copies of the same text, one already drifted by some thirty lines | One source, always: divergent copies are what Editor exists to end |
| Three variants of one text, with conditionality living in heading heuristics and positional CSS | Variants are a document-model feature with an explicit in-text marker, ranked the top risk by the strongest reviewer |
| About 2.5 GB of assets against 7,900 words: six videos of 150-512 MB, some 80 phone-native photographs with larger conversions, 17 PDFs, duplicated sets | Referenced-not-copied assets above a threshold, format conversion on the way in, and de-duplication by content hash |
| Video wired from JavaScript by filename convention, with a fallback chain of local file, remote host, and link-out behind a sign-in probe | The ordered video source list, including a gated source, is proven prior art |
| Annotations round-tripping into Markdown through a fenced note block, a `done` comment after a heading, and an inline mark tag with a colour | Reader-layer state is real, and an HTML-to-Markdown round trip is prior art rather than a novelty |
| Three page-break comments honoured by a print preamble, with no committed build command | Page breaks belong in the canon; the print route must be reproducible |
| Byte-level hazards: 544-character lines, byte-identical duplicate images, a percent-encoded folder path containing a space | Round-trip byte-fidelity is a hard acceptance criterion, not a nicety |
| Zero citations, footnotes, bibliography, code fences, or block quotes | Citations need a different acceptance document; this one cannot test them |
| An existing test suite of about 67 tests and its own decision log | Success and regression on the acceptance test are measurable |

## Open questions

Questions the constraints have settled are dropped. What remains:

### Document model and canon

- Whether the sidebar edits structure — dragging a chapter between Parts —
  or whether structure edits stay in the file system for the first release.

### Editor

- The binding table: which prefix keys and which of the less common Emacs
  bindings count as "full". A written table is the finite acceptance list.
- Whether individual chords in that table are rebindable and persisted, as
  the keyboard-navigation prototype allows. Alternative binding *sets* are
  out of scope; rebinding one action is a different question.
- Which navigation chords the reading views share with the editor.
- Which key combinations macOS and the web view take before the editor sees
  them, and which of those the shell can claim back.
- How concurrent edits from two devices are detected so that last-write-wins
  can be reported rather than silently applied.

### Assets

- The default size threshold between copied and referenced assets.
- What happens when conversion of a phone-native image is unavailable: a
  placeholder, a refusal, or the original left in place.

### Article and slides

- Whether easter-egg content can itself be a variant-marked block.
- The exact static fallback each interactive element renders for print.
- The slide theme: one built-in theme, or the prototype's theme ported.
- Whether a video carries a transcript or another text alternative, and
  where it sits in each rendering. A moment for a later intent.
- Whether the reading views offer full-text search across a document, as
  distinct from the editor's in-buffer search. A moment for a later
  intent.

### Citations

- Which citation styles ship first.

### Publish and pipeline

- The length of the stable id, of each variant's path token, and of the
  version hash.
- The host's per-file ceiling, above which an asset goes to object storage
  rather than through the repository. The internals chapter states the
  figure; the first publish confirms it.
- Whether the PDF renders in a repository action on push or in the site
  build step.
- Confirmation that Editor pushes with the author's existing git setup and
  holds no token of its own, and that the pipeline is the only holder of
  the storage and access secrets.
- Which Typst journal template ships: a published one or Editor's own.

### Annotations

- The anchor format and how much editing it tolerates before an annotation
  is reported as orphaned rather than re-attached.

## Trade-offs taken

Each locked decision bought something and cost something. The alternative
named is the one actually considered and rejected.

| Decision | Alternative rejected | Cost accepted |
|---|---|---|
| A folder of chapters as the on-disk model | One flat file with heading-driven structure, as the acceptance project uses | Import must split and the single-file editor must move one chapter at a time |
| Pandoc-compatible Markdown plus fenced divs for every extension | A bespoke lightweight syntax, or metadata in HTML comments only | More verbose source; the author needs the insert palette to remember it |
| Variants as an in-text marker | Separate files per variant, or an export-time filter driven by selectors | Every renderer and every link must honour variant selection, and the author must keep the marks correct |
| A journal-style PDF rendered by Typst in the pipeline | Printing the Tufte article through a headless browser with paged-media CSS, or Pandoc with the Tufte LaTeX classes | A second renderer and a template to maintain, and a PDF that deliberately looks unlike the article |
| One production system: a private GitHub repository deployed by Cloudflare Pages | Two channels — public code in git, private content uploaded straight to object storage | Assets enter a git history, which is why the repository is private |
| Assets above the host's per-file ceiling uploaded to object storage by the pipeline, under the same document id | Pushing every asset through the repository, or dropping the promise to carry large video at all | One action still, but two stores behind it, and a storage secret the pipeline holds and the app never sees |
| One continuous editing surface, with the Markdown always visible | A browse mode and an edit mode, switched by a chord | No reading-optimised view of the source in the app; the surface must be the same one the single HTML file carries, and it can only be one thing |
| The single HTML file as the only local artefact | The app exporting a site folder of article and deck files | Alice cannot hand someone a folder to serve; anything local is one file or a published link |
| A stable id with version hashes beneath it | A fresh unguessable hash on every publish, with no stable link | The stable link is a standing secret: it cannot be withdrawn without unpublishing |
| Unlisted by default with a gate available per document | An account system, or making everything gated | Anything confidential depends on the host's access control being configured correctly |
| Emacs bindings ported into a web editing surface | Embedding a real editor process, or writing a native editing surface | A spike, a binding table, and a fight with the platform over key combinations |
| Annotations in sidecar files | The acceptance project's in-text conventions, which round-trip into the Markdown | An anchor model that must survive edits; the in-text conventions remain an import path |
| Referenced assets above a threshold | Copying every asset beside the chapter | A document is not self-contained above the threshold, and the single file degrades to a poster and a link |
| A responsive HTML deck | A fixed presentation canvas scaled to the screen | Slide layout has to survive reflow, so exact visual placement is not available |
| One TypeScript rendering core shared by app, single file, presenter site, and pipeline | A renderer per host, each tuned to its environment | The core must run unchanged in a web view, a plain browser, and a build runner |
| Network only on publish | A local-network server in the app for tablet editing | The tablet path is a file the author carries, not a live connection |
