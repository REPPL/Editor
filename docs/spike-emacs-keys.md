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
the table knows it, whether the page claimed it, and whether a command
answered it. A chord that macOS or the engine swallows never appears in the
log at all, and that absence is the finding. `C-x k` shows and hides the
panel.

The last two are different questions and the spike needs both. *Claimed*
means the page called `preventDefault`, so the browser does nothing further
with the key. *Handled* means a command ran. They part company on the Option
key, for the reason the next section gives.

## Option is Meta, so Option never types

On macOS the Option key is also the character-composition key. Option-f is
`ƒ`, Option-d is `∂`, Option-8 is `•`, and Option-e, Option-u, Option-i,
Option-n and Option-`` ` `` are *dead keys*: the keydown carries `key` of
`"Dead"` because no character has been decided yet, and the accent is
composed onto whatever is typed next.

Two things follow, and `src/keys.ts` and `src/editor.ts` do one each.

The chord is read from `KeyboardEvent.code`, never from `event.key`, so a
dead key is the letter's chord exactly as if nothing were composing:
`key: "Dead", code: "KeyU"` is `M-u` and reaches upcase-word. The same rule
covers the shifted digits and punctuation the table names — `M-%` arrives
with `key` of `ﬁ` and `code` of `Digit5`, `M-@` with `€` on `Digit2`, `M-<`
with `¯` on `Comma`, `M->` with `˘` on `Period` — and it is the same rule
that already reads Shift-`/` as `S-/` rather than `?`, which is how `C-/`
undoes and `C-S-/`, arriving as `key: "?"` on `Slash`, redoes.

The package's own key reader does the same thing, and this matters because it
is where the chord is actually decided:

```js
static getKey(e) {
    var code = e.code;
    var key = e.key;
    if (ignoredKeys[key])
        return ['', '', ''];
    if (code.length > 1) {
        if (code[0] == "N") code = code.replace(/^Numpad/, "");
        if (code[0] == "K") code = code.replace(/^Key/, "");
    }
    code = specialKey[code] || code;
```

So `ƒ` on `KeyF` with Option down is `M-f` to the package as well, and the
composed character is never looked at. Every Option chord the tests dispatch
carries the character macOS really composes — `ƒ`, `∫`, `∂`, `∑`, `¥`, `≈`,
`ﬁ`, `¯`, `˘`, or `Dead` — precisely so that a reader which ever started
trusting `key` would fail them.

An editor that reads Option as Meta cannot also let Option type, so
`src/editor.ts` installs one handler that claims any Option keydown which
would produce a character or begin a composition, and cancels the
`compositionstart` and `beforeinput` events that follow if the engine starts
one anyway. It sits at the *lowest* precedence on purpose: CodeMirror's
dispatch stops at the first handler that claims an event and stops early on
an event whose default is already prevented, so a guard above the Emacs
plugin would take every Option chord away from the command it belongs to. At
the bottom it sees only what nothing else answered. Keys that produce no text
— `M-Up`, `M-Backspace` — are left alone, because the keymaps bind them.

So an unbound Option chord such as Option-i is *claimed* and not *handled*:
nothing acts on it, and no `ˆ` lands in the buffer. That is the trade the
platform offers, and it is the one an Emacs user on macOS already makes when
they set Option as Meta.

What decides it is whether cancelling the keydown is enough to stop the
composition, and only a real WebView can say. It matters more than one stray
character: CodeMirror ignores every key event while a composition is running,
so a composition that starts anyway takes the chord after it as well. That is
what row 1 of the checklist watches for.

## Why the keymap was inert in the running app

`M-f` did nothing in the built application while `C-f` moved by a character,
and the tests were green throughout. The Option key had nothing to do with
it. `@replit/codemirror-emacs` installs itself in two module-level calls, and
annotates both as pure:

```js
for (let i in emacsKeys) {
    /*@__PURE__*/EmacsHandler.bindKey(i, emacsKeys[i]);
}
/*@__PURE__*/EmacsHandler.addCommands({ … });
```

`/*@__PURE__*/` tells a bundler that dropping the call changes nothing. Both
calls write into module-level tables, so both promises are false, and every
bundler in the chain took them. The dev server's dependency pre-bundle
reduced the loop to `for (let i in emacsKeys) emacsKeys[i];` and dropped the
command table entirely; the release build did the same. What ran in the
window was an Emacs handler with no bindings and no commands.

That explains the whole shape of the report. Chords CodeMirror's own macOS
keymap binds as well — `C-f`, `C-b`, `C-a`, `C-e`, `C-k`, `C-d`, `C-n`,
`C-p` — went on working from the lower-precedence keymap, so the surface felt
alive. Every chord only the Emacs layer answers — `M-f`, `M-b`, `M-d`,
`M-w`, `C-/`, `C-Space` — reached a handler that knew nothing, and an Option
chord that matches nothing is then claimed by the guard above, which is why
`M-f` did not even type an `ƒ`. Editor's own chords kept working because
`src/emacs.ts` binds them itself, in a call no one annotated.

The fix is one setting, in `vite.config.ts`, applied to both halves of the
toolchain — `optimizeDeps.rolldownOptions.treeshake` for the pre-bundle and
`build.rollupOptions.treeshake` for the build: `annotations: false`. This
project does not honour pure annotations. It costs about 4% of the main
chunk and can only ever keep code that would otherwise have been removed.
`src/emacs.ts` also checks at run time that the package's commands are
present and writes to the console if they are not, because the failure is
otherwise indistinguishable from a keyboard problem.

**A test suite cannot see this.** Vitest loads a dependency as it lies on
disk, unbundled and untree-shaken, so every chord in this file passed while
none of them worked in the window. Two tests stand in for what cannot be
observed: one asserts the package's commands are registered once the module
is loaded, and one asserts the annotations are still there in
`node_modules`, so that a future release which fixes them fails loudly rather
than leaving a setting behind that no longer has a reason. Neither is a
substitute for the manual checklist below, which is the only place a chord is
pressed in the real build.

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
- **Option is Meta even when macOS says otherwise.** A separate group builds
  the events a Mac sends rather than the events the table describes — `ƒ` on
  `KeyF`, `Dead` on `KeyU` and `KeyE`, `ﬁ` on `Digit5`, `•` on `Digit8` — and
  asserts that the chord is the physical key's, that `M-u` upper-cases and
  `M-%` opens the replacement field, that an Option chord no command answers
  is claimed and types nothing, that the composition events which follow are
  cancelled, and that `M-Up` still reaches the keymap that binds it.
- **The key log reports what reached the page.** Chords dispatched at the
  editing surface are recorded through the same window listener the
  application installs, with the verdict read from `defaultPrevented` on a
  later task; a redo pressed as Shift-Control-slash is reported as a chord the
  table knows, and an Option chord claimed only to stop a composition is
  reported as claimed and not handled.

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
- **Nothing about whether Option reaches the page at all.** A named test does
  build the events macOS sends — `key: "ƒ"` on `KeyF`, `key: "Dead"` on
  `KeyU`, `key: "ﬁ"` on `Digit5` — and asserts the chord, the command, and an
  unchanged buffer. What it cannot say is whether WebKit reports the physical
  `code` on a dead key the way the test assumes, or whether cancelling the
  keydown really stops the accent composing. Those are row 1 of the checklist.
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
- **Nothing about the bundle.** Vitest loads dependencies unbundled, so no
  test here runs the code the window runs. That is how a keymap with no
  bindings shipped past a green suite; see "Why the keymap was inert in the
  running app" above.

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
| 1 | `M-f`, `M-b`, `M-d`, `M-w`, `M-y`, `M-u`, `M-l`, `M-v`, and the dead keys Option-e, Option-i, Option-n, Option-`` ` `` | The log shows `M-f` and the word command runs; the dead keys are claimed and type nothing | This is the Option-as-Meta question. A log line reading `ƒ` rather than `M-f` means WebKit is not reporting the physical `code`; a `´` or `ˆ` in the buffer means cancelling the keydown did not stop the composition |
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
| 16 | `C-x C-b`, then `C-x C-r` | The sidebar shows and hides; the document redraws from disk | Both are Editor's own chords on the `C-x` prefix; `C-x C-b` is Emacs's `list-buffers`, pointed at the chapter list |
| 17 | `C-x o` from the text, then `C-x o` again from the sidebar | The log shows both steps of each chord and claims both; the keyboard moves to the sidebar and back, and the modeline names the pane each time | Two readers, one prefix state: the first press is read by the editing surface, the second by the page's own reader, and a silent `o` after a live `C-x` is the reader failing rather than the platform. With the sidebar hidden the modeline says there is nowhere else to go, which is the chord working, not failing |
| 18 | `F2` from the text, then `F2` again from inside the sidebar, then once more with a panel open | The tree shows, hides with the keyboard handed back to the text, and shows again with the panel untouched; the log claims every press | A function key is the one chord both readers can hear. macOS may claim `F2` for the display brightness on a keyboard without the `fn` layer inverted: a silent log line is the platform holding it, not the page |

Record the result of each row against the binding table. A row that fails on
the desktop is a decision: claim the combination in the shell, rebind the
action, or accept the loss. A row that fails only on the iPad is a note
against the tablet path, not against the desktop editor.

## Driving the checklist from a script

A person working down the table cannot say afterwards which chord the page
saw, so three environment variables let a script do it instead. All are unset
on every ordinary launch, and the application does nothing with any of them
until one is set.

| Variable | Effect |
|---|---|
| `EDITOR_OPEN_FOLDER` | A document folder the window opens on start, along with its first chapter, so a run begins with text in the buffer and no dialog in the way |
| `EDITOR_KEY_LOG` | A file every key-log observation is appended to, one JSON object per line |
| `EDITOR_PRESENT_ON_OPEN` | Presses Present on that first chapter as soon as it is open, because a script cannot press `C-c C-p`. Write `1`, `true`, `yes` or `on` to turn it on and `0`, `false`, `no` or `off` to turn it off; any other word is refused with a warning. It needs `EDITOR_OPEN_FOLDER`, since there is otherwise no chapter to present |

`EDITOR_PRESENT_ON_OPEN` is what makes `EDITOR_PRESENT_LOG` (see
`src-tauri/src/present.rs`) usable from a script at all: without it a run that
asks for a present log gets an empty file, and an empty file cannot tell an
engine that fails to start from a window that was never opened.

The shell reads all three once at start (`src-tauri/src/devharness.rs`) and the
page asks it what they said (`src/devharness.ts`). The log path is the one
that needs guarding, because the web view is a trust boundary and a script
running in it can call any command: the path is resolved from the environment
the process was started with, never from the page, and it is refused unless it
lands inside the application's cache directory or the system's temporary
directory. The page is told only whether a log is being written, not where.

Each line carries the chord, the raw `key` and `code`, whether the table knows
it, whether the page claimed it, whether a command handled it, the open
chapter, the buffer's first line, and `strays` — which of the characters
Option composes on a US layout the buffer now holds. A chapter may already
carry one, so a stray is a character that appears while `chapter` stays the
same. The first line the page writes is `{"event":"ready"}`, once the folder
and its chapter are loaded, which is what a script polls for before it starts
pressing keys.

Real keystrokes come from macOS itself:

```sh
osascript -e 'tell application "System Events" to set frontmost of process "editor" to true' \
          -e 'tell application "System Events" to keystroke "f" using option down'
```

Chords whose character depends on the layout are sent by physical key
instead — `key code 23 using {option down, shift down}` is `M-%` — and 300 ms
between chords is enough for the page to record each one. `C-x C-s` is never
sent: the run reads the buffer, and nothing is written to the copied folder.

Sending keys this way needs Accessibility permission for whichever
application runs `osascript`. Without it System Events answers `osascript is
not allowed to send keystrokes. (1002)` and the run stops there; granting it
is a decision for the person at the machine, in System Settings › Privacy &
Security › Accessibility.
