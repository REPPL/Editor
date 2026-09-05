# Spike: Emacs bindings inside the Tauri window

*Explanation. What the automated check proves about the Emacs key bindings,
what it cannot reach, and the checklist a person works through at the
keyboard to close the gap.*

The delivery plan rests the whole editor on one assumption: that a web view
can hold a real Emacs editing surface. The keymap is not the risk. The
platform is — macOS, the application menu, and the Safari engine each take
some combinations before any script runs.

The spike splits that risk in two. The half a program can settle is settled
by a unit test. The half that needs fingers on a keyboard is the checklist
at the foot of this page.

## The binding table

`src/keys.ts` holds the table: an id, a human label, an owner, and the
default chords for each action, in the notation the keyboard-navigation
prototype uses — `C-` for Control, `M-` for Meta (Option on macOS), `s-` for
Super (Command), `S-` for Shift, and a space for a prefix sequence such as
`C-x C-s`. The table is data, so the tests, the key log, and any later keys
panel or rebinding all read one source.

The owner says where a chord is answered: `keymap` for the ones
`@replit/codemirror-emacs` ships, `codemirror` for the ones CodeMirror's own
`defaultKeymap`, `historyKeymap` and `searchKeymap` answer below it, `editor`
for the ones Editor adds on top, `shell` for the ones the Tauri menu claims
before the web view is consulted, and `app` for a chord reserved for a command
another part of the application wires. `Cmd-O` is the only `shell` chord: it is
the File menu's accelerator, so macOS resolves it and the page never sees the
keydown.

The table runs in both directions. Every chord in it reaches the action its
label names; and every chord the four keymaps answer is either a row of the
table or an entry in `SUPPRESSED`, which clears it so the key falls through to
the browser. `M-x`, `M-/` and `M-;` are suppressed in the Emacs keymap because
each opens a dead end — a command line with no commands, completion with no
source, a comment form Markdown does not have — and `Cmd-/` and `Ctrl-h` are
suppressed in CodeMirror's keymap, the second because `C-h` is the first step
of `C-h b`.

A chord is compared in one canonical modifier order, on both sides. The
table writes `S-C-/` the way an Emacs user says it; a keydown arrives with
the modifier flags in whatever order they are read. Without canonicalising
both, the log would call a working redo "not in table". The chord's key name
comes from `KeyboardEvent.code` for letters, digits, and punctuation alike,
because `event.key` reports the character the platform would produce and
Shift turns the slash key's `/` into `?`.

`src/keyspike.ts` installs the key log: a listener on the window in the
capture phase, which is the earliest point at which the page sees a key.
Every chord that arrives is logged with its raw `key` and `code`, whether
the table knows it, and whether the editing surface claimed it. A chord that
macOS or the engine swallows never appears in the log at all, and that
absence is the finding. `C-x k` shows and hides the panel.

## What the unit test proves

`npm test` mounts the editing surface in jsdom and dispatches keydown
events at it. Two different things are checked, and they cover different
sets of chords.

**Claimed.** The sweep dispatches every step of every chord in the table
that carries a modifier and that the Emacs layer answers — the package's own
bindings plus the ones Editor adds through the same handler, prefix sequences
counted once and each of their steps pressed and checked — and
asserts that each step leaves the keydown event with `preventDefault`
called. That is what stops the browser acting on the chord as well. It does
not assert what the command did. Chords with no modifier — `Left`, `Right`,
`Up`, `Down`, `Home`, `End`, `PageUp`, `PageDown`, `Delete`, `Escape` —
belong to the browser and are not swept; `C-u` is swept on its own, because
it starts a numeric argument and would change how the next chord is read.

**Effect.** A named test asserts what the document or the panel did, for
this list and no other: `C-f`, `C-b`, `C-n`, `C-p`, `M-f`, `M-b`, `C-a`,
`C-e`, `C-k`, `M-d`, `C-d`, `C-t`, `C-Space`, `C-w`, `M-w`, `C-y`, `C-s`,
`C-r`, `C-/`, `S-C-/`, `M-u`, `M-l`, `C-x h`, `C-x` followed by `C-g`,
`C-x C-s`, `C-x C-f`, `C-x k`, and `Return`.

Taken together they prove:

- **Each chord in the effect list maps to the command the table names.**
- **Prefix sequences work as prefixes.** `C-x` opens a prefix state that the
  modeline reports in its own cell, `C-x h` completes to select-all, and
  `C-g` cancels a half-typed prefix.
- **Editor's own chords reach Editor.** `C-x C-s` writes the open chapter,
  `C-x C-f` asks for a folder, and `C-x k` toggles the key log. A chord that
  finds no application mounted warns rather than doing nothing quietly.
- **The modeline follows.** It shows the chapter, whether it is dirty, the
  cursor as line and column, the prefix in progress, and the mark.
- **The key log reports what reached the page.** Chords dispatched at the
  editing surface are recorded through the same window listener the
  application installs, with the verdict read from `defaultPrevented` on a
  later task, and a redo pressed as Shift-Control-slash is reported as a
  chord the table knows.

Three findings came out of writing it, and all three are fixed in the code:

- The Emacs keymap has to outrank CodeMirror's standard keymap. Both are
  view plugins, and handlers run in precedence order, so without
  `Prec.highest` around the Emacs extension the standard macOS bindings
  claim `C-f`, `C-a`, `C-k`, and their neighbours first, and the Emacs
  commands never see them. This is invisible on Linux and Windows, where the
  standard keymap does not bind those chords, and would have surfaced only
  on the target platform.
- `Return` is the one exception to that precedence. The Emacs keymap binds
  `Return|C-m` to a plain newline, so raising it above everything else stops
  Markdown list continuation: pressing Return at the end of `- item` gives a
  bare line instead of the next bullet. `src/editor.ts` puts one handler
  above the Emacs plugin that takes an unmodified `Return` when the Markdown
  command has something to continue, and declines otherwise.
- `@replit/codemirror-emacs` binds `M-g`, `M-C-s`, and `M-C-r` to command
  names it never implements, so those chords are inert as shipped.
  `src/emacs.ts` supplies them from `@codemirror/search`. The same module
  adds `C-x C-s` and `C-x C-f`, which the package has no reason to carry.

So the answer to "CodeMirror's keymap as it stands, the keymap extended, or a
different editing surface" is **the keymap extended**, and the extension is
small.

## What the unit test cannot prove

jsdom is not a browser and a test runner is not a Mac.

- **Nothing about interception.** A dispatched `KeyboardEvent` starts inside
  the page. It says nothing about whether macOS, the menu bar, or WebKit
  would have let a real keypress get that far.
- **Nothing about Option as Meta.** In the test the event carries
  `altKey: true` and `code: "KeyF"` because that is what the test builds. On
  a real Mac keyboard Option-f may instead produce the character `ƒ`, and
  whether the event still carries a usable `code` is a WebKit question.
- **Nothing about layout.** jsdom has no layout engine, so `src/test-setup.ts`
  fakes a monospace grid to give the geometric commands coordinates. Real
  line wrapping, bidirectional text, and scrolling are outside its reach.
  `C-l`, `C-v`, and `M-v` are claimed in the sweep only because the fake grid
  answers their coordinate questions; nothing here says where they land.
- **Nothing about the clipboard.** `M-w` copies through the asynchronous
  clipboard API, which jsdom does not have, so `src/test-setup.ts` stubs it.
  Whether the real API is available under the `tauri://` scheme, which is not
  a secure context by default, is row 11 of the checklist.
- **Nothing about the iPad.** The tablet path is Safari with a hardware
  keyboard and no shell to claim anything back. It is untested here.

## The shell's part

`src-tauri/src/lib.rs` builds the application menu by hand rather than
taking Tauri's default. macOS always shows a menu bar, so the question is
which one; the default carries an Edit submenu whose `Cmd-Z`, `Cmd-X`,
`Cmd-C`, `Cmd-V`, and `Cmd-A` accelerators are resolved by the system before
the web view is consulted, and a View submenu that takes `Ctrl-Cmd-F`. The
menu Editor installs has three submenus: the App submenu macOS requires,
a File submenu holding one item — Open Folder, on `Cmd-O` — and a Window
submenu. Every other combination is left for the editing surface. The same
setup step takes keyboard focus, so that the first chord typed is a fair
test.

The shell also holds a close request back while the open chapter has unsaved
edits, and hands it to the page, which is the only place that knows whether
the buffer differs from the file. Answering the question is what lets the
window close.

## The manual checklist

Run `npm run tauri dev`, press `C-x k` to show the key log, click into the
text, and work down the list. A chord passes when the log shows it as
*handled* and the editor does what the label says. A chord that does not
appear in the log at all was taken above the page: note where.

| # | Chord | Expect | Notes |
|---|---|---|---|
| 1 | `M-f`, `M-b`, `M-d`, `M-w`, `M-u`, `M-l`, `M-v` | The log shows `M-f` and the word command runs | This is the Option-as-Meta question. If the log shows `ƒ` rather than `M-f`, Option is composing characters and the keymap needs the physical `code`, not the character |
| 2 | `C-Space` | The mark is set and the modeline shows `Mark` | macOS may claim Control-Space for the input-source switcher. Check System Settings › Keyboard › Keyboard Shortcuts › Input Sources if it never arrives |
| 3 | `C-x C-s` | The modeline reports the chapter written | Open a chapter first |
| 4 | `C-x C-f` and `Cmd-O` | The folder chooser opens | Both routes must work: the chord through the page, `Cmd-O` through the menu |
| 5 | `Ctrl-Tab` | The log shows the chord | WebKit may keep it for focus traversal. If the log is silent, the shell has to claim it or the binding table must not use it |
| 6 | `Cmd-Q` | The application quits | It must stay the system quit. If a page handler ever swallows it, that is a bug, not a feature |
| 7 | `Cmd-Z`, `Cmd-A`, `Cmd-C`, `Cmd-V` | `Cmd-Z` undoes and `Cmd-A` selects all, both from CodeMirror's own keymap and both listed in the table; `Cmd-C` and `Cmd-V` are the browser's clipboard | Confirms the Edit submenu is gone, so these reach the page rather than the menu, and that the Emacs kill ring is still the only kill ring |
| 8 | `C-a`, `C-e`, `C-k`, `C-y`, `C-/` | Each does the Emacs thing, not the macOS thing | macOS text fields bind some of these too; the log tells you which handler won |
| 9 | `C-g` while a prefix is half-typed | The prefix indicator in the modeline clears | Then again with the search panel open |
| 10 | `C-s`, then `M-C-s` | Search opens, then steps to the next match | |
| 11 | `M-w` with a region set, then `Cmd-V` into another application | The region is on the system clipboard | The clipboard API needs a secure context, and `tauri://` is not one by default. If the copy silently fails, `useHttpsScheme` is the switch to try |
| 12 | The same list in Safari on an iPad with a hardware keyboard | As many as survive | No shell there to claim anything, so this bounds what the single HTML file can offer |
| 13 | `C-h b`, then `C-x ?` | The keys panel opens, lists every row of the table, and closes on Escape and on `C-g` | `C-h` is the chord at real risk: WebKit may read it as a backspace in editable content. If the log never shows `C-h`, the row keeps `C-x ?` and loses `C-h b` |
| 14 | `C-c i` | The insert palette opens; three letters filter it; Return puts the form at the cursor | `C-c` is unbound in the shipped keymap and Control-c is not copy on macOS, but no real window has pressed it yet |
| 15 | `M-%` | The search panel opens with the cursor in the replacement field | Alt-Shift on the `5` key. The package spells this binding in a notation its own key reader never produces, so Editor rebinds it; this row is what proves the rebinding reaches a real keyboard |
| 16 | `C-x C-b`, then `C-x C-r` | The sidebar hides and shows; the document redraws from disk | Both are Editor's own chords on the `C-x` prefix |

Record the result of each row against the binding table. A row that fails on
the desktop is a decision: claim the combination in the shell, rebind the
action, or accept the loss. A row that fails only on the iPad is a note
against the tablet path, not against the desktop editor.
