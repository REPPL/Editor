/**
 * The document: the five-level sidebar, the reload, and the drop.
 *
 * The shell is stubbed, because what is being tested is the page's half of
 * each promise: that the tree draws in the order the walk gives it, that a
 * chapter is labelled by its own level-one heading, that a heading opens the
 * chapter at its line, that a change reported by the shell redraws without the
 * author reopening anything, and that a drop reaches the Part under the
 * pointer and nothing else.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp, type App, type AppServices } from "./app";
import { outlineOf } from "./core/outline";
import { parseChapter } from "./core/parse";
import type {
  Chapter,
  ChapterBatch,
  DocumentTree,
  DropPayload,
  Part,
} from "./doctree";
import { createDropRouter, type DropTargets } from "./drop";
import { TRAIL_STEPS } from "./modeline";
import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { runBinding } from "./emacs";

/** A chapter with a level-one heading and three levels below it. */
const ALICE = [
  "# Alice and the Lantern",
  "",
  "An opening paragraph.",
  "",
  "## The first section",
  "",
  "### A sub-section",
  "",
  "#### A sub-sub-section",
  "",
  "Text.",
  "",
  "## Interlude {.divider}",
  "",
  "```",
  "## Not a heading at all",
  "```",
  "",
].join("\n");

/** A chapter with no level-one heading, so its filename is its label. */
const BOB = ["Just a paragraph, and no heading.", ""].join("\n");

/**
 * A chapter whose pipe table is ragged enough that alignment is a real change.
 *
 * `alignTables()` is the one extension on the surface that writes a document
 * change the author did not type, and the canary below is about what happens to
 * that change when two windows show this chapter.
 */
const TABLE = [
  "# The lantern counts",
  "",
  "| Winter | Count |",
  "|---|---|",
  "| 1996 | 3 |",
  "| 1997 | 11 |",
  "",
].join("\n");

/**
 * A chapter tall enough to divide above and below under the test harness.
 *
 * `src/test-setup.ts` fakes a monospace grid rather than measuring nothing, so
 * a window measures 800 by sixteen pixels a line — which means `mayDivide` is
 * genuinely consulted here, and a chapter shorter than
 * `2 × MIN_WINDOW_HEIGHT + DIVIDER_PX` refuses `C-x 2` exactly as a short frame
 * would. Thirty lines is 480, which clears it; `ALICE` is eighteen lines and
 * does not, which is what the refusal test below reads.
 */
const TALL = [
  "# A long chapter",
  "",
  ...Array.from({ length: 27 }, (_, line) => `Line ${String(line + 1)}.`),
  "",
].join("\n");

function chapter(name: string, path: string, title: string): Chapter {
  const order = /^(\d+)/.exec(name);
  return {
    name,
    title,
    path,
    order: order ? Number(order[1]) : null,
    bytes: 0,
    modified: null,
  };
}

function part(
  name: string,
  path: string,
  title: string,
  chapters: Chapter[],
  parts: Part[] = [],
): Part {
  const order = /^(\d+)/.exec(name);
  return {
    name,
    title,
    path,
    order: order ? Number(order[1]) : null,
    parts,
    chapters,
    truncated: false,
  };
}

/** The two-Part document most of these tests read. */
function twoParts(): DocumentTree {
  return {
    root: part("book", "book", "book", [], [
      part("01-first", "book/01-first", "first", [
        chapter("01-alice.md", "book/01-first/01-alice.md", "alice"),
      ]),
      part("02-second", "book/02-second", "second", [
        chapter("01-bob.md", "book/02-second/01-bob.md", "bob"),
      ]),
    ]),
    failures: [],
  };
}

/** A document whose root holds one chapter and no Part. */
function oneChapter(): DocumentTree {
  return {
    root: part("solo", "solo", "solo", [
      chapter("01-alice.md", "solo/01-alice.md", "alice"),
    ]),
    failures: [],
  };
}

let host: HTMLElement;
let app: App;
let trees: Map<string, DocumentTree>;
let texts: Map<string, string>;
let written: { path: string; text: string }[];
let discardAnswer: boolean;
let discardQuestions: string[];
let added: { part: string; nonce: string }[];
let addResult: readonly Chapter[] | Error;

const services: AppServices = {
  chooseFolder: () => Promise.resolve("book"),
  openFolder: (path) => {
    const tree = trees.get(path);
    return tree
      ? Promise.resolve(tree)
      : Promise.reject(new Error(`${path} is not a folder`));
  },
  readChapter: (path) => {
    const text = texts.get(path);
    return text === undefined
      ? Promise.reject(new Error(`cannot read ${path}`))
      : Promise.resolve(text);
  },
  readChapters: (paths) => {
    const batch: ChapterBatch = {
      reads: paths
        .filter((path) => texts.has(path))
        .map((path) => ({ path, text: texts.get(path)! })),
      failures: paths
        .filter((path) => !texts.has(path))
        .map((path) => `cannot read ${path}`),
    };
    return Promise.resolve(batch);
  },
  writeChapter: (path, text) => {
    written.push({ path, text });
    return Promise.resolve();
  },
  addChapter: (partPath, nonce) => {
    added.push({ part: partPath, nonce });
    return addResult instanceof Error
      ? Promise.reject(addResult)
      : Promise.resolve(addResult);
  },
  confirmDiscard: (question) => {
    discardQuestions.push(question);
    return Promise.resolve(discardAnswer);
  },
};

beforeEach(() => {
  trees = new Map([
    ["book", twoParts()],
    ["solo", oneChapter()],
    ["empty", { root: part("empty", "empty", "empty", []), failures: [] }],
    [
      "table",
      {
        root: part("table", "table", "table", [
          chapter("01-counts.md", "table/01-counts.md", "counts"),
        ]),
        failures: [],
      },
    ],
    [
      "tall",
      {
        root: part("tall", "tall", "tall", [
          chapter("01-long.md", "tall/01-long.md", "long"),
        ]),
        failures: [],
      },
    ],
  ]);
  texts = new Map([
    ["book/01-first/01-alice.md", ALICE],
    ["book/02-second/01-bob.md", BOB],
    ["solo/01-alice.md", ALICE],
    ["table/01-counts.md", TABLE],
    ["tall/01-long.md", TALL],
  ]);
  written = [];
  discardAnswer = true;
  discardQuestions = [];
  added = [];
  addResult = [];
  host = document.createElement("div");
  document.body.append(host);
  app = createApp(host, services);
});

afterEach(() => {
  app.destroy();
  host.remove();
});

/** Every visible tree row's text, in the order it is drawn. */
function rows(): string[] {
  return Array.from(
    host.querySelectorAll<HTMLElement>(".tree-part-label, .tree-button"),
    (row) => row.textContent ?? "",
  );
}

/** Open every row, as clicking each twisty would. */
function expandAll(): void {
  for (let pass = 0; pass < 6; pass += 1) {
    const closed = host.querySelectorAll<HTMLElement>(
      '.tree-twisty[aria-expanded="false"]',
    );
    if (closed.length === 0) return;
    for (const twisty of closed) twisty.click();
  }
}

describe("the sidebar", () => {
  it("lists Parts and Chapters in prefix order and labels a Chapter with its level-one heading", async () => {
    await app.openFolder("book");
    // The label is the chapter's own `#` heading, not the filename-derived
    // title the walk computed; a chapter with no heading keeps that fallback.
    expect(rows()).toEqual([
      "first",
      "Alice and the Lantern",
      "second",
      "bob",
    ]);
  });

  it("nests Sections, Sub-sections, and Sub-sub-sections in source order", async () => {
    await app.openFolder("book");
    expandAll();
    expect(rows()).toEqual([
      "first",
      "Alice and the Lantern",
      "The first section",
      "A sub-section",
      "A sub-sub-section",
      "Interlude",
      "second",
      "bob",
    ]);
    // The heading inside the fenced code block is not a Section, because
    // markdown-it never made it one.
    expect(rows()).not.toContain("Not a heading at all");
  });

  it("gives every row an empty badge slot and no badge", async () => {
    await app.openFolder("book");
    expandAll();
    const slots = host.querySelectorAll(".tree-badges");
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) expect(slot.childElementCount).toBe(0);
  });

  it("opens a chapter at the heading a sidebar node names", async () => {
    await app.openFolder("book");
    expandAll();
    const node = host.querySelector<HTMLButtonElement>(
      '.tree-heading-button[data-line="9"]',
    );
    expect(node?.textContent).toBe("A sub-sub-section");
    node?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(app.view.state.doc.toString()).toBe(ALICE);
    const head = app.view.state.selection.main.head;
    const line = app.view.state.doc.lineAt(head);
    expect(line.number).toBe(9);
    expect(line.text).toBe("#### A sub-sub-section");
    expect(head).toBe(line.from);
  });

  it("moves to another heading of the chapter already open without reloading it", async () => {
    await app.openFolder("book");
    expandAll();
    host.querySelector<HTMLButtonElement>(".tree-button")?.click();
    await Promise.resolve();
    await Promise.resolve();
    // An unsaved edit must survive a move within the same chapter.
    app.view.dispatch({ changes: { from: 0, insert: "x" } });
    expect(app.dirty).toBe(true);

    host
      .querySelector<HTMLButtonElement>('.tree-heading-button[data-line="5"]')
      ?.click();
    await Promise.resolve();
    expect(app.dirty).toBe(true);
    expect(discardQuestions).toEqual([]);
    expect(app.view.state.doc.lineAt(app.view.state.selection.main.head).number)
      .toBe(5);
  });

  it("restores the cursor to where it was left when a chapter is opened again (itd-2609061318091323 AC8)", async () => {
    await app.openFolder("book");
    const alice = app.chapters.find(
      (chapter) => chapter.path === "book/01-first/01-alice.md",
    )!;
    const bob = app.chapters.find(
      (chapter) => chapter.path === "book/02-second/01-bob.md",
    )!;
    await app.openChapter(alice);
    app.view.dispatch({ selection: { anchor: 5 } });

    await app.openChapter(bob);
    expect(app.view.state.selection.main.head).toBe(0);

    await app.openChapter(alice);
    expect(app.view.state.selection.main.head).toBe(5);
  });

  it("shows the newly opened chapter's progress, not the one before it", async () => {
    await app.openFolder("book");
    const alice = app.chapters.find(
      (chapter) => chapter.path === "book/01-first/01-alice.md",
    )!;
    const bob = app.chapters.find(
      (chapter) => chapter.path === "book/02-second/01-bob.md",
    )!;
    const cell = app.modeline.element.querySelector<HTMLElement>(".modeline-progress")!;

    await app.openChapter(alice);
    const aliceLength = app.view.state.doc.length;
    app.view.dispatch({ selection: { anchor: aliceLength } });
    expect(cell.dataset["step"]).toBe(String(TRAIL_STEPS));

    // The pin. `setDocument` swaps the whole state with `view.setState`, which
    // builds no `ViewUpdate` and runs no update listener at all, so nothing on
    // the caret's own redraw path fires on a chapter switch. What redraws the
    // footer here is `openChapter`'s own `announce("")` — which is there to
    // clear a message, not to move a cat. If that is ever refactored away this
    // assertion fails, rather than the footer quietly keeping the previous
    // chapter's step.
    await app.openChapter(bob);
    expect(app.view.state.selection.main.head).toBe(0);
    expect(cell.dataset["step"]).toBe("0");
    expect(cell.getAttribute("aria-label")).toBe("Start of the chapter");

    // And the length is the new chapter's too, not the old one's: Bob is far
    // shorter than Alice, so the same offset is a different proportion of it.
    const bobLength = app.view.state.doc.length;
    expect(bobLength).toBeLessThan(aliceLength / 4);
    const half = Math.round(bobLength / 2);
    app.view.dispatch({ selection: { anchor: half } });
    expect(cell.dataset["step"]).toBe(String(Math.round((half / bobLength) * TRAIL_STEPS)));
    expect(Number(cell.dataset["step"])).toBeGreaterThan(
      Math.round((half / aliceLength) * TRAIL_STEPS),
    );
  });

  it("shows a one-Part, one-chapter document with no empty rows", async () => {
    await app.openFolder("solo");
    expect(rows()).toEqual(["Alice and the Lantern"]);
    expect(host.querySelectorAll(".tree-part-label").length).toBe(0);
    expect(host.querySelector(".sidebar-empty")).toBeNull();
  });

  it("reports a folder that holds no chapters", async () => {
    await app.openFolder("empty");
    expect(host.querySelector(".sidebar-empty")?.textContent).toContain(
      "holds no Markdown chapters",
    );
    expect(app.modeline.element.textContent).toContain(
      "holds no Markdown chapters",
    );
    expect(written).toEqual([]);
  });

  it("opens and closes the drawer on toggle-sidebar", async () => {
    await app.openFolder("book");
    expect(app.sidebar.element.dataset["open"]).toBe("yes");
    app.sidebar.toggle();
    expect(app.sidebar.element.dataset["open"]).toBe("no");
    app.sidebar.toggle();
    expect(app.sidebar.element.dataset["open"]).toBe("yes");
  });
});

describe("reloading", () => {
  it("redraws the tree when the shell reports a change", async () => {
    await app.openFolder("book");
    expandAll();
    const before = app.sidebar.expansion();
    expect(rows()).toContain("A sub-section");

    // A Finder rename: the file moves, nothing is reopened.
    trees.set("book", {
      root: part("book", "book", "book", [], [
        part("01-first", "book/01-first", "first", [
          chapter("03-alice.md", "book/01-first/03-alice.md", "alice"),
        ]),
        part("02-second", "book/02-second", "second", [
          chapter("01-bob.md", "book/02-second/01-bob.md", "bob"),
        ]),
      ]),
      failures: [],
    });
    texts.set("book/01-first/03-alice.md", ALICE);

    await app.reload();

    expect(
      host.querySelector<HTMLButtonElement>(".tree-button")?.dataset["path"],
    ).toBe("book/01-first/03-alice.md");
    // The expansion the author had is the expansion she keeps.
    expect(app.sidebar.expansion()).toEqual(before);
    expect(written).toEqual([]);
  });

  it("takes the text from disk when the buffer is clean", async () => {
    await app.openFolder("book");
    await app.openChapter(
      chapter("01-alice.md", "book/01-first/01-alice.md", "alice"),
    );
    texts.set("book/01-first/01-alice.md", "# Alice, revised\n");

    await app.reload();
    expect(app.view.state.doc.toString()).toBe("# Alice, revised\n");
    expect(app.dirty).toBe(false);
    expect(app.modeline.element.textContent).toContain("changed on disk");
  });

  it("asks which text to keep when the buffer is dirty, and writes neither", async () => {
    await app.openFolder("book");
    await app.openChapter(
      chapter("01-alice.md", "book/01-first/01-alice.md", "alice"),
    );
    app.view.dispatch({ changes: { from: 0, insert: "Mine. " } });
    texts.set("book/01-first/01-alice.md", "# Theirs\n");
    discardAnswer = false;

    await app.reload();
    expect(discardQuestions[0]).toContain("changed on disk");
    expect(app.view.state.doc.toString()).toContain("Mine. ");
    expect(app.dirty).toBe(true);
    expect(written).toEqual([]);
  });

  it("marks a chapter detached when its file has gone, and refuses the save", async () => {
    await app.openFolder("book");
    await app.openChapter(
      chapter("01-alice.md", "book/01-first/01-alice.md", "alice"),
    );
    trees.set("book", {
      root: part("book", "book", "book", [], [
        part("01-first", "book/01-first", "first", []),
        part("02-second", "book/02-second", "second", [
          chapter("01-bob.md", "book/02-second/01-bob.md", "bob"),
        ]),
      ]),
      failures: [],
    });
    texts.delete("book/01-first/01-alice.md");

    await app.reload();
    expect(app.detached).toBe(true);
    expect(app.view.state.doc.toString()).toBe(ALICE);
    expect(app.modeline.element.textContent).toContain("no longer on disk");

    await app.save();
    expect(written).toEqual([]);
    expect(app.modeline.element.textContent).toContain("01-alice.md");
  });

  it("reads every chapter in one round trip", async () => {
    const paths: string[][] = [];
    const counting: AppServices = {
      ...services,
      readChapters: (asked) => {
        paths.push([...asked]);
        return services.readChapters!(asked);
      },
    };
    const scratch = document.createElement("div");
    document.body.append(scratch);
    const other = createApp(scratch, counting);
    await other.openFolder("book");
    expect(paths).toEqual([
      ["book/01-first/01-alice.md", "book/02-second/01-bob.md"],
    ]);
    other.destroy();
    scratch.remove();
  });
});

describe("the drop router", () => {
  /** Point `elementFromPoint` at one element, as a real pointer would. */
  function pointAt(element: Element | null): () => void {
    const original = document.elementFromPoint;
    document.elementFromPoint = () => element;
    return () => {
      document.elementFromPoint = original;
    };
  }

  const payload: DropPayload = { nonce: "abc", x: 10, y: 20, count: 1 };

  it("routes a sidebar drop to the Part under the pointer", async () => {
    await app.openFolder("book");
    const partRow = host.querySelector<HTMLElement>(
      '[data-part-path="book/02-second"]',
    );
    expect(partRow).not.toBeNull();
    const restore = pointAt(partRow);
    addResult = [chapter("02-carol.md", "book/02-second/02-carol.md", "carol")];
    app.drop.route(payload);
    restore();
    await Promise.resolve();
    await Promise.resolve();

    expect(added).toEqual([{ part: "book/02-second", nonce: "abc" }]);
  });

  it("says what a Part accepts and writes nothing", async () => {
    await app.openFolder("book");
    const partRow = host.querySelector<HTMLElement>(
      '[data-part-path="book/01-first"]',
    );
    const restore = pointAt(partRow);
    addResult = new Error(
      "lantern.jpg is not a Markdown chapter; a Part takes .md and .markdown files",
    );
    app.drop.route(payload);
    restore();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(app.modeline.element.textContent).toContain("not a Markdown chapter");
    expect(app.modeline.element.textContent).toContain(".markdown");
    expect(written).toEqual([]);
  });

  it("hands the editing surface nothing until the drop spec fills the hook", () => {
    const seen: string[] = [];
    const targets: DropTargets = {
      onPart: () => seen.push("part"),
      onRefused: (message) => seen.push(message),
    };
    const router = createDropRouter(targets);
    const surface = document.createElement("div");
    surface.className = "cm-editor";
    document.body.append(surface);
    const original = document.elementFromPoint;
    document.elementFromPoint = () => surface;
    router.route(payload);
    document.elementFromPoint = original;
    surface.remove();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("does not take a dropped file");
  });

  it("routes to the editing surface once the hook is filled", () => {
    const seen: DropPayload[] = [];
    const targets: DropTargets = {
      onPart: () => {},
      onText: (received) => seen.push(received),
      onRefused: () => {},
    };
    const router = createDropRouter(targets);
    const surface = document.createElement("div");
    surface.className = "cm-editor";
    document.body.append(surface);
    const original = document.elementFromPoint;
    document.elementFromPoint = () => surface;
    router.route(payload);
    document.elementFromPoint = original;
    surface.remove();

    expect(seen).toEqual([payload]);
  });

  it("refuses a drop on anything else and names what each target takes", () => {
    const seen: string[] = [];
    const router = createDropRouter({
      onPart: () => seen.push("part"),
      onRefused: (message) => seen.push(message),
    });
    const original = document.elementFromPoint;
    document.elementFromPoint = () => null;
    router.route(payload);
    document.elementFromPoint = original;

    expect(seen[0]).toContain("A Part in the sidebar takes a Markdown chapter");
    expect(seen[0]).toContain("the editing surface takes an image");
  });
});

describe("the network", () => {
  it("attempts no network request while a document is open", async () => {
    const attempts: string[] = [];
    const originalFetch = globalThis.fetch;
    const originalXhr = globalThis.XMLHttpRequest;
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

    try {
      await app.openFolder("book");
      expandAll();
      for (const button of host.querySelectorAll<HTMLButtonElement>(
        ".tree-button",
      )) {
        button.click();
        await Promise.resolve();
        await Promise.resolve();
      }
      await app.reload();
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.XMLHttpRequest = originalXhr;
    }

    expect(attempts).toEqual([]);
  });
});

describe("the outline the sidebar draws", () => {
  it("ignores a heading inside a fenced code block", () => {
    const outline = outlineOf(parseChapter(ALICE));
    const labels = outline.nodes.map((node) => node.label);
    expect(labels).toEqual(["The first section", "Interlude"]);
    expect(outline.title).toBe("Alice and the Lantern");
  });

  it("labels a chapter with no level-one heading by its filename title", async () => {
    await app.openFolder("book");
    const bob = Array.from(
      host.querySelectorAll<HTMLButtonElement>(".tree-button"),
    ).find((button) => button.dataset["path"] === "book/02-second/01-bob.md");
    expect(bob?.textContent).toBe("bob");
  });
});

describe("the sidebar's citation facts (itd-2609051335502171, map #11)", () => {
  it("lists a chapter's unresolved citation keys, from the shell's own bibliography read", async () => {
    const citingText = "# Citing\n\nAs shown [@nosuchkey].\n";
    const citingTexts = new Map(texts);
    citingTexts.set("book/01-first/01-alice.md", citingText);
    const withBibliography: AppServices = {
      ...services,
      readChapter: (path) => {
        const text = citingTexts.get(path);
        return text === undefined
          ? Promise.reject(new Error(`cannot read ${path}`))
          : Promise.resolve(text);
      },
      readChapters: (paths) => {
        const batch: ChapterBatch = {
          reads: paths
            .filter((path) => citingTexts.has(path))
            .map((path) => ({ path, text: citingTexts.get(path)! })),
          failures: [],
        };
        return Promise.resolve(batch);
      },
      readBibliography: () => Promise.resolve(""),
    };
    app.destroy();
    app = createApp(host, withBibliography);
    await app.openFolder("book");
    expandAll();
    const badge = host.querySelector(".tree-badge-citation");
    expect(badge?.textContent).toBe("1 citation");
    expect(badge?.getAttribute("title")).toContain("nosuchkey");
  });

  it("lists nothing when the shell offers no bibliography read at all", async () => {
    const citingText = "# Citing\n\nAs shown [@nosuchkey].\n";
    const citingTexts = new Map(texts);
    citingTexts.set("book/01-first/01-alice.md", citingText);
    const withoutBibliography: AppServices = {
      ...services,
      readChapter: (path) => {
        const text = citingTexts.get(path);
        return text === undefined
          ? Promise.reject(new Error(`cannot read ${path}`))
          : Promise.resolve(text);
      },
      readChapters: (paths) => {
        const batch: ChapterBatch = {
          reads: paths
            .filter((path) => citingTexts.has(path))
            .map((path) => ({ path, text: citingTexts.get(path)! })),
          failures: [],
        };
        return Promise.resolve(batch);
      },
    };
    app.destroy();
    app = createApp(host, withoutBibliography);
    await app.openFolder("book");
    expandAll();
    // No `readBibliography` service at all is the phase before this map: the
    // citation still resolves to nothing, since there is nothing to resolve
    // it against, but nothing here throws over its absence.
    expect(host.querySelector(".tree-badge-citation")?.textContent).toBe("1 citation");
  });

  it("says the bibliography could not be read, and badges no key unresolved on its account (Fable F10)", async () => {
    const citingText = "# Citing\n\nAs shown [@nosuchkey].\n";
    const citingTexts = new Map(texts);
    citingTexts.set("book/01-first/01-alice.md", citingText);
    const unreadableBibliography: AppServices = {
      ...services,
      readChapter: (path) => {
        const text = citingTexts.get(path);
        return text === undefined
          ? Promise.reject(new Error(`cannot read ${path}`))
          : Promise.resolve(text);
      },
      readChapters: (paths) => {
        const batch: ChapterBatch = {
          reads: paths
            .filter((path) => citingTexts.has(path))
            .map((path) => ({ path, text: citingTexts.get(path)! })),
          failures: [],
        };
        return Promise.resolve(batch);
      },
      readBibliography: () => Promise.reject(new Error("permission denied")),
    };
    app.destroy();
    app = createApp(host, unreadableBibliography);
    await app.openFolder("book");
    expandAll();
    // The read failed, not the key: nothing is badged unresolved on its
    // account, unlike the case above where the same key is genuinely
    // unresolved against a bibliography that reads back empty.
    expect(host.querySelector(".tree-badge-citation")).toBeNull();
    expect(app.modeline.element.textContent).toContain("bibliography unreadable");
    expect(app.modeline.element.textContent).toContain("permission denied");
  });
});

describe("the sidebar's hidden-construct facts (itd-2609051335518134, map #12)", () => {
  it("lists an orphan egg marker against the chapter that carries it", async () => {
    const markedText = 'A word[✦]{.egg egg="lantern"} follows.\n';
    const markedTexts = new Map(texts);
    markedTexts.set("book/01-first/01-alice.md", markedText);
    const withMarker: AppServices = {
      ...services,
      readChapter: (path) => {
        const text = markedTexts.get(path);
        return text === undefined
          ? Promise.reject(new Error(`cannot read ${path}`))
          : Promise.resolve(text);
      },
      readChapters: (paths) => {
        const batch: ChapterBatch = {
          reads: paths
            .filter((path) => markedTexts.has(path))
            .map((path) => ({ path, text: markedTexts.get(path)! })),
          failures: [],
        };
        return Promise.resolve(batch);
      },
    };
    app.destroy();
    app = createApp(host, withMarker);
    await app.openFolder("book");
    expandAll();
    const badge = host.querySelector(".tree-badge-egg");
    expect(badge?.textContent).toBe("1 hidden mark");
    expect(badge?.getAttribute("title")).toContain("lantern");
  });

  it("lists a misplaced opening against the chapter that is not the document's first", async () => {
    const misplacedText = '::: {.opening once="per-browser"}\n> Too late.\n:::\n';
    const misplacedTexts = new Map(texts);
    misplacedTexts.set("book/02-second/01-bob.md", misplacedText);
    const withMisplaced: AppServices = {
      ...services,
      readChapter: (path) => {
        const text = misplacedTexts.get(path);
        return text === undefined
          ? Promise.reject(new Error(`cannot read ${path}`))
          : Promise.resolve(text);
      },
      readChapters: (paths) => {
        const batch: ChapterBatch = {
          reads: paths
            .filter((path) => misplacedTexts.has(path))
            .map((path) => ({ path, text: misplacedTexts.get(path)! })),
          failures: [],
        };
        return Promise.resolve(batch);
      },
    };
    app.destroy();
    app = createApp(host, withMisplaced);
    await app.openFolder("book");
    expandAll();
    const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>(".tree-button"));
    const bobRow = buttons
      .find((button) => button.dataset["path"] === "book/02-second/01-bob.md")
      ?.closest(".tree-row");
    expect(bobRow?.querySelector(".tree-badge-egg")?.textContent).toBe("1 hidden mark");
  });
});

// ------------------------------------------------- the divided editing area

/** The pieces of a keydown event one chord step arrives as. */
function eventFor(step: string): KeyboardEventInit {
  const modifiers = new Set<string>();
  let name = step;
  for (;;) {
    const prefix = ["C-", "M-", "s-", "S-"].find(
      (candidate) => name.startsWith(candidate) && name.length > candidate.length,
    );
    if (!prefix) break;
    modifiers.add(prefix);
    name = name.slice(2);
  }
  const key = name;
  let code = name;
  if (/^[a-z]$/.test(name)) code = `Key${name.toUpperCase()}`;
  else if (/^[0-9]$/.test(name)) code = `Digit${name}`;
  else if (name === "[") code = "BracketLeft";
  else if (name === "]") code = "BracketRight";
  else if (name === "/") code = "Slash";
  return {
    key,
    code,
    ctrlKey: modifiers.has("C-"),
    altKey: modifiers.has("M-"),
    metaKey: modifiers.has("s-"),
    shiftKey: modifiers.has("S-"),
    bubbles: true,
    cancelable: true,
  };
}

/** Press every step of a chord at the window holding the keyboard. */
function press(chord: string): boolean {
  let claimed = false;
  for (const step of chord.split(" ")) {
    const event = new KeyboardEvent("keydown", eventFor(step));
    app.view.contentDOM.dispatchEvent(event);
    claimed = event.defaultPrevented;
  }
  return claimed;
}

/**
 * Every editing window's view, in the order the grid draws them.
 *
 * Through `EditorView.findFromDOM`, which is the library's own way of asking
 * an element which view it belongs to, so the test reaches each window without
 * the application growing a surface for it.
 */
function windowViews(): EditorView[] {
  return Array.from(
    host.querySelectorAll<HTMLElement>(".editor-window"),
    (element) => {
      const editor = element.querySelector<HTMLElement>(".cm-editor");
      const found = editor === null ? null : EditorView.findFromDOM(editor);
      if (found === null) throw new Error("an editing window with no view");
      return found;
    },
  );
}

const ALICE_PATH = "book/01-first/01-alice.md";
const BOB_PATH = "book/02-second/01-bob.md";
const TABLE_PATH = "table/01-counts.md";
const TALL_PATH = "tall/01-long.md";

/** Let the promises a chord started settle. */
async function settle(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** The chapter of the open document with one path. */
function chapterOf(path: string): Chapter {
  const found = app.chapters.find((chapter) => chapter.path === path);
  if (!found) throw new Error(`no chapter at ${path}`);
  return found;
}

/** Alice open in two windows side by side, the keyboard in the first. */
async function twoOnAlice(): Promise<{ a: EditorView; b: EditorView }> {
  await app.openFolder("book");
  await app.openChapter(chapterOf(ALICE_PATH));
  expect(press("C-x 3")).toBe(true);
  const views = windowViews();
  expect(views).toHaveLength(2);
  const [a, b] = views;
  if (!a || !b) throw new Error("the area did not divide");
  expect(app.view).toBe(a);
  return { a, b };
}

/**
 * `C-x o` until the keyboard is in a different editing window.
 *
 * The sidebar and any open panel are stops on the same cycle, so reaching the
 * next *window* can take more than one press. The order itself is the subject
 * of `src/focus.test.ts`, where it is asserted step by step; here it is
 * transport.
 */
function toOtherWindow(): void {
  const from = app.focus.window;
  for (let step = 0; step < 6; step += 1) {
    press("C-x o");
    if (app.focus.pane === "editor" && app.focus.window !== from) return;
  }
  throw new Error("the keyboard reached no other editing window");
}

describe("two windows on one chapter", () => {
  // The two canaries `spc-2609111105376860` § Risks names, written before the
  // echo was relied on for anything else. The failure mode they guard is the
  // only one in this design whose consequence is a corrupt file: two windows'
  // texts drifting apart, and whichever window `C-x C-s` reads becoming the
  // file. `ChangeSet.of` throws `RangeError("Mismatched change set length")` on
  // the *next* echo once the lengths disagree, so a divergence fails here on
  // the second keystroke rather than shipping.

  it("keeps the two windows' text equal through a run of edits", async () => {
    const { a, b } = await twoOnAlice();
    // Carets well apart, so every echo maps a real distance and an off-by-one
    // in either direction shows.
    a.dispatch({ selection: { anchor: 5 } });
    b.dispatch({ selection: { anchor: 40 } });
    for (let edit = 0; edit < 50; edit += 1) {
      const into = edit % 2 === 0 ? a : b;
      const at = into.state.selection.main.head;
      into.dispatch({
        changes: { from: at, insert: "x" },
        selection: { anchor: at + 1 },
      });
      expect(b.state.doc.toString(), `after edit ${String(edit + 1)}`).toBe(
        a.state.doc.toString(),
      );
      expect(b.state.doc.length).toBe(a.state.doc.length);
    }
    // Fifty characters went in, and one text came out of it.
    expect(a.state.doc.length).toBe(ALICE.length + 50);
    expect(a.state.doc.toString()).toBe(b.state.doc.toString());
  });

  it("realigns a table once, not twice, when two windows show one chapter", async () => {
    // `src/tables.ts` is the only extension on the surface that writes a
    // document change the author did not type (`adr-2609092000099546`), and it
    // does it through an `EditorState.transactionFilter`. Without `filter:
    // false` on the echo it fires a second time in the receiving window, and
    // the two texts differ by one realignment from that keystroke onward.
    await app.openFolder("table");
    await app.openChapter(chapterOf(TABLE_PATH));
    expect(press("C-x 3")).toBe(true);
    const [a, b] = windowViews();
    if (!a || !b) throw new Error("the area did not divide");

    // Both carets inside a body row of the table, which is where a
    // realignment is due — and it has to be both, because `alignTables`'s own
    // cost gate is the caret's line holding a pipe, so a receiving window whose
    // caret is elsewhere would decline the second realignment for a reason that
    // has nothing to do with the echo.
    const row = a.state.doc.line(5);
    expect(row.text).toContain("1996");
    a.dispatch({ selection: { anchor: row.from + 7 } });
    const other = b.state.doc.line(6);
    expect(other.text).toContain("1997");
    b.dispatch({ selection: { anchor: other.from + 7 } });
    for (let key = 0; key < 3; key += 1) {
      const at = a.state.selection.main.head;
      a.dispatch({
        changes: { from: at, insert: "9" },
        selection: { anchor: at + 1 },
      });
      expect(b.state.doc.toString(), `after key ${String(key + 1)}`).toBe(
        a.state.doc.toString(),
      );
    }
    // Non-vacuous: the realignment really did run, so more than the three
    // typed characters arrived, and the rows came out the same width.
    expect(a.state.doc.length).toBeGreaterThan(TABLE.length + 3);
    const widths = new Set(
      [3, 4, 5, 6].map((line) => a.state.doc.line(line).text.length),
    );
    expect(widths.size).toBe(1);
  });

  it("keeps the two windows' text equal when a realignment is undone", async () => {
    // The counter-example `iss-2609120518323764`'s correction names, and the
    // plainest reachable one: an undo carries `userEvent: undo`, so
    // `alignTables` declines to realign in the window that undid — while the
    // echo of that undo carries no user event at all, so without `filter: false`
    // the receiving window realigns the ragged table the undo has just restored.
    // The two texts then differ, and the next keystroke throws at
    // `ChangeSet.of`. Removing the option has to fail here rather than be
    // argued about.
    await app.openFolder("table");
    await app.openChapter(chapterOf(TABLE_PATH));
    expect(press("C-x 3")).toBe(true);
    const [a, b] = windowViews();
    if (!a || !b) throw new Error("the area did not divide");
    expect(app.view).toBe(a);

    // Both carets in a body row of the table, which is the case the corrected
    // record calls the one where a realignment on the echo *is* a no-op: the
    // origin's own transaction already carries it. Nothing here diverges until
    // the undo.
    const row = a.state.doc.line(5);
    expect(row.text).toContain("1996");
    const other = b.state.doc.line(6);
    expect(other.text).toContain("1997");
    b.dispatch({ selection: { anchor: other.from + 7 } });

    // One character typed in a body row: both windows realign, and the table is
    // no longer the ragged one the chapter was read as.
    a.dispatch({
      changes: { from: row.from + 7, insert: "9" },
      selection: { anchor: row.from + 8 },
    });
    const aligned = a.state.doc.toString();
    expect(b.state.doc.toString()).toBe(aligned);
    expect(aligned).not.toBe(TABLE);

    // `C-/` takes the keystroke and its realignment back together, in both
    // windows, and the restored text is the ragged one.
    expect(press("C-/")).toBe(true);
    expect(a.state.doc.toString()).toBe(TABLE);
    expect(b.state.doc.toString(), "the peer realigned the restored table").toBe(
      TABLE,
    );

    // And the next keystroke goes through, which is what a divergence takes
    // away: `ChangeSet.of` refuses a change set whose length does not match the
    // document it lands in.
    const again = a.state.doc.line(5);
    a.dispatch({
      changes: { from: again.from + 7, insert: "9" },
      selection: { anchor: again.from + 8 },
    });
    expect(b.state.doc.toString()).toBe(a.state.doc.toString());
  });

  it("answers about unsaved work from the window that changed, not from a peer", async () => {
    // `refresh` runs in the originating view's update listener, and the echo
    // reaches the peers only after that listener returns. A dirty flag read from
    // the first window on the buffer is therefore a peer's stale answer for the
    // length of that listener whenever the window being typed in is not the
    // first (`iss-2609120527453087`).
    const { a, b } = await twoOnAlice();
    const asked: boolean[] = [];
    // An observer appended to the second window's own configuration, so it runs
    // inside the same update as the application's listener and after it. There
    // is no other moment at which the stale answer exists to be seen.
    b.dispatch({
      effects: StateEffect.appendConfig.of(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) asked.push(app.dirty);
        }),
      ),
    });
    expect(app.dirty).toBe(false);

    b.dispatch({ changes: { from: 0, insert: "Typed here. " } });
    // One update in the second window, and the application knew the chapter was
    // dirty inside it rather than a listener later.
    expect(asked).toEqual([true]);
    expect(app.dirty).toBe(true);
    expect(a.state.doc.toString()).toBe(b.state.doc.toString());
  });

  it("shows the same chapter in both windows when the area divides", async () => {
    const { a, b } = await twoOnAlice();
    expect(a.state.doc.toString()).toBe(ALICE);
    expect(b.state.doc.toString()).toBe(ALICE);
    expect(app.chapterPath).toBe(ALICE_PATH);
    // "Divides left and right" is a `data-direction` and an element order
    // here; that the two halves are actually side by side is M42-1, because
    // jsdom has no layout engine at all.
    const split = host.querySelector<HTMLElement>(".window-split");
    expect(split?.dataset["direction"]).toBe("columns");
    expect(split?.querySelectorAll(".window-divider").length).toBe(1);
  });

  it("divides above and below with the same guarantees", async () => {
    // A chapter tall enough for two windows under the harness's fake grid:
    // `mayDivide` is genuinely consulted here, and the refusal is its own test
    // below.
    await app.openFolder("tall");
    await app.openChapter(chapterOf(TALL_PATH));
    const before = app.view;
    app.view.dispatch({ selection: { anchor: 11 } });

    expect(press("C-x 2")).toBe(true);
    expect(
      host.querySelector<HTMLElement>(".window-split")?.dataset["direction"],
    ).toBe("rows");
    const stacked = windowViews();
    expect(stacked).toHaveLength(2);
    expect(app.view).toBe(before);
    expect(app.view.state.selection.main.head).toBe(11);
    expect(stacked[0]?.state.doc.toString()).toBe(TALL);
    expect(stacked[1]?.state.doc.toString()).toBe(TALL);
  });

  it("refuses to divide a window too short to hold two", async () => {
    // The arithmetic of `mayDivide`, reached through the chord. `ALICE` is
    // eighteen lines, which the harness measures at 288 pixels, and two windows
    // need 326. The widths themselves are M42-4.
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 2")).toBe(true);
    expect(windowViews()).toHaveLength(1);
    expect(app.modeline.element.textContent).toContain("Too short to divide");
  });

  it("keeps the caret and the keyboard in the window that divided", async () => {
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    app.view.dispatch({ selection: { anchor: 12 } });
    const before = app.view;
    const wasAt = app.view.state.selection.main.head;
    const wasWindow = app.focus.window;

    expect(press("C-x 3")).toBe(true);
    expect(app.focus.window).toBe(wasWindow);
    expect(app.view).toBe(before);
    expect(app.view.state.selection.main.head).toBe(wasAt);
    // And a second division inside the half she is in leaves her there too.
    expect(press("C-x 3")).toBe(true);
    expect(app.focus.window).toBe(wasWindow);
    expect(app.view).toBe(before);
    expect(app.view.state.selection.main.head).toBe(wasAt);
    expect(windowViews()).toHaveLength(3);
  });

  it("keeps the caret where it was a frame after the area divided", async () => {
    // A reshape moves the window's element, which collapses the DOM selection
    // while the state's is untouched — and CodeMirror trusts the DOM, so
    // without the caret being written back the window Alice was typing in
    // jumps to the top of the chapter on the next measure. This is the one
    // hazard of moving elements rather than rebuilding them that jsdom does
    // show, and it is why `refreshSelection` exists.
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    app.view.dispatch({ selection: { anchor: 12 } });
    expect(press("C-x 3")).toBe(true);
    await settle();
    expect(app.view.state.selection.main.head).toBe(12);
    // And on the next chord, which is the other moment CodeMirror reads the DOM.
    expect(press("C-x 3")).toBe(true);
    expect(app.view.state.selection.main.head).toBe(12);
  });

  it("shows an edit made in one window in the other in the same transaction", async () => {
    const { a, b } = await twoOnAlice();
    // Read with no timer advanced and no microtask flushed, which is stronger
    // than "the same frame": the echo goes out inside the originating
    // `dispatchTransactions`, before anything else can dispatch.
    a.dispatch({ changes: { from: 0, insert: "Once. " } });
    expect(b.state.doc.toString()).toBe(`Once. ${ALICE}`);
    b.dispatch({ changes: { from: 0, insert: "Twice. " } });
    expect(a.state.doc.toString()).toBe(`Twice. Once. ${ALICE}`);
  });

  it("keeps the other window's caret where it was when Alice types", async () => {
    const { a, b } = await twoOnAlice();
    a.dispatch({ selection: { anchor: 10 } });
    b.dispatch({ selection: { anchor: 30 } });
    // An insertion *after* the other caret leaves it exactly where it was.
    a.dispatch({ changes: { from: 40, insert: "later" } });
    expect(b.state.selection.main.head).toBe(30);
    expect(a.state.selection.main.head).toBe(10);

    // And one *before* it moves it along by the length inserted, which is
    // `Transaction.newSelection`'s own mapping and what an author expects.
    a.dispatch({ changes: { from: 0, insert: "12345" } });
    expect(b.state.selection.main.head).toBe(35);
    // Her own caret is hers, and it moved by the same mapping.
    expect(a.state.selection.main.head).toBe(15);
  });

  it("restores each window's own position when the keyboard moves between them", async () => {
    const { a, b } = await twoOnAlice();
    a.dispatch({ selection: { anchor: 3 } });
    b.dispatch({ selection: { anchor: 33 } });

    toOtherWindow();
    expect(app.view).toBe(b);
    expect(app.view.state.selection.main.head).toBe(33);

    toOtherWindow();
    expect(app.view).toBe(a);
    expect(app.view.state.selection.main.head).toBe(3);
    // Each window's caret simply *is* where it was: each has its own state and
    // nothing moved it, which is why this needs no restore call at all.
    expect(b.state.selection.main.head).toBe(33);
  });

  it("opens a chapter at this window's own remembered position, not another window's", async () => {
    const { a, b } = await twoOnAlice();
    // The second window leaves Alice at 33 for Bob, and comes back to her.
    toOtherWindow();
    expect(app.view).toBe(b);
    b.dispatch({ selection: { anchor: 33 } });
    await app.openChapter(chapterOf(BOB_PATH));
    expect(b.state.doc.toString()).toBe(BOB);
    // The first window has not moved, and keeps its own place in Alice.
    expect(a.state.doc.toString()).toBe(ALICE);
    a.dispatch({ selection: { anchor: 7 } });

    await app.openChapter(chapterOf(ALICE_PATH));
    // This window's own remembered position, and not the other window's.
    expect(b.state.selection.main.head).toBe(33);
    expect(a.state.selection.main.head).toBe(7);
  });

  it("leaves the other window untouched when a chapter is opened in one", async () => {
    const { a, b } = await twoOnAlice();
    a.dispatch({ selection: { anchor: 9 } });
    toOtherWindow();
    await app.openChapter(chapterOf(BOB_PATH));

    expect(b.state.doc.toString()).toBe(BOB);
    expect(a.state.doc.toString()).toBe(ALICE);
    expect(a.state.selection.main.head).toBe(9);
    // And nothing was written anywhere on the way.
    expect(written).toEqual([]);
  });
});

describe("saving with the area divided", () => {
  it("saves the chapter in the window holding the keyboard and writes no other file", async () => {
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    toOtherWindow();
    await app.openChapter(chapterOf(BOB_PATH));
    // Two windows, two chapters, the keyboard in the second.
    expect(app.chapterPath).toBe(BOB_PATH);

    await app.save();
    expect(written).toHaveLength(1);
    expect(written[0]?.path).toBe(BOB_PATH);

    // Move the keyboard and save again: the second write is the other path.
    written = [];
    toOtherWindow();
    expect(app.chapterPath).toBe(ALICE_PATH);
    await app.save();
    expect(written).toHaveLength(1);
    expect(written[0]?.path).toBe(ALICE_PATH);
  });

  it("saves the focused window's chapter however the row was reached", async () => {
    // The three routes with no originating view at all — the palette, the
    // prefix overlay, `C-h k`'s prompt — are where a half-done scoping would
    // show, because in each of them the keyboard is in an overlay.
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    toOtherWindow();
    await app.openChapter(chapterOf(BOB_PATH));

    written = [];
    runBinding(app.view, "save-chapter");
    await settle();
    expect(written.map((write) => write.path)).toEqual([BOB_PATH]);

    written = [];
    toOtherWindow();
    runBinding(app.view, "save-chapter");
    await settle();
    expect(written.map((write) => write.path)).toEqual([ALICE_PATH]);
  });
});

describe("closing a window", () => {
  it("changes and saves nothing when the other windows close", async () => {
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    expect(press("C-x 3")).toBe(true);
    expect(windowViews()).toHaveLength(3);
    toOtherWindow();
    const kept = app.view;
    kept.dispatch({ selection: { anchor: 15 } });
    const text = kept.state.doc.toString();

    expect(press("C-x 1")).toBe(true);
    expect(windowViews()).toHaveLength(1);
    expect(app.view).toBe(kept);
    expect(kept.state.doc.toString()).toBe(text);
    expect(kept.state.selection.main.head).toBe(15);
    expect(written).toEqual([]);
    expect(app.dirty).toBe(false);
  });

  it("keeps a chapter's unsaved edits when the window showing it closes", async () => {
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    // The second window takes Bob, and is edited and left unsaved.
    toOtherWindow();
    await app.openChapter(chapterOf(BOB_PATH));
    app.view.dispatch({
      changes: { from: 0, insert: "Kept. " },
      selection: { anchor: 6 },
    });
    expect(app.dirty).toBe(true);

    // `C-x 0` closes it. Nothing is asked and nothing is written.
    expect(press("C-x 0")).toBe(true);
    expect(windowViews()).toHaveLength(1);
    expect(discardQuestions).toEqual([]);
    expect(written).toEqual([]);
    // The buffer outlived the window: the edit is still unsaved work.
    expect(app.dirty).toBe(true);

    // And opening the chapter again brings the text and the caret back.
    await app.openChapter(chapterOf(BOB_PATH));
    expect(app.view.state.doc.toString()).toBe(`Kept. ${BOB}`);
    expect(app.view.state.selection.main.head).toBe(6);
  });

  it("keeps the buffer's accounting honest when a window closes mid-load", async () => {
    // A chapter is opened into the window that asked for it, and that window can
    // be closed while the read is in flight. A window whose record has gone must
    // not be given a buffer: adding its id would leave a phantom in
    // `buffer.windows` that `leaveBuffer` never takes out, so the buffer would
    // believe a window still held its text and would never rest it — and the
    // edits in it would stop counting as unsaved.
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    toOtherWindow();
    const doomed = app.view;

    // Start the load and close the window before it lands.
    const loading = app.openChapter(chapterOf(BOB_PATH));
    expect(press("C-x 0")).toBe(true);
    await loading;
    await settle();
    expect(windowViews()).toHaveLength(1);
    expect(app.view).not.toBe(doomed);

    // Bob's buffer believes no window holds it, so a window that takes it and
    // edits it reports unsaved work — which is the accounting a phantom broke.
    await app.openChapter(chapterOf(BOB_PATH));
    expect(app.view.state.doc.toString()).toBe(BOB);
    app.view.dispatch({ changes: { from: 0, insert: "Edited. " } });
    expect(app.dirty).toBe(true);
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(app.dirty).toBe(true);
    expect(await app.confirmClose()).toBe(true);
    expect(discardQuestions.at(-1)).toContain("has unsaved edits");
  });

  it("asks nothing before closing a window", async () => {
    // The property stated as a negative: a close that asked whether edits may
    // be discarded would be admitting that it loses them.
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    app.view.dispatch({ changes: { from: 0, insert: "x" } });
    expect(press("C-x 0")).toBe(true);
    expect(discardQuestions).toEqual([]);
    expect(press("C-x 1")).toBe(true);
    expect(discardQuestions).toEqual([]);
  });
});

describe("opening another document with the area divided", () => {
  // `forgetDocument` clears every buffer, so the question asked before it runs
  // is about every dirty buffer and not only the focused window's
  // (`iss-2609120527458643`). Before the area could divide, one buffer was all
  // buffers and the focused window's question was total; it is not any more.

  it("asks about a dirty buffer outside the focused window before another folder opens", async () => {
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    // The second window takes Bob and is edited; the keyboard goes back to the
    // first, which is clean and is not the window with the work in it.
    toOtherWindow();
    await app.openChapter(chapterOf(BOB_PATH));
    app.view.dispatch({
      changes: { from: 0, insert: "Kept. " },
      selection: { anchor: 6 },
    });
    toOtherWindow();
    expect(app.view.state.doc.toString()).toBe(ALICE);
    expect(app.dirty).toBe(true);

    // Alice answers "keep": the question named Bob, and nothing was replaced.
    discardAnswer = false;
    await app.openFolder("solo");
    expect(discardQuestions).toEqual(["bob has unsaved edits. Discard them?"]);
    expect(app.documentRoot).toBe("book");
    expect(app.dirty).toBe(true);
    expect(written).toEqual([]);
    // And the edits are where she left them, in the buffer behind the window.
    await app.openChapter(chapterOf(BOB_PATH));
    expect(app.view.state.doc.toString()).toBe(`Kept. ${BOB}`);
  });

  it("counts the chapters rather than naming one when several are unsaved", async () => {
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    toOtherWindow();
    await app.openChapter(chapterOf(BOB_PATH));
    app.view.dispatch({ changes: { from: 0, insert: "Bob's. " } });
    toOtherWindow();
    app.view.dispatch({ changes: { from: 0, insert: "Alice's. " } });

    // Two buffers are about to go, so the question says two. A question that
    // named one chapter here would be telling the author an untruth about the
    // other.
    discardAnswer = false;
    await app.openFolder("solo");
    expect(discardQuestions).toEqual([
      "2 chapters have unsaved edits. Discard them?",
    ]);
    expect(app.documentRoot).toBe("book");
  });

  it("replaces the document when the author says to discard", async () => {
    await app.openFolder("book");
    await app.openChapter(chapterOf(ALICE_PATH));
    expect(press("C-x 3")).toBe(true);
    toOtherWindow();
    await app.openChapter(chapterOf(BOB_PATH));
    app.view.dispatch({ changes: { from: 0, insert: "Gone. " } });
    toOtherWindow();

    discardAnswer = true;
    await app.openFolder("solo");
    expect(discardQuestions).toHaveLength(1);
    expect(app.documentRoot).toBe("solo");
    expect(app.dirty).toBe(false);
    // The layout is the author's: a different document is not a reason to
    // rearrange her screen.
    expect(windowViews()).toHaveLength(2);
  });
});

describe("undo with two windows on one chapter", () => {
  // Settled behaviour, not a defect: undo is per window
  // (`cond-2609120405528253`), because `history()` is a `StateField` and a
  // `StateField` lives in exactly one `EditorState`, which the amended
  // mechanism gives each window its own of. These three tests pin what the
  // maintainer chose; a passing assertion here is not a bug going unnoticed.

  it("undoes nothing in the window that did not make the edit", async () => {
    const { a, b } = await twoOnAlice();
    a.dispatch({
      changes: { from: 0, insert: "First. " },
      selection: { anchor: 7 },
    });
    const after = a.state.doc.toString();

    toOtherWindow();
    expect(app.view).toBe(b);
    expect(press("C-/")).toBe(true);
    // Byte-identical in both: the echo carried
    // `Transaction.addToHistory.of(false)`, so B's history is empty.
    expect(b.state.doc.toString()).toBe(after);
    expect(a.state.doc.toString()).toBe(after);
  });

  it("undoes in both windows when the window that made the edit undoes", async () => {
    const { a, b } = await twoOnAlice();
    a.dispatch({
      changes: { from: 0, insert: "First. " },
      selection: { anchor: 7 },
    });
    expect(b.state.doc.toString()).toBe(`First. ${ALICE}`);

    expect(app.view).toBe(a);
    expect(press("C-/")).toBe(true);
    // The undo is a change like any other, so it is echoed like any other.
    expect(a.state.doc.toString()).toBe(ALICE);
    expect(b.state.doc.toString()).toBe(ALICE);
  });

  it("undoes the second window's own older edit at the right place after the first window has typed", async () => {
    const { a, b } = await twoOnAlice();
    // B edits late in the chapter, then A types before it.
    b.dispatch({ selection: { anchor: 40 } });
    b.dispatch({
      changes: { from: 40, insert: "BBB" },
      selection: { anchor: 43 },
    });
    a.dispatch({ changes: { from: 0, insert: "AAAAA" } });
    expect(b.state.doc.toString()).toBe(a.state.doc.toString());

    toOtherWindow();
    expect(app.view).toBe(b);
    expect(press("C-/")).toBe(true);
    // B's own edit is gone and A's is untouched, which is `addMapping`
    // working: B's history entry was mapped through A's change.
    const expected = `AAAAA${ALICE}`;
    expect(b.state.doc.toString()).toBe(expected);
    expect(a.state.doc.toString()).toBe(expected);
  });
});
