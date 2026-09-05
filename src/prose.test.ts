/**
 * The prose vocabulary, over a real editing surface.
 *
 * Filling is the command with something to prove: it rewrites a paragraph, so
 * every test of it asserts the bytes either side are the bytes that were there
 * before. The rest are small commands with small claims, and each is checked
 * against what Emacs does with the same keystroke.
 */

import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseChapter } from "./core/parse";
import { createEditor, documentText } from "./editor";
import { BINDINGS, bindingById, scopeOf } from "./keys";
import { closeOverlay } from "./overlay";
import {
  DEFAULT_FILL_COLUMN,
  DESCRIBE_PROMPT,
  MODELINE_BUDGET,
  NOTHING_TO_FILL,
  NO_EXPANSION,
  NO_LINE_ABOVE,
  NO_LINE_ABOVE_TO_JOIN,
  NO_TWO_WORDS,
  NO_WORD_TO_CAPITALISE,
  NOTHING_TO_EXPAND,
  ZAP_PROMPT,
  backwardParagraph,
  backwardSentence,
  capitalizeWord,
  dabbrevExpand,
  deleteHorizontalSpace,
  deleteIndentation,
  describeKey,
  fillParagraph,
  fillText,
  forwardParagraph,
  forwardSentence,
  justOneSpace,
  moveToWindowLine,
  opensBlock,
  proseMessages,
  transposeLines,
  transposeWords,
  zapToChar,
} from "./prose";

/** The 544-character paragraph the acceptance criterion names. */
const LONG_PARAGRAPH =
  "The lanternkeeper walked the harbour wall each evening, counting the lamps " +
  "she had trimmed that morning and noting, in a small notebook she kept for " +
  "the purpose, which of them had guttered before dawn. Lanternlight is a " +
  "stubborn thing: it fails in the hours nobody watches, and the record of a " +
  "failure is worth more than the memory of one. She had learned that in her " +
  "very first winter, when three lamps went dark on the same night and nobody " +
  "could say which had failed first, or whether the wind or the oil had been " +
  "the cause of it at all now.";

/** The one-based line the long paragraph sits on in `CHAPTER`. */
const PARAGRAPH_LINE = 5;

/**
 * A chapter with one of every block filling has to refuse.
 *
 * The second paragraph is the long line; a first paragraph sits above it and a
 * captioned pipe table below, which is the shape the criterion asks for.
 */
const CHAPTER = [
  "# Beginnings",
  "",
  "The first paragraph is left exactly as it is, byte for byte.",
  "",
  LONG_PARAGRAPH,
  "",
  "| Winter | Lanterns |",
  "|--------|----------|",
  "| 2019   | 12       |",
  "| 2020   | 19       |",
  "",
  ": The counts by winter {#tbl:counts}",
  "",
  "## Winters",
  "",
  "::: {.notes}",
  "A note the fill command must not touch.",
  ":::",
  "",
  "```text",
  "not prose at all",
  "```",
  "",
  "> A quotation the fill command must not touch.",
  "",
  "- a list item",
  "- another list item",
  "",
].join("\n");

let host: HTMLElement;
let view: EditorView;

function open(text: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    selection: EditorSelection.cursor(0),
  });
}

/** Put the cursor at an absolute offset. */
function place(at: number): void {
  view.dispatch({ selection: EditorSelection.cursor(at) });
}

/** Put the cursor at the start of a one-based line. */
function onLine(line: number, column = 0): void {
  place(view.state.doc.line(line).from + column);
}

/** The one-based line the cursor is on. */
function cursorLine(): number {
  return view.state.doc.lineAt(view.state.selection.main.head).number;
}

/** The physical key each punctuation name sits on. */
const CODES: Readonly<Record<string, string>> = {
  "/": "Slash",
  "\\": "Backslash",
  "[": "BracketLeft",
  "]": "BracketRight",
};

/** Send one keydown at the document, as a prompt's overlay hears it. */
function pressKey(name: string, modifiers: readonly string[] = []): void {
  const code = /^[a-z]$/i.test(name)
    ? `Key${name.toUpperCase()}`
    : /^[0-9]$/.test(name)
      ? `Digit${name}`
      : (CODES[name] ?? name);
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: name,
      code,
      ctrlKey: modifiers.includes("C"),
      altKey: modifiers.includes("M"),
      metaKey: modifiers.includes("s"),
      shiftKey: modifiers.includes("S"),
      bubbles: true,
      cancelable: true,
    }),
  );
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  view = createEditor(host, CHAPTER);
});

afterEach(() => {
  closeOverlay();
  view.destroy();
  host.remove();
});

describe("filling a paragraph", () => {
  it("fills one paragraph to the document's fill column and leaves every other byte alone", () => {
    expect(LONG_PARAGRAPH).toHaveLength(544);
    const from = view.state.doc.line(PARAGRAPH_LINE).from;
    const to = view.state.doc.line(PARAGRAPH_LINE).to;
    const before = CHAPTER.slice(0, from);
    const after = CHAPTER.slice(to);

    onLine(PARAGRAPH_LINE, 30);
    expect(fillParagraph(view, { fillColumn: DEFAULT_FILL_COLUMN })).toBeNull();

    const text = documentText(view);
    // The whole of the byte-fidelity claim: everything before the paragraph's
    // first character and after its last is what it was.
    expect(text.startsWith(before)).toBe(true);
    expect(text.endsWith(after)).toBe(true);

    const filled = text.slice(before.length, text.length - after.length);
    expect(filled).not.toBe(LONG_PARAGRAPH);
    const lines = filled.split("\n");
    expect(lines.length).toBeGreaterThan(6);
    for (const line of lines) {
      expect(line.length, line).toBeLessThanOrEqual(DEFAULT_FILL_COLUMN);
    }
    // Not one word gained, lost, or reordered.
    expect(filled.split(/\s+/)).toEqual(LONG_PARAGRAPH.split(/\s+/));
    // The table and its caption are still the table and its caption.
    const blocks = parseChapter(text).blocks;
    expect(blocks.map((block) => block.kind)).toEqual(
      parseChapter(CHAPTER).blocks.map((block) => block.kind),
    );
    expect(blocks.find((block) => block.kind === "table")?.caption).toBe(
      "The counts by winter",
    );
  });

  it("fills at the column the document states rather than at the default", () => {
    onLine(PARAGRAPH_LINE);
    fillParagraph(view, { fillColumn: 40 });
    const filled = view.state.doc
      .sliceString(
        view.state.doc.line(PARAGRAPH_LINE).from,
        view.state.doc.line(PARAGRAPH_LINE + 15).to,
      )
      .split("\n");
    for (const line of filled) {
      expect(line.length, line).toBeLessThanOrEqual(40);
    }
  });

  it("puts two spaces after a sentence end and one between words", () => {
    onLine(PARAGRAPH_LINE);
    fillParagraph(view, { fillColumn: DEFAULT_FILL_COLUMN });
    const text = documentText(view);
    expect(text).toContain("before dawn.  Lanternlight");
    expect(text).toContain("the harbour wall");
    // With Emacs's rule off, one space is enough.
    open(CHAPTER);
    onLine(PARAGRAPH_LINE);
    fillParagraph(view, {
      fillColumn: DEFAULT_FILL_COLUMN,
      sentenceEndDoubleSpace: false,
    });
    expect(documentText(view)).toContain("before dawn. Lanternlight");
  });

  it("takes the whole fill back in one undo", () => {
    onLine(PARAGRAPH_LINE);
    fillParagraph(view, { fillColumn: DEFAULT_FILL_COLUMN });
    expect(documentText(view)).not.toBe(CHAPTER);
    const undo = bindingById("undo")?.chords[0] ?? "C-/";
    view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "/",
        code: "Slash",
        ctrlKey: undo.startsWith("C-"),
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(documentText(view)).toBe(CHAPTER);
  });

  it("changes nothing when the paragraph is already filled", () => {
    onLine(PARAGRAPH_LINE);
    fillParagraph(view, { fillColumn: DEFAULT_FILL_COLUMN });
    const once = documentText(view);
    expect(fillParagraph(view, { fillColumn: DEFAULT_FILL_COLUMN })).toBeNull();
    expect(documentText(view)).toBe(once);
  });

  it("refuses to fill anywhere that is not a paragraph, and names where", () => {
    const cases: readonly (readonly [number, string])[] = [
      [1, "heading"],
      [14, "heading"],
      [8, "table"],
      [12, "table"],
      [17, "fenced div"],
      [21, "code block"],
      [24, "quotation"],
      [26, "list"],
    ];
    for (const [line, named] of cases) {
      open(CHAPTER);
      onLine(line);
      const refusal = fillParagraph(view, { fillColumn: 40 });
      expect(refusal, `line ${String(line)}`).not.toBeNull();
      expect(refusal, `line ${String(line)}`).toContain(named);
      // Not one byte, on any refusal.
      expect(documentText(view), `line ${String(line)}`).toBe(CHAPTER);
    }
  });

  it("refuses on a blank line, where there is no block at all", () => {
    onLine(2);
    expect(fillParagraph(view, {})).toBe(NOTHING_TO_FILL);
    expect(documentText(view)).toBe(CHAPTER);
  });

  it("fills a real chapter's paragraph without touching the table or its caption", () => {
    const path =
      "examples/manuscript/01-manuscript/02-the-current-state-of-the-art.md";
    const source = readFileSync(path, "utf8");
    open(source);

    const blocks = parseChapter(source).blocks;
    const tableAt = blocks.findIndex((block) => block.kind === "table");
    expect(tableAt).toBeGreaterThan(0);
    const paragraph = [...blocks.slice(0, tableAt)]
      .reverse()
      .find((block) => block.kind === "paragraph");
    expect(paragraph).toBeDefined();
    if (!paragraph) return;

    const from = view.state.doc.line(paragraph.line).from;
    const to = view.state.doc.line(paragraph.endLine).to;
    const before = source.slice(0, from);
    const after = source.slice(to);

    onLine(paragraph.line, 10);
    expect(fillParagraph(view, { fillColumn: DEFAULT_FILL_COLUMN })).toBeNull();

    const text = documentText(view);
    expect(text.startsWith(before)).toBe(true);
    expect(text.endsWith(after)).toBe(true);
    expect(text).not.toBe(source);

    const after_ = parseChapter(text);
    expect(after_.blocks.map((block) => block.kind)).toEqual(
      blocks.map((block) => block.kind),
    );
    const table = after_.blocks.find((block) => block.kind === "table");
    expect(table?.caption).toBe(
      blocks.find((block) => block.kind === "table")?.caption,
    );
    // Every citation, emphasis and quotation mark is still where it was.
    expect(text.replace(/\s+/g, " ")).toBe(source.replace(/\s+/g, " "));
  });

  it("never wraps a line so that a word opens a block construct", () => {
    // Degrade gracefully in a plain tool: a reader that knows nothing about
    // where a line was wrapped must not see a list, a table, or a heading.
    const hazards = [
      "-",
      "+",
      "*",
      "#",
      ">",
      "|",
      ":",
      "=",
      "1.",
      "2)",
      "```",
      "~~~",
    ];
    for (const hazard of hazards) {
      expect(opensBlock(hazard), hazard).toBe(true);
    }
    const source =
      "Alice counted the lanterns along the harbour wall in the dark and then " +
      "- one by one - she wrote every one of them down, 1. and 2) and 3. as she " +
      "went, with a | between each pair and a > before the total.";
    const filled = fillText(source, 40, true, "\n");
    for (const line of filled.split("\n")) {
      const first = line.trim().split(/\s+/)[0] ?? "";
      expect(opensBlock(first), line).toBe(false);
    }
    expect(filled.split(/\s+/)).toEqual(source.split(/\s+/));
  });

  it("keeps a word longer than the column on a line of its own", () => {
    const long = "l".repeat(50);
    const filled = fillText(`one two ${long} three four`, 20, true, "\n");
    expect(filled.split("\n")).toContain(long);
  });

  it("keeps the first line's indentation as every line's prefix", () => {
    const filled = fillText(
      "  alpha beta gamma delta epsilon zeta eta theta iota kappa",
      20,
      true,
      "\n",
    );
    for (const line of filled.split("\n")) {
      expect(line.startsWith("  ")).toBe(true);
    }
  });
});

describe("transposing", () => {
  it("swaps the two words either side of the cursor and leaves the point after", () => {
    open("alpha beta gamma\n");
    place("alpha".length);
    expect(transposeWords(view)).toBeNull();
    expect(view.state.doc.line(1).text).toBe("beta alpha gamma");
    expect(view.state.selection.main.head).toBe("beta alpha".length);
  });

  it("swaps the word the cursor is inside with the one after it", () => {
    open("alpha beta gamma\n");
    place(2);
    expect(transposeWords(view)).toBeNull();
    expect(view.state.doc.line(1).text).toBe("beta alpha gamma");
  });

  it("refuses where there are not two words", () => {
    open("alpha\n");
    place(5);
    expect(transposeWords(view)).toBe(NO_TWO_WORDS);
    expect(documentText(view)).toBe("alpha\n");
  });

  it("swaps a line with the one above it", () => {
    open("one\ntwo\nthree\n");
    onLine(2);
    expect(transposeLines(view)).toBeNull();
    expect(view.state.doc.line(1).text).toBe("two");
    expect(view.state.doc.line(2).text).toBe("one");
    expect(view.state.doc.line(3).text).toBe("three");
  });

  it("refuses on the first line", () => {
    open("one\ntwo\n");
    onLine(1);
    expect(transposeLines(view)).toBe(NO_LINE_ABOVE);
    expect(documentText(view)).toBe("one\ntwo\n");
  });
});

describe("capitalising", () => {
  it("upper-cases the first letter and lower-cases the tail", () => {
    open("the lANTERN keeper\n");
    onLine(1, 4);
    expect(capitalizeWord(view)).toBeNull();
    expect(view.state.doc.line(1).text).toBe("the Lantern keeper");
    expect(view.state.selection.main.head).toBe("the Lantern".length);
  });

  it("takes the next word when the cursor is in whitespace", () => {
    open("the  lantern\n");
    onLine(1, 4);
    capitalizeWord(view);
    expect(view.state.doc.line(1).text).toBe("the  Lantern");
  });

  it("refuses when there is no word ahead", () => {
    open("alice\n");
    place(view.state.doc.length);
    expect(capitalizeWord(view)).toBe(NO_WORD_TO_CAPITALISE);
  });
});

describe("moving by sentence and by paragraph", () => {
  const PROSE = [
    "One sentence ends here.  Another begins and ends here.  A third one.",
    "",
    "A second paragraph.  With two sentences.",
    "",
  ].join("\n");

  it("moves forward to the end of the sentence", () => {
    open(PROSE);
    onLine(1, 4);
    expect(forwardSentence(view, {})).toBeNull();
    expect(view.state.selection.main.head).toBe("One sentence ends here.".length);
    forwardSentence(view, {});
    expect(view.state.selection.main.head).toBe(
      "One sentence ends here.  Another begins and ends here.".length,
    );
  });

  it("moves backward to the beginning of the sentence", () => {
    open(PROSE);
    onLine(1, 40);
    expect(backwardSentence(view, {})).toBeNull();
    expect(view.state.selection.main.head).toBe(
      "One sentence ends here.  ".length,
    );
    backwardSentence(view, {});
    expect(view.state.selection.main.head).toBe(0);
  });

  it("takes one space as a sentence end when Emacs's rule is off", () => {
    open("One. Two. Three.\n");
    place(0);
    forwardSentence(view, { sentenceEndDoubleSpace: false });
    expect(view.state.selection.main.head).toBe("One.".length);
    place(0);
    forwardSentence(view, { sentenceEndDoubleSpace: true });
    // With the rule on, a single space is not an end, so the move runs to the
    // end of the line, which is one.
    expect(view.state.selection.main.head).toBe("One. Two. Three.".length);
  });

  it("moves over blank lines to the blank line after the paragraph", () => {
    open(PROSE);
    onLine(1);
    expect(forwardParagraph(view)).toBeNull();
    expect(cursorLine()).toBe(2);
    forwardParagraph(view);
    expect(cursorLine()).toBe(4);
  });

  it("moves back to the blank line before the paragraph", () => {
    open(PROSE);
    onLine(3, 5);
    expect(backwardParagraph(view)).toBeNull();
    expect(cursorLine()).toBe(2);
    backwardParagraph(view);
    expect(view.state.selection.main.head).toBe(0);
  });
});

describe("repairing whitespace", () => {
  it("joins the line to the one above with one space", () => {
    open("first line\n    second line\n");
    onLine(2, 6);
    expect(deleteIndentation(view)).toBeNull();
    expect(view.state.doc.lines).toBe(2);
    expect(view.state.doc.line(1).text).toBe("first line second line");
  });

  it("refuses on the first line", () => {
    open("only\n");
    onLine(1);
    expect(deleteIndentation(view)).toBe(NO_LINE_ABOVE_TO_JOIN);
    expect(documentText(view)).toBe("only\n");
  });

  it("collapses the space around the cursor to one", () => {
    open("alpha     beta\n");
    onLine(1, 8);
    expect(justOneSpace(view)).toBeNull();
    expect(view.state.doc.line(1).text).toBe("alpha beta");
    expect(view.state.selection.main.head).toBe("alpha ".length);
  });

  it("takes the space around the cursor away", () => {
    open("alpha     beta\n");
    onLine(1, 8);
    expect(deleteHorizontalSpace(view)).toBeNull();
    expect(view.state.doc.line(1).text).toBe("alphabeta");
  });
});

describe("moving to the middle of the view", () => {
  it("keeps the column and changes not one byte", () => {
    open("one line\ntwo line\nthree line\n");
    onLine(3, 4);
    const before = documentText(view);
    expect(moveToWindowLine(view)).toBeNull();
    expect(documentText(view)).toBe(before);
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    expect(head - line.from).toBeLessThanOrEqual(4);
  });
});

describe("expanding a word from the document", () => {
  const WORDS = [
    "The lanternkeeper trims what the lanternlight leaves.",
    "",
    "lant",
  ].join("\n");

  it("expands a word from the document's own words and cycles back to what was typed", () => {
    open(WORDS);
    place(view.state.doc.length);
    expect(view.state.doc.line(3).text).toBe("lant");

    expect(dabbrevExpand(view)).toBeNull();
    // Backwards first: `lanternlight` is the nearer of the two.
    expect(view.state.doc.line(3).text).toBe("lanternlight");

    expect(dabbrevExpand(view)).toBeNull();
    expect(view.state.doc.line(3).text).toBe("lanternkeeper");

    expect(dabbrevExpand(view)).toBeNull();
    expect(view.state.doc.line(3).text).toBe("lant");

    // And round again, so it is a cycle and not a run.
    expect(dabbrevExpand(view)).toBeNull();
    expect(view.state.doc.line(3).text).toBe("lanternlight");
  });

  it("ends the cycle when the author types, and when the cursor moves away", () => {
    open(WORDS);
    place(view.state.doc.length);
    dabbrevExpand(view);
    expect(view.state.doc.line(3).text).toBe("lanternlight");

    // Typing is another transaction, so the next press expands the new prefix
    // rather than taking the cycle's second candidate.
    const at = view.state.doc.length;
    view.dispatch({
      changes: { from: at, to: at, insert: "k" },
      selection: EditorSelection.cursor(at + 1),
    });
    expect(dabbrevExpand(view)).toBe(NO_EXPANSION);
    expect(view.state.doc.line(3).text).toBe("lanternlightk");

    // And a cursor somewhere else is somewhere else, not the next candidate.
    onLine(2);
    expect(dabbrevExpand(view)).toBe(NOTHING_TO_EXPAND);
  });

  it("refuses with nothing before the cursor, and with nothing to expand to", () => {
    open("alpha beta\n\n");
    onLine(2);
    expect(dabbrevExpand(view)).toBe(NOTHING_TO_EXPAND);
    open("alpha beta\n\nzz");
    place(view.state.doc.length);
    expect(dabbrevExpand(view)).toBe(NO_EXPANSION);
    expect(documentText(view)).toBe("alpha beta\n\nzz");
  });
});

describe("the prompts", () => {
  let said: string[];

  beforeEach(() => {
    said = [];
  });

  const announce = (message: string): void => {
    said.push(message);
  };

  it("prompts for a character and kills up to and including it", () => {
    open("alpha beta gamma\n");
    place(0);
    zapToChar(view, { host, announce });
    expect(said[0]).toBe(ZAP_PROMPT);
    pressKey("b");
    expect(view.state.doc.line(1).text).toBe("eta gamma");
    expect(said[said.length - 1]).toBe("Zapped to b");
    // The killed text is on the one kill ring, so `C-y` yanks it back.
    view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "y",
        code: "KeyY",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(view.state.doc.line(1).text).toBe("alpha beta gamma");
  });

  it("says so when the character is not ahead, and writes nothing", () => {
    open("alpha beta\n");
    place(0);
    zapToChar(view, { host, announce });
    pressKey("z");
    expect(documentText(view)).toBe("alpha beta\n");
    expect(said[said.length - 1]).toContain("ahead to zap to");
  });

  it("cancels on C-g and changes not one byte", () => {
    open("alpha beta\n");
    place(0);
    zapToChar(view, { host, announce });
    pressKey("g", ["C"]);
    expect(documentText(view)).toBe("alpha beta\n");
    expect(said[said.length - 1]).toBe("Cancelled");
    expect(document.querySelector(".prompt")).toBeNull();
  });

  it("names the row the next chord reaches", () => {
    describeKey({ host, announce });
    expect(said[0]).toBe(DESCRIBE_PROMPT);
    pressKey("c", ["M"]);
    expect(said[said.length - 1]).toBe("M-c is Capitalise word");
    expect(document.querySelector(".prompt")).toBeNull();
  });

  it("reads a prefix chord as one sequence before it answers", () => {
    describeKey({ host, announce });
    pressKey("x", ["C"]);
    expect(said[said.length - 1]).toBe(`${DESCRIBE_PROMPT} C-x-`);
    expect(document.querySelector(".prompt")).not.toBeNull();
    pressKey("s", ["C"]);
    expect(said[said.length - 1]).toBe("C-x C-s is Save the chapter");
    expect(document.querySelector(".prompt")).toBeNull();
  });

  it("says a chord is not bound when the table does not carry it", () => {
    describeKey({ host, announce });
    pressKey("j", ["M"]);
    expect(said[said.length - 1]).toBe("M-j is not bound");
  });

  it("waits through a modifier held on its own", () => {
    describeKey({ host, announce });
    pressKey("Shift", ["S"]);
    expect(document.querySelector(".prompt")).not.toBeNull();
    pressKey("q", ["M"]);
    expect(said[said.length - 1]).toBe("M-q is Fill the paragraph");
  });

  it("keeps every prompt and message inside the modeline's budget", () => {
    const messages = [
      ...proseMessages(),
      "Zapped to x",
      "No x ahead to zap to",
      `${DESCRIBE_PROMPT} C-x-`,
      // Every answer `C-h k` can give, built from the table rather than typed.
      ...BINDINGS.filter((binding) => scopeOf(binding) === "editor").flatMap(
        (binding) =>
          binding.chords.map((chord) => `${chord} is ${binding.label}`),
      ),
    ];
    for (const message of messages) {
      expect(message, message).not.toContain("\n");
      expect(message.length, message).toBeLessThanOrEqual(MODELINE_BUDGET);
    }
    expect(messages.length).toBeGreaterThan(100);
  });
});
