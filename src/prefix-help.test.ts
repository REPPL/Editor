/**
 * The prefix overlay: the filter over the binding table, and the overlay that
 * reads one key at a time out of it.
 *
 * The filter is tested without a DOM, because that is the half a reader can
 * reason about: which chords are under a prefix, in what order, and drawn from
 * where. The overlay is tested through real keydowns, because the whole of what
 * it adds is that it holds the keyboard — a test that called its reader
 * directly would prove nothing about the key never reaching the chapter.
 *
 * Every chord pressed here comes from the table. Nothing in this file names a
 * key of its own except the physical shapes a keydown carries.
 */

import { afterEach, describe, expect, it } from "vitest";

import { BINDINGS, bindingById, canonicalChord, chordIndexIn, scopeOf } from "./keys";
import { closeOverlay } from "./overlay";
import { completionsUnder, openPrefixHelp } from "./prefix-help";
import { CANCELLED } from "./prose";

/** The rows the editing surface can run, which is what it offers the overlay. */
const EDITOR_IDS: readonly string[] = BINDINGS.filter(
  (binding) => scopeOf(binding) === "editor",
).map((binding) => binding.id);

/** The rows a pane the editing surface cannot hear answers, as `focus.ts` does. */
const TREE_IDS: readonly string[] = [
  "other-window",
  "toggle-sidebar",
  ...BINDINGS.filter((binding) => scopeOf(binding) === "sidebar").map(
    (binding) => binding.id,
  ),
];

/** The physical key each punctuation chord name sits on. */
const CODES: Readonly<Record<string, string>> = {
  "/": "Slash",
  "-": "Minus",
  "=": "Equal",
  ",": "Comma",
};

/** Dispatch one keydown, as a real key would arrive, and say if it was claimed. */
function pressKey(name: string, modifiers: readonly string[] = []): boolean {
  const code = /^[a-z]$/i.test(name)
    ? `Key${name.toUpperCase()}`
    : /^[0-9]$/.test(name)
      ? `Digit${name}`
      : (CODES[name] ?? name);
  const event = new KeyboardEvent("keydown", {
    key: name,
    code,
    ctrlKey: modifiers.includes("C"),
    altKey: modifiers.includes("M"),
    metaKey: modifiers.includes("s"),
    shiftKey: modifiers.includes("S"),
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event.defaultPrevented;
}

/** What one open overlay was told, and what it said back. */
interface Watched {
  readonly ran: string[];
  readonly said: string[];
  readonly element: HTMLElement;
}

function open(prefix: string, ids: readonly string[] = EDITOR_IDS): Watched {
  const ran: string[] = [];
  const said: string[] = [];
  const overlay = openPrefixHelp({
    prefix,
    ids,
    announce: (message) => said.push(message),
    run: (id) => ran.push(id),
  });
  return { ran, said, element: overlay.element };
}

/** The chord each line of an open overlay stands for, in the order drawn. */
function chordsOn(element: HTMLElement): string[] {
  return [...element.querySelectorAll<HTMLElement>(".keys-row")]
    .map((row) => row.dataset["chord"])
    .filter((chord): chord is string => chord !== undefined);
}

/** What each line shows as left to type, in the order drawn. */
function restsOn(element: HTMLElement): string[] {
  return [...element.querySelectorAll<HTMLElement>(".keys-chords")].map(
    (detail) => detail.textContent ?? "",
  );
}

afterEach(() => {
  closeOverlay();
});

describe("the filter over the table", () => {
  it("lists every chord under the prefix, and nothing that is not under it", () => {
    const under = completionsUnder("C-x", EDITOR_IDS);
    // The largest prefix Editor ships. Counted, so that a row added or taken
    // away is a change a reader of this file has to look at.
    expect(under.length).toBe(25);
    for (const entry of under) {
      expect(entry.chord.startsWith("C-x ")).toBe(true);
      expect(entry.rest).toBe(entry.chord.slice("C-x ".length));
    }
    const chords = under.map((entry) => entry.chord);
    expect(chords).toContain("C-x C-s");
    expect(chords).toContain("C-x o");
    // `C-x` itself is not under `C-x`, and neither is a chord that merely
    // starts with the same characters.
    expect(chords).not.toContain("C-x");
    expect(chords).not.toContain("C-c i");
  });

  it("gives one line to each chord of a row under the prefix, and none to its others", () => {
    const under = completionsUnder("C-x", EDITOR_IDS);
    const undo = bindingById("undo");
    // `undo` carries five chords; exactly one of them is under `C-x`.
    expect((undo?.chords ?? []).length).toBeGreaterThan(1);
    const forUndo = under.filter((entry) => entry.binding.id === "undo");
    expect(forUndo.map((entry) => entry.rest)).toEqual(["u"]);

    // And a row with two chords under the one prefix contributes two lines:
    // `C-x h` and `C-x C-p` are two ways to select the whole document, and
    // both are worth reading.
    const forSelectAll = under.filter(
      (entry) => entry.binding.id === "select-all",
    );
    expect(forSelectAll.map((entry) => entry.rest).sort()).toEqual([
      "C-p",
      "h",
    ]);
  });

  it("orders the lines by what is left to type", () => {
    const rests = completionsUnder("C-x", EDITOR_IDS).map((entry) => entry.rest);
    const sorted = [...rests].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    expect(rests).toEqual(sorted);
    // Not the keys panel's group order: this list is scanned for the next
    // keystroke, where a heading does not earn its space.
    expect(rests[0]).toBe("b");
  });

  it("lists only what is under a two-step prefix", () => {
    const under = completionsUnder("C-x n", EDITOR_IDS);
    expect(under.map((entry) => entry.binding.id)).toEqual([
      "outline-narrow",
      "outline-widen",
    ]);
    expect(under.map((entry) => entry.rest)).toEqual(["n", "w"]);
    expect(under.map((entry) => entry.chord)).not.toContain("C-x C-s");
  });

  it("lists the pane's own rows when the pane is not the editing surface", () => {
    // The overlay is the same overlay everywhere; the rows are the pane's.
    // Listing a row the pane cannot run would promise a chord that does
    // nothing (`itd-2609091722353594`, sixth criterion as amended).
    const under = completionsUnder("C-x", TREE_IDS);
    expect(under.map((entry) => entry.binding.id).sort()).toEqual([
      "other-window",
      "toggle-sidebar",
    ]);
    expect(under.map((entry) => entry.chord)).not.toContain("C-x C-s");
  });
});

describe("the prefix overlay", () => {
  it("reads every row it lists out of the binding table, and writes no list of its own", () => {
    const index = chordIndexIn("editor");
    for (const prefix of ["C-x", "C-c", "C-h", "M-s"]) {
      const watched = open(prefix);
      const chords = chordsOn(watched.element);
      expect(chords.length, prefix).toBe(
        completionsUnder(prefix, EDITOR_IDS).length,
      );
      for (const chord of chords) {
        expect(index.has(canonicalChord(chord)), `${prefix}: ${chord}`).toBe(
          true,
        );
      }
      closeOverlay();
    }
  });

  it("names itself and its rows the way every other overlay does", () => {
    const watched = open("C-x");
    expect(watched.element.getAttribute("role")).toBe("dialog");
    expect(watched.element.getAttribute("aria-label")).toBe(
      "What can follow C-x",
    );
    // The modeline names the pane holding the keyboard, and this one is not
    // the keys panel.
    expect(watched.element.dataset["paneLabel"]).toBe("Prefix");
    // The heading spells a prefix in progress the way the modeline's own
    // prefix cell does.
    expect(
      watched.element.querySelector(".prefix-help-heading")?.textContent,
    ).toBe("C-x-");
    // The cancel chords are read off the row, never typed into the string.
    for (const chord of bindingById("keyboard-quit")?.chords ?? []) {
      expect(
        watched.element.querySelector(".prefix-help-hint")?.textContent,
      ).toContain(chord);
    }
    // The rows are the keys panel's own `dt`/`dd` pairs, drawn by the one
    // function that draws a binding line.
    const list = watched.element.querySelector(".keys-list");
    expect(list?.tagName).toBe("DL");
    const save = watched.element.querySelector<HTMLElement>(
      '.keys-row[data-chord="C-x C-s"]',
    );
    expect(save?.tagName).toBe("DT");
    expect(save?.textContent).toContain("Save the chapter");
    const rest = save?.nextElementSibling;
    expect(rest?.tagName).toBe("DD");
    // What is left to type, not the whole chord: the prefix is stated once, in
    // the heading.
    expect(rest?.textContent).toBe("C-s");
  });

  it("keeps reading while what is typed is still a prefix, and runs the row when it completes", () => {
    const watched = open("C-x");
    expect(chordsOn(watched.element).length).toBe(25);

    expect(pressKey("n")).toBe(true);
    // Still open, narrowed to the two rows under `C-x n`, and saying so.
    expect(document.querySelector(".prefix-help")).not.toBeNull();
    expect(chordsOn(watched.element)).toEqual(["C-x n n", "C-x n w"]);
    expect(restsOn(watched.element)).toEqual(["n", "w"]);
    expect(
      watched.element.querySelector(".prefix-help-heading")?.textContent,
    ).toBe("C-x n-");
    expect(watched.ran).toEqual([]);

    expect(pressKey("n")).toBe(true);
    expect(watched.ran).toEqual(["outline-narrow"]);
    expect(document.querySelector(".prefix-help")).toBeNull();
  });

  it("runs the row a single step completes, and closes", () => {
    const watched = open("C-x");
    expect(pressKey("s", ["C"])).toBe(true);
    expect(watched.ran).toEqual(["save-chapter"]);
    expect(document.querySelector(".prefix-help")).toBeNull();
  });

  it("closes on every chord of keyboard-quit having run nothing", () => {
    for (const chord of bindingById("keyboard-quit")?.chords ?? []) {
      const watched = open("C-x");
      const modifiers = chord.startsWith("C-") ? ["C"] : [];
      const name = chord.replace(/^C-/, "");
      expect(pressKey(name, modifiers), chord).toBe(true);
      expect(watched.ran, chord).toEqual([]);
      expect(watched.said[watched.said.length - 1], chord).toBe(CANCELLED);
      expect(document.querySelector(".prefix-help"), chord).toBeNull();
    }
  });

  it("says a chord under the prefix that nothing binds is not bound", () => {
    const watched = open("C-x");
    expect(pressKey("j")).toBe(true);
    expect(watched.ran).toEqual([]);
    expect(watched.said[watched.said.length - 1]).toBe("C-x j is not bound");
    expect(document.querySelector(".prefix-help")).toBeNull();
  });

  it("waits through a modifier held on its own", () => {
    const watched = open("C-x");
    expect(pressKey("Control", ["C"])).toBe(true);
    expect(document.querySelector(".prefix-help")).not.toBeNull();
    expect(pressKey("o")).toBe(true);
    expect(watched.ran).toEqual(["other-window"]);
  });
});
