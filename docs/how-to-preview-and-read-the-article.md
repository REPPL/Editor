# How to preview and read the article

The article is the primary rendering: the whole document as one page, laid out
in the manner of a Tufte essay — a generous measure, a margin for its notes,
and a contents list that reaches every Part, Chapter, Section, and Sub-section.
This page is what a preview shows you inside Editor, and what Bob and Carol
read once you publish.

## Open the preview

Press `C-c C-v`.

A second window opens — or comes to the front, if one is already open — and
renders the whole document, every chapter in reading order, from the buffers
Editor is holding. The open chapter previews its unsaved edits; every other
chapter previews the text on disk. Nothing is written: closing the window
loses nothing, because the preview was never where the work lived. Pressing
`C-c C-v` again refreshes the same window with the document as it now stands.

The chord is also a row in the keys panel (`C-h b`) and reachable by name from
`M-x`, like any other command Editor answers.

## The contents list

At the top of the page, a list reaches four levels: the Part a chapter sits
in, the Chapter's own title, its Sections, and its Sub-sections. A Sub-section
still carries its own Sub-sub-sections as ordinary headings further down the
page; the list itself stops one level short of them. A Part has no heading of
its own — it is a folder, not something the canon renders — so its own entry
is a label rather than a link; the Chapter listed beneath it is what you
choose to jump there. Choosing any other entry moves the page straight to that
heading.

## Notes in the margin

A footnote, a citation, a `::: {.credit}` block, and a `[…]{.margin}` span all
become a note beside the paragraph that made it, rather than a number chasing
you to the foot of the page. At a wide window the note sits level with its
paragraph, in the margin; on a narrow one — an iPhone in your pocket — the same
note folds into the flow, directly after the paragraph, at the same size as
the text around it. Nothing about the markup changes between the two: a single
stylesheet rule decides which you see.

A citation beside a `.bib` file named in `document.yaml` renders as a numbered
marker — `[1]`, or `[1, p. 4]` with its locator — and its margin note carries
the entry's full reference, the same text the generated reference list holds
at the end of the page. A key the bibliography does not carry is marked
unresolved rather than printed as the brackets you wrote; see
[Cite from a bibliography file](how-to-cite-from-a-bibliography-file.md) for
the metadata keys, the completion, and what each rendering does with a
citation. Where a note sits, and how it folds, do not change under any of
this.

## What a talk's own constructs do here

Alice writes one text for both the talk and the article. A speaker-notes div,
a columns div, a divider heading, and a page-break comment are all shaped for
the deck; on this page:

- a `::: {.notes}` div is absent — the reader never learns a talk was shaped
  in the file they are reading;
- a `::: {.columns}` div puts its content in the flow, with no side-by-side
  layout;
- a `{.divider}` heading is an ordinary heading;
- a page-break comment produces nothing.

A callout (`::: {.callout kind="warning"}`) is set apart as a box in the flow,
carrying the kind you gave it. An image with a caption and a credit —
`![The lantern at dusk](assets/lantern.jpg "Photograph by Carol")` — sits in
the flow with both beneath it; add `.full-bleed` and the picture runs the full
width of the measure.

## Video

A `.video` block tries its sources in the order you wrote them — `local`,
then whichever others you named — the moment a reader opens the page, never
when the document is built. The first source that plays replaces the poster
with a player; when none of them do, the poster frame, the caption, and a
link stand in its place, and nothing is inserted that did not load. This is a
small script's job, not the page's markup: the poster and the link are
written into the page regardless, so the article still shows them correctly
with no script running at all.

## Legibility at three widths

The article is built to read at an iPhone's width (390 CSS pixels), an
iPad's (820), and a laptop's (1280), with nothing scrolling sideways at any
of them. To look at it yourself, open the preview window and resize it to
each width in turn — or use your browser's own device toolbar on a published
link. At 390, every margin note has already folded into the flow; at 820 and
1280, the margin stands beside the text.

## Reading it the way you like it

A small toolbar sits in the corner of the page, offering theme (light, dark,
sepia), text size (smaller, default, larger), measure (narrow, normal, wide),
and a reset. Choose the dark theme and the largest text, and the page changes
under your hands: the same words, the same notes, the same order, set the way
you can read them. Close the tab and come back later — in the same browser —
and the page is still dark and still large; nothing asked you to sign in, and
nothing was set up in advance by whoever wrote the document.

Your choices belong to your browser and go no further: nothing about them is
sent anywhere, and they never appear to anyone reading the same link on a
different browser or a different device. If your browser refuses to remember
anything at all — some do, for a page opened from disk — a choice still
applies for as long as you keep the page open; it is simply not there the
next time you open it, and nothing about that is treated as an error.

Reset returns the theme, the text size, and the measure to the article's own
defaults, and a reload keeps them there. The page reads exactly the same with
no script at all: there is no toolbar, and the article renders at its
defaults, the way the earlier sections of this page describe it.

## What is hidden in the text

Some documents open with a quotation, shown once. The first time you open the
article in a browser, it stands over the page until you dismiss it; open the
same link again in the same browser, and you land straight on the first
paragraph — it has already made its introduction. Where a browser cannot run
a script at all, the same words sit in the flow instead, as an ordinary
quotation at the top of the page.

Reading on, you may notice a small mark sitting inside a paragraph, about
where a footnote marker would be. Click it, and what the author hid there
opens beside the text — a few sentences, a photograph, or a short video,
following the same rule as any other video in the article. Close it, and the
mark leaves the paragraph and settles into a tray at the foot of the page, so
you can see how many you have found and reopen any of them later. On a
phone, the same panel fills the width of the screen rather than sitting in
the margin, and nothing needs pinching.

Nothing on the page announces that a mark is there, and that is the point.
If you suspect there is more, type the Konami code — up, up, down, down,
left, right, left, right, b, a — and every mark still hidden flashes
briefly, with the page scrolling to the first of them; a mark you have
already found does not flash again, and typing the code never collects one
for you.

None of this leaves your browser. Which quotation you have seen and which
marks you have collected are remembered only where you are reading, and
nowhere else; clear that browser's storage and the page returns to how it
looked the first time you opened it. The deck built from the same chapters
carries neither the quotation nor a mark: both belong to the article alone.

## The same page from every host

The preview window, the page a publish pushes to the site, and the page an
export writes into a folder are three readings of one file,
`src/core/render/article.css`, and three scripts,
`src/core/render/article-video.js`, `src/core/render/article-controls.js`,
and `src/core/render/article-eggs.js`. A fix to any one of them reaches every
one of these hosts at once; a difference between what the three show is a
defect in the rendering core, not a fact about one of the hosts.

## Related

- [The Markdown canon](reference-the-markdown-canon.md) — every construct,
  including the ones this page renders as margin notes and a callout.
- [Export a folder you can carry](how-to-export-a-folder.md) — carry the
  article as a folder that opens from disk.
- [The document model and the three renderings](explanation-the-document-model.md)
  — why one parse and one build stand behind every rendering.
