# The Markdown canon

Every construct Editor knows, the exact form to write, and what each of the
three renderings does with it.

Nothing here is an invention of Editor's. Each construct is written in one of
Pandoc's five permitted forms — a fenced div with attributes, a heading
attribute, an image attribute, a bracketed span attribute, or an HTML comment —
or is Pandoc's own citation or footnote, which are not extensions at all. A
tool that knows nothing about Editor reads a chapter and shows every word of
it.

The two tables below are generated from the two tables the code itself reads:
`src/core/inserts.ts` for the forms and `src/core/canon.ts` for the
placements. They cannot disagree with the program.
`tools/generate-canon-reference.mjs` writes them, between the
`<!-- generated: … -->` markers; everything else on this page is written by
hand. Run `npm run docs:canon` to rewrite them, and `npm run lint:docs` —
which `npm run lint` also runs — to fail when this page has fallen behind the
code.

## Insert them from the palette

Press `C-c i`, type a few letters of the name, and press Return. The form
lands at the cursor with the cursor where the content goes. The palette offers
the constructs of the current phase; the rest are listed below with the phase
they arrive in.

## The forms

<!-- generated: forms -->

### Slide split

```markdown
---
```

Written as a block of its own. Offered from phase 1. Found in the palette by:
rule, break, split, slide, horizontal.

### Divider heading

```markdown
## Interlude {.divider}
```

Appended to the heading on the cursor's line. Offered from phase 1. Found in
the palette by: divider, section, break, interlude.

### Columns

```markdown
::: {.columns}
::: {.column width="50%"}

:::
::: {.column width="50%"}

:::
:::
```

Written as a block of its own. Offered from phase 1. Found in the palette by:
columns, column, side, two, beside.

### Speaker notes

```markdown
::: {.notes}

:::
```

Written as a block of its own. Offered from phase 1. Found in the palette by:
notes, speaker, presenter, script.

### Source credit

```markdown
::: {.credit}

:::
```

Written as a block of its own. Offered from phase 1. Found in the palette by:
credit, source, photograph, attribution.

### Page break

```markdown
<!-- pagebreak -->
```

Written as a block of its own. Offered from phase 1. Found in the palette by:
page, break, pdf, print.

### Callout

```markdown
::: {.callout kind="warning"}

:::
```

Written as a block of its own. Offered from phase 2. Found in the palette by:
callout, warning, note, box, aside.

### Margin aside

```markdown
[]{.margin}
```

Written inline, where the cursor is. Offered from phase 2. Found in the
palette by: margin, aside, remark, sidenote.

### Variant block (name it yourself)

```markdown
::: {.variant variant=""}

:::
```

Written as a block of its own. Offered from phase 2. Found in the palette by:
variant, audience, talk, full, block.

### Variant span (name it yourself)

```markdown
[]{.variant variant=""}
```

Written inline, where the cursor is. Offered from phase 2. Found in the
palette by: variant, audience, inline, span.

### Video block

```markdown
::: {.video}
- local: 
:::
```

Written as a block of its own. Offered from phase 4. Found in the palette by:
video, film, player, media, local.

### Citation

```markdown
[@]
```

Written inline, where the cursor is. Offered from phase 2. Found in the
palette by: citation, cite, reference, bibliography, key.

### Footnote

```markdown
^[]
```

Written inline, where the cursor is. Offered from phase 1. Found in the
palette by: footnote, note, inline.

### Easter egg marker (name it yourself)

```markdown
[✦]{.egg egg=""}
```

Written inline, where the cursor is. Offered from phase 3. Found in the
palette by: egg, easter, marker, hidden.

### Easter egg block (name it yourself)

```markdown
::: {.egg # label="✦"}

:::
```

Written as a block of its own. Offered from phase 3. Found in the palette by:
egg, easter, block, hidden, reveal.

### Opening quotation

```markdown
::: {.opening once="per-browser"}
> 
:::
```

Written as a block of its own. Offered from phase 3. Found in the palette by:
opening, quotation, epigraph, once.

<!-- /generated -->

## What each rendering does with each construct

The article, the deck, and the printed page each read their own column of this
table. A renderer that decided for itself would be a second copy of the rule,
and two copies drift.

<!-- generated: canon table -->

| Construct | Article | Slides | PDF | From phase |
|---|---|---|---|---|
| Headings | contents and headings | the slide mapping | contents and headings | 1 |
| `variant` | filtered before rendering | filtered before rendering | filtered before rendering | 2 |
| Horizontal rule | a rule in the text | splits the slide | a rule | 1 |
| `.divider` heading | an ordinary heading | a section-break slide | an ordinary heading | 1 |
| `.refs` heading | an appendix of sources | a slide of sources | an appendix of sources | 2 |
| `.columns` | ignored; content in flow | side-by-side columns | ignored; content in flow | 1 |
| `.notes` | absent | speaker notes | absent | 1 |
| `.callout` | a callout box | a callout box | a boxed aside | 2 |
| `.credit` | margin note | line at the foot of the slide | a note | 1 |
| `.margin` span | margin note | line at the foot of the slide | a note | 2 |
| `.video` | player, else poster and link | player, else poster and link | poster and printed link | 4 |
| `.opening` | modal, once per browser | absent | an epigraph on the first page | 3 |
| `.egg` | collectable, Konami reveal | absent | a static aside | 3 |
| `<!-- pagebreak -->` | ignored | ignored | a page break | 1 |
| Citation | margin note | credit line at the foot of the slide | numbered reference in the list | 2 |
| Footnote | margin note | line at the foot of the slide | note at the foot of the page | 1 |
| Reference list | generated, at the end | none; the deck carries credit lines only | generated, numbered | 2 |
| Image attributes | width and classes honoured; `.full-bleed` runs the full measure | honoured on an in-flow image; an image slide is full-bleed already | width and classes honoured | 1 |
| Raw HTML | escaped, shown as written | escaped, shown as written | escaped, shown as written | 1 |

<!-- /generated -->

## Two rules the parse applies

**A chapter title that runs to two lines is one heading.** A level-one heading
directly under another level-one heading, with no blank line between them, is
read as a single title, and the attributes of both lines are kept. Only level
one: two Sections under one another are two Sections.

**A table's caption is the `: ` paragraph directly after it.** One caption
per table; a second `: ` paragraph is a paragraph.

## Raw HTML

You may write HTML in a chapter, and the parse keeps it exactly as you wrote
it, because a plain tool reads the same file. Every rendering escapes it: it
appears on the page as the text it is, never as markup. A chapter can come from
anywhere — a Markdown file dropped onto a Part becomes a chapter — so no
rendering ever hands a chapter's HTML to a browser.

## Front matter

A chapter may open with a YAML metadata block, on Pandoc's rule: `---` on the
first line, the block's own content immediately after it — not a blank line —
and `---` or `...` on a line of its own to close it. Anything else that opens
with `---` is a slide split, which is what a chapter usually opens with.

What belongs to the whole document goes in `document.yaml` beside it, not in a
chapter's front matter.
