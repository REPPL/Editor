/**
 * The outline vocabulary, over a real editing surface.
 *
 * Promote, demote and moving a section are the commands with something to
 * prove: each rewrites lines, so every test of them asserts the bytes
 * outside the affected span are the bytes that were there before. Folding
 * and narrowing are commands with nothing to prove about bytes at all —
 * neither ever dispatches a document change — so their tests assert
 * `documentText` is untouched instead, over the same hazardous fixture the
 * text-scale spec's own round-trip test uses.
 */

import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getSearchQuery, searchPanelOpen } from "@codemirror/search";

import { createApp, type App, type AppServices } from "./app";
import { BINDINGS, bindingById, canonicalChord, chordIndexIn, scopeOf } from "./keys";
import { createEditor, documentText, setDocument } from "./editor";
import { queryReplaceRegex } from "./emacs";
import { closeOverlay } from "./overlay";
import {
  NO_NEXT_HEADING,
  NO_NEXT_SIBLING,
  NO_PARENT_HEADING,
  NO_PREVIOUS_HEADING,
  NO_PREVIOUS_SIBLING,
  NO_SECTION_TO_MOVE,
  NOT_AN_ATX_HEADING,
  NOT_IN_A_SECTION,
  NOT_NARROWED,
  NOTHING_TO_DEMOTE,
  NOTHING_TO_FOLD,
  NOTHING_TO_NARROW_TO,
  NOTHING_TO_PROMOTE,
  backwardSameLevelHeading,
  boldRegion,
  cycleOutline,
  demoteHeading,
  forwardSameLevelHeading,
  insertImage,
  insertLink,
  isNarrowed,
  italicRegion,
  moveHeadingDown,
  moveHeadingUp,
  narrowToSection,
  nextHeading,
  openOccur,
  openSwitchChapter,
  previousHeading,
  promoteHeading,
  toggleHeadingFold,
  upHeading,
  widenSection,
} from "./outline-commands";

/** A chapter with five headings across three levels, and body text under each. */
const OUTLINE_CHAPTER = [
  "# Book Title",
  "",
  "## Alpha",
  "",
  "Alpha body.",
  "",
  "### Alpha One",
  "",
  "Nested body.",
  "",
  "### Alpha Two",
  "",
  "More nested.",
  "",
  "## Beta",
  "",
  "Beta body.",
  "",
].join("\n");

/** A chapter with body text before any heading at all. */
const HEADLESS_PREAMBLE = ["A paragraph before any heading.", "", "## First heading", ""].join(
  "\n",
);

/**
 * A Setext (underlined) second heading, which promote and demote must
 * refuse. Its level is two, not one, so the refusal proves the ATX check
 * rather than the level-one bound `NOTHING_TO_PROMOTE` already covers.
 */
const SETEXT_CHAPTER = [
  "Title",
  "=====",
  "",
  "Setext Section",
  "--------------",
  "",
  "Body text.",
].join("\n");

/** The physical key each chord name in this file sits on. */
const CODES: Readonly<Record<string, string>> = {
  Left: "ArrowLeft",
  Right: "ArrowRight",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Tab: "Tab",
  Space: "Space",
  "5": "Digit5",
};

function codeFor(name: string): string {
  if (/^[a-zA-Z]$/.test(name)) return `Key${name.toUpperCase()}`;
  return CODES[name] ?? name;
}

/** Dispatch one chord step at the surface; true when the page claimed it. */
function pressAt(view: EditorView, chord: string): boolean {
  const modifiers = new Set<string>();
  let name = chord;
  for (;;) {
    const prefix = ["C-", "M-", "s-", "S-"].find(
      (candidate) => name.startsWith(candidate) && name.length > candidate.length,
    );
    if (!prefix) break;
    modifiers.add(prefix[0] as string);
    name = name.slice(2);
  }
  const event = new KeyboardEvent("keydown", {
    key: name,
    code: codeFor(name),
    ctrlKey: modifiers.has("C"),
    altKey: modifiers.has("M"),
    metaKey: modifiers.has("s"),
    shiftKey: modifiers.has("S"),
    bubbles: true,
    cancelable: true,
  });
  view.contentDOM.dispatchEvent(event);
  return event.defaultPrevented;
}

/** Dispatch every step of a multi-step chord, in order. */
function pressSequence(view: EditorView, chord: string): boolean {
  let claimed = false;
  for (const step of chord.split(" ")) claimed = pressAt(view, step);
  return claimed;
}

/** Send one keydown at the document, as an `openListOverlay` hears it. */
function pressOverlay(chord: string): void {
  const modifiers = new Set<string>();
  let name = chord;
  for (;;) {
    const prefix = ["C-", "M-", "s-", "S-"].find(
      (candidate) => name.startsWith(candidate) && name.length > candidate.length,
    );
    if (!prefix) break;
    modifiers.add(prefix[0] as string);
    name = name.slice(2);
  }
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: name === "Return" ? "Enter" : name,
      code: name === "Return" ? "Enter" : codeFor(name),
      ctrlKey: modifiers.has("C"),
      altKey: modifiers.has("M"),
      metaKey: modifiers.has("s"),
      shiftKey: modifiers.has("S"),
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Type into an open overlay's field, as an author would. */
function typeInto(selector: string, text: string): void {
  const field = document.querySelector<HTMLInputElement>(selector);
  if (!field) throw new Error(`no field matches ${selector}`);
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

/** The line texts of `text` from one 1-based line to another, inclusive. */
function linesOf(text: string, from: number, to: number): string[] {
  return text.split("\n").slice(from - 1, to);
}

/** What swapping two adjacent line ranges of `text` produces. */
function swapped(
  text: string,
  firstFrom: number,
  firstTo: number,
  secondFrom: number,
  secondTo: number,
): string {
  const all = text.split("\n");
  const before = all.slice(0, firstFrom - 1);
  const after = all.slice(secondTo);
  return [
    ...before,
    ...linesOf(text, secondFrom, secondTo),
    ...linesOf(text, firstFrom, firstTo),
    ...after,
  ].join("\n");
}

let host: HTMLElement;
let view: EditorView;

function open(text: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    selection: EditorSelection.cursor(0),
  });
}

/** Put the cursor at the start of a one-based line. */
function onLine(line: number, column = 0): void {
  view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(line).from + column) });
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  view = createEditor(host, OUTLINE_CHAPTER);
});

afterEach(() => {
  closeOverlay();
  view.destroy();
  host.remove();
});

const OUTLINE_ROWS: readonly (readonly [string, string])[] = [
  ["outline-next-heading", "C-c C-n"],
  ["outline-previous-heading", "C-c p"],
  ["outline-forward-same-level", "C-c C-f"],
  ["outline-backward-same-level", "C-c C-b"],
  ["outline-up-heading", "C-c C-u"],
  ["outline-toggle-fold", "Tab"],
  ["outline-cycle", "S-Tab"],
  ["outline-promote", "C-c Left"],
  ["outline-demote", "C-c Right"],
  ["outline-move-up", "C-c Up"],
  ["outline-move-down", "C-c Down"],
  ["outline-bold-region", "C-c C-s b"],
  ["outline-italic-region", "C-c C-s i"],
  ["outline-insert-link", "C-c l"],
  ["outline-insert-image", "C-c C-i"],
  ["outline-switch-chapter", "C-x b"],
  ["outline-close-chapter", "C-x C-k"],
  ["outline-narrow", "C-x n n"],
  ["outline-widen", "C-x n w"],
  ["outline-occur", "M-s o"],
  ["query-replace-regex", "C-M-S-5"],
];

describe("the keys panel", () => {
  it("lists every outline command in the binding table with a label and a chord", () => {
    expect(OUTLINE_ROWS).toHaveLength(21);
    for (const [id, chord] of OUTLINE_ROWS) {
      const row = bindingById(id);
      expect(row, id).toBeDefined();
      expect(row?.label.length ?? 0, id).toBeGreaterThan(0);
      expect(row?.chords, id).toEqual([chord]);
      expect(row?.owner, id).toBe("editor");
      expect(row?.group, id).toBe("outline");
      expect(scopeOf(row!), id).toBe("editor");
    }
  });

  it("gives no chord in the editor scope to two rows", () => {
    const index = chordIndexIn("editor");
    for (const [chords] of index) {
      const claimants = index.get(chords) ?? [];
      expect(claimants.length, chords).toBeLessThanOrEqual(1);
    }
  });
});

describe("settles the four chord conflicts without moving present, publish or the key log", () => {
  it("leaves the three incumbents exactly where they were", () => {
    expect(bindingById("present")?.chords).toEqual(["C-c C-p"]);
    expect(bindingById("present")?.owner).toBe("app");
    expect(bindingById("publish-open")?.chords).toEqual(["C-c C-l"]);
    expect(bindingById("publish-open")?.owner).toBe("app");
    expect(bindingById("toggle-key-log")?.chords).toEqual(["C-x k"]);
    expect(bindingById("toggle-key-log")?.owner).toBe("editor");
  });

  it("moves the outline vocabulary's own rows to a free chord instead", () => {
    expect(bindingById("outline-previous-heading")?.chords).toEqual(["C-c p"]);
    expect(bindingById("outline-insert-link")?.chords).toEqual(["C-c l"]);
    expect(bindingById("outline-close-chapter")?.chords).toEqual(["C-x C-k"]);
  });

  it("retires centre-selection rather than relocating it", () => {
    expect(bindingById("center-selection")).toBeUndefined();
    const claimants = BINDINGS.filter((binding) =>
      binding.chords.map(canonicalChord).includes("M-s"),
    );
    expect(claimants).toEqual([]);
  });

});

describe("heading movement", () => {
  it("moves to the next and previous heading regardless of level", () => {
    onLine(5); // "Alpha body."
    expect(nextHeading(view)).toBeNull();
    expect(view.state.selection.main.head).toBe(view.state.doc.line(7).from);

    onLine(5);
    expect(previousHeading(view)).toBeNull();
    expect(view.state.selection.main.head).toBe(view.state.doc.line(3).from);
  });

  it("refuses movement with a message when no heading answers the direction", () => {
    onLine(17); // "Beta body.", the last section
    expect(nextHeading(view)).toBe(NO_NEXT_HEADING);
    onLine(1); // the chapter's own title
    expect(previousHeading(view)).toBe(NO_PREVIOUS_HEADING);
  });

  it("moves to the next and previous heading at the same level, refusing across a shallower one", () => {
    onLine(9); // "Nested body.", inside "### Alpha One"
    expect(forwardSameLevelHeading(view)).toBeNull();
    expect(view.state.selection.main.head).toBe(view.state.doc.line(11).from);

    onLine(9);
    expect(backwardSameLevelHeading(view)).toBe(NO_PREVIOUS_SIBLING);

    onLine(13); // "More nested.", inside "### Alpha Two"
    expect(backwardSameLevelHeading(view)).toBeNull();
    expect(view.state.selection.main.head).toBe(view.state.doc.line(7).from);

    onLine(13);
    expect(forwardSameLevelHeading(view)).toBe(NO_NEXT_SIBLING);
  });

  it("moves up to the parent heading", () => {
    onLine(9); // inside "### Alpha One"
    expect(upHeading(view)).toBeNull();
    expect(view.state.selection.main.head).toBe(view.state.doc.line(3).from);

    onLine(1); // the chapter's own title has no parent
    expect(upHeading(view)).toBe(NO_PARENT_HEADING);
  });

  it("refuses every heading command with no heading before the cursor", () => {
    open(HEADLESS_PREAMBLE);
    onLine(1);
    expect(forwardSameLevelHeading(view)).toBe(NOT_IN_A_SECTION);
    expect(backwardSameLevelHeading(view)).toBe(NOT_IN_A_SECTION);
    expect(upHeading(view)).toBe(NOT_IN_A_SECTION);
  });
});

describe("folding", () => {
  it("folds and unfolds the section under a heading, changing no byte", () => {
    const before = documentText(view);
    onLine(3); // "## Alpha"
    expect(toggleHeadingFold(view)).toBeNull();
    expect(foldedRanges(view.state).size).toBeGreaterThan(0);
    expect(documentText(view)).toBe(before);

    expect(toggleHeadingFold(view)).toBeNull();
    expect(foldedRanges(view.state).size).toBe(0);
    expect(documentText(view)).toBe(before);
  });

  it("refuses to fold a heading with nothing under it", () => {
    // No level-one title above it: a title's own fold range would otherwise
    // reach past this heading and `toggleFold`'s "find an enclosing fold"
    // fallback would fold that instead of refusing.
    open(["## Empty", "## Next", ""].join("\n"));
    onLine(1);
    expect(toggleHeadingFold(view)).toBe(NOTHING_TO_FOLD);
  });

  it("cycles every level-two heading folded and back open, changing no byte", () => {
    const before = documentText(view);
    expect(cycleOutline(view)).toBeNull();
    expect(foldedRanges(view.state).size).toBe(2); // Alpha and Beta
    expect(documentText(view)).toBe(before);

    expect(cycleOutline(view)).toBeNull();
    expect(foldedRanges(view.state).size).toBe(0);
    expect(documentText(view)).toBe(before);
  });

});

describe("promote and demote", () => {
  it("demotes a heading and its subtree together", () => {
    onLine(3); // "## Alpha"
    expect(demoteHeading(view)).toBeNull();
    expect(view.state.doc.line(3).text).toBe("### Alpha");
    expect(view.state.doc.line(7).text).toBe("#### Alpha One");
    expect(view.state.doc.line(11).text).toBe("#### Alpha Two");
    // Everything else, title and Beta included, is untouched.
    expect(view.state.doc.line(1).text).toBe("# Book Title");
    expect(view.state.doc.line(15).text).toBe("## Beta");

    expect(promoteHeading(view)).toBeNull();
    expect(documentText(view)).toBe(OUTLINE_CHAPTER);
  });

  it("refuses to promote a chapter title past level one, unchanged", () => {
    onLine(1);
    expect(promoteHeading(view)).toBe(NOTHING_TO_PROMOTE);
    expect(documentText(view)).toBe(OUTLINE_CHAPTER);
  });

  it("refuses to demote a heading whose subtree would pass level six, unchanged", () => {
    const deep = ["# T", "", "###### Deepest", "", "Body.", ""].join("\n");
    open(deep);
    onLine(3);
    expect(demoteHeading(view)).toBe(NOTHING_TO_DEMOTE);
    expect(documentText(view)).toBe(deep);
  });

  it("refuses to promote or demote a Setext heading, unchanged", () => {
    open(SETEXT_CHAPTER);
    onLine(4); // "Setext Section", the level-two underlined heading
    expect(promoteHeading(view)).toBe(NOT_AN_ATX_HEADING);
    expect(demoteHeading(view)).toBe(NOT_AN_ATX_HEADING);
    expect(documentText(view)).toBe(SETEXT_CHAPTER);
  });

});

describe("moving a section", () => {
  it("moves a section down past its sibling, subtree included", () => {
    onLine(3); // "## Alpha"
    expect(moveHeadingDown(view)).toBeNull();
    expect(documentText(view)).toBe(swapped(OUTLINE_CHAPTER, 3, 14, 15, 18));
  });

  it("moves a section up past its sibling, matching the same swap", () => {
    onLine(15); // "## Beta"
    expect(moveHeadingUp(view)).toBeNull();
    expect(documentText(view)).toBe(swapped(OUTLINE_CHAPTER, 3, 14, 15, 18));
  });

  it("refuses to move a section with no sibling at its level", () => {
    onLine(3); // "## Alpha" has no earlier sibling
    expect(moveHeadingUp(view)).toBe(NO_SECTION_TO_MOVE);
    onLine(15); // "## Beta" has no later sibling
    expect(moveHeadingDown(view)).toBe(NO_SECTION_TO_MOVE);
    expect(documentText(view)).toBe(OUTLINE_CHAPTER);
  });

  it("keeps the blank separator and adds no trailing newline when the last section has none (Fable F11)", () => {
    // The last section carries no newline after it, because nothing follows
    // it in the file; swapping it into the first position must not leave
    // one behind, and the blank line that separated the two sections must
    // still separate them the other way round.
    open("## A\ntext\n\n## B\nmore");
    onLine(1); // "## A"
    expect(moveHeadingDown(view)).toBeNull();
    expect(documentText(view)).toBe("## B\nmore\n\n## A\ntext");
  });
});

describe("bold, italic and inserting a link or image", () => {
  it("wraps a selection in bold and italic markers", () => {
    open("A body word here.");
    view.dispatch({ selection: EditorSelection.range(2, 6) }); // "body"
    expect(boldRegion(view)).toBeNull();
    expect(documentText(view)).toBe("A **body** word here.");

    open("A body word here.");
    view.dispatch({ selection: EditorSelection.range(2, 6) });
    expect(italicRegion(view)).toBeNull();
    expect(documentText(view)).toBe("A *body* word here.");
  });

  it("opens empty markers with the cursor between them when nothing is selected", () => {
    open("");
    expect(boldRegion(view)).toBeNull();
    expect(documentText(view)).toBe("****");
    expect(view.state.selection.main.head).toBe(2);
  });

  it("inserts a link and an image template, using the selection as the label", () => {
    open("A word here.");
    view.dispatch({ selection: EditorSelection.range(2, 6) }); // "word"
    expect(insertLink(view)).toBeNull();
    expect(documentText(view)).toBe("A [word]() here.");
    expect(view.state.selection.main.head).toBe(9); // between the parentheses

    open("A word here.");
    view.dispatch({ selection: EditorSelection.range(2, 6) });
    expect(insertImage(view)).toBeNull();
    expect(documentText(view)).toBe("A ![word]() here.");
  });

  it("inserts empty templates with the cursor inside the brackets when nothing is selected", () => {
    open("");
    expect(insertLink(view)).toBeNull();
    expect(documentText(view)).toBe("[]()");
    expect(view.state.selection.main.head).toBe(1);
  });
});

describe("narrowing", () => {
  it("hides lines outside the section and restores them on widen, changing no byte", () => {
    const before = documentText(view);
    onLine(3); // "## Alpha", whose subtree runs to line 14
    expect(narrowToSection(view)).toBeNull();
    expect(isNarrowed(view)).toBe(true);
    expect(documentText(view)).toBe(before);

    const hiddenLine1 = view.contentDOM.querySelector(".cm-line");
    expect(hiddenLine1).not.toBeNull();

    expect(widenSection(view)).toBeNull();
    expect(isNarrowed(view)).toBe(false);
    expect(documentText(view)).toBe(before);
  });

  it("refuses to narrow with no heading, and to widen with nothing narrowed", () => {
    open(HEADLESS_PREAMBLE);
    onLine(1);
    expect(narrowToSection(view)).toBe(NOTHING_TO_NARROW_TO);
    expect(widenSection(view)).toBe(NOT_NARROWED);
  });

  it("never truncates a save while narrowed, over the hazardous chapter", () => {
    const longLine = `A very long line: ${"the quick brown fox jumps over the lazy dog. ".repeat(13)}`
      .slice(0, 543)
      .padEnd(544, ".");
    const hazardous = [
      "# A hazardous chapter",
      "",
      "## Section",
      "",
      longLine,
      "",
      "\tA tab-indented note, with trailing space.   ",
      "",
      "Last line, no trailing newline.",
    ].join("\n");
    open(hazardous);
    onLine(3); // "## Section"
    expect(narrowToSection(view)).toBeNull();
    // `documentText` is what every save reads; it must be the whole file,
    // hidden lines included, whichever state narrowing is in.
    expect(documentText(view)).toBe(hazardous);
  });
});

describe("switch chapter", () => {
  const chapters = [
    { path: "a.md", title: "Alpha chapter" },
    { path: "b.md", title: "Beta chapter" },
  ];

  it("filters chapters by name and calls back with the chosen path", () => {
    const chosen: string[] = [];
    openSwitchChapter(chapters, (path) => chosen.push(path));
    typeInto(".palette-field", "beta");
    const rows = document.querySelectorAll<HTMLElement>(".palette-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.dataset["chapter"]).toBe("b.md");
    pressOverlay("Return");
    expect(chosen).toEqual(["b.md"]);
    expect(document.querySelector(".palette")).toBeNull();
  });

  it("changes nothing when cancelled", () => {
    const chosen: string[] = [];
    openSwitchChapter(chapters, (path) => chosen.push(path));
    pressOverlay("C-g");
    expect(chosen).toEqual([]);
    expect(document.querySelector(".palette")).toBeNull();
  });
});

describe("query-replace-regex", () => {
  it("opens the search panel's replace field with the regular-expression option already on", () => {
    expect(searchPanelOpen(view.state)).toBe(false);
    queryReplaceRegex(view);
    expect(searchPanelOpen(view.state)).toBe(true);
    expect(getSearchQuery(view.state).regexp).toBe(true);
    expect(document.activeElement).toBe(
      view.dom.querySelector('input[name="replace"]'),
    );
  });
});

describe("occur", () => {
  it("finds matching lines and moves the cursor to the chosen one", () => {
    openOccur(view, {});
    expect(document.querySelectorAll(".palette-row")).toHaveLength(0);
    typeInto(".palette-field", "Alpha");
    const rows = document.querySelectorAll<HTMLElement>(".palette-row");
    expect(rows.length).toBeGreaterThan(0);
    pressOverlay("Return");
    expect(view.state.selection.main.head).toBe(view.state.doc.line(3).from);
  });

  it("changes not one byte when cancelled", () => {
    const before = documentText(view);
    openOccur(view, {});
    typeInto(".palette-field", "Alpha");
    pressOverlay("C-g");
    expect(documentText(view)).toBe(before);
  });

  it("matches a line's own text, not the line number its row is labelled with", () => {
    // Line 12 is a blank line; its row reads "12: " for display only. A
    // query of "12" must not find it by matching that label — no line's own
    // text holds the digits "12" anywhere in this chapter.
    openOccur(view, {});
    typeInto(".palette-field", "12");
    expect(document.querySelectorAll(".palette-row")).toHaveLength(0);
  });
});

/**
 * The chords themselves, over a mounted application.
 *
 * A bare `createEditor` view has no `commands` behind it — `run(id)` in
 * `src/emacs.ts` needs the application `createApp` wires — so this is the
 * one describe block that pays for a full `App`, kept small and used only
 * for the claims that need the real chord path: that `Tab` and `C-c Right`
 * reach the outline commands at all, and that `M-s` alone changes nothing
 * while `M-s o` opens occur.
 */
describe("through the keyboard, over a mounted application", () => {
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
    readChapter: () => Promise.resolve(OUTLINE_CHAPTER),
    writeChapter: () => Promise.resolve(),
    confirmDiscard: () => Promise.resolve(true),
  };

  let appHost: HTMLElement;
  let app: App;

  beforeEach(() => {
    appHost = document.createElement("div");
    document.body.append(appHost);
    app = createApp(appHost, services);
  });

  afterEach(() => {
    closeOverlay();
    app.destroy();
    appHost.remove();
  });

  function appOnLine(line: number): void {
    app.view.dispatch({
      selection: EditorSelection.cursor(app.view.state.doc.line(line).from),
    });
  }

  it("folds a section on Tab", () => {
    setDocument(app.view, OUTLINE_CHAPTER);
    appOnLine(3); // "## Alpha"
    expect(pressAt(app.view, "Tab")).toBe(true);
    expect(foldedRanges(app.view.state).size).toBeGreaterThan(0);
  });

  it("promotes and demotes a section on C-c Left and C-c Right", () => {
    setDocument(app.view, OUTLINE_CHAPTER);
    appOnLine(3); // "## Alpha"
    expect(pressSequence(app.view, "C-c Right")).toBe(true);
    expect(app.view.state.doc.line(3).text).toBe("### Alpha");
    expect(pressSequence(app.view, "C-c Left")).toBe(true);
    expect(app.view.state.doc.line(3).text).toBe("## Alpha");
  });

  it("presses M-s alone and finds nothing changed, then M-s o and finds occur open", () => {
    setDocument(app.view, OUTLINE_CHAPTER);
    const before = documentText(app.view);
    expect(pressAt(app.view, "M-s")).toBe(true);
    expect(documentText(app.view)).toBe(before);
    expect(document.querySelector(".palette")).toBeNull();
    pressAt(app.view, "o");
    expect(document.querySelector(".palette")?.getAttribute("data-pane-label")).toBe("M-s o");
    expect(documentText(app.view)).toBe(before);
  });
});
