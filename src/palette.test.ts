/**
 * The insert palette: filtering, the single transaction, and the cursor.
 *
 * The forms themselves are `src/core/inserts.ts`'s and are held to the canon
 * by `src/core/inserts.test.ts`. What is tested here is the gesture: that the
 * canonical form lands at the cursor with the cursor where the content goes,
 * that cancelling writes nothing, and that the buffer after an insertion is
 * exactly what a save would write.
 */

import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { INSERT_FORMS, formById, formsVisibleIn } from "./core/inserts";
import { createEditor, documentText } from "./editor";
import { bindingById } from "./keys";
import { closeOverlay } from "./overlay";
import { parseChapter } from "./core/parse";
import { PALETTE_PHASE, insertForm, openPalette } from "./palette";

/** A chapter with a heading, a paragraph, and a blank line to insert on. */
const SAMPLE = ["# Alice and Bob", "", "Carol reads this line.", "", ""].join(
  "\n",
);

let host: HTMLElement;
let view: EditorView;

function place(at: number): void {
  view.dispatch({ selection: EditorSelection.cursor(at) });
}

/** Put the cursor at the start of a one-based line. */
function placeOnLine(line: number): void {
  place(view.state.doc.line(line).from);
}

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

/** Type into the palette's own field, as an author would. */
function type(text: string): void {
  const field = document.querySelector<HTMLInputElement>(".palette-field");
  if (!field) throw new Error("the palette has no field");
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

/** The labels the palette is offering, in order. */
function offered(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".palette-row"),
    (row) => row.dataset["form"] ?? "",
  );
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  view = createEditor(host, SAMPLE);
});

afterEach(() => {
  closeOverlay();
  view.destroy();
  host.remove();
});

describe("the palette", () => {
  it("offers the phase's forms and no others", () => {
    openPalette(view);
    expect(offered()).toEqual(
      formsVisibleIn(PALETTE_PHASE).map((form) => form.id),
    );
    // A later phase's form is data, not an offer.
    expect(offered()).not.toContain("callout");
    expect(INSERT_FORMS.length).toBeGreaterThan(offered().length);
  });

  it("reaches Columns before Callout on three letters", () => {
    openPalette(view);
    type("col");
    expect(offered()[0]).toBe("columns");
  });

  it("inserts the columns form with the cursor in the first column", () => {
    placeOnLine(5);
    const at = view.state.selection.main.head;
    openPalette(view);
    type("col");
    press("Return");

    const form = formById("columns");
    if (!form) throw new Error("no columns form");
    expect(documentText(view)).toBe(
      SAMPLE.slice(0, at) + form.text + SAMPLE.slice(at),
    );
    // The cursor is on the body line of the first column, which is where the
    // content goes.
    expect(view.state.selection.main.head).toBe(at + form.cursor);
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    expect(line.number).toBe(7);
    expect(view.state.doc.line(6).text).toBe('::: {.column width="50%"}');
  });

  it("inserts speaker notes and changes no other line", () => {
    placeOnLine(5);
    const before = view.state.doc.line(3).text;
    openPalette(view);
    type("notes");
    press("Return");

    expect(view.state.doc.line(3).text).toBe(before);
    expect(view.state.doc.line(5).text).toBe("::: {.notes}");
    expect(view.state.doc.line(7).text).toBe(":::");
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    expect(line.number).toBe(6);
    expect(line.text).toBe("");
  });

  it("appends the divider attribute to the heading on the cursor's line", () => {
    place(4);
    openPalette(view);
    type("divider");
    press("Return");

    expect(view.state.doc.line(1).text).toBe("# Alice and Bob {.divider}");
    expect(view.state.doc.lines).toBe(5);
    expect(documentText(view)).toBe(
      SAMPLE.replace("# Alice and Bob", "# Alice and Bob {.divider}"),
    );
  });

  it("refuses the divider where the cursor is not on a heading, and writes nothing", () => {
    placeOnLine(3);
    const messages: string[] = [];
    openPalette(view, {
      announce: (message) => {
        messages.push(message);
      },
    });
    type("divider");
    press("Return");

    expect(documentText(view)).toBe(SAMPLE);
    expect(messages[0]).toContain("needs a heading");
  });

  it("cancels on C-g and on Escape without touching the chapter", () => {
    for (const chord of bindingById("keyboard-quit")?.chords ?? []) {
      placeOnLine(5);
      openPalette(view);
      type("col");
      press(chord);
      expect(document.querySelector(".palette")).toBeNull();
      expect(documentText(view)).toBe(SAMPLE);
    }
  });

  it("puts an insertion in one transaction, so one undo takes it back", () => {
    placeOnLine(5);
    openPalette(view);
    type("notes");
    press("Return");
    expect(documentText(view)).not.toBe(SAMPLE);
    // The Emacs undo chord, taken from the table.
    const undo = bindingById("undo")?.chords[0] ?? "C-/";
    const modifiers = undo.startsWith("C-");
    view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "/",
        code: "Slash",
        ctrlKey: modifiers,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(documentText(view)).toBe(SAMPLE);
  });

  it("inserts every construct and writes the buffer byte for byte", () => {
    // Every row, not only the six the palette offers: a form held back by its
    // phase carries its tests from the day it is written.
    for (const form of INSERT_FORMS) {
      const scratch = document.createElement("div");
      document.body.append(scratch);
      const start = form.shape === "heading-attribute" ? SAMPLE : SAMPLE;
      const one = createEditor(scratch, start);
      one.dispatch({
        selection: EditorSelection.cursor(
          form.shape === "heading-attribute"
            ? 4
            : one.state.doc.line(5).from,
        ),
      });
      const refusal = insertForm(one, form);
      expect(refusal, form.id).toBeNull();

      const text = documentText(one);
      // What a save writes is the buffer's own text, so this is the whole of
      // the byte-fidelity claim: everything outside the insertion is the
      // chapter as it was.
      const inserted = text.length - start.length;
      expect(inserted, form.id).toBeGreaterThan(0);
      const cursor = one.state.selection.main.head;
      if (form.shape === "heading-attribute") {
        expect(text).toBe(start.replace("# Alice and Bob", `# Alice and Bob${form.text}`));
      } else {
        const at = one.state.doc.line(5).from;
        expect(text.slice(0, at), form.id).toBe(start.slice(0, at));
        expect(text.slice(at + inserted), form.id).toBe(start.slice(at));
        expect(text.slice(at, at + inserted), form.id).toContain(form.text);
        expect(cursor, form.id).toBeGreaterThanOrEqual(at);
        expect(cursor, form.id).toBeLessThanOrEqual(at + inserted);
      }
      one.destroy();
      scratch.remove();
    }
  });

  it("adds a blank line where the cursor's line already holds text", () => {
    // The canonical form is unchanged; what changes is that it starts its own
    // paragraph, which is what a fenced div needs.
    place(view.state.doc.line(3).to);
    insertForm(view, formById("speaker-notes")!);
    expect(view.state.doc.line(3).text).toBe("Carol reads this line.");
    expect(view.state.doc.line(4).text).toBe("");
    expect(view.state.doc.line(5).text).toBe("::: {.notes}");
  });
});

describe("one source for a canonical form", () => {
  it("the palette is the only writer of a canonical form", () => {
    // A source sweep: the literal fence belongs to `core/inserts.ts` and to
    // nothing else that writes into a buffer. A second copy anywhere would be
    // a second spelling of the same construct.
    const writers = [
      "src/palette.ts",
      "src/app.ts",
      "src/sidebar.ts",
      "src/drop.ts",
      "src/editor.ts",
      "src/keyspanel.ts",
      "src/overlay.ts",
    ];
    for (const file of writers) {
      const source = readFileSync(file, "utf8");
      expect(source.includes(":::"), file).toBe(false);
    }
    // And the palette does reach the one table.
    expect(readFileSync("src/palette.ts", "utf8")).toContain("./core/inserts");
  });
});

/**
 * Inserting at the end of a paragraph the author has just typed.
 *
 * The forms carry the blank line *after* them; the blank line before is the
 * palette's, because a form beginning with a newline could not also be the
 * canon's own text on an empty line. This is the check that the palette
 * supplies it — without one, `---` on the line under a paragraph is a setext
 * heading, which turns the sentence just typed into an `<h2>` and inserts no
 * rule at all.
 */
describe("inserting straight after prose", () => {
  it("splits the slide rather than making a heading of the paragraph above", () => {
    place(view.state.doc.line(3).to);
    const form = formById("slide-split");
    if (form === undefined) throw new Error("no slide-split form");
    expect(insertForm(view, form)).toBeNull();
    const blocks = parseChapter(documentText(view)).blocks;
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "paragraph", "rule"]);
    expect(blocks[1]?.text).toBe("Carol reads this line.");
  });

  it("puts every block form on a paragraph of its own", () => {
    for (const form of formsVisibleIn(PALETTE_PHASE)) {
      if (form.shape !== "block") continue;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: SAMPLE },
      });
      place(view.state.doc.line(3).to);
      expect(insertForm(view, form), form.id).toBeNull();
      const blocks = parseChapter(documentText(view)).blocks;
      expect(blocks.map((block) => block.kind), form.id).toContain(form.expects.nodeKind);
      expect(blocks[1]?.text, form.id).toBe("Carol reads this line.");
    }
  });
});
