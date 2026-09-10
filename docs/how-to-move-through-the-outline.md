# How to move through the outline

Editor treats a chapter's headings as an outline, the way Emacs's Markdown
mode and Org mode do: move between them, fold a section out of the way,
promote or demote a heading with everything under it, move a section past
its neighbour, narrow the window to one section, and find every line that
holds a word.

Every chord below has a row in the binding table, so `C-h b` lists it and
`C-h k` names it. To change one, see
[Find and change the keys](how-to-find-and-change-the-keys.md).

## Move between headings

| Chord | What it does |
|---|---|
| `C-c C-n` | next heading, at any level |
| `C-c p` | previous heading, at any level |
| `C-c C-f` | next heading at this one's own level |
| `C-c C-b` | previous heading at this one's own level |
| `C-c C-u` | up to the parent heading |

Same-level movement stops rather than crossing into a different section's
headings: from the second of two sub-sections under one section, `C-c C-f`
says there is no next heading at that level, even though the next chapter
section is further down the file.

`C-c C-n` and `C-c p` would be Markdown mode's own `C-c C-n` and `C-c C-p`,
but `C-c C-p` already presents the chapter (see
[Your first talk](tutorial-your-first-talk.md)); previous-heading takes
`C-c p` instead, on the same terms the insert palette already sits on
`C-c i` beside Markdown mode's own `C-c C-i`.

## Fold and cycle

Put the cursor on a heading and press `Tab`: everything under it, down to
the next heading at its level or shallower, folds to one line. `Tab` again
opens it. `S-Tab`, pressed anywhere, folds every top-level section of the
chapter at once, or opens every one of them again if any is already folded.

Folding never changes the file. It is a property of the window, not of the
text: saving a chapter with a section folded writes exactly the bytes it
would write with nothing folded.

## Promote, demote, and move a section

| Chord | What it does |
|---|---|
| `C-c Left` | promote the heading and everything under it one level |
| `C-c Right` | demote the heading and everything under it one level |
| `C-c Up` | swap this section with the one before it at the same level |
| `C-c Down` | swap this section with the one after it at the same level |

Promoting a `##` heading with two `###` headings under it turns them into
`#` and `##`; every byte outside those three heading lines is unchanged.
Promoting a chapter's own title, which is already the top level, changes
nothing and says so, and so does promoting or demoting a heading written
as an underlined title rather than with `#`, because there is no second
line to keep in step with the first.

Moving a section takes its whole subtree with it — the heading and
everything nested under it — and swaps it with its neighbour's, also whole.
A section with no neighbour at its level in the direction asked changes
nothing.

## Mark up and insert

| Chord | What it does |
|---|---|
| `C-c C-s b` | bold the selection, or open `**`, cursor between them |
| `C-c C-s i` | italicise the selection, or open `*`, cursor between them |
| `C-c l` | insert `[label](url)`, cursor ready for the url or the label |
| `C-c C-i` | insert `![alt](src)`, the same way |

A selection becomes the link's label or the image's alt text; with nothing
selected, the cursor lands between the square brackets instead, ready for
you to type it.

`C-c l` is Editor's own chord, on the same terms as previous-heading above:
Markdown mode's own `C-c C-l` already publishes the document (see
[Connect the production repository](how-to-connect-the-production-repository.md)).

## Switch chapter, and close it

Press `C-x b` and type a few letters of a chapter's title: a filterable list
opens, the same list the sidebar draws from, and choosing one opens it with
the cursor where you last left it. `C-x C-b` shows the chapter list itself —
the sidebar — the way Emacs's `list-buffers` sits beside `switch-to-buffer`;
`F2` is the same row's first chord, and either hides the tree again on a
second press (see
[Find and change the keys](how-to-find-and-change-the-keys.md)).

Press `C-x C-k` to close the open chapter. With nothing unsaved, the window
returns to no chapter open and the sidebar and the folder stay exactly
where they were. With unsaved edits, Editor asks first, in the window
rather than a system dialog, so `C-g` or Escape put you back in the text
with the edits intact. `C-x C-k` is Editor's own chord: Emacs's own
`kill-buffer` sits on the bare `C-x k`, which already shows the key log
(see [Find and change the keys](how-to-find-and-change-the-keys.md)).

## Narrow to a section

Put the cursor on a heading and press `C-x n n`: every line outside that
heading's section drops out of the window. `C-x n w` brings every line
back.

Narrowing here is a window onto the text, not a restriction of it: the
cursor, search, and every other command still reach the whole chapter while
narrowed, and saving writes every byte of the file, hidden lines included.
It is not Emacs's stronger `narrow-to-region`, which refuses a command
reaching past what is shown.

## Find every line that holds a word

Press `M-s o` and type a word: a list names every line that holds it, by
number and text. Choose one to put the cursor there. Cancelling with `C-g`
or Escape closes the list and changes nothing.

`M-s` on its own opens as a prefix and does nothing until the next key: it
is reserved for the outline's own occur, `M-s o`.

## Replace with a regular expression

Press `C-M-%`: the search panel opens with its replace field focused and
the regular-expression option already switched on, ready for a pattern
rather than a literal string. `M-%` opens the same panel with a literal
string instead.
