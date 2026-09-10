# How to find and change the keys

Editor answers Emacs chords. This page is for the four questions that come up
once you are using them: what is bound, what can follow the prefix you have
half-typed, what a key you just pressed actually did, and why a chord you
expect to work does nothing.

## See every chord

Press `C-h b`, or `F1`.

The keys panel lists every binding Editor answers, grouped by what it does —
movement, selection, editing, mark and kill ring, search, document, control.
Each row gives the label and every chord that reaches it. Move through the rows
with `C-n` and `C-p`; close the panel with `C-g` or Escape.

All three of the row's chords — `C-h b`, `C-x ?` and `F1` — open the panel from
the editing surface, and from there only. With the keyboard in the tree or in a
panel, they claim nothing and nothing opens; `C-x o` brings the keyboard back to
the text, where they work.

On macOS, `F1` reaches Editor only when "Use F1, F2, etc. keys as standard
function keys" is on in System Settings › Keyboard. With that setting off, the
key adjusts the display's brightness and never arrives at the page. `C-h b` is
unaffected.

Some rows carry a note in the margin:

| Note | Meaning |
|---|---|
| `menu` | the chord is the window's own menu accelerator, answered by the shell rather than by the text |
| `editor` | answered by CodeMirror's own keymap rather than by the Emacs layer |
| *no note* | answered by the Emacs layer or by Editor itself |

The panel reads the binding table at the moment it opens, so it can never
disagree with what the keyboard does.

## See what can follow a prefix

Press `C-h` with a prefix half-typed.

`C-x` and then `C-h` opens a panel listing every chord that begins with `C-x`,
each beside the label of what it reaches. What each line shows is what is left
to type: the line for **Save the chapter** reads `C-s`, because the `C-x` is
already stated in the panel's heading. The prefix is not abandoned — typing the
rest of a chord the panel lists runs it and closes the panel in the same moment.

The list is flat, and every chord on it is a whole chord. `C-x n n` and `C-x n w`
are both there in full rather than behind a line saying `C-x n` is a prefix. A
step that is itself a longer prefix narrows the list and keeps reading: type `n`
under `C-x` and the panel redraws to the two rows under `C-x n`, with `C-x n-`
as its heading. `C-h` after `C-x n` reaches the same list directly.

A row shows only the chords that are under the prefix. **Undo** is reachable
five ways, and under `C-x` it contributes the single line `u`.

`C-g` or Escape closes the panel, cancels the prefix, and runs nothing. A key
that completes no chord under the prefix closes it too, and the modeline says
the chord is not bound. Nothing typed at the panel reaches the chapter.

The panel appears only when it is asked for. There is no version of it that
opens by itself after a pause.

The list is the prefix's rows *in the pane holding the keyboard*, because
nothing it lists is ever dead. In the text that is the whole `C-x` map; in the
tree or in a panel it is the two chords those panes answer, `C-x C-b` and
`C-x o`. In those panes `C-h` describes a prefix that is already in progress and
never opens one of its own: pressed with nothing half-typed there, it claims
nothing.

`C-h` on its own in the text is still the prefix `C-h b` and `C-h k` sit under.
Whether it is the help character or a prefix depends on one thing only: whether
a prefix is already in progress.

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
that pane. Reach those by giving the tree the keyboard with `C-x o`. Once
there, `h` hides the sidebar again and hands the keyboard straight back to
the text.

## Show and hide the sidebar

Press `F2`. The tree appears beside the text, or folds away if it is already
there, and the cursor stays exactly where it is. The chord is the same one
press wherever the keyboard is: in the text, in the tree, or with a panel
open. Hiding the tree while the tree holds the keyboard hands the keyboard
back to the text, the same way `h` does from inside the sidebar.

`C-x C-b` is the same row's second chord — Emacs's `list-buffers`, pointed at
Editor's chapter list, which is the tree `C-x b` searches by name. It differs
from Emacs's own in one named way: a second press hides the tree, where
Emacs's refreshes a list that never closes.

`C-x o` moves the keyboard and changes nothing about what is shown. It walks
the panes that are on the screen — the text, the tree when it is shown,
whatever panel is open — and where there is nowhere else to go, the modeline
says so rather than the chord doing nothing quietly.

## Ask what one chord does

Press `C-h k`, then the chord you want named.

The modeline names the action that chord reaches, or says it is not bound. A
prefix chord is read as one sequence: `C-h k` then `C-x` then `C-s` waits for
the second step and then answers **Save the chapter**.

A chord that is both a row and a prefix is answered as the row, and the prompt
closes rather than waiting for a second step. `C-h` is the one such chord in the
table: `C-h k` then `C-h` answers **What can follow this prefix** and stops. To
read what sits under the `C-h` prefix instead, press `C-h` twice — the first
opens the prefix, the second describes it.

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
| `C-h` | CodeMirror's keymap | in the Emacs keymap `C-h` is the first step of `C-h b` and is the chord that describes a prefix in progress; clearing it there would close the keys panel off |
| `M-s` | the Emacs keymap | centring the selection is retired; `C-l`'s own recentre already puts the cursor's line in the middle of the view |

Every chord either has a row in the binding table or appears in this list. A
conformance check over the shipped keymaps fails a chord that is in neither, and
one that is in both, so this table cannot quietly fall out of date. `C-h` is the
single named exception, and it is both because each list is about a different
keymap: it is taken out of CodeMirror's so that delete-backward cannot answer
it, and it carries a row because the Emacs layer answers it after a prefix. The
check asserts that exception in both directions rather than excusing it. `M-s`
is the one entry that does not simply fall through: [Move through the
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
exhaustive, so a chord must be in exactly one of them — apart from the one
named exception above, which the check holds to a stricter rule than the
others.
