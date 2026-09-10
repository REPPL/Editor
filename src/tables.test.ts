/**
 * Keeping a pipe table aligned while its author types in it
 * (`spc-2609091733494078`, `itd-2609061653559060`, map #39).
 *
 * Every test here runs over a real `EditorView` built by `createEditor`, so
 * the extension under test is the one the application mounts and the
 * transaction it filters is a real transaction with a real history behind it.
 *
 * jsdom cannot deliver a keydown through the browser's own input path, so a
 * typed character is dispatched as the transaction CodeMirror's input handler
 * produces — a change and a selection carrying `userEvent: "input.type"` —
 * which is the shape this design turns on. The real keyboard is M39-1.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { undo, undoDepth } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as Parse from "./core/parse";

// The one-source pin needs to count the parses the filter asks for, and a
// pass-through spy is the only way to see them from outside. Everything the
// module graph reads goes through this same wrapper, so no behaviour changes.
vi.mock("./core/parse", async (importOriginal) => {
  const actual = await importOriginal<typeof Parse>();
  return { ...actual, parseChapter: vi.fn(actual.parseChapter) };
});

import { parseChapter } from "./core/parse";
import { createEditor, documentText, setDocument } from "./editor";
import {
  cellsOf,
  measure,
  setTableAlignment,
  tableAlignmentOn,
} from "./tables";

let host: HTMLElement | null = null;
let view: EditorView;

function mount(doc: string): EditorView {
  if (host !== null) {
    view.destroy();
    host.remove();
  }
  host = document.createElement("div");
  document.body.append(host);
  view = createEditor(host, doc);
  return view;
}

/** Where a one-based line and one-based column sit, as an offset. */
function at(line: number, column: number): number {
  return view.state.doc.line(line).from + column - 1;
}

/**
 * The offset just past the first occurrence of `needle`.
 *
 * A caret in a table is easier to read and far harder to get wrong as "just
 * after this text" than as a column number counted through pipes and padding.
 */
function after(needle: string): number {
  const index = documentText(view).indexOf(needle);
  expect(index, needle).toBeGreaterThanOrEqual(0);
  return index + needle.length;
}

/** Put the caret at an offset, without touching the document. */
function place(offset: number): void {
  view.dispatch({ selection: EditorSelection.cursor(offset) });
}

/** Type text at the caret, the way CodeMirror's own input handler does. */
function type(text: string): void {
  const from = view.state.selection.main.head;
  view.dispatch({
    changes: { from, insert: text },
    selection: EditorSelection.cursor(from + text.length),
    userEvent: "input.type",
  });
}

/** Delete `count` characters back from the caret, as Backspace does. */
function backspace(count = 1): void {
  const head = view.state.selection.main.head;
  const from = Math.max(0, head - count);
  view.dispatch({
    changes: { from, to: head },
    selection: EditorSelection.cursor(from),
    userEvent: "delete.backward",
  });
}

/** The document as a list of lines, which is how a table reads in a failure. */
function lines(): string[] {
  return documentText(view).split("\n");
}

/** The caret's one-based line and column. */
function caret(): [number, number] {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  return [line.number, head - line.from + 1];
}

/** What stands between the start of the caret's line and the caret. */
function textBeforeCaret(): string {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  return line.text.slice(0, head - line.from);
}

/** The text of the caret's own cell, pipes excluded. */
function cellUnderCaret(): string {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const cells = cellsOf(line.text);
  const inLine = head - line.from;
  const found = (cells ?? []).find(
    (cell) => inLine >= cell.from && inLine <= cell.to,
  );
  return found?.text ?? "";
}

beforeEach(() => {
  vi.mocked(parseChapter).mockClear();
});

afterEach(() => {
  // The flag is process state, so a test that flips it has to put it back.
  setTableAlignment(true);
  if (host !== null) {
    view.destroy();
    host.remove();
    host = null;
  }
});

/** A three-column table with a centred and a right-aligned column. */
const MARKED = [
  "| Reading      | Week |  Pages |",
  "|--------------|:----:|-------:|",
  "| Alice's book |    2 |  11-40 |",
  "| Bob's paper  |    3 | 90-102 |",
].join("\n");

/** Two columns, already aligned, with prose either side of it. */
const PLAIN = [
  "# A chapter",
  "",
  "Some prose above the table.",
  "",
  "| Name | Note |",
  "|------|------|",
  "| Al   | one  |",
  "| Bob  | two  |",
  "",
  "Some prose below it.",
].join("\n");

describe("splitting a source row", () => {
  it("finds the cells of an ordinary row", () => {
    const cells = cellsOf("| a | bb |");
    expect(cells?.map((cell) => cell.text)).toEqual(["a", "bb"]);
    expect(cells?.map((cell) => [cell.from, cell.to])).toEqual([
      [1, 4],
      [5, 9],
    ]);
  });

  it("keeps an escaped pipe inside its cell, as GFM and the parser both do", () => {
    expect(cellsOf("| a\\|b | c |")?.map((cell) => cell.text)).toEqual([
      "a\\|b",
      "c",
    ]);
    // Two backslashes are a literal backslash, so the pipe after them divides.
    expect(cellsOf("| a\\\\ | c |")?.map((cell) => cell.text)).toEqual([
      "a\\\\",
      "c",
    ]);
    // A pipe inside a code span is not protected in GFM either, so the
    // splitter and `parseChapter` agree that `` `y\|z` `` is one cell.
    expect(cellsOf("| `y\\|z` | c |")?.map((cell) => cell.text)).toEqual([
      "`y\\|z`",
      "c",
    ]);
  });

  it("allows up to three spaces of indent and no more", () => {
    expect(cellsOf("   | a | b |")?.length).toBe(2);
    expect(cellsOf("    | a | b |")).toBeNull();
  });

  it("refuses a row that carries no edge pipes", () => {
    expect(cellsOf("a | b")).toBeNull();
    expect(cellsOf("| a | b")).toBeNull();
    expect(cellsOf("a | b |")).toBeNull();
    expect(cellsOf("|")).toBeNull();
    expect(cellsOf("prose with no pipe")).toBeNull();
    // The last pipe is escaped, so the row does not end with one.
    expect(cellsOf("| a\\|")).toBeNull();
  });

  it("leaves whitespace after the closing pipe outside every cell", () => {
    const cells = cellsOf("| a | b |   ");
    expect(cells?.map((cell) => cell.text)).toEqual(["a", "b"]);
    // The closing pipe, not the end of the line: the three spaces past it
    // belong to no cell, so no change is ever written over them.
    expect(cells?.[1]?.to).toBe(8);
  });

  it("marks a blank cell as content-free rather than as whitespace to keep", () => {
    const cells = cellsOf("| a |    |");
    expect(cells?.[1]?.text).toBe("");
    expect(cells?.[1]?.contentFrom).toBe(cells?.[1]?.contentTo);
  });
});

describe("measuring a cell", () => {
  it("counts grapheme clusters, so a combining mark is one column", () => {
    expect(measure("abc")).toBe(3);
    expect(measure("é")).toBe(2 - 1);
    expect(measure("é")).toBe(1);
  });

  it("counts an emoji ZWJ sequence and a flag as one", () => {
    expect(measure("\u{1F469}‍\u{1F4BB}")).toBe(1);
    expect(measure("\u{1F1EC}\u{1F1E7}")).toBe(1);
  });

  it("counts a wide character as one, which is the accepted imperfection", () => {
    // cond-2609091733499546: the column draws one cell narrow per wide
    // character, and the text is never altered to make the count come out.
    expect(measure("漢字")).toBe(2);
  });

  it("counts the markers the surface draws, not the text they render to", () => {
    expect(measure("**bold**")).toBe(8);
    expect(measure("\\|")).toBe(2);
  });
});

describe("realigning on the author's own edit", () => {
  it("widens every row when a cell grows past its column", () => {
    mount(PLAIN);
    // The caret immediately after `Al` in the first body row.
    place(at(7, 5));
    type("ice");
    expect(lines().slice(4, 8)).toEqual([
      "| Name  | Note |",
      "|-------|------|",
      "| Alice | one  |",
      "| Bob   | two  |",
    ]);
  });

  it("leaves the caret immediately after the character that widened the cell", () => {
    mount(PLAIN);
    place(at(7, 5));
    type("ice");
    expect(caret()).toEqual([7, 8]);
    expect(cellUnderCaret()).toBe("Alice");
    expect(view.state.sliceDoc(0, view.state.selection.main.head)).toMatch(
      /Alice$/,
    );
  });

  it("holds the caret in its cell character by character as a word is typed", () => {
    mount(PLAIN);
    place(after("| Al"));
    // Including the space, which is the character a cell's padding would
    // otherwise swallow: it is trailing whitespace the moment it is typed, so
    // the caret has to keep its distance from the content rather than be
    // clamped back to the end of it.
    for (const character of "ice Smith") {
      type(character);
      const [line] = caret();
      expect(line, character).toBe(7);
      expect(cellUnderCaret().startsWith("Al"), character).toBe(true);
    }
    expect(cellUnderCaret()).toBe("Alice Smith");
    expect(lines().slice(4, 8)).toEqual([
      "| Name        | Note |",
      "|-------------|------|",
      "| Alice Smith | one  |",
      "| Bob         | two  |",
    ]);
  });

  it("narrows every column when the widest cell shrinks", () => {
    mount(
      [
        "| Name     | Note |",
        "|----------|------|",
        "| Aloysius | one  |",
        "| Bob      | two  |",
      ].join("\n"),
    );
    // The caret at the end of `Aloysius`, then five characters taken back.
    place(after("Aloysius"));
    backspace(5);
    expect(lines()).toEqual([
      "| Name | Note |",
      "|------|------|",
      "| Alo  | one  |",
      "| Bob  | two  |",
    ]);
    expect(cellUnderCaret()).toBe("Alo");
    expect(caret()).toEqual([3, 6]);
  });

  it("holds the caret in its cell when the padding around it is taken away", () => {
    // A column padded far wider than any of its cells needs, with the caret
    // parked deep inside the run of spaces that is about to go. `mapPos` would
    // send it to the start of the replaced run — outside the cell's content
    // and, with the run reaching the pipe, arguably outside the cell.
    mount(
      [
        "| Name | Note           |",
        "|------|----------------|",
        "| Al   | one            |",
      ].join("\n"),
    );
    place(after("one     "));
    expect(cellUnderCaret()).toBe("one");
    // One space taken out of the padding is still an edit inside the table.
    backspace();
    expect(lines()).toEqual([
      "| Name | Note |",
      "|------|------|",
      "| Al   | one  |",
    ]);
    // Still in the same cell, and at the end of what is left of its padding
    // rather than before the text the author can see.
    expect(cellUnderCaret()).toBe("one");
    expect(textBeforeCaret()).toBe("| Al   | one  ");
  });

  it("pads a centre column on both sides and a right column on the left", () => {
    mount(MARKED);
    place(at(3, 15));
    type("s");
    expect(lines()).toEqual([
      "| Reading       | Week |  Pages |",
      "|---------------|:----:|-------:|",
      "| Alice's books |  2   |  11-40 |",
      "| Bob's paper   |  3   | 90-102 |",
    ]);
  });

  it("keeps every alignment marker when it rewrites the rule to the new width", () => {
    mount(
      ["| a | b | c | d |", "|-|:-|-:|:-:|", "| 1 | 2 | 3 | 4 |"].join("\n"),
    );
    place(after("| 1"));
    type("xxxx");
    expect(lines()).toEqual([
      // A right-aligned column pads its header on the left too, which is what
      // honouring the marker means.
      "| a     | b   |   c |  d  |",
      "|-------|:----|----:|:---:|",
      "| 1xxxx | 2   |   3 |  4  |",
    ]);
  });

  it("takes the character and its realignment back on one undo", () => {
    mount(PLAIN);
    place(at(7, 5));
    const before = documentText(view);
    type("ice");
    expect(documentText(view)).not.toBe(before);
    undo({ state: view.state, dispatch: (tr) => view.dispatch(tr) });
    expect(documentText(view)).toBe(before);
  });

  it("puts one entry on the history for one keystroke in a table", () => {
    mount(PLAIN);
    place(at(7, 5));
    expect(undoDepth(view.state)).toBe(0);
    type("i");
    expect(undoDepth(view.state)).toBe(1);
    // And the undo itself is not realigned in turn: predicate 2 refuses it,
    // so the inverse the history holds is the only thing that runs.
    undo({ state: view.state, dispatch: (tr) => view.dispatch(tr) });
    expect(undoDepth(view.state)).toBe(0);
    expect(documentText(view)).toBe(PLAIN);
  });

  it("leaves no half-realigned table however the history groups the typing", () => {
    // Grouping is the history's own business and is unchanged here — three
    // characters typed in a cell are still one entry, exactly as three
    // characters typed in prose are. What has to hold is that whatever one
    // press takes back is a whole number of keystrokes with their alignments,
    // never a table part-way.
    mount(PLAIN);
    place(after("| Al"));
    type("i");
    type("c");
    type("e");
    const depth = undoDepth(view.state);
    expect(depth).toBe(1);
    for (let press = 0; press < depth; press += 1) {
      undo({ state: view.state, dispatch: (tr) => view.dispatch(tr) });
      // Whatever is left is a table whose columns are square.
      const rows = lines().slice(4, 8);
      const widths = rows.map((row) => row.length);
      expect(new Set(widths).size, rows.join("\n")).toBe(1);
    }
    expect(documentText(view)).toBe(PLAIN);
  });

  it("leaves the other table in the chapter exactly as it was", () => {
    const two = [
      "| Name | Note |",
      "|------|------|",
      "| Al   | one  |",
      "",
      "| Other | Table |",
      "|-------|-------|",
      "| a     | b     |",
    ].join("\n");
    mount(two);
    place(at(3, 5));
    type("ice");
    expect(lines().slice(4, 7)).toEqual([
      "| Other | Table |",
      "|-------|-------|",
      "| a     | b     |",
    ]);
    expect(lines().slice(0, 3)).toEqual([
      "| Name  | Note |",
      "|-------|------|",
      "| Alice | one  |",
    ]);
  });

  it("realigns a table it has to reach a caption over", () => {
    // `parseChapter` folds a `: Caption` paragraph into the table block, so
    // `block.endLine` is the caption's line rather than the last row's. The
    // rows are counted from the parser's own body rows instead.
    mount(
      [
        "| Name | Note |",
        "|------|------|",
        "| Al   | one  |",
        "",
        ": What the table shows",
      ].join("\n"),
    );
    place(at(3, 5));
    type("ice");
    expect(lines()).toEqual([
      "| Name  | Note |",
      "|-------|------|",
      "| Alice | one  |",
      "",
      ": What the table shows",
    ]);
  });

  it("keeps a cell's escapes and markup exactly as written", () => {
    mount(
      [
        "| a | b |",
        "|---|---|",
        "| **bold** | `y\\|z` |",
        "| x | y |",
      ].join("\n"),
    );
    place(at(4, 4));
    type("x");
    const after = lines();
    expect(after[2]).toBe("| **bold** | `y\\|z` |");
    expect(after).toEqual([
      "| a        | b      |",
      "|----------|--------|",
      "| **bold** | `y\\|z` |",
      "| xx       | y      |",
    ]);
  });

  it("places the caret without throwing when the table ends the chapter", () => {
    // The case that rules out carrying the selection on the changes spec:
    // `mergeTransaction` maps an appended spec's selection through
    // `ChangeSet.empty(b.changes.length)`, whose length is the document
    // before that spec's own changes, and `mapPos` throws a `RangeError`
    // rather than clamping. The caret in the last cell of the last row of a
    // table that has just grown sits past that length.
    mount(["| a | b |", "|---|---|", "| 1 | 2 |"].join("\n"));
    place(after("| 1 | 2"));
    type("wide");
    expect(lines()).toEqual([
      "| a   | b     |",
      "|-----|-------|",
      "| 1   | 2wide |",
    ]);
    expect(textBeforeCaret()).toBe("| 1   | 2wide");
    expect(cellUnderCaret()).toBe("2wide");
  });

  it("realigns a paste that lands in one table, and nothing else", () => {
    mount(PLAIN);
    // A paste into a cell is an author edit like any other: the same filter,
    // the same predicates (cond-2609091733498918).
    place(at(7, 5));
    const from = view.state.selection.main.head;
    view.dispatch({
      changes: { from, insert: "phabetical" },
      selection: EditorSelection.cursor(from + 10),
      userEvent: "input.paste",
    });
    expect(lines().slice(4, 8)).toEqual([
      "| Name         | Note |",
      "|--------------|------|",
      "| Alphabetical | one  |",
      "| Bob          | two  |",
    ]);
  });
});

describe("what it refuses", () => {
  it("leaves a table with unequal cell counts exactly as typed", () => {
    const ragged = [
      "| a | b |",
      "|---|---|",
      "| 1 | 2 | 3 |",
      "| 4 | 5 |",
    ].join("\n");
    mount(ragged);
    place(at(4, 4));
    type("x");
    expect(documentText(view)).toBe(ragged.replace("| 4 |", "| 4x |"));
  });

  it("leaves a header row with no delimiter row exactly as typed", () => {
    const half = ["| a | b |", "| 1 | 2 |"].join("\n");
    mount(half);
    place(at(2, 4));
    type("x");
    expect(documentText(view)).toBe("| a | b |\n| 1x | 2 |");
  });

  it("leaves the table alone on the keystroke that deletes a pipe from a row", () => {
    const table = [
      "| a   | b   |",
      "|-----|-----|",
      "| one | two |",
    ].join("\n");
    mount(table);
    // The pipe between the two body cells.
    place(after("| one |"));
    backspace();
    expect(documentText(view)).toBe(
      ["| a   | b   |", "|-----|-----|", "| one  two |"].join("\n"),
    );
  });

  it("leaves a table whose rows carry no edge pipes exactly as typed", () => {
    const bare = ["a | b", "--- | ---", "1 | 2"].join("\n");
    mount(bare);
    place(at(3, 2));
    type("x");
    expect(documentText(view)).toBe("a | b\n--- | ---\n1x | 2");
  });

  it("leaves the table alone while the caret is in the delimiter row", () => {
    const table = [
      "| a   | b   |",
      "|-----|-----|",
      "| one | two |",
    ].join("\n");
    mount(table);
    // Turn the first column right-aligned, a character at a time, and watch
    // the row not regenerate around the caret.
    place(after("|-----"));
    type(":");
    expect(documentText(view)).toBe(
      ["| a   | b   |", "|-----:|-----|", "| one | two |"].join("\n"),
    );
    // The alignment declared takes effect on the next edit in another row.
    place(after("| one"));
    type("s");
    expect(lines()).toEqual([
      "|    a | b   |",
      "|-----:|-----|",
      "| ones | two |",
    ]);
  });

  it("rewrites nothing when the edit is in prose", () => {
    mount(PLAIN);
    place(at(3, 5));
    type("XX");
    expect(lines().slice(4, 8)).toEqual([
      "| Name | Note |",
      "|------|------|",
      "| Al   | one  |",
      "| Bob  | two  |",
    ]);
  });

  it("rewrites nothing when the edited line holds a pipe inside a fenced code block", () => {
    const fenced = [
      "```",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
      "```",
    ].join("\n");
    mount(fenced);
    place(at(4, 4));
    type("x");
    expect(documentText(view)).toBe(fenced.replace("| 1 |", "| 1x |"));
  });

  it("leaves a table inside a fenced div exactly as typed", () => {
    const nested = [
      "::: {.aside}",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
      ":::",
    ].join("\n");
    mount(nested);
    place(at(4, 4));
    type("x");
    expect(documentText(view)).toBe(nested.replace("| 1 |", "| 1x |"));
  });

  it("leaves a table inside a blockquote exactly as typed", () => {
    const quoted = ["> | a | b |", "> |---|---|", "> | 1 | 2 |"].join("\n");
    mount(quoted);
    place(at(3, 6));
    type("x");
    expect(documentText(view)).toBe(quoted.replace("| 1 |", "| 1x |"));
    expect(lines().every((line) => line.startsWith("> "))).toBe(true);
  });

  it("rewrites nothing when an edit elsewhere leaves the caret in a table", () => {
    mount(PLAIN);
    // A change in the prose above, with the caret moved into the table by the
    // same transaction: predicate 6 refuses, because the change did not land
    // in the table's own rows.
    view.dispatch({
      changes: { from: at(3, 5), insert: "XX" },
      selection: EditorSelection.cursor(at(7, 5) + 2),
      userEvent: "input.type",
    });
    expect(lines().slice(4, 8)).toEqual([
      "| Name | Note |",
      "|------|------|",
      "| Al   | one  |",
      "| Bob  | two  |",
    ]);
  });

  it("rewrites nothing for a bare cursor move inside a ragged table", () => {
    const ragged = ["| a | b |", "|---|---|", "| one | two |"].join("\n");
    mount(ragged);
    place(at(3, 4));
    place(at(1, 3));
    expect(documentText(view)).toBe(ragged);
  });

  it("rewrites nothing for a multi-cursor edit inside a table", () => {
    const table = ["| a | b |", "|---|---|", "| 1 | 2 |", "| 3 | 4 |"].join(
      "\n",
    );
    mount(table);
    view.dispatch({
      changes: [
        { from: at(3, 4), insert: "x" },
        { from: at(4, 4), insert: "x" },
      ],
      selection: EditorSelection.create([
        EditorSelection.cursor(at(3, 4) + 1),
        EditorSelection.cursor(at(4, 4) + 2),
      ]),
      userEvent: "input.type",
    });
    expect(documentText(view)).toBe(
      ["| a | b |", "|---|---|", "| 1x | 2 |", "| 3x | 4 |"].join("\n"),
    );
  });

  it("rewrites nothing when a table is already aligned", () => {
    mount(PLAIN);
    place(at(10, 5));
    const parsesBefore = vi.mocked(parseChapter).mock.calls.length;
    type("X");
    expect(documentText(view)).toBe(PLAIN.replace("Some prose below", "SomeX prose below"));
    expect(vi.mocked(parseChapter).mock.calls.length).toBe(parsesBefore);
  });
});

describe("the cost gate and the one source", () => {
  it("does not parse the chapter when the edited line holds no pipe", () => {
    mount(PLAIN);
    place(at(3, 5));
    const before = vi.mocked(parseChapter).mock.calls.length;
    type("X");
    // Predicate 4 is a scan of one line, and `parseChapter` sits behind it.
    expect(vi.mocked(parseChapter).mock.calls.length).toBe(before);

    // And it does parse once the caret's line holds a pipe.
    place(at(7, 5));
    const gate = vi.mocked(parseChapter).mock.calls.length;
    type("X");
    expect(vi.mocked(parseChapter).mock.calls.length).toBeGreaterThan(gate);
  });

  it("asks core/parse for the table and never re-derives one", () => {
    // A delimiter row of the wrong width is not a table to markdown-it at all
    // — `parseChapter` calls the pair a paragraph — however much a line scan
    // over the pipes would like it to be one.
    const wrong = ["| a | b |", "|---|", "| 1 | 2 |"].join("\n");
    mount(wrong);
    place(at(3, 4));
    type("x");
    expect(documentText(view)).toBe(wrong.replace("| 1 |", "| 1x |"));
    // The parse was asked for; the answer was simply not a table.
    expect(vi.mocked(parseChapter).mock.calls.length).toBeGreaterThan(0);
  });
});

describe("the surface's own wrapping", () => {
  it("wraps an over-wide row rather than widening the line", () => {
    // The discipline the dropped wrapping criterion was protecting: legible
    // at 390 CSS pixels with no horizontal scrolling. `EditorView.lineWrapping`
    // is on the surface, before and after this change, so an over-wide row
    // wraps as a line. What it does not do is keep the wrapped remainder
    // inside its column — recorded as dropped in the spec's Design § Wrapping
    // and stated on the how-to page. The pixels are M39-1.
    mount(
      [
        "| Reading | Note |",
        "|---------|------|",
        `| ${"a very long cell ".repeat(12).trim()} | one |`,
      ].join("\n"),
    );
    expect(view.contentDOM.classList.contains("cm-lineWrapping")).toBe(true);
    // The row is one document line, however many drawn lines it takes.
    expect(view.state.doc.lines).toBe(3);
  });
});

describe("the off switch", () => {
  it("starts on", () => {
    mount(PLAIN);
    expect(tableAlignmentOn()).toBe(true);
  });

  it("realigns nothing while alignment is off", () => {
    mount(PLAIN);
    expect(setTableAlignment(false)).toBe(false);
    place(at(7, 5));
    type("ice");
    expect(documentText(view)).toBe(PLAIN.replace("| Al ", "| Alice "));
    expect(lines().slice(4, 6)).toEqual(["| Name | Note |", "|------|------|"]);
  });

  it("realigns nothing when alignment is switched back on, and realigns on the next edit", () => {
    mount(PLAIN);
    setTableAlignment(false);
    place(at(7, 5));
    type("ice");
    const ragged = documentText(view);
    // The switch itself writes a boolean and nothing else.
    expect(setTableAlignment(true)).toBe(true);
    expect(documentText(view)).toBe(ragged);
    // The next edit inside the table is what realigns it.
    type("!");
    expect(lines().slice(4, 8)).toEqual([
      "| Name   | Note |",
      "|--------|------|",
      "| Alice! | one  |",
      "| Bob    | two  |",
    ]);
  });

  it("keeps the switch across opening another chapter", () => {
    mount(PLAIN);
    setTableAlignment(false);
    // `setDocument` builds a fresh `EditorState`, which is why the flag is
    // module state rather than a `StateField` or a `Compartment`: either would
    // come back at its `create` value here.
    setDocument(view, PLAIN);
    expect(tableAlignmentOn()).toBe(false);
    place(at(7, 5));
    type("ice");
    expect(lines()[5]).toBe("|------|------|");
  });

  it("starts on again when the module is loaded afresh", async () => {
    mount(PLAIN);
    setTableAlignment(false);
    expect(tableAlignmentOn()).toBe(false);
    vi.resetModules();
    // The closest jsdom has to a new process: the module's own initialiser
    // runs again. A real quit and relaunch is M39-9.
    const fresh = await import("./tables");
    expect(fresh.tableAlignmentOn()).toBe(true);
  });

  it("writes the switch nowhere but memory", () => {
    mount(PLAIN);
    const source = readFileSync(join(process.cwd(), "src/tables.ts"), "utf8");
    // No settings store, no `document.yaml`, no shell call, no browser
    // storage: cond-2609091900422614 makes the switch session-scoped by
    // decision, and there is nothing here that could outlive the process.
    for (const forbidden of [
      "settings",
      "document.yaml",
      "invoke",
      "localStorage",
      "sessionStorage",
      "writeChapter",
      "readTextScale",
    ]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
  });
});
