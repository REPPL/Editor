# Reference prototype: the presentation as envisioned

Source: a quick prototype slide deck the maintainer built for a talk, read
on 2026-09-05. Only its form is recorded here; its subject and content are
deliberately left out. It is evidence for how the slides export and the
slide-authoring syntax should work.

## The source

One Markdown file, written by hand, with these conventions:

- YAML front matter carrying title, author, and a theme name.
- A horizontal rule between slides. The file has some fifty slides.
- Level-one headings for statement slides and dividers, level-two for
  slide titles, level-three rarely. Two level-one lines in a row make a
  two-line title.
- A column separator on its own line (three vertical bars) splits a slide
  into side-by-side columns.
- HTML comments carry per-slide metadata: a layout hint (for example a
  section divider) and a source line crediting the slide's image or
  figures. They render nowhere on the slide but travel with it.
- A line beginning `Note:` is the speaker note for that slide.
- Images use the alt text as the caption and the title attribute as the
  credit. Bullets use `+`. Block quotes carry an attribution line.
- Closing appendix slides list sources as plain bullets in two columns.

## The renders

- The main render is reveal.js loaded from a CDN with a custom theme, a
  web font, and the speaker-notes plugin. Slides map one to one onto
  sections; dividers, columns, notes, and source slides each have a class.
- A second, hand-rolled single-file render embeds the slide markup inside
  a template script tag and a small script that copies it into the deck
  and handles keyboard and hash navigation. It has no dependencies and
  opens from disk.

## What this decides for Editor

- Slides are authored, not only derived. A talk is not the article's
  hierarchy read aloud: the prototype has statement slides, dividers,
  image-only slides, columns, and repeated slides with a line added. The
  intent's mapping of Section to slide and Sub-section to step is the
  default, but the author needs horizontal rules, columns, layout hints,
  and speaker notes inside the same source.
- Per-slide source credits are a first-class element and should render as
  a footnote on the slide, the margin in the article, and a note in the
  PDF, from one annotation.
- The single-file render with embedded source is the same idea as the
  intent's self-contained HTML file that carries its own Markdown. The
  prototype embeds markup; Editor embeds the Markdown.
- A CDN dependency is acceptable for the published site and is not
  acceptable for the single file, which must open from disk.

## Open

- How a slide-only construct (a divider, a column split, a repeated slide)
  is written so the article and the PDF ignore it cleanly, and how an
  article-only construct (a long paragraph, a side note) is summarised on
  a slide or skipped.
