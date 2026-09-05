/**
 * The Emacs keymap, plus the few chords Editor owns itself.
 *
 * `@replit/codemirror-emacs` ships the movement, kill-ring, mark, and search
 * chords. Two things are missing. It has no document to save or open, so
 * `C-x C-s` and `C-x C-f` are Editor's to add; and it binds `M-g`, `M-C-s`,
 * and `M-C-r` to command names it never implements, so those chords are inert
 * until they are supplied. Both gaps are filled through the same handler, so
 * that the prefix machinery (`C-x` opening a prefix state, `C-g` cancelling
 * it) stays one mechanism rather than two.
 *
 * The handler's command table is static, so the application it calls into is a
 * module-level singleton. One window, one application; a second one would
 * replace the first.
 */

import { findNext, findPrevious, gotoLine } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { EmacsHandler, emacs } from "@replit/codemirror-emacs";

/** What the modeline reports about the Emacs handler. */
export interface EmacsStatus {
  /** The partial chord in progress, for example `C-x`, or the empty string. */
  readonly prefix: string;
  /** Whether the mark is set. */
  readonly markActive: boolean;
}

/** The document actions the Emacs chords reach. */
export interface EditorCommands {
  /** `C-x C-s` */
  saveChapter(): void;
  /** `C-x C-f` */
  openFolder(): void;
  /** `C-x k` */
  toggleKeyLog(): void;
}

const handlerByView = new WeakMap<EditorView, EmacsHandler>();

let commands: EditorCommands | null = null;

/**
 * Record which handler belongs to which view.
 *
 * The Emacs extension builds its own `EmacsHandler` inside a view plugin it
 * does not export, so there is no supported way to ask a view for its handler.
 * Wrapping the prototype once records the instance the first time it sees a
 * key, which is early enough for a modeline that only has something to report
 * after a key is pressed.
 */
let tracking = false;
function trackHandlers(): void {
  if (tracking) return;
  tracking = true;
  const inherited = EmacsHandler.prototype.handleKeyboard;
  EmacsHandler.prototype.handleKeyboard = function (
    this: EmacsHandler,
    event: KeyboardEvent,
  ): ReturnType<EmacsHandler["handleKeyboard"]> {
    handlerByView.set(this.view, this);
    return inherited.call(this, event);
  };
}

/** Register Editor's own chords with the shared Emacs handler. */
let registered = false;
function registerEditorChords(): void {
  if (registered) return;
  registered = true;
  EmacsHandler.addCommands({
    // The keymap binds `M-g`, `M-C-s`, and `M-C-r` to these names but ships no
    // implementation for any of them, so the chords are inert until they are
    // supplied here. The commands return a boolean the handler would read as
    // "not handled", so nothing is returned from these wrappers: the chord is
    // claimed either way, which is what stops the browser acting on it.
    gotoline: (handler: EmacsHandler) => {
      gotoLine(handler.view);
    },
    findnext: (handler: EmacsHandler) => {
      findNext(handler.view);
    },
    findprevious: (handler: EmacsHandler) => {
      findPrevious(handler.view);
    },
    editorSaveChapter: () => {
      run("saveChapter");
    },
    editorOpenFolder: () => {
      run("openFolder");
    },
    editorToggleKeyLog: () => {
      run("toggleKeyLog");
    },
  });
  EmacsHandler.bindKey("C-x C-s", "editorSaveChapter");
  EmacsHandler.bindKey("C-x C-f", "editorOpenFolder");
  EmacsHandler.bindKey("C-x k", "editorToggleKeyLog");
}

/**
 * Run one of Editor's own chords against the mounted application.
 *
 * The chord is claimed either way — that is what stops the browser acting on
 * it — so a chord with nothing behind it would otherwise be a silent no-op.
 * The mounted application reports its own refusals through the modeline; this
 * only covers the case where there is no application at all, which is a
 * programming error rather than something the author did.
 */
function run(action: keyof EditorCommands): void {
  if (!commands) {
    console.warn(`${action}: no application is mounted`);
    return;
  }
  commands[action]();
}

/** Point Editor's own chords at the running application. */
export function setEditorCommands(next: EditorCommands): void {
  commands = next;
}

/**
 * Let go of an application's commands, if they are still the mounted ones.
 *
 * A destroyed application must stop receiving chords, but a second one may
 * already have taken its place, and it must not be unhooked by the first one's
 * teardown.
 */
export function releaseEditorCommands(which: EditorCommands): void {
  if (commands === which) commands = null;
}

/** The Emacs extension, with Editor's chords registered. */
export function emacsKeymap(): Extension {
  trackHandlers();
  registerEditorChords();
  return emacs();
}

/** What the handler for `view` is currently in the middle of. */
export function emacsStatus(view: EditorView): EmacsStatus {
  const handler = handlerByView.get(view);
  if (!handler) {
    return { prefix: "", markActive: false };
  }
  return {
    prefix: handler.$data.keyChain,
    markActive: Boolean(handler.emacsMark()),
  };
}
