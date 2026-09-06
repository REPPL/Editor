/**
 * The editing surface: CodeMirror 6 with Markdown support and Emacs bindings.
 */

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { insertNewlineContinueMarkup, markdown } from "@codemirror/lang-markdown";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { closeSearchPanel, search, searchKeymap, searchPanelOpen } from "@codemirror/search";
import {
  EditorSelection,
  EditorState,
  Prec,
  StateField,
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
import { emacsKeymap } from "./emacs";
import {
  bindingById,
  chordFromEvent,
  toKeymapSpec,
  withoutSuppressed,
} from "./keys";
import { outlineExtensions } from "./outline-commands";
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
    keymap.of([
      ...withoutSuppressed(defaultKeymap),
      ...withoutSuppressed(historyKeymap),
      ...withoutSuppressed(searchKeymap),
    ]),
    // Last of all: whatever no keymap answered, Option still must not type.
    ...metaKeys,
    // The outline vocabulary's fold service and narrow decorations
    // (`itd-2609061318091323`). Neither writes a document change; both are
    // views over the untouched text, so they carry no byte-fidelity risk.
    ...outlineExtensions(),
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

function stateFor(doc: string, hooks: EditorHooks, textScale = 0): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      EditorState.lineSeparator.of(lineSeparatorOf(doc)),
      ...editorExtensions(hooks, textScale),
    ],
  });
}

/** Mount an editing surface into `parent`. */
export function createEditor(
  parent: HTMLElement,
  doc: string,
  hooks: EditorHooks = {},
): EditorView {
  const view = new EditorView({ state: stateFor(doc, hooks), parent });
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
