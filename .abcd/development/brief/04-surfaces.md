# Surfaces

One section per surface a person touches. Everything here is what Alice,
Bob, or Carol sees and does; the machinery behind it is in
[`05-internals.md`](05-internals.md).

## 1. The editor

### The folder is the book

Alice opens a folder. Editor reads it as a book and shows the sidebar: each
Part is a folder, each Chapter a Markdown file, and inside each Chapter the
Sections, Sub-sections, and Sub-sub-sections drawn from headings two,
three, and four. Numeric filename prefixes give the order. Clicking any
node opens that chapter scrolled to that heading.

The sidebar is the file system, so it never disagrees with it. Alice
renames `03-method.md` to `05-method.md` in Finder, Editor reloads, and the
chapter has moved — in the sidebar and in all three renderings, with no
other file touched.

Beside each chapter the sidebar shows what the chapter carries: which
variants it contains, how many assets it references, and any citation key
that does not resolve against the bibliography.

### Editing

The Markdown is visible and is the source of truth. There is no hidden
representation and no round trip through a rich-text model: what the
editing surface holds is the file's text.

Editing uses Emacs key bindings — movement by character, word, line, and
buffer; kill and yank; set mark and act on the region; incremental search
forward and backward; undo; and the prefix keys — as listed in the binding
table that accompanies the editor's spec. None is swallowed by the web view
or by the operating system. Emacs itself remains free to open the same
files, because the format is plain.

### Keys, help, and cancel

The bindings are a table Alice can read inside the app: every action has a
label and its chords, listed in a keys panel one chord away, and named in
the tooltip of any control that has a chord. A prefix key opens a prefix
state and the modeline at the foot shows it, along with her position in the
chapter. One cancel chord cancels anything — a search, a panel, an overlay,
a prefix — and so does Escape. Overlays take the keyboard while they are
open and move with the same chords as the text.

### The insert palette

Alice does not remember how a columns div is written, and she should not
have to. One key opens the insert palette: a list of the constructs the
canon defines — divider, columns, speaker notes, callout, variant block,
video block, citation, footnote, page break, easter egg, opening quotation.
Choosing one inserts the canonical form at the cursor, with the cursor
placed where the content goes. The palette is the only place the syntax
needs to live in anyone's memory.

### Variants

A block or a span marked with a variant belongs to that variant alone.
Alice writes one text for a conference audience and a longer one for
readers, marks the passages that differ, and previews either. In the
preview for the short variant, the long passages are simply absent —
including any footnote or citation inside them, which also leaves the
reference list.

The set of variants is declared once for the document. Readers never see a
switcher: each variant is a separate link.

### Import by split

Alice has a manuscript in one file, 800 lines and four heading levels. She
drops it on Editor and confirms the import. Editor writes a chapter folder:
one file per level-one heading, numbered in order, every heading level
preserved. Concatenating the files reproduces the original text byte for
byte — no reflowed lines, no invented escapes, no tidied tables.

## 2. Assets

### Drop

Alice drags an image from her desktop onto a chapter. The file lands in the
chapter's assets folder, a Markdown image reference with a relative path
appears at the drop point, and the cursor sits in the alt text ready for a
caption. A video file or URL becomes a video block. Any other file becomes
a link. Dropping the same file twice writes one copy and two references to
it.

### The threshold

Above a size Alice sets, Editor does not copy. It records the file once as
a referenced asset — content hash, kind, and a path relative to an asset
root her machine knows — and every rendering links to the single copy that
publishing uploads to the site. Half a gigabyte of video does not enter the
document folder.

A photograph in a phone-native format is converted to a web format on the
way in, and the reference points at the conversion.

### Video sources

Some material lives elsewhere on purpose. A video block names its sources
in order, and each rendering tries them in turn:

1. the local file, when the document is open beside its assets;
2. the copy published on the site;
3. a copy on a separate gated website, which asks the viewer to sign in.

When none is reachable, the reader sees a poster frame and a link. Bob,
reading on the train with the gated site unreachable, gets the poster;
Carol, signed in to that site, gets the player. Editor never stores
credentials for the gated site and never transcodes or hosts video itself.

## 3. Citations

Alice keeps a BibTeX file beside her document. She cites with a key in
square brackets; the editor completes the key as she types and shows the
matching reference on hover. A citation key that resolves to nothing is
marked in the preview and listed in the sidebar rather than printed as
literal brackets in a rendering.

One citation renders three ways from one source: a margin note beside the
paragraph in the article, a numbered reference in the PDF with the entry in
the generated reference list, and a short source line at the foot of the
slide. Footnotes use Pandoc's syntax and follow the same rule. Every
reference list is generated; none is typed.

## 4. The online article

The article is the primary rendering. Bob opens the link on his laptop and
reads a Tufte-style page: a generous measure, navigation drawn from the
Parts and Chapters, citations and footnotes in the margin beside the
paragraph that made them, images and video in the flow. Carol opens the
same link on her phone; the margin notes fold into the text and nothing
scrolls sideways or needs pinching.

### Reader controls

A small toolbar offers theme (light, dark, sepia), text size (smaller,
default, larger), and measure (narrow, normal, wide), with a reset. Choices
persist in that browser, so Carol's larger text survives a reload.

### The once-only quotation

A document can open with a quotation, shown once per browser. Bob sees it
the first time he opens the article; on his second visit he goes straight
to the text.

### Easter eggs

A document can hide small marks in its paragraphs. Clicking one opens
text, an image, or a video, and moves the mark into a tray at the foot of
the page, so a reader collects them. The Konami code briefly reveals every
mark still hidden and scrolls to the first. In print, each egg's content
appears as a static aside instead.

### Moving by keyboard

The reading views share the editor's navigation vocabulary: the same chords
move by section and by item, search the text, and cancel whatever is open.
Bob can read the whole article without reaching for the mouse.

### Video in the article

Video follows the source rule from the assets surface: embed on the web,
poster and link when the file is opened from disk or when no source is
reachable.

## 5. Slides

Alice presses Present and her chapter becomes a deck. She writes no slide
markup to get one.

### The default mapping

- A Section's headline is a horizontal slide; the Section's text becomes
  the speaker notes she sees while the audience sees the headline.
- A Sub-section's headline is a vertical slide beneath its Section, and its
  text becomes that slide's speaker notes.
- Every image in a Section or Sub-section becomes a slide of its own,
  full-bleed, in source order.

Sections run horizontally as the main line of the talk; Sub-sections hang
beneath the Section they belong to.

### Shaping the deck

When the default is not the talk she wants, Alice shapes it in the same
text, with constructs the article and the PDF ignore entirely:

- a horizontal rule splits a Section into further slides;
- a columns div lays out side-by-side columns;
- a divider attribute on a heading makes a section-break slide;
- a notes div replaces the generated speaker notes;
- a citation in the Section supplies the source credit line at the foot of
  the slide.

Each is one entry in the insert palette.

### Presenting

The deck runs from the presenter site, from the single HTML file, and from
disk. Keyboard, touch, and on-screen controls all move between slides,
horizontally between Sections and vertically within one. Bob follows on his
phone from the back row; the same deck is legible on a projector, an iPad,
and a laptop.

## 6. The single HTML file

Alice exports the document as one HTML file. It opens from disk with no
network: the article, the deck, every embedded image, style, and font.
Media above the threshold shows a poster and a link until she is online.
She sends the file to Carol as an attachment and Carol reads it on whatever
she has, with no app and no account.

The same file is an editor. On her iPad with a hardware keyboard, Alice
opens it in Safari, imports a chapter's Markdown, edits it with the same
bindings, and exports the Markdown back. The exported file differs from the
import only by her edits. Assets are not moved: adding an image is the
desktop app's job. Back at her desk she imports the result and the chapter
updates in place, with every asset reference still resolving.

## 7. Publish

Alice presses Publish. Editor builds the article, the deck, and the assets,
commits them under the document's stable id, pushes to the production
repository, and hands her the link. Cloudflare Pages deploys.

- The **stable link** always shows the latest version.
- Each publish also keeps its own **version link**, so a link Bob saved in
  March still shows what he read in March.
- Each **variant** has its own link under the same id, and no page reveals
  that the other variants exist.

At publish time Alice chooses **unlisted** or **gated**. Unlisted means
anyone holding the link can read it, and nothing on the site links to it or
lists it. Gated means the document sits behind an access policy with an
allow-list Alice edits in the app: Bob is asked to sign in, and only an
allow-listed address gets through. The choice is made every publish,
deliberately, because an unlisted document is not a private one.

A publish log inside the document folder lists every version with its hash,
its links, and its flag, and offers open and copy for each. Opening the
presenter with no id, or a wrong one, shows nothing and lists nothing.

## 8. The PDF

Every publish also produces a PDF, rendered in the pipeline rather than on
Alice's machine. It is a modern academic-journal layout, deliberately not
the Tufte article: clean type, strong tables, footnotes at the foot of the
page, numbered references, a contents list that follows the Parts and
Chapters, and page numbers. Page-break comments in the source are honoured.
Video becomes a poster frame with its link printed beneath it, and slide-
only constructs do not appear at all. Each variant renders its own PDF. The
presenter offers the PDF as one more link beside the document version; the
app shows the render's status, not a preview.

## 9. Annotations

While reading her own document, Alice highlights a passage, writes a note
against it, marks a step reviewed, and builds a rehearsal deck from the
headings. None of it touches the text: it lives in a sidecar file beside
the chapter, and the Markdown stays byte for byte what it was. When she
edits the paragraph the annotation moves with it.

On the published page Bob does the same in his browser. His annotations are
his: they stay in that browser, the site stores nothing, and he can export
them as a file.

When Bob sends Alice his file, she loads it into Editor, reads it beside
her own, and publishes it as a public layer on the document. Readers can
show or hide that layer. Her own annotations stay private unless she
publishes them too.

Carol runs a rehearsal deck from the same sidecar on her phone, in flip
mode or scored mode, and her score is kept for the session.
