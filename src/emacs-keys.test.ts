/**
 * The automated half of the key spike.
 *
 * A unit test cannot press a key on a Mac, so it cannot prove that macOS lets
 * a chord through. What it can prove is everything below that line: that each
 * chord in the binding table, once it reaches the page as a keydown event,
 * runs the command it names, and that the editing surface claims the event
 * rather than letting the browser act on it.
 *
 * The manual half is written down in `docs/spike-emacs-keys.md`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { searchKeymap, searchPanelOpen } from "@codemirror/search";
import { EditorSelection } from "@codemirror/state";
import { EmacsHandler, emacsKeys } from "@replit/codemirror-emacs";
import type { EditorView, KeyBinding } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp, type App, type AppServices } from "./app";
import type { Chapter, DocumentTree } from "./doctree";
import {
  createEditor,
  cursorPosition,
  documentText,
  lineSeparatorOf,
} from "./editor";
import {
  NO_REGION_TO_CHANGE,
  codemirrorKeymap,
  emacsAnsweredChords,
  emacsStatus,
  packageKeymapInstalled,
  runBinding,
  toPackageChord,
} from "./emacs";
import {
  BINDINGS,
  READING_BINDING_IDS,
  SUPPRESSED,
  bindingById,
  canonicalChord,
  chordFromEvent,
  chordIndex,
  chordIndexIn,
  fromKeymapSpec,
  isSuppressed,
  isSuppressedIn,
  keymapChords,
  readingBindings,
  scopeOf,
} from "./keys";
import { installKeyLog } from "./keyspike";
import { createModeline } from "./modeline";
import { completionsUnder } from "./prefix-help";
import { MODELINE_BUDGET } from "./prose";
import { setTableAlignment, tableAlignmentOn } from "./tables";

/** A document with enough shape for movement chords to be visible. */
const SAMPLE = [
  "# Alice and Bob",
  "",
  "Carol reads the second line.",
  "",
  "The fourth paragraph ends here.",
].join("\n");

/** The pieces of a keydown event a chord needs. */
interface Chord {
  key: string;
  code: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

/** The physical key each punctuation and digit chord name sits on. */
const CODES: Readonly<Record<string, string>> = {
  "/": "Slash",
  "\\": "Backslash",
  "-": "Minus",
  "=": "Equal",
  ",": "Comma",
  ".": "Period",
  ";": "Semicolon",
  "'": "Quote",
  "`": "Backquote",
  "[": "BracketLeft",
  "]": "BracketRight",
};

/** What a US layout produces on those keys once Shift is down. */
const SHIFTED: Readonly<Record<string, string>> = {
  "/": "?",
  "\\": "|",
  "-": "_",
  "=": "+",
  ",": "<",
  ".": ">",
  ";": ":",
  "'": '"',
  "`": "~",
  "[": "{",
  "]": "}",
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
};

/**
 * What macOS puts in `key` when Option is held, by physical key.
 *
 * The pair is Option and Option-Shift on a US layout: Option-f is `ƒ` and
 * Option-Shift-F is `Ï`. Five of them are dead keys — Option-e, -i, -n, -u
 * and Option-`` ` `` — where no character has been decided yet and the keydown
 * carries `"Dead"` instead. This is what WebKit really sends, and it is what
 * every Option chord in this file is dispatched as: a test that sent `key: "f"`
 * for Option-f would be testing a shape no Mac produces.
 */
const OPTION_CHARACTERS: Readonly<Record<string, readonly [string, string]>> = {
  a: ["å", "Å"],
  b: ["∫", "ı"],
  c: ["ç", "Ç"],
  d: ["∂", "Î"],
  e: ["Dead", "´"],
  f: ["ƒ", "Ï"],
  g: ["©", "˝"],
  h: ["˙", "Ó"],
  i: ["Dead", "ˆ"],
  j: ["∆", "Ô"],
  // Option-Shift-K is the Apple logo, in a private-use code point.
  k: ["˚", ""],
  l: ["¬", "Ò"],
  m: ["µ", "Â"],
  n: ["Dead", "˜"],
  o: ["ø", "Ø"],
  p: ["π", "∏"],
  q: ["œ", "Œ"],
  r: ["®", "‰"],
  s: ["ß", "Í"],
  t: ["†", "ˇ"],
  u: ["Dead", "¨"],
  v: ["√", "◊"],
  w: ["∑", "„"],
  x: ["≈", "˛"],
  y: ["¥", "Á"],
  z: ["Ω", "¸"],
  "0": ["º", "‚"],
  "1": ["¡", "⁄"],
  "2": ["™", "€"],
  "3": ["£", "‹"],
  "4": ["¢", "›"],
  "5": ["∞", "ﬁ"],
  "6": ["§", "ﬂ"],
  "7": ["¶", "‡"],
  "8": ["•", "°"],
  "9": ["ª", "·"],
  "`": ["Dead", "`"],
  "-": ["–", "—"],
  "=": ["≠", "±"],
  "[": ["“", "”"],
  "]": ["‘", "’"],
  "\\": ["«", "»"],
  ";": ["…", "Ú"],
  "'": ["æ", "Æ"],
  ",": ["≤", "¯"],
  ".": ["≥", "˘"],
  "/": ["÷", "¿"],
};

/**
 * Turn a chord string from the binding table into a keydown event.
 *
 * The Emacs handler identifies keys by `KeyboardEvent.code`, so the physical
 * key is what matters, not the character the platform would produce. That is
 * exactly why Option-f can be `M-f` and not `ƒ`, and why `M-%` is built as
 * Alt-Shift on `Digit5`.
 *
 * `key` is filled in with what the platform really sends, which for an Option
 * chord is the composed character or `"Dead"`. Nothing in the surface may read
 * it to decide a chord; building it faithfully is how this file proves that.
 */
function chordToEvent(chord: string): Chord {
  const modifiers = new Set<string>();
  let name = chord;
  for (;;) {
    const prefix = ["C-", "M-", "s-", "S-"].find(
      (candidate) => name.startsWith(candidate) && name.length > candidate.length,
    );
    if (!prefix) break;
    modifiers.add(prefix[0]!);
    name = name.slice(2);
  }
  const shifted = modifiers.has("S");
  const event: Chord = { key: name, code: name };

  if (/^[a-z]$/.test(name)) {
    event.code = `Key${name.toUpperCase()}`;
    event.key = shifted ? name.toUpperCase() : name;
  } else if (/^[0-9]$/.test(name)) {
    event.code = `Digit${name}`;
    event.key = shifted ? (SHIFTED[name] ?? name) : name;
  } else if (CODES[name] !== undefined) {
    event.code = CODES[name]!;
    // A browser reports the character the key would produce, so Shift turns
    // `/` into `?`. The chord builder has to look past that.
    event.key = shifted ? (SHIFTED[name] ?? name) : name;
  } else if (name === "Space") {
    event.code = "Space";
    event.key = " ";
  } else if (name === "Return") {
    event.code = "Enter";
    event.key = "Enter";
  } else if (["Left", "Right", "Up", "Down"].includes(name)) {
    event.code = `Arrow${name}`;
    event.key = `Arrow${name}`;
  }

  // Option composes, so what arrives in `key` is the character macOS was about
  // to type, or `Dead`. Named keys — `M-Up`, `M-Backspace` — compose nothing
  // and keep the name they already have.
  const composed = OPTION_CHARACTERS[name];
  if (modifiers.has("M") && composed) {
    event.key = (shifted ? composed[1] : composed[0]) || event.key;
  }

  if (modifiers.has("C")) event.ctrlKey = true;
  if (modifiers.has("M")) event.altKey = true;
  if (modifiers.has("s")) event.metaKey = true;
  if (modifiers.has("S")) event.shiftKey = true;
  return event;
}

/** Dispatch one chord at the editing surface and say whether it was claimed. */
function press(view: EditorView, chord: string): boolean {
  const event = new KeyboardEvent("keydown", {
    ...chordToEvent(chord),
    bubbles: true,
    cancelable: true,
  });
  view.contentDOM.dispatchEvent(event);
  return event.defaultPrevented;
}

/**
 * Dispatch a keydown built by hand, as a real Mac would send it.
 *
 * `press` builds the event from the table's own notation, which is the right
 * thing everywhere the question is "does this chord reach its command". It is
 * the wrong thing for the Option key, where the whole question is what macOS
 * puts in `key` — `ƒ` for Option-f, `Dead` for Option-e, `ﬁ` for Option-Shift-5
 * — while `code` stays the physical key.
 */
function pressRaw(view: EditorView, init: KeyboardEventInit): boolean {
  const event = new KeyboardEvent("keydown", {
    ...init,
    bubbles: true,
    cancelable: true,
  });
  view.contentDOM.dispatchEvent(event);
  return event.defaultPrevented;
}

/** Dispatch every step of a possibly multi-step chord. */
function pressSequence(view: EditorView, chord: string): boolean {
  let handled = false;
  for (const step of chord.split(" ")) {
    handled = press(view, step);
  }
  return handled;
}

/** Put the cursor at an absolute offset. */
function place(view: EditorView, at: number): void {
  view.dispatch({ selection: EditorSelection.cursor(at) });
}

/**
 * Close whatever overlay holds the keyboard, on the table's own cancel chord.
 *
 * At the document, because that is where an overlay holding the keyboard hears
 * a key: dispatching at the editing surface would be read by the overlay
 * first anyway, and this says which of the two the test means.
 */
function escapeOverlay(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** The rows the editing surface can run, which is what it offers the overlay. */
const EDITOR_IDS: readonly string[] = BINDINGS.filter(
  (binding) => scopeOf(binding) === "editor",
).map((binding) => binding.id);

describe("the binding table", () => {
  it("gives every action an id, a label, and at least one chord", () => {
    for (const binding of BINDINGS) {
      expect(binding.id, JSON.stringify(binding)).toMatch(/^[a-z][a-z-]*$/);
      expect(binding.label.length).toBeGreaterThan(0);
      expect(binding.chords.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate ids", () => {
    const ids = BINDINGS.map((binding) => binding.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("builds chord strings from events in the table's own notation", () => {
    const control = new KeyboardEvent("keydown", {
      key: "a",
      code: "KeyA",
      ctrlKey: true,
    });
    expect(chordFromEvent(control)).toBe("C-a");

    const meta = new KeyboardEvent("keydown", {
      key: "ƒ",
      code: "KeyF",
      altKey: true,
    });
    expect(chordFromEvent(meta)).toBe("M-f");

    const command = new KeyboardEvent("keydown", {
      key: "o",
      code: "KeyO",
      metaKey: true,
    });
    expect(chordFromEvent(command)).toBe("s-o");
  });

  it("reads punctuation from the physical key, not the shifted character", () => {
    const redo = new KeyboardEvent("keydown", {
      // What a browser actually reports for Shift-Control on the slash key.
      key: "?",
      code: "Slash",
      ctrlKey: true,
      shiftKey: true,
    });
    expect(chordFromEvent(redo)).toBe(canonicalChord("S-C-/"));
    expect(chordFromEvent(redo)).not.toContain("?");
  });

  it("writes modifiers in one order, whichever order they were written in", () => {
    expect(canonicalChord("S-C-/")).toBe(canonicalChord("C-S-/"));
    expect(canonicalChord("M-C-s")).toBe(canonicalChord("C-M-s"));
    expect(canonicalChord("C-x C-s")).toBe("C-x C-s");
    expect(canonicalChord("C-Space")).toBe("C-Space");
    expect(canonicalChord("s-o")).toBe("s-o");
    expect(canonicalChord("Right")).toBe("Right");
  });

  it("gives no two rows the same chord", () => {
    // Once per scope. Focus is single and exclusive, so the editing surface
    // and the sidebar may each claim `C-n`; two rows claiming it inside one
    // scope would be the ambiguity this invariant exists to forbid.
    const shared: string[] = [];
    for (const scope of ["editor", "sidebar"] as const) {
      for (const [chord, rows] of chordIndexIn(scope)) {
        if (rows.length > 1) {
          shared.push(`${scope} ${chord}: ${rows.map((row) => row.id).join(", ")}`);
        }
      }
    }
    expect(shared).toEqual([]);
    // The scopes are not empty, and the sweep above is worth something.
    expect(chordIndexIn("sidebar").size).toBeGreaterThan(0);
    expect(chordIndexIn("editor").has("C-n")).toBe(true);
    expect(chordIndexIn("sidebar").has("C-n")).toBe(true);

    // Two rows are answered by every pane — the reader in `src/focus.ts`
    // runs them from the tree and from a panel as well as from the text — so
    // their chords are the place where per-scope uniqueness is not enough:
    // no row in any scope may share them. `other-window` is the chord that
    // leaves a pane; `toggle-sidebar` is the chord that shows and hides the
    // tree from wherever the keyboard is (`itd-2609091722296239`).
    const everywhere: Record<string, readonly string[]> = {
      "other-window": ["C-x o"],
      "toggle-sidebar": ["F2", "C-x C-b"],
    };
    for (const [id, expected] of Object.entries(everywhere)) {
      const row = bindingById(id);
      expect(row?.chords, id).toEqual(expected);
      for (const chord of row?.chords ?? []) {
        const key = canonicalChord(chord);
        const claimants = BINDINGS.filter((binding) =>
          binding.chords.map(canonicalChord).includes(key),
        ).map((binding) => binding.id);
        expect(claimants, key).toEqual([id]);
        // And each is reachable from the text, which is where both start.
        expect(chordIndexIn("editor").has(key)).toBe(true);
      }
    }
  });

  it("gives the region case changes one chord each, in opposite directions", () => {
    // `C-x C-l` is Emacs's `downcase-region` and carries its own row: the
    // package binds it to the same upcase `C-x C-u` carries, and the table
    // inherited the conflation (`iss-2609091729471352`).
    const up = bindingById("upcase-region");
    const down = bindingById("downcase-region");
    expect(up?.chords).toEqual(["C-x C-u"]);
    expect(down?.chords).toEqual(["C-x C-l"]);
    expect(down?.label).toBe("Lower-case the region");
    expect(down?.group).toBe(up?.group);
    expect(down?.owner).toBe(up?.owner);
    expect(emacsAnsweredChords().has("C-x C-u")).toBe(true);
    expect(emacsAnsweredChords().has("C-x C-l")).toBe(true);
  });

  it("suppresses a chord instead of listing it, never both", () => {
    const listed = chordIndex();
    // `C-h` is the one chord that is both, and it is both for two different
    // keymaps. It is taken out of CodeMirror's so that delete-backward cannot
    // answer it, and it is a row because the Emacs layer answers it after a
    // prefix (`itd-2609091722353594`). Every other entry here is a chord
    // Editor hands back to the browser, and the sweep below still holds them
    // to the rule — including the direction that would let a typo add a
    // second name to this set unnoticed.
    const ANSWERED_ELSEWHERE = new Set(["C-h"]);
    for (const { chord, where, why } of SUPPRESSED) {
      expect(why.length).toBeGreaterThan(0);
      if (ANSWERED_ELSEWHERE.has(chord)) {
        expect(where).toBe("codemirror");
        expect(listed.has(canonicalChord(chord))).toBe(true);
        continue;
      }
      expect(listed.has(canonicalChord(chord))).toBe(false);
    }
    expect(
      [...ANSWERED_ELSEWHERE].every((chord) => isSuppressed(chord)),
    ).toBe(true);
  });

  it("reserves the chords other specs will wire, and answers none of them", () => {
    const present = bindingById("present");
    const publish = bindingById("publish-open");
    expect(present?.chords).toEqual(["C-c C-p"]);
    expect(publish?.chords).toEqual(["C-c C-l"]);
    expect(present?.owner).toBe("app");
    expect(publish?.owner).toBe("app");
  });

  it("answers other-window's one chord from the text", () => {
    // The editing surface hears it through the Emacs handler's own prefix
    // machinery, and a pane the surface cannot hear reads the same row
    // through `src/focus.ts`. `C-x C-o` used to sit beside it; it now
    // answers `open-file-or-folder` instead (`itd-2609061509393380`, map
    // #35).
    const other = bindingById("other-window");
    expect(other?.chords).toEqual(["C-x o"]);
    expect(other?.owner).toBe("editor");
    expect(emacsAnsweredChords().has("C-x o")).toBe(true);

    const openSource = bindingById("open-file-or-folder");
    expect(openSource?.chords).toEqual(["C-x C-o"]);
    expect(openSource?.owner).toBe("editor");
    expect(emacsAnsweredChords().has("C-x C-o")).toBe(true);
  });

  it("gives the sidebar's rows their own scope, and answers none of them here", () => {
    // The seven rows the tree answers. They are the table's, so the keys
    // panel lists them; they are not the editing surface's, so the Emacs
    // handler must not bind a single one of them.
    const sidebar = BINDINGS.filter((binding) => scopeOf(binding) === "sidebar");
    expect(sidebar.map((binding) => binding.id)).toEqual([
      "sidebar-next-node",
      "sidebar-previous-node",
      "sidebar-expand-node",
      "sidebar-collapse-node",
      "sidebar-open-node",
      "sidebar-hide",
      "sidebar-quit",
    ]);
    for (const binding of sidebar) {
      expect(binding.owner).toBe("sidebar");
      expect(binding.group).toBe("panes");
    }
  });

  it("lists every tier-one prose command with a label and a chord", () => {
    // The seventeen rows of the prose vocabulary, each with the chord the
    // research note ranked it under. Written out here rather than derived, so
    // that a chord changed in the table has to be changed deliberately.
    const tier: readonly (readonly [string, string])[] = [
      ["fill-paragraph", "M-q"],
      ["transpose-words", "M-t"],
      ["transpose-lines", "C-x C-t"],
      ["capitalize-word", "M-c"],
      ["backward-sentence", "M-a"],
      ["forward-sentence", "M-e"],
      ["backward-paragraph", "M-S-["],
      ["forward-paragraph", "M-S-]"],
      ["delete-indentation", "M-S-6"],
      ["just-one-space", "M-Space"],
      ["delete-horizontal-space", "M-\\"],
      ["zap-to-char", "M-z"],
      ["dabbrev-expand", "M-/"],
      ["command-palette", "M-x"],
      ["describe-key", "C-h k"],
      ["move-to-window-line", "M-r"],
      ["quit", "C-x C-c"],
    ];
    expect(tier).toHaveLength(17);
    for (const [id, chord] of tier) {
      const row = bindingById(id);
      expect(row, id).toBeDefined();
      expect(row?.label.length ?? 0, id).toBeGreaterThan(0);
      expect(row?.chords, id).toContain(chord);
      expect(row?.owner, id).toBe("editor");
      expect(scopeOf(row!), id).toBe("editor");
      // Answered, not merely listed.
      expect(emacsAnsweredChords().has(canonicalChord(chord)), id).toBe(true);
    }

    // The eighteenth action the criterion names keeps the row it had: the
    // Option-chord work is what makes it reachable, and nothing here touches
    // it.
    expect(bindingById("mark-word")?.chords).toEqual(["M-S-2"]);
    expect(bindingById("mark-word")?.owner).toBe("keymap");

    // Both chords that were suppressed for having nothing behind them now
    // have something, so neither may be in both lists.
    const suppressed = SUPPRESSED.map((entry) => entry.chord);
    expect(suppressed).not.toContain("M-x");
    expect(suppressed).not.toContain("M-/");
  });

  it("answers no chord the table does not list", () => {
    // The conformance sweep, in the other direction. Every chord any of the
    // four keymaps the surface installs answers has to be a row of the table
    // or an entry in SUPPRESSED. A future version of a package that adds a
    // chord fails the build rather than quietly widening the promise.
    //
    // The editing surface's own scope, not the whole table: these four keymaps
    // are installed in the surface, so a chord they answer has to be a row the
    // surface owns. Sweeping against every row would let a chord be excused by
    // a sidebar row that answers only while the tree has the keyboard — which
    // is exactly the pane confusion the scopes exist to prevent.
    const listed = chordIndexIn("editor");
    const suppressed = new Set(
      SUPPRESSED.map((entry) => canonicalChord(entry.chord)),
    );
    const sweep = new Map<string, string>();
    for (const spec of Object.keys(emacsKeys)) {
      for (const alternative of spec.split("|")) {
        sweep.set(fromKeymapSpec(alternative), "emacsKeys");
      }
    }
    for (const [name, keymap] of [
      ["defaultKeymap", defaultKeymap],
      ["historyKeymap", historyKeymap],
      ["searchKeymap", searchKeymap],
    ] as const) {
      for (const chord of keymapChords(keymap)) {
        if (!sweep.has(chord)) sweep.set(chord, name);
      }
    }

    const unnamed: string[] = [];
    for (const [chord, source] of sweep) {
      if (listed.has(chord) || suppressed.has(chord)) continue;
      unnamed.push(`${chord} (${source})`);
    }
    expect(unnamed).toEqual([]);
    // The sweep is worth nothing if it swept nothing.
    expect(sweep.size).toBeGreaterThan(140);
    expect(sweep.has("M-S-5")).toBe(true);
    expect(sweep.has("s-z")).toBe(true);
  });

  it("names query-replace on M-% and supplies it from the search package", () => {
    const binding = bindingById("query-replace");
    expect(binding?.chords).toEqual(["M-S-5"]);
    expect(binding?.owner).toBe("editor");
    // `M-%` is Alt-Shift on the physical `5`, and the package's own reader
    // calls that key `Digit5`, which is what the chord has to be bound as.
    expect(toPackageChord("M-S-5")).toBe("M-S-Digit5");
  });

  it("matches every chord in the table against the event it would arrive as", () => {
    const strangers: string[] = [];
    for (const binding of BINDINGS) {
      for (const chord of binding.chords) {
        for (const step of chord.split(" ")) {
          if (!/[CMSs]-/.test(step)) continue;
          const event = new KeyboardEvent("keydown", chordToEvent(step));
          if (chordFromEvent(event) !== canonicalChord(step)) {
            strangers.push(`${step} arrives as ${chordFromEvent(event)}`);
          }
        }
      }
    }
    expect(strangers).toEqual([]);
  });
});

describe("the Emacs keymap inside CodeMirror", () => {
  let host: HTMLElement;
  let view: EditorView;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    view = createEditor(host, SAMPLE);
  });

  afterEach(() => {
    view.destroy();
    host.remove();
  });

  it("moves forward and backward by character", () => {
    place(view, 0);
    expect(press(view, "C-f")).toBe(true);
    expect(view.state.selection.main.head).toBe(1);
    expect(press(view, "C-b")).toBe(true);
    expect(view.state.selection.main.head).toBe(0);
  });

  it("moves by line", () => {
    place(view, 0);
    expect(press(view, "C-n")).toBe(true);
    expect(cursorPosition(view).line).toBe(2);
    expect(press(view, "C-p")).toBe(true);
    expect(cursorPosition(view).line).toBe(1);
  });

  it("moves by word with Meta", () => {
    place(view, 0);
    expect(press(view, "M-f")).toBe(true);
    const afterForward = view.state.selection.main.head;
    expect(afterForward).toBeGreaterThan(0);
    expect(press(view, "M-b")).toBe(true);
    expect(view.state.selection.main.head).toBeLessThan(afterForward);
  });

  it("moves to the beginning and the end of a line", () => {
    place(view, 3);
    expect(press(view, "C-e")).toBe(true);
    expect(cursorPosition(view).column).toBe(16);
    expect(press(view, "C-a")).toBe(true);
    expect(cursorPosition(view).column).toBe(1);
  });

  it("kills to the end of the line", () => {
    place(view, 0);
    expect(press(view, "C-k")).toBe(true);
    expect(view.state.doc.line(1).text).toBe("");
    expect(view.state.doc.toString()).toContain("Carol reads");
  });

  it("kills a word forward", () => {
    place(view, 2);
    expect(press(view, "M-d")).toBe(true);
    expect(view.state.doc.line(1).text).not.toContain("Alice");
  });

  it("deletes a character forward", () => {
    place(view, 0);
    expect(press(view, "C-d")).toBe(true);
    expect(view.state.doc.line(1).text).toBe(" Alice and Bob");
  });

  it("transposes characters", () => {
    place(view, 2);
    expect(press(view, "C-t")).toBe(true);
    // `# Alice…` with the point after the space: the two characters either
    // side of the point swap, so the space and the `A` change places.
    expect(view.state.doc.line(1).text).toBe("#A lice and Bob");
  });

  it("sets the mark, and the modeline can see it", () => {
    place(view, 0);
    expect(emacsStatus(view).markActive).toBe(false);
    expect(press(view, "C-Space")).toBe(true);
    expect(emacsStatus(view).markActive).toBe(true);
  });

  it("kills the region between the mark and the point", () => {
    place(view, 0);
    press(view, "C-Space");
    press(view, "C-e");
    expect(press(view, "C-w")).toBe(true);
    expect(view.state.doc.line(1).text).toBe("");
  });

  it("yanks what was killed back, twice", () => {
    place(view, 0);
    press(view, "C-Space");
    press(view, "C-e");
    press(view, "C-w");
    expect(press(view, "C-y")).toBe(true);
    expect(view.state.doc.line(1).text).toBe("# Alice and Bob");
  });

  it("copies the region without changing the document", () => {
    place(view, 0);
    press(view, "C-Space");
    press(view, "C-e");
    expect(press(view, "M-w")).toBe(true);
    expect(view.state.doc.toString()).toBe(SAMPLE);
  });

  it("opens the search panel on C-s and on C-r", () => {
    expect(host.querySelector(".cm-search")).toBeNull();
    expect(press(view, "C-s")).toBe(true);
    expect(host.querySelector(".cm-search")).not.toBeNull();
    press(view, "C-g");
  });

  it("opens the search panel on C-r as well", () => {
    expect(host.querySelector(".cm-search")).toBeNull();
    expect(press(view, "C-r")).toBe(true);
    expect(host.querySelector(".cm-search")).not.toBeNull();
  });

  it("undoes and redoes an edit", () => {
    place(view, 0);
    press(view, "C-k");
    expect(view.state.doc.line(1).text).toBe("");
    expect(press(view, "C-/")).toBe(true);
    expect(view.state.doc.line(1).text).toBe("# Alice and Bob");
    expect(press(view, "S-C-/")).toBe(true);
    expect(view.state.doc.line(1).text).toBe("");
  });

  it("undoes and redoes from the slash key as WebKit reports it", () => {
    // Control-slash arrives as `key: "/"` and Control-Shift-slash as `key: "?"`
    // — the character the key would have typed — on the one physical `Slash`.
    // Both rows are read from the code, so the shifted character never reaches
    // the lookup.
    place(view, 0);
    press(view, "C-k");
    expect(view.state.doc.line(1).text).toBe("");
    expect(pressRaw(view, { key: "/", code: "Slash", ctrlKey: true })).toBe(
      true,
    );
    expect(view.state.doc.line(1).text).toBe("# Alice and Bob");
    expect(
      pressRaw(view, {
        key: "?",
        code: "Slash",
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toBe(true);
    expect(view.state.doc.line(1).text).toBe("");
    expect(documentText(view)).not.toContain("?");
  });

  it("selects the whole document with the C-x h prefix chord", () => {
    expect(pressSequence(view, "C-x h")).toBe(true);
    expect(view.state.selection.main.from).toBe(0);
    expect(view.state.selection.main.to).toBe(view.state.doc.length);
  });

  it("shows a prefix in progress and cancels it with C-g", () => {
    expect(press(view, "C-x")).toBe(true);
    expect(emacsStatus(view).prefix).toBe("C-x");
    expect(press(view, "C-g")).toBe(true);
    expect(emacsStatus(view).prefix).toBe("");
  });

  it("upper-cases and lower-cases a word", () => {
    place(view, 2);
    expect(press(view, "M-u")).toBe(true);
    expect(view.state.doc.line(1).text).toContain("ALICE");
    place(view, 2);
    expect(press(view, "M-l")).toBe(true);
    expect(view.state.doc.line(1).text).toContain("alice");
  });

  // The region case changes are pressed under "Editor's own chords" below,
  // over a mounted application: the mechanism is this layer's, and the refusal
  // with no region is announced in the modeline, which is the application's
  // (`iss-2609091920011632`).

  it("claims every step of every modified chord the page owns", () => {
    // "The page owns it" means the Emacs layer answers it: the package's own
    // bindings plus the ones Editor adds through the same handler. A chord
    // answered only by one of CodeMirror's lower-precedence keymaps is claimed
    // or not depending on what the document holds, so it is not a promise the
    // surface can make and it is checked by the conformance sweep instead.
    const answered = emacsAnsweredChords();
    const unclaimed: string[] = [];
    const swept: string[] = [];
    for (const binding of BINDINGS) {
      // `C-u` starts a numeric argument, so it changes how the next chord is
      // read. It is checked on its own below rather than in the sweep.
      if (binding.id === "universal-argument") continue;
      // A row of another scope is not the editing surface's to claim: the
      // sidebar answers it, and only while the tree holds the keyboard.
      if (scopeOf(binding) !== "editor") continue;
      for (const chord of binding.chords) {
        // Plain arrow and navigation keys belong to the browser, and the
        // spike is about the modified chords.
        if (!/(^|\s)[CMSs]-/.test(chord)) continue;
        if (!answered.has(canonicalChord(chord))) continue;
        swept.push(chord);
        // Every step, not just the last: a prefix that failed to open would
        // otherwise be hidden by the completing chord being claimed anyway.
        for (const step of chord.split(" ")) {
          if (!press(view, step)) unclaimed.push(`${binding.id}: ${chord} at ${step}`);
        }
        press(view, "C-g");
      }
    }
    expect(unclaimed).toEqual([]);
    // The sweep is only worth anything if it actually swept: these are the
    // chords the documentation quotes.
    expect(swept).toContain("C-x C-s");
    expect(swept).toContain("S-C-/");
    expect(swept).toContain("C-c i");
    expect(swept).toContain("C-h b");
    expect(swept).toContain("M-S-5");
    expect(swept).not.toContain("s-o");
    expect(swept.length).toBeGreaterThan(60);
  });

  it("claims the numeric-argument chord", () => {
    expect(press(view, "C-u")).toBe(true);
    press(view, "C-g");
  });

  it("says so when a document chord finds no application mounted", () => {
    // The chord is still claimed — that is what stops the browser acting on
    // it — but a claim with nothing behind it must not be silent.
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (...args: unknown[]): void => {
      warnings.push(args.join(" "));
    };
    try {
      expect(pressSequence(view, "C-x C-s")).toBe(true);
    } finally {
      console.warn = warn;
    }
    expect(warnings).toEqual(["save-chapter: no application is mounted"]);
  });

  it("continues a Markdown list on Return", () => {
    // The Emacs keymap binds `Return` to a plain newline and outranks
    // everything, so without the exception in `editor.ts` this inserts a bare
    // line and the list stops.
    const list = createEditor(host, "- one");
    place(list, 5);
    press(list, "Return");
    expect(documentText(list)).toBe("- one\n- ");
    list.destroy();
  });

  it("still inserts a plain newline outside a list", () => {
    const plain = createEditor(host, "Alice");
    place(plain, 5);
    press(plain, "Return");
    expect(documentText(plain)).toBe("Alice\n");
    plain.destroy();
  });
});

describe("cancelling", () => {
  let host: HTMLElement;
  let view: EditorView;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    view = createEditor(host, SAMPLE);
  });

  afterEach(() => {
    view.destroy();
    host.remove();
  });

  it("returns the cursor to where the search began when the search is cancelled", () => {
    place(view, 20);
    expect(press(view, "C-s")).toBe(true);
    expect(searchPanelOpen(view.state)).toBe(true);
    // A search moves the cursor to the match; this is that, without a match.
    place(view, 0);
    expect(press(view, "C-g")).toBe(true);
    expect(searchPanelOpen(view.state)).toBe(false);
    expect(view.state.selection.main.head).toBe(20);
    expect(documentText(view)).toBe(SAMPLE);
  });

  it("closes a cancelled search on Escape as well", () => {
    place(view, 12);
    press(view, "C-r");
    place(view, 0);
    press(view, "Escape");
    expect(searchPanelOpen(view.state)).toBe(false);
    expect(view.state.selection.main.head).toBe(12);
  });

  it("leaves the cursor alone when C-g cancels a prefix rather than a search", () => {
    place(view, 5);
    press(view, "C-x");
    expect(emacsStatus(view).prefix).toBe("C-x");
    expect(press(view, "C-g")).toBe(true);
    expect(emacsStatus(view).prefix).toBe("");
    expect(view.state.selection.main.head).toBe(5);
    expect(documentText(view)).toBe(SAMPLE);
  });

  it("opens the search panel with the replacement field on M-%", () => {
    expect(press(view, "M-S-5")).toBe(true);
    expect(searchPanelOpen(view.state)).toBe(true);
    const field = view.dom.querySelector<HTMLInputElement>(
      'input[name="replace"]',
    );
    expect(field).not.toBeNull();
    expect(document.activeElement).toBe(field);
  });
});

/**
 * A chapter written to be hard on anything that reads and writes it.
 *
 * A 544-character line, a ragged table, a well-formed table that is nowhere
 * near aligned and holds an escaped pipe, an HTML comment, a fenced div, tabs,
 * trailing whitespace, and no trailing newline. Nothing here is exotic; every
 * one of them is something an author's real chapter carries.
 *
 * The two tables are what hold the seventh criterion of
 * `itd-2609061653559060`: table alignment rides on the author's own edit and on
 * nothing else, so a chapter opened, moved through and saved with nothing typed
 * comes back byte for byte, ragged tables and all. The second table is
 * well-formed and misaligned on purpose — the ragged one would be refused
 * whatever ran over it, and this one would not.
 */
const HAZARDOUS = [
  "# A hazardous chapter",
  "",
  `A very long line: ${"the quick brown fox jumps over the lazy dog. ".repeat(13)}`
    .slice(0, 543)
    .padEnd(544, "."),
  "",
  "| Name | What it is | Notes |",
  "|---|:--|--:|",
  "| Alice |a|",
  "| Bob | a longer cell that makes the table ragged | x | y |",
  "",
  "| Cell | Escaped |",
  "|-|---:|",
  "| a |    x \\| y |",
  "",
  "<!-- pagebreak -->",
  "",
  "::: {.notes}",
  "\tA tab-indented note, with trailing space.   ",
  ":::",
  "",
  "Text with `back ticks`, a \\ backslash, and \u00a0 a non-breaking space.",
  "",
  "```",
  "## Not a heading",
  "```",
  "",
  "Last line, no trailing newline.",
].join("\n");

describe("byte fidelity", () => {
  it("opens a hazardous chapter and saves it byte for byte", async () => {
    // Exactly the length the spec names, so a change to the fixture is visible.
    const longest = HAZARDOUS.split("\n").reduce(
      (found, line) => (line.length > found ? line.length : found),
      0,
    );
    expect(longest).toBe(544);
    expect(HAZARDOUS.endsWith("\n")).toBe(false);

    let written: string | null = null;
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(host, {
      chooseFolder: () => Promise.resolve(null),
      openFolder: (path) => Promise.resolve(documentTree(path, [])),
      readChapter: () => Promise.resolve(HAZARDOUS),
      writeChapter: (_path, text) => {
        written = text;
        return Promise.resolve();
      },
      confirmDiscard: () => Promise.resolve(true),
    });

    const only = chapter("01-hazard.md", "hazard", "document/01-hazard.md");
    await app.openChapter(only);
    expect(app.dirty).toBe(false);

    // Move through it without typing: every movement chord the table names.
    for (const id of [
      "end-of-buffer",
      "beginning-of-buffer",
      "next-line",
      "forward-word",
      "end-of-line",
      "beginning-of-line",
      "scroll-up",
      "scroll-down",
      "set-mark",
      "keyboard-quit",
    ]) {
      for (const chord of bindingById(id)?.chords ?? []) {
        pressSequence(app.view, chord);
      }
    }

    expect(documentText(app.view)).toBe(HAZARDOUS);
    expect(app.dirty).toBe(false);
    await app.save();
    expect(written).toBe(HAZARDOUS);
    app.destroy();
    host.remove();
  });

  it("leaves the chapter untouched for a chord outside the table", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const view = createEditor(host, HAZARDOUS);
    // `C-j`, `s-k`, and `M-,` are in no row and in no keymap the surface
    // installs, so nothing may happen to the document when they arrive.
    for (const chord of ["C-j", "s-k", "M-,", "C-M-q"]) {
      press(view, chord);
    }
    expect(documentText(view)).toBe(HAZARDOUS);
    view.destroy();
    host.remove();
  });
});

describe("the table-alignment mode switch (map #39)", () => {
  it("announces the mode on every press of C-c C-t", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(host, {
      chooseFolder: () => Promise.resolve(null),
      openFolder: (path) => Promise.resolve(documentTree(path, [])),
      readChapter: () => Promise.resolve(HAZARDOUS),
      writeChapter: () => Promise.resolve(),
      confirmDiscard: () => Promise.resolve(true),
    });
    const only = chapter("01-hazard.md", "hazard", "document/01-hazard.md");
    await app.openChapter(only);
    const saying = (): string =>
      app.modeline.element.querySelector(".modeline-message")?.textContent ?? "";

    // The chord reaches its command through the row's own place in
    // `APP_COMMAND_IDS`, not through a second copy of the chord, and the
    // message reaches the modeline through the application's own `announce`.
    const chords = bindingById("toggle-table-alignment")?.chords ?? [];
    expect(chords).toEqual(["C-c C-t"]);
    expect(tableAlignmentOn()).toBe(true);

    expect(pressSequence(app.view, "C-c C-t")).toBe(true);
    expect(tableAlignmentOn()).toBe(false);
    expect(saying()).toBe("Table alignment off");
    // The press itself realigns nothing: it writes a boolean, and the chapter
    // is exactly what it was.
    expect(documentText(app.view)).toBe(HAZARDOUS);

    expect(pressSequence(app.view, "C-c C-t")).toBe(true);
    expect(tableAlignmentOn()).toBe(true);
    expect(saying()).toBe("Table alignment on");
    expect(documentText(app.view)).toBe(HAZARDOUS);

    // Both messages fit the modeline's budget, as every announcement must.
    for (const message of ["Table alignment on", "Table alignment off"]) {
      expect(message.length, message).toBeLessThanOrEqual(MODELINE_BUDGET);
      expect(message.endsWith("."), message).toBe(false);
    }

    setTableAlignment(true);
    app.destroy();
    host.remove();
  });
});

describe("paging", () => {
  it("C-v scrolls the viewport a page rather than jumping point to the last line", () => {
    const host = document.createElement("div");
    document.body.append(host);
    // Long enough that a page's worth of scroll lands well short of the end —
    // the package's own binding routes the chord through `cursorPageDown`,
    // which jumps point straight to the chapter's last line instead
    // (`iss-2609061510051784`).
    const lines = Array.from({ length: 200 }, (_, i) => `Line ${i + 1}`);
    const view = createEditor(host, lines.join("\n"));
    // jsdom lays nothing out, so the height `scroll-up-command` pages by has
    // to be asserted by hand.
    Object.defineProperty(view.scrollDOM, "clientHeight", {
      configurable: true,
      value: 300,
    });
    place(view, 0);
    const before = view.scrollDOM.scrollTop;
    expect(press(view, "C-v")).toBe(true);
    expect(view.scrollDOM.scrollTop).toBeGreaterThan(before);
    // A scroll, not a cursor move: point stays exactly where it was, never at
    // the document's last line the way `cursorPageDown` would leave it.
    expect(view.state.selection.main.head).toBe(0);
    view.destroy();
    host.remove();
  });
});

describe("the network", () => {
  it("attempts no network request while editing", async () => {
    const attempts: string[] = [];
    const originals = {
      fetch: globalThis.fetch,
      xhr: globalThis.XMLHttpRequest,
      beacon: navigator.sendBeacon,
      socket: globalThis.WebSocket,
      source: globalThis.EventSource,
    };
    globalThis.fetch = ((input: unknown) => {
      attempts.push(`fetch ${String(input)}`);
      return Promise.reject(new Error("no network"));
    }) as typeof fetch;
    globalThis.XMLHttpRequest = class {
      open(_method: string, url: string): void {
        attempts.push(`xhr ${url}`);
      }
      send(): void {}
    } as unknown as typeof XMLHttpRequest;
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: (url: string) => {
        attempts.push(`beacon ${url}`);
        return false;
      },
    });
    globalThis.WebSocket = class {
      constructor(url: string) {
        attempts.push(`socket ${url}`);
      }
    } as unknown as typeof WebSocket;
    globalThis.EventSource = class {
      constructor(url: string) {
        attempts.push(`source ${url}`);
      }
    } as unknown as typeof EventSource;

    try {
      const host = document.createElement("div");
      document.body.append(host);
      const app = createApp(host, {
        chooseFolder: () => Promise.resolve(null),
        openFolder: (path) =>
          Promise.resolve(
            documentTree(path, [
              chapter("01-alice.md", "alice", "document/01-alice.md"),
            ]),
          ),
        readChapter: () => Promise.resolve(SAMPLE),
        writeChapter: () => Promise.resolve(),
        confirmDiscard: () => Promise.resolve(true),
      });
      await app.openFolder("document");
      await app.openChapter(chapter("01-alice.md", "alice", "document/01-alice.md"));
      for (const binding of BINDINGS) {
        if (binding.owner === "shell" || binding.owner === "app") continue;
        for (const chord of binding.chords) pressSequence(app.view, chord);
        press(app.view, "C-g");
      }
      await app.save();
      app.destroy();
      host.remove();
    } finally {
      globalThis.fetch = originals.fetch;
      globalThis.XMLHttpRequest = originals.xhr;
      Object.defineProperty(navigator, "sendBeacon", {
        configurable: true,
        value: originals.beacon,
      });
      globalThis.WebSocket = originals.socket;
      globalThis.EventSource = originals.source;
    }

    expect(attempts).toEqual([]);
  });
});

describe("line endings", () => {
  it("reads a document's separator off its first line break", () => {
    expect(lineSeparatorOf("a\r\nb")).toBe("\r\n");
    expect(lineSeparatorOf("a\nb")).toBe("\n");
    expect(lineSeparatorOf("a")).toBe("\n");
  });

  it("hands a CRLF document back byte for byte", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const crlf = "# Alice\r\n\r\nA line.\r\n";
    const view = createEditor(host, crlf);
    // The buffer reads as four lines, and writing it out restores the bytes.
    expect(view.state.doc.lines).toBe(4);
    expect(documentText(view)).toBe(crlf);

    place(view, view.state.doc.length);
    press(view, "Return");
    expect(documentText(view)).toBe(`${crlf}\r\n`);
    view.destroy();
    host.remove();
  });
});

/** A chapter entry for a stub tree. */
function chapter(name: string, title: string, path: string): Chapter {
  return { name, title, path, order: 1, bytes: 0, modified: null };
}

/** A one-Part document tree, as the shell would serialize it. */
function documentTree(
  title: string,
  chapters: readonly Chapter[],
  failures: readonly string[] = [],
): DocumentTree {
  return {
    root: {
      name: title,
      title,
      path: title,
      order: null,
      parts: [],
      chapters: [...chapters],
      truncated: false,
    },
    failures: [...failures],
  };
}

describe("Editor's own chords", () => {
  let host: HTMLElement;
  let app: App;
  let written: { path: string; text: string } | null;
  let chooseCalls: number;
  let discardAnswer: boolean;
  let discardCalls: number;
  let quitCalls: number;
  let dirtyReports: boolean[];
  let chapterText: Map<string, string>;
  /** When set, reads park here until the test releases them, in any order. */
  let heldReads: Map<string, () => void> | null;

  const tree: DocumentTree = documentTree("document", [
    chapter("01-alice.md", "alice", "document/01-alice.md"),
    chapter("02-bob.md", "bob", "document/02-bob.md"),
  ]);

  const services: AppServices = {
    chooseFolder: () => {
      chooseCalls += 1;
      return Promise.resolve("document");
    },
    openFolder: (path) =>
      Promise.resolve(path === "document" ? tree : documentTree(path, [])),
    readChapter: (path) => {
      const text = chapterText.get(path) ?? SAMPLE;
      if (!heldReads) return Promise.resolve(text);
      const held = heldReads;
      return new Promise<string>((resolve) => {
        held.set(path, () => {
          resolve(text);
        });
      });
    },
    writeChapter: (path, text) => {
      written = { path, text };
      return Promise.resolve();
    },
    confirmDiscard: () => {
      discardCalls += 1;
      return Promise.resolve(discardAnswer);
    },
    reportDirty: (dirty) => {
      dirtyReports.push(dirty);
    },
    quit: () => {
      quitCalls += 1;
      return Promise.resolve();
    },
  };

  beforeEach(() => {
    written = null;
    chooseCalls = 0;
    discardAnswer = true;
    discardCalls = 0;
    quitCalls = 0;
    dirtyReports = [];
    chapterText = new Map();
    heldReads = null;
    host = document.createElement("div");
    document.body.append(host);
    app = createApp(host, services);
  });

  afterEach(() => {
    app.destroy();
    host.remove();
  });

  it("saves the open chapter on C-x C-s", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    place(app.view, 0);
    expect(pressSequence(app.view, "C-x C-s")).toBe(true);
    await Promise.resolve();
    expect(written).toEqual({ path: "document/01-alice.md", text: SAMPLE });
  });

  it("asks for a folder on C-x C-f", async () => {
    expect(pressSequence(app.view, "C-x C-f")).toBe(true);
    await Promise.resolve();
    expect(chooseCalls).toBe(1);
  });

  it("upper-cases a region on C-x C-u and lower-cases one on C-x C-l", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    // The package binds both chords to the identical upcase call
    // (`iss-2609091729471352`), so this is where the two part company: the
    // same region, twice, and the second run must not repeat the first.
    // Editor's own command answers both chords, so neither is left to the
    // package's binding for it.
    expect(EmacsHandler.commands["editor:upcase-region"]).toBeDefined();
    expect(EmacsHandler.commands["editor:downcase-region"]).toBeDefined();

    const from = app.view.state.doc.line(1).from + 2;
    const to = app.view.state.doc.line(1).to;
    const select = (): void => {
      app.view.dispatch({ selection: EditorSelection.range(from, to) });
    };

    select();
    expect(pressSequence(app.view, "C-x C-u")).toBe(true);
    expect(app.view.state.doc.line(1).text).toBe("# ALICE AND BOB");

    select();
    expect(pressSequence(app.view, "C-x C-l")).toBe(true);
    expect(app.view.state.doc.line(1).text).toBe("# alice and bob");
    expect(app.view.state.doc.line(1).text).not.toBe("# ALICE AND BOB");
  });

  it("refuses either region chord with no region, in the modeline", async () => {
    // Both chords are claimed either way, so with the mark unset the silence
    // was a claim with nothing behind it: GNU Emacs signals
    // `mark-is-not-active` here (`iss-2609091920011632`).
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    const said = (): string => app.modeline.element.textContent ?? "";
    // House voice: a modeline message ends in no full stop.
    expect(NO_REGION_TO_CHANGE.endsWith(".")).toBe(false);

    place(app.view, 2);
    expect(pressSequence(app.view, "C-x C-u")).toBe(true);
    expect(documentText(app.view)).toBe(SAMPLE);
    expect(app.view.state.selection.main.head).toBe(2);
    expect(said()).toContain(NO_REGION_TO_CHANGE);

    // A run with a region says nothing, which is how the second refusal below
    // is a refusal of its own rather than the first one still on screen.
    app.view.dispatch({
      selection: EditorSelection.range(
        app.view.state.doc.line(1).from + 2,
        app.view.state.doc.line(1).to,
      ),
    });
    expect(pressSequence(app.view, "C-x C-u")).toBe(true);
    expect(app.view.state.doc.line(1).text).toBe("# ALICE AND BOB");
    expect(said()).not.toContain(NO_REGION_TO_CHANGE);

    place(app.view, 2);
    expect(pressSequence(app.view, "C-x C-l")).toBe(true);
    expect(app.view.state.doc.line(1).text).toBe("# ALICE AND BOB");
    expect(said()).toContain(NO_REGION_TO_CHANGE);
  });

  it("keeps a row's own refusal on screen when the prefix overlay ran it", async () => {
    // The overlay's wiring announced whatever `runBinding` returned, and an
    // application row announces its own refusal and then returns null — so the
    // empty string wiped the message the row had just put up
    // (`iss-2609100543005984`). Reached through the overlay rather than the
    // chord, because the chord route never had the fault.
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    const said = (): string => app.modeline.element.textContent ?? "";

    place(app.view, 2);
    // `C-x` opens the prefix, `C-h` the overlay over it, `C-u` completes
    // `C-x C-u` from inside it.
    expect(pressSequence(app.view, "C-x")).toBe(true);
    expect(pressSequence(app.view, "C-h")).toBe(true);
    expect(document.querySelector(".prefix-help")).not.toBeNull();
    expect(pressSequence(app.view, "C-u")).toBe(true);

    expect(documentText(app.view)).toBe(SAMPLE);
    expect(said()).toContain(NO_REGION_TO_CHANGE);
  });

  it("opens the keys panel on C-h b, on C-x ? and on F1", () => {
    // Every chord the row carries, read off the row: `F1` is the third
    // (`itd-2609091722353594`), and it reaches the panel from the editing
    // surface exactly where the other two do.
    expect(bindingById("keys-panel")?.chords).toContain("F1");
    for (const chord of bindingById("keys-panel")?.chords ?? []) {
      expect(pressSequence(app.view, chord), chord).toBe(true);
      const panel = document.querySelector(".keys-panel");
      expect(panel, chord).not.toBeNull();
      // The overlay closes on the table's own cancel chords.
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(document.querySelector(".keys-panel")).toBeNull();
    }
  });

  // The prefix overlay, reached through a real editing surface
  // (`itd-2609091722353594`). Every one of these presses the chords rather
  // than calling the module, because the whole of what the guard in
  // `emacs.ts` adds is that the key is caught while the package's own chain is
  // still live — a test that called `openPrefixHelp` would prove none of it.

  it("opens the prefix overlay on C-h after C-x, listing every chord under it with its label", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    const before = documentText(app.view);

    expect(pressSequence(app.view, "C-x")).toBe(true);
    expect(emacsStatus(app.view).prefix).toBe("C-x");
    expect(press(app.view, "C-h")).toBe(true);

    const overlay = document.querySelector<HTMLElement>(".prefix-help");
    expect(overlay).not.toBeNull();
    const lines = overlay?.querySelectorAll<HTMLElement>(".keys-row") ?? [];
    expect(lines.length).toBe(completionsUnder("C-x", EDITOR_IDS).length);

    const save = overlay?.querySelector<HTMLElement>(
      '.keys-row[data-chord="C-x C-s"]',
    );
    expect(save?.textContent).toContain("Save the chapter");
    expect(save?.nextElementSibling?.querySelector("kbd")?.textContent).toBe(
      "C-s",
    );

    // Nothing was inserted in the chapter, and the prefix is spent rather than
    // left behind under an overlay that has taken over reading it.
    expect(documentText(app.view)).toBe(before);
    expect(emacsStatus(app.view).prefix).toBe("");
  });

  it("runs the chord typed into the prefix overlay and closes it", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    expect(pressSequence(app.view, "C-x")).toBe(true);
    expect(press(app.view, "C-h")).toBe(true);
    expect(press(app.view, "C-s")).toBe(true);
    await Promise.resolve();
    expect(written).toEqual({ path: "document/01-alice.md", text: SAMPLE });
    expect(document.querySelector(".prefix-help")).toBeNull();
    expect(emacsStatus(app.view).prefix).toBe("");
  });

  it("leaves no prefix behind when C-g closes the prefix overlay", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    const before = documentText(app.view);
    expect(pressSequence(app.view, "C-x")).toBe(true);
    expect(press(app.view, "C-h")).toBe(true);
    expect(press(app.view, "C-g")).toBe(true);
    expect(document.querySelector(".prefix-help")).toBeNull();
    // Nothing to cancel: the prefix was spent when the overlay opened.
    expect(emacsStatus(app.view).prefix).toBe("");
    expect(documentText(app.view)).toBe(before);
    expect(written).toBeNull();
  });

  it("lists only the rows under C-x n when C-h follows the second step", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    expect(pressSequence(app.view, "C-x n")).toBe(true);
    expect(emacsStatus(app.view).prefix).toBe("C-x n");
    expect(press(app.view, "C-h")).toBe(true);

    const overlay = document.querySelector<HTMLElement>(".prefix-help");
    const lines = [...(overlay?.querySelectorAll<HTMLElement>(".keys-row") ?? [])];
    expect(lines.length).toBe(2);
    expect(lines.map((line) => line.textContent)).toEqual([
      "Narrow to this section",
      "Widen",
    ]);
    expect(
      overlay?.querySelector('.keys-row[data-chord="C-x C-s"]'),
    ).toBeNull();
  });

  it("leaves a bare C-h the prefix it already was", () => {
    // The guard's `if (!chain) return null` is the whole of this: with nothing
    // half-typed, `C-h` is the prefix the package holds it as, and the two
    // chords under it complete exactly as they did.
    expect(press(app.view, "C-h")).toBe(true);
    expect(document.querySelector(".prefix-help")).toBeNull();
    expect(emacsStatus(app.view).prefix).toBe("C-h");

    expect(press(app.view, "b")).toBe(true);
    expect(document.querySelector(".keys-panel")).not.toBeNull();
    escapeOverlay();
    expect(document.querySelector(".keys-panel")).toBeNull();

    expect(press(app.view, "C-h")).toBe(true);
    expect(press(app.view, "k")).toBe(true);
    expect(document.querySelector(".prompt")).not.toBeNull();
    escapeOverlay();
  });

  it("opens the insert palette on C-c i", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    expect(pressSequence(app.view, "C-c i")).toBe(true);
    expect(document.querySelector(".palette")).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "g",
        code: "KeyG",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.querySelector(".palette")).toBeNull();
    expect(documentText(app.view)).toBe(SAMPLE);
  });

  it("shows and hides the sidebar on C-x C-b", () => {
    // Map #1's own chord, still answered from the text. It is no longer a
    // toggle bound only here: it is the second chord on the row `F2` names,
    // and `src/focus.ts` answers both from a pane the surface cannot hear
    // (`itd-2609091722296239`, which amends map #36's fourth criterion).
    expect(app.sidebar.element.dataset["open"]).toBe("yes");
    expect(pressSequence(app.view, "C-x C-b")).toBe(true);
    expect(app.sidebar.element.dataset["open"]).toBe("no");
    expect(pressSequence(app.view, "C-x C-b")).toBe(true);
    expect(app.sidebar.element.dataset["open"]).toBe("yes");
  });

  it("shows and hides the sidebar on F2 as well", () => {
    expect(app.sidebar.element.dataset["open"]).toBe("yes");
    expect(pressSequence(app.view, "F2")).toBe(true);
    expect(app.sidebar.element.dataset["open"]).toBe("no");
    expect(pressSequence(app.view, "F2")).toBe(true);
    expect(app.sidebar.element.dataset["open"]).toBe("yes");
  });

  it("reloads the document on C-x C-r", async () => {
    await app.openFolder("document");
    expect(pressSequence(app.view, "C-x C-r")).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    // Nothing is written by a reload, whatever else it does.
    expect(written).toBeNull();
  });

  it("opens the preview on C-c C-v rather than paging the text", async () => {
    // `preview` is registered from outside the binding table, the way
    // `src/main.ts` registers it on the real application; the chord must
    // still reach it through the `C-c` prefix chain rather than being caught
    // by the page-down binding the second step shares a key with
    // (`iss-2609061510051784`).
    let calls = 0;
    app.registerCommand("preview", () => {
      calls += 1;
    });
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    const before = documentText(app.view);
    expect(pressSequence(app.view, "C-c C-v")).toBe(true);
    expect(calls).toBe(1);
    expect(documentText(app.view)).toBe(before);
  });

  it("shows every tier-one prose command in the keys panel", () => {
    expect(pressSequence(app.view, "C-h b")).toBe(true);
    const panel = document.querySelector(".keys-panel");
    expect(panel).not.toBeNull();
    for (const id of [
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
      "mark-word",
    ]) {
      const row = panel?.querySelector<HTMLElement>(`[data-binding="${id}"]`);
      expect(row, id).not.toBeNull();
      expect(row?.textContent ?? "", id).toContain(bindingById(id)?.label ?? "");
      const chords = row?.nextElementSibling;
      expect(chords?.className, id).toBe("keys-chords");
      for (const chord of bindingById(id)?.chords ?? []) {
        expect(chords?.textContent ?? "", id).toContain(chord);
      }
    }
  });

  it("opens the command palette on M-x, over the shared list overlay", () => {
    const before = documentText(app.view);
    expect(press(app.view, "M-x")).toBe(true);
    const palette = document.querySelector(".palette");
    expect(palette).not.toBeNull();
    expect(palette?.getAttribute("aria-label")).toBe("Run a command");
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "g",
        code: "KeyG",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.querySelector(".palette")).toBeNull();
    expect(documentText(app.view)).toBe(before);
  });

  it("reads a prefix chord into the C-h k prompt rather than into the pane cycle", () => {
    // The prompt holds the keyboard, and the pane cycle's own reader is
    // listening on the same document. A `C-x` typed into the prompt belongs
    // to the prompt: it is the first step of the chord being described, not
    // the first step of `C-x o`.
    expect(pressSequence(app.view, "C-h k")).toBe(true);
    expect(document.querySelector(".prompt")).not.toBeNull();
    expect(app.modeline.element.textContent).toContain("Describe key:");

    press(app.view, "C-x");
    expect(document.querySelector(".prompt")).not.toBeNull();
    expect(app.focus.pane).not.toBe("sidebar");
    press(app.view, "C-s");
    expect(document.querySelector(".prompt")).toBeNull();
    expect(app.modeline.element.textContent).toContain(
      "C-x C-s is Save the chapter",
    );
    expect(written).toBeNull();
  });

  it("zaps to a character read through the prompt, and yanks it back", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    place(app.view, 0);
    expect(press(app.view, "M-z")).toBe(true);
    expect(app.modeline.element.textContent).toContain("Zap to char:");
    press(app.view, "b");
    // Up to *and including* the character, as Emacs's own zap does.
    expect(documentText(app.view)).toBe(SAMPLE.slice(SAMPLE.indexOf("b") + 1));
    expect(press(app.view, "C-y")).toBe(true);
    expect(documentText(app.view)).toBe(SAMPLE);
  });

  it("asks before C-x C-c quits and keeps the edits on C-g", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    app.view.dispatch({ changes: { from: 0, insert: "Edited. " } });
    expect(app.dirty).toBe(true);

    expect(pressSequence(app.view, "C-x C-c")).toBe(true);
    const confirm = document.querySelector(".confirm");
    expect(confirm).not.toBeNull();
    expect(confirm?.textContent).toContain("Quit without saving");
    expect(confirm?.textContent).toContain("Keep editing");
    expect(quitCalls).toBe(0);

    // `C-g` puts her back in the text, with the edits still unsaved. A native
    // dialog, answering Return and Escape alone, could not do this.
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "g",
        code: "KeyG",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.querySelector(".confirm")).toBeNull();
    expect(quitCalls).toBe(0);
    expect(app.dirty).toBe(true);
    expect(documentText(app.view)).toBe(`Edited. ${SAMPLE}`);
    expect(written).toBeNull();
  });

  it("quits when the question is answered, and without asking when nothing is unsaved", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    expect(app.dirty).toBe(false);
    expect(pressSequence(app.view, "C-x C-c")).toBe(true);
    expect(document.querySelector(".confirm")).toBeNull();
    expect(quitCalls).toBe(1);

    app.view.dispatch({ changes: { from: 0, insert: "Edited. " } });
    expect(pressSequence(app.view, "C-x C-c")).toBe(true);
    expect(document.querySelector(".confirm")).not.toBeNull();

    // The overlay opens on "Keep editing", so a reflex Return keeps the edits
    // rather than throwing them away.
    const enter = (): void => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    const rows = (): HTMLElement[] =>
      Array.from(document.querySelectorAll<HTMLElement>(".confirm .palette-row"));
    expect(rows().map((row) => row.textContent)).toEqual([
      "Keep editing",
      "Quit without saving",
    ]);
    expect(rows()[0]?.dataset["current"]).toBe("yes");
    enter();
    expect(document.querySelector(".confirm")).toBeNull();
    expect(quitCalls).toBe(1);
    expect(app.dirty).toBe(true);

    // Quitting without saving is a row she has to move onto first.
    expect(pressSequence(app.view, "C-x C-c")).toBe(true);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "n",
        code: "KeyN",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(rows()[1]?.dataset["current"]).toBe("yes");
    enter();
    expect(document.querySelector(".confirm")).toBeNull();
    expect(quitCalls).toBe(2);
    // Nothing was written on the way out: quitting is not saving.
    expect(written).toBeNull();
  });

  it("cancels the quit question rather than leaving it listening behind the text", async () => {
    // An overlay holds the keyboard with a document-level capture listener,
    // and `C-x o` moves the keyboard without that listener knowing. The
    // question was then invisible and still answering: the next ordinary
    // Return in the buffer chose its first row and threw the edits away
    // (iss-2609052115254279). Leaving the overlay now cancels it, which for
    // this question means keep editing.
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    app.view.dispatch({ changes: { from: 0, insert: "Edited. " } });
    place(app.view, 0);
    expect(pressSequence(app.view, "C-x C-c")).toBe(true);
    expect(document.querySelector(".confirm")).not.toBeNull();

    expect(pressSequence(app.view, "C-x o")).toBe(true);
    expect(document.querySelector(".confirm")).toBeNull();
    expect(app.focus.pane).toBe("editor");

    // Return is the editor's again: a newline in the chapter, and no quit.
    press(app.view, "Return");
    expect(quitCalls).toBe(0);
    expect(written).toBeNull();
    expect(app.dirty).toBe(true);
    expect(documentText(app.view)).toBe(`\nEdited. ${SAMPLE}`);
  });

  it("cancels M-x rather than leaving it listening behind the text", async () => {
    // The same listener, the same route: the palette left open behind the
    // buffer would claim `C-n` for its own highlight instead of moving the
    // cursor down a line.
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    place(app.view, 0);
    expect(pressSequence(app.view, "M-x")).toBe(true);
    expect(document.querySelector(".palette")).not.toBeNull();

    expect(pressSequence(app.view, "C-x o")).toBe(true);
    expect(document.querySelector(".palette")).toBeNull();
    expect(app.focus.pane).toBe("editor");

    const before = app.view.state.selection.main.head;
    expect(press(app.view, "C-n")).toBe(true);
    expect(app.view.state.doc.lineAt(app.view.state.selection.main.head).number).toBe(
      app.view.state.doc.lineAt(before).number + 1,
    );
    expect(documentText(app.view)).toBe(SAMPLE);
  });

  it("toggles the key log on C-x k", () => {
    expect(app.keyLog.element.hidden).toBe(true);
    expect(pressSequence(app.view, "C-x k")).toBe(true);
    expect(app.keyLog.element.hidden).toBe(false);
  });

  it("shows the chapter, the position, and the mark in the modeline", async () => {
    await app.openChapter(tree.root.chapters[0]!);
    press(app.view, "C-n");
    press(app.view, "C-Space");
    const text = app.modeline.element.textContent ?? "";
    expect(text).toContain("alice");
    expect(text).toContain("L2:C1");
    expect(text).toContain("Mark");
  });

  it("shows a half-typed prefix in the modeline, and clears it on C-g", () => {
    const prefixCell = app.modeline.element.querySelector(".modeline-prefix");
    expect(prefixCell?.textContent).toBe("");
    press(app.view, "C-x");
    expect(prefixCell?.textContent).toBe("C-x-");
    expect(prefixCell?.getAttribute("data-active")).toBe("yes");
    press(app.view, "C-g");
    expect(prefixCell?.textContent).toBe("");
    expect(prefixCell?.getAttribute("data-active")).toBe("no");
  });

  it("keeps a chapter's undo history to itself", async () => {
    chapterText.set("document/02-bob.md", "# Bob\n");
    await app.openChapter(tree.root.chapters[0]!);
    place(app.view, 0);
    press(app.view, "C-k");
    expect(app.view.state.doc.line(1).text).toBe("");

    discardAnswer = true;
    await app.openChapter(tree.root.chapters[1]!);
    expect(documentText(app.view)).toBe("# Bob\n");

    // Undo in Bob must not reach back into Alice: were the history shared,
    // this would resurrect Alice's text and the next save would write it
    // into Bob's file.
    press(app.view, "C-/");
    expect(documentText(app.view)).toBe("# Bob\n");

    pressSequence(app.view, "C-x C-s");
    await Promise.resolve();
    await Promise.resolve();
    expect(written).toEqual({ path: "document/02-bob.md", text: "# Bob\n" });
  });

  it("opens a CRLF chapter clean and saves it with its own endings", async () => {
    const crlf = "# Alice\r\n\r\nA line.\r\n";
    chapterText.set("document/01-alice.md", crlf);
    await app.openChapter(tree.root.chapters[0]!);

    expect(app.dirty).toBe(false);
    expect(app.modeline.element.textContent).toContain("-- alice");
    expect(documentText(app.view)).toBe(crlf);

    pressSequence(app.view, "C-x C-s");
    await Promise.resolve();
    await Promise.resolve();
    expect(written).toEqual({ path: "document/01-alice.md", text: crlf });
  });

  it("forgets the open chapter when another document is opened", async () => {
    await app.openFolder("document");
    await app.openChapter(tree.root.chapters[0]!);
    expect(app.modeline.element.textContent).toContain("alice");

    await app.openFolder("elsewhere");
    // The old chapter is gone from the sidebar, so a save must not still be
    // aimed at its file.
    expect(app.modeline.element.textContent).toContain("no chapter");
    pressSequence(app.view, "C-x C-s");
    await Promise.resolve();
    expect(written).toBeNull();
    expect(app.modeline.element.textContent).toContain("No chapter to save");
  });

  it("drops a chapter read that a later one has overtaken", async () => {
    chapterText.set("document/01-alice.md", "# Alice\n");
    chapterText.set("document/02-bob.md", "# Bob\n");
    heldReads = new Map();

    const first = app.openChapter(tree.root.chapters[0]!);
    const second = app.openChapter(tree.root.chapters[1]!);
    await Promise.resolve();
    await Promise.resolve();

    // Bob was clicked second but comes back first; Alice must not overwrite
    // it when she finally arrives.
    heldReads.get("document/02-bob.md")?.();
    await second;
    heldReads.get("document/01-alice.md")?.();
    await first;

    expect(documentText(app.view)).toBe("# Bob\n");
    expect(app.modeline.element.textContent).toContain("bob");

    heldReads = null;
    pressSequence(app.view, "C-x C-s");
    await Promise.resolve();
    await Promise.resolve();
    expect(written).toEqual({ path: "document/02-bob.md", text: "# Bob\n" });
  });

  it("asks before unsaved edits are lost, and keeps them on a refusal", async () => {
    await app.openChapter(tree.root.chapters[0]!);
    place(app.view, 0);
    press(app.view, "C-k");
    expect(app.dirty).toBe(true);

    discardAnswer = false;
    await app.openChapter(tree.root.chapters[1]!);
    expect(discardCalls).toBe(1);
    expect(app.modeline.element.textContent).toContain("Kept the open chapter");
    expect(app.view.state.doc.line(1).text).toBe("");

    await app.openFolder("elsewhere");
    expect(discardCalls).toBe(2);
    expect(app.view.state.doc.line(1).text).toBe("");
  });

  it("holds a close back while the chapter is dirty, and tells the shell", async () => {
    await app.openChapter(tree.root.chapters[0]!);
    expect(await app.confirmClose()).toBe(true);

    place(app.view, 0);
    press(app.view, "C-k");
    expect(dirtyReports.at(-1)).toBe(true);

    discardAnswer = false;
    expect(await app.confirmClose()).toBe(false);
    discardAnswer = true;
    expect(await app.confirmClose()).toBe(true);
  });

  it("reports the entries a walk could not read", async () => {
    const partial = documentTree("partial", [], ["cannot inspect 02-closed"]);
    const failing: AppServices = {
      ...services,
      openFolder: () => Promise.resolve(partial),
    };
    const otherHost = document.createElement("div");
    document.body.append(otherHost);
    const other = createApp(otherHost, failing);
    await other.openFolder("partial");
    expect(other.modeline.element.textContent).toContain("1 entries unreadable");
    other.destroy();
    otherHost.remove();
  });
});

/**
 * One answer to "may CodeMirror answer this chord", for the keyboard and for
 * the palette.
 *
 * `runBinding` resolved a row against the three raw keymaps while the editing
 * surface installed them filtered, so a row whose chord `SUPPRESSED` takes out
 * of CodeMirror's keymap could still reach the command the suppression exists
 * to keep away (`iss-2609100519025566`). Both readers now share
 * `codemirrorKeymap`, and these three tests hold the asymmetry closed from
 * both sides: the suppressed chord is out of reach, and nothing else is.
 */
describe("suppression, from the keyboard and from M-x", () => {
  let host: HTMLElement;
  let view: EditorView;

  /** The three keymaps as their packages ship them, unfiltered. */
  const raw: readonly KeyBinding[] = [
    ...defaultKeymap,
    ...historyKeymap,
    ...searchKeymap,
  ];

  /** Whether a keymap entry is the one `runBinding` would resolve a row by. */
  const answers = (entry: KeyBinding, chords: readonly string[]): boolean => {
    const spec = entry.mac ?? entry.key;
    if (spec === undefined) return false;
    return chords.includes(canonicalChord(fromKeymapSpec(spec)));
  };

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    view = createEditor(host, SAMPLE);
  });

  afterEach(() => {
    view.destroy();
    host.remove();
  });

  it("refuses a row rather than reaching the command its chord is suppressed for", () => {
    // `prefix-help` carries `C-h`, suppressed in CodeMirror's keymap precisely
    // so that `defaultKeymap`'s `Ctrl-h` — delete-backward — cannot answer it.
    // The row resolves at `runBinding`'s first step today, through the
    // editor-owned command registered for it, so the third step is reached
    // only with that command out of the way. Taking it away is what puts the
    // suppression itself under test rather than the registration that happens
    // to shadow it: the next row to carry a suppressed chord will have no such
    // shadow.
    const row = bindingById("prefix-help");
    expect(row?.chords).toEqual(["C-h"]);
    expect(isSuppressedIn("C-h", "codemirror")).toBe(true);

    const own = EmacsHandler.commands["editor:prefix-help"];
    expect(own).toBeDefined();
    delete EmacsHandler.commands["editor:prefix-help"];
    try {
      place(view, 2);
      const said = runBinding(view, "prefix-help");
      expect(documentText(view)).toBe(SAMPLE);
      expect(view.state.selection.main.head).toBe(2);
      expect(said).toBe("What can follow this prefix did nothing here");
    } finally {
      EmacsHandler.commands["editor:prefix-help"] = own!;
    }
  });

  it("takes only the suppressed chords out of CodeMirror's own keymaps", () => {
    const kept = codemirrorKeymap();
    const dropped = raw.filter((entry) => !kept.includes(entry));
    // Worth nothing if it dropped nothing.
    expect(dropped.length).toBeGreaterThan(0);
    for (const entry of dropped) {
      const spellings = [entry.mac, entry.key].filter(
        (spec): spec is string => spec !== undefined,
      );
      expect(
        spellings.some((spec) =>
          isSuppressedIn(fromKeymapSpec(spec), "codemirror"),
        ),
        spellings.join(" / "),
      ).toBe(true);
    }
  });

  it("leaves every other row resolving through the keymap loop exactly as before", () => {
    const kept = codemirrorKeymap();
    let reached = 0;
    for (const binding of BINDINGS.filter(
      (row) => scopeOf(row) === "editor",
    )) {
      const chords = binding.chords.map(canonicalChord);
      if (chords.some((chord) => isSuppressedIn(chord, "codemirror"))) continue;
      const before = raw.filter((entry) => answers(entry, chords));
      const after = kept.filter((entry) => answers(entry, chords));
      expect(after, binding.id).toEqual(before);
      if (after.length > 0) reached += 1;
    }
    // Rows CodeMirror's keymaps really do answer, so the sweep above is over
    // something. They resolve at an earlier step where the Emacs layer or
    // Editor claims the chord; what matters here is that the loop still finds
    // for them what it always found.
    expect(reached).toBeGreaterThan(0);
  });
});

/**
 * Option as Meta, with the events macOS actually sends.
 *
 * This is the half of row 1 of the manual checklist a test can reach. It
 * cannot say whether macOS lets the keydown through, but it can say that once
 * it arrives — carrying the character or the accent macOS was about to compose
 * — the chord is read from the physical key, the command runs, and nothing is
 * typed into the buffer.
 */
describe("Option as Meta", () => {
  let host: HTMLElement;
  let view: EditorView;

  /** The dead keys macOS composes an accent on, by physical key. */
  const DEAD_KEYS: readonly (readonly [string, string])[] = [
    ["KeyE", "M-e"],
    ["KeyU", "M-u"],
    ["KeyI", "M-i"],
    ["KeyN", "M-n"],
    ["Backquote", "M-`"],
  ];

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    view = createEditor(host, SAMPLE);
  });

  afterEach(() => {
    view.destroy();
    host.remove();
  });

  it("reads a dead key as the letter's chord", () => {
    for (const [code, chord] of DEAD_KEYS) {
      const event = new KeyboardEvent("keydown", {
        key: "Dead",
        code,
        altKey: true,
      });
      expect(chordFromEvent(event)).toBe(canonicalChord(chord));
    }
  });

  it("runs the command a dead key's chord names", () => {
    // Option-u is both an accent key and `M-u`, upcase-word. The table wins.
    place(view, 2);
    expect(pressRaw(view, { key: "Dead", code: "KeyU", altKey: true })).toBe(
      true,
    );
    expect(view.state.doc.line(1).text).toContain("ALICE");
  });

  it("claims a dead key no command answers, and types nothing", () => {
    const before = documentText(view);
    for (const [code] of DEAD_KEYS) {
      if (code === "KeyU") continue;
      expect(pressRaw(view, { key: "Dead", code, altKey: true })).toBe(true);
    }
    expect(documentText(view)).toBe(before);
  });

  it("claims an Option chord that would have typed a character", () => {
    // Option-8 is `•` on a US layout, and no row of the table names it. The
    // chord is claimed all the same: Option is Meta, so it never types.
    const before = documentText(view);
    expect(pressRaw(view, { key: "•", code: "Digit8", altKey: true })).toBe(
      true,
    );
    expect(documentText(view)).toBe(before);
  });

  it("cancels the composition an Option keydown would have started", () => {
    pressRaw(view, { key: "Dead", code: "KeyE", altKey: true });
    const started = new CompositionEvent("compositionstart", {
      bubbles: true,
      cancelable: true,
    });
    view.contentDOM.dispatchEvent(started);
    expect(started.defaultPrevented).toBe(true);

    const input = new InputEvent("beforeinput", {
      inputType: "insertCompositionText",
      data: "´",
      bubbles: true,
      cancelable: true,
    });
    view.contentDOM.dispatchEvent(input);
    expect(input.defaultPrevented).toBe(true);
    expect(documentText(view)).toBe(SAMPLE);
  });

  it("lets the next ordinary key type, however fast it follows", () => {
    // The composition window shuts on the next keydown, so an author who
    // types a letter straight after an Option chord gets the letter rather
    // than losing it to a guard still watching for an accent.
    pressRaw(view, { key: "Dead", code: "KeyE", altKey: true });
    pressRaw(view, { key: "a", code: "KeyA" });
    const input = new InputEvent("beforeinput", {
      inputType: "insertText",
      data: "a",
      bubbles: true,
      cancelable: true,
    });
    view.contentDOM.dispatchEvent(input);
    expect(input.defaultPrevented).toBe(false);
  });

  it("leaves Option on a named key to the keymap that binds it", () => {
    // `M-Up` moves the line and produces no character, so the guard has to
    // keep its hands off it. The line at the cursor swaps with the one above.
    place(view, view.state.doc.line(3).from);
    expect(press(view, "M-Up")).toBe(true);
    expect(view.state.doc.line(2).text).toBe("Carol reads the second line.");
  });

  it("reads Option-Shift-5 as the query-replace chord", () => {
    // macOS puts `ﬁ` in `key` for Option-Shift-5; the physical key is Digit5.
    const event = new KeyboardEvent("keydown", {
      key: "ﬁ",
      code: "Digit5",
      altKey: true,
      shiftKey: true,
    });
    expect(chordFromEvent(event)).toBe(canonicalChord("M-S-5"));
    expect(bindingById("query-replace")?.chords.map(canonicalChord)).toContain(
      chordFromEvent(event),
    );
  });

  it("opens the replacement field on Option-Shift-5 as macOS sends it", () => {
    expect(
      pressRaw(view, {
        key: "ﬁ",
        code: "Digit5",
        altKey: true,
        shiftKey: true,
      }),
    ).toBe(true);
    expect(searchPanelOpen(view.state)).toBe(true);
    expect(documentText(view)).toBe(SAMPLE);
  });

  it("runs the word commands from the characters macOS composes", () => {
    // The heart of it. Every one of these arrives with a character in `key`
    // that no binding names — `ƒ`, `∫`, `∂` — and the command still runs,
    // because the chord is read from the physical key.
    // `# Alice and Bob`: from just before the A, one word forward is the end
    // of `Alice`, and one word back is where it started.
    place(view, 2);
    expect(pressRaw(view, { key: "ƒ", code: "KeyF", altKey: true })).toBe(true);
    expect(view.state.selection.main.head).toBe(2 + "Alice".length);

    expect(pressRaw(view, { key: "∫", code: "KeyB", altKey: true })).toBe(true);
    expect(view.state.selection.main.head).toBe(2);

    expect(pressRaw(view, { key: "∂", code: "KeyD", altKey: true })).toBe(true);
    expect(view.state.doc.line(1).text).not.toContain("Alice");
    expect(documentText(view)).not.toContain("∂");
  });

  it("copies and rotates the kill ring from composed characters", () => {
    place(view, 0);
    press(view, "C-Space");
    press(view, "C-e");
    // Option-w is `∑`; the region is copied and the document is untouched.
    expect(pressRaw(view, { key: "∑", code: "KeyW", altKey: true })).toBe(true);
    expect(documentText(view)).toBe(SAMPLE);

    press(view, "C-k");
    press(view, "C-y");
    expect(view.state.doc.line(1).text).toBe("# Alice and Bob");
    // Option-y is `¥`: yank-rotate, which puts the previous kill in its place.
    expect(pressRaw(view, { key: "¥", code: "KeyY", altKey: true })).toBe(true);
    expect(documentText(view)).not.toContain("¥");
  });

  it("moves to the ends of the document on the Option-Shift chords", () => {
    // `M-<` and `M->` are Option-Shift on the comma and full-stop keys, and
    // macOS composes `¯` and `˘` out of them.
    place(view, 5);
    expect(
      pressRaw(view, {
        key: "˘",
        code: "Period",
        altKey: true,
        shiftKey: true,
      }),
    ).toBe(true);
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
    expect(
      pressRaw(view, { key: "¯", code: "Comma", altKey: true, shiftKey: true }),
    ).toBe(true);
    expect(view.state.selection.main.head).toBe(0);
    expect(documentText(view)).toBe(SAMPLE);
  });

  it("opens the command line on Option-x", () => {
    // `M-x` arrives as `≈`. The package answers it with a prefix of its own,
    // which is enough to say the chord reached the handler rather than the
    // guard; `C-g` puts the handler back.
    expect(pressRaw(view, { key: "≈", code: "KeyX", altKey: true })).toBe(true);
    expect(documentText(view)).toBe(SAMPLE);
    press(view, "C-g");
  });

  it("reads the other Option-Shift chords from the physical key too", () => {
    const shifted: readonly (readonly [string, string, string])[] = [
      ["€", "Digit2", "M-S-2"],
      ["¯", "Comma", "M-S-,"],
      ["˘", "Period", "M-S-."],
    ];
    for (const [key, code, chord] of shifted) {
      const event = new KeyboardEvent("keydown", {
        key,
        code,
        altKey: true,
        shiftKey: true,
      });
      expect(chordFromEvent(event)).toBe(canonicalChord(chord));
    }
  });
});

describe("the key log", () => {
  let host: HTMLElement;
  let view: EditorView;
  let log: ReturnType<typeof installKeyLog>;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    // The log listens on the window in the capture phase, and the chords it
    // is meant to report are the ones the editing surface handles. Anything
    // narrower — a bare EventTarget, a hand-called `preventDefault` — proves
    // only that the recorder can be fed, not that the real path works.
    log = installKeyLog(window);
    view = createEditor(host, SAMPLE);
  });

  afterEach(() => {
    log.dispose();
    view.destroy();
    host.remove();
  });

  it("records the chords that reach the page, and the verdict on each", async () => {
    press(view, "C-a");
    press(view, "q");
    await new Promise((resolve) => setTimeout(resolve, 1));

    const seen = log.observations.map((observation) => observation.chord);
    expect(seen).toEqual(["C-a", "q"]);
    expect(log.observations[0]).toMatchObject({
      chord: "C-a",
      known: true,
      claimed: true,
      handled: true,
      target: "div",
    });
    expect(log.observations[1]).toMatchObject({
      chord: "q",
      known: false,
      claimed: false,
      handled: false,
    });
  });

  it("tells a chord a command answered from one Option merely claimed", async () => {
    // Both are dead keys and both are claimed, so `defaultPrevented` says the
    // same thing about each. Only one reached a command, and the spike's whole
    // verdict is which chords do.
    pressRaw(view, { key: "Dead", code: "KeyU", altKey: true });
    pressRaw(view, { key: "Dead", code: "KeyI", altKey: true });
    await new Promise((resolve) => setTimeout(resolve, 1));

    expect(log.observations[0]).toMatchObject({
      chord: "M-u",
      known: true,
      claimed: true,
      handled: true,
    });
    // `M-i` is in neither list, which is what makes it the honest example of
    // a chord Option claimed and nothing answered.
    expect(bindingById("dabbrev-expand")?.chords).toEqual(["M-/"]);
    expect(chordIndexIn("editor").has("M-i")).toBe(false);
    expect(log.observations[1]).toMatchObject({
      chord: "M-i",
      known: false,
      claimed: true,
      handled: false,
    });
  });

  it("reports a redo pressed as Shift-Control-slash as a chord it knows", async () => {
    // The row the modifier-order bug used to lie about: the browser hands over
    // `?` rather than `/`, and the table writes the modifiers the other way
    // round, so the log said "not in table" for a chord that works.
    press(view, "S-C-/");
    await new Promise((resolve) => setTimeout(resolve, 1));

    expect(log.observations).toHaveLength(1);
    expect(log.observations[0]).toMatchObject({
      chord: canonicalChord("S-C-/"),
      known: true,
      handled: true,
    });
  });

  it("stops listening once it is disposed", async () => {
    log.dispose();
    press(view, "C-a");
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(log.observations).toHaveLength(0);
  });
});

/**
 * The bundler, which is the one thing no test here runs.
 *
 * Vitest loads a dependency as it lies on disk. The application loads it
 * through Rolldown — twice, once for the dev server's pre-bundle and once for
 * the release build — and Rolldown honours the `/*@__PURE__*\/` annotations
 * this package puts on the two calls that install it. Both were dropped, so
 * the running application had a keymap with no bindings and no commands while
 * every test in this file passed. `vite.config.ts` turns the annotations off;
 * these two tests are what says the hazard is still there to be turned off,
 * and that nothing else has to be done about it here.
 */
describe("the package's own installation", () => {
  it("is present once the module is loaded", () => {
    expect(packageKeymapInstalled()).toBe(true);
    // Not just any command: one the package registers in the call a bundler
    // was told it may drop.
    expect(typeof EmacsHandler.commands["killLine"]).not.toBe("undefined");
  });

  it("still carries the annotations vite.config.ts refuses to honour", () => {
    // Relative to the project root, which is where Vitest runs.
    const source = readFileSync(
      join(process.cwd(), "node_modules/@replit/codemirror-emacs/dist/index.js"),
      "utf8",
    );
    // If either of these fails, the package has stopped claiming its own
    // installation is a pure call, and the `treeshake` setting in
    // `vite.config.ts` can go with it.
    expect(source).toContain("/*@__PURE__*/EmacsHandler.bindKey(i, emacsKeys[i])");
    expect(source).toContain("/*@__PURE__*/EmacsHandler.addCommands(");
  });

  it("is said in the modeline when it is missing, not only in the console", () => {
    // The console error the fix shipped with is seen by a developer who opens
    // the console and by nobody else. The author sees the modeline, so the
    // build that dropped the keymap says so there.
    const modeline = createModeline();
    const context = { chapter: null, dirty: false, message: "" };

    modeline.update(null, context);
    const keymapCell = modeline.element.querySelector<HTMLElement>(
      ".modeline-keymap",
    );
    expect(keymapCell?.dataset["installed"]).toBe("yes");
    expect(keymapCell?.textContent).toBe("");

    // The state a build with the annotations honoured leaves behind: the
    // package's own commands are simply not there.
    const commands = EmacsHandler.commands;
    const killLine = commands["killLine"];
    delete commands["killLine"];
    try {
      expect(packageKeymapInstalled()).toBe(false);
      modeline.update(null, context);
      expect(keymapCell?.dataset["installed"]).toBe("no");
      expect(keymapCell?.textContent).toBe("no keymap");
      expect(keymapCell?.title).toContain("vite.config.ts");
    } finally {
      if (killLine !== undefined) commands["killLine"] = killLine;
    }

    expect(packageKeymapInstalled()).toBe(true);
    modeline.update(null, context);
    expect(keymapCell?.textContent).toBe("");
  });

  it("is what tools/check-bundle.mjs looks for in the built file", () => {
    // The guard reads the emitted bundle, which this suite never builds. What
    // is checked here is that the two things it looks for are the two the
    // dependency actually does: a guard that matched nothing would pass a
    // build with the keymap dropped.
    const guard = readFileSync(join(process.cwd(), "tools/check-bundle.mjs"), "utf8");
    const source = readFileSync(
      join(process.cwd(), "node_modules/@replit/codemirror-emacs/dist/index.js"),
      "utf8",
    );
    const patternFor = (name: string): RegExp => {
      const line = guard.match(new RegExp(`const ${name} =\\s*(/.*/);`));
      expect(line?.[1], `${name} is no longer a literal in the guard`).toBeTruthy();
      return new RegExp((line?.[1] ?? "").slice(1, -1));
    };
    expect(patternFor("BIND_LOOP").test(source)).toBe(true);
    expect(patternFor("ADD_COMMANDS").test(source)).toBe(true);
    expect(guard).toContain("killLine");
    // And the witness is a property of the table, which is what tells the
    // dependency's own `killLine` apart from the name this module carries as
    // a string. Both spellings are in the dependency; only one is a key.
    expect(patternFor("WITNESS_KEY").test(source)).toBe(true);
    // `PACKAGE_COMMAND` in `src/emacs.ts`, spelled the way the bundler emits
    // it: a string, and not a key of anything.
    expect(patternFor("WITNESS_KEY").test('const x="killLine";')).toBe(false);
  });

  it("is what a built bundle is failed for lacking", async () => {
    // The guard itself, run as `npm run build` runs it, over a folder shaped
    // like `dist`: one bundle carrying the two calls, one with them dropped
    // exactly as Rolldown dropped them.
    const { execFileSync } = await import("node:child_process");
    const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");

    const installed = [
      "const Ww={a:1};class Q{static bindKey(){}static addCommands(){}}",
      "for(let e in Ww)Q.bindKey(e,Ww[e]);",
      "Q.addCommands({unsetTransientMark:function(){},killLine:function(){}});",
    ].join("\n");
    // What the annotations bought the bundler: the loop's body gone and the
    // command table with it.
    const dropped = "const Ww={a:1};for(let e in Ww)Ww[e];\n";

    // The guard has a second gate — the deck engine, `iss-2609061132369973` —
    // over the present entry, and it fails a `dist` with no present chunk in
    // it. This test is about the keymap, so every folder it writes gets a
    // healthy present chunk underneath: what varies here is the keymap alone.
    // The engine gate's own failures are held in `present.test.ts`.
    const engine = [
      "class P{}var F=P;",
      'F.initialize=e=>(Object.assign(F,new P(document.querySelector(".reveal"),e)),F.initialize());',
      'function V(){return typeof F?.initialize==="function"?F:null}',
      "function Me(e,t,n,r=V()){return r===null?n:(r.initialize({}),!0)}",
      "console.log(Me);",
    ].join("\n");

    /** Write one `dist` folder of named chunks and run the guard over it. */
    const runOver = (
      chunks: Readonly<Record<string, string>>,
    ): { code: number; output: string } => {
      const dist = mkdtempSync(join(tmpdir(), "check-bundle-"));
      mkdirSync(join(dist, "assets"));
      for (const [name, source] of Object.entries({
        "present-abc123.js": engine,
        ...chunks,
      })) {
        writeFileSync(join(dist, "assets", name), source);
      }
      try {
        const output = execFileSync(
          process.execPath,
          [join(process.cwd(), "tools/check-bundle.mjs"), dist],
          { encoding: "utf8", stdio: "pipe" },
        );
        return { code: 0, output };
      } catch (error) {
        const failure = error as { status?: number; stderr?: string };
        return { code: failure.status ?? 1, output: failure.stderr ?? "" };
      }
    };

    const run = (source: string): { code: number; output: string } =>
      runOver({ "main-abc123.js": source });

    const whole = run(installed);
    expect(whole.code, whole.output).toBe(0);
    expect(whole.output).toContain("the Emacs keymap is installed");

    const inert = run(dropped);
    expect(inert.code).not.toBe(0);
    expect(inert.output).toContain("bindKey loop");
    expect(inert.output).toContain("addCommands call");

    // The witness is the table's `killLine`, not the file's. This is the
    // application's own `PACKAGE_COMMAND` sitting in a bundle whose table was
    // registered without the command: the name is in the file and the command
    // is not, which is exactly the build the witness exists to fail.
    const named = [
      "const Ww={a:1};class Q{static bindKey(){}static addCommands(){}}",
      "for(let e in Ww)Q.bindKey(e,Ww[e]);",
      "Q.addCommands({unsetTransientMark:function(){}});",
      'const PACKAGE_COMMAND="killLine";console.log(PACKAGE_COMMAND);',
    ].join("\n");
    const witness = run(named);
    expect(witness.code).not.toBe(0);
    expect(witness.output).toContain("killLine");
    expect(witness.output).not.toContain("bindKey loop");

    // A chunk split is not a keymap dropped. The entry loads the chunk the
    // package landed in, so the build works and the guard says so.
    const split = runOver({
      "main-abc123.js": 'import"./emacs-def456.js";\nconsole.log(1);',
      "emacs-def456.js": installed,
    });
    expect(split.code, split.output).toBe(0);
    expect(split.output).toContain("emacs-def456.js");
    expect(split.output).toContain("main-abc123.js");

    // And a chunk the entry does not load is not a keymap the application
    // has: that is a wiring failure, reported as one.
    const orphaned = runOver({
      "main-abc123.js": dropped,
      "emacs-def456.js": installed,
    });
    expect(orphaned.code).not.toBe(0);
    expect(orphaned.output).toContain("emacs-def456.js");
    expect(orphaned.output).toContain("does not load");
  });
});

describe("the documented chords", () => {
  it("names the save chord as C-x C-s", () => {
    expect(bindingById("save-chapter")?.chords).toContain("C-x C-s");
  });

  it("names the open chord as C-x C-f, with Command-O owned by the shell", () => {
    expect(bindingById("open-folder")?.chords).toEqual(["C-x C-f"]);
    const menu = bindingById("open-folder-menu");
    expect(menu?.chords).toEqual(["s-o"]);
    expect(menu?.owner).toBe("shell");
  });
});

describe("the reading views' own vocabulary (map #26)", () => {
  it("names only rows that exist in the table", () => {
    expect(() => readingBindings()).not.toThrow();
    for (const id of READING_BINDING_IDS) {
      expect(bindingById(id), `${id} is not a row in BINDINGS`).toBeDefined();
    }
  });

  it("resolves to the table's own rows, in the order it names them", () => {
    const rows = readingBindings();
    expect(rows.map((row) => row.id)).toEqual([...READING_BINDING_IDS]);
    for (const row of rows) {
      expect(row).toBe(bindingById(row.id));
    }
  });
});
