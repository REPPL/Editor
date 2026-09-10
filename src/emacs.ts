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
  defaultKeymap,
  historyKeymap,
  selectPageDown,
  selectPageUp,
} from "@codemirror/commands";
import {
  SearchQuery,
  findNext,
  findPrevious,
  getSearchQuery,
  gotoLine,
  openSearchPanel,
  searchKeymap,
  setSearchQuery,
} from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import type { EditorView, KeyBinding } from "@codemirror/view";
import { EmacsHandler, emacs, emacsKeys } from "@replit/codemirror-emacs";

import {
  SUPPRESSED,
  bindingById,
  canonicalChord,
  chordFromEvent,
  chordIndexIn,
  fromKeymapSpec,
  scopeOf,
  withoutSuppressed,
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
 *
 * The optional argument is for the one row whose answer depends on what was
 * already half-typed: `prefix-help` is handed the prefix it is to describe
 * (`itd-2609091722353594`). Every other command ignores it, and a command
 * written as `() => void` still satisfies this.
 */
export type EditorCommands = Record<string, (argument?: string) => void>;

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
  // The file-or-folder chooser; the chord is the table's row
  // (`itd-2609061509393380`, map #35).
  "open-file-or-folder",
  "toggle-key-log",
  "keys-panel",
  "insert-palette",
  // The sidebar's own toggle. This is the route from the text, on either of
  // the row's two chords; a pane the editing surface cannot hear reads the
  // same row through `src/focus.ts` (`itd-2609091722296239`).
  "toggle-sidebar",
  "reload-document",
  // The type scale. `C-x C-0` needs the guard below to reach its command; the
  // other two reach it through the package's own prefix machinery.
  "text-scale-increase",
  "text-scale-decrease",
  "text-scale-reset",
  // Owned by the deck bundle; the chord is the table's row.
  "present",
  // Owned by the preview window; the chord is the table's row. Missing from
  // this list left `C-c C-v` unbound behind the `C-c` prefix `present`
  // already opens, so the second step fell through to whatever lower keymap
  // answers a bare `C-v` (`iss-2609061510051784`).
  "preview",
  // Owned by the publish bundle, and by the shell's settings store.
  "publish-open",
  "open-settings",
  // Owned by the export panel; the chord is the table's row.
  "export-open",
  // Owned by the new-document panel; the chord is the table's row.
  "new-document-open",
  // The pane cycle. This is the route from the text; a pane the editing
  // surface cannot hear reads the same row through `src/focus.ts`.
  "other-window",
  // The prose vocabulary. Each is a function of the view in `src/prose.ts`;
  // the application wires it, because a refusal is announced in the modeline
  // and two of them open a prompt in the overlay host.
  "fill-paragraph",
  "transpose-words",
  "transpose-lines",
  "capitalize-word",
  "backward-sentence",
  "forward-sentence",
  "backward-paragraph",
  "forward-paragraph",
  "delete-indentation",
  "just-one-space",
  "delete-horizontal-space",
  "zap-to-char",
  "dabbrev-expand",
  "command-palette",
  "describe-key",
  "move-to-window-line",
  "quit",
  // The outline vocabulary. Each is a function of the view in
  // `src/outline-commands.ts`, wired the same way the prose vocabulary is;
  // three of the twenty-one — switch-chapter, close-chapter and occur — are
  // wired straight from `src/app.ts` because they need the application's
  // chapter list, its dirty state, or the overlay host, the same reason
  // `quit` above lives there rather than in the command module itself.
  "outline-next-heading",
  "outline-previous-heading",
  "outline-forward-same-level",
  "outline-backward-same-level",
  "outline-up-heading",
  "outline-toggle-fold",
  "outline-cycle",
  "outline-promote",
  "outline-demote",
  "outline-move-up",
  "outline-move-down",
  "outline-bold-region",
  "outline-italic-region",
  "outline-insert-link",
  "outline-insert-image",
  "outline-switch-chapter",
  "outline-close-chapter",
  "outline-narrow",
  "outline-widen",
  "outline-occur",
  "query-replace-regex",
  // The region case changes. Here rather than bound straight to the handler,
  // for the reason the prose vocabulary is here: with no region there is
  // nothing to change and a refusal to announce, and the modeline is the
  // application's (`iss-2609091920011632`). `changeCaseRegion` below is the
  // mechanism both rows run, and it returns the refusal rather than saying it.
  "upcase-region",
  "downcase-region",
  // The table-alignment mode switch (`itd-2609061653559060`). Here rather than
  // in the editing surface because the answer is a modeline message, and the
  // modeline is the application's; the flag itself lives in `src/tables.ts`,
  // which is where the filter that reads it lives.
  "toggle-table-alignment",
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
    const swallowed = swallowedChord(this, event);
    if (swallowed !== null) {
      // Resolved the way `findCommand` resolves a chord of its own: the chain
      // closes *and* the numeric argument is spent. A count left behind is the
      // count the *next* key is read with, so after `C-u 3 C-x C-0` the scale
      // came back and the chord after it ran three times over.
      const data = this.$data;
      const argument = data.count ?? 0;
      data.keyChain = "";
      data.count = 0;
      EmacsHandler.execCommand(
        EmacsHandler.commands[swallowed],
        this,
        {},
        argument === 0 ? 1 : argument,
      );
      return { command: swallowed };
    }

    // `C-h` on a live chain: the general fallback Emacs applies to any prefix
    // whose own map does not bind the help character. Caught here because
    // `findCommand` clears the chain on its way to returning nothing, so this
    // is the last moment the prefix still exists. It cannot collide with
    // `swallowedChord` above, which answers only Control-and-a-digit.
    //
    // The chain and the count are both spent, for the reason the guard above
    // records: a count left behind is the count the next key is read with, and
    // a chain left behind would be a prefix the modeline goes on showing under
    // an overlay that has taken over reading it. Spending both is also what
    // makes the cancel free — by the time `C-g` closes the overlay there is no
    // prefix left to cancel (`itd-2609091722353594`).
    const prefix = prefixHelpFor(this, event);
    if (prefix !== null) {
      const data = this.$data;
      data.keyChain = "";
      data.count = 0;
      run("prefix-help", prefix);
      // The same route `swallowedChord` claims its chord by: the package's own
      // plugin returns `!!result`, and CodeMirror `preventDefault`s a handler
      // that returns true, which is what stops `C-h` reaching the browser or a
      // lower keymap.
      return { command: "null" };
    }

    return inherited.call(this, event);
  };
}

/**
 * The table's spelling of a chain the package's key reader is holding.
 *
 * Forward, never backward: the chain was built by the package out of chords
 * this module bound with `toPackageChord`, so mapping the table through the
 * same call is the one comparison that cannot drift. An inverse would be a
 * second notation table, and two notation tables disagree.
 *
 * Null for a chain no row of the table opens, which is a chain the package owns
 * alone — nothing is intercepted there and the package resolves it exactly as
 * it does today.
 *
 * O(chords × steps) on one keystroke that opens a panel: roughly a hundred and
 * sixty chords of at most three steps, on no hot path, and deliberately not
 * optimised.
 */
function tablePrefixFor(chain: string): string | null {
  for (const chord of chordIndexIn("editor").keys()) {
    const steps = chord.split(" ");
    for (let taken = 1; taken < steps.length; taken += 1) {
      const prefix = steps.slice(0, taken).join(" ");
      if (toPackageChord(prefix) === chain) return prefix;
    }
  }
  return null;
}

/**
 * The prefix a `C-h` should describe, or null if this is not that.
 *
 * `if (!chain) return null` is the whole of what keeps a bare `C-h` exactly
 * what it is today: with no chain the key goes to the package's own reader,
 * which holds `C-h` as the prefix `C-h b` and `C-h k` were bound through. One
 * key, two jobs, told apart by whether a prefix is already in progress —
 * which is the rule GNU Emacs itself uses.
 *
 * The chord comes from the `prefix-help` row rather than from a literal, so
 * this module names no key of its own.
 */
function prefixHelpFor(
  handler: EmacsHandler,
  event: KeyboardEvent,
): string | null {
  const chain = handler.$data.keyChain;
  if (!chain) return null;
  const chord = canonicalChord(chordFromEvent(event));
  const help = bindingById("prefix-help");
  if (!help?.chords.map(canonicalChord).includes(chord)) return null;
  return tablePrefixFor(chain);
}

/**
 * Editor's own chords, in the package's notation, by the command they reach.
 *
 * Only the ones registered from the binding table, which is what makes the
 * guard below safe: it can never answer a chord the package itself owns.
 */
const ownChords = new Map<string, string>();

/**
 * The command a chord the package's key reader swallows would have reached.
 *
 * `findCommand` reads Control-and-a-digit as the start of a numeric argument
 * *before* it consults its own key chain, so `C-x C-0` sets a count, returns
 * nothing, and leaves the chain half-open: the chord can never reach a
 * binding. This is the same class of defect as `REBOUND` above — a chord the
 * package makes unreachable — and it is answered in the same place rather than
 * with a second prefix state. It is confined to a chain that is already open
 * and to a chord `ownChords` carries, so nothing the package answers is
 * touched.
 */
function swallowedChord(
  handler: EmacsHandler,
  event: KeyboardEvent,
): string | null {
  const chain = handler.$data.keyChain;
  if (!chain) return null;
  if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
    return null;
  }
  const digit = /^(?:Digit|Numpad)([0-9])$/.exec(event.code);
  if (digit === null) return null;
  // The keypad reaches `findCommand` as a digit like any other — `getKey`
  // strips the `Numpad` prefix — so the chord it swallows is the same chord,
  // and it is answered here under the name the binding table spells.
  const name = ownChords.get(`${chain} C-Digit${digit[1] ?? ""}`);
  if (name === undefined) return null;
  return EmacsHandler.commands[name] ? name : null;
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

/**
 * `C-M-%`: the search panel, ready for a regular expression rather than a
 * literal string.
 *
 * The same steps `queryReplace` takes, with the query's own `regexp` option
 * forced on instead of left at the panel's default (`itd-2609061318091323`).
 */
export function queryReplaceRegex(view: EditorView): void {
  openSearchPanel(view);
  const current = getSearchQuery(view.state);
  view.dispatch({
    effects: setSearchQuery.of(
      new SearchQuery({
        search: current.search,
        caseSensitive: current.caseSensitive,
        literal: current.literal,
        replace: current.replace,
        wholeWord: current.wholeWord,
        regexp: true,
      }),
    ),
  });
  const field = view.dom.querySelector<HTMLInputElement>(
    'input[name="replace"]',
  );
  field?.focus();
  field?.select();
}

/**
 * Move the viewport by a page, the way Emacs's `scroll-up-command` and
 * `scroll-down-command` do, leaving point exactly where it was.
 *
 * The package's own binding for `C-v`/`M-v` (and `PageDown`/`PageUp`,
 * `C-Down`/`C-Up`) routes the chord through CodeMirror's `cursorPageDown`/
 * `cursorPageUp`, which moves the selection by a page's worth of vertical
 * distance unconditionally — for any chapter shorter than a screen, that
 * lands point on the document's last (or first) line, not part way down the
 * next page (`iss-2609061510051784`). Scrolling `scrollDOM` directly, with no
 * transaction dispatched, is also what keeps this a scroll rather than a
 * cursor move dressed up as one: dispatching one here, even to nudge point
 * back on screen, hands CodeMirror's own scroll-anchoring straight back to
 * wherever it last recorded the offset, undoing the very scroll this answers.
 */
function scrollByPage(view: EditorView, forward: boolean): boolean {
  const dom = view.scrollDOM;
  const amount = Math.max(
    dom.clientHeight - view.defaultLineHeight,
    view.defaultLineHeight,
  );
  const before = dom.scrollTop;
  dom.scrollTop = forward ? before + amount : Math.max(0, before - amount);
  return dom.scrollTop !== before;
}

/**
 * `C-v`/`M-v`: `scrollByPage` when the mark is not set, and the package's own
 * selection-extending page move when it is — `goOrSelect`'s other half is left
 * alone because nothing reported it broken.
 */
function scrollPage(handler: EmacsHandler, forward: boolean): void {
  if (handler.emacsMark()) {
    (forward ? selectPageDown : selectPageUp)(handler.view);
    return;
  }
  scrollByPage(handler.view, forward);
}

/**
 * A command every version of the package registers for itself.
 *
 * The package installs itself in two module-level calls — the loop that binds
 * `emacsKeys` and one `addCommands` — and both carry a `/*@__PURE__*\/`
 * annotation, which tells a bundler the call may be dropped. It may not: they
 * are the whole keymap. `vite.config.ts` stops both bundlers believing it, and
 * this is how the running application says so if one ever does again: with the
 * annotation honoured, `EmacsHandler.commands` is empty, every chord the
 * package owns matches nothing, and the surface goes quiet in a way that looks
 * like a keyboard problem rather than a build one.
 */
const PACKAGE_COMMAND = "killLine";

/** Whether the package's own installation survived the bundler. */
export function packageKeymapInstalled(): boolean {
  return Boolean(EmacsHandler.commands[PACKAGE_COMMAND]);
}

/** Register Editor's own chords with the shared Emacs handler. */
let registered = false;
function registerEditorChords(): void {
  if (registered) return;
  registered = true;

  if (!packageKeymapInstalled()) {
    console.error(
      "the Emacs keymap installed no commands: the bundler took " +
        "@replit/codemirror-emacs's own key bindings for pure calls, and " +
        "every chord the package owns will do nothing (see the treeshake " +
        "note in vite.config.ts)",
    );
  }

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

  // A chord that opens a dead end is worse than one that does nothing. Only
  // the entries this keymap is asked to give up: one suppressed in CodeMirror's
  // keymap may still be a prefix step here.
  //
  // Run before the application's own chords, not after: `EmacsHandler.bindKey`
  // keeps only the last call for an exact key, and `outline-occur`'s `M-s o`
  // (`itd-2609061318091323`) is a longer chain starting at a chord this loop
  // clears — `M-s`, whose row is retired rather than relocated. Clearing it
  // first and letting the longer chain bind over it is what turns `M-s` into
  // a working prefix instead of leaving `M-s o` unreachable; the other order
  // would silently undo the prefix the moment this loop ran.
  for (const { chord, where } of SUPPRESSED) {
    if (where === "keymap" || where === "both") {
      EmacsHandler.bindKey(toPackageChord(chord), undefined);
    }
  }

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
      const spec = toPackageChord(chord);
      EmacsHandler.bindKey(spec, name);
      ownChords.set(spec, name);
    }
  }

  // Four of the package's own bindings are spelled in a notation its reader
  // never produces, so they are re-bound under the name a real event carries.
  // The command is the package's own; only the spelling changes.
  for (const [spec, chord] of REBOUND) rebindUnreachable(spec, chord);

  // `scroll-up`/`scroll-down`: the package's own binding for these chords
  // moves point by a page unconditionally rather than scrolling the window,
  // which is Emacs's actual `scroll-up-command`/`scroll-down-command`
  // (`iss-2609061510051784`). Read from the table like every `APP_COMMAND_IDS`
  // row, but bound directly to a view command rather than an application one,
  // the way `gotoline` and the other package-gap commands above are.
  EmacsHandler.addCommands({
    "editor:scroll-up": (handler: EmacsHandler) => {
      scrollPage(handler, true);
    },
    "editor:scroll-down": (handler: EmacsHandler) => {
      scrollPage(handler, false);
    },
  });
  for (const chord of bindingById("scroll-up")?.chords ?? []) {
    EmacsHandler.bindKey(toPackageChord(chord), "editor:scroll-up");
  }
  for (const chord of bindingById("scroll-down")?.chords ?? []) {
    EmacsHandler.bindKey(toPackageChord(chord), "editor:scroll-down");
  }

  // `prefix-help`: the command is registered and **no chord is bound**. That
  // asymmetry is the whole point, and it is why the row is not in
  // `APP_COMMAND_IDS`: binding its `C-h` would overwrite the prefix entry
  // `C-h b` and `C-h k` depend on, which is the one thing this row must not
  // cost (`itd-2609091722353594`). The chord is answered by the guard in the
  // `handleKeyboard` wrapper above instead.
  //
  // The command exists so that `runBinding` resolves the row at its first
  // step, which is what makes the row do something useful from `M-x`: with no
  // prefix to describe, the application announces that instead. It is no
  // longer what keeps `defaultKeymap`'s `Ctrl-h` off the chapter — the third
  // step searches `codemirrorKeymap`, so the `C-h` suppression reaches
  // `runBinding` as well as the keyboard (`iss-2609100519025566`).
  EmacsHandler.addCommands({
    "editor:prefix-help": () => {
      run("prefix-help");
    },
  });
}

/**
 * What both region case changes say when there is no region to change.
 *
 * GNU Emacs signals `mark-is-not-active` here. Editor claims `C-x C-u` and
 * `C-x C-l` either way — that is what keeps the browser off them — so with
 * nothing to change the chord has to say so rather than swallowing the
 * keystroke and reporting nothing (`iss-2609091920011632`).
 */
export const NO_REGION_TO_CHANGE = "No region to change case";

/**
 * Change the case of the region, in the direction the chord names.
 *
 * The command is the package's own `changeCase`, called with the arguments
 * its `C-x C-u` binding already carries and the direction the row asked for.
 * Only the direction is Editor's, so a region is upper-cased and lower-cased
 * exactly as the package did it.
 *
 * With point collapsed the package's own behaviour is to replace every empty
 * range by itself, which is a no-op nobody can see. The refusal is returned
 * rather than announced, the way the prose commands return theirs: the
 * modeline belongs to the application, and one caller announcing for both
 * rows is why this refusal is written once (`iss-2609091920011632`).
 */
export function changeCaseRegion(
  view: EditorView,
  dir: 1 | -1,
): string | null {
  if (view.state.selection.ranges.every((range) => range.empty)) {
    return NO_REGION_TO_CHANGE;
  }
  const command = EmacsHandler.commands["changeCase"];
  if (!command) {
    console.warn("changeCase: the keymap no longer carries this command");
    return null;
  }
  EmacsHandler.execCommand(command, handlerFor(view), { dir, region: true }, 1);
  return null;
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
 * CodeMirror's own keymaps, as the surface is allowed to have them.
 *
 * The three packages ship one flat keymap each and Editor installs all three
 * below the Emacs layer, minus every chord `SUPPRESSED` takes out of
 * CodeMirror's keymap. This is the one place that list is built, and it is
 * built once for two readers: `src/editor.ts` installs it, and `runBinding`
 * searches it when it resolves a row by chord.
 *
 * One list rather than two filters is the whole point. `runBinding` used to
 * iterate the three raw keymaps, so a row whose chord is suppressed here could
 * still reach the command the suppression exists to keep away — the
 * `prefix-help` row's `C-h` would have run `defaultKeymap`'s delete-backward
 * when it was chosen from `M-x` (`iss-2609100519025566`). A second filter
 * beside this one could drift from it again; a shared list cannot.
 */
export function codemirrorKeymap(): readonly KeyBinding[] {
  return [
    ...withoutSuppressed(defaultKeymap),
    ...withoutSuppressed(historyKeymap),
    ...withoutSuppressed(searchKeymap),
  ];
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
function run(id: string, argument?: string): void {
  if (!commands) {
    console.warn(`${id}: no application is mounted`);
    return;
  }
  const command = commands[id];
  if (!command) {
    console.warn(`${id}: no command is registered`);
    return;
  }
  command(argument);
}

/**
 * The Emacs handler for a view, making one if the package has not yet.
 *
 * The package builds its handler inside a view plugin it does not export, and
 * `trackHandlers` records the instance the first time it sees a key. A command
 * run from the palette may be the first thing that happens to a fresh view, so
 * a handler is made here rather than refusing: the kill ring and the command
 * table are static, so a second instance shares both.
 */
function handlerFor(view: EditorView): EmacsHandler {
  const tracked = handlerByView.get(view);
  if (tracked) return tracked;
  const fresh = new EmacsHandler(view);
  handlerByView.set(view, fresh);
  return fresh;
}

/**
 * Kill the selection through the package's own `killRegion`.
 *
 * `M-z` selects and then calls this, rather than dispatching a delete of its
 * own, so what it killed is on the one kill ring and `C-y` yanks it back.
 */
export function killSelection(view: EditorView): boolean {
  const command = EmacsHandler.commands["killRegion"];
  if (!command) return false;
  EmacsHandler.execCommand(command, handlerFor(view), {}, 1);
  return true;
}

/**
 * Run whatever a package binding names: a command, a name, or a name and args.
 *
 * `emacsKeys` carries all three shapes, and `execCommand` understands only the
 * first, so the name is resolved against the shared command table here.
 */
function runPackageBinding(handler: EmacsHandler, binding: unknown): boolean {
  let command: unknown = binding;
  let args: unknown = {};
  if (command !== null && typeof command === "object" && "command" in command) {
    args = (command as { args?: unknown }).args ?? {};
    command = (command as { command: unknown }).command;
  }
  if (typeof command === "string") {
    if (command === "null") return false;
    command = EmacsHandler.commands[command];
  }
  if (!command) return false;
  EmacsHandler.execCommand(command, handler, args, 1);
  return true;
}

/**
 * Run a row of the binding table by id, without a keyboard.
 *
 * This is what the command palette chooses with, and it resolves a row in one
 * of three ways, in the order the surface itself would: Editor's own command,
 * registered as `editor:<id>`; the package command `emacsKeys` binds to one of
 * the row's chords; or the `run` of the CodeMirror keymap binding that carries
 * one of them. A row none of the three answers returns a refusal rather than
 * doing nothing quietly.
 *
 * The third way searches `codemirrorKeymap`, the same list the surface
 * installs, so a chord `SUPPRESSED` takes out of CodeMirror's keymap is out of
 * reach here too. Resolving against the raw keymaps instead let a row reach the
 * command its own suppression exists to keep away (`iss-2609100519025566`).
 *
 * Only an `editor` row is run. The last two ways resolve a row *by chord*, and
 * a chord is only unique inside a scope: `Return` is "Open the chapter here"
 * in the tree and a newline in the text, so running a `sidebar` row here would
 * not open the chapter — it would type into the buffer. The scope is refused
 * before any chord is looked at, so no such row can reach the search at all.
 */
export function runBinding(view: EditorView, id: string): string | null {
  const binding = bindingById(id);
  if (!binding) return `${id} is not in the binding table`;
  if (scopeOf(binding) !== "editor") {
    return `${binding.label} is the sidebar's, and the text is where you are`;
  }
  const handler = handlerFor(view);

  const own = EmacsHandler.commands[`editor:${id}`];
  if (own) {
    EmacsHandler.execCommand(own, handler, {}, 1);
    return null;
  }

  const chords = binding.chords.map(canonicalChord);
  for (const spec of Object.keys(emacsKeys)) {
    const named = spec
      .split("|")
      .some((alternative) => chords.includes(canonicalChord(fromKeymapSpec(alternative))));
    if (!named) continue;
    if (runPackageBinding(handler, emacsKeys[spec])) return null;
  }

  for (const entry of codemirrorKeymap()) {
    const spec = entry.mac ?? entry.key;
    if (spec === undefined) continue;
    if (!chords.includes(canonicalChord(fromKeymapSpec(spec)))) continue;
    if (entry.run?.(view)) return null;
  }
  return `${binding.label} did nothing here`;
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
