# How to edit prose with Emacs commands

Editor answers the commands a writer of prose reaches for without thinking:
reflowing a paragraph, moving by sentence, swapping two words, completing a
word from the text you have already written. This page is for using them.

Every chord below has a row in the binding table, so `C-h b` lists it and
`C-h k` names it. To change one, see
[Find and change the keys](how-to-find-and-change-the-keys.md).

## Reflow a paragraph

Put the cursor anywhere in the paragraph and press `M-q`.

The paragraph is wrapped at the document's fill column, and every other byte of
the chapter is untouched: the paragraph above it, the table below it, and the
file's line endings are exactly what they were. One `C-/` takes the whole reflow
back, because filling is a single edit.

Set the column in `document.yaml` at the document root:

```yaml
fill_column: 72
```

A document that says nothing is filled at 80.

`M-q` fills a paragraph and refuses everywhere else. Inside a fenced div, a
pipe table, a fenced code block, a list, a quotation, or on a heading, it
changes nothing and the modeline says which of those the cursor is in. The
reason is that the document model records where a paragraph starts and stops
but records no continuation prefix for a list item or a quotation, so a command
that reflowed one would be guessing at what the second line should begin with.

Filling never leaves a line starting with a character that opens a block
construct — `#`, `>`, `-`, `+`, `*`, `|`, `:`, `=`, a number followed by `.`,
or a code fence. A word like that stays on the line it is on, even where that
takes the line past the column, so a chapter opened in a plain Markdown reader
reads as the paragraph you wrote rather than as a list you did not.

## Move by sentence and by paragraph

| Chord | What it does |
|---|---|
| `M-a` | to the beginning of the sentence |
| `M-e` | to the end of the sentence |
| `M-{` (`M-S-[`) | back over the paragraph |
| `M-}` (`M-S-]`) | forward over the paragraph |
| `M-r` | to the line halfway down the window, keeping the column |

A sentence ends at `.`, `?` or `!`, followed by any closing bracket or quote,
followed by two spaces or a line break — Emacs's own rule. A full stop with one
space after it is an abbreviation, not an end, which is why `M-q` writes two
spaces after every sentence it fills.

## Repair the text at the cursor

| Chord | What it does |
|---|---|
| `M-t` | swap the two words either side of the cursor |
| `C-x C-t` | swap this line with the one above |
| `M-c` | capitalise the word ahead of the cursor |
| `M-^` (`M-S-6`) | join this line to the one above, leaving one space |
| `M-SPC` | collapse the spaces around the cursor to one |
| `M-\` | take the spaces around the cursor away |
| `M-z` | kill forward to and including a character you then type |

`M-z` prompts in the modeline and waits for one key. What it kills goes on the
kill ring, so `C-y` yanks it back and `M-y` reaches it later. `C-g` or Escape
cancels the prompt and changes nothing.

## Complete a word from the document

Type the first few letters of a word you have already used and press `M-/`.

Editor completes it from the chapter's own words, taking the nearest match
before the cursor first and then the nearest after it. Pressing `M-/` again
takes the next candidate; pressing it past the last candidate puts back the
letters you typed, and the cycle begins again. Typing anything else, or moving
the cursor, ends the cycle.

## Run a command by name

Press `M-x` and type a few letters of what you want.

The palette lists every command the binding table carries and every construct
the insert palette offers, filtered as you type. Three kinds of typing reach a
row: the start of its label, the start of any word in its label, and the
initials of those words, so `tw` reaches **Transpose words**. Its Emacs name
works too, so `dabbrev` reaches **Expand the word from the document**.

Move with `C-n` and `C-p`, run with Return, and cancel with `C-g` or Escape.
Cancelling changes not one byte.

The insert palette keeps its own chord, `C-c i`. Its constructs are listed
under `M-x` as well, so there is one place to reach anything.

## Find out what a chord does

Press `C-h k`, then the chord.

The modeline names the action the chord reaches, or says the chord is not
bound. A prefix chord is read as one sequence: `C-h k` then `C-x` then `C-s`
answers **Save the chapter** rather than answering twice.

## Quit

Press `C-x C-c`.

With nothing unsaved, the window goes. With unsaved edits, Editor asks first,
in the window rather than in a system dialog, so `C-g` and Escape put you back
in the text with the edits intact. Quitting never writes: save with `C-x C-s`
first if you want the file changed.
