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

## Find a command by its name

Press `M-x` and type a few letters of what the command is called.

The palette lists every row of the binding table the text answers, plus every
construct the insert palette offers, and filters as you type. Choosing a row
runs it; `C-g` or Escape closes the palette having changed nothing. It is the
way to reach an action whose chord you cannot recall, and the way to see what
the surface answers without leaving the text.

Two kinds of row are left out. A chord the window's menu answers, marked `menu`
in the keys panel, has no command behind it in the page, so offering it would
be a dead end. A chord the sidebar answers is the tree's: `M-x` is open over
the text, and a row that moves a cursor in a pane you are not in belongs to
that pane. Reach those by giving the tree the keyboard with `C-x o`.

## Ask what one chord does

Press `C-h k`, then the chord you want named.

The modeline names the action that chord reaches, or says it is not bound. A
prefix chord is read as one sequence: `C-h k` then `C-x` then `C-s` waits for
the second step and then answers **Save the chapter**.

`C-h k` reads the same table the keys panel renders, so its answer is the
keyboard's answer.

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
| `M-;` | the Emacs keymap | comment toggling, which Markdown has no line form for |
| `s-/` | CodeMirror's keymap | the same comment toggle, from CodeMirror's own keymap |
| `C-h` | CodeMirror's keymap | in the Emacs keymap `C-h` is the first step of `C-h b`; clearing it there would close the keys panel off |
| `M-s` | the Emacs keymap | centring the selection is retired; `C-l`'s own recentre already puts the cursor's line in the middle of the view |

Every chord either has a row in the binding table or appears in this list. A
conformance check over the shipped keymaps fails a chord that is in neither, and
one that is in both, so this table cannot quietly fall out of date. `M-s` is
the one entry that does not simply fall through: [Move through the
outline](how-to-move-through-the-outline.md) binds `M-s o` over it, which is
what turns `M-s` into a prefix rather than a dead key.

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

## Make the text bigger or smaller

Press `C-x C-=` to enlarge the editing surface a step, `C-x C--` to shrink it a
step, and `C-x C-0` to put it back to the size the app opened at. A step is a
factor of 1.2, and the scale stops after five steps in each direction — about
40 % of the default at the smallest and about 249 % at the largest. The
modeline reads the scale as a percentage for a moment and then goes back to
showing your position; at either limit it says so rather than doing nothing
quietly.

Only the words scale. The sidebar, the modeline and every panel keep the size
they had, which is what separates this from the operating system's own zoom.
The scale is remembered for this machine, beside the other things the app knows
about it, so each machine keeps its own and nothing about it is written into
the document folder. Every one of the three chords begins with the `C-x`
prefix, which is why `C--` still redoes an edit and `C-=` is still free.

## Change a binding

Bindings are data, in one table: `src/keys.ts`. A row names the action, its
label, the chords that reach it, its group, and who answers it. Editing a row
changes the keyboard, the keys panel, every tooltip, and the tests together,
because all of them read the same table.

To take a chord out rather than rebind it, move it to the suppression list in
the same file and say why. The conformance check treats the two lists as
exhaustive, so a chord must be in exactly one of them.
