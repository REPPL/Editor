/**
 * `M-x`: the palette as a view over the two tables.
 *
 * What is tested here is that the list is those tables and not a copy of them,
 * that the filter reaches a command by the initials of its label, that
 * choosing runs the row, and that cancelling writes nothing.
 */

import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp, type App, type AppServices } from "./app";

import {
  INSERT_PREFIX,
  commandEntries,
  matchCommands,
  openCommandPalette,
} from "./command-palette";
import { formsVisibleIn } from "./core/inserts";
import { documentText, setDocument } from "./editor";
import { BINDINGS, bindingById } from "./keys";
import { closeOverlay } from "./overlay";
import { PALETTE_PHASE } from "./palette";

const SAMPLE = ["# Alice and Bob", "", "alpha beta gamma", "", ""].join("\n");

let host: HTMLElement;
let app: App;
let view: EditorView;
let said: string[];

const announce = (message: string): void => {
  said.push(message);
};

/**
 * The application, because a row the palette runs is answered by it.
 *
 * `runBinding` resolves an `editor` row to the command the application
 * registered against it, so a palette driven over a bare view would prove only
 * that the resolution happened, not that anything ran.
 */
const services: AppServices = {
  chooseFolder: () => Promise.resolve(null),
  openFolder: (path) =>
    Promise.resolve({
      root: {
        name: path,
        title: path,
        path,
        order: null,
        parts: [],
        chapters: [],
        truncated: false,
      },
      failures: [],
    }),
  readChapter: () => Promise.resolve(SAMPLE),
  writeChapter: () => Promise.resolve(),
  confirmDiscard: () => Promise.resolve(true),
};

function place(at: number): void {
  view.dispatch({ selection: EditorSelection.cursor(at) });
}

/** Send one keydown at the document, as the overlay hears it. */
function press(chord: string): void {
  const modifiers = new Set<string>();
  let name = chord;
  for (;;) {
    const prefix = ["C-", "M-", "s-", "S-"].find(
      (candidate) => name.startsWith(candidate) && name.length > candidate.length,
    );
    if (!prefix) break;
    modifiers.add(prefix[0] ?? "");
    name = name.slice(2);
  }
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: name === "Return" ? "Enter" : name,
      code: /^[a-z]$/.test(name)
        ? `Key${name.toUpperCase()}`
        : name === "Return"
          ? "Enter"
          : name,
      ctrlKey: modifiers.has("C"),
      altKey: modifiers.has("M"),
      metaKey: modifiers.has("s"),
      shiftKey: modifiers.has("S"),
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Type into the palette's field, as an author would. */
function type(text: string): void {
  const field = document.querySelector<HTMLInputElement>(".palette-field");
  if (!field) throw new Error("the palette has no field");
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

/** The ids the palette is offering, in order. */
function offered(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".palette-row"),
    (row) => row.dataset["command"] ?? "",
  );
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  app = createApp(host, services);
  view = app.view;
  setDocument(view, SAMPLE);
  said = [];
});

afterEach(() => {
  closeOverlay();
  app.destroy();
  host.remove();
});

describe("the command palette", () => {
  it("lists every runnable row of the table and every insert form", () => {
    // One source, always: the list is the two tables read at open time, and
    // the only rows it leaves out are the ones the page cannot run.
    const entries = commandEntries();
    const runnable = BINDINGS.filter((binding) => binding.owner !== "shell");
    for (const binding of runnable) {
      expect(
        entries.some((entry) => entry.id === binding.id),
        binding.id,
      ).toBe(true);
    }
    for (const form of formsVisibleIn(PALETTE_PHASE)) {
      expect(
        entries.some((entry) => entry.id === `${INSERT_PREFIX}${form.id}`),
        form.id,
      ).toBe(true);
    }
    expect(entries).toHaveLength(
      runnable.length + formsVisibleIn(PALETTE_PHASE).length,
    );
    // A menu accelerator has no page-side command, so it is not offered.
    expect(entries.some((entry) => entry.id === "open-folder-menu")).toBe(false);
    // Every label is the table's own; nothing here writes one.
    for (const entry of entries) {
      if (!entry.binding) continue;
      expect(entry.label).toBe(bindingById(entry.id)?.label);
    }
  });

  it("filters on the initials of a label and runs the row's command", () => {
    place(view.state.doc.line(3).from + "alpha".length);
    openCommandPalette(view, { host, announce });
    type("tw");
    expect(offered()[0]).toBe("transpose-words");
    press("Return");
    expect(document.querySelector(".palette")).toBeNull();
    expect(view.state.doc.line(3).text).toBe("beta alpha gamma");
  });

  it("changes not one byte when it is cancelled", () => {
    for (const chord of bindingById("keyboard-quit")?.chords ?? []) {
      openCommandPalette(view, { host, announce });
      type("tw");
      press(chord);
      expect(document.querySelector(".palette"), chord).toBeNull();
      expect(documentText(view), chord).toBe(SAMPLE);
    }
  });

  it("ranks a label prefix above a word prefix, initials, and an id match", () => {
    const ranked = matchCommands("fill").map((entry) => entry.id);
    expect(ranked[0]).toBe("fill-paragraph");
    // A word prefix reaches a label whose first word is not the query.
    expect(matchCommands("paragraph").map((entry) => entry.id)).toContain(
      "fill-paragraph",
    );
    // The id is matched as well as the label, so an Emacs name still works.
    expect(matchCommands("dabbrev").map((entry) => entry.id)).toContain(
      "dabbrev-expand",
    );
    expect(matchCommands("zztop")).toEqual([]);
  });

  it("runs a command the Emacs package owns, not only Editor's own", () => {
    place(view.state.doc.line(3).from + 2);
    openCommandPalette(view, { host, announce });
    type("Upper-case word");
    expect(offered()[0]).toBe("upcase-word");
    press("Return");
    expect(view.state.doc.line(3).text).toBe("alPHA beta gamma");
  });

  it("inserts a construct chosen from the same list", () => {
    place(view.state.doc.line(5).from);
    openCommandPalette(view, { host, announce });
    type("notes");
    expect(offered()[0]).toBe(`${INSERT_PREFIX}speaker-notes`);
    press("Return");
    expect(view.state.doc.line(5).text).toBe("::: {.notes}");
    expect(said[said.length - 1]).toContain("Inserted");
  });

  it("opens the same overlay the insert palette opens", () => {
    openCommandPalette(view, { host, announce });
    const element = document.querySelector(".palette");
    expect(element).not.toBeNull();
    expect(element?.classList.contains("overlay")).toBe(true);
    expect(document.querySelector(".palette-field")).not.toBeNull();
    expect(offered().length).toBeGreaterThan(0);
  });

  it("copies neither table", () => {
    // A source sweep: the palette names no chord and no canonical form of its
    // own, because both would be a second copy that nothing checks.
    const source = readFileSync("src/command-palette.ts", "utf8");
    expect(source.includes(":::")).toBe(false);
    // No second list of rows and no second list of chords: the module reads
    // `BINDINGS` and writes neither an `id:` nor a `chords:` of its own.
    expect(/\bchords:/.test(source)).toBe(false);
    expect(source).toContain("./keys");
    expect(source).toContain("./core/inserts");
  });
});
