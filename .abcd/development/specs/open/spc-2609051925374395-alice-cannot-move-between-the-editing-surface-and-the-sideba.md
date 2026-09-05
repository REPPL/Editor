---
id: spc-2609051925374395
slug: alice-cannot-move-between-the-editing-surface-and-the-sideba
intent: itd-2609051921482691
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Move between the editor and the sidebar without the mouse

## Summary

This spec delivers map #30, `itd-2609051921482691`: one window-switching
vocabulary that reaches the sidebar and every panel from the keyboard, so the
part of the app that knows the shape of the whole book stops being the part
Alice can only point at. It adds a focus model in `src/focus.ts` — three panes
in one fixed cycle order, `C-x o` to cycle, the modeline naming the pane that
holds the keyboard — and gives `src/sidebar.ts` a keyboard cursor that answers
`C-n`, `C-p`, `C-f`, `C-b`, `Return` and `C-g` while, and only while, the tree
holds focus. Every chord is a row in the table `src/keys.ts` already carries,
which means the table gains a second scope: the same chord may be claimed by the
editor and by the sidebar, because focus is single and exclusive. Nothing about
the tree changes — no node, no badge, no ordering — and Return opens exactly
what a click opens.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/focus.ts` | absent | new: the pane cycle, the pane that holds the keyboard, and the one key reader for the panes the editing surface cannot hear |
| `src/keys.ts` | exists: 88 rows, `SUPPRESSED`, chord canonicalisation, `chordIndex` | adds one `editor` row (`other-window`) and six `sidebar` rows; adds the `sidebar` owner, the `panes` group, and `scopeOf`/`chordIndexIn` |
| `src/sidebar.ts` | exists: five-level tree, expansion set, selection, drawer at 820 px | adds the flat row list the tree already draws, a keyboard cursor over it, and `takeFocus`/`releaseFocus` |
| `src/emacs.ts` | exists: `APP_COMMAND_IDS`, prefix machinery | adds `other-window` to the list, so `C-x o` reaches the model from the text |
| `src/modeline.ts` | exists: chapter, position, prefix, mark | adds the pane cell, and lets the prefix cell be fed from outside the editing surface |
| `src/overlay.ts` | exists: the one cancel contract | adds `onOverlayChange`, an observer; the contract itself is unchanged |
| `src/app.ts` | exists: `registerCommand`, `registerPanel`, `onDropTarget` | builds the model, wires the sidebar hooks to it, and widens `registerPanel` with an optional focus contract |
| `src/publish-panel.ts`, `src/settings-panel.ts` | exist: `hidden`-toggled, own cancel handler | each passes its focus contract through `mountPublishPanel` / `mountSettingsPanel` |
| `src/style.css` | exists: `.sidebar`, the 820 px drawer, `.modeline-*` | adds the cursor ring on `.tree-row`, the focused-pane mark, and the pane cell |
| `src/focus.test.ts` | absent | new: the cycle, the tree, the negative cases, the drawer |
| `src/emacs-keys.test.ts` | exists: the conformance sweep | the sweep is made scope-aware; the new rows survive it |
| `docs/spike-emacs-keys.md` | exists: 16 checklist rows | row 17, `C-x o` on a real keyboard |

### Out

- The tree itself — Parts, Chapters, heading levels, badges, ordering, and what
  a click opens: map #1, `itd-2609051335399446` (cond-2609051925372563). Where
  Return and a click must agree, this spec calls the hook a click calls.
- The table's shape, the keys panel, the tooltips, the editing surface's prefix
  state, and the one cancel contract: map #2, `itd-2609051335406422`
  (cond-2609051925374969). This spec registers rows and reuses the contract.
- What the palette inserts: map #3, `itd-2609051335415528`
  (cond-2609051925377969); and the same vocabulary inside a reading view: map
  #26, `itd-2609051402083398` (cond-2609051925377047).
- The tablet, where there is no shell to claim `C-x` (cond-2609051925377283);
  rebinding a chord; and editing structure from the tree — dragging a chapter
  between Parts. All three are open in `03-evidence.md`.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| Round-trip byte-fidelity `itd-2609051336074533` | `src/focus.test.ts` › "changes not one byte of the open chapter while the tree has the keyboard", over the hazardous fixture `src/emacs-keys.test.ts` already carries |
| No machine in the document `itd-2609051336080960` | nothing here writes to a chapter; the cursor, the expansion set and the pane live in the page and are never persisted |
| One source, always `itd-2609051336090390` | the rows are read from the one tree `src/core/outline.ts` derives, and every chord is resolved through `bindingById`, never against a hard-coded key |
| Degrade gracefully in a plain tool `itd-2609051336110536` | no construct is written; the canon is untouched |
| Legible on three device classes `itd-2609051336128348` | `src/focus.test.ts` › "opens the drawer with the keyboard and closes it behind Return", plus manual check M30-1 at 1280, 820 and 390 |
| Network only on publish `itd-2609051336158553` | `src/focus.test.ts` › "attempts no network request while moving between panes" |

## Design

### Three panes, one order

`src/focus.ts` holds a `Pane` of `"editor" | "sidebar" | "panel"` and the fixed
order `["editor", "sidebar", "panel"]`. Each pane registers a `PaneTarget`: its
`pane`, a `label()` for the modeline, an `available()` saying whether it can
hold the keyboard now, and `take()` and `release()`.

`cycle()` walks the order from the pane that holds the keyboard, wrapping, and
stops at the first target whose `available()` is true. The editor is always
available, so the walk terminates; the panel target is available only while a
panel is open, which is what makes the cycle two panes with nothing open and
three with something open, in the same order every time. There is one panel
target, not four: its `label()` and `take()` delegate to whichever panel is
open — the keys panel and the insert palette through `currentOverlay()`, the
publish and settings panels through the focus contract they hand to
`registerPanel`. Where two could be open, the most recently opened wins, which
the overlay contract already enforces for the two overlays.

### Hearing a chord in a pane the editing surface cannot hear

The Emacs handler is a CodeMirror extension: it sees a keydown only while the
content has DOM focus. So `C-x o` reaches the model by two routes, and both
resolve the same row.

- **From the text.** `other-window` joins `APP_COMMAND_IDS` in `src/emacs.ts`
  and is registered in `src/app.ts` like `save-chapter`. The package's own
  prefix machinery opens `C-x`, the modeline shows it, and `C-g` clears it.
- **From the sidebar or a panel.** `src/focus.ts` installs one `keydown`
  listener on the document in the capture phase, active only while the pane is
  not the editor. It builds a chord with `chordFromEvent`, compares against
  `bindingById(id).chords` through `canonicalChord`, and holds a single pending
  step so a prefix sequence completes. It is a second *reader*, not a second
  prefix state: the pending step goes to the modeline's own prefix cell, so a
  half-typed `C-x` looks the same wherever it was typed.

While the pane is `"panel"` the reader answers `other-window` and nothing else,
letting every other key through to the panel's own handler, so the one cancel
contract still closes a panel on `C-g` and Escape; while it is `"sidebar"` it
answers the six sidebar rows and nothing else.

### The rows, and why the table gains a scope

Seven rows, in the notation `src/keys.ts` documents:

| id | label | chords | group | owner |
|---|---|---|---|---|
| `other-window` | Other pane | `C-x o` | control | editor |
| `sidebar-next-node` | Next node | `C-n`, `Down` | panes | sidebar |
| `sidebar-previous-node` | Previous node | `C-p`, `Up` | panes | sidebar |
| `sidebar-expand-node` | Expand the node | `C-f`, `Right` | panes | sidebar |
| `sidebar-collapse-node` | Collapse the node | `C-b`, `Left` | panes | sidebar |
| `sidebar-open-node` | Open the chapter here | `Return` | panes | sidebar |
| `sidebar-quit` | Back to the editor | `C-g`, `Escape` | panes | sidebar |

`C-x o` is free: the table's `C-x` sequences are `u`, `r`, `h`, `k`, `C-x`,
`C-s`, `C-f`, `C-p`, `C-u`, `C-l`, `S-/`, `C-b` and `C-r`. Six of the seven
carry a chord another row carries — `C-n` is `next-line`, `Return` is
`newline`, `C-g` is `keyboard-quit` — and the table's
own invariant is that no two rows share a chord. That invariant is right and
stays; what changes is that it is stated per scope. `BindingOwner` gains
`"sidebar"`, and `scopeOf(binding)` returns `"sidebar"` for those rows and
`"editor"` for every other. `chordIndexIn(scope)` is `chordIndex()` restricted
to one scope, and the uniqueness test runs once per scope. This is the intent's
mechanism written down, and it is falsifiable in the ugliest direction: a chord
that answers in two scopes at once is a defect the negative tests below catch.

`BINDING_GROUPS` gains `"panes"` at the end, labelled "Panes", so the keys panel
shows the whole flow together instead of a second "Next line" beside the first;
`OWNER_NOTES` in `src/keyspanel.ts` gains `sidebar: "sidebar"`, which is how a
reader of the panel sees which pane answers a row. Neither changes the table's
shape: the panel still renders `BINDINGS` grouped by `group`, unchanged.

### The tree under the cursor

`src/sidebar.ts` already walks Parts, Chapters and headings in draw order. The
same walk now collects a flat list:

```ts
interface SidebarRow {
  readonly key: string;  // the expansion key: part:… | chapter:… | node:…
  readonly kind: "part" | "chapter" | "heading";
  readonly depth: number; readonly element: HTMLElement; // the .tree-row
  readonly expandable: boolean; readonly expanded: boolean;
  readonly chapter?: Chapter;   readonly node?: OutlineNode;
}
```

The `Sidebar` interface gains `rows()`, `cursor`, `setCursor`, `takeFocus`,
`releaseFocus`, `focused`, `expandAtCursor`, `collapseAtCursor` and
`activateCursor`. The cursor is drawn as `data-cursor="yes"` on the `.tree-row`,
a ring in `src/style.css` and deliberately not the `data-open` mark the open
chapter carries: where Alice is looking and what is open are two facts.

- `takeFocus()` puts the cursor on the row for the open chapter — its heading
  row when a heading is selected — or on the first row when nothing is open,
  expanding the Parts on the way so the row is visible; then it focuses the
  `nav` element itself, which is what stops the editing surface seeing keys.
  `releaseFocus()` blurs it and leaves the cursor where it is.
- Movement clamps at the ends rather than wrapping. An overlay wraps because a
  list of forms has no shape; a book does.
- `expandAtCursor()` expands a collapsed expandable row and does nothing else —
  no move to the first child. `collapseAtCursor()` collapses an expanded row and
  does nothing else — no move to the parent. Neither opens anything.
- `activateCursor()` calls the same `onOpenChapter(chapter, node?)` hook a click
  calls, so the behaviour is map #1's and this spec inherits it. On a Part row
  it does nothing, because a Part is not a chapter.

The drawer is the same two calls. `takeFocus()` opens the sidebar when it is
closed and remembers that it did; `releaseFocus()` closes it again only in that
case. At 1280 the sidebar is already open and neither call changes anything; at
820 and 390 the drawer slides open with the keyboard and closes behind Return
and behind cancel. No width is read in TypeScript — the media query in
`src/style.css` is the only place one appears, which is what lets jsdom prove
the behaviour and leaves the appearance to the manual check.

### Returning to the editor

Three things return the keyboard to the text, and all three go through
`focus.toEditor()`, which releases the pane that held it and calls
`view.focus()`:

1. `sidebar-quit` — `C-g` or Escape — which opens nothing and leaves the cursor
   in the chapter exactly where Alice left it, because nothing here dispatches a
   transaction.
2. `other-window` from the last pane in the cycle.
3. `activateCursor()`, once `app.openChapter` has resolved; `openChapter`
   already calls `revealLine(view, node.line)`, so the cursor is on the heading
   before the focus arrives.

An overlay closing tells the model through `onOverlayChange`, the one observer
`src/overlay.ts` gains; a publish or settings panel closing tells it through the
`close` its focus contract carries. So "focus returns to the editor on open or
cancel" is one rule with one implementation, not one per panel.

### What the modeline says

`ModelineContext` gains `pane: string` and an optional `prefix: string | null`.
A new `.modeline-pane` cell, first in the line, reads `[Editor]`, `[Sidebar]`,
`[Keys]`, `[Insert]`, `[Publish]` or `[Settings]` — the label the target
supplies — with a tooltip generated by `describeChord("other-window", …)` like
every other cell. The prefix cell prefers `context.prefix` when it is a
non-empty string and falls back to `emacsStatus(view)` otherwise, so a `C-x`
half-typed in the sidebar shows in the cell that already exists.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| `C-x o` from the text moves focus to the sidebar, the open chapter's node is highlighted, and the modeline names the sidebar | `src/focus.test.ts` › "moves the keyboard to the sidebar on C-x o and starts on the open chapter" |
| `C-n`, `C-p`, `C-f`, `C-b`, and Down, Up, Right, Left move the selection and expand and collapse; no chapter opens; the text is unchanged byte for byte | `src/focus.test.ts` › "walks the tree on the chord and on the arrow alike", "expands and collapses without opening anything", "changes not one byte of the open chapter while the tree has the keyboard" |
| Return on a Sub-section opens that chapter at that heading, focus returns to the text with the cursor on the heading, and the modeline names the editor | `src/focus.test.ts` › "opens the chapter at the heading on Return and hands the keyboard back" |
| `C-g` from the sidebar, and `C-x o` with no panel open, both return to the text with nothing opened and the cursor where she left it | `src/focus.test.ts` › "returns to the text on C-g having opened nothing", "cycles straight back to the editor when no panel is open" |
| With the keys panel open, three presses visit sidebar, panel, editor in that order, the modeline naming each; the same holds for the palette, publish and settings | `src/focus.test.ts` › "cycles editor, sidebar, panel, editor in one fixed order", run as a table over the four panels |
| In the text, `C-n`, `C-p`, `C-f`, `C-b` and Return run the editing surface's own actions and no node moves; in the sidebar, printable characters insert nothing and no editing chord fires | `src/focus.test.ts` › "leaves the tree alone while the cursor is in the text", "types nothing into the chapter while the tree has the keyboard" |
| The keys panel lists every chord this flow answers with an id, a label and its chords; no chord the sidebar or a panel answers is absent from the table; no row this spec adds is answered by nothing | `src/focus.test.ts` › "answers every sidebar row and lists every chord it answers" — the sweep in both directions over `scopeOf(binding) === "sidebar"`; `src/emacs-keys.test.ts` › "gives no two rows the same chord", made scope-aware, and "answers no chord the table does not list" |
| At 820 px the whole flow runs in the drawer: it opens with the keyboard, behaves as above, closes on Return and on cancel, nothing scrolls sideways, no step needs the pointer | `src/focus.test.ts` › "opens the drawer with the keyboard and closes it behind Return", "closes the drawer on cancel having changed nothing"; manual check M30-1 |
| Inherits: round-trip byte-fidelity; no machine in the document; one source, always; degrade gracefully; three device classes; network only on publish | the byte-fidelity and network tests named above; the remaining three are structural and argued in Scope |

Manual checks, run with `npm run tauri dev` and recorded as an unticked list in
`.abcd/.work.local/logs/acceptance/spc-2609051925374395.md`:

- **M30-1** — at 1280, 820 and 390 CSS pixels, run the whole flow from `C-x o`
  through movement and expansion to Return and to `C-g`. At 820 and 390 the
  drawer opens with the keyboard and closes behind both exits; at 1280 the
  column does not move. Nothing scrolls sideways and no step needs the pointer.
- **M30-2** — with the key log open (`C-x k`), press `C-x o` from the text and
  again from the sidebar. Both steps reach the page and both are claimed. A
  silent `C-x` is the shell's claim to make and is the risk `06-delivery.md`
  names; a silent `o` after a live `C-x` would be the reader failing instead.
  This is checklist row 17 in `docs/spike-emacs-keys.md`, recorded against the
  table like every other row.

## Tasks

1. Add `scopeOf`, `chordIndexIn` and the `sidebar` owner to `src/keys.ts`, and
   make the uniqueness test in `src/emacs-keys.test.ts` run once per scope.
   Verify: `npx vitest run -t "gives no two rows the same chord"`.
2. Add the seven rows and the `panes` group; skip non-editor rows in the sweep
   that presses every chord the page owns.
   Verify: `npx vitest run src/emacs-keys.test.ts`.
3. Add `other-window` to `APP_COMMAND_IDS` and register a no-op command for it
   in `src/app.ts`, so the chord is claimed before the model exists.
   Verify: `npx vitest run -t "claims every step of every modified chord"`.
4. Add the flat row list, the cursor, and `takeFocus`/`releaseFocus` to
   `src/sidebar.ts`, with the cursor ring in `src/style.css`.
   Verify: `npx vitest run src/focus.test.ts -t "walks the tree"`.
5. Add `src/focus.ts`: the targets, the cycle, and the document key reader.
   Verify: `npx vitest run src/focus.test.ts -t "cycles editor, sidebar"`.
6. Add `onOverlayChange` to `src/overlay.ts` and the optional focus contract to
   `registerPanel`, and pass it from the publish and settings panels.
   Verify: `npx vitest run src/focus.test.ts src/keyspanel.test.ts`.
7. Add the pane cell and the external prefix to `src/modeline.ts`, and pass both
   from `refresh()` in `src/app.ts`.
   Verify: `npx vitest run -t "names the pane holding the keyboard"`.
8. Add the negative tests — the text unmoved by sidebar chords, the tree unmoved
   by editing chords, nothing typed into the chapter — and the byte-fidelity and
   network sweeps. Verify: `npx vitest run src/focus.test.ts`.
9. Add checklist row 17 to `docs/spike-emacs-keys.md`, write the manual
   acceptance file, and run M30-1 and M30-2.
   Verify: `npm test && npm run lint && npm run build`.

## Risks and Open Questions

- **`C-x` as a prefix is the precondition.** `03-evidence.md` leaves open
  "which key combinations macOS and the web view take before the editor sees
  them, and which of those the shell can claim back", and `06-delivery.md` makes
  it the spike's first question. `C-x C-s` and `C-x C-f` already ship on that
  prefix, so the build assumes it survives; M30-2 is where a failure shows, and
  it would fail visibly at the first keystroke rather than degrading quietly.
- **The second key reader.** The editing surface's prefix machinery belongs to
  map #2 and cannot hear a key while another pane holds focus, so this spec adds
  a reader of its own. The build assumes one visible prefix state fed by two
  readers is honest; the modeline is where a disagreement would show.
- **Rebinding** is open in `03-evidence.md`: "whether individual chords in that
  table are rebindable and persisted". The rows added here carry ids, which is
  the seam a later answer needs; nothing is persisted.
- **Structure editing from the tree** is open in the same chapter: "whether the
  sidebar edits structure — dragging a chapter between Parts — or whether
  structure edits stay in the file system for the first release". The intent
  notes this vocabulary is where such a gesture would sit; the build reserves no
  chord for it, because a chord held for an undecided gesture is a promise the
  table cannot keep.
- **Three silences in the intent**, each with an assumption the build states
  rather than an answer it invents. Which panel takes the third place when a
  panel and an overlay are both open: the most recently opened. Where the cursor
  starts with no chapter open: the first row, the only one it can name without
  guessing. What `C-f` on a leaf and `C-b` on a collapsed node do: nothing,
  because the intent promises open and close, not movement to child or parent.
