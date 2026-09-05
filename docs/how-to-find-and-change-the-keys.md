# How to find and change the keys

Editor answers Emacs chords. This page is for the three questions that come up
once you are using them: what is bound, what a key you just pressed actually
did, and why a chord you expect to work does nothing.

## See every chord

Press `C-h b`.

The keys panel lists every binding Editor answers, grouped by what it does —
movement, selection, editing, mark and kill ring, search, document, control.
Each row gives the label and every chord that reaches it. Move through the rows
with `C-n` and `C-p`; close the panel with `C-g` or Escape.

Some rows carry a note in the margin:

| Note | Meaning |
|---|---|
| `menu` | the chord is the window's own menu accelerator, answered by the shell rather than by the text |
| `editor` | answered by CodeMirror's own keymap rather than by the Emacs layer |
| *no note* | answered by the Emacs layer or by Editor itself |

The panel reads the binding table at the moment it opens, so it can never
disagree with what the keyboard does.

## See what a key did

Press `C-x k` to show the key log. It sits above the modeline and records each
chord as you press it, with whether Editor recognised it and whether anything
answered.

A chord shown as recognised but unanswered is a chord Editor knows about and
has deliberately left empty — see below. A chord shown as unrecognised reached
the browser engine underneath. Press `C-x k` again to hide the log.

The log is the thing to read from if you are reporting a key that misbehaves:
it says exactly what arrived.

## Chords Editor answers with nothing

A chord that opens a dead end is worse than one that does nothing: it looks
like a feature and is not. Editor therefore takes a small number of chords off
the keymaps rather than answering them, and the key falls through as though the
binding had never existed.

| Chord | Taken out of | Why |
|---|---|---|
| `M-x` | the Emacs keymap | a command line with no commands behind it |
| `M-/` | the Emacs keymap | completion with no source configured |
| `M-;` | the Emacs keymap | comment toggling, which Markdown has no line form for |
| `s-/` | CodeMirror's keymap | the same comment toggle, from CodeMirror's own keymap |
| `C-h` | CodeMirror's keymap | in the Emacs keymap `C-h` is the first step of `C-h b`; clearing it there would close the keys panel off |

Every chord either has a row in the binding table or appears in this list. A
conformance check over the shipped keymaps fails a chord that is in neither, and
one that is in both, so this table cannot quietly fall out of date.

## Chords that need a physical key, not a character

Four chords are spelled in the shipped Emacs package in a notation its own key
reader never produces, so they arrive under the physical key instead:

| What you press | What it does |
|---|---|
| `M-S-,` | beginning of the document |
| `M-S-.` | end of the document |
| `M-S-2` | mark the next word |
| `M-S-5` | replace |

On a keyboard where those characters sit elsewhere, press the key in the
position the table names — the physical key, not the character printed on it.

## Change a binding

Bindings are data, in one table: `src/keys.ts`. A row names the action, its
label, the chords that reach it, its group, and who answers it. Editing a row
changes the keyboard, the keys panel, every tooltip, and the tests together,
because all of them read the same table.

To take a chord out rather than rebind it, move it to the suppression list in
the same file and say why. The conformance check treats the two lists as
exhaustive, so a chord must be in exactly one of them.
