# Where the binding table diverges from Emacs's own defaults

Written 2026-09-08, at the maintainer's request after the vocabulary
settlement recorded in `iss-2609081929528202`: Editor follows GNU Emacs's own
default global bindings wherever Emacs has one, rather than the proposed
`C-x`/`C-c` redesign captured in draft `itd-2609081929528479`. This note is
the evidence for that settlement — precisely where the shipped table already
agrees with vanilla Emacs, where it does not, and what closing each gap would
cost.

Read against three sources, in the order the brief for this note set: the
vendored package's own key table, `node_modules/@replit/codemirror-emacs/dist/index.js`
(`emacsKeys`, lines 577–647, and the prefix machinery in `findCommand`/
`handleKeyboard`, lines 387–470); Editor's own table, `src/keys.ts` (140
rows); and `src/emacs.ts` (`APP_COMMAND_IDS`, `REBOUND`, `SUPPRESSED`, and the
registration order). "Emacs's default" means the current stable GNU Emacs
global map (the line current enough that which-key, cited below, ships
bundled in it — Emacs 30), not any major mode. Markdown mode and Org mode are
a different corpus, already surveyed in
`2026-09-05-emacs-vocabulary-gap.md`; several of that note's "conflicts" are
Markdown-mode conventions, not vanilla-Emacs ones, and are not repeated here
as divergences — see the note on `C-c C-p`/`C-c C-l` below the table.

Every claim below that rests on memory of the Emacs manual rather than a file
this repository vendors is marked with a confidence word inline; the ones
genuinely unsettled are collected in **Unverified**, below, for a human to
settle.

## Already aligned, worth naming so the table below is not mistaken for the whole picture

The 2026-09-05 note's "tier one" — `M-q`, `M-t`, `C-x C-t`, `M-c`, `M-a`,
`M-e`, `M-{`, `M-}`, `M-^`, `M-SPC`, `M-\`, `M-z`, `M-/`, `M-x`, `C-h k`,
`M-r`, `C-x C-c` — is fully shipped now; every row that tier asked for is in
`BINDINGS` today. So are several chords the package itself got wrong and
Editor corrected in the direction of the real default rather than away from
it:

- `C-v`/`M-v` (`scroll-up`/`scroll-down`): the package moves point by a
  screen's height unconditionally; real Emacs's `scroll-up-command`/
  `scroll-down-command` scroll the *window*, leaving point alone when it is
  still on screen. `src/emacs.ts`'s `scrollByPage` (`iss-2609061510051784`)
  restores the real behaviour rather than the package's approximation of it.
- `M-s`: the package binds it to `centerSelection`, its own invention over a
  chord that real Emacs spends on the search prefix (`M-s o` is `occur`,
  `M-s .` is `isearch-forward-symbol-at-point`, and so on). Editor suppresses
  `centerSelection` and rebuilds `M-s` as a genuine prefix carrying
  `outline-occur` on `M-s o` (`itd-2609061318091323`) — which is, by
  coincidence of two separate decisions, exactly what vanilla Emacs already
  does with that chord. Not a divergence; the package was the divergence, and
  Editor's own fix removed it.
- `M-x` similarly: the package's own `M-x` opens a dead command-line stub
  (`focusCommandLine`) nothing implements; Editor's `command-palette` row
  overwrites it with a real implementation, landing on `execute-extended-command`'s
  real meaning rather than departing from it.
- `C-x b` / `C-x C-b`: real Emacs's pair is `switch-to-buffer` (jump by name,
  with completion) and `list-buffers` (open a browsable list). Editor's
  `outline-switch-chapter` on `C-x b` and (until the change discussed below)
  `toggle-sidebar` on `C-x C-b` mirror that pair closely: a chapter is
  Editor's buffer, and the sidebar is its browsable list.
- `C-x o` = `other-window`, `C-x h` = `mark-whole-buffer` (`select-all`),
  `C-x C-s` = `save-buffer`, `C-h b` = `describe-bindings`, `C-h k` =
  `describe-key` — all exact matches, confidence high in every case.

## The divergence table

One row per chord where Editor's answer and Emacs's default part company,
confidence high unless noted.

| Chord | Emacs's default | Editor's answer | Kind | Cost to align |
|---|---|---|---|---|
| `C-z` | `suspend-frame` (minimise, meaningless without a controlling terminal) | `undo` | taken | None recommended — a GUI editor with no terminal to suspend to correctly prefers the convention every other Mac app uses this chord for. |
| `C--` (Control-minus) | `negative-argument` | `redo` | taken | None recommended — vanilla Emacs has no single clean default "redo" binding to align *to*; `negative-argument` is rarely reached for without a `C-u` already in progress. |
| `C-x C-p` | `mark-page` | `select-all` (an alternative chord; `C-x h` and `s-a` already answer it) | taken | Low, but pointless — freeing it gains nothing since `mark-page`'s notion of a page (form-feed-delimited) has no analogue in the chapter model, and `select-all` loses nothing by giving it up. |
| `C-x C-l` | `downcase-region` | `upcase-region` — **a package bug, not a deliberate choice**: `emacsKeys` binds both `C-x C-u` and `C-x C-l` to `{ command: "changeCase", args: { dir: 1, region: true } }`, the identical upcase call, and `src/keys.ts`'s `upcase-region` row (chords `["C-x C-u", "C-x C-l"]`) inherits the same conflation. Editor currently has no way to lower-case a whole region at all — only `M-l` for a single word. | taken (+ underlying defect) | Medium: a genuine `downcase-region` command, wired the way `upcase-region` already is, with `C-x C-l` moved onto it. Worth a ledger entry of its own regardless of whether the maintainer wants the chord realigned, since a region upcase where a downcase was asked for is a correctness bug independent of the Emacs-defaults question. |
| `C-M-s` (`M-C-s`) | `isearch-forward-regexp` | `find-next` (a plain, non-incremental "next match") | taken | Medium — needs a real incremental, regex-aware search, not just a regex toggle on the existing panel; `@codemirror/search`'s panel already carries a regexp option, so opening it with that option forced on (the way `queryReplaceRegex` already forces `regexp: true` for `C-M-%`) is the cheap partial version, not the full isearch experience. |
| `C-M-r` (`M-C-r`) | `isearch-backward-regexp` | `find-previous` | taken | Same as above, mirrored. |
| `F3` | `kmacro-start-macro-or-insert-counter` (medium confidence: well-attested but not read from Emacs's own source) | `find-next` (an alternative chord; `M-C-s`/`s-g` already answer it) | taken | Low value to reclaim on its own — Editor has no keyboard-macro feature at all, so freeing `F3` buys nothing until macros are built (see **absent**, below); `S-F3`, which Editor also uses for `find-previous`, is not a real Emacs default at all (Emacs's pairing is `F3`/`F4`, not `F3`/`Shift-F3`), so it carries no cost either way. |
| `M-g` | a prefix (`goto-map`): `M-g g` and `M-g M-g` are `goto-line`, `M-g n`/`M-g p` are `next-error`/`previous-error`, and more. Bare `M-g` alone has not been `goto-line` directly since `goto-map` was introduced (Emacs 22); the package's stub binds the old, pre-22 shape. | `goto-line` directly on bare `M-g` | moved (a legacy-Emacs shape, not the current default) | Medium — turning `M-g` into a two-step prefix moves `goto-line` onto `M-g g`/`M-g M-g` and frees bare `M-g`. Low payoff on its own: Editor has no `next-error`/compile-error stepping to hang off the rest of the map, so the prefix would carry exactly one binding, which is a worse user experience than the direct chord it replaces. |
| `C-x C-n` | `set-goal-column` — a real Emacs command, but the package this editing surface is built on implements none of `emacsKeys`' notion of goal columns at all, so nothing is actually lost by repurposing the chord (already recorded, `itd-2609051402191319`) | `new-document-open` | taken (already documented) | None — there is nothing running underneath to conflict with; realigning would mean *inventing* `set-goal-column` from nothing to vacate a chord for a feature nobody has asked for. |
| `C-x r` | a prefix carrying the rectangle commands (`C-x r k` kill, `C-x r y` yank, `C-x r t` fill with a string) and the register commands (`C-x r s` copy to register, `C-x r i` insert from register, `C-x r j` jump to register) | one leaf command, `select-rectangle` (`selectRectangularRegion` in the package) | moved / narrowed (a whole family collapsed to one leaf, which also blocks the rest of the family from ever landing on this chord) | High — already Tier three in the 2026-09-05 note; a second-level prefix plus five-plus new commands. |
| `M-;` | `comment-dwim` (toggle a comment) | suppressed — deliberately unanswered, with the reason recorded in `SUPPRESSED` itself | absent (deliberate) | None — Markdown has no line-comment syntax to toggle; already a recorded, considered decision, not a gap. |

## Absent: real defaults Editor does not answer, beyond the four asked about

Each of these is a genuine current-Emacs default with no row anywhere in
`BINDINGS`. None collide with anything Editor already does — they are free
chords, not conflicts — so "cost" here means the size of the feature behind
the chord, not the size of a rename.

- `C-x C-w` (`write-file`, save-as). Low cost: a save dialog Editor's shell
  likely already has a form of, just not wired to this chord. Tier three,
  2026-09-05 note.
- The rest of the `C-x r` family named above (rectangles and registers).
  High cost, bundled with the `C-x r` row above.
- `F4` (`kmacro-end-or-call-macro`), `C-x (` / `C-x )` (`kmacro-start-macro`/
  `kmacro-end-macro`), `C-x e` (`kmacro-end-and-call-macro`) — keyboard
  macros as a feature. High cost: a whole recording/playback subsystem, Tier
  three in the earlier note.
- `C-x 2`, `C-x 3`, `C-x 0`, `C-x 1` (window splitting) and `C-x o`'s
  extended meaning once there is more than one editing window to cycle
  through. Very high cost — its own section, below, since the maintainer has
  filed it as a draft (`itd-2609081931493520`).
- `F1` (`help-command`, an alias for `C-h`) — covered under the four
  additions, next.

## `C-c C-p`, `C-c C-l`, and the rest of the outline vocabulary: not divergences

The 2026-09-05 note flagged `C-c C-p` (Present) and `C-c C-l` (publish) as
"conflicts" with Markdown mode's own previous-heading and insert-link
bindings. Read against *vanilla* Emacs rather than Markdown mode, there is no
conflict at all: `C-c` followed by a plain letter or `C-c` followed by
`C-`-letter is reserved, by Emacs's own key-binding convention, for
mode-specific use and is never bound by the global map. Every `C-c`-prefixed
row in the table — `present`, `preview`, `publish-open`, `open-settings`,
`export-open`, `insert-palette`, and the whole outline vocabulary
(`outline-next-heading` through `outline-widen`, `outline-bold-region`,
`outline-italic-region`, and the rest) — is Editor's own vocabulary occupying
space vanilla Emacs deliberately leaves free for exactly this. None of it is
catalogued in the table above; it belongs in the next section instead.

## Invented: Editor's own moments on chords Emacs leaves free

Not divergences, but the maintainer asked to see what occupies the free
space, since it is the space a redesign would have spent differently:

- The whole `C-c`-prefixed vocabulary named just above — document actions
  (present, preview, publish, settings, export, insert) and the outline
  vocabulary (heading movement, fold, promote/demote, move, bold/italic,
  link/image, occur's `M-s o` handle).
- `C-x C-o` (open a file or a folder), `C-x C-r` (reload), `C-x C-k`
  (close the chapter), `C-x n n`/`C-x n w` (narrow/widen to a section),
  `C-x C-=`/`C-x C--`/`C-x C-0` (text scale) — all under the `C-x` prefix, on
  chords vanilla Emacs's own `Control-x-map` does not populate.
- The largest single block: every `s-` (Command) chord — `s-i`, `s-d`,
  `s-S-l`, `M-s-Up`/`Down`, `s-u`/`s-S-u`, `s-[`/`s-]`, `s-Backspace`/
  `s-Delete`, and the rest of the CodeMirror-native selection and editing
  conveniences. Super carries no meaning in vanilla Emacs's global map at
  all, so none of this is occupied space in Emacs's sense — it is space
  Emacs never had an opinion about.

## The four additions, and how the maintainer has settled them

The original ask, `iss-2609081929528202`, named four things: `h` hiding the
sidebar (shipped), `C-c C-s` and `F2` showing it with `F2` hiding it again,
`F1` doing what `C-x C-h` does, and the `C-x C-h` overlay itself. Two rounds
of settlement since have changed the shape of the second and third; this
section records where each one landed, not where it started.

### `h` — unchanged

Map #36 (`itd-2609071216221686`) ships this already: a bare, unmodified `h`
hides the sidebar and hands the keyboard back to the editing surface,
reachable only while the sidebar holds the keyboard. It stays exactly as
shipped. Vanilla Emacs has no default binding for a bare letter in its global
map — a letter self-inserts — so there is nothing to compare this to
directly; the closer analogy is Emacs's own convention in read-only,
"special mode" buffers (Dired, `*Help*`, `Info`), where bare letters *are*
commands because there is no text to type into. Editor's sidebar follows
that convention, not a specific default. No divergence, and nothing in this
note changes it.

### `C-c C-s` and `F2` → settled as `F2` alone; the `C-c C-s` question is moot

The original ask paired `C-c C-s` (show) with `F2` (toggle). This collides
head-on with something already shipped: `C-c C-s b` (bold) and `C-c C-s i`
(italic) are rows of the outline vocabulary (`itd-2609061318091323`), so
`C-c C-s` is already a two-step prefix. A prefix and a leaf command cannot
share one chord — the package's own `findCommand` marks the first step
`"null"` (its placeholder for "a prefix is in progress, wait for the next
key") the instant any multi-step binding under it is registered, so `C-c
C-s` alone can never resolve to a command while `C-c C-s b`/`i` exist
(`node_modules/@replit/codemirror-emacs/dist/index.js`, `bindKey`, lines
302–318, and `findCommand`, lines 429–437).

Whether a prefix could be made to *time out* into a leaf command — so that
`C-c C-s`, held with nothing typed after it, eventually fires a "show
sidebar" command of its own — was the open question. Reading the package's
key-reading code end to end (`handleKeyboard`, `findCommand`, lines 387–470)
answers it: there is no timer anywhere in this machinery, no `setTimeout`,
no delayed resolution of any kind. A key chain resolves the instant a key
completes it, is *reset* (not resolved) the instant an unmatched key
follows it — `data.keyChain = command == "null" ? key : ""`, so a miss
drops the whole chain silently rather than falling back to the prefix's own
meaning — and is otherwise only cancelled explicitly, by `C-g`
(`keyboardQuit`). So a timing fallback is not a small addition on top of the
package's own prefix state; it would be a second, independent mechanism
Editor would have to build and maintain itself, watching
`emacsStatus(view).prefix` with a real wall-clock timer, cancelled by the
next keypress or by the chain resolving another way — new machinery with no
precedent anywhere else in the app.

Given that, the settlement is: **bold and italic keep `C-c C-s` exactly as
shipped, and the sidebar takes no `C-c` chord at all.** The sidebar is shown
by `F2` alone, which also hides it — a genuine toggle, reachable wherever
the keyboard is (unlike today's `C-x C-b`, which the `toggle-sidebar` row's
`owner: editor` confines to the editing surface's own CodeMirror extension;
`src/focus.ts`'s sidebar-scope reader, the second reader the module's own
doc comment describes, does not currently forward it). This is the cheapest
option that gives the maintainer a working show-from-anywhere route, and it
costs nothing already built: `F2` is unclaimed in `BINDINGS` and unclaimed
by the package (`emacsKeys` has no `f2` entry), and bold/italic stay
untouched.

For the record, what each alternative would have cost:

- **Move bold and italic off `C-c C-s`.** Touches `src/keys.ts` (two rows),
  the comments in `src/outline-commands.ts` that cite the chord by name,
  `src/outline-commands.test.ts`'s table of chord/id pairs, and any doc page
  that prints `C-c C-s b`/`i` — plus, before doing it at all, a check of
  whether `itd-2609061318091323`'s own Acceptance Criteria name the chord
  literally, which would mean amending a shipped intent to free it.
- **Give the sidebar a different chord** (something other than `C-c C-s`)
  for "show," keeping the original ask's *shape* if not its literal chord.
  Cheap in isolation, but does not actually answer what was asked — `F2`
  already does the job better, reachable from both panes, so this option
  adds a second, redundant route for no gain.
- **A timeout-based prefix-to-leaf fallback.** As above: not a chord choice
  at all but new, independent timing machinery layered outside the
  package's own key-chain state, maintaining its own risk (a second
  keypress landing in the same tick as the timer, or the timer outliving a
  chain the package has already reset).

All three cost more than they buy once `F2` exists and reaches both panes.
The maintainer's own reasoning — keep the editing chords, since bold and
italic are shipped, tested and documented, over a second show-route that a
toggle already makes redundant — is the cheapest read of the evidence above,
not merely the first one considered.

### `F1` doing what `C-x C-h` does

Vanilla Emacs's own default for `F1` is an alias of `C-h` itself —
`help-command` — bound in the global map alongside the `C-h` chord (high
confidence; this is one of the best-known function-key defaults in Emacs).
So "`F1` does what `C-x C-h` does" is, read literally against vanilla
Emacs, almost exactly right: `F1` is Emacs's own second name for the help
prefix, of which "show me the bindings under a prefix I'm about to type"
(`describe-prefix-bindings`, see the next section) is one function reached
through it, alongside `C-h b` (`describe-bindings`), `C-h k`
(`describe-key`), and the rest.

`F1` is free today: no row in `BINDINGS`, no package binding, no
suppression. The smallest honest way to answer the ask is to give `F1` a
second chord on the row Editor already has for `C-h b` — `keys-panel`'s
chords become `["C-h b", "C-x S-/", "F1"]` — since the keys panel is
Editor's own `describe-bindings`, and that is the single most useful thing
`help-command` reaches. A deeper reading — `F1` becoming a genuine alias of
the bare `C-h` prefix itself, so `F1 b` and `F1 k` also work — is a larger
change (a second prefix mirroring `C-h`'s own two rows) for marginal gain
over the one-chord version, and this note recommends the cheaper reading
unless the maintainer specifically wants the fuller alias.

### The `C-x C-h` overlay itself

Covered in its own section, below — this is the one item of the four that
is a genuine build, not a chord choice.

## `C-x o` and a sidebar that is not a pane: a shipped criterion needs amending

Settling `F2` as the toggle changes what `C-x o` is for. The maintainer's
rule: `C-x o` moves the keyboard among panes that are shown, and never
changes what is shown. A hidden sidebar is therefore not a pane — the cycle
skips it, exactly as it already skips a panel that is not open — and when
there is nowhere else for the keyboard to go, the chord says so in the
modeline rather than doing nothing silently.

This strikes map #36's third acceptance criterion directly. As shipped,
`itd-2609071216221686` states:

> Given the sidebar hidden and the cursor in the editing text, when Alice
> presses `C-x o`, then the sidebar shows and focus moves into it, with the
> cursor placed the same way `C-x o` already places it on a sidebar that was
> already shown.

That is no longer the rule: showing a hidden sidebar is `F2`'s job now, not
`C-x o`'s. Following the pattern `iss-2609052143457583` already set for
amending a shipped criterion the design has moved past — record the
amendment rather than pretend the original text still holds — the criterion
wants replacing with something to this shape:

> Given the sidebar hidden and the cursor in the editing text, when Alice
> presses `C-x o`, then focus stays in the editing surface — a hidden
> sidebar is not a pane the cycle visits — and the modeline announces that
> there is nowhere else to go, rather than the chord doing nothing with no
> report.

The Mechanism section's own claim ("`C-x o` to already reach a hidden
sidebar and show it, because `takeFocus`… opens the drawer first when it
finds it closed") needs the matching amendment: that behaviour is retired,
not extended, by this change.

This same rule settles the open bug `iss-2609081707572166` — the maintainer
found `C-x o` (and `C-x C-o`, `C-c C-o`) dead before a document was loaded,
with no report at all. Under the amended rule, "nowhere else to go" is not
a special case to detect and handle separately; it is the general case
`C-x o` must already speak for once a hidden sidebar stops being a target —
the fix for both is the same one sentence in the modeline.

**Left open, on the maintainer's own instruction, rather than answered
here:** whether `C-x o` should keep any trace of opening a hidden sidebar on
its way in, now that `F2` exists as a dedicated route to the same place.
That is being put to the maintainer directly and does not belong in this
note's recommendation.

## `C-x C-b`, freed: should it become the chapter list?

Once `F2` carries the toggle, `toggle-sidebar`'s hold on `C-x C-b` is no
longer load-bearing, and the chord is free for Emacs's own default there:
`list-buffers`, a browsable list of what is open. **Yes, this is the right
thing to put there** — the sidebar already *is* Editor's chapter list, drawn
from the same document tree `outline-switch-chapter` (`C-x b`,
`switch-to-buffer`'s analogue) searches by name. Real Emacs's own `C-x b`/
`C-x C-b` pair — jump by name versus browse a list — is already the shape
Editor's `C-x b`/`C-x C-b` pair has; freeing `C-x C-b` from the toggle and
repointing it at "show the chapter list" keeps that shape rather than
breaking it.

The cheapest version: add `C-x C-b` as a second chord on whichever row `F2`
ends up naming, so pressing it shows the sidebar exactly as `F2` does — one
line, no new command. The one place this departs from the real default is
that Emacs's `list-buffers` always shows (repeating it just refreshes the
list; it never closes it), where a shared toggle command would close the
sidebar on a second press. Matching Emacs exactly would need a distinct
"show, never hide" variant of whatever command answers `F2` — a small but
real second command, not a chord alias — and this note's own reading is
that the difference is not worth the second command: nobody reaches for
`C-x C-b` twice in a row expecting a *close*, and if they do, closing is a
harmless surprise rather than a broken one.

The cost of doing this at all, named plainly since the brief asked for it:
freeing `C-x C-b` from `toggle-sidebar` breaks the fourth acceptance
criterion of shipped map #36 (`itd-2609071216221686`, "Given the sidebar
shown or hidden, when Alice presses `C-x C-b` from the editing surface,
then the sidebar toggles exactly as it did before this intent") and departs
from the chord's original delivery in map #1 (`itd-2609051335399446`, *Open
a folder and see the book*). It also invalidates the existing regression
test guarding that behaviour (`src/emacs-keys.test.ts`, "shows and hides the
sidebar on `C-x C-b`") and three doc pages that print the chord today —
`docs/how-to-find-and-change-the-keys.md`, `docs/how-to-move-through-the-outline.md`,
and `docs/spike-emacs-keys.md`. None of this is free; it is the same shape
of cost the `C-x o` amendment above already pays, and both should land
together rather than as two separate passes over the same shipped intent.

## Window splitting: `C-x 2`, `C-x 3`, `C-x 0`, `C-x 1`

Filed by the maintainer as draft `itd-2609081931493520`, still empty of a
Mechanism, Scope, or Acceptance Criteria. What is asked for is Emacs's own
kind of split — several editing windows inside *one* frame, the way `C-x 2`
(`split-window-below`) and `C-x 3` (`split-window-right`) work today in a
single Emacs session — not several operating-system windows; Editor already
has no multi-window Tauri story and nothing here proposes one. `C-x 1`
(`delete-other-windows`) and `C-x 0` (`delete-window`) are the other half of
the same family, and `C-x o` already exists to cycle focus — the ask is for
it to cycle among more than the two things it walks today.

### What one editing surface becoming several would take

Today there is exactly one CodeMirror `EditorView` per open window, and
exactly one chapter mapped into it at a time — switching chapters replaces
what that one view shows rather than opening a second view beside it (this
is why `chapterCursors`, the per-chapter cursor memory the 2026-09-07
decision log records, exists at all: there is one live view, and returning
to a chapter means restoring a remembered offset into that same view, not
switching to a second, still-live one). Splitting means:

1. **A window-tree, not a fixed slot.** `src/focus.ts`'s `PANE_ORDER` is
   documented as "Three panes in one fixed order" — editor, sidebar, panel.
   The editor slot alone would need to become a variable-length (in the
   fully general case, tree-shaped, since Emacs windows can be split again
   inside a split) list of editing-window leaves, while the sidebar and any
   open panel stay exactly where they are: docked outside the split grid,
   not part of it. `other-window`'s cycle order generalises from "walk
   these three" to "walk however many editing-window leaves currently exist,
   then the sidebar, then the panel" — the same shape `PANE_ORDER` already
   has, with its first slot made plural.
2. **N `EditorView` instances, not one.** The package's own `EmacsHandler`
   already supports this per view (`handlerByView` is a `WeakMap<EditorView,
   EmacsHandler>`), so the keymap layer scales without change. What does not
   scale today is `src/emacs.ts`'s `commands: EditorCommands | null` — a
   single module-level registry the file's own doc comment calls out
   explicitly: "One window, one application; a second one would replace the
   first." That sentence is about one *Tauri* window, not one split, but the
   commands it registers (`save-chapter`, `reload-document`, and the rest of
   `APP_COMMAND_IDS`) all currently resolve against one implicit "the
   current chapter." With several editing windows possibly showing several
   different chapters at once, every such command needs to resolve against
   *the chapter in the focused window*, not a single global — a real change
   to how the mounted application answers a command, not just to how many
   views exist.
3. **Shared state where Emacs shares it.** Two windows split on the *same*
   chapter, in real Emacs, are two views of one live buffer: an edit in one
   appears in the other immediately, and each window keeps its own point
   (cursor position) into the shared text. CodeMirror supports this natively
   — multiple `EditorView`s can share one `EditorState` — but nothing in
   Editor's app layer wires it today, since there has only ever been one
   view to share state with. Getting this right (rather than quietly
   building two independent copies of the same chapter, which is cheaper but
   wrong relative to what a split means in Emacs) is where most of the real
   engineering weight of this feature sits.
4. **Layout.** A resizable grid — rows for `C-x 2`, columns for `C-x 3`,
   nested arbitrarily since a split can itself be split — sized
   independently per leaf, with `C-x 1` collapsing to one and `C-x 0`
   closing exactly one leaf and reflowing the rest.
5. **Per-window, not just per-chapter, cursor memory.** `chapterCursors`
   today is keyed by chapter, because there is one view. Two windows open on
   the same chapter need two independently remembered cursor positions —
   Emacs's own window-point versus buffer-point distinction — which is a
   genuinely different data shape than "one offset per chapter."

### Does the one-pane-holds-the-keyboard rule survive?

The exclusivity rule itself — exactly one pane holds the keyboard at any
moment, which is what lets `C-n` mean "next line" and "next node" without
either being ambiguous — survives unchanged and stays exactly as necessary
as it is today; nothing about splitting argues for two panes hearing a
chord at once. What does not survive as currently *stated* is the
assumption both `src/focus.ts` and `src/emacs.ts` build on: that the set of
things that can hold the keyboard is fixed and small (three panes; one
mounted application). Splitting turns "the editor" from one fixed member of
that set into an open, runtime-varying set of its own, which is a change to
a documented architectural invariant two modules currently state as given,
not an extension either module's existing shape already anticipates. That
is worth an architecture decision record of its own — written before
`itd-2609081931493520` is planned into a spec — rather than folded into the
spec as an implementation detail, given how much of the cost above (the
commands registry, the shared-state question, the cursor-memory shape) flows
directly from which way that decision goes.

## What a prefix-help overlay would take to build here

The fourth of the four additions, and the only one that is a genuine build
rather than a chord choice.

**What `describe-prefix-bindings` shows, in real Emacs.** Typing a prefix
key and then `C-h` (or, per the mechanism above, `F1`) opens a `*Help*`
buffer listing every binding that starts with the prefix just typed, one
line per chord, in something close to alphabetical order — a static,
on-demand snapshot, not a live filter. This is not a specific binding
attached to each prefix map individually; it is a general fallback Emacs's
own key-sequence reader applies to *any* prefix whose keymap does not bind
the help character itself, which is why it works for `C-x C-h`, `C-c C-h`,
and every other prefix without each one carrying its own copy (medium-high
confidence in the mechanism generally; the exact internal name,
`prefix-help-command`, is recalled rather than read from a vendored source
here).

**What which-key adds**, bundled with Emacs 30 per the brief for this note:
a popup that appears *automatically*, after a short idle delay while a
prefix is in progress, showing the same "what comes next" list live,
updating as further keys narrow it — the difference between a snapshot you
ask for and a hint that appears whether you ask or not.

**What Editor already has to build either version on:**

- `src/overlay.ts` — the overlay host `C-h k`'s own prompt already uses (its
  own comment notes the overlay's job of reading a chord as one sequence
  rather than letting the next keystroke leak past it). The natural host
  for a prefix-help panel.
- `src/keyspanel.ts` — already renders the whole `BINDINGS` table grouped
  for the keys panel; a prefix-help view needs the same rendering, filtered
  to rows whose chord's first step matches the live prefix rather than the
  whole table.
- `emacsStatus(view)` in `src/emacs.ts` already exposes exactly the state a
  filter would key on — `handler.$data.keyChain`, the in-progress prefix —
  and it is already read live, every keystroke, for the modeline's prefix
  cell, so its liveness is already proven in production rather than
  speculative.
- The binding table itself — `chordIndex`/`chordIndexIn` in `src/keys.ts`
  already index every row by its full chord; filtering `BINDINGS` by "chord
  starts with the current prefix plus a space" is a small addition beside
  what is already there, not a new indexing scheme.

**The open question**, left exactly as open as the brief for this note
frames it: on-demand (press `F1` or `C-h` explicitly, mid-prefix, and the
overlay opens once) or on a timer (which-key's own idle-delay behaviour).
The on-demand route is materially cheaper — it reuses the exact pattern
`C-h k`'s own prompt already proves, an overlay opened by an explicit next
keypress, no new subsystem — where the timer route needs genuinely new
machinery: a debounced idle callback keyed off changes to `keyChain`,
cancelled by the next keypress or by the chain resolving another way, with
no precedent anywhere in the codebase today. This note does not recommend
between them; it is the one open question left for the maintainer to settle
before either is worth speccing.

## Recommendation on scope

140 rows, 21 shipped intents (several of which name a chord literally in an
Acceptance Criterion), docs pages that print those chords for a reader, and
545 manual acceptance rows behind them — realigning any chord already
shipped, tested and documented costs more than adding one that is free. Two
concrete cases above already show the shape of that cost precisely, because
they were checked against the actual shipped record rather than assumed:
freeing `C-x C-b` and narrowing `C-x o`'s reach both strike named criteria
of shipped map #36 (`itd-2609071216221686`), the first also touching map #1
(`itd-2609051335399446`)'s original delivery. Every other row in the
divergence table above is checked only against the package source and this
repository's own comments, not against a full sweep of all 21 shipped
intents' Acceptance Criteria text for the literal chord string — that sweep
is cheap (a grep per candidate chord against `.abcd/development/intents/shipped/`)
and is worth doing before acting on any row below, not just the two this
note happened to check in full.

Ranked:

**Do now, additive, checked against nothing shipped:**
`F1` on the keys-panel row; `F2` as the sidebar toggle; the on-demand form of
the prefix-help overlay. None collide with a chord any row, suppression, or
shipped intent currently claims.

**Worth doing, real but bounded cost, no shipped-intent breakage found:**
`C-x C-b` → the chapter list (breaks map #36's ac-4 and touches map #1 —
named above, but the break is small and the fix is a one-line chord
addition); the amended `C-x o` criterion for map #36's ac-3 (the same
intent, the same pass, for the reason given above); a real
`downcase-region` on `C-x C-l` (fixes a defect independent of the
Emacs-defaults question, no shipped criterion currently names the buggy
behaviour as intended); `C-x C-w` save-as, if the shell's existing save
dialog can be reached from a chord cheaply.

**Worth it eventually, no shipped-intent breakage found, larger builds:**
`C-M-s`/`C-M-r` as genuine regex incremental search.

**Expensive, low payoff on its own, not recommended without a specific
ask:** `M-g` as a real two-step prefix (frees one chord for a family
Editor has nothing else to put in it); the `C-x r` rectangle/register
family; keyboard macros (`F3`/`F4`/`C-x (`/`C-x )`/`C-x e`).

**Its own project, an ADR before a spec:** window splitting
(`itd-2609081931493520`), for the architectural reasons given above.

**Not recommended, ever, without a specific ask:** `C-z` as
`suspend-frame`, `C--` as `negative-argument`, `C-x C-p` as `mark-page` — in
each case Editor's own convention already serves the app's users better
than the vanilla default would.

## The full chord sweep, run

The sweep the **Recommendation on scope** section above called for and left
unrun: a literal `grep -rF` of every chord named in the divergence table and
in **Absent**, against all 21 shipped intents
(`.abcd/development/intents/shipped/`), all 21 closed specs
(`.abcd/development/specs/closed/`), and `docs/`. Twenty-seven candidate
chords were swept (`C-M-s`/`M-C-s` and `C-M-r`/`M-C-r` counted as one pair
each, matching the table's own rows), plus `C-x C-b` and `C-x o` themselves,
re-run for cross-check against the note's own two already-checked cases.
For every intent hit, the match was placed against that file's own `##`
headings to say which section it falls in — an Acceptance Criterion is a
shipped promise; a Press Release, Mechanism, Scope Condition, Open Question,
Audit Note, or Grounds citation is context, cheaper to disturb.

| Chord | Named in a shipped AC? | Elsewhere in a shipped intent | specs/closed | docs |
|---|---|---|---|---|
| `C-z` | No | No | Yes — `spc-2609051353381023`, listed once as a then-unclaimed chord the spec went on to settle | No |
| `C--` | **Yes** — `itd-2609061141039863`, AC 6 (quoted below) | Press Release, Mechanism, Open Questions of the same intent | Yes — `spc-2609061145242761` (mechanism + test citation), `spc-2609051353381023` (historical) | Yes — `how-to-find-and-change-the-keys.md:121` |
| `C-x C-p` | No | No | Yes — `spc-2609051353381023`, historical | No |
| `C-x C-l` | No | No | Yes — `spc-2609051353381023`, historical | No |
| `C-x C-u` | No | No | Yes — `spc-2609051353381023`, historical | No |
| `C-M-s`/`M-C-s` | No | Audit Notes of `itd-2609051335406422`, quoting a manual-checklist log line | No | Yes — `spike-emacs-keys.md` (package description; checklist row 10) |
| `C-M-r`/`M-C-r` | No | No | No | Yes — `spike-emacs-keys.md` (package description only) |
| `F3` | No | No | No | No |
| `S-F3` | No | No | No | No |
| `M-g` | No | No | No | Yes — `spike-emacs-keys.md` (describing the vendored package, not an Editor promise) |
| `C-x C-n` | No | Mechanism of `itd-2609061509393380` | Yes — `spc-2609061318158586` (three hits, including manual row M29-1) | Yes — `how-to-start-a-new-document.md`, `tutorial-your-first-talk.md` |
| `C-x r` | No | No | Yes — `spc-2609051353381023`, historical | No |
| `M-;` | No | No | Yes — `spc-2609051353381023` (records the deliberate suppression) | Yes — `spike-emacs-keys.md`, `how-to-find-and-change-the-keys.md` (both describing the same suppression) |
| `C-x C-w` | No | No | No | No |
| `F4` | No | No | No | No |
| `C-x (` | No | No | No | No |
| `C-x )` | No | No | No | No |
| `C-x e` | No | No | No | No |
| `C-x 2` | No | No | No | No |
| `C-x 3` | No | No | No | No |
| `C-x 0` | No | No | No | No |
| `C-x 1` | No | No | No | No |
| `F1` | No | No | No | No |
| `F2` | No | No | No | No |
| `C-h` | No | No | Yes — `spc-2609051353381023`, `spc-2609061318158216` (mechanism/table text) | Yes — `spike-emacs-keys.md` (twice), `how-to-find-and-change-the-keys.md` |
| `C-x C-b` (re-checked) | Yes — `itd-2609071216221686` ac-4 (already known, unchanged by this sweep) | Scope Conditions of the same intent, and Scope Conditions of `itd-2609061318091323` (new) | Yes — `spc-2609081444287807` ("`C-x C-b` untouched") | Yes — `spike-emacs-keys.md`, `how-to-move-through-the-outline.md` (two pages, not three — see note below) |
| `C-x o` (re-checked) | **Yes, in three intents** — `itd-2609071216221686` ac-3 (already known); `itd-2609051921482691` (five AC bullets, new); `itd-2609061509393380` (one AC bullet, new) | Press Release, Why This Matters, Mechanism, Scope Conditions and Audit Notes of all three | Yes — three spec files | Yes — `spike-emacs-keys.md`, `how-to-find-and-change-the-keys.md` (twice) |

**The one new fact that bears directly on a "not recommended" row.** `C--` as
`redo` is not only Editor's own preferred convention — it is named in a
shipped Acceptance Criterion. `itd-2609061141039863`'s sixth criterion reads:

> Given Alice has undone an edit and the surface is at the default scale,
> when she presses `C--` on its own, then the edit is redone and the
> surface's font size does not change; and when she presses `C-=` on its
> own, then the surface's font size does not change either.

This does not change the note's own verdict — `C--` was already filed under
"Not recommended, ever, without a specific ask" — but it changes *why* that
verdict holds: the divergence table's own "Cost to align" cell for this row
gives only a preference argument ("vanilla Emacs has no single clean default
redo binding to align to"); the sweep now shows realigning `C--` to
`negative-argument` would also break a named, shipped criterion, not merely
cut against the grain of what Editor's users expect. High confidence, read
directly off the intent file.

**The chord that widens, without breaking, the note's own accounting.** The
note's Recommendation section states that only map #36 (`itd-2609071216221686`)
carries a named Acceptance Criterion for `C-x o`. The sweep finds two more:
`itd-2609051921482691` (map #30, the intent that first shipped the pane
cycle) carries five AC bullets naming `C-x o` directly, and
`itd-2609061509393380` (map #33, `C-x C-o`) carries one more. Read closely,
neither of the two newly found intents' criteria tests the case the
maintainer's amended rule actually changes — a *hidden* sidebar — so neither
appears to be literally contradicted the way map #36's ac-3 is; they describe
`C-x o` cycling among panes that are already shown, which the amended rule
leaves untouched. Medium-high confidence on that reading (each bullet was
read in full above, not just matched). What this does change: landing the
`C-x o` amendment is a pass over the Acceptance Criteria text of **three**
shipped intents, not one, if the aim is a record that stays honest everywhere
the chord is named as a shipped promise — even though only one of the three
needs its criterion's *behaviour* rewritten. This nudges the true cost of
that row up slightly from what "Worth doing, real but bounded cost" implied,
without moving it out of that bucket: the extra work is citation upkeep
across two more files, not new behaviour to build or test.

**Everything else the sweep touched is confirmation, not news.** No shipped
intent's Acceptance Criteria name `C-z`, `C-x C-p`, `C-x C-l`, `C-x C-u`,
`C-M-s`/`M-C-r`, `F3`, `S-F3`, `M-g`, `C-x r`, `M-;`, `C-x C-w`, `F4`, `C-x (`,
`C-x )`, `C-x e`, `C-x 2`, `C-x 3`, `C-x 0`, `C-x 1`, `F1`, `F2`, or `C-h`
anywhere. This matches the note's existing rankings row for row: the "Not
recommended" bucket's `C-z`/`C-x C-p` keep their preference-only reasoning
(no shipped-criterion cost adds to it, unlike `C--`); the "Expensive, low
payoff" and "Its own project" buckets (`M-g`, the `C-x r` family, the
keyboard-macro chords, window splitting) are confirmed free of shipped-intent
breakage, so their cost stays exactly the size of the feature behind them,
as the note already said; and `F1`/`F2` are confirmed genuinely unclaimed
anywhere in the shipped record, supporting the "Do now, additive" bucket's
claim that neither collides with anything shipped. `C-x C-n` and `C-h` are
each named once outside an Acceptance Criterion (Mechanism prose in one
case, table/mechanism text in the other) — cheap context, not a promise,
matching how the note already treated them.

**One small correction to a claim made in passing, not to a recommendation.**
The `C-x C-b, freed` section above names three doc pages printing the chord
today: `docs/how-to-find-and-change-the-keys.md`,
`docs/how-to-move-through-the-outline.md`, and `docs/spike-emacs-keys.md`.
The literal sweep finds `C-x C-b` in only the second and third; the first
page discusses reaching the sidebar with `C-x o`, not the literal string
`C-x C-b`. Low confidence that this was more than a slip in an otherwise
correct sentence — it does not change the cost estimate, since two pages
needing an edit instead of three is smaller, not larger, than what was
already priced in.

**specs/closed and docs, in general.** No chord swept turns up in a closed
spec or a doc page in a way that adds cost beyond what the note already
accounts for: the specs/closed hits are either historical records of a gap
later closed (`spc-2609051353381023`'s list of once-unclaimed chords) or
mechanism/checklist prose describing behaviour the note already treats as
settled; the doc hits either document a chord already in the "cost: none"
tier (`C-x C-n`) or describe the vendored package's own defaults rather than
an Editor promise (`M-g`, `C-M-r`/`M-C-s` in `spike-emacs-keys.md`'s research
prose).

## Unverified

Collected here rather than asserted above, for a human to settle:

- `F2`'s vanilla-Emacs default, `2C-command` (two-column-mode's own
  prefix), bound in `lisp/textmodes/two-column.el`. Recalled with
  reasonable confidence — it is a commonly cited "Emacs steals my F2"
  complaint — but not read from Emacs's own source, and this note leans on
  it only to say the chord is low-value to preserve, not to build anything
  against it.
- The exact mechanism name behind `describe-prefix-bindings`'s automatic
  triggering (`prefix-help-command`, and the `help-char` variable it keys
  off) — the general behaviour ("`C-h` after any prefix shows that
  prefix's bindings") is stated with medium-high confidence; the specific
  Lisp variable names are recalled, not verified against a vendored source.
- ~~Whether any of the taken/moved chords in the divergence table beyond
  `C-x C-b`/`C-x o` are named literally in a shipped intent's Acceptance
  Criteria — flagged above as an unrun sweep, not as a claim either way.~~
  Run: see **The full chord sweep, run**, above. One chord beyond the two
  already checked turned out to be named in a shipped criterion —
  `C--` as `redo`, in `itd-2609061141039863` — and `C-x o` itself turned out
  to be named in two more shipped intents' criteria than the note had
  checked, though neither of those two is contradicted by the maintainer's
  amended rule the way map #36's was. No other chord in the table or in
  **Absent** is named in any shipped intent's Acceptance Criteria.

## Questions only the maintainer can answer

- Whether `C-x o` should keep any trace of opening a hidden sidebar on its
  way in, now that `F2` reaches the same place directly — deliberately left
  open above, on instruction, rather than answered in this note.
- Whether `F1` should be the one-chord version recommended here (a second
  chord on the keys-panel row) or the fuller alias of the bare `C-h` prefix.
- Whether the prefix-help overlay should appear on a timer, which-key
  style, or only on demand.
- Whether `C-x C-l` becoming a real `downcase-region` is wanted as its own
  small fix regardless of the wider Emacs-defaults question, since the
  current behaviour (silently upcasing where a downcase would be expected)
  reads as a defect on its own terms.
- Whether the full sweep of all 21 shipped intents' Acceptance Criteria
  against every candidate chord in the divergence table (recommended above,
  not run here) should happen before any row beyond `C-x C-b`/`C-x o` is
  acted on.
