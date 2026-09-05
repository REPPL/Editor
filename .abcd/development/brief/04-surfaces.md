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
that does not resolve against the bibliography. Each badge appears with
the feature it reports, so a document that has no variants yet shows no
variant badge.

Alice starts a new document from an empty folder: Editor writes
`document.yaml` with the title she gives, one Part, and one chapter, and
opens it.

### Editing

The Markdown is visible and is the source of truth. There is no hidden
representation and no round trip through a rich-text model: what the
editing surface holds is the file's text. The surface is one continuous
editing view; there is no separate browse mode.

Saving is explicit, on the save chord. The modeline marks a buffer with
unsaved changes, and closing a chapter or moving to another one with
changes unsaved asks first. When a chapter changes on disk while Editor
holds unsaved changes to it, Editor says so and asks which text to keep;
it never overwrites either silently.

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
open and move with the same chords as the text. The keys panel and the
insert palette have chords of their own, entered in the binding table like
every other action.

### The insert palette

Alice does not remember how a columns div is written, and she should not
have to. One key opens the insert palette: a list of the constructs the
canon defines — divider, columns, speaker notes, callout, margin aside,
credit, variant block, variant span, video block, citation, footnote, page
break, easter egg, opening quotation. Choosing one inserts the canonical
form at the cursor, with the cursor placed where the content goes. The
palette is the only place the syntax needs to live in anyone's memory. A
construct that arrives with a later phase arrives as one more entry.

### Variants

A block or a span marked with a variant belongs to that variant alone.
Alice writes one text for a conference audience and a longer one for
readers, marks the passages that differ, and previews either. In the
preview for the short variant, the long passages are simply absent —
including any footnote or citation inside them, which also leaves the
reference list.

The set of variants is declared once for the document, in its metadata.
Readers never see a switcher: each variant is a separate link. A mark
naming a variant the document has not declared is listed in the sidebar,
and its block is left out of every rendering until the name is declared or
corrected, because a passage meant for an unknown audience is not shown to
any of them. Alice chooses which variant she is previewing in the app's
own chrome, which is not part of any rendering.

### Import by split

Alice has a manuscript in one file, 800 lines and four heading levels. She
runs Import and chooses the file. Editor writes one Part folder named for
the document, holding one chapter file per level-one heading, numbered in
order, every heading level preserved; text standing before the first
level-one heading becomes the Part's first chapter. Filenames come from
the headings, lower-cased with anything but letters and digits turned to
hyphens, and a numeric suffix where two headings would collide. If the
file carries front matter, the keys that belong to the document move into
`document.yaml`; otherwise the first heading supplies the title.
Concatenating the written files reproduces the original text byte for byte
— no reflowed lines, no invented escapes, no tidied tables — and the
manuscript Alice imported is left where it was.

## 2. Assets

### Drop

Alice drags an image from her desktop onto the text of a chapter. The file
lands in the Part's assets folder, a bare Markdown image reference with a
relative path appears at the drop point, and the cursor sits in the alt
text ready for a caption; the credit and any layout class are hers to add,
from the palette or by hand. A video file, or a video URL dragged or
pasted, becomes a video block with that one source. Any other file becomes
a link. Dropping the same file twice writes one copy and two references to
it.

A photograph in a phone-native format is converted to a web format on the
way in, whatever its size, and the reference points at the conversion. The
original is not kept in the document folder.

Dropping is unambiguous because the target says what it means: a Markdown
file dropped on a Part in the sidebar becomes a new chapter there, and any
file dropped on the text becomes a reference at the cursor. Bringing a
whole manuscript in is Import, and bringing an edited chapter back is
Re-import; both are commands, not drops.

### The threshold

Above a size Alice sets, Editor does not copy. It records the file once as
a referenced asset — content hash, kind, and a path relative to an asset
root her machine knows — and every rendering links to the single copy that
publishing uploads. Half a gigabyte of video does not enter the document
folder, and above the host's per-file ceiling it does not enter the
production repository either: the pipeline puts it in object storage under
the document's id and the renderings link there.

Alice sets the threshold and names her asset roots in the app's settings,
per document for the threshold and per machine for the roots. On a machine
where a root is not yet named, the assets under it are reported as
unresolved: renderings show the poster and the link, and publishing
refuses rather than guessing.

### Video sources

Some material lives elsewhere on purpose. A video block names its sources
in order, and each rendering tries them in turn:

1. the local file, when the document is open beside its assets;
2. the copy published on the site;
3. a copy on a separate gated website, which asks the viewer to sign in.

The sources are tried when the reader opens the page, never when the
document is built: a source that fails to load, or that answers with a
sign-in page instead of the video, falls through to the next. When none is
reachable, the reader sees a poster frame and a link. Bob, reading on the
train with the gated site unreachable, gets the poster; Carol, signed in
to that site, gets the player. Bob signed in but not on the list gets the
poster too, and the link he can follow to ask. Editor never stores
credentials for the gated site and never transcodes or hosts video itself.

The poster is the one Alice names on the block; failing that, the frame
the manifest records for the asset; failing both, a labelled link with no
image.

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

The article is the primary rendering. The whole document is one page. Bob
opens the link on his laptop and reads a Tufte-style page: a generous
measure, a contents list drawn from all four levels — Parts, Chapters,
Sections, and Sub-sections — citations and footnotes in the margin beside
the paragraph that made them, images and video in the flow. Carol opens the
same link on her phone; the margin notes fold into the text and nothing
scrolls sideways or needs pinching.

### Reader controls

A small toolbar offers theme (light, dark, sepia), text size (smaller,
default, larger), and measure (narrow, normal, wide), with a reset. The
three themes are three palettes of the one article style, which is why
author themes are out of scope and these are not. Choices persist in that
browser, so Carol's larger text survives a reload.

### The once-only quotation

A document can open with a quotation, shown once per browser. It belongs
to the first block of the first chapter and nowhere else. Bob sees it the
first time he opens the article; on his second visit he goes straight to
the text.

### Easter eggs

A document can hide small marks in its paragraphs. Clicking one opens
text, an image, or a video, and moves the mark into a tray at the foot of
the page, so a reader collects them. The Konami code briefly reveals every
mark still hidden and scrolls to the first. In print, each egg's content
appears as a static aside instead.

A mark whose content block is missing reads as ordinary text, and a
content block no mark points at is left out of the page; the sidebar
lists both for Alice as unresolved, the same way it lists a citation key
that resolves to nothing.

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

- The chapter's title is the opening slide.
- A Section's headline is a horizontal slide; the Section's text becomes
  the speaker notes she sees while the audience sees the headline.
- A Sub-section's headline is a vertical slide beneath its Section, and its
  text becomes that slide's speaker notes.
- A Sub-sub-section has no slide: its heading and its text fold into the
  speaker notes of the Sub-section it sits in.
- Every image in a Section or Sub-section becomes a slide of its own,
  full-bleed, in source order — unless it is the first block after the
  heading, in which case it shares that heading's slide.

Sections run horizontally as the main line of the talk; Sub-sections hang
beneath the Section they belong to.

### Shaping the deck

When the default is not the talk she wants, Alice shapes it in the same
text, with constructs the article and the PDF ignore:

- a horizontal rule splits further, anywhere below the chapter title: in a
  Section, in a Sub-section, or before the first Section to split the
  opening slide;
- a columns div lays out side-by-side columns;
- a divider attribute on a heading makes a section-break slide, and the
  prose beneath that heading becomes its speaker notes;
- a notes div replaces the generated speaker notes of the slide whose
  content it follows;
- a credit div writes the source line at the foot of the slide, and a
  citation in the Section supplies one the same way.

Each is one entry in the insert palette. A footnote in a Section prints at
the foot of its slide, in the same place as a credit; the deck carries no
reference list.

### Presenting

The deck runs from the presenter site, from the single HTML file, and from
disk. In the app, Present starts at the chapter Alice is in; the published
deck holds the whole document, its chapters in order. Keyboard, touch, and
on-screen controls all move between slides, horizontally between Sections
and vertically within one — arrow keys, a swipe, or the controls in the
corner, whichever the screen in front of her audience offers. Bob follows
on his phone from the back row; the same deck is legible on a projector,
an iPad, and a laptop.

## 6. The single HTML file

Alice exports one variant of the document as one HTML file — the default
variant unless she picks another, and one variant per file, because no
file may carry a passage another audience is not meant to see. It opens
from disk with no network: the article, the deck, every embedded image,
style, and font. Media above the threshold shows a poster and a link until
she is online. She sends the file to Carol as an attachment and Carol reads
it on whatever she has, with no app and no account. The reader controls and
the once-only quotation travel with it and remember their state for that
browser and that file; where the browser allows no storage they simply do
not persist. The file holds no annotation surface: marks belong to the
published page and to the app.

The same file is an editor, one chapter at a time. On her iPad with a
hardware keyboard, Alice opens it in Safari, imports a chapter's Markdown,
edits it with the same bindings, and exports the Markdown back. The keys
panel lists the bindings that are live in that browser, which is not
always every binding the desktop app claims. The exported file differs from
the import only by her edits. Assets are not moved: adding an image is the
desktop app's job. Getting the file to the tablet and back is by whatever
means Alice already uses, because Editor offers no channel of its own.
Back at her desk she runs Re-import: Editor matches the chapter the export
names, updates it in place with every asset reference still resolving, and
reports a conflict instead if that chapter changed on disk since the
export was made.

## 7. Publish

Alice presses Publish. Editor builds the article, the deck, and the assets,
commits them under the document's stable id, pushes to the production
repository, and hands her the link. Cloudflare Pages deploys. Assets past
the host's per-file ceiling go to object storage instead of the
repository, put there by the pipeline. Alice watches that publish's
progress until it reports done or failed, and can stop watching. When the
push or the build fails she is told which step failed and why, and the
site still serves what it served before.

- The **stable link** always shows the latest version.
- Each publish also keeps its own **version link**, so a link Bob saved in
  March still shows what he read in March.
- Each **variant** has its own link under the same id — an unguessable
  path token of its own, not its name — and no page reveals that the other
  variants exist. Truncating one variant's link reaches the empty
  presenter, never another variant.

At publish time Alice chooses **unlisted** or **gated**. Unlisted means
anyone holding the link can read it, and nothing on the site links to it or
lists it. Gated means the document sits behind an access policy with an
allow-list Alice edits in the publish panel: Bob is asked to sign in, and
only an allow-listed address gets through. The choice is made every
publish, deliberately, because an unlisted document is not a private one.
It applies to the document, not to one version: the gate covers every
version and every variant under the id, so a document gated today is gated
for the links shared last March too, and the flag can be lifted the same
way. What each version *says* never changes; who may open it follows the
document.

A publish log inside the document folder lists every publish with its
hash, its links, and its flag, and offers open and copy for each.
Republishing unchanged content adds an entry that points at the version
already there, and writes no new version. Opening the presenter with no id,
or a wrong one, shows the same empty page in both cases and lists nothing.

Alice can also take a document off the site: the versions and their assets
are removed, the links stop resolving, and the publish log records that
they did.

## 8. The PDF

Every publish also produces a PDF, rendered in the pipeline rather than on
Alice's machine. It is a modern academic-journal layout, deliberately not
the Tufte article: clean type, strong tables, footnotes at the foot of the
page, numbered references, a contents list that follows the Parts and
Chapters, and page numbers. Tables keep their columns and their captions,
and images are placed with their captions and credits. Page-break comments
in the source are honoured. Video becomes a poster frame with the printed
link a reader can type — the published copy where there is one, otherwise
the gated source — and slide-only constructs do not appear at all. Each
variant renders its own PDF. The presenter offers the PDF as one more link
beside the document version; the app shows the render's status while the
publish Alice started is still running, and never a preview.

## 9. Annotations

Reading her own document in the app's article preview, Alice highlights a
passage, writes a note against it, marks a step reviewed, and builds a
rehearsal deck from the headings. None of it touches the text: it lives in
a sidecar file beside the chapter, and the Markdown stays byte for byte
what it was. When she edits the paragraph the annotation moves with it;
when her edit leaves nothing the annotation can point at, it is listed as
orphaned rather than attached to different words.

On the published page Bob does the same in his browser. His annotations are
his: they stay in that browser, the site stores nothing, and he can export
them as a file — one file for the document, each mark naming the chapter it
belongs to, since the article is one page. He can bring that file back into
the page on another device, which is the only way it travels.

When Bob sends Alice his file, she loads it into Editor, reads it beside
her own, and publishes it as a public layer on the document. A layer
carries the name Alice gives it. Readers can show or hide each layer;
none is shown until a reader turns it on, and more than one can be on at
once. Her own annotations stay private unless she publishes them the same
way, which she can also do.

Carol runs a rehearsal deck on her phone from a layer Alice published, in
flip mode or scored mode. Her score lasts as long as the sitting: a reload
starts the deck unscored.
