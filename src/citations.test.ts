/**
 * Citation completion and hover (itd-2609051335502171, map #11).
 *
 * The trigger, the candidate filter, the completed-citation scan and the
 * hover summary are plain functions over text and a `Bibliography`, tested
 * directly; a handful of tests then mount a real `EditorView` to prove the
 * editor extension wires those functions to the keyboard and to the state
 * a document's bibliography sets.
 */

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

import { parseBibliography } from "./core/bibliography";
import {
  citationCandidates,
  citationCompletionField,
  citationCompletionKeymap,
  citationExtensions,
  citationHoverSummary,
  citationTriggerAt,
  completedCitationAt,
  setBibliography,
} from "./citations";

const BIB = [
  "@article{smith2020,",
  "  author = {Smith, Alice},",
  "  title = {The Lantern Papers},",
  "  year = {2020},",
  "}",
  "@article{smart2021,",
  "  author = {Smart, Bob},",
  "  title = {A Second Winter},",
  "  year = {2021},",
  "}",
  "@book{carroll1999,",
  "  author = {Carroll, Carol},",
  "  title = {Reading by Lamplight},",
  "  year = {1999},",
  "}",
].join("\n");

const BIBLIOGRAPHY = parseBibliography(BIB);

describe("citationTriggerAt", () => {
  it("finds an unterminated [@ right before the cursor, with what was typed of the key", () => {
    expect(citationTriggerAt("As shown [@smi", 14)).toEqual({ from: 11, prefix: "smi" });
  });

  it("finds the trigger with nothing typed yet", () => {
    expect(citationTriggerAt("As shown [@", 11)).toEqual({ from: 11, prefix: "" });
  });

  it("finds nothing once the citation is closed", () => {
    expect(citationTriggerAt("As shown [@smith2020]", 21)).toBeNull();
  });

  it("finds nothing where the cursor sits well past the citation", () => {
    expect(citationTriggerAt("As shown [@smith2020] and more", 25)).toBeNull();
  });

  it("finds nothing on an ordinary line with no [@ at all", () => {
    expect(citationTriggerAt("Just a sentence.", 10)).toBeNull();
  });

  it("stops at a space, which starts the locator rather than the key", () => {
    expect(citationTriggerAt("[@smith2020, p", 14)).toBeNull();
  });

  it("reads the most recent [@ when an earlier, closed one sits before it", () => {
    const line = "[@early] and [@la";
    expect(citationTriggerAt(line, line.length)).toEqual({
      from: line.indexOf("[@la") + 2,
      prefix: "la",
    });
  });
});

describe("citationCandidates", () => {
  it("offers every key beginning with the letters typed, file order", () => {
    expect(citationCandidates(BIBLIOGRAPHY, "sm")).toEqual(["smith2020", "smart2021"]);
  });

  it("folds case, so 'Sm' matches the same keys as 'sm'", () => {
    expect(citationCandidates(BIBLIOGRAPHY, "Sm")).toEqual(["smith2020", "smart2021"]);
  });

  it("offers every key at all when nothing has been typed yet", () => {
    expect(citationCandidates(BIBLIOGRAPHY, "")).toEqual([
      "smith2020",
      "smart2021",
      "carroll1999",
    ]);
  });

  it("offers nothing when no key begins with what was typed", () => {
    expect(citationCandidates(BIBLIOGRAPHY, "zzz")).toEqual([]);
  });
});

describe("completedCitationAt", () => {
  it("finds a bare completed citation, resting anywhere inside it", () => {
    const line = "As shown [@smith2020].";
    const from = line.indexOf("[");
    const to = line.indexOf("]") + 1;
    for (let column = from; column <= to; column += 1) {
      expect(completedCitationAt(line, column)).toEqual({ from, to, keys: ["smith2020"] });
    }
  });

  it("finds a completed citation carrying a locator", () => {
    const line = "As shown [@smith2020, p. 4].";
    expect(completedCitationAt(line, 15)).toEqual({
      from: line.indexOf("["),
      to: line.indexOf("]") + 1,
      keys: ["smith2020"],
    });
  });

  it("finds every key of a citation naming more than one", () => {
    expect(completedCitationAt("A joint claim [@smith2020; @carroll1999].", 20)?.keys).toEqual([
      "smith2020",
      "carroll1999",
    ]);
  });

  it("finds nothing outside the brackets", () => {
    const line = "As shown [@smith2020] here.";
    expect(completedCitationAt(line, 0)).toBeNull();
    expect(completedCitationAt(line, line.length)).toBeNull();
  });

  it("finds nothing for an unterminated citation still being typed", () => {
    expect(completedCitationAt("As shown [@smi", 14)).toBeNull();
  });
});

describe("citationHoverSummary", () => {
  it("names a resolved key's author, title and date, plainly", () => {
    expect(citationHoverSummary(BIBLIOGRAPHY, ["smith2020"])).toEqual([
      "Smith, Alice. 2020. The Lantern Papers.",
    ]);
  });

  it("names every key of a joint citation, one line each", () => {
    expect(citationHoverSummary(BIBLIOGRAPHY, ["smith2020", "carroll1999"])).toEqual([
      "Smith, Alice. 2020. The Lantern Papers.",
      "Carroll, Carol. 1999. Reading by Lamplight.",
    ]);
  });

  it("says nothing for a key that resolves to nothing", () => {
    expect(citationHoverSummary(BIBLIOGRAPHY, ["nosuchkey"])).toEqual([]);
  });
});

// ------------------------------------------------------- the editor extension

function view(doc: string): EditorView {
  return new EditorView({
    state: EditorState.create({ doc, extensions: citationExtensions() }),
  });
}

/** Type one character at the cursor, as a keystroke would. */
function type(editor: EditorView, text: string): void {
  const head = editor.state.selection.main.head;
  editor.dispatch({ changes: { from: head, insert: text }, selection: { anchor: head + text.length } });
}

describe("the completion tooltip", () => {
  it("shows nothing before a bibliography is set", () => {
    const editor = view("As shown [@smi");
    editor.dispatch({ selection: { anchor: 14 } });
    expect(editor.state.field(citationCompletionField)).toEqual([]);
  });

  it("lists every matching key once a bibliography is set and the trigger is typed", () => {
    const editor = view("As shown [@smi");
    setBibliography(editor, BIBLIOGRAPHY);
    editor.dispatch({ selection: { anchor: 14 } });
    const tooltips = editor.state.field(citationCompletionField);
    expect(tooltips).toHaveLength(1);
    const dom = tooltips[0]?.create(editor).dom;
    const rows = [...(dom?.querySelectorAll(".cm-citation-completion-row") ?? [])].map(
      (row) => row.textContent,
    );
    // "smi" matches "smith2020" but not "smart2021".
    expect(rows).toEqual(["smith2020"]);
  });

  it("closes once the citation is closed with a bracket", () => {
    const editor = view("");
    setBibliography(editor, BIBLIOGRAPHY);
    type(editor, "[@smi");
    expect(editor.state.field(citationCompletionField)).toHaveLength(1);
    type(editor, "]");
    expect(editor.state.field(citationCompletionField)).toEqual([]);
  });

  it("accepts the first candidate on Tab", () => {
    const editor = view("");
    setBibliography(editor, BIBLIOGRAPHY);
    type(editor, "[@sm");
    const tab = citationCompletionKeymap.find((binding) => binding.key === "Tab");
    expect(tab?.run?.(editor)).toBe(true);
    expect(editor.state.doc.toString()).toBe("[@smith2020");
    expect(editor.state.selection.main.head).toBe("[@smith2020".length);
  });

  it("declines Tab, unclaimed, when no completion is showing", () => {
    const editor = view("Just a sentence.");
    setBibliography(editor, BIBLIOGRAPHY);
    const tab = citationCompletionKeymap.find((binding) => binding.key === "Tab");
    expect(tab?.run?.(editor)).toBe(false);
    expect(editor.state.doc.toString()).toBe("Just a sentence.");
  });

  it("accepts a row on click, replacing the typed prefix with the full key", () => {
    const editor = view("[@sma");
    setBibliography(editor, BIBLIOGRAPHY);
    editor.dispatch({ selection: { anchor: 5 } });
    const tooltip = editor.state.field(citationCompletionField)[0];
    const dom = tooltip?.create(editor).dom;
    const row = dom?.querySelector<HTMLElement>('[data-key="smart2021"]');
    row?.dispatchEvent(new Event("mousedown", { bubbles: true, cancelable: true }));
    expect(editor.state.doc.toString()).toBe("[@smart2021");
  });
});
