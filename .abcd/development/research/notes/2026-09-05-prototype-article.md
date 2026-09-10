# Reference prototype: the online article as envisioned

Source: a prototype online article the maintainer has published, read on
2026-09-05. Only its form is recorded here; its subject, location, and
content are deliberately left out. It is the closest existing example of
what a published Editor document should feel like, so its traits are
evidence for the brief and the first intent.

## What it is

- One self-contained HTML file of under half a megabyte, generated from
  Emacs Org mode. Images are embedded as data URIs. It opens from disk and from
  the web identically, which is exactly the single-file packaging the
  intent describes.
- Two heading levels below the title (level two for sections, level three
  for sub-sections), an abstract, keywords, an epigraph, and a clickable
  table of contents. This maps onto Chapter, Section, Sub-section with no
  translation.

## Reading experience

- Tufte-style layout: citations are numbered inline and their full
  reference sits in the margin as a side note, so the reader never leaves
  the text. On narrow screens the notes fold into the flow.
- Reader controls in a small toolbar: theme (light, dark, sepia), text size
  (smaller, default, larger), measure (narrow, normal, wide), and a reset.
  Choices persist in the browser.
- An opening quotation shown once per browser as a modal, remembered in
  local storage.

## Interactive elements

- Easter eggs: small icons hidden inside paragraphs. Clicking one opens a
  modal holding text, an image, or a YouTube video, and moves the icon into
  a tray at the foot of the page, so the reader collects them. The Konami
  code (up up down down left right left right b a) briefly reveals every
  uncollected egg and scrolls to the first.
- Video handling is the pattern the intent needs: on the web the egg embeds
  the player with autoplay from the privacy-preserving host; when the file
  is opened from disk it shows a thumbnail and a link instead, because a
  local file cannot embed or autoplay.

## What this decides for Editor

- The single HTML file is the primary reading artefact, not a fallback.
  The prototype proves the format works at article length with embedded
  images and external video.
- Interactive elements are declared in the source and rendered by a script
  the file carries. The first set is now concrete: side notes from
  citations, reader controls, a once-only opening quotation, and easter
  eggs with the Konami reveal.
- Video follows the prototype's rule: embed on the web, poster and link
  from disk and in PDF.
- Editor replaces the Org-mode export pipeline with a Markdown one. Nothing
  in the reading experience depends on Org; everything depends on the
  two-level heading structure and the rendering script.

## Settled since

- Citation syntax is Pandoc's `[@key]` against a BibTeX file, with Pandoc
  footnotes; see the constraints chapter of the brief.
