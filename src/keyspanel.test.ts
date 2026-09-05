/**
 * The overlay contract, and the panel that is the first thing built on it.
 *
 * The contract is the point: one cancel rule, one movement rule, both read
 * from the binding table. A test that pressed hard-coded keys would pass while
 * the panel and the table drifted apart, so every chord here comes from
 * `bindingById`.
 */

import { afterEach, describe, expect, it } from "vitest";

import { BINDINGS, bindingById, chordFromEvent } from "./keys";
import { describeChord, openKeysPanel } from "./keyspanel";
import { closeOverlay, currentOverlay, openOverlay } from "./overlay";

/** Dispatch one chord at the document, as a real key would arrive. */
function press(chord: string): KeyboardEvent {
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
  const arrow = ["Left", "Right", "Up", "Down"].includes(name);
  const event = new KeyboardEvent("keydown", {
    key: name === "Return" ? "Enter" : arrow ? `Arrow${name}` : name,
    code: /^[a-z]$/.test(name)
      ? `Key${name.toUpperCase()}`
      : name === "Return"
        ? "Enter"
        : arrow
          ? `Arrow${name}`
          : name,
    ctrlKey: modifiers.has("C"),
    altKey: modifiers.has("M"),
    metaKey: modifiers.has("s"),
    shiftKey: modifiers.has("S"),
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

afterEach(() => {
  closeOverlay();
});

describe("the overlay contract", () => {
  /** A bare overlay with three rows and a record of what it was told. */
  function threeRows(): {
    moves: number[];
    chosen: number[];
    closes: boolean[];
  } {
    const moves: number[] = [];
    const chosen: number[] = [];
    const closes: boolean[] = [];
    const element = document.createElement("div");
    openOverlay({
      element,
      rowCount: () => 3,
      onMove: (index) => moves.push(index),
      onChoose: (index) => chosen.push(index),
      onClose: (was) => closes.push(was),
    });
    return { moves, chosen, closes };
  }

  it("moves on the chords the table names, and on nothing else", () => {
    const seen = threeRows();
    for (const chord of bindingById("next-line")?.chords ?? []) {
      press(chord);
    }
    for (const chord of bindingById("previous-line")?.chords ?? []) {
      press(chord);
    }
    // Two ways down and two ways up, from zero, wrapping at the ends.
    expect(seen.moves).toEqual([0, 1, 2, 1, 0]);
    // A chord in no movement row moves nothing.
    press("C-t");
    expect(seen.moves).toEqual([0, 1, 2, 1, 0]);
  });

  it("claims the chords it answers so the surface never sees them", () => {
    threeRows();
    const down = bindingById("next-line")?.chords[0] ?? "C-n";
    expect(press(down).defaultPrevented).toBe(true);
    expect(press("Return").defaultPrevented).toBe(true);
  });

  it("closes on every chord of keyboard-quit", () => {
    for (const chord of bindingById("keyboard-quit")?.chords ?? []) {
      const seen = threeRows();
      expect(currentOverlay()?.open).toBe(true);
      expect(press(chord).defaultPrevented).toBe(true);
      expect(currentOverlay()).toBeNull();
      expect(seen.closes).toEqual([false]);
      expect(seen.chosen).toEqual([]);
    }
  });

  it("chooses the highlighted row on Return and closes", () => {
    const seen = threeRows();
    press(bindingById("next-line")?.chords[0] ?? "C-n");
    press("Return");
    expect(seen.chosen).toEqual([1]);
    expect(seen.closes).toEqual([true]);
    expect(currentOverlay()).toBeNull();
  });

  it("holds the keyboard, and gives the focus back when it closes", () => {
    const before = document.createElement("input");
    document.body.append(before);
    before.focus();
    expect(document.activeElement).toBe(before);

    const element = document.createElement("div");
    openOverlay({ element, rowCount: () => 0 });
    expect(document.activeElement).toBe(element);

    closeOverlay();
    expect(document.activeElement).toBe(before);
    before.remove();
  });

  it("keeps one overlay open at a time", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    openOverlay({ element: first, rowCount: () => 0 });
    openOverlay({ element: second, rowCount: () => 0 });
    expect(first.isConnected).toBe(false);
    expect(currentOverlay()?.element).toBe(second);
  });

  it("resolves movement through the table rather than hard-coded keys", () => {
    // The proof that the contract reads the table: the arrow alias of
    // `next-line` is a row's chord, and `chordFromEvent` is what turns the
    // event into it.
    const down = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      code: "ArrowDown",
    });
    expect(bindingById("next-line")?.chords).toContain(chordFromEvent(down));
  });
});

describe("the keys panel", () => {
  it("lists every binding the table carries", () => {
    const overlay = openKeysPanel();
    const rows = overlay.element.querySelectorAll<HTMLElement>(".keys-row");
    expect(rows.length).toBe(BINDINGS.length);
    const ids = Array.from(rows, (row) => row.dataset["binding"]);
    for (const binding of BINDINGS) {
      expect(ids).toContain(binding.id);
    }
  });

  it("shows each row's label and its live chords", () => {
    const overlay = openKeysPanel();
    const save = overlay.element.querySelector<HTMLElement>(
      '[data-binding="save-chapter"]',
    );
    expect(save?.textContent).toContain("Save the chapter");
    const chords = save?.nextElementSibling;
    expect(chords?.textContent).toContain("C-x C-s");
  });

  it("renders a row added to the table without a second edit", () => {
    // The panel reads `BINDINGS` at open time, so a row that exists in the
    // table is a row on screen: nothing here enumerates actions of its own.
    const overlay = openKeysPanel();
    for (const binding of BINDINGS) {
      const row = overlay.element.querySelector<HTMLElement>(
        `[data-binding="${binding.id}"]`,
      );
      expect(row, binding.id).not.toBeNull();
      expect(row?.textContent).toContain(binding.label);
      const chords = row?.nextElementSibling;
      for (const chord of binding.chords) {
        expect(chords?.textContent, `${binding.id} ${chord}`).toContain(chord);
      }
    }
  });

  it("says which rows the shell and the other specs answer", () => {
    const overlay = openKeysPanel();
    const menu = overlay.element.querySelector<HTMLElement>(
      '[data-binding="open-folder-menu"]',
    );
    expect(menu?.textContent).toContain("menu");
    const present = overlay.element.querySelector<HTMLElement>(
      '[data-binding="present"]',
    );
    expect(present?.textContent).toContain("not yet wired");
  });

  it("closes on Escape and on C-g", () => {
    for (const chord of bindingById("keyboard-quit")?.chords ?? []) {
      const overlay = openKeysPanel();
      expect(overlay.element.isConnected).toBe(true);
      press(chord);
      expect(overlay.element.isConnected).toBe(false);
    }
  });

  it("moves down the rows it lists", () => {
    const overlay = openKeysPanel();
    press(bindingById("next-line")?.chords[0] ?? "C-n");
    const current = overlay.element.querySelectorAll<HTMLElement>(
      '.keys-row[data-current="yes"]',
    );
    expect(current.length).toBe(1);
    expect(current[0]?.dataset["binding"]).toBe(BINDINGS[1]?.id);
  });

  it("names its chord in the tooltip", () => {
    // Generated, never typed: the chord comes out of the table.
    expect(describeChord("save-chapter", "Save")).toBe("Save (C-x C-s)");
    expect(describeChord("open-folder", "Open a document folder")).toBe(
      "Open a document folder (C-x C-f)",
    );
    // A row with no chords, or an id that is not one, reads as plain prose
    // rather than as an empty pair of brackets.
    expect(describeChord("not-a-row", "Do a thing")).toBe("Do a thing");
  });
});
