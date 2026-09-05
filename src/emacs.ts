/**
 * The Emacs keymap, plus the few chords Editor owns itself.
 *
 * `@replit/codemirror-emacs` ships the movement, kill-ring, mark, and search
 * chords. Three things are missing. It has no document to save or open, so
 * `C-x C-s` and `C-x C-f` are Editor's to add; it binds `M-g`, `M-C-s`,
 * `M-C-r`, and `S-M-5` to command names it never implements, so those chords
 * are inert until they are supplied; and several of its own bindings are
 * spelled in a notation its own key reader never produces, so they can never
 * fire (see `PACKAGE_KEY_NAMES`). All three gaps are filled through the same
 * handler, so that the prefix machinery (`C-x` opening a prefix state, `C-g`
 * cancelling it) stays one mechanism rather than several.
 *
 * Which chords reach a command is not decided here: every chord comes from
 * `BINDINGS`, and every chord taken away comes from `SUPPRESSED`. The table is
 * the one source, and the conformance sweep in `emacs-keys.test.ts` fails the
 * build if this module and the table drift apart.
 *
 * The handler's command table is static, so the application it calls into is a
 * module-level singleton. One window, one application; a second one would
 * replace the first.
 */

import {
  findNext,
  findPrevious,
  gotoLine,
  openSearchPanel,
} from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { EmacsHandler, emacs, emacsKeys } from "@replit/codemirror-emacs";

import {
  SUPPRESSED,
  bindingById,
  canonicalChord,
  fromKeymapSpec,
} from "./keys";

/** What the modeline reports about the Emacs handler. */
export interface EmacsStatus {
  /** The partial chord in progress, for example `C-x`, or the empty string. */
  readonly prefix: string;
  /** Whether the mark is set. */
  readonly markActive: boolean;
}

/**
 * The document actions the Emacs chords reach, by binding id.
 *
 * An index signature rather than a fixed set of methods: another part of the
 * application registers a command against a row of the table, and the chord
 * that reaches it is the row's, not a second copy written here.
 */
export type EditorCommands = Record<string, () => void>;

/**
 * The binding ids whose action lives in the application rather than in the
 * editing surface.
 *
 * Each is bound to every chord its row carries, so a chord changed in the
 * table changes here with it.
 */
export const APP_COMMAND_IDS: readonly string[] = [
  "save-chapter",
  "open-folder",
  "toggle-key-log",
  "keys-panel",
  "insert-palette",
  "toggle-sidebar",
  "reload-document",
  // Owned by the deck bundle; the chord is the table's row.
  "present",
];

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

/**
 * The key names the package's own reader produces, by the table's name.
 *
 * The package identifies a key by `KeyboardEvent.code`, mapped through a short
 * table of its own: `Slash` becomes `/`, `Minus` becomes `-`, and everything
 * else keeps the raw code. So a binding it spells `M-%` or `M-@` can never
 * match a real event, whose code is `Digit5` or `Digit2`. Editor's own table
 * writes the physical key, so this is the translation between the two, and it
 * is also what makes those dead bindings reachable again.
 */
const PACKAGE_KEY_NAMES: Readonly<Record<string, string>> = {
  ",": "Comma",
  ".": "Period",
  ";": "Semicolon",
  "'": "Quote",
  "`": "Backquote",
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  Escape: "Esc",
  "0": "Digit0",
  "1": "Digit1",
  "2": "Digit2",
  "3": "Digit3",
  "4": "Digit4",
  "5": "Digit5",
  "6": "Digit6",
  "7": "Digit7",
  "8": "Digit8",
  "9": "Digit9",
};

/** The table's modifier prefixes, in the package's own spelling. */
const PACKAGE_MODIFIERS: readonly (readonly [string, string])[] = [
  ["C-", "C-"],
  ["M-", "M-"],
  ["s-", "CMD-"],
  ["S-", "S-"],
];

/**
 * Rewrite one chord from the table's notation into the package's.
 *
 * Multi-step chords keep their spaces, which is how the package builds a
 * prefix sequence.
 */
export function toPackageChord(chord: string): string {
  return chord
    .split(" ")
    .map((step) => {
      let rest = step;
      let modifiers = "";
      for (;;) {
        const found = PACKAGE_MODIFIERS.find(
          ([prefix]) => rest.startsWith(prefix) && rest.length > prefix.length,
        );
        if (!found) break;
        modifiers += found[1];
        rest = rest.slice(found[0].length);
      }
      return modifiers + (PACKAGE_KEY_NAMES[rest] ?? rest);
    })
    .join(" ");
}

/**
 * `M-%`: the search panel, with the replacement field ready to type into.
 *
 * `@codemirror/search` has no single `replace` command — it has the panel,
 * which carries the search field, the replacement field, and the Replace and
 * Replace all buttons. Opening it and putting the cursor in the replacement
 * field is what an author who pressed `M-%` asked for; the panel's own Escape
 * closes it, and the pre-search cursor comes back with it.
 */
function queryReplace(view: EditorView): void {
  openSearchPanel(view);
  const field = view.dom.querySelector<HTMLInputElement>(
    'input[name="replace"]',
  );
  field?.focus();
  field?.select();
}

/** Register Editor's own chords with the shared Emacs handler. */
let registered = false;
function registerEditorChords(): void {
  if (registered) return;
  registered = true;

  EmacsHandler.addCommands({
    // The keymap binds `M-g`, `M-C-s`, `M-C-r`, and `S-M-5` to these names but
    // ships no implementation for any of them, so the chords are inert until
    // they are supplied here. The commands return a boolean the handler would
    // read as "not handled", so nothing is returned from these wrappers: the
    // chord is claimed either way, which is what stops the browser acting on
    // it.
    gotoline: (handler: EmacsHandler) => {
      gotoLine(handler.view);
    },
    findnext: (handler: EmacsHandler) => {
      findNext(handler.view);
    },
    findprevious: (handler: EmacsHandler) => {
      findPrevious(handler.view);
    },
    replace: (handler: EmacsHandler) => {
      queryReplace(handler.view);
    },
  });

  // Every application chord comes from the table, so a chord added to a row
  // reaches the command without a second edit here.
  for (const id of APP_COMMAND_IDS) {
    const binding = bindingById(id);
    if (!binding) {
      console.warn(`${id}: no such row in the binding table`);
      continue;
    }
    const name = `editor:${id}`;
    EmacsHandler.addCommands({
      [name]: () => {
        run(id);
      },
    });
    for (const chord of binding.chords) {
      EmacsHandler.bindKey(toPackageChord(chord), name);
    }
  }

  // Four of the package's own bindings are spelled in a notation its reader
  // never produces, so they are re-bound under the name a real event carries.
  // The command is the package's own; only the spelling changes.
  for (const [spec, chord] of REBOUND) rebindUnreachable(spec, chord);

  // A chord that opens a dead end is worse than one that does nothing. Only
  // the entries this keymap is asked to give up: one suppressed in CodeMirror's
  // keymap may still be a prefix step here.
  for (const { chord, where } of SUPPRESSED) {
    if (where === "keymap" || where === "both") {
      EmacsHandler.bindKey(toPackageChord(chord), undefined);
    }
  }
}

/**
 * The package bindings whose spelling its own key reader never produces.
 *
 * Each is the key of `emacsKeys` and the chord, in the table's notation, that
 * a real keyboard event actually carries. Without this, `M-<`, `M->`, `M-@`
 * and `M-%` are bound and unreachable.
 */
const REBOUND: readonly (readonly [string, string])[] = [
  ["C-Home|S-M-,", "M-S-,"],
  ["C-End|S-M-.", "M-S-."],
  ["M-@|M-S-2", "M-S-2"],
  ["S-M-5", "M-S-5"],
];

/**
 * Every chord the Emacs layer answers, in the table's notation.
 *
 * That is: the package's own bindings, plus the chords Editor binds through
 * the same handler, minus the suppressed ones. It is what the sweep checks the
 * page claims — a chord answered only by one of CodeMirror's lower-precedence
 * keymaps is claimed or not depending on what the document holds, so it is not
 * a promise the surface can make.
 */
export function emacsAnsweredChords(): ReadonlySet<string> {
  const answered = new Set<string>();
  for (const spec of Object.keys(emacsKeys)) {
    for (const alternative of spec.split("|")) {
      answered.add(fromKeymapSpec(alternative));
    }
  }
  for (const [, chord] of REBOUND) answered.add(canonicalChord(chord));
  for (const id of APP_COMMAND_IDS) {
    for (const chord of bindingById(id)?.chords ?? []) {
      answered.add(canonicalChord(chord));
    }
  }
  for (const { chord, where } of SUPPRESSED) {
    if (where === "keymap" || where === "both") {
      answered.delete(canonicalChord(chord));
    }
  }
  return answered;
}

/**
 * Bind the command a package key group carries under a reachable spelling.
 *
 * `spec` is the key of `emacsKeys`; `chord` is the table's notation for the
 * chord that should reach it.
 */
function rebindUnreachable(spec: string, chord: string): void {
  if (!(spec in emacsKeys)) {
    console.warn(`${spec}: the keymap no longer carries this binding`);
    return;
  }
  EmacsHandler.bindKey(toPackageChord(chord), emacsKeys[spec]);
}

/**
 * Run one of Editor's own chords against the mounted application.
 *
 * The chord is claimed either way — that is what stops the browser acting on
 * it — so a chord with nothing behind it would otherwise be a silent no-op.
 * The mounted application reports its own refusals through the modeline; this
 * only covers the case where there is no application at all, or where a
 * command was never registered, both of which are programming errors rather
 * than something the author did.
 */
function run(id: string): void {
  if (!commands) {
    console.warn(`${id}: no application is mounted`);
    return;
  }
  const command = commands[id];
  if (!command) {
    console.warn(`${id}: no command is registered`);
    return;
  }
  command();
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
