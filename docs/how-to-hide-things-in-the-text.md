# How to hide things in the text

Give a document an opening it shows once, and hide a mark inside a paragraph
that opens a photograph, a clip, or a few sentences that would otherwise
break the argument. Both are plain Markdown, both cost a reader who is not
curious nothing, and both leave the deck untouched.

## The opening quotation

Write it as the very first block of your document's very first chapter:

```markdown
::: {.opening once="per-browser"}
> The lantern was not the point.

— Carol
:::
```

`once="per-browser"` is the only form the article renders as a modal: a
reader sees it the first time they open the article in a browser, dismisses
it, and never sees it again in that browser. Anywhere else in the
document — a later chapter, or a later block of the first one — the sidebar
lists it as misplaced and the article shows nothing for it at all. A
document has one opening; write it once, at the very start.

With no script running at all — a plain browser with JavaScript switched
off, or a plain Markdown tool reading the file — the same block sits in the
flow as an ordinary quotation, exactly where it is written. Nothing about
the block's content is special: a blockquote and an attribution are the
common case, but any blocks work.

## An easter egg

Two pieces, anywhere in the same chapter: an inline marker where the mark
should sit, and a block carrying what it opens.

```markdown
The survey ran for three winters[✦]{.egg egg="lantern"} without a break.

::: {.egg #lantern label="✦"}
A photograph of the lantern, and two sentences about it.
:::
```

The marker's own id — `egg="lantern"` — and the block's own id —
`#lantern` — are what match them to each other; the character between the
brackets, `✦`, is what a plain Markdown reader shows in its place, so choose
one that reads sensibly as a footnote-sized mark on its own. The block's
`label` is what the marker becomes once the article renders it: a small
button at that point in the paragraph. Clicking it opens the block's own
content beside the text; closing it moves the mark into a tray at the foot
of the page, where a reader can reopen it later.

An egg's content is text, an image, or a video — a `.video` block inside an
egg follows the same source rule as any other video in the article,
including a poster and a link where nothing loads.

### A marker with no block, and a block no marker names

Both are authoring mistakes Editor catches for you rather than a reader:

- an inline marker whose id names no `.egg` block in the chapter renders as
  the plain character you wrote, with nothing clickable;
- an `.egg` block no marker points at renders nowhere at all.

Either way, the chapter's row in the sidebar lists it as unresolved, the
same way it lists a citation key that resolves to nothing — open the
chapter and you will see it before a reader ever could.

## Finding what is hidden

A reader who suspects there is more can type the Konami code — up, up,
down, down, left, right, left, right, b, a — and every mark still hidden
flashes briefly, with the page scrolling to the first of them. This reveals;
it never collects a mark on the reader's behalf, so it is a safe way to
check your own document for a mark you forgot you hid.

## What the deck and the printed page do with both

The deck omits the opening and every egg entirely — neither the quotation
nor a marker nor its content reaches a slide. The printed page, once phase 6
delivers it, carries the opening as an epigraph on its first page and each
egg's content as a static aside in the text; until then, the article is the
one rendering where either is interactive.

## Related

- [The Markdown canon](reference-the-markdown-canon.md) — the `.opening` and
  `.egg` rows, and every other construct.
- [Preview and read the article](how-to-preview-and-read-the-article.md) —
  what a reader sees when they open the opening quotation and a mark, and
  how the panel fits a phone's width.
