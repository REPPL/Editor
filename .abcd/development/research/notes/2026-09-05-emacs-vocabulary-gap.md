# The Emacs vocabulary: what the binding table has, and what it lacks

Written 2026-09-05 at the maintainer's request after the first session
with the app. The table at that moment held 83 rows (16 movement, 26
editing, 8 mark, 4 search, 7 document, 4 control, 18 selection) and
suppressed five chords (`M-x`, `M-/`, `M-;`, `s-/`, `C-h` as a plain key).
This note compares it with the Emacs bindings a writer of prose reaches for
without thinking, and with the outline vocabulary of Emacs's own Markdown
and Org modes, and ranks what to add.

## Present and sound

Character, word, line, and buffer movement; paging and recentre; kill,
yank, yank-pop, kill-word both ways, kill-line, kill-region, copy;
mark, exchange point and mark, select all; transpose characters; case of
a word and a region; undo and redo; incremental search both ways with
repeat; universal argument; quit; open folder, save, reload, sidebar
toggle; present, publish, settings, insert palette, key log, keys panel.

## Tier one: prose muscle memory (add in the next slice)

| Chord | Emacs name | Why a writer needs it |
|---|---|---|
| `M-q` | fill-paragraph | Reflow a paragraph to the fill column; the one editing command prose writers press most |
| `M-t`, `C-x C-t` | transpose-words, transpose-lines | Fixing word order without retyping |
| `M-c` | capitalize-word | The third of the three case commands; `M-u` and `M-l` exist |
| `M-a`, `M-e` | backward-sentence, forward-sentence | Sentence movement is how prose is navigated |
| `M-{`, `M-}` | backward-paragraph, forward-paragraph | Paragraph movement; `M-h` marks one already |
| `M-^`, `M-SPC`, `M-\` | delete-indentation, just-one-space, delete-horizontal-space | Whitespace repair after a kill |
| `M-z` | zap-to-char | Kill up to a character; cheap and loved |
| `M-@` | mark-word | Bound in the keymap but unreachable on macOS until the physical-key fix lands |
| `M-x` | execute-extended-command | A command palette listing every row by name, fuzzy-filtered; currently suppressed. The insert palette on `C-c i` becomes one kind of `M-x` entry |
| `C-h k` | describe-key | Press a chord, see what it does; the keys panel shows the table, this answers one key |
| `M-r` | move-to-window-line | Cursor to the middle of the view |
| `C-x C-c` | save-buffers-kill-emacs | Quit with the unsaved-work guard the window close already has |
| `M-/` | dabbrev-expand | Complete a word from the document's own words; currently suppressed, and writers miss it |

## Tier two: the document model as an outline (a slice of its own)

Emacs's Markdown mode and Org mode treat headings as an outline, and the
book model has five levels. The vocabulary to adopt, with Markdown mode's
own chords where they exist:

| Chord | Meaning |
|---|---|
| `C-c C-n`, `C-c C-p` | next heading, previous heading |
| `C-c C-f`, `C-c C-b` | next and previous heading at the same level |
| `C-c C-u` | up to the parent heading |
| `TAB` on a heading, `S-TAB` anywhere | fold and unfold a section; cycle the whole outline |
| `C-c Left`, `C-c Right` | promote and demote a heading (with its subtree) |
| `C-c Up`, `C-c Down` | move a heading with its subtree |
| `C-c C-s b`, `C-c C-s i` | bold, italic on the region |
| `C-c C-l`, `C-c C-i` | insert a link, insert an image (Markdown mode's own chords) |
| `C-x b`, `C-x C-b` | switch chapter by name with completion; the chapter list (the sidebar) |
| `C-x k` | close the chapter (kill-buffer) |
| `C-x n n`, `C-x n w` | narrow to the section under the cursor, widen: a focus mode the book model makes natural |
| `M-s o` | occur: every match in the document as a list in the sidebar |
| `C-M-%` | query-replace with a regular expression |

## Tier three: could, when asked for

Registers (`C-x r s`, `C-x r i`, `C-x r j`), rectangles (`C-x r k`,
`C-x r y`, `C-x r t`), keyboard macros (`F3`, `F4`, `C-x (`, `C-x )`,
`C-x e`), `M-s .` search the word at point, window splitting (`C-x 2`,
`C-x 3`, `C-x 1`) once a second pane exists, `C-x C-w` save as.

## Will not

Lisp evaluation, shell commands, buffers that are not chapters, frames,
and anything that needs a terminal.

## Conflicts the table already carries, for the maintainer to decide

- `C-c C-p` is Present; Markdown mode uses it for previous heading.
  Candidates: Present on `C-c C-v` (view) or `C-c C-c`.
- `C-c C-l` is publish; Markdown mode uses it for insert link. Candidate:
  publish on `C-c C-u` (upload) once `C-c C-u` is not needed for up-heading,
  or on `C-c P`.
- `C-x k` is the key log; Emacs kills the buffer. Candidate: key log on
  `C-c k`.
- `M-s` is centre-selection; Emacs uses `M-s` as the search prefix
  (`M-s o`, `M-s .`). Candidate: give `M-s` to the search prefix.
- `M-Up`/`M-Down` move a line; in an outline they move a heading with its
  subtree. Candidate: keep line movement in prose, heading movement on
  `C-c Up`/`C-c Down` as Markdown mode does.
- `C-x C-o` is now other-window by the maintainer's choice; Emacs's
  delete-blank-lines moves elsewhere or is dropped.
- `C-x r` is the rectangle prefix; in Emacs it is also the register prefix,
  which is fine, both share it.

## Recommendation

Tier one now, as one intent; tier two as the outline intent of the next
slice, decided together with the conflicts above; tier three when asked.
