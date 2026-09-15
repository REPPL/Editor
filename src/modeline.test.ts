/**
 * The trail through the chapter, and the cat at its head.
 *
 * What is under test is a measure and a quantisation, not a picture: the cell
 * is proven through `data-step`, the one number the trail's width, the cat's
 * offset and the accessible label are all derived from. If the step is right
 * the drawing is right, because there is nothing else for the drawing to read.
 *
 * jsdom has no layout, no colour and no media queries, so three things here are
 * asserted against the stylesheet's own text rather than against pixels: that
 * the cell is removed below 1280 and nowhere else, and nothing more. What 1280
 * looks like, whether the fill boundary survives greyscale, and what VoiceOver
 * says are manual checks M40-1, M40-3, M40-4 and M40-9.
 *
 * The footer's other announcement is the message cell, the one cell that
 * speaks (`iss-2609100647545513`). Nothing in jsdom reads a live region aloud,
 * so what is under test there is the same substitution: the region's role and
 * politeness, that it holds the message and nothing that moves with the caret,
 * and — through a `MutationObserver` — that it is written when the author is
 * told something and not written on the redraws in between. What a screen
 * reader actually says is M40-4.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp, type App, type AppServices } from "./app";
import type { Chapter, DocumentTree, Part } from "./doctree";
import { chapterProgress, createEditor, cursorPosition } from "./editor";
import { NO_REGION_TO_CHANGE } from "./emacs";
import { createModeline, TRAIL_STEPS, trailLabel, type Modeline } from "./modeline";

/** A chapter long enough that one drawn step is many characters. */
const LONG = "Alice writes a sentence, and then another one.\n".repeat(90);

/** The context every test here hands `update`; none of it is under test. */
const CONTEXT = {
  pane: "Editor",
  prefix: null,
  chapter: "01-alice.md",
  dirty: false,
  detached: false,
  message: "",
};

let host: HTMLElement;
let view: EditorView;
let modeline: Modeline;

/** The cell, as a caller reading the footer would find it. */
function progress(): HTMLElement {
  return modeline.element.querySelector<HTMLElement>(".modeline-progress")!;
}

/** The one cell of the footer that speaks as well as shows. */
function messageCell(): HTMLElement {
  return modeline.element.querySelector<HTMLElement>(".modeline-message")!;
}

/**
 * A refusal of ordinary length, read from the module that owns it.
 *
 * `C-x C-u`'s, because it is the message the author earns twice in a row by
 * pressing one chord twice with the mark unset (`iss-2609091920011632`).
 */
const REFUSAL = NO_REGION_TO_CHANGE;

/**
 * Whether the live region changed, as a screen reader would find out.
 *
 * Nothing in jsdom speaks, so what is provable here is the mutation the
 * announcement rests on: a live region that is not written is a live region
 * that says nothing, and one that is written says what it now holds. The
 * records are taken synchronously rather than awaited, so each read covers
 * exactly the calls since the last one.
 */
function watch(element: HTMLElement): { changed: () => boolean; stop: () => void } {
  const observer = new MutationObserver(() => {
    // Nothing: `takeRecords` is the reader.
  });
  observer.observe(element, { childList: true, characterData: true, subtree: true });
  return {
    changed: () => observer.takeRecords().length > 0,
    stop: () => {
      observer.disconnect();
    },
  };
}

/** The step the cell is drawn at. */
function step(): number {
  return Number(progress().dataset["step"]);
}

/** Put the caret at an absolute offset and redraw the footer. */
function place(at: number): void {
  view.dispatch({ selection: EditorSelection.cursor(at) });
  modeline.update(view, CONTEXT);
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  view = createEditor(host, LONG);
  modeline = createModeline();
  host.append(modeline.element);
  modeline.update(view, CONTEXT);
});

afterEach(() => {
  view.destroy();
  host.remove();
});

// --------------------------------------------------------------- the measure

describe("the measure", () => {
  it("reads the caret from the same field the line-and-column cell reads", () => {
    // A region running backwards up the chapter is the case that separates the
    // head from every other offset a cell could have chosen: the anchor is
    // below, `from` is above, and only the head is where the caret is drawn.
    const length = view.state.doc.length;
    view.dispatch({
      selection: EditorSelection.range(Math.round(length * 0.8), Math.round(length * 0.2)),
    });
    modeline.update(view, CONTEXT);

    const head = view.state.selection.main.head;
    expect(head).toBe(Math.round(length * 0.2));
    expect(chapterProgress(view)).toBeCloseTo(head / length, 12);
    expect(step()).toBe(Math.round((head / length) * TRAIL_STEPS));

    // And the footer's other answer to the same question agrees, which is the
    // whole point of reading one field: the cat and `L:C` cannot disagree.
    const { line, column } = cursorPosition(view);
    const headLine = view.state.doc.lineAt(head);
    expect(line).toBe(headLine.number);
    expect(column).toBe(head - headLine.from + 1);
  });

  it("draws the cat at the left end and no trail behind it with the caret at the start", () => {
    place(0);
    expect(step()).toBe(0);
    // `--at` is nought, so `.modeline-trail`'s `calc(100% * var(--at))` is a
    // width of nothing and the cat sits at its left inset.
    expect(progress().style.getPropertyValue("--at")).toBe("0");
  });

  it("fills the trail and puts the cat at the right end with the caret at the end", () => {
    place(view.state.doc.length);
    expect(step()).toBe(TRAIL_STEPS);
    expect(progress().style.getPropertyValue("--at")).toBe("1");
  });

  it("puts the cat within one drawn step of the caret's proportion", () => {
    const of = view.state.doc.length;
    for (let at = 0; at <= of; at += Math.max(1, Math.round(of / 10))) {
      place(at);
      expect(Math.abs(step() / TRAIL_STEPS - at / of)).toBeLessThanOrEqual(1 / TRAIL_STEPS);
    }
  });

  it("keeps the cat where it is when the view scrolls and the caret does not", () => {
    let changes = 0;
    const scrolled = createEditor(host, LONG, {
      onChange: () => {
        changes += 1;
      },
    });
    try {
      scrolled.dispatch({ selection: EditorSelection.cursor(Math.round(LONG.length / 4)) });
      modeline.update(scrolled, CONTEXT);
      const before = step();
      changes = 0;

      // A transaction carrying only a scroll effect sets no selection, so the
      // listener the footer redraws through is not called at all.
      scrolled.dispatch({ effects: EditorView.scrollIntoView(scrolled.state.doc.length) });
      expect(changes).toBe(0);
      expect(scrolled.state.selection.main.head).toBe(Math.round(LONG.length / 4));

      // And a redraw forced anyway lands on the same step, because the cell
      // reads the head and the length and no scroll changes either.
      modeline.update(scrolled, CONTEXT);
      expect(step()).toBe(before);
    } finally {
      scrolled.destroy();
    }
  });

  it("draws the cat at the start of an empty chapter and divides by nothing", () => {
    const empty = createEditor(host, "");
    try {
      expect(empty.state.doc.length).toBe(0);
      expect(chapterProgress(empty)).toBe(0);
      expect(Number.isFinite(chapterProgress(empty))).toBe(true);
      modeline.update(empty, CONTEXT);
      expect(step()).toBe(0);
      expect(progress().getAttribute("aria-label")).toBe("Start of the chapter");
    } finally {
      empty.destroy();
    }
  });
});

// ------------------------------------------------------------ what is heard

describe("what assistive technology hears", () => {
  it("labels the trail as a proportion in words", () => {
    expect(progress().getAttribute("role")).toBe("img");

    place(0);
    expect(progress().getAttribute("aria-label")).toBe("Start of the chapter");

    // The middle is a number, quantised to the drawn step, so the label cannot
    // say a proportion the bar is not drawn at.
    const length = view.state.doc.length;
    place(Math.round(length * 0.35));
    expect(progress().getAttribute("aria-label")).toBe("35 per cent through the chapter");

    place(length);
    expect(progress().getAttribute("aria-label")).toBe("End of the chapter");

    // Every step between the ends is a multiple of five, and neither end is
    // ever spelled as a percentage.
    for (let at = 1; at < TRAIL_STEPS; at += 1) {
      expect(trailLabel(at)).toBe(`${String(at * 5)} per cent through the chapter`);
    }
    expect(trailLabel(-1)).toBe("Start of the chapter");
    expect(trailLabel(TRAIL_STEPS + 1)).toBe("End of the chapter");
  });

  it("hides the cat and the trail from assistive technology", () => {
    const cell = progress();
    expect(cell.querySelector(".modeline-track")?.getAttribute("aria-hidden")).toBe("true");
    expect(cell.querySelector(".modeline-cat")?.getAttribute("aria-hidden")).toBe("true");
    // The one cell built without a tooltip: it stands for no action, so it has
    // no chord to name (cond-2609091733494632).
    expect(cell.getAttribute("title")).toBeNull();
    // Five shapes, inline, and no file fetched: two ears, a head, two eyes.
    const cat = cell.querySelector(".modeline-cat")!;
    expect(cat.querySelectorAll("path, circle")).toHaveLength(5);
    expect(cat.querySelector("image")).toBeNull();
  });
});

// ------------------------------------------------------ what is said out loud

describe("what the footer says out loud", () => {
  it("makes the message the live region, and no other cell", () => {
    const said = messageCell();
    expect(said.getAttribute("role")).toBe("status");
    // Written out rather than left to the role's implicit values, because this
    // cell's behaviour is load-bearing: `polite`, so a refusal the author has
    // just earned waits for the phrase being read rather than cutting across
    // it, and atomic, because a message is one sentence read as one.
    expect(said.getAttribute("aria-live")).toBe("polite");
    expect(said.getAttribute("aria-atomic")).toBe("true");

    // And nothing else in the footer is live. The pane, the chapter, `L:C` and
    // the trail all change under a moving caret, so a wider region would
    // recite the cursor's position on every keystroke — worse than silence.
    const live = modeline.element.querySelectorAll(
      "[aria-live], [role='status'], [role='alert'], [role='log'], [role='progressbar']",
    );
    expect(Array.from(live)).toEqual([said]);

    // The trail's own `aria-label` sits outside the region, not within it: it
    // is rewritten every time the drawn step changes, which is a caret move.
    expect(said.contains(progress())).toBe(false);
    expect(progress().getAttribute("aria-label")).toBe(trailLabel(0));
  });

  it("puts the message in the region and nothing else", () => {
    modeline.update(view, {
      ...CONTEXT,
      chapter: "01-alice.md",
      dirty: true,
      message: "Nowhere else to go",
      announcement: 1,
    });
    // Not the chapter, not the mark, not the position: what is heard is the
    // message, exactly as written.
    expect(messageCell().textContent).toBe("Nowhere else to go");
    expect(messageCell().children).toHaveLength(0);
  });

  it("leaves the region alone while the caret moves under a standing message", () => {
    const standing = { ...CONTEXT, message: REFUSAL, announcement: 1 };
    modeline.update(view, standing);
    expect(messageCell().textContent).toBe(REFUSAL);

    const region = watch(messageCell());
    try {
      // Twenty caret moves, each redrawing the footer with the same message,
      // because that is what `refresh()` does on every keystroke. A live region
      // written on each of them would say the last refusal twenty more times.
      for (let at = 1; at <= 20; at += 1) {
        view.dispatch({ selection: EditorSelection.cursor(at) });
        modeline.update(view, standing);
      }
      expect(region.changed()).toBe(false);
      expect(messageCell().textContent).toBe(REFUSAL);

      // And the silence is the guard's and not the observer's: the next thing
      // said does reach the region.
      modeline.update(view, { ...standing, message: "Wrote it", announcement: 2 });
      expect(region.changed()).toBe(true);
    } finally {
      region.stop();
    }
  });

  it("says the same words again when the author earns them again", () => {
    modeline.update(view, { ...CONTEXT, message: REFUSAL, announcement: 1 });
    const region = watch(messageCell());
    try {
      // The same refusal, a second time: `C-x C-u` pressed twice with no
      // region. The words are identical, so a cell written by assigning the
      // string it already holds would be entitled to change nothing at all,
      // and a region that does not change is a region that says nothing. The
      // count is what says this is a second refusal and not a redraw.
      modeline.update(view, { ...CONTEXT, message: REFUSAL, announcement: 2 });
      expect(region.changed()).toBe(true);
      expect(messageCell().textContent).toBe(REFUSAL);

      // A third time, for the same reason.
      modeline.update(view, { ...CONTEXT, message: REFUSAL, announcement: 3 });
      expect(region.changed()).toBe(true);
    } finally {
      region.stop();
    }
  });

  it("says nothing when a message is cleared to nothing", () => {
    modeline.update(view, { ...CONTEXT, message: REFUSAL, announcement: 1 });
    modeline.update(view, { ...CONTEXT, message: "", announcement: 2 });
    // An empty cell and not an empty text node: there is nothing to read, so
    // the region holds nothing to read.
    expect(messageCell().textContent).toBe("");
    expect(messageCell().childNodes).toHaveLength(0);
  });
});

// ------------------------------------------------ the cells that must survive

describe("the footer around it", () => {
  it("keeps every cell the footer already carries, in order", () => {
    const classes = Array.from(
      modeline.element.children,
      (child) => Array.from(child.classList).find((name) => name !== "modeline-cell") ?? "",
    );
    expect(classes).toEqual([
      "modeline-pane",
      "modeline-chapter",
      "modeline-position",
      "modeline-progress",
      "modeline-prefix",
      "modeline-mark",
      "modeline-keymap",
      "modeline-message",
    ]);

    modeline.update(view, { ...CONTEXT, prefix: "C-x", dirty: true, message: "Wrote it" });
    const cellText = (name: string): string =>
      modeline.element.querySelector(`.${name}`)?.textContent ?? "";
    expect(cellText("modeline-pane")).toBe("[Editor]");
    expect(cellText("modeline-chapter")).toBe("** 01-alice.md");
    expect(cellText("modeline-position")).toBe("L1:C1");
    expect(cellText("modeline-prefix")).toBe("C-x-");
    expect(cellText("modeline-keymap")).toBe("");
    expect(cellText("modeline-message")).toBe("Wrote it");
    // The cell draws no number of its own: the proportion is in the label and
    // nowhere on the screen.
    expect(cellText("modeline-progress")).toBe("");
  });

  it("hides the cell below 1280 and nowhere else", () => {
    const css = readFileSync(join(__dirname, "style.css"), "utf8");
    const queries = css.match(/@media \(max-width: 1279px\) \{[^@]*?\n\}/g) ?? [];
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain(".modeline-progress");
    expect(queries[0]).toContain("display: none;");
    // Below 1280 the drawing and the label go together, so the block holds one
    // rule and one declaration and nothing stands in for the trail
    // (cond-2609100513433908).
    expect(queries[0]?.match(/\{/g)).toHaveLength(2);
    expect(queries[0]?.match(/:/g)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------- the cost

describe("the cost", () => {
  it("writes nothing to the cell when the caret moves inside one drawn step", () => {
    const cell = progress();
    place(0);
    const attributes = vi.spyOn(cell, "setAttribute");
    const properties = vi.spyOn(cell.style, "setProperty");
    try {
      // One step of this chapter is a great many characters, so a run of
      // single-character moves stays inside the step the cell is drawn at.
      const inside = Math.floor(view.state.doc.length / TRAIL_STEPS / 4);
      expect(inside).toBeGreaterThan(20);
      for (let at = 1; at <= 20; at += 1) place(at);
      expect(step()).toBe(0);
      expect(attributes).not.toHaveBeenCalled();
      expect(properties).not.toHaveBeenCalled();

      // And the silence is the guard's and not the spies': a move that does
      // change the step writes, so this test fails if the guard stops guarding
      // and equally if it starts refusing.
      place(view.state.doc.length);
      expect(step()).toBe(TRAIL_STEPS);
      expect(properties).toHaveBeenCalledTimes(1);
      expect(attributes).toHaveBeenCalledTimes(1);
    } finally {
      attributes.mockRestore();
      properties.mockRestore();
    }
  });
});

// ------------------------------------------------------- through the real app

/** A one-chapter document, so the application has something to open. */
function chapter(name: string, path: string, title: string): Chapter {
  return { name, title, path, order: 1, bytes: 0, modified: null };
}

function tree(chapters: Chapter[]): DocumentTree {
  const root: Part = {
    name: "book",
    title: "book",
    path: "book",
    order: null,
    parts: [],
    chapters,
    truncated: false,
  };
  return { root, failures: [] };
}

describe("through the application", () => {
  const chapters = [chapter("01-alice.md", "book/01-alice.md", "alice")];
  const services: AppServices = {
    chooseFolder: () => Promise.resolve("book"),
    openFolder: () => Promise.resolve(tree(chapters)),
    readChapter: () => Promise.resolve(LONG),
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
    app.destroy();
    appHost.remove();
  });

  it("moves the cat in the same redraw as the caret, with no timer advanced", async () => {
    await app.openFolder("book");
    await app.openChapter(chapters[0]!);
    const cell = app.modeline.element.querySelector<HTMLElement>(".modeline-progress")!;
    expect(cell.dataset["step"]).toBe("0");

    // `C-End`, the table's end-of-document chord. Nothing is awaited, no timer
    // is advanced and no microtask is flushed between the keystroke and the
    // read: the path is `src/editor.ts`'s `updateListener` on `selectionSet`,
    // `src/app.ts`'s `onChange`, and `refresh()`, all synchronous inside
    // `EditorView.update`.
    const event = new KeyboardEvent("keydown", {
      key: "End",
      code: "End",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    app.view.contentDOM.dispatchEvent(event);

    expect(app.view.state.selection.main.head).toBe(app.view.state.doc.length);
    expect(cell.dataset["step"]).toBe(String(TRAIL_STEPS));
    expect(cell.getAttribute("aria-label")).toBe("End of the chapter");
  });

  it("names the focused window and how many there are once the area is divided", async () => {
    await app.openFolder("book");
    await app.openChapter(chapters[0]!);
    const pane = app.modeline.element.querySelector<HTMLElement>(".modeline-pane")!;
    // One window: exactly what one window has always read.
    expect(pane.textContent).toBe("[Editor]");
    expect(pane.dataset["pane"]).toBe("Editor");
    expect(pane.dataset["window"]).toBeUndefined();

    // Divided, the cell says which of how many. The ordinal is in reading
    // order, and it is what `C-x o` moves.
    app.modeline.update(app.view, {
      ...CONTEXT,
      window: { at: 2, of: 4 },
    });
    expect(pane.textContent).toBe("[Editor 2/4]");
    expect(pane.dataset["pane"]).toBe("Editor");
    expect(pane.dataset["window"]).toBe("2/4");

    // Back to one window, and the addition is invisible again.
    app.modeline.update(app.view, { ...CONTEXT, window: { at: 1, of: 1 } });
    expect(pane.textContent).toBe("[Editor]");
    expect(pane.dataset["window"]).toBeUndefined();
  });

  it("names the focused window", async () => {
    // The footer's half of "the focused window is discoverable without sight":
    // the cell is read where Alice is already reading for the unsaved mark and
    // her position, and it names the window rather than the chapter, because the
    // chapter is the very next cell along.
    await app.openFolder("book");
    await app.openChapter(chapters[0]!);
    const pane = app.modeline.element.querySelector<HTMLElement>(".modeline-pane")!;
    const chapterCell = app.modeline.element.querySelector<HTMLElement>(
      ".modeline-chapter",
    )!;
    app.modeline.update(app.view, { ...CONTEXT, window: { at: 3, of: 3 } });
    expect(pane.textContent).toBe("[Editor 3/3]");
    // Two cells, two questions: the window's ordinal is not the chapter's name.
    expect(chapterCell.textContent).toContain("01-alice.md");
    expect(pane.textContent).not.toContain("alice");
    // And the cell is not a live region: it changes on every `C-x o`, which is
    // a move Alice made, and what she needs announced is the region she
    // arrived in.
    expect(pane.hasAttribute("aria-live")).toBe(false);
    expect(pane.getAttribute("role")).toBeNull();
  });

  it("announces a refusal twice when the author earns it twice", async () => {
    await app.openFolder("book");
    await app.openChapter(chapters[0]!);
    const said = app.modeline.element.querySelector<HTMLElement>(".modeline-message")!;
    expect(said.getAttribute("role")).toBe("status");

    app.announce(REFUSAL);
    expect(said.textContent).toBe(REFUSAL);

    const region = watch(said);
    try {
      // A caret move between the two refusals. It redraws the whole footer,
      // carrying the message that is still standing, and that redraw is not a
      // second announcement of it.
      app.view.dispatch({ selection: EditorSelection.cursor(4) });
      expect(region.changed()).toBe(false);

      // The second refusal is the author's own and is heard as its own, with
      // nothing said in between to make the words new.
      app.announce(REFUSAL);
      expect(region.changed()).toBe(true);
      expect(said.textContent).toBe(REFUSAL);
    } finally {
      region.stop();
    }
  });
});
