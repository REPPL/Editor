# How to write a table

Type a pipe table and let the columns look after themselves. Editor squares
up the table your cursor is in as you edit it, in the file rather than only on
the screen, so the table you read in Editor is the table anyone reads in any
other editor.

## Type it and keep typing

Start with the header row and the rule beneath it:

```markdown
| Reading | Week | Pages |
|---|:-:|---:|
```

Nothing moves while you write those two lines: until the rule is complete
there are no columns to line up to. Press Return, type into the first body
cell, and from that keystroke on every edit inside the table squares the
whole table up:

```markdown
| Reading      | Week |  Pages |
|--------------|:----:|-------:|
| Alice's book |  2   |  11-40 |
| Bob's paper  |  3   | 90-102 |
```

The cursor stays in the cell you are typing in, at the character you are
typing at. One `C-/` takes back the character you typed and the alignment that
came with it together, in one press.

## What moves, and what never does

Editor changes two things and nothing else: the spaces between the pipes of
every row of that one table, and the run of dashes in its rule.

- The text inside a cell is left exactly as you wrote it — every escape, every
  asterisk, every backtick, in the order you typed them.
- No pipe is added and none is taken away.
- No line outside the table is touched. A second table in the same chapter
  stays as it is; so does the paragraph above and the caption below.
- Nothing happens when you open a chapter or when you save one. Open a
  chapter with a ragged table, save it without typing, and the file is byte
  for byte what it was.

The rule's dashes are the one thing you wrote that does not come back
character for character. A rule *is* the column widths, so `|-|-|` becomes
`|---|---|` as the columns settle. Every alignment marker you wrote survives:
`:---` stays left, `---:` stays right, `:---:` stays centred, and a
right-aligned column pads its cells on the left.

## The four tables Editor leaves alone

Editor squares up a table it already understands. It never repairs one, so in
each of these cases the text stays exactly as you typed it and nothing is
announced.

**A row with the wrong number of cells.** Delete a pipe from a body row and
that row is short a column, so the table stops squaring up — ragged in the one
row you are working in, untouched everywhere else. Put the pipe back, type one
character, and the table settles again.

**A table with no rule, or a rule of the wrong width.** A header row on its
own is a paragraph, and so is a header row over `|---|` when the header has
two columns. Neither is a table yet, so neither is aligned.

**A table written without edge pipes.** GFM allows a table whose rows begin
and end with text rather than with `|`:

```markdown
Reading | Week
--- | ---
Alice's book | 2
```

Squaring that up would mean adding pipes, which is more than lining up
spaces, so Editor leaves it as it is. Write the outer pipes if you want the
columns kept.

**A table inside a fenced div or behind a `>`.** A table in a `::: {.aside}`
block, or one quoted with `>`, is left exactly as typed. This is deliberate:
the rule about what may be rewritten is bounded to a table at the top level of
the chapter.

The cursor sitting in the rule is also a moment of quiet. Change `---` to
`---:` and nothing happens while the cursor is still on that line, so you can
type `:---:` a character at a time without the row regenerating around you.
Move into any other row, type one character, and the column pads on the side
you asked for.

## A cell that holds a wide character

Editor measures a cell in characters as a reader counts them: `é` written as
`e` plus a combining accent is one character wide, and so is a flag or a
family emoji.

What it does not know is how wide a character *draws*. A Chinese, Japanese or
Korean character, and most emoji, take two columns in a monospace font and are
counted as one, so a column holding them sits one column narrower than true
for each such character. The text is never altered to make the count come
out — only the padding is out. If a column of CJK text matters more than the
rest, put it last.

Markup counts as what you see. A cell holding `**bold**` measures eight
characters, because eight characters are what the surface draws. Editor aligns
the Markdown, and the Markdown is what is on the screen.

## A cell longer than the window

A cell can be longer than the surface is wide. Where it is, the row wraps onto
the next drawn line and the page never scrolls sideways — but the wrapped
remainder runs the full width of the surface rather than staying inside its
column, and the other columns' pipes are not carried down with it.

Keeping a long cell inside its column is not something Editor does. Doing it
would mean drawing each cell as its own box, and then the characters on the
screen would stop being the characters in the file at the positions the cursor
uses, which is the one thing the whole editing surface is built to avoid. For a
cell with a paragraph in it, write a footnote or a margin note and keep the
cell short.

## Turning alignment off

Press `C-c C-t`. The modeline reads **Table alignment off**, and from then on
every edit inside every table lands exactly as typed. Press `C-c C-t` again
and it reads **Table alignment on**.

Two things about the switch are worth knowing:

- Turning alignment back on does not square anything up. The next edit you
  make inside a table is what squares that table up. There is nothing to press
  that aligns a table on demand; alignment is a mode, not a command.
- The switch lasts for exactly as long as the app is running. Quit and
  relaunch, and alignment is on. Nothing about it is written to your document
  folder or remembered between sittings, so you are never in a mode you were
  put in a week ago without knowing.

`C-h b` shows the row — **Align tables as I type** — with the rest of the
editing chords.
