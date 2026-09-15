/**
 * The editing surface: CodeMirror 6 with Markdown support and Emacs bindings.
 */

import { history } from "@codemirror/commands";
import { insertNewlineContinueMarkup, markdown } from "@codemirror/lang-markdown";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { closeSearchPanel, search, searchPanelOpen } from "@codemirror/search";
import {
  Annotation,
  EditorSelection,
  EditorState,
  Prec,
  StateField,
  Transaction,
  type Extension,
} from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";

import {
  bibliographyField,
  citationCompletionField,
  citationCompletionKeymap,
  citationHoverTooltip,
} from "./citations";
import { codemirrorKeymap, emacsKeymap } from "./emacs";
import { bindingById, chordFromEvent, toKeymapSpec } from "./keys";
import { outlineExtensions } from "./outline-commands";
import { alignTables } from "./tables";
import { fontSizeFor, textScaleExtension, textScaleStep } from "./text-scale";

/** Where the cursor is, one-based, for the modeline. */
export interface CursorPosition {
  readonly line: number;
  readonly column: number;
}

/** How the editor reports itself to its host. */
export interface EditorHooks {
  /** Called after every transaction, so the modeline can follow the cursor. */
  onChange?(view: EditorView): void;
}

const theme = EditorView.theme({
  // The size the surface opens at is named once, in `src/text-scale.ts`, so
  // the restore chord and this rule cannot disagree about what "default" is.
  "&": { height: "100%", fontSize: fontSizeFor(0) },
  ".cm-scroller": {
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    lineHeight: "1.6",
  },
  ".cm-content": { padding: "12px 0" },
});

/**
 * Give `Return` back to the Markdown keymap.
 *
 * The Emacs keymap binds `Return|C-m` to a plain newline, and it outranks
 * everything (see below), so pressing Return at the end of `- item` would
 * insert a bare line rather than continuing the list. This handler sits above
 * the Emacs plugin in the same precedence and takes an unmodified `Return`
 * when — and only when — the Markdown command has something to continue.
 * Anywhere else it declines and the Emacs newline runs as before.
 */
const markdownReturn = EditorView.domEventHandlers({
  keydown(event, view) {
    if (event.key !== "Enter") return false;
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      return false;
    }
    const continued = insertNewlineContinueMarkup({
      state: view.state,
      dispatch: (transaction) => {
        view.dispatch(transaction);
      },
    });
    if (continued) event.preventDefault();
    return continued;
  },
});

/**
 * How long after an Option keydown a composition still counts as its doing.
 *
 * Short, because the window also blocks ordinary typing: a character typed
 * inside it is either the accent macOS was about to compose or a keystroke the
 * author will not notice losing at that speed.
 */
const META_COMPOSE_WINDOW_MS = 250;

/** The Option keydowns the guard below claimed, so the key log can say so. */
const guarded = new WeakSet<KeyboardEvent>();

/**
 * Whether a keydown reached the bottom of the editor unanswered and was
 * claimed only to stop Option composing a character.
 *
 * `defaultPrevented` alone cannot tell the two apart, and the spike's whole
 * verdict is "did the editor act on it", not "did anything stop the browser".
 */
export function metaGuarded(event: KeyboardEvent): boolean {
  return guarded.has(event);
}

/**
 * When the last Option keydown that could compose was seen, or `-Infinity`.
 *
 * It is set by an observer rather than by the guard below, because an observer
 * runs on every keydown whether or not a command claimed it. That is what makes
 * the window shut on the next ordinary key: an author who types a letter
 * straight after `M-f` gets the letter, because by then the composition events
 * can only belong to the letter.
 */
let lastMetaKeydown = -Infinity;

/**
 * Whether this keydown is one macOS would turn into text.
 *
 * A one-character `key` is the character itself; `Dead` is the accent keys —
 * Option-e, Option-u, Option-i, Option-n, Option-` — which fire a keydown with
 * a real `code` and no character yet, and start composing on the next key.
 * Everything longer is a named key (`ArrowUp`, `Backspace`) that produces no
 * text and must be left to the keymaps that bind it with Option.
 */
function producesText(event: KeyboardEvent): boolean {
  return (
    event.key === "Dead" ||
    event.key === "Unidentified" ||
    [...event.key].length === 1
  );
}

/**
 * Option is Meta, so an Option chord never becomes text.
 *
 * On macOS Option is also the character-composition key: Option-f is `ƒ`,
 * Option-d is `∂`, and Option-e, -u, -i, -n and -` are dead keys that start an
 * accent. An editor that reads Option as Meta cannot also let it type, so this
 * handler claims any Option keydown that would produce a character or begin a
 * composition, and cancels the composition events that follow if the engine
 * starts one anyway.
 *
 * It sits at the lowest precedence on purpose. CodeMirror's dispatch stops at
 * the first handler that claims the event, and it stops early on an event whose
 * default is already prevented, so a guard above the Emacs plugin would take
 * every Option chord away from the commands it belongs to. At the bottom it
 * sees only what nothing else answered.
 */
const metaKeys = [
  EditorView.domEventObservers({
    keydown(event) {
      lastMetaKeydown =
        event.altKey && producesText(event) ? Date.now() : -Infinity;
    },
  }),
  Prec.lowest(
    EditorView.domEventHandlers({
      keydown(event) {
        if (!event.altKey || !producesText(event)) return false;
        guarded.add(event);
        event.preventDefault();
        return true;
      },
      compositionstart(event) {
        if (!composingForMeta()) return false;
        event.preventDefault();
        return true;
      },
      beforeinput(event) {
        if (!composingForMeta()) return false;
        if (!/^insert(Text|.*Composition.*)$/i.test(event.inputType)) {
          return false;
        }
        event.preventDefault();
        return true;
      },
    }),
  ),
];

/** Whether an input event still belongs to the Option keydown just seen. */
function composingForMeta(): boolean {
  return Date.now() - lastMetaKeydown <= META_COMPOSE_WINDOW_MS;
}

/**
 * Where the cursor sat when the search panel opened.
 *
 * Emacs returns the point to where an incremental search began when the search
 * is cancelled; CodeMirror's panel does not, because it has no notion of the
 * search having begun anywhere. The position is mapped through every change,
 * so an edit made while the panel is open does not send the cursor to the
 * wrong place.
 */
const searchOrigin = StateField.define<number | null>({
  create: () => null,
  update(value, transaction) {
    const was = searchPanelOpen(transaction.startState);
    const now = searchPanelOpen(transaction.state);
    if (!was && now) return transaction.startState.selection.main.head;
    if (was && !now) return null;
    return value === null ? null : transaction.changes.mapPos(value);
  },
});

/**
 * Cancel the search the way Emacs does: close it, and put the cursor back.
 *
 * It declines when no search is open, so `C-g` still reaches the keymap's own
 * `keyboardQuit` and clears a half-typed prefix.
 */
function cancelSearch(view: EditorView): boolean {
  if (!searchPanelOpen(view.state)) return false;
  const origin = view.state.field(searchOrigin, false) ?? null;
  closeSearchPanel(view);
  if (origin !== null) {
    view.dispatch({
      selection: EditorSelection.cursor(Math.min(origin, view.state.doc.length)),
      scrollIntoView: true,
    });
  }
  view.focus();
  return true;
}

/**
 * The cancel chords, in the editor and in the search panel.
 *
 * Two extensions, because the keyboard is in two places. While the focus is in
 * the content, the Emacs plugin sees the keydown before any keymap does, so
 * the editor's half has to be a DOM handler above it. Once the search panel is
 * open the focus is inside the panel, which runs the `search-panel` scope of
 * the keymap facet and nothing else, so the panel's half has to be a scoped
 * binding. Both chords come from the table.
 */
const searchCancel = [
  EditorView.domEventHandlers({
    keydown(event, view) {
      if (!searchPanelOpen(view.state)) return false;
      const chords = bindingById("keyboard-quit")?.chords ?? [];
      if (!chords.includes(chordFromEvent(event))) return false;
      cancelSearch(view);
      event.preventDefault();
      return true;
    },
  }),
  keymap.of(
    (bindingById("keyboard-quit")?.chords ?? []).map((chord) => ({
      key: toKeymapSpec(chord),
      scope: "search-panel",
      run: cancelSearch,
    })),
  ),
];

/** The extensions the editing surface is built from. */
function editorExtensions(hooks: EditorHooks = {}, textScale = 0): Extension[] {
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    rectangularSelection(),
    highlightActiveLine(),
    EditorView.lineWrapping,
    markdown(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    search({ top: true }),
    // The Emacs keymap must outrank everything else. CodeMirror's own keymap
    // is a view plugin like any other and handlers run in precedence order, so
    // without this the standard bindings claim `C-f`, `C-a`, `C-k` and their
    // neighbours on macOS and the Emacs commands never see them. `Return` is
    // the one exception, taken back just above.
    searchOrigin,
    // The suppressed chords are taken out of CodeMirror's own keymaps as well
    // as out of the Emacs one, so a chord Editor declines to answer falls
    // through to the browser wherever it was bound.
    //
    // The citation keymap sits ahead of the Emacs one for the same reason
    // `markdownReturn` does: `Tab` is already the table's own chord for
    // "fold or unfold this section" (`src/keys.ts`), claimed unconditionally
    // by the Emacs plugin, so completing a citation on `Tab` has to be asked
    // first and decline when no citation is being typed — which is exactly
    // what `citationCompletionKeymap` does (`itd-2609051335502171`).
    Prec.highest([
      ...searchCancel,
      markdownReturn,
      keymap.of(citationCompletionKeymap),
      emacsKeymap(),
    ]),
    // CodeMirror's own three keymaps, minus the chords `SUPPRESSED` takes out
    // of them. The list is built in `src/emacs.ts` and read here and by
    // `runBinding`, so one answer to "may CodeMirror answer this chord" serves
    // the keyboard and the palette alike (`iss-2609100519025566`).
    keymap.of([...codemirrorKeymap()]),
    // Last of all: whatever no keymap answered, Option still must not type.
    ...metaKeys,
    // The outline vocabulary's fold service and narrow decorations
    // (`itd-2609061318091323`). Neither writes a document change; both are
    // views over the untouched text, so they carry no byte-fidelity risk.
    ...outlineExtensions(),
    // Pipe tables realigned as they are typed in (`itd-2609061653559060`).
    // Alone in this list, this extension writes a document change the author
    // did not type: a transaction filter appends the realignment of the one
    // table the caret is in to the author's own keystroke. It is admissible
    // under `adr-2609092000099546` and only on that record's three
    // conditions — the author's edit is the occasion, the table the caret is
    // in is the limit, and one undo takes both back — which `src/tables.ts`
    // answers for at its head.
    alignTables(),
    // The bibliography Alice completes and hovers citations against
    // (`src/citations.ts`), and the tooltip machinery both read from it.
    bibliographyField,
    citationCompletionField,
    citationHoverTooltip,
    theme,
    // After the base theme, and highest in precedence inside itself, so the
    // scale's own rule outranks the size the surface opens at.
    textScaleExtension(textScale),
    EditorView.updateListener.of((update) => {
      if (update.docChanged || update.selectionSet) {
        hooks.onChange?.(update.view);
      }
    }),
  ];
}

/**
 * The line separator a text uses, for the state that will hold it.
 *
 * CodeMirror normalises every line break to `\n` unless it is told what the
 * document's own separator is. Telling it means a file written on Windows
 * comes back with its own endings, so opening a chapter and saving it
 * unchanged rewrites no bytes.
 */
export function lineSeparatorOf(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * The document as it would be written to disk.
 *
 * `doc.toString()` always joins with `\n`; `state.sliceDoc()` joins with the
 * state's own line break, which is the separator the chapter arrived with.
 * Every comparison against the saved text, and the text handed to a save, goes
 * through here.
 */
export function documentText(view: EditorView): string {
  return view.state.sliceDoc();
}

/** The hooks a view was built with, so a fresh state can carry them too. */
const hooksByView = new WeakMap<EditorView, EditorHooks>();

/**
 * The state one window holds a chapter in.
 *
 * A state per window and not one shared between them, which is
 * `adr-2609091832455881`'s decision 2 as amended on 2026-09-12.
 * `EditorState` declares `selection` as its own field beside `doc`
 * (`@codemirror/state`'s own `index.d.ts`) and the view holds no selection at
 * all, so two views over one state object are one caret drawn twice. Shared
 * state and a caret of one's own are mutually exclusive in CodeMirror 6, and
 * the caret of one's own is what a split is for.
 */
function stateFor(doc: string, hooks: EditorHooks, textScale = 0): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      EditorState.lineSeparator.of(lineSeparatorOf(doc)),
      ...editorExtensions(hooks, textScale),
    ],
  });
}

/** Marks a transaction as another window's edit, arriving here. */
const echoed = Annotation.define<boolean>();

/** Every window showing one buffer, in the order they were attached. */
export type Peers = () => readonly EditorView[];

/**
 * Mount a view whose text is kept in lockstep with its peers'.
 *
 * Two windows on one chapter hold two states that agree on their text, kept
 * agreeing by echoing one transaction's `ChangeSet` into every peer,
 * **synchronously, inside the originating view's own dispatch**. Every line of
 * the echo is load-bearing:
 *
 * - `view.update(transactions)` first, because the configuration option
 *   *replaces* the default `trs => this.update(trs)`. Omitting it renders
 *   nothing at all.
 * - `changes: transaction.changes` and nothing else. `ChangeSpec` includes
 *   `ChangeSet`, and `ChangeSet.of` refuses a set whose length does not match
 *   the document it is applied to — which makes the library itself this
 *   design's divergence detector: two windows whose texts drift apart throw on
 *   the next keystroke rather than letting one of them be saved over the file.
 * - **No `selection`.** `Transaction.newSelection` falls back to
 *   `startState.selection.map(changes)`, so the receiving window's own caret is
 *   mapped through the incoming change for free: it keeps its place, and an
 *   insertion before it moves it along by the right amount.
 * - `Transaction.addToHistory.of(false)`, the one path in `history()`'s field
 *   that maps existing entries through a foreign change without recording a
 *   new undoable event. Without it, undo in the receiving window would undo the
 *   other window's typing locally and the two texts would diverge on the spot.
 *   It is also why undo is per window (`cond-2609120405528253`).
 * - `filter: false`, so `alignTables()` — the one extension on this surface
 *   that writes a change the author did not type (`adr-2609092000099546`) —
 *   does not fire a *second* time on the echo. Without it the receiving window
 *   satisfies every condition that extension tests and realigns on its own
 *   account, which diverges the two texts wherever the originating transaction
 *   touched a table and carried no realignment itself: an undo, which the
 *   origin declines on its `userEvent` while the echo carries none; a caret on
 *   the delimiter row; a multi-cursor edit; a paste ending outside the table.
 *   The undo is the plainest of them and is the canary in
 *   `src/document.test.ts` (`iss-2609120518323764`).
 * - `scrollIntoView: false`, because a window nobody is typing in must not
 *   move.
 * - The echo is annotated and the annotated branch does not echo on, so a
 *   fan-out to three peers is still one round and never a cycle.
 *
 * **Synchronous is a rule, not a preference.** `@codemirror/collab` is not
 * installed, so there is no rebasing anywhere in this application. The echo
 * goes out before any other code can dispatch into either state; deferring it
 * by so much as a microtask would let a second edit interleave, and
 * `ChangeSet.of`'s length guard would then throw.
 */
function attach(
  parent: HTMLElement,
  state: EditorState,
  peers: Peers,
): EditorView {
  return new EditorView({
    state,
    parent,
    dispatchTransactions: (transactions, view) => {
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
          // Kept in the shipped code, not only in a test: a divergence here
          // is the one failure in this design whose consequence is a corrupt
          // file, and this names it at the keystroke that caused it. A warning
          // rather than `console.assert`, which this repository does not allow
          // and which no build strips anyway.
          if (peer.state.doc.length !== view.state.doc.length) {
            console.warn(
              "windows on one chapter disagree about its length: " +
                `${String(view.state.doc.length)} and ${String(peer.state.doc.length)}`,
            );
          }
        }
      }
    },
  });
}

/**
 * Mount an editing surface into `parent`.
 *
 * `peers` is a getter and not a list, because the set of windows showing a
 * chapter changes long after a window is built — and because
 * `dispatchTransactions` can only be passed at construction.
 */
export function createEditor(
  parent: HTMLElement,
  doc: string,
  hooks: EditorHooks = {},
  peers: Peers = () => [],
): EditorView {
  const view = attach(parent, stateFor(doc, hooks), peers);
  hooksByView.set(view, hooks);
  // Setting the mark and opening a prefix change no document state, so no
  // transaction reaches the update listener. This listener is registered after
  // CodeMirror's own, on the same element, so it runs once the chord has been
  // handled and the modeline can read the result.
  view.contentDOM.addEventListener("keydown", () => {
    hooks.onChange?.(view);
  });
  return view;
}

/**
 * Replace the whole document, as when a different chapter is opened.
 *
 * A fresh `EditorState` rather than a transaction, for two reasons. Undo
 * history belongs to a chapter: dispatching the swap would leave the previous
 * chapter's text one `C-/` away, and a save after that would write it over the
 * current file. And the line separator is state configuration, not content, so
 * a chapter with different endings needs its own state to be read back
 * faithfully.
 *
 * The type scale is state configuration too, but it belongs to Alice's eyes
 * rather than to the chapter, so it is carried across rather than reset.
 */
export function setDocument(view: EditorView, doc: string): void {
  view.setState(
    stateFor(doc, hooksByView.get(view) ?? {}, textScaleStep(view)),
  );
}

/**
 * Put the cursor on a one-based line and bring it into view.
 *
 * The sidebar names a heading by its line, because a line is the same number
 * in Rust, in the core, and in CodeMirror while a byte offset is not. A line
 * past the end of the document is clamped rather than refused: the tree may
 * have been drawn from a chapter that has since been shortened on disk.
 */
export function revealLine(view: EditorView, line: number): void {
  const clamped = Math.max(1, Math.min(line, view.state.doc.lines));
  const at = view.state.doc.line(clamped).from;
  view.dispatch({
    selection: EditorSelection.cursor(at),
    scrollIntoView: true,
  });
}

/**
 * Put the cursor at a character offset and bring it into view.
 *
 * The offset is clamped to the document's length: a chapter can have been
 * shortened, elsewhere or in a previous session, since the offset was last
 * recorded against it (`app.ts`'s per-chapter cursor memory).
 */
export function placeCursor(view: EditorView, offset: number): void {
  const clamped = Math.max(0, Math.min(offset, view.state.doc.length));
  view.dispatch({
    selection: EditorSelection.cursor(clamped),
    scrollIntoView: true,
  });
}

/**
 * Write a view's own caret back into the DOM after its element was moved.
 *
 * A reshape of the window grid moves leaf elements rather than rebuilding them,
 * which is what lets a window survive a split. Taking an element out of the
 * document and putting it back nonetheless collapses the *DOM* selection, while
 * the state's selection is untouched — and CodeMirror trusts the DOM: on the
 * next flush it reads a caret at the start of the content and writes that into
 * the state. The window Alice was typing in jumps to the top of the chapter, one
 * frame or one chord after the split.
 *
 * Neither `view.focus()` nor a transaction carrying the state's own selection
 * repairs it, because the view's cached DOM range still describes where the
 * caret *was* and so it concludes there is nothing to write. What does repair it
 * is writing the DOM selection here, from the state, through `domAtPos` — the
 * view's own answer to where a document offset is drawn. The next flush then
 * reads the caret the state already holds and agrees with it.
 *
 * Only the window holding the keyboard is repaired, because a document has one
 * selection: writing it for each window in turn would leave it in the last one.
 * An unfocused view is never read from the DOM, so its state is already the
 * truth about its caret.
 *
 * A caret outside what the view has drawn has no DOM position to write, and
 * `domAtPos` says so by throwing. Nothing is done then: there is no repair to
 * make that would not be a guess.
 */
export function refreshSelection(view: EditorView): void {
  const selection = view.dom.ownerDocument.getSelection();
  if (selection === null) return;
  const main = view.state.selection.main;
  try {
    const anchor = view.domAtPos(main.anchor);
    const head = view.domAtPos(main.head);
    selection.setBaseAndExtent(anchor.node, anchor.offset, head.node, head.offset);
  } catch {
    // Not drawn there: leave the DOM alone rather than guess at a position.
  }
}

/** Where the cursor sat when the open search panel was opened, if anywhere. */
export function searchOriginOf(view: EditorView): number | null {
  return view.state.field(searchOrigin, false) ?? null;
}

/** The cursor's one-based line and column. */
export function cursorPosition(view: EditorView): CursorPosition {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  return { line: line.number, column: head - line.from + 1 };
}

/**
 * How far into the chapter the caret sits, as a fraction of its length.
 *
 * The caret and not the scroll position (`itd-2609081938397758`,
 * cond-2609091733491196): scrolling ahead to check a reference is not
 * progress. `selection.main.head` rather than any other offset, because that
 * is the field `cursorPosition` above reads for the line and column, and the
 * footer must not carry two answers to where the caret is. With a region set,
 * the head is the moving end, which is where the author's attention is; a
 * multi-range selection collapses to `main`, the range CodeMirror itself
 * calls primary.
 *
 * An empty chapter is nought, not a division by zero: there is nowhere to be
 * in a document with no length, and the start is the honest place to draw.
 * The clamp is belt and braces — a selection CodeMirror produced is always
 * within the document it was produced against, so it can only matter if a
 * caller hands in a state whose selection has not been reconciled with its
 * text, and it removes a class of `NaN` from the drawing permanently.
 */
export function chapterProgress(view: EditorView): number {
  const { doc, selection } = view.state;
  if (doc.length === 0) return 0;
  return Math.max(0, Math.min(1, selection.main.head / doc.length));
}
