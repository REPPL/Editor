---
id: spc-2609111105376860
slug: build-multiple-windows-in-editor-the-same-as-emacs-split-the
intent: itd-2609081931493520
origin: researcher-authored
production_mode: hand-written
---

# Split the editing area, the same as Emacs

## Summary

The editing area becomes a tree of windows inside the one frame. `C-x 3`
divides the window holding the keyboard left and right, `C-x 2` divides it
above and below, `C-x 0` closes it and gives its room to the rest, `C-x 1`
keeps it and closes the others, `C-x {`, `C-x }` and `C-x ^` resize it, and
`C-x o` — which already exists — walks the editing leaves in reading order, then
the sidebar, then any open panel. A split is itself splittable, to any depth.
Two windows may show one chapter, an edit in either appears in both in the same
transaction, and each window keeps its own caret.

Four things change shape underneath, and they are the spec rather than the
chords. The editing surface stops being one `EditorView` and becomes N, held in
a tree in a new module. A chapter stops being "what the view shows" and becomes
a *buffer* the application holds, with zero or more windows looking at it — which
is what makes a window closeable without losing the edits in it. The command
registry's actions stop closing over a view and start asking which window holds
the keyboard. And cursor memory moves from per-chapter to per-window-and-chapter,
Emacs's window-point against buffer-point.

This spec is built on `adr-2609091832455881`, accepted 2026-09-11 at its widest
reading: all of the above lands together. Alternative 3 of that record — a
chapter open in at most one window — is the order the work is done in and is not
a delivery boundary.

**The record's mechanism decision was amended before this spec was written
against it, and this spec is the reason.** An earlier draft of this document read
the installed CodeMirror sources — the check the intent's own second mechanism
claim asked for — and found that `EditorState` declares `selection` as its own
field alongside `doc`, so two views over one state object share one caret drawn
twice. Shared state and per-window cursor positions are mutually exclusive in
CodeMirror 6. The intent's second mechanism claim is recorded as falsified,
`adr-2609091832455881`'s decision 2 is amended in place to "two states kept in
lockstep", and the finding is captured and resolved as `iss-2609111123501225`.
§ Two views, one text designs the lockstep and lists what was read to establish
each line of it.

Two consequences of that amendment are settled rather than open, and the spec
records them as settled. **Undo is per window, not per chapter**
(`cond-2609120405528253`) — § Undo is per window. And **the keyboard resize
vocabulary is in scope** (`cond-2609111105372554`, amended 2026-09-12): the
maintainer bound `C-x {`, `C-x }` and `C-x ^` rather than narrow this intent's
assistive-technology criterion to the windows alone. § Resizing by keyboard
designs them.

One scope condition is read here rather than amended. `cond-2609111105378478`
says "two windows showing one chapter share one document state". After the ADR's
amendment that is true of the fact and not of the mechanism: there is one *text*
per open chapter, held by one buffer and echoed into every window's own state.
This spec reads the condition as the fact it asserts — an edit in either window
appears in both immediately, and two independent copies that drift are not built
— which is what the condition's own second sentence says it is for.

## Scope

### In, by module

- **`src/windows.ts` (new)** — the window tree as data, its operations, the
  arithmetic that refuses a division too narrow to make two windows, and the
  share arithmetic both the pointer drag and the three resize chords move
  through. No DOM, no CodeMirror.
- **`src/editor.ts`** — `createEditor` gains a way to attach a new view to a
  chapter another view already shows, and the echo that keeps them in lockstep.
  `documentText`, `placeCursor`, `revealLine`, `cursorPosition`,
  `chapterProgress` are unchanged and keep taking a view.
- **`src/focus.ts`** — the cycle's first slot becomes plural. `PANE_ORDER` keeps
  its type and its three literals; the walk becomes a list of *steps* in which
  the editor slot expands to its leaves. New: `windowOf`, `toWindow`, a
  `focusedWindow` that is never null. The module doc comment is rewritten, as
  the ADR requires.
- **`src/app.ts`** — holds the tree, the window records and the buffers instead
  of one view and one `openChapterPath`. Every action in `commands` resolves
  through a focused-window getter. `chapterCursors` is replaced. The layout host
  renders the tree.
- **`src/keys.ts`** — seven new rows: four for the layout chords, three for the
  resize chords.
- **`src/emacs.ts`** — seven new ids in `APP_COMMAND_IDS`; one new export,
  `clearPending(view)`; the "One window, one application" paragraph of the doc
  comment is rewritten.
- **`src/modeline.ts`** — the pane cell names which window, and only once there
  is more than one.
- **`src/style.css`** — the recursive flex grid, the dividers, the focused
  window's border.
- **`src/drop-target.ts`** — its listeners move from one view to the tree host,
  and it resolves the window under the pointer.
- **`src/main.ts`** — `app.view` becomes a getter and every call site reads it
  at the moment it needs it; one changed call to `createDropTarget`.
- **`docs/`** — a new how-to page for splitting, and a sentence in the page that
  names the pane cycle.

### Out

- **A second operating-system window.** Ruled out in `iss-2609081938037238`;
  `adr-2609051324137479` is untouched.
- **Splitting the sidebar or a panel.** Both stay docked outside the grid and
  neither becomes a leaf.
- **Balancing (`C-x +`), window configurations (`C-x r w`), `winner-mode`,
  `shrink-window` (which Emacs itself leaves unbound).** Not asked for.
- **A numeric argument on the resize chords.** `C-u 10 C-x }` multiplies in
  Emacs. Every command in `APP_COMMAND_IDS` is registered as `() => run(id)` and
  discards the count today, and widening that is a change to every row rather
  than to these three. § Resizing by keyboard says what a repeated press does
  instead.
- **One undo history per chapter.** Settled as per-window on 2026-09-12
  (`cond-2609120405528253`); § Undo is per window records the divergence and its
  reason. Not an open question and not a risk.
- **Removing the discard prompt on a chapter switch.** It becomes inaccurate
  once buffers outlive windows, and it is a shipped promise. Captured as
  `iss-2609111123510084`; `confirmDiscard` ships unchanged here.

### Disciplines inherited

`itd-2609051336128348`'s three, as criterion 15 restates them.

- **One source, always.** One window tree, one buffer per open chapter, one
  focused-window question asked in one place. The chords come from `BINDINGS`,
  as every chord in the application does.
- **Legible on three device classes.** Splitting is available at 1280 and 820
  CSS pixels and refuses at 390, where the editing area cannot hold two windows.
  § The refusal at 390 gives the arithmetic.
- **Reachable by assistive technology.** Each window is a labelled region named
  by the chapter it shows; the keyboard reaches every one of them with `C-x o`;
  the footer says which of how many holds the keys. The sizes are reachable too,
  by `C-x {`, `C-x }` and `C-x ^`, and each of those says what it did — so the
  whole feature is operable without sight and without a pointer. That is the
  discipline met rather than narrowed, which is how the maintainer settled
  `cond-2609111105372554` on 2026-09-12.

## Design

### The window tree, and why it is its own module

The tree goes in a new `src/windows.ts`. The repository's bias is one canonical
primitive per idea, and the test of a new module here is whether the tree is a
new idea or a part of an existing one. It is a new one, and the shape of the
existing files says so: `src/sidebar.ts` owns a pane and its DOM, `src/focus.ts`
owns which pane holds the keyboard, and the two are separate files precisely
because "what is drawn" and "who is listening" are different questions about the
same thing. The window tree is "what is drawn" for the editing surface. Putting
it in `focus.ts` would mix the two questions inside the one module whose doc
comment exists to keep them apart; putting it in `app.ts` would add four hundred
lines of pure data structure to a file that is already the integration point and
nothing else.

The module is pure. It holds no DOM, imports nothing from CodeMirror, and every
operation returns a new tree.

```ts
/** One editing window's identity, opaque and stable for the window's life. */
export type WindowId = string & { readonly __window: unique symbol };

/** A window tree: a leaf that shows a chapter, or a split of two or more. */
export type WindowTree = WindowLeaf | WindowSplit;

export interface WindowLeaf {
  readonly kind: "leaf";
  readonly id: WindowId;
}

export interface WindowSplit {
  readonly kind: "split";
  /** Rows for `C-x 2`, columns for `C-x 3`. */
  readonly direction: "rows" | "columns";
  /** Two or more, in the order they are drawn. */
  readonly children: readonly WindowTree[];
  /** Each child's share of the split's main axis, summing to one. */
  readonly shares: readonly number[];
}
```

The tree holds ids and not window objects, because the tree is rebuilt on every
operation while a window's view, its DOM element and its cursor memory have to
survive being re-shaped around. Those live in a map the application holds:

```ts
/** One editing window: what it is drawn in, what it shows, where it has been. */
export interface EditorWindow {
  readonly id: WindowId;
  /** The region the view is mounted in; the element `windowOf` matches. */
  readonly element: HTMLElement;
  readonly view: EditorView;
  /** The buffer it shows: a chapter path, or null for the welcome text. */
  buffer: string | null;
  /** The window-point: where the caret sat in each chapter it has shown. */
  readonly points: Map<string | null, number>;
}
```

Splits are always created with exactly two children, and a split is never
flattened into its parent. `C-x 3` inside a column therefore nests rather than
adding a third column, which is Emacs's own behaviour: only the window being
divided changes size, and its neighbours are left alone. The flattening
alternative — splice the new leaf into a parent of the same direction and
re-equalise — was declined for that reason: it would move windows Alice did not
ask to move. `children` is nonetheless typed as two or more, with an invariant
`children.length >= 2`, because that is what the ADR decided and because closing
one child of a three-child split has to have a shape; what `C-x 2` and `C-x 3`
actually produce is always two.

The operations:

```ts
/** What one layout chord did, or did not do. */
export interface TreeChange {
  readonly tree: WindowTree;
  /** Windows that no longer exist, for the caller to tear down. */
  readonly closed: readonly WindowId[];
  /** The window that has just come into being, if one did. */
  readonly opened: WindowId | null;
  /** What the chord could not do, or null when it did it. */
  readonly refusal: string | null;
}

export function leafIds(tree: WindowTree): readonly WindowId[];
export function splitWindow(
  tree: WindowTree,
  at: WindowId,
  direction: "rows" | "columns",
  mint: () => WindowId,
): TreeChange;
export function closeWindow(tree: WindowTree, at: WindowId): TreeChange;
export function closeOtherWindows(tree: WindowTree, keep: WindowId): TreeChange;
export function resize(
  tree: WindowTree,
  split: readonly number[],
  shares: readonly number[],
): WindowTree;

/** Which division a resize chord moves, and between which two children. */
export interface ResizeTarget {
  /** The path from the root to the split whose divider moves. */
  readonly split: readonly number[];
  /** The child that grows, and the one that yields. */
  readonly grows: number;
  readonly yields: number;
}

export function resizeTarget(
  tree: WindowTree,
  at: WindowId,
  axis: "rows" | "columns",
  widen: boolean,
): ResizeTarget | null;

export function stepShares(
  shares: readonly number[],
  target: ResizeTarget,
  step: number,
  floor: number | null,
): readonly number[] | null;
```

- **`leafIds`** is depth-first, children in array order: top to bottom for a
  `rows` split, left to right for a `columns` split. That is reading order in a
  left-to-right, top-to-bottom script, which is the only script Editor targets.
  It is the one function `other-window`'s order rests on, and the intent's
  falsifier — "if `C-x o` ever visits the sidebar before a second editing window
  that is shown, the order is wrong" — is a test over it plus `PANE_ORDER`.
- **`splitWindow`** replaces the leaf `at` with
  `{kind: "split", direction, children: [{kind:"leaf", id: at}, {kind:"leaf", id: fresh}], shares: [0.5, 0.5]}`.
  **`at` keeps its id, and therefore its view, its state, its caret and its
  points.** That is the whole of why criteria 1 and 2 — "the keyboard stays in
  the window she was in, and the caret has not moved" — need no code of their
  own: nothing happens to the window Alice is in except that a sibling appears
  beside it. `mint` is injected so the module needs no counter of its own and a
  test can supply predictable ids.
- **`closeWindow`** removes the leaf and hands its share to its siblings in
  proportion to theirs, which is "its space goes to the rest" (criterion 9). A
  split left with one child is replaced by that child, so the tree carries no
  degenerate nodes. With a single leaf in the whole tree it returns the tree
  unchanged and a refusal, which is criterion 10.
- **`closeOtherWindows`** returns `{kind: "leaf", id: keep}` and every other leaf
  in `closed`. Criterion 8.
- **`resize`** writes new shares into one split, addressed by its path from the
  root. The pointer drag calls it on `pointerup`; between `pointerdown` and
  `pointerup` the shares are written to the DOM directly and the tree is not
  touched, so a drag produces one tree rather than one per frame.
- **`resizeTarget`** and **`stepShares`** are the keyboard resize, and they are
  two functions rather than one so that neither has to measure anything.
  `resizeTarget` answers *which* divider a chord moves, by walking up from the
  leaf; the application then measures that one split and hands `stepShares` the
  floor as a share. § Resizing by keyboard gives the semantics. Both the drag and
  the chords end in `resize`, so there is one place shares are written and one
  floor they respect.

Which leaf holds the keyboard is deliberately not the tree's business. It is one
`WindowId` and it lives in the focus model, which is the module whose whole
subject is where the keyboard is.

Rendering. A leaf renders as the window's own `element`; a split renders as a
`div.window-split[data-direction]` holding its children with a
`div.window-divider` between each pair. Leaf elements are **moved, not rebuilt** —
appending an element already in the document moves it — so a reshape never
destroys a view. Two consequences, both handled rather than discovered: a
re-parented CodeMirror view has to be told to measure again
(`view.requestMeasure()` on every surviving window after a reshape), and
re-parenting the element that has DOM focus blurs it in WebKit, so the focused
window's `view.focus()` is called last in every reshape. That last call is also
what keeps criterion 1's "the keyboard stays in the window she was in" true in
the real engine, where jsdom would never show the blur.

### Two views, one text

**What the library does, and why the governing record was amended.**
`adr-2609091832455881`'s decision 2 now reads "two windows on the same chapter
hold two states kept in lockstep", amended 2026-09-12 on the strength of the
reading below; as accepted it said "CodeMirror supports several `EditorView`s
over one shared `EditorState` natively", which is true of the mechanism and false
of the consequence the intent needs. The reading is kept here in full, because it
is the evidence that amendment rests on, because `iss-2609111123501225` cites
this spec as what found it, and because a later reader deserves to see why the
obvious design is not available.

What was read, and where:

- `node_modules/@codemirror/state/dist/index.d.ts:1096,1100` — `EditorState`
  declares `readonly doc: Text` **and** `readonly selection: EditorSelection` as
  its own fields; `dist/index.js:2540-2560` assigns both in the constructor. The
  view holds no selection anywhere; `view.state` is
  `get state() { return this.viewState.state }`
  (`@codemirror/view/dist/index.js:7824`), and `DocView.updateSelection` writes
  `this.state.selection` into the DOM.
- `@codemirror/view/dist/index.js:7947-7957` — `view.update(transactions)` is
  public and checks `tr.startState != state` by **reference identity**, throwing
  `RangeError("Trying to update state with a transaction that doesn't start from
  the previous state.")`. So two views that begin on the same state object can be
  advanced in lockstep by dispatching in one and calling `update([tr])` on the
  other, and they will end on the same object. Shared state genuinely works.
- Which is exactly why it cannot be used. If `viewA.state === viewB.state` then
  `viewA.state.selection === viewB.state.selection` — the identical object. Both
  windows draw one caret in one place. That is the intent's own named falsifier.
  Extensions are read off the state too (`viewPlugin`, `theme`, `styleModule`,
  `updateListener`, `EditorState.readOnly` are all facets the view reads from
  `state.facet(...)`, `view/dist/index.js:7913,8017-8020`), so a shared state
  would also force both windows to carry identical decorations and listeners.
- `@codemirror/collab` is **not installed**; `node_modules/@codemirror/` holds
  autocomplete, commands, lang-css, lang-html, lang-javascript, lang-markdown,
  language, lint, search, state, view and nothing else. There is no rebasing
  machinery and this design must not need any.

**What is built.** Two `EditorState`s that agree on their text, kept in lockstep
by echoing one transaction's `ChangeSet` into the other view, synchronously,
inside the originating view's own dispatch. Named precisely: a
`dispatchTransactions` override, an `Annotation` to break the echo, and
`Transaction.addToHistory.of(false)` and `filter: false` on the echo.

```ts
/** Marks a transaction as another window's edit, arriving here. */
const echoed = Annotation.define<boolean>();

/** Every window showing one buffer, in the order they were attached. */
type Peers = () => readonly EditorView[];

function attach(parent: HTMLElement, state: EditorState, peers: Peers): EditorView {
  const view: EditorView = new EditorView({
    state,
    parent,
    dispatchTransactions: (transactions) => {
      view.update(transactions);
      for (const transaction of transactions) {
        if (!transaction.docChanged) continue;
        if (transaction.annotation(echoed) === true) continue;
        for (const peer of peers()) {
          if (peer === view) continue;
          peer.dispatch({
            changes: transaction.changes,
            annotations: [echoed.of(true), Transaction.addToHistory.of(false)],
            filter: false,
            scrollIntoView: false,
          });
        }
      }
    },
  });
  return view;
}
```

Every line of that is load-bearing, and each was verified:

- **`dispatchTransactions`** is the current hook
  (`@codemirror/view/dist/index.d.ts:724`); the deprecated `dispatch(tr, view)`
  at `:730` is documented as forcing one transaction at a time. It is declared
  `private` in the `.d.ts`, so it can only be passed at construction — which is
  why `peers` is a *getter* and not a list: the set of windows on a buffer
  changes long after the view is built.
- **`view.update(transactions)` first.** The config option *replaces* the default
  `trs => this.update(trs)` (`view/dist/index.js:7907-7910`). Omitting it renders
  nothing at all.
- **`changes: transaction.changes`** is legal because `ChangeSpec` includes
  `ChangeSet` (`state/dist/index.d.ts:264-268`). `ChangeSet.of` guards it:
  `if (spec.length != length) throw new RangeError("Mismatched change set length
  (got X, expected Y)")` (`state/dist/index.js:964-965`). **That guard is the
  design's own divergence detector** — the library refuses to let two windows'
  documents drift apart silently, and the first keystroke after a divergence
  throws rather than corrupting a file. It is the best early-failure signal this
  spec has and § Risks leans on it.
- **No `selection` on the echo.** `Transaction.newSelection` is
  `this.selection || this.startState.selection.map(this.changes)`
  (`state/dist/index.js:2272-2274`), so the receiving window's own caret is
  mapped through the incoming change for free. **That single line is criterion 3**
  — "the other window's caret keeps its own position rather than jumping to
  hers" — and it also means an insertion *before* the other caret moves it along
  by the right amount, which is what an author expects and what a naive
  "leave it alone" implementation would get wrong.
- **`Transaction.addToHistory.of(false)`.** `history()` is a `StateField`
  (`@codemirror/commands/dist/index.js:221`), so two states have two histories.
  The field's update has exactly one path that maps existing entries through a
  foreign change without recording a new undoable event:
  `if (tr.annotation(Transaction.addToHistory) === false) return
  !tr.changes.empty ? state.addMapping(tr.changes.desc) : state`
  (`commands/dist/index.js:242-243`). Without it, `C-/` in the receiving window
  would undo the *other* window's typing locally and the two documents would
  diverge on the spot.
- **`filter: false`.** `resolveTransaction` honours it before running either
  filter facet: `return extendTransaction(filter ? filterTransaction(tr) : tr)`,
  with `if (specs[i].filter === false) filter = false`
  (`state/dist/index.js:2415-2427`), and the option's own documentation
  (`state/dist/index.d.ts:892-900`) names this case: "transactions that, for
  example, include annotations that must be kept consistent with their changes".
  This is what keeps `alignTables()` — an `EditorState.transactionFilter` that
  appends a table realignment to the author's keystroke
  (`src/tables.ts:600-602`) — from firing a *second* time on the echo. Without
  it, typing inside a pipe table in one window would append a realignment in
  window A and another in window B, and the two texts would differ by one
  realignment: the intent's "appears twice" failure, in the one place in the
  codebase where an extension writes a change the author did not type
  (`adr-2609092000099546`).
- **`scrollIntoView: false`.** A window that is not being typed in must not
  scroll. Criterion 5's "the other window is untouched" and criterion 3's "keeps
  its own position" both mean visually as well as in the model.
- **No loop.** The echo is annotated, and the annotated branch does not echo on.
  Fan-out is one origin to all peers, so there is no cycle even with four windows
  on one chapter.
- **Synchronous, always.** `@codemirror/collab` is absent and there is no
  rebasing. The echo goes out inside the originating dispatch, before any other
  code can dispatch into either state. A deferred echo — a microtask, a
  `setTimeout`, anything across an `await` — would let a second edit interleave
  and `ChangeSet.of`'s length guard would throw. **This is a rule, not a
  preference**, and it wants a comment saying so at the call site.

The text in the two windows is structurally equal and held in two `Text` ropes.
For a chapter of a few hundred kilobytes and a handful of windows that is
nothing, and it is the cost of the only design the installed library admits.

### Undo is per window

Settled by the maintainer on 2026-09-12 and recorded as
`cond-2609120405528253`, with the cost named in `adr-2609091832455881`'s amended
decision 2. It is written here as a design section rather than as a risk, because
it is a decision the build carries out rather than a hazard it watches for.

The mechanism forces it. `history()` is a `StateField`
(`node_modules/@codemirror/commands/dist/index.js:221`), a `StateField` lives in
exactly one `EditorState`, and one `EditorState` per chapter is precisely what the
amendment rules out. So each window has its own history, holding its own edits.

What that means at the keyboard, stated as the behaviour rather than as a
limitation, because it is what Alice will meet:

- An edit made in window A is echoed into window B with
  `Transaction.addToHistory.of(false)`, so it enters no history in B. `C-/` in B
  undoes nothing — or undoes B's own older edit, if B has made one.
- `C-/` in A undoes A's edit, and that undo is itself a change, so it is echoed
  into B like any other. The text goes back in **both** windows. Undo is per
  window; the *text* is never per window.
- B's own history entries stay correct across A's edits. The one path that maps
  them is `addMapping`, taken exactly when the echo's annotation is present
  (`commands/dist/index.js:242-243`), so an undo in B of B's own older edit lands
  in the right place however much A has typed in between.

**Nothing is ever lost by it.** Every edit sits in exactly one window's history
and every history is mapped through every echoed change. The failure mode is a
chord that appears to do nothing, not a chord that destroys work — which is the
whole of why it was acceptable to settle rather than engineer around.

What was declined, and why it is worth naming: routing `C-/`, `C-z`, `C-x u` and
redo through an application-held canonical state. That is larger than the rest of
this spec, and it cuts across `adr-2609092000099546`'s rule that one undo takes an
author's keystroke and the table realignment appended to it back together — a
canonical history would hold the realignment as a change of its own, made by no
window.

The consequence for the build is one line: **no window's extensions omit
`history()`, and nothing in this spec touches the undo chords at all.** The
divergence is what happens when the rest of the design is built correctly, so
there is no code to write for it — only a test that pins it (criterion 19) and a
sentence in the how-to page, so the first time it confuses Alice the
documentation has already told her.

### Buffers: a chapter the windows look at

Once a chapter can be shown in two windows, "the open chapter" stops being a
property of the view. The application holds buffers:

```ts
/** One open chapter: its text's home, and every window looking at it. */
interface ChapterBuffer {
  /** The chapter's path, or null for the welcome text. */
  readonly path: string | null;
  title: string | null;
  /** The text as last read from, or written to, disk. */
  savedText: string;
  detached: boolean;
  /** Which windows show it. */
  readonly windows: Set<WindowId>;
  /** The buffer-point: where the last window to leave it left the caret. */
  lastPoint: number;
  /** The text, held here only while no window shows it. */
  restingText: string | null;
}
```

Keyed by `path` in a `Map<string | null, ChapterBuffer>`. The null key is the
welcome buffer, created at mount with `savedText = WELCOME`, so a window with no
chapter open is not a special case anywhere: every window is always on exactly
one buffer. That also preserves today's behaviour to the letter for a single
window, including the small existing oddity that editing the welcome text makes
`reportDirty` true while the modeline still says `-- no chapter`.

Three derived questions, each answered in one place:

- `bufferText(buffer)` — `documentText` of any window on it when there is one,
  `restingText` when there is not. Every window on a buffer agrees by
  construction, so "any" is well defined; the first in `windows` is used.
- `isDirty(buffer)` — `bufferText(buffer) !== buffer.savedText`. The modeline
  draws the focused window's buffer's answer.
- `anyDirty()` — whether any buffer is dirty. This is what
  `services.reportDirty` is handed and what `quit` and `confirmClose` ask, and it
  is a genuine widening: with buffers outliving windows, "is there unsaved work"
  is no longer a question about one chapter. The quit and close questions name
  the chapter when one buffer is dirty and say how many when more than one is.

`save()` writes `bufferText` of **the focused window's buffer**, to that
buffer's own path, and records `savedText` on that buffer alone. That is
criterion 6 in three lines, and it is the criterion the intent calls "falsifiable
in the worst way a text editor can be".

`reload()` applies its existing three-case logic — unchanged on disk, changed
with a clean buffer, changed with a dirty buffer — once per buffer that has a
path, rather than once for the one open chapter. The announcement names the
focused window's buffer as it does today, with a count when more than one buffer
changed.

### Unsaved edits outliving a window (criterion 14)

It falls out of the buffer, and the reason is worth stating rather than leaving
implicit, because it is the property most easily lost in a later refactor.

`C-x 0` does three things: it removes a leaf from the tree, it destroys that
window's `EditorView`, and it drops that window's `points`. It does not touch any
buffer's `savedText` and it does not touch the text. If the closing window was
the last one on its buffer, the buffer's `restingText` is filled from that
window's document and `lastPoint` from its caret — so the text *moves* from the
view into the buffer rather than dying with the view. `isDirty(buffer)` is
therefore the same before and after the close, and opening the chapter again in
any window brings the edits back at the position the closing window left.

The corollary is the test that proves it: **`C-x 0` never asks `mayDiscard()`**,
because nothing is discarded. A close that asked the question would be admitting
it loses the edits.

### Command scoping

`src/emacs.ts`'s `commands: EditorCommands | null` stays one module-level
registry. The ADR is right that the chord table is global and should be, and
nothing in the keymap layer needs to change at all: `handlerByView` is already a
`WeakMap<EditorView, EmacsHandler>` and `emacsStatus(view)` already takes a view,
so the keymap already scales per window. What does not scale is the *command*
layer, and the fix is in `src/app.ts`.

Today every action in the `commands` object closes over the module-local
`const view`. It becomes a getter:

```ts
/** The window holding the keyboard. Never null: a tree always has a leaf. */
function here(): EditorWindow { ... }
/** The view the keyboard is in. The one question every command asks. */
function view(): EditorView { return here().view; }
```

and each action's `view` becomes `view()` — `prose(() => fillParagraph(view(),
proseOptions()))`. That is a mechanical edit of about sixty call sites and **no
signature changes anywhere**: `EditorCommands` keeps its shape, `runBinding`
keeps taking a view, and every command in `src/prose.ts`,
`src/outline-commands.ts`, `src/palette.ts` and `src/tables.ts` is untouched. So
the honest answer to the question the ADR leaves half-open is yes: the registry's
actions close over a getter for the focused view rather than over a view, and the
getter lives where the focus model already is.

The alternative — thread the originating view through `run(id)` — is declined,
and not only because it would change `EditorCommands`'s signature. A command can
arrive by four routes: a chord in a window's content, `M-x`, the prefix overlay,
and `C-h k`'s prompt. In the last three the keyboard is *in an overlay* and there
is no originating view at all. There is exactly one right answer for all four —
the window Alice last typed in — and asking the focus model gives it to all four
at once.

Which means `focus.window` must be correct while an overlay or the sidebar holds
the keys. So the focused window and the focused *pane* are two independent facts:
`focusedWindow: WindowId` is never null and changes only when the keyboard moves
between editing windows or a window closes, while `pane` stays
`"editor" | "sidebar" | "panel"` exactly as today. That is Emacs's own rule —
the selected window survives the minibuffer — and it is what makes `M-x
save-chapter` from the palette write the chapter Alice was last in.

One hazard the single-window app cannot have. `EmacsHandler.$data.keyChain` is
per instance, so each window has its own half-typed prefix, and the kill ring is
static, so all windows share one — which is exactly Emacs, and pleasant. But a
`C-x` half-typed in window A and abandoned with `C-x o` leaves A's chain open,
invisible (the modeline reads the focused window's handler) and live the next
time Alice types in A. So leaving an editing window clears its pending chord, the
same discipline `panelTarget.release` and `sidebar.releaseFocus` already follow.
`src/emacs.ts` gains one export for it:

```ts
/** Forget a half-typed chord in a window the keyboard is leaving. */
export function clearPending(view: EditorView): void {
  const handler = handlerByView.get(view);
  if (!handler) return;
  handler.$data.keyChain = "";
  handler.$data.count = 0;
}
```

### Per-window cursor memory

`chapterCursors: Map<string, number>` is deleted. Two things replace it, which
is Emacs's window-point against buffer-point and the ADR's fourth decision:

- **The window-point.** `window.points: Map<string | null, number>` — where the
  caret sat in each buffer *this window* has shown.
- **The buffer-point.** `buffer.lastPoint` — where the last window to leave this
  buffer left the caret.

The rules, in full:

- Opening buffer B into window W: a heading, where one was named, outranks
  everything and `revealLine` is called as it is today. Otherwise
  `W.points.get(B)` if W has shown B; otherwise `B.lastPoint`; otherwise nought.
  `placeCursor` clamps, as it does today, because a chapter can have been
  shortened since.
- W stops showing B — by opening another buffer, or by closing: `W.points.set(B,
  head)` and `B.lastPoint = head`. The most recent departure wins the
  buffer-point, which is what "a chapter keeps a last-known position for a window
  opening it fresh" means when several windows can leave it.
- W closes: `W.points` is discarded whole. "A window closing discards its own
  memory."
- A different *document* is opened: every buffer is dropped, every window's
  `points` is cleared, and every window goes back to the welcome buffer. The tree
  is **not** collapsed — the layout is Alice's and a new document is not a reason
  to rearrange her screen.

Criterion 4 is the pair of these: two windows on one chapter at different
positions, `C-x o` between them, each restoring its own. It needs no restore
call at all in the common case — each window's caret simply *is* where it was,
because each window has its own state and nothing moved it. `W.points` is what
serves the case where a window has been showing something else in between.

### The focus model's generalisation

The first slot becomes plural without `PANE_ORDER` changing type or losing a
literal. `Pane` stays `"editor" | "sidebar" | "panel"` and `PANE_ORDER` stays
`["editor", "sidebar", "panel"]`. What becomes plural is the *walk*, which is
derived from `PANE_ORDER` fresh on every call:

```ts
/** One stop on the cycle: an editing window, the sidebar, or the panel. */
type Step =
  | { readonly pane: "editor"; readonly window: WindowId }
  | { readonly pane: "sidebar" }
  | { readonly pane: "panel" };

function steps(): readonly Step[] {
  const found: Step[] = [];
  for (const pane of PANE_ORDER) {
    if (pane !== "editor") {
      found.push({ pane });
      continue;
    }
    for (const window of hooks.editorWindows()) found.push({ pane: "editor", window });
  }
  return found;
}
```

`hooks.editorWindows()` is `leafIds(tree)`, supplied by the application. So
`focus.ts` does not import `windows.ts` and does not own the tree — it asks for
the leaves in reading order, exactly as it asks `sidebar.rows()` whether the tree
can hold a cursor. `cycle()` walks `steps()` from the current step's index,
stopping short of where it started, and announces "Nowhere else to go" when it
finds nothing — unchanged in every respect, including that a lone window with a
hidden sidebar and no panel still says so.

`PaneTarget` keeps its shape and gains a per-window constructor,
`editorTargetFor(id)`:

```ts
canHold: () => hooks.hasWindow(id),
available: () => hooks.hasWindow(id),
take: () => hooks.focusWindow(id),
release: () => hooks.releaseWindow(id),   // clears the pending chord
```

**The `canHold`/`available` split survives untouched in meaning.** Both questions
still have one answer for an editing window, for the same reason they do today:
a window that exists is drawn, and a drawn window has a caret's worth of text to
sit in. There is no editing analogue of the drawer that is drawn and not shown,
so nothing about `iss-2609091858449023`'s settlement changes — `paneOf` and
`reconcile` go on asking `canHold`, `cycle` and `to` go on asking `available`,
and the reason they differ is still the sidebar and the sidebar alone.

`reconcile()` grows exactly one branch. Today it returns early for `editor`
because the editing surface is always there. It still is — but *this* window may
not be, if `C-x 1` ran from a panel:

```ts
if (pane === "editor" && !hooks.hasWindow(focusedWindow)) {
  toWindow(hooks.editorWindows()[0]);
  return;
}
if (pane !== "editor" && !targetFor(pane).canHold()) toEditor();
```

`to(pane)` keeps its signature and `toEditor()` keeps its meaning — "give the
keyboard back to the text" now means "back to the window that last had it". Every
existing caller is therefore unchanged: `sidebar-hide`, `sidebar-quit`,
`onFocusOut`, `showTree`'s reconcile, `app.focus.toEditor()` after a chapter
opens. A new `toWindow(id): boolean` is what the seven new rows and `cycle` use.

**What `paneOf` returns for an element in the third of four editing windows: it
returns `"editor"`.** The pane *kind* is what every one of its callers wants —
`onFocusIn` to `adopt`, `reconcile` to decide whether a pane went away, the
modeline to name where the keyboard is. Which window is a second question, and it
is kept apart from the first exactly the way `canHold` and `available` are kept
apart, and for the same reason: two questions that differ in one case must not
share one answer. So a sibling appears beside it:

```ts
/** Which editing window an element sits in, or null for anything else. */
function windowOf(landed: Node | null): WindowId | null;
```

`onFocusIn` calls both and `adopt` takes both: `adopt("editor",
windowOf(landed))`. `windowOf` walks the window records and asks
`window.element.contains(landed)`, and because each leaf's element contains that
window's whole `view.dom` — content and CodeMirror's own search panel alike — the
"the whole surface, not only the content" rule that `iss-2609091858449023` left
behind holds per window without being restated. `hooks.editorContent` and
`hooks.editorSurface` are replaced by the one hook `hooks.editorWindowOf(node)`,
and `paneOf` returns `"editor"` when it is non-null. The order of precedence is
unchanged: open panels are asked first, so a panel drawn inside a window's
subtree is still the panel's.

Exclusivity is unchanged and, if anything, easier to see. `focusedWindow` is one
id. `answering()` still returns `[]` while `pane === "editor"`, so the
document-level capture reader answers nothing at all while any editing window
holds the keys, and the Emacs extension is a view plugin that only sees a keydown
in a `contentDOM` with DOM focus — of which there is exactly one. The intent's
falsifier, "if any chord is ever answered by two editing windows in one
keypress", is structural rather than defended.

The seven new rows are `editor` scope and are answered by the editing surface
only; `answering()` does not offer them to the sidebar or to a panel. `C-x C-s`
already behaves that way in the tree today, so this is the existing rule rather
than a new limit, and it is named here so a fidelity review does not read it as
an omission.

The module doc comment is rewritten rather than amended, as the ADR requires:
"three panes in one fixed order" becomes "three *kinds* of pane in one fixed
order, the first of which is a tree of editing windows".

### Layout

`.editor-pane` stays the `<main>` and becomes the tree's host. Every node in the
grid carries `min-width: 0; min-height: 0` — the same declaration `.editor-pane`
already carries, and for the same reason, which is that a flex child's default
`min-width: auto` refuses to shrink below its content and would push the grid
sideways.

```css
.window-split {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
.window-split[data-direction="columns"] { flex-direction: row; }
.window-split[data-direction="rows"] { flex-direction: column; }

/* A child's share of the axis: grow by its share, from a basis of nothing, so
   the shares alone divide the space and no child's content bids for width. */
.window-split > .editor-window,
.window-split > .window-split {
  flex: var(--share, 1) 1 0;
}

.editor-window {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  /* A border and not an outline: it takes its space in the layout, so the
     focused window does not change size when it takes the keyboard. */
  border: 1px solid transparent;
}
.editor-window[data-focused="yes"] { border-color: var(--accent); }

/* Nothing draws a caret in a window that is not focused — CodeMirror's own
   drawSelection hides it — but the active line is decorated whatever the
   focus, and two highlighted lines read as two windows listening. */
.editor-window[data-focused="no"] .cm-activeLine { background: transparent; }

.window-divider {
  flex: 0 0 6px;
  background: var(--rule);
}
.window-split[data-direction="columns"] > .window-divider { cursor: col-resize; }
.window-split[data-direction="rows"] > .window-divider { cursor: row-resize; }
```

The shares reach CSS as a custom property, `--share`, written on each child. That
is one write per child per reshape, and one per child per `pointermove` during a
drag.

Resizing by pointer. Each divider carries `role="separator"` and an
`aria-orientation`, and is **not** in the tab order. That is deliberate and it is
not an accessibility compromise: the keyboard route to a size is the *window's*,
not the separator's — `C-x {`, `C-x }` and `C-x ^` act on the window holding the
keyboard, exactly as every other chord in the application does, so there is
nothing a reader gains by being able to land on a divider. A focusable separator
would be a second way to do one thing, and the two would have to agree about the
floor.

On `pointerdown` the divider calls `setPointerCapture`, records the split
container's measured main-axis extent and the two adjacent children's shares, and
on `pointermove` rewrites those two children's `--share` from the pointer's
delta, clamped through the same `stepShares` floor the chords use. On `pointerup`
it releases the capture and calls `resize` once, so one drag makes one tree.

### The refusal at 390

Criterion 15: "splitting is available at 1280 and 820 CSS pixels, and at 390 the
area is too narrow to divide and the chords say so rather than producing unusable
slivers."

Two constants and one pure function:

```ts
/** The narrowest an editing window may be, in CSS pixels. */
export const MIN_WINDOW_WIDTH = 240;
/** The shortest it may be. */
export const MIN_WINDOW_HEIGHT = 160;
/** The divider between two windows. */
export const DIVIDER_PX = 6;

/**
 * Whether a window of this extent can become two.
 *
 * An extent of nought or less is unmeasured, not narrow, and the division
 * proceeds: jsdom measures every element at nought, and a real engine measures
 * nought for the frame before layout runs. Refusing on an unmeasured surface
 * would make the chord dead in the test harness and dead for one frame at
 * startup, which is a worse failure than a sliver.
 */
export function mayDivide(extent: number, direction: "rows" | "columns"): boolean {
  if (extent <= 0) return true;
  const floor = direction === "columns" ? MIN_WINDOW_WIDTH : MIN_WINDOW_HEIGHT;
  return extent >= floor * 2 + DIVIDER_PX;
}
```

**Why 240 and not a rounder number.** The criterion fixes the floor from three
sides at once: it must refuse at 390 and allow at both 820 and 1280, and
criterion 7 — "a split is itself splittable, to any depth" — has to be
demonstrable at a width the maintainer will actually be testing at. A column
split needs `2 × MIN_WINDOW_WIDTH + 6`, so refusing at 390 requires the floor
above 192 and allowing at 820 requires it at or below 407. Anywhere in that range
satisfies the criterion's letter. What narrows it further is criterion 7: at 1280
with the sidebar shown as a column the editing area is about 1020 and each half
of a `C-x 3` is about 507, so a floor of 320 would need 646 and refuse the
*second* `C-x 3` — and a maintainer pressing `C-x 3` twice at 1280 would
reasonably call criterion 7 unmet. 240 needs 486, which 507 clears. At the
default type size a monospace character is about eight pixels, so 240 is roughly
thirty characters plus the line-number gutter: narrow, deliberately chosen, and
not a sliver. GNU Emacs draws the same line in the same place, with
`window-min-width` and a `split-window-right` that refuses rather than shrinking
below it.

The arithmetic against the three device classes, with the shell's own minimum
inner size of 390 × 420 (`src-tauri/tauri.conf.json`):

- **1280 wide**, sidebar a 260-pixel column: the editing area is about 1020. A
  column split needs 486 and is allowed; each half is about 507. A *second*
  column split inside a half needs 486 and is allowed; each quarter is about 250.
  A third needs 486 and refuses. So two levels of left-and-right division at
  1280, and row division as deep as the height allows — which is the grid the
  press release describes and the width criterion 7 is demonstrated at.
- **820 wide**, sidebar a drawer over the surface: the editing area is 820. A
  column split needs 486 and is allowed; each half is 407. A second column split
  inside a 407-pixel half needs 486 and refuses, which is the honest answer at
  that width; a row split inside it is allowed.
- **390 wide**: 390 < 486, so `C-x 3` refuses — there is no width at which the
  narrowest window the shell allows divides left and right. Height at the 420
  minimum, less the modeline, is about 390: `C-x 2` needs 326 and is allowed
  once, and a second row split inside a 192-pixel half refuses. So at 390 the
  area divides above and below once and never left and right, which is "too
  narrow to divide" in the direction the criterion is about and honest about the
  direction it is not.

The refusal is announced through `hooks.announce`, the one channel every refusal
in the application goes out on: `"Too narrow to divide"` and
`"Too short to divide"` — nineteen characters, well inside `MODELINE_BUDGET`.

A window that is resized *down* below the floor keeps its splits. Emacs deletes
windows that become too small; this does not, because a layout that rearranges
itself while Alice drags the frame is worse than one that stays put, and `C-x 1`
is the one gesture that gives her the room back. The criterion forbids
*producing* slivers, and that is what the guard does.

### Resizing by keyboard

`C-x {` narrows the window holding the keyboard, `C-x }` widens it, `C-x ^`
makes it taller (`cond-2609111105372554`, amended 2026-09-12). Emacs's own
`shrink-window-horizontally`, `enlarge-window-horizontally` and `enlarge-window`,
under Emacs's own chords, and the ids are Emacs's names too — which the table's
`/^[a-z][a-z-]*$/` id rule accepts as written.

**The chords are free, checked the same three ways the layout chords were.** In
the table's notation a chord is spelled from the *physical* key with `S-` for
Shift, because `event.key` moves under Shift and the physical key does not
(`src/keys.ts`, the `CODE_NAMES` comment). So the three chords are `C-x S-[`,
`C-x S-]` and `C-x S-6`, and the table already carries that spelling twice with a
comment naming the US-layout character: `forward-paragraph` is `M-S-]` commented
"`M-}` on a US layout" and `delete-indentation` is `M-S-6` commented "`M-^` on a
US layout". The three new rows follow that precedent exactly, comment included.
None of the three appears in `BINDINGS`; `SUPPRESSED` holds four entries and none
is one of these; and the vendored package binds no `C-x` bracket or digit chord
at all — its complete `C-x` map is `C-x C-p|C-x h`, `C-x C-x`, `C-x C-u`,
`C-x C-l`, `C-x u` (inside the `undo` group), and `C-x r`.

One hazard checked rather than assumed. The package's `findCommand` reads
Control-and-a-digit as the start of a numeric argument before consulting its key
chain, which is what makes `C-x C-0` unreachable and why `swallowedChord` exists
in `src/emacs.ts`. `C-x S-6` is not caught by it: the branch is
`if (modifier == "C-" || data.count)` and the modifier here is `S-`, while `C-x`
sets the chain and not the count. The insert-a-character branch,
`if (!modifier && key.length == 1)`, is skipped for the same reason. And
`getKey` leaves `BracketLeft`, `BracketRight` and `Digit6` as raw codes — its
`specialKey` table carries none of them — which is exactly what
`toPackageChord` produces from `S-[`, `S-]` and `S-6` through its own
`PACKAGE_KEY_NAMES`. That the spelling reaches the package is not only argued: the
two existing rows above are shipped and working.

**The step is one twentieth of the division, as a share.** `RESIZE_STEP = 0.05`,
moved from one child of a split to the adjacent one. A share and not a pixel
count, because the shares *are* the model — `stepShares` needs no measurement to
compute a step, only to know where the floor is — and because a share step is the
same fraction of whatever division it is applied to, so the chord feels the same
in a full-width split and in a nested quarter. Twenty presses traverse a
division, which is the density of Emacs's own chord held down. Emacs's unit is one
text column and its multiplier is `C-u`; Editor honours no count on any row
(§ Scope, Out), so a unit of one column would make the chord useless and a unit of
twenty columns would be an invented number dressed up as a faithful one. One
twentieth of the division is honest about being Editor's own choice.

**Which division moves, and which sibling yields.** The chord walks *up* from the
focused leaf to the nearest ancestor split whose `direction` matches the axis the
chord is about — `columns` for `C-x {` and `C-x }`, `rows` for `C-x ^` — and moves
the divider inside that split, between the ancestor's child that contains the
focused leaf and that child's neighbour. This is Emacs's "nearest relevant
division": in Emacs the selected window's width is a property of the horizontal
combination it sits in, so `enlarge-window-horizontally` inside a vertical
combination resizes the combination, not the window alone.

The neighbour is the **next** child in draw order, and the **previous** one when
the focused branch is last. That is Emacs's own preference, and it makes the pair
symmetric: `C-x }` pushes the divider on the focused window's trailing edge
outward and `C-x {` pulls it back.

Two consequences worth stating because they surprise people, and both are
Emacs's:

- **In a 2 × 2 grid, `C-x }` widens a whole column.** The grid is a `columns`
  split of two `rows` splits; the nearest `columns` ancestor of any leaf is the
  root, so the divider that moves is the one between the two columns and both
  windows in the focused column grow. There is no division that would widen one
  cell of a grid without widening the cell above it, because no such division
  exists in the tree.
- **`C-x }` inside a `rows`-only layout refuses**, because there is no `columns`
  ancestor to move. Likewise `C-x ^` in a `columns`-only layout. The refusal is
  the same one a single window gets, which is how criterion 18 is met without a
  special case for the single-window state: one window has neither ancestor.

**The floor is the one `mayDivide` already uses.** `MIN_WINDOW_WIDTH` and
`MIN_WINDOW_HEIGHT`, converted to a share by the application against the chosen
split's measured extent: `floor = MIN_WINDOW_WIDTH / extent`. A step that would
take the yielding child below the floor is clamped to the floor rather than
refused, so the first press moves to the floor and does something; the next press
moves nothing and says so. An unmeasured extent means no clamp, for the reason
`mayDivide` allows an unmeasured division: nought is jsdom and the first frame,
not a sliver.

**What the chords say.** Every refusal goes out through `announce`, and — unlike
the layout chords — **every success says something too**, briefly, through
`announceBriefly`. A resize has no textual consequence, so a reader working
without sight has no other way to know the chord landed; a silent success and a
silent failure would be the same event. The message is the focused window's new
share as a whole-number percentage, which is computable from the shares alone
with nothing measured:

- success: `Window 2 of 4: 45%` — eighteen characters.
- no such division: `No window beside this one` / `No window above or below this one`.
- at the floor: `This window cannot get any narrower` and its wider and taller
  forms.

All are well inside `MODELINE_BUDGET`, and all are said in the one place every
other refusal in the application is said.

**Shrinking vertically** has no chord, because Emacs binds none — `shrink-window`
exists and is unbound, and `C-u -1 C-x ^` is how Emacs does it. With no numeric
argument the way to make a window shorter is `C-x o` to its neighbour and `C-x ^`
there. That is worth one sentence in the how-to page rather than a fourth chord
the maintainer did not ask for.

### The modeline

The pane cell says `[Editor]` today. With several windows it must say which one,
and it must do so without spending the message's budget.

```ts
/** Which editing window holds the keyboard, of how many. */
window?: { readonly at: number; readonly of: number };
```

```ts
const pane = context.pane ?? "Editor";
const at = context.window;
paneCell.textContent =
  at && at.of > 1 ? `[${pane} ${String(at.at)}/${String(at.of)}]` : `[${pane}]`;
paneCell.dataset["pane"] = pane;
if (at && at.of > 1) paneCell.dataset["window"] = `${String(at.at)}/${String(at.of)}`;
else delete paneCell.dataset["window"];
```

The ordinal in reading order, out of the count. Four reasons it is the ordinal
and not the chapter: the chapter is the very next cell along, and two cells
answering one question is what the modeline's own doc comment forbids; the
ordinal is what `C-x o` moves and so the thing Alice is tracking; it is four
characters where a title is as long as a file name; and it is the number the
manual checklist can be written against.

`context.pane` is unchanged, so `data-pane` is unchanged, and the cell reads
exactly `[Editor]` while there is one window. Every existing assertion in
`src/focus.test.ts` and `src/emacs-keys.test.ts` about `[Editor]`, `[Sidebar]`,
`[Keys]` and `data-pane` holds untouched — the addition is invisible until Alice
splits.

The budget. `MODELINE_BUDGET` is fifty-two characters and it is the *message*'s
floor, not the pane cell's. Above 820 the message holds
`min-width: min(52ch, 100%)` and `.modeline-chapter` is the cell that yields, so
the pane cell's five extra characters are paid for by the chapter title's
ellipsis. At 820 and below the message already has a line of its own and the pane
cell's growth comes out of the line above it, where `.modeline-chapter` is
`flex: 1 1 auto` and elides. So the budget is untouched at every width by
construction, and `src/prose.test.ts`'s existing assertion that the floor's `ch`
value is `MODELINE_BUDGET` goes on holding.

The cell is not a live region and does not become one. It changes on every
`C-x o`, which is a move Alice made; what she needs announced is the window she
arrived in, and that is the region's own label, below.

### What assistive technology hears

Each window is a labelled region:

```html
<section class="editor-window" role="region"
         aria-label="Alice" data-focused="yes" data-window-id="w3">
```

`aria-label` is the chapter's title, or `Editor` for a window on the welcome
text. So moving the keyboard into a window announces the region and the chapter
it shows, which is criterion 15's "each window is announced as a region with the
chapter it shows". And "the focused window is discoverable without sight" is
answered twice over: focus itself lands in a named region, and the footer's pane
cell says which of how many.

`aria-current` was declined. Focus is the semantics — exactly one window has the
keyboard, and that is what `document.activeElement` already says — and a second
attribute claiming the same thing is a second answer to one question.

The dividers are `role="separator"` with an `aria-orientation` and no tab stop,
which is the correct role for a static separator and an honest one: there is no
keyboard route to them.

### The drop gesture

`createDropTarget` binds `paste` on `view.contentDOM` and `drop` on `view.dom`
at mount, and its `insideSurface`/`offsetAt` are geometric. With N windows those
listeners have to resolve which window the gesture landed in.

The listeners move from one view to the tree host, in one place, and the target is
resolved from the event: a paste goes to the focused window, because that is where
the keyboard is; a drop goes to the window under the pointer, because that is
where Alice aimed. `createDropTarget`'s options change from `view: EditorView` to

```ts
readonly host: HTMLElement;
focused(): EditorView;
windowAt(x: number, y: number): EditorView | null;
```

and `main.ts`'s one call changes with it. No new extension point on `App` is
needed and no per-window registration: one drop target for the whole editing
area, which is what it already is conceptually.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| One window with the caret in a chapter → `C-x 3` divides left and right, both windows show that chapter, the keyboard stays where it was, and the caret has not moved | `src/windows.test.ts` › "splits a leaf into two, keeping the focused window's identity first" (the focused leaf's `WindowId` is the first child and is unchanged, which is the whole mechanism); `src/document.test.ts` › "shows the same chapter in both windows when the area divides" (two `.editor-window` elements, both buffers the same path, `data-direction="columns"`); `src/document.test.ts` › "keeps the caret and the keyboard in the window that divided" (`focus.window` and `cursorPosition` before and after are identical). **Pixels are M42-1**: jsdom has no layout, so "divides left and right" is proven here as structure plus the stylesheet's own `flex-direction: row`, and as geometry only in a real engine |
| One window → `C-x 2` divides above and below with the same guarantees | the same three tests, `data-direction="rows"`; pixels M42-1 |
| Two windows on one chapter → typing in one makes the text appear in both in the same frame, and the other window's caret keeps its own position | `src/document.test.ts` › "shows an edit made in one window in the other in the same transaction" — the assertion is read with no timer advanced and no microtask flushed, which is stronger than "the same frame": the echo goes out inside the originating `dispatchTransactions`; `src/document.test.ts` › "keeps the other window's caret where it was when Alice types" (an insertion after the other caret leaves it at the same offset; a separate case asserts an insertion *before* it moves it along by the inserted length, which is `Transaction.newSelection`'s mapping and is what an author expects) |
| Two windows on one chapter at different positions → `C-x o` between them restores each window's own position independently | `src/document.test.ts` › "restores each window's own position when the keyboard moves between them"; `src/document.test.ts` › "opens a chapter at this window's own remembered position, not another window's" covers the case where a window has shown something else in between (`window.points`) |
| Two windows → opening a different chapter in one leaves the other untouched and still showing what it showed | `src/document.test.ts` › "leaves the other window untouched when a chapter is opened in one" (the other window's buffer, text and caret offset are all unchanged, and its `savedText` is untouched) |
| Several windows on different chapters → `C-x C-s` saves the chapter in the window holding the keyboard and writes no other file | `src/document.test.ts` › "saves the chapter in the window holding the keyboard and writes no other file" — three windows on three chapters, `writeChapter` spied, asserted called exactly once and with the focused window's path. Then the same test moves the keyboard with `C-x o` and saves again, asserting the second write is the *other* path. This is the criterion the intent calls falsifiable in the worst way, so it is also run through `M-x` and through the prefix overlay in "saves the focused window's chapter however the row was reached", because those routes have no originating view and are where a half-done scoping would show |
| A split window → `C-x 3` again inside one half divides that half, to any depth | `src/windows.test.ts` › "nests a split inside a split, to any depth" (a four-deep tree, and `leafIds` length); `src/focus.test.ts` › "divides the half that holds the keyboard and not the whole area". Unbounded depth is a property of the tree; on a real screen the depth is bounded by `mayDivide`, and § The refusal at 390 sizes the floor so that two levels of left-and-right division are reachable at 1280 — M42-1 is where that is seen |
| Three windows, keyboard in the second → `C-x 1` leaves that window alone, the other two close, and nothing in the document is changed or saved | `src/windows.test.ts` › "closes every window but the one that is kept"; `src/document.test.ts` › "changes and saves nothing when the other windows close" (`writeChapter` not called, every buffer's text and `savedText` unchanged, the surviving window's caret unmoved) |
| Three windows, keyboard in the second → `C-x 0` closes it, its space goes to the rest, and the keyboard moves to an adjacent window | `src/windows.test.ts` › "closes a window and gives its share to its siblings" and "collapses a split that is left with one child"; `src/focus.test.ts` › "moves the keyboard to an adjacent window when the focused one closes". The *shares* are proven as numbers here and as pixels in M42-3 |
| Exactly one editing window → `C-x 0` closes nothing and the modeline says so | `src/windows.test.ts` › "refuses to close the only window"; `src/focus.test.ts` › "says so rather than closing the only window" (the message cell's text, and the announcement count moving, so a reader hears it) |
| Two editing windows and a sidebar with rows shown → `C-x o` repeatedly visits the second window, then the sidebar, then back to the first | `src/focus.test.ts` › "walks the editing windows in reading order, then the sidebar, then the panel" (the full round trip over two windows, a shown sidebar and an open panel, asserting the pane *and* the window at each step); `src/focus.test.ts` › "never visits the sidebar before a second editing window that is shown" is the intent's own falsifier written as a test |
| Two editing windows → `C-n` moves exactly one window's cursor, and the modeline names the window that has the keyboard | `src/focus.test.ts` › "answers a chord in exactly one editing window" (the other window's `selection.main.head` is byte-identical before and after, and the assertion is made for `C-n`, for a self-inserted character and for `C-x C-s`); `src/modeline.test.ts` › "names the focused window and how many there are once the area is divided" |
| The keys panel open → rows for `C-x 2`, `C-x 3`, `C-x 0` and `C-x 1` are listed with their labels | `src/keyspanel.test.ts` › "lists the seven window chords with their labels"; the existing `src/keyspanel.test.ts` › "lists every binding the table carries" covers it structurally with no new test at all, and `src/prefix-help.test.ts` › "lists the window chords under `C-x`" proves they appear in the prefix overlay too, which is the second surface that reads the table. The criterion names four chords; seven rows are added, and the three resize rows are listed by the same mechanism without the criterion asking — a row in the table is a row in the panel, which is the point of the table |
| A window holding unsaved edits → `C-x 0` does not lose them; the chapter's state outlives the window | `src/document.test.ts` › "keeps a chapter's unsaved edits when the window showing it closes" — edit in the only window on a chapter, `C-x 0` from a second window is impossible so the test closes the *second* window and then the first by `C-x 1` elsewhere, reopens the chapter with `C-x b`, and asserts the text and the caret came back; `src/document.test.ts` › "asks nothing before closing a window" asserts `confirmDiscard` was never called, which is the property stated as a negative |
| Two windows side by side → `C-x }` grows the window holding the keyboard and shrinks its sibling by the same amount, and no window falls below a usable minimum | `src/windows.test.ts` › "moves one step of share from the next sibling to the focused window" (the two shares change by `RESIZE_STEP` in opposite directions and every other share is untouched, which is "by the same amount" as an equality rather than as a description); `src/windows.test.ts` › "will not take a sibling below the usable minimum" (clamped to the floor, then a second step returns null); `src/focus.test.ts` › "widens the window holding the keyboard and no other". Pixels are M42-8 |
| Two windows side by side → `C-x {` shrinks the window holding the keyboard and grows its sibling | `src/windows.test.ts` › "moves one step of share the other way when the window narrows" — the same function with `widen` false, which is why the two chords cannot disagree about the step or the floor; `src/focus.test.ts` › "narrows the window holding the keyboard and no other" |
| Two windows stacked above and below → `C-x ^` makes the window holding the keyboard taller and its sibling shorter | `src/windows.test.ts` › "resizes the nearest rows division for the taller chord"; `src/focus.test.ts` › "makes the window holding the keyboard taller and no other". The row that proves the *axis* rule rather than the chord is `src/windows.test.ts` › "walks up to the nearest division on the chord's own axis", which asserts that in a 2 × 2 grid the widening chord moves the root's divider and the taller chord moves the focused column's |
| Exactly one editing window → `C-x {`, `C-x }` or `C-x ^` resizes nothing and the modeline says so | `src/windows.test.ts` › "finds no division to move with a single window" (`resizeTarget` returns null for all three axes, which is the same answer a `rows`-only layout gives the widening chord — one rule, no special case); `src/focus.test.ts` › "says there is no window beside this one" and "says there is no window above or below this one", both asserting the message cell's text and that the announcement count moved so a reader hears it |
| Two windows on one chapter, an edit made in the first → `C-/` in the second undoes nothing, and `C-/` in the first undoes it in both | `src/document.test.ts` › "undoes nothing in the window that did not make the edit" (window B's document is byte-identical before and after `C-/`, and so is window A's — the echo carried `Transaction.addToHistory.of(false)`, so B's history is empty); `src/document.test.ts` › "undoes in both windows when the window that made the edit undoes" (the undo is a change like any other and is echoed). A third case pins the mapping that makes this safe rather than merely quiet: `src/document.test.ts` › "undoes the second window's own older edit at the right place after the first window has typed" — B edits, A types before B's edit, `C-/` in B removes B's edit and nothing else, which is `addMapping` working. Settled behaviour per `cond-2609120405528253`, not a defect |
| Inherited: one source, always; legible on three device classes; reachable by assistive technology | **one source**: `src/windows.test.ts` › "walks the leaves in reading order" is the one order `C-x o` and the DOM both come from; `src/emacs-keys.test.ts`'s existing table sweeps prove the seven chords come from `BINDINGS` and from nowhere else; `src/document.test.ts` › "keeps the two windows' text equal through a run of edits" proves one text per chapter through fifty interleaved edits and is the canary § Risks names. **three device classes**: `src/windows.test.ts` › "refuses to divide an extent too narrow for two windows" and "allows a division when the extent is unmeasured" prove the arithmetic; the widths themselves are M42-4, because jsdom measures every element at nought and evaluates no media query. **assistive technology**: `src/focus.test.ts` › "announces each window as a region named by the chapter it shows" (`role="region"`, `aria-label`); the footer half is `src/modeline.test.ts` › "names the focused window"; the sizes half — the discipline the maintainer chose to meet rather than narrow — is `src/focus.test.ts` › "says what each resize chord did", asserting that all three announce the new share on success as well as the refusal on failure, so a chord that landed and a chord that did not are distinguishable without sight; real VoiceOver output is M42-5 |

### What jsdom genuinely cannot prove

Said plainly, because half of this feature is geometry and the spec should not
pretend otherwise.

- **That a split looks like a split.** jsdom has no layout engine and
  `src/test-setup.ts` fakes a monospace grid in an 800 × 600 viewport for
  CodeMirror's sake alone. "Divides left and right" is proven as a `data-direction`
  attribute, an element order, and a stylesheet rule read as text. That the two
  halves are actually side by side, of equal width, and that neither is a sliver,
  is M42-1.
- **The refusal at 390, and the availability at 820 and 1280.** Every element
  measures nought, so `mayDivide` would refuse every split under test — which is
  why an unmeasured extent allows the division. The arithmetic is a unit test
  over a pure function; the widths are M42-4. This is the same division the cat
  spec drew between a budget and a measurement.
- **Resizing, in pixels.** The *arithmetic* is fully provable, and that is most
  of it: `resizeTarget` and `stepShares` are pure, so which divider moves, which
  sibling yields, the axis walk, the step and the floor are all unit tests. What
  jsdom cannot show is that a share of 0.45 draws as 45 per cent of the
  division, that the floor lands where a window is still usable, and that the
  drag tracks the pointer. Those are M42-3 and M42-8. Note that the floor is not
  even *consulted* under test, because an unmeasured extent means no clamp — so
  the clamp is exercised by passing a floor directly, and its real-world value is
  manual.
- **That a re-parented view survives a reshape.** jsdom will happily move a
  `.cm-editor` between parents and report nothing wrong. Whether WebKit blurs it,
  whether the height map needs re-measuring, and whether the caret is still drawn
  is M42-2.
- **The focused window's border, and the unfocused window's quiet active line.**
  CSS, read as text at best. M42-1.
- **VoiceOver.** M42-5.

### Manual checks

Recorded as an unticked checklist in
`.abcd/.work.local/logs/acceptance/spc-2609111105376860.md`.

- **M42-1** — the grid at 1280: `C-x 3` and `C-x 2` draw two windows of equal
  extent, the focused one bordered, nothing scrolls sideways, and a four-window
  grid is four windows and not three and a gap.
- **M42-2** — the reshape: split four ways, then `C-x 0` and `C-x 1` from
  various windows; every surviving window still draws its text, still scrolls,
  still shows a caret where it had one, and the keyboard is where the chord
  promised.
- **M42-3** — the drag: every divider resizes the two windows beside it, stops at
  the floor rather than making a sliver, and the sizes survive a subsequent
  split and close.
- **M42-4** — the three widths: splitting at 1280 and 820; at 390 `C-x 3`
  refuses and the modeline says so, unclipped and on its own line.
- **M42-5** — VoiceOver: `C-x o` round the windows announces each region with
  its chapter; the footer's ordinal is readable; each resize chord announces what
  it did and each refusal is spoken; nothing announces on every keystroke.
- **M42-6** — the same chapter twice, by hand: type in one window and watch the
  other; type inside a pipe table and watch both; check a figure number in one
  while writing in the other, which is the press release's own scene.
- **M42-7** — `C-x C-s` with three chapters in three windows, checked against
  the files on disk with `git status`, from the keyboard and from `M-x`.
- **M42-8** — the resize chords: `C-x {`, `C-x }` and `C-x ^` move the divider by
  a twentieth of the division, stop at a floor where the window is still
  readable, widen a whole column in a 2 × 2 grid, refuse on the wrong axis, and
  say what they did. Then interleave them with the drag and confirm the two agree.

## Tasks

1. `src/windows.ts`: the types, `leafIds`, `splitWindow`, `closeWindow`,
   `closeOtherWindows`, `resize`, `resizeTarget`, `stepShares`, `mayDivide`,
   `RESIZE_STEP` and the three constants. No DOM.
   Verify: `npx vitest run src/windows.test.ts`.
2. `src/keys.ts`: seven rows, `group: "panes"`, `owner: "app"`, placed
   immediately after `other-window` so the window vocabulary reads together.
   Four for the layout — `split-window-below` (`C-x 2`), `split-window-right`
   (`C-x 3`), `delete-window` (`C-x 0`), `delete-other-windows` (`C-x 1`) — and
   three for the sizes — `shrink-window-horizontally` (`C-x S-[`),
   `enlarge-window-horizontally` (`C-x S-]`), `enlarge-window` (`C-x S-6`), each
   with the comment naming its US-layout character, in the shape
   `forward-paragraph` and `delete-indentation` already use. Ids carry no digits
   and no braces, which the table's own guard requires.
   Verify: `npx vitest run src/emacs-keys.test.ts -t "the binding table"` and
   `npx vitest run src/keyspanel.test.ts`.
3. `src/editor.ts`: the `echoed` annotation, `attach(parent, state, peers)`, and
   a `stateFor` that can be handed an existing document. `createEditor` becomes a
   thin caller of `attach`. Verify: `npx vitest run src/editor.test.ts` if one is
   added, otherwise step 7's document tests.
4. `src/focus.ts`: the rewritten doc comment, `Step`, `steps()`,
   `editorTargetFor`, `windowOf`, `toWindow`, the `focusedWindow` that is never
   null, `adopt`'s second argument, `reconcile`'s new branch, and the hooks
   change (`editorWindowOf`, `editorWindows`, `hasWindow`, `focusWindow`,
   `releaseWindow` replacing `editorContent`, `editorSurface`, `focusEditor`).
   Verify: `npx vitest run src/focus.test.ts`.
5. `src/emacs.ts`: seven ids in `APP_COMMAND_IDS`, `clearPending`, and the
   rewritten "One window, one application" paragraph.
   Verify: `npx vitest run src/emacs-keys.test.ts`. The sweep at
   `emacs-keys.test.ts:796` presses every step of every modified chord the page
   owns, so the three `S-` chords are pressed for real there — which is where a
   notation mistake in `toPackageChord` would surface.
6. `src/app.ts`, in this order so the file compiles at each step: the
   `ChapterBuffer` map and `bufferText`/`isDirty`/`anyDirty`; the
   `EditorWindow` map and the tree; `here()`/`view()` and the mechanical
   rewrite of `commands`; the four layout command entries; the render; the
   `points`/`lastPoint` replacement of `chapterCursors`; `openChapter`,
   `save`, `reload`, `forgetChapter` and `quit` rewritten against buffers;
   `App.view` and `App.chapterPath` as getters.
   Verify: `npm run lint` then `npx vitest run src/document.test.ts`.
7. `src/document.test.ts` and `src/focus.test.ts`: the tests named in
   Acceptance Mapping. Write "keeps the two windows' text equal through a run of
   edits" and "realigns a table once, not twice, when two windows show one
   chapter" **first**, before the rest — they are the canaries § Risks names, and
   they are worth more failing early than passing late. The three undo tests for
   criterion 19 belong here too, and they pin settled behaviour
   (`cond-2609120405528253`) rather than guarding against a defect, which is
   worth a comment in the test so nobody later reads a passing assertion as a bug.
   Verify: `npx vitest run src/document.test.ts src/focus.test.ts`.
8. `src/modeline.ts` and `src/modeline.test.ts`: the `window` context field and
   the two tests. Verify: `npx vitest run src/modeline.test.ts`.
9. `src/style.css`: the grid, the dividers, the focused border, the quiet
   active line. Verify: `npm run lint`, then M42-1.
10. The divider's pointer handling, in `src/windows.ts`'s renderer or a small
    `src/window-grid.ts` if the renderer outgrows the module, clamped through
    `stepShares`'s floor rather than through a second one. Verify: M42-3.
11. The three resize commands in `src/app.ts`: measure the split `resizeTarget`
    chose, convert the floor to a share, call `stepShares` and then `resize`, and
    announce — the new percentage briefly on success, the refusal on either kind
    of failure. Written after task 10 so both routes share one floor by
    construction. Verify: `npx vitest run src/focus.test.ts`, then M42-8.
12. `src/drop-target.ts` and `src/main.ts`: the host-level listeners and the
    changed call. Verify: `npx vitest run src/drop-target.test.ts`.
13. The seven chords enter `docs/`. `docs/how-to-find-and-change-the-keys.md` and
    `docs/spike-emacs-keys.md` are the two pages that name `C-x o` today, and
    neither is the page that teaches splitting: the first is a how-to about the
    binding table and the second is the spike's own record. So splitting wants a
    page of its own, `docs/how-to-split-the-editing-area.md`, one Diátaxis type
    (how-to), present tense, British English, no change narration — and one
    sentence added to `docs/how-to-find-and-change-the-keys.md` where it names
    the pane cycle. The page carries three things the chords alone do not teach:
    that undo is per window, that a window is made shorter by growing its
    neighbour, and that in a grid the widening chords move a whole column.
    Verify: `npm run lint`, which runs the docs-currency check.
14. Row 42 in `.abcd/development/brief/07-intent-map.md`, a line in
    `.abcd/work/DECISIONS.md` for each decision this spec made, and the manual
    checklist. Verify: read-through, then the full gate list:
    `npm test && npm run lint && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo fmt --manifest-path src-tauri/Cargo.toml --check`.

## Risks and Open Questions

**The riskiest part of this build is the echo — two windows' texts drifting
apart — and the sharpest way it drifts is `alignTables`.** Everything else here
is a refactor with a test; this is the one place where the failure mode is a
corrupt file. `src/tables.ts` is the only extension in the codebase that writes a
document change the author did not type (`adr-2609092000099546`), and it does it
through an `EditorState.transactionFilter`. Without `filter: false` on the echo
the two texts diverge and whichever window `C-x C-s` then reads becomes the file.

*(Amended 2026-09-12. This paragraph originally said the divergence happens when
"typing inside a pipe table in window A appends one realignment in A and a second
in B … from that keystroke onward". That mechanism is too broad and the build
proved it so: an ordinary keystroke inside a table is echoed **with** the
origin's realignment already in it, so the peer recomputes an empty change and
the texts agree — with the option and without it. The canary written against the
original wording therefore passed either way, and was briefly recorded as showing
`filter: false` to be a guard against an unreachable failure. That conclusion was
itself wrong, and `iss-2609120518323764` carries the correction. The divergence is
real but narrower: it needs a transaction that **touches the table and carries no
realignment**, so that the peer realigns where the origin did not. Four reachable
cases — an undo (`userEvent: undo` stops the origin; the unmarked echo does not
stop the peer), the origin's caret on the delimiter row, a multi-cursor edit, and
a paste ending outside the table. The plainest is the undo, which needs nothing
unusual of an author: a ragged table, one character, `C-/`. A caret in padding is
not a case, the gutter being unchanged. `filter: false` is load-bearing, and the
shipped canary now uses the undo case so its removal fails a test rather than
starting an argument.)* **What would show it
failing early**, and the reason task 7 writes these two tests first: the library
refuses to let the drift stay silent. `ChangeSet.of` throws
`RangeError("Mismatched change set length")`
(`node_modules/@codemirror/state/dist/index.js:964-965`) on the *next* echo after
the lengths disagree, so a test that makes fifty interleaved edits across two
windows and one that types inside a table will both throw on the second
keystroke rather than passing and shipping a corrupt save. A `console.assert` on
`peer.state.doc.length === view.state.doc.length` after each echo is worth
keeping in the shipped code for the same reason.

The second risk in the same place is **asynchrony**. There is no rebasing —
`@codemirror/collab` is not installed — so the echo must be synchronous inside
the originating dispatch. Any future change that defers it, even by a microtask,
reintroduces the interleaving the length guard then reports as a crash. This
wants a comment at the call site saying so, not only a line in this spec.

**`C-x C-s` writing the wrong file** is the second-riskiest thing and the
cheapest to prove. It is one test with a spy and an assertion on the path, run
from the keyboard and from `M-x`, and it should be written before the command
rewrite rather than after it.

**Re-parenting views on reshape** is the risk that only a real engine can show.
jsdom will move a `.cm-editor` between parents without complaint. What may go
wrong in WebKit is a blurred content element, a stale height map, and a caret
that is not drawn until the next keystroke. The mitigations are in the design —
`requestMeasure()` on every survivor, `view.focus()` on the focused window last —
and M42-2 is what proves them.

**The three `S-` chords are a notation risk, and a small one.** `C-x S-[`,
`C-x S-]` and `C-x S-6` have to survive `toPackageChord` into
`C-x S-BracketLeft`, `C-x S-BracketRight` and `C-x S-Digit6`, and the vendored
package's own reader has to produce the same strings. § Resizing by keyboard
traces both halves through the real code, and two rows already in the table —
`M-S-]` and `M-S-6` — are shipped and working on the same spelling, which is
stronger than the trace. What makes it a risk at all is that the failure is
silent: the chord is claimed, the command is registered, and nothing happens.
`emacs-keys.test.ts:796` presses every step of every modified chord the page owns,
so it is caught by the existing sweep the moment the ids enter `APP_COMMAND_IDS`
— which is why task 5 verifies with the whole file rather than one test.

**The size of the `src/app.ts` change is itself a risk.** The file is 1432 lines
and this touches the document session, the editing session, the command map and
the mount. Task 6's ordering exists so the file compiles at each step, and the
`view()` getter exists so that sixty call sites change by one character rather
than by a signature.

### Nothing here is blocked

An earlier draft of this spec put three questions to the maintainer. All three
are answered, on 2026-09-12, and they are recorded below as settled rather than
left standing as risks — the build is unblocked.

**Settled — undo is per window.** `cond-2609120405528253`, and the cost is named
in `adr-2609091832455881`'s amended decision 2. Accepted in preference to routing
every undo chord through an application-held canonical state, which is larger
than the rest of this design and cuts across `adr-2609092000099546`'s rule that
one undo takes an author's keystroke and the table realignment appended to it
back together. Confusing the first time, never destructive: every edit sits in
exactly one window's history and every history is mapped through every echoed
change, so the failure mode is a chord that appears to do nothing rather than one
that loses work. § Undo is per window designs it, criterion 19 pins it, and the
how-to page tells Alice before she meets it. **No code is written for it** — it is
what happens when the rest of the design is built correctly.

**Settled — the resize chords are bound.** `cond-2609111105372554`, amended
2026-09-12. The tension was real: this intent asks for the feature to be operable
without sight while its own scope condition ruled the resize vocabulary out, and
the two could only be reconciled by narrowing the criterion to the windows alone
or by binding the chords. The maintainer chose the chords, which is the reading
that meets the discipline rather than trimming it. § Resizing by keyboard designs
`C-x {`, `C-x }` and `C-x ^`; four criteria cover them; and the design needed no
reshaping to accept them, because `resize` was already a pure function over the
tree and took no pointer.

**Settled — the discard prompt ships unchanged, and the inconsistency is
captured as `iss-2609111123510084`.** `openChapter` asks `confirmDiscard("… has
unsaved edits. Discard them?")` today and it is a shipped promise
(`itd-2609051335399446`, with tests in `src/document.test.ts`). Once buffers
outlive windows, switching a window from one chapter to another discards nothing:
the first chapter's edits are still in its buffer, so the question is asked about
a loss that no longer happens. The honest fix is to stop asking for a chapter
switch while still asking when a different *document* is opened, where buffers
really are dropped — but that amends a shipped intent's acceptance criterion, and
this repository's rule is that such an amendment is its own record with its own
quoted text and date. So the prompt is left exactly as it is here, the issue
carries the work, and the fix cites the issue rather than arriving inside this
spec's diff.

### Smaller things worth naming

- **Quitting and closing now ask about every dirty buffer.** With buffers
  outliving windows, "is there unsaved work" stops being a question about one
  chapter. `reportDirty`, `confirmClose` and `C-x C-c` ask `anyDirty()`, and the
  question names the chapter when one buffer is dirty and the count when more
  than one is. This follows from criterion 14 rather than being added to it, but
  it is a widening the ADR does not mention.
- **`reload()` grows a loop.** Its three cases now apply per buffer. The
  announcement stays the focused buffer's, with a count when more than one
  changed.
- **The sidebar highlights the focused window's chapter.** `sidebar.select` is
  called when the keyboard moves between windows, which is the only sensible
  answer and a behaviour nothing tests today.
- **Two windows on one chapter hold two `Text` ropes.** Structurally equal,
  separately allocated. Immaterial at the sizes involved, and the cost of the
  only design the installed library admits.
- **The seven chords are answered by the editing surface only**, not from the
  sidebar or a panel, exactly as `C-x C-s` is today. A later record may widen
  them; this one matches the existing rule rather than inventing a second one.
- **Splits nest rather than flatten.** `C-x 3` three times gives a column, then
  a nested column inside its right half — Emacs's own behaviour, where only the
  window being divided changes size. Flattening into three equal columns was
  declined because it moves windows Alice did not ask to move.
- **The resize chords are the one pair of rows in the table whose success says
  something.** Every other row is silent when it works and speaks when it
  refuses. These speak either way, because a resize has no textual consequence
  and a reader without sight would otherwise be unable to tell a chord that
  landed from one that did not. `announceBriefly` is the existing mechanism —
  the type-scale rows already use it for the same reason — so this is a
  precedent followed, not a new channel.
- **A widening chord in a grid moves a whole column, and that is Emacs.** No
  division in the tree would widen one cell without widening the cell above it,
  because no such division exists. The how-to page says so; the design does not
  invent one.
- **Shrinking vertically has no chord of its own**, because Emacs binds none.
  Without a numeric argument the route is `C-x o` to the neighbour and `C-x ^`
  there.
