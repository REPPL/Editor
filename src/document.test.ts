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
  ]);
  texts = new Map([
    ["book/01-first/01-alice.md", ALICE],
    ["book/02-second/01-bob.md", BOB],
    ["solo/01-alice.md", ALICE],
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
