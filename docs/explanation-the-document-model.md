# The document model and the three renderings

This page explains the shape of a document in Editor and why one file becomes
three different things. It is background, not instructions: nothing here needs
doing.

## A document is a folder

There is no project file, no database, and no format only Editor can open. A
document is a folder on your disk:

```
presentation/
  document.yaml              what belongs to the whole document
  01-slides/                 a Part
    01-technology-impact-assessment.md    a Chapter
    02-where-im-coming-from.md
    assets/                  the pictures those chapters use
```

A **Part** is a folder. A **Chapter** is a Markdown file. A numeric prefix on
the name gives the order, and the name after it gives the title where the
chapter has no heading of its own. Parts nest; assets sit in an `assets/`
folder beside the chapters that refer to them.

Everything that belongs to the document as a whole — its title, its author, its
variants, where its bibliography is — lives in `document.yaml` beside the
Parts, so a chapter is only ever its own text.

Nothing about your machine goes anywhere near the folder. Where the production
repository is, which remote it pushes to, what the site is reached at, and the
folders you drop assets from are facts about this computer, and they live in
Editor's own configuration directory. You can hand someone the folder and it
carries no trace of you.

The consequence worth naming: your document outlives Editor. Git can diff it,
`grep` can search it, Pandoc can convert it, and a text editor from 1990 can
open it. If Editor were to vanish tomorrow you would still have every word.

## One parse

A chapter is read exactly once, into a tree of blocks and inline nodes. Every
block carries the byte span it came from and the line it starts on, so a
position in the tree is a position in the file — which is what makes an
annotation, a cursor, and a search result all mean the same thing.

Nothing is rewritten on the way in. Attributes are kept as the author wrote
them; raw HTML is kept verbatim, because a plain tool reads the same file and
the tree must not know less than the file does.

The important word is *once*. Every rendering is a function of the same tree,
so a difference between the article and the deck is a difference in a renderer
and never a difference in how the file was read. There is no second, lighter
parse for the sidebar: the outline is derived from the same tree.

## The canon is a table, not a habit

What each construct does in each rendering is written down as data, in one
table, quoting the specification's own words. A renderer asks the table what to
do with a block; it does not decide for itself.

That is a deliberate structural choice. The alternative — each renderer
knowing the rules — is three copies of every rule, and three copies drift. With
one table, a construct's placement changes in one place, and a test holds the
table against the chapter it transcribes, cell by cell, so drift is a failing
test rather than a surprise on stage.

The same discipline decides when a construct becomes available: its phase is a
column of that table, and the insert palette reads the number from it rather
than keeping one of its own.

## The three renderings

The same tree becomes three things, and they are not three formats of one
document so much as three different jobs.

**The article** is the document as continuous prose: headings become a contents
list and headings, citations become margin notes and a generated reference
list, and the constructs that exist only for a stage — speaker notes, columns —
are simply absent. It is what a reader reads.

**The deck** is the document as a talk. Headings become the slide mapping; a
horizontal rule splits the slide in force; a `.divider` heading is a slide whose
face is its headline alone; the prose that would crowd a slide becomes its
speaker notes. The deck holds the whole document, and it is built by the same
core whether you press `C-c C-p` to project it or publish it to a link — so the
deck at the link is the deck you rehearsed.

**The printed page** is the document as a PDF for a journal: page breaks are
honoured, citations become numbered references, and every reference is resolved
before the page is typeset.

A construct that means nothing in a rendering is not an error there. `.notes`
is absent from the article; `<!-- pagebreak -->` is ignored by both the article
and the deck. Each rendering knows what to do with everything, even when what
it does is nothing.

## Why the deck reflows instead of scaling

Presentation engines usually fix a slide's size and scale it to the screen.
Editor does not: the deck runs with layout disabled and its own stylesheet, and
a slide lays itself out at the reader's own width.

The price is that exact visual placement is not available — you cannot put a
word at a particular spot on the slide. What you get for it is a deck that is
legible on a projector, on a tablet, and on a phone without three sets of
slides, and text that stays at the reader's own size rather than being shrunk
to fit.

## What publishing produces

Publishing writes a version folder into a git repository you own and pushes it
with your own git. Editor holds no account and no token.

Each version is identified by a hash of its content alone — no clock, no random
value, no path from your machine — so republishing unchanged text lands on the
version folder that is already there, and a dry run is faithful to the publish
it stands in for. Alongside the frozen version there are stable links that
always point at the newest one: the deck first, because that is what a lectern
needs, and the article second.

Unlisted is not private. Anyone holding the link can read it, and a link once
sent cannot be recalled. Editor says so at every publish, behind no disclosure,
because it is the one thing about publishing that cannot be undone.
