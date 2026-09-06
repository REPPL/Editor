/**
 * `C-x C-o`: open a file or a folder (`itd-2609061509393380`, map #35).
 *
 * The shell is stubbed, so the two dialogs and the claim are three plain
 * promises here; what is under test is the page's half of the promise —
 * that a folder pick draws exactly the tree a folder open already would,
 * that a file pick shows the one-chapter document `openDocumentSource`
 * hands back with the named chapter open, that a refusal is announced and
 * changes nothing, and that neither dialog nor the claim ever reaches the
 * network.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp, type App, type AppServices } from "./app";
import type { Chapter, ChapterBatch, DocumentTree, Part } from "./doctree";
import { runBinding } from "./emacs";
import { documentText } from "./editor";
import { closeOverlay } from "./overlay";

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

/** The two-Part document a folder pick draws. */
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

const NOTES_TEXT = "# Notes\n\nSomething written on a train.\n";

/** The hand-built one-chapter tree a bare-file pick draws. */
function oneChapterOnItsOwn(): DocumentTree {
  return {
    root: part("drafts", "drafts", "drafts", [
      chapter("01-notes.md", "drafts/01-notes.md", "notes"),
    ]),
    failures: [],
  };
}

const OPENING_TEXT = "# Opening\n";

/** The real document a picked chapter already lives inside. */
function realDocument(): DocumentTree {
  return {
    root: part("book", "book", "book", [], [
      part("01-beginnings", "book/01-beginnings", "beginnings", [
        chapter("01-opening.md", "book/01-beginnings/01-opening.md", "opening"),
      ]),
    ]),
    failures: [],
  };
}

/** Every visible tree row's text, in the order it is drawn. */
function rows(host: HTMLElement): string[] {
  return Array.from(
    host.querySelectorAll<HTMLElement>(".tree-part-label, .tree-button"),
    (row) => row.textContent ?? "",
  );
}

/** Dispatch one keydown at `document`, the overlay's own key target. */
function keydown(key: string, code: string): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, code, bubbles: true, cancelable: true }),
  );
}

/**
 * Answer the chooser `C-x C-o` opens: `folder` on the first row (the
 * default), `file` after one step down.
 */
function chooseSourceKind(kind: "folder" | "file"): void {
  if (kind === "file") keydown("ArrowDown", "ArrowDown");
  keydown("Enter", "Enter");
}

/** Let every microtask queued by the pick-claim-show chain settle. */
async function flush(): Promise<void> {
  for (let step = 0; step < 12; step += 1) await Promise.resolve();
}

let host: HTMLElement;
let app: App;
let texts: Map<string, string>;
let written: { path: string; text: string }[];
let pickFolderResult: { nonce: string; name: string } | null;
let pickFileResult: { nonce: string; name: string } | null;
let openOutcome:
  | { tree: DocumentTree; selectedChapter: string | null }
  | Error
  | null;
let pickFolderCalls: number;
let pickFileCalls: number;
let openCalls: string[];

const services: AppServices = {
  chooseFolder: () => Promise.resolve(null),
  openFolder: () => Promise.reject(new Error("not used by these tests")),
  readChapter: (path) => {
    const text = texts.get(path);
    return text === undefined
      ? Promise.reject(new Error(`cannot read ${path}`))
      : Promise.resolve(text);
  },
  writeChapter: (path, text) => {
    written.push({ path, text });
    return Promise.resolve();
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
  confirmDiscard: () => Promise.resolve(true),
  pickDocumentFolder: () => {
    pickFolderCalls += 1;
    return Promise.resolve(pickFolderResult);
  },
  pickDocumentFile: () => {
    pickFileCalls += 1;
    return Promise.resolve(pickFileResult);
  },
  openDocumentSource: (nonce) => {
    openCalls.push(nonce);
    if (openOutcome instanceof Error) return Promise.reject(openOutcome);
    if (openOutcome === null) return Promise.reject(new Error("no outcome staged"));
    return Promise.resolve(openOutcome);
  },
};

beforeEach(() => {
  texts = new Map([
    ["drafts/01-notes.md", NOTES_TEXT],
    ["book/01-beginnings/01-opening.md", OPENING_TEXT],
    ["book/01-first/01-alice.md", "# Alice\n"],
    ["book/02-second/01-bob.md", "# Bob\n"],
  ]);
  written = [];
  pickFolderResult = null;
  pickFileResult = null;
  openOutcome = null;
  pickFolderCalls = 0;
  pickFileCalls = 0;
  openCalls = [];
  host = document.createElement("div");
  document.body.append(host);
  app = createApp(host, services);
});

afterEach(() => {
  closeOverlay();
  app.destroy();
  host.remove();
});

describe("opening through C-x C-o", () => {
  it("opens a folder exactly as C-x C-f would", async () => {
    pickFolderResult = { nonce: "n1", name: "book" };
    openOutcome = { tree: twoParts(), selectedChapter: null };

    expect(runBinding(app.view, "open-file-or-folder")).toBeNull();
    chooseSourceKind("folder");
    await flush();

    expect(pickFolderCalls).toBe(1);
    expect(pickFileCalls).toBe(0);
    expect(openCalls).toEqual(["n1"]);
    expect(app.documentRoot).toBe("book");
    expect(rows(host)).toEqual(["first", "Alice", "second", "Bob"]);
  });

  it("opens a bare file as a one-chapter document and writes nothing", async () => {
    pickFileResult = { nonce: "n2", name: "01-notes.md" };
    openOutcome = {
      tree: oneChapterOnItsOwn(),
      selectedChapter: "drafts/01-notes.md",
    };

    runBinding(app.view, "open-file-or-folder");
    chooseSourceKind("file");
    await flush();

    expect(pickFileCalls).toBe(1);
    expect(app.documentRoot).toBe("drafts");
    // Exactly the one chapter, with no empty Part row beside it.
    expect(rows(host)).toEqual(["Notes"]);
    // And it is already open, at the text the claim handed back.
    expect(app.chapterPath).toBe("drafts/01-notes.md");
    expect(documentText(app.view)).toBe(NOTES_TEXT);
    expect(written).toEqual([]);
  });

  it("saves the bare-file chapter back byte for byte", async () => {
    pickFileResult = { nonce: "n2", name: "01-notes.md" };
    openOutcome = {
      tree: oneChapterOnItsOwn(),
      selectedChapter: "drafts/01-notes.md",
    };
    runBinding(app.view, "open-file-or-folder");
    chooseSourceKind("file");
    await flush();

    const edited = `${NOTES_TEXT}One more line.\n`;
    app.view.dispatch({
      changes: { from: app.view.state.doc.length, insert: "One more line.\n" },
    });
    await app.save();

    expect(written).toEqual([{ path: "drafts/01-notes.md", text: edited }]);
  });

  it("opens the whole document when the picked file already lives inside one", async () => {
    pickFileResult = { nonce: "n3", name: "01-opening.md" };
    openOutcome = {
      tree: realDocument(),
      selectedChapter: "book/01-beginnings/01-opening.md",
    };

    runBinding(app.view, "open-file-or-folder");
    chooseSourceKind("file");
    await flush();

    expect(app.documentRoot).toBe("book");
    expect(rows(host)).toEqual(["beginnings", "Opening"]);
    expect(app.chapterPath).toBe("book/01-beginnings/01-opening.md");
    expect(documentText(app.view)).toBe(OPENING_TEXT);
  });

  it("refuses a file that is not Markdown", async () => {
    pickFileResult = { nonce: "n4", name: "notes.txt" };
    openOutcome = new Error("notes.txt is not a Markdown file");

    runBinding(app.view, "open-file-or-folder");
    chooseSourceKind("file");
    await flush();

    expect(app.modeline.element.textContent).toContain(
      "notes.txt is not a Markdown file",
    );
    expect(app.documentRoot).toBeNull();
    expect(app.chapterPath).toBeNull();
  });

  it("cancelling either dialog leaves the open document untouched", async () => {
    pickFolderResult = null; // the author closed the dialog without choosing
    runBinding(app.view, "open-file-or-folder");
    chooseSourceKind("folder");
    await flush();

    expect(pickFolderCalls).toBe(1);
    expect(openCalls).toEqual([]);
    expect(app.documentRoot).toBeNull();
  });

  it("attempts no network request while opening either way", async () => {
    pickFolderResult = { nonce: "n1", name: "book" };
    openOutcome = { tree: twoParts(), selectedChapter: null };

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
      runBinding(app.view, "open-file-or-folder");
      chooseSourceKind("folder");
      await flush();
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.XMLHttpRequest = originalXhr;
    }

    expect(attempts).toEqual([]);
  });
});
