# How to split the editing area

Divide the editing area into several windows inside the one Editor window, the
way Emacs does. Two windows can show two chapters, or the same chapter twice —
the introduction at the top of the page and the methods section at the bottom of
it, both live, both editable, each keeping its own place.

## Divide the area

`C-x 3` divides the window holding the keyboard left and right. `C-x 2` divides
it above and below.

Both halves show the chapter that window was showing, the keyboard stays in the
window you were in, and the cursor does not move. Nothing is read from disk and
nothing is written.

A split is itself splittable, so press again to keep dividing. Only the window
you are in changes size: its neighbours stay exactly where you put them.

Editor refuses to make a window too narrow or too short to write in, and says
**Too narrow to divide** or **Too short to divide** in the footer rather than
producing a sliver. At the narrowest width the desktop window opens at, the area
divides above and below once and never left and right.

## Move between windows

`C-x o` walks the windows in reading order — left to right, top to bottom —
then the sidebar if it is shown, then whatever panel is open, then back to the
first window. It moves the keyboard and changes nothing about what is on the
screen. Where there is nowhere else to go, the footer says so.

Each window keeps its own cursor. Come back to a window and the cursor is where
you left it, in the chapter you left it in.

The footer names the window you are in and how many there are — `[Editor 2/4]`
— and each window is a labelled region carrying the name of the chapter it
shows, so a screen reader announces the chapter as the keyboard arrives.

## Open a different chapter in one window

Open a chapter the way you always do: `C-x b` to search the chapter list by
name, or Return on a row of the sidebar. It opens in the window holding the
keyboard, and every other window is untouched.

`C-x C-s` saves the chapter in the window holding the keyboard, to that
chapter's own file, and writes nothing else — from the keyboard, from `M-x`, or
from the prefix overlay.

The sidebar highlights the chapter the keyboard is in, so it follows you round
the windows.

## Two windows on one chapter

Divide the area and leave both halves on the same chapter. An edit made in
either appears in the other as you type: one text, two views of it, each with
its own cursor.

Typing where the other window's cursor sits pushes that cursor along by what you
typed, exactly as it would if the other window were scrolled somewhere else in
the file. It never jumps to where you are typing.

**Undo is per window.** This is the one place Editor diverges from Emacs, and it
is worth knowing before you meet it. Each window keeps its own undo history, so
`C-/` in a window undoes the edits made *in that window*. `C-/` in a window that
did nothing undoes nothing. And because an undo is itself a change, undoing in
the window that made the edit takes the text back in both windows. Nothing is
ever lost by this: every edit sits in exactly one window's history, and a chord
that appears to do nothing is the worst it does.

## Close a window

`C-x 0` closes the window holding the keyboard and gives its room to the rest.
The keyboard moves to a neighbouring window.

`C-x 1` keeps the window holding the keyboard and closes the others.

Neither loses an edit and neither writes a file. A chapter's text belongs to the
chapter, not to the window showing it, so closing a window with unsaved edits in
it keeps them: open that chapter again, in any window, and the text and the
cursor come back where the window left them. Nothing asks whether you mind,
because nothing is discarded.

`C-x C-c`, closing the desktop window, and opening another document with
`C-x C-f` or `C-x C-o` ask about every chapter with unsaved edits, naming the
chapter when there is one and counting them when there are more. They ask
because each of them does discard the text: closing a window does not.

## Resize a window

`C-x }` widens the window holding the keyboard. `C-x {` narrows it. `C-x ^`
makes it taller. Each press moves the divider by a twentieth of the division it
is in, and the footer says the window's share of that division —
`Window 2 of 4: 45%` — so a chord that landed and a chord that did not are told
apart without looking.

Editor stops at a size where a window is still readable and says **This window
cannot get any wider** rather than going past it.

Three things surprise people, and all three are Emacs's:

- **In a grid, the widening chords move a whole column.** A window's width is a
  property of the left-and-right division it sits in, so widening the window
  bottom-left widens the window above it too. No division in the layout would
  widen one cell of a grid on its own.
- **The wrong axis refuses.** `C-x }` in a layout that is only stacked above
  and below has no left-and-right division to move, and says **No window beside
  this one**. `C-x ^` in a layout that is only side by side says **No window
  above or below this one**.
- **There is no chord for making a window shorter**, because Emacs binds none.
  To shorten a window, move to the window below or above it with `C-x o` and
  press `C-x ^` there.

Dragging a divider does the same work with the pointer, and stops at the same
size. The dividers are not in the tab order: the keyboard route to a size is the
window's own chords, not the divider's.

## What stays outside the grid

The sidebar and any open panel are docked beside the editing area, not inside
it. Neither divides, and neither becomes a window of the grid. `C-x o` visits
them after the editing windows, as it always has.

Editor makes no second desktop window. These are divisions inside the one
window, as Emacs's are.
