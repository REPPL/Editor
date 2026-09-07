# How to cite from a bibliography file

Keep a BibTeX file beside your document, name it once in `document.yaml`, and
cite a key wherever you write. Editor completes the key as you type it, shows
what it resolves to on rest, and turns it into a numbered marker, a margin
reference, and a generated reference list — in the article, the deck, and the
printed page — with nothing further to type or keep in step.

## Name the bibliography

In `document.yaml`, at the document root:

```yaml
bibliography: references.bib
citation_style: numeric
```

`bibliography` names a `.bib` file relative to the document root — a plain
BibTeX file, the same one a reference manager exports, and Editor strips its
own protective braces and folds its common accent commands (`\'e`, `{\"o}`,
and a dozen others) into the letters they draw, so what you see is the
character, never the escape a reference manager wrote to reach it.
`citation_style` is `numeric` for now: a marker in reading order, `[1]`, and
a reference list numbered the same way, in the order a key is first cited.
A document naming no bibliography at all is ordinary: it is not an error,
but every citation in it is unresolved in exactly the shape the next
section describes, because there is nothing for any key to resolve
against.

## Write a citation

Pandoc's own forms, exactly:

- `[@smith2020]` — a bare citation;
- `[@smith2020, p. 4]` — with a locator, printed after the marker;
- `@smith2020` in running prose, with no brackets, for "as Smith (2020)
  shows…"-shaped sentences;
- `[@early; @later]` — more than one key in one citation.

A footnote sits beside a citation in the same plain syntax: `^[a note written
inline]`, or `[^dates]` with a `[^dates]: The dates are estimates.` definition
elsewhere in the chapter.

## Completion and hover

Type `[@` and start the key: a list of every key in the bibliography
beginning with what you have typed appears beneath the cursor, narrowing as
you type further. Press `Tab` to accept the first entry it offers, or click
the one you want; the key completes and the cursor moves on, ready for a
locator or the closing bracket.

Rest the pointer on a citation you have already completed — anywhere between
its brackets — and a small popup shows the entry's author, title, and date,
in place. No separate window opens, and typing continues exactly where it
left off.

## An unresolved key

A key with no matching entry — a typo, or a work you have not added to the
file yet — never prints as the literal brackets you wrote. The preview marks
it: a plain, unbracketed span carrying the key itself, so you can see at a
glance which key needs fixing. The chapter's row in the sidebar lists every
such key beside whatever else that chapter carries, so you find out while
writing rather than from the projector.

## What each rendering does with a citation

One key becomes three things, all read from the same bibliography:

| Rendering | What a citation becomes |
|---|---|
| The article and the preview | a numbered marker in the text, `[1]` or `[1, p. 4]`, with the entry's full reference in the margin beside the paragraph |
| The deck | a short source line — author and year — at the foot of the Section's slide; a deck carries no reference list at all |
| The printed page | a numbered reference in the text and an entry in the reference list at the end |

The reference list is generated, never typed: it holds exactly the entries
the document's chapters cite, numbered in the order each is first cited, and
nothing else. Cut the passage that cited a work, and its entry leaves the
list with it. Write a `## Sources {.refs}` heading yourself, and the list
appears there; write none, and it appears once, after the last chapter.

Because the deck, the article, and the printed page all resolve the same
chapters against the same file, the deck's credit line names a work that
also appears in the article's and the printed page's own lists — with one
exception: a citation written only inside a chapter's own speaker notes
(a `::: {.notes}` block) earns the deck's own credit line, because the
speaker sees it, but no entry or margin note in the article or the printed
page, because a reader never does.

## Related

- [The Markdown canon](reference-the-markdown-canon.md) — the Citation,
  Footnote, and Reference list rows, and every other construct.
- [Preview and read the article](how-to-preview-and-read-the-article.md) —
  where a citation's margin note sits, and how it folds at a narrow width.
