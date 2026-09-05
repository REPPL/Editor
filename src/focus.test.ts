/**
 * Moving between the editor, the sidebar, and whatever panel is open.
 *
 * The mechanism under test is that focus is single and exclusive: one pane
 * holds the keyboard, and the chord that arrives is answered by that pane and
 * by no other. So the negative cases carry as much weight as the positive
 * ones — a sidebar chord that fires while the cursor is in the text, or a
 * keystroke that reaches the chapter while the tree has focus, is the
 * mechanism being wrong rather than a detail being wrong.
 *
 * jsdom has no layout and no media queries, so the drawer is proven here by
 * the two calls that open and close it and by nothing about its width. What
 * 820 CSS pixels look like is manual check M30-1.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp, type App, type AppServices } from "./app";
import type { Chapter, DocumentTree, Part } from "./doctree";
import { cursorPosition, documentText } from "./editor";
import { BINDINGS, bindingById, canonicalChord, scopeOf } from "./keys";
import { openKeysPanel } from "./keyspanel";
import { closeOverlay } from "./overlay";
import { openPalette } from "./palette";
import {
  createPublishPanel,
  mountPublishPanel,
  type PublishServices,
} from "./publish-panel";
import {
  createSettingsPanel,
  mountSettingsPanel,
  type Settings,
  type SettingsServices,
} from "./settings-panel";

// ------------------------------------------------------------- the document

const ALICE = [
  "# Alice",
  "",
  "The first chapter.",
  "",
  "## Alice section",
  "",
  "A paragraph.",
].join("\n");

const BOB = [
  "# Bob",
  "",
  "The second chapter.",
  "",
  "## Bob section",
  "",
  "A paragraph.",
  "",
  "### Bob sub-section",
  "",
  "The heading Return is pressed on.",
].join("\n");

/** A chapter with no headings at all, so `C-f` on a leaf has a subject. */
const CAROL = ["# Carol", "", "A chapter with no sections."].join("\n");

/**
 * A chapter written to be hard on anything that reads and writes it.
 *
 * The same fixture the key spike carries in `emacs-keys.test.ts`: a
 * 544-character line, a ragged table, an HTML comment, a fenced div, tabs,
 * trailing whitespace, and no trailing newline.
 */
const HAZARDOUS = [
  "# A hazardous chapter",
  "",
  `A very long line: ${"the quick brown fox jumps over the lazy dog. ".repeat(13)}`
    .slice(0, 543)
    .padEnd(544, "."),
  "",
  "| Name | What it is | Notes |",
  "|---|:--|--:|",
  "| Alice |a|",
  "| Bob | a longer cell that makes the table ragged | x | y |",
  "",
  "<!-- pagebreak -->",
  "",
  "::: {.notes}",
  "\tA tab-indented note, with trailing space.   ",
  ":::",
  "",
  "Text with `back ticks`, a \\ backslash, and   a non-breaking space.",
  "",
  "```",
  "## Not a heading",
  "```",
  "",
  "Last line, no trailing newline.",
].join("\n");

const ROOT = "document";
const PART = "document/part-one";
const ALICE_PATH = "document/part-one/01-alice.md";
const BOB_PATH = "document/part-one/02-bob.md";
const CAROL_PATH = "document/part-one/03-carol.md";
const HAZARD_PATH = "document/part-one/04-hazard.md";

function chapterAt(name: string, title: string, path: string): Chapter {
  return { name, title, path, order: 1, bytes: 0, modified: null };
}

const ALICE_CHAPTER = chapterAt("01-alice.md", "alice", ALICE_PATH);
const BOB_CHAPTER = chapterAt("02-bob.md", "bob", BOB_PATH);
const CAROL_CHAPTER = chapterAt("03-carol.md", "carol", CAROL_PATH);
const HAZARD_CHAPTER = chapterAt("04-hazard.md", "hazard", HAZARD_PATH);

function partOf(chapters: readonly Chapter[]): Part {
  return {
    name: "part-one",
    title: "Part One",
    path: PART,
    order: 1,
    parts: [],
    chapters: [...chapters],
    truncated: false,
  };
}

function treeOf(chapters: readonly Chapter[]): DocumentTree {
  return {
    root: {
      name: ROOT,
      title: ROOT,
      path: ROOT,
      order: null,
      parts: [partOf(chapters)],
      chapters: [],
      truncated: false,
    },
    failures: [],
  };
}

const TEXT = new Map<string, string>([
  [ALICE_PATH, ALICE],
  [BOB_PATH, BOB],
  [CAROL_PATH, CAROL],
  [HAZARD_PATH, HAZARDOUS],
]);

let written: { path: string; text: string } | null = null;

const services: AppServices = {
  chooseFolder: () => Promise.resolve(null),
  openFolder: () =>
    Promise.resolve(
      treeOf([ALICE_CHAPTER, BOB_CHAPTER, CAROL_CHAPTER, HAZARD_CHAPTER]),
    ),
  readChapter: (path) => Promise.resolve(TEXT.get(path) ?? ""),
  writeChapter: (path, text) => {
    written = { path, text };
    return Promise.resolve();
  },
  confirmDiscard: () => Promise.resolve(true),
};

// ------------------------------------------------------------------ pressing

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
  let key = name;
  let code = name;
  if (/^[a-z]$/.test(name)) {
    code = `Key${name.toUpperCase()}`;
  } else if (/^[0-9]$/.test(name)) {
    code = `Digit${name}`;
  } else if (name === "Return") {
    key = "Enter";
    code = "Enter";
  } else if (["Left", "Right", "Up", "Down"].includes(name)) {
    key = `Arrow${name}`;
    code = key;
  } else if (name === "Space") {
    key = " ";
    code = "Space";
  }
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

/** Dispatch every step of a chord at one element; true when it was claimed. */
function pressAt(target: EventTarget, chord: string): boolean {
  let claimed = false;
  for (const step of chord.split(" ")) {
    const event = new KeyboardEvent("keydown", eventFor(step));
    target.dispatchEvent(event);
    claimed = event.defaultPrevented;
  }
  return claimed;
}

/**
 * The pointer route onto one element, spelled out.
 *
 * jsdom runs no default action for a pointer, so the two things a browser
 * does when Alice clicks something focusable are written here in the
 * browser's own order: the focus moves first, the click event follows.
 */
function clickAt(element: HTMLElement): void {
  element.focus();
  element.click();
}

/**
 * Press a chord at whichever pane holds the keyboard.
 *
 * Which element the event is dispatched at is the whole question here: the
 * editing surface only hears a key while its content has DOM focus, and a
 * pane that is not the editor is read by the one document listener.
 */
function press(app: App, chord: string): boolean {
  if (app.focus.pane === "editor") return pressAt(app.view.contentDOM, chord);
  if (app.focus.pane === "sidebar") return pressAt(app.sidebar.element, chord);
  const active =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : document.body;
  return pressAt(active, chord);
}

/** Let the promises a chord started settle. */
async function settle(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** What the modeline says, as one string. */
function modeline(app: App): string {
  return app.modeline.element.textContent ?? "";
}

/** The key of the row under the cursor. */
function cursorRow(app: App): string | null {
  return app.sidebar.rows()[app.sidebar.cursor]?.key ?? null;
}

/** The row the cursor mark is drawn on, read back off the page. */
function markedRow(app: App): HTMLElement | null {
  return app.sidebar.element.querySelector<HTMLElement>(
    '.tree-row[data-cursor="yes"]',
  );
}

// ------------------------------------------------------------------- panels

/** A publish panel with services that answer and do nothing else. */
function publishServices(): PublishServices {
  const nothing = (): never => {
    throw new Error("not used here");
  };
  return {
    describe: () => Promise.resolve({ title: "document", variant: "talk" }),
    build: nothing,
    publish: nothing,
    publishDryRun: nothing,
    checkDeploy: nothing,
    readPublishLog: () => Promise.resolve([]),
    openLink: () => Promise.resolve(),
    copyLink: () => Promise.resolve(),
  };
}

function settingsServices(): SettingsServices {
  const stored: Settings = {
    schema_version: 1,
    publish: {
      repository: "/repos/site",
      remote: "origin",
      branch: "main",
      base_url: "https://example.invalid",
      site_dir: "site",
    },
    asset_roots: {},
  };
  return {
    getSettings: () => Promise.resolve(stored),
    setPublishTarget: () => Promise.resolve(stored),
    setAssetRoot: () => Promise.resolve(stored),
  };
}

// --------------------------------------------------------------- the harness

let host: HTMLElement;
let app: App;

/** Mount the application with a document open and Alice in the buffer. */
async function mount(open: Chapter = ALICE_CHAPTER): Promise<App> {
  host = document.createElement("div");
  document.body.append(host);
  app = createApp(host, services);
  await app.openFolder(ROOT);
  await app.openChapter(open);
  return app;
}

beforeEach(() => {
  written = null;
});

afterEach(() => {
  closeOverlay();
  app.destroy();
  host.remove();
});

describe("the pane cycle", () => {
  it("moves the keyboard to the sidebar on C-x o and starts on the open chapter", async () => {
    await mount();
    expect(app.focus.pane).toBe("editor");
    expect(modeline(app)).toContain("[Editor]");

    expect(press(app, "C-x o")).toBe(true);

    expect(app.focus.pane).toBe("sidebar");
    expect(app.sidebar.focused).toBe(true);
    expect(document.activeElement).toBe(app.sidebar.element);
    // The node for the open chapter is the one under the cursor, so she
    // starts from where she already is.
    expect(cursorRow(app)).toBe(`chapter:${ALICE_PATH}`);
    expect(markedRow(app)?.textContent).toContain("Alice");
    expect(modeline(app)).toContain("[Sidebar]");
  });

  it("answers C-x C-o as well, without lifting the Control key", async () => {
    await mount();
    expect(press(app, "C-x C-o")).toBe(true);
    expect(app.focus.pane).toBe("sidebar");
    expect(press(app, "C-x C-o")).toBe(true);
    expect(app.focus.pane).toBe("editor");
  });

  it("cycles straight back to the editor when no panel is open", async () => {
    await mount();
    const before = cursorPosition(app.view);

    press(app, "C-x o");
    expect(app.focus.pane).toBe("sidebar");
    press(app, "C-x o");

    expect(app.focus.pane).toBe("editor");
    expect(app.sidebar.focused).toBe(false);
    expect(app.chapterPath).toBe(ALICE_PATH);
    expect(cursorPosition(app.view)).toEqual(before);
    expect(modeline(app)).toContain("[Editor]");
  });

  it("starts on the first row when no chapter is open", async () => {
    host = document.createElement("div");
    document.body.append(host);
    app = createApp(host, services);
    await app.openFolder(ROOT);

    press(app, "C-x o");
    expect(app.focus.pane).toBe("sidebar");
    // The first row, the only one it can name without guessing.
    expect(cursorRow(app)).toBe(`part:${PART}`);
  });

  it("leaves the cycle alone when the tree has no rows", async () => {
    host = document.createElement("div");
    document.body.append(host);
    app = createApp(host, services);

    press(app, "C-x o");
    // Nothing is open, so the sidebar cannot hold a cursor and the panel is
    // not there: the walk finds only the editor and stays.
    expect(app.focus.pane).toBe("editor");
    expect(modeline(app)).toContain("[Editor]");
  });

  it("cycles editor, sidebar, panel, editor in one fixed order", async () => {
    // The table: four panels, one order. Each opens by its own route and each
    // takes the third place, and no other place.
    const panels: { label: string; open: () => Promise<void> | void }[] = [
      {
        label: "Keys",
        open: () => {
          press(app, bindingById("keys-panel")?.chords[0] ?? "C-h b");
        },
      },
      {
        label: "Insert",
        open: () => {
          press(app, bindingById("insert-palette")?.chords[0] ?? "C-c i");
        },
      },
      {
        label: "Publish",
        open: async () => {
          const panel = createPublishPanel(publishServices());
          mountPublishPanel(app, panel);
          await panel.open();
        },
      },
      {
        label: "Settings",
        open: async () => {
          const panel = createSettingsPanel(settingsServices());
          mountSettingsPanel(app, panel);
          await panel.open();
        },
      },
    ];

    for (const panel of panels) {
      await mount();
      await panel.open();
      await settle();

      // A panel takes the keyboard as it opens, and the modeline says so.
      expect(app.focus.pane, panel.label).toBe("panel");
      expect(modeline(app)).toContain(`[${panel.label}]`);

      // From the panel the cycle wraps to the editor, which is where the
      // three steps the press release describes begin.
      press(app, "C-x o");
      expect(app.focus.pane, panel.label).toBe("editor");
      expect(modeline(app)).toContain("[Editor]");

      press(app, "C-x o");
      expect(app.focus.pane, panel.label).toBe("sidebar");
      expect(modeline(app)).toContain("[Sidebar]");

      press(app, "C-x o");
      expect(app.focus.pane, panel.label).toBe("panel");
      expect(modeline(app)).toContain(`[${panel.label}]`);

      press(app, "C-x o");
      expect(app.focus.pane, panel.label).toBe("editor");
      expect(modeline(app)).toContain("[Editor]");

      closeOverlay();
      app.destroy();
      host.remove();
    }
  });

  it("names the pane holding the keyboard, and shows a prefix typed in it", async () => {
    await mount();
    press(app, "C-x o");
    expect(modeline(app)).toContain("[Sidebar]");

    // A half-typed `C-x` in the sidebar shows in the cell that already
    // carries a half-typed `C-x` in the text.
    expect(press(app, "C-x")).toBe(true);
    expect(app.focus.prefix).toBe("C-x");
    const prefix = app.modeline.element.querySelector<HTMLElement>(
      ".modeline-prefix",
    );
    expect(prefix?.textContent).toBe("C-x-");
    expect(prefix?.dataset["active"]).toBe("yes");

    // And `C-g` clears the prefix rather than leaving the tree.
    expect(press(app, "C-g")).toBe(true);
    expect(app.focus.prefix).toBeNull();
    expect(app.focus.pane).toBe("sidebar");
    expect(prefix?.textContent).toBe("");
  });

  it("returns to the editor when the panel holding the keyboard closes", async () => {
    await mount();
    press(app, bindingById("keys-panel")?.chords[0] ?? "C-h b");
    expect(app.focus.pane).toBe("panel");

    // The one cancel contract closes it; nothing here is a second rule.
    press(app, "Escape");
    await settle();
    expect(app.focus.pane).toBe("editor");
    expect(modeline(app)).toContain("[Editor]");
  });
});

describe("the tree under the cursor", () => {
  it("walks the tree on the chord and on the arrow alike", async () => {
    await mount();
    press(app, "C-x o");
    const rows = (): readonly string[] =>
      app.sidebar.rows().map((row) => row.key);
    expect(rows()).toEqual([
      `part:${PART}`,
      `chapter:${ALICE_PATH}`,
      `chapter:${BOB_PATH}`,
      `chapter:${CAROL_PATH}`,
      `chapter:${HAZARD_PATH}`,
    ]);
    expect(app.sidebar.cursor).toBe(1);

    expect(press(app, "C-n")).toBe(true);
    expect(cursorRow(app)).toBe(`chapter:${BOB_PATH}`);
    expect(press(app, "C-p")).toBe(true);
    expect(cursorRow(app)).toBe(`chapter:${ALICE_PATH}`);
    expect(press(app, "Down")).toBe(true);
    expect(cursorRow(app)).toBe(`chapter:${BOB_PATH}`);
    expect(press(app, "Up")).toBe(true);
    expect(cursorRow(app)).toBe(`chapter:${ALICE_PATH}`);

    // A list of forms wraps because it has no shape; a book does not.
    press(app, "C-p");
    press(app, "C-p");
    expect(app.sidebar.cursor).toBe(0);
    for (let step = 0; step < 8; step += 1) press(app, "C-n");
    expect(app.sidebar.cursor).toBe(app.sidebar.rows().length - 1);

    // Nothing was opened while she was only looking.
    expect(app.chapterPath).toBe(ALICE_PATH);
    expect(documentText(app.view)).toBe(ALICE);
  });

  it("expands and collapses without opening anything", async () => {
    await mount();
    press(app, "C-x o");
    press(app, "C-n");
    expect(cursorRow(app)).toBe(`chapter:${BOB_PATH}`);

    expect(press(app, "C-f")).toBe(true);
    expect(app.sidebar.rows().map((row) => row.key)).toContain(
      `node:${BOB_PATH}#bob-section`,
    );
    // Expanding moves nothing: the chord promises to open the node and
    // nothing else.
    expect(cursorRow(app)).toBe(`chapter:${BOB_PATH}`);
    expect(app.chapterPath).toBe(ALICE_PATH);

    expect(press(app, "C-b")).toBe(true);
    expect(app.sidebar.rows().map((row) => row.key)).not.toContain(
      `node:${BOB_PATH}#bob-section`,
    );
    expect(cursorRow(app)).toBe(`chapter:${BOB_PATH}`);

    // The arrows do the same, for the times her hand is already there.
    expect(press(app, "Right")).toBe(true);
    expect(app.sidebar.rows().length).toBeGreaterThan(5);
    expect(press(app, "Left")).toBe(true);
    expect(app.sidebar.rows().length).toBe(5);

    // A leaf has nothing to open, and `C-f` on one moves to no child.
    press(app, "C-n");
    expect(cursorRow(app)).toBe(`chapter:${CAROL_PATH}`);
    press(app, "C-f");
    expect(cursorRow(app)).toBe(`chapter:${CAROL_PATH}`);
    expect(app.sidebar.rows().length).toBe(5);

    expect(app.chapterPath).toBe(ALICE_PATH);
    expect(documentText(app.view)).toBe(ALICE);
    expect(written).toBeNull();
  });

  it("opens the chapter at the heading on Return and hands the keyboard back", async () => {
    await mount();
    press(app, "C-x o");
    press(app, "C-n");
    press(app, "C-f");
    press(app, "C-n");
    expect(cursorRow(app)).toBe(`node:${BOB_PATH}#bob-section`);
    press(app, "C-f");
    press(app, "C-n");
    expect(cursorRow(app)).toBe(
      `node:${BOB_PATH}#bob-section/bob-sub-section`,
    );

    expect(press(app, "Return")).toBe(true);
    await settle();

    expect(app.chapterPath).toBe(BOB_PATH);
    expect(documentText(app.view)).toBe(BOB);
    // The cursor is on the heading, ready to type.
    expect(cursorPosition(app.view).line).toBe(9);
    expect(app.focus.pane).toBe("editor");
    expect(app.sidebar.focused).toBe(false);
    expect(modeline(app)).toContain("[Editor]");
  });

  it("opens nothing on a Part row, because a Part is not a chapter", async () => {
    await mount();
    press(app, "C-x o");
    press(app, "C-p");
    expect(cursorRow(app)).toBe(`part:${PART}`);

    expect(press(app, "Return")).toBe(true);
    await settle();
    expect(app.chapterPath).toBe(ALICE_PATH);
    expect(app.focus.pane).toBe("sidebar");
  });

  it("returns to the text on C-g having opened nothing", async () => {
    await mount();
    const before = cursorPosition(app.view);
    press(app, "C-x o");
    press(app, "C-n");
    press(app, "C-f");

    expect(press(app, "C-g")).toBe(true);
    expect(app.focus.pane).toBe("editor");
    expect(app.chapterPath).toBe(ALICE_PATH);
    expect(documentText(app.view)).toBe(ALICE);
    // Her cursor is where she left it: nothing here dispatched a transaction.
    expect(cursorPosition(app.view)).toEqual(before);
    expect(modeline(app)).toContain("[Editor]");

    // Escape is the other chord of the same row.
    press(app, "C-x o");
    expect(app.focus.pane).toBe("sidebar");
    expect(press(app, "Escape")).toBe(true);
    expect(app.focus.pane).toBe("editor");
    expect(app.chapterPath).toBe(ALICE_PATH);
  });
});

describe("one pane at a time", () => {
  it("leaves the tree alone while the cursor is in the text", async () => {
    await mount();
    // The tree is drawn, and the cursor is nowhere in it until it is asked
    // for: these chords are the editing surface's while the text has focus.
    const before = app.sidebar.rows().map((row) => row.key);
    const cursorBefore = app.sidebar.cursor;

    for (const chord of ["C-n", "C-p", "C-f", "C-b", "Return", "Down", "Up"]) {
      press(app, chord);
    }

    expect(app.sidebar.rows().map((row) => row.key)).toEqual(before);
    expect(app.sidebar.cursor).toBe(cursorBefore);
    expect(app.sidebar.focused).toBe(false);
    expect(app.focus.pane).toBe("editor");
    // The editing surface ran its own actions instead: `Return` inserted a
    // newline, which is what the text answering means.
    expect(documentText(app.view)).not.toBe(ALICE);
    expect(documentText(app.view)).toContain("Alice");
  });

  it("types nothing into the chapter while the tree has the keyboard", async () => {
    await mount();
    press(app, "C-x o");

    for (const key of ["a", "b", "z", "1", "Space", "S-q"]) {
      press(app, key);
    }
    // And the chords the text answers do not fire either.
    for (const chord of ["C-k", "C-y", "C-d", "M-d", "C-t"]) {
      press(app, chord);
    }

    expect(documentText(app.view)).toBe(ALICE);
    expect(app.dirty).toBe(false);
    expect(app.focus.pane).toBe("sidebar");
  });

  it("changes not one byte of the open chapter while the tree has the keyboard", async () => {
    await mount(HAZARD_CHAPTER);
    expect(documentText(app.view)).toBe(HAZARDOUS);
    expect(app.dirty).toBe(false);

    press(app, "C-x o");
    // Every chord the sidebar answers, twice round, over the hazardous text.
    for (let round = 0; round < 2; round += 1) {
      for (const binding of BINDINGS) {
        if (scopeOf(binding) !== "sidebar") continue;
        if (binding.id === "sidebar-open-node") continue;
        if (binding.id === "sidebar-quit") continue;
        for (const chord of binding.chords) press(app, chord);
      }
    }

    expect(documentText(app.view)).toBe(HAZARDOUS);
    expect(app.dirty).toBe(false);
    press(app, "C-g");
    await app.save();
    expect(written).toEqual({ path: HAZARD_PATH, text: HAZARDOUS });
  });

  it("answers every sidebar row and lists every chord it answers", async () => {
    // The sweep in both directions. Every row the sidebar owns is reached by
    // every chord it carries, and no chord the sidebar answers is missing
    // from the table — which is what makes the keys panel a true list.
    const sidebarRows = BINDINGS.filter(
      (binding) => scopeOf(binding) === "sidebar",
    );
    expect(sidebarRows.length).toBe(6);

    for (const binding of sidebarRows) {
      expect(binding.chords.length).toBeGreaterThan(0);
      for (const chord of binding.chords) {
        await mount();
        press(app, "C-x o");
        expect(app.focus.pane).toBe("sidebar");
        // Not a claim about what it did: a claim that it was answered here,
        // and so did not fall through to the browser or to the text.
        expect(pressAt(app.sidebar.element, chord), `${binding.id}: ${chord}`).toBe(
          true,
        );
        await settle();
        app.destroy();
        host.remove();
      }
    }

    // The other direction: the chords this flow answers, each a row with an
    // id, a label and its chords, and each in the keys panel's own grouping.
    const listed = new Set(
      BINDINGS.flatMap((binding) => binding.chords.map(canonicalChord)),
    );
    for (const chord of [
      "C-x o",
      "C-x C-o",
      "C-n",
      "C-p",
      "C-f",
      "C-b",
      "Return",
      "C-g",
      "Escape",
      "Down",
      "Up",
      "Right",
      "Left",
    ]) {
      expect(listed.has(canonicalChord(chord)), chord).toBe(true);
    }
    for (const binding of sidebarRows) {
      expect(binding.label.length).toBeGreaterThan(0);
      expect(binding.group).toBe("panes");
    }
  });

  it("lists every row this flow answers in the keys panel", async () => {
    await mount();
    const overlay = openKeysPanel();
    const ids = [...overlay.element.querySelectorAll<HTMLElement>(".keys-row")]
      .map((row) => row.dataset["binding"])
      .filter((id): id is string => id !== undefined);
    for (const binding of BINDINGS) {
      if (scopeOf(binding) !== "sidebar" && binding.id !== "other-window") {
        continue;
      }
      expect(ids, binding.id).toContain(binding.id);
    }
    // And the panel says which pane answers a sidebar row.
    const row = overlay.element.querySelector<HTMLElement>(
      '.keys-row[data-binding="sidebar-next-node"]',
    );
    expect(row?.textContent).toContain("sidebar");
    overlay.close();
  });
});

describe("the keyboard arriving on its own", () => {
  // The pane the model names has to be the pane that has the keys however the
  // keys got there. A chord is only one of the routes: a pointer moves the
  // focus without asking the model, and a model that kept saying Sidebar
  // would keep its reader claiming `C-n` and Return from the text — the
  // falsifier the intent writes down.

  it("adopts the editor when the keyboard lands in the text", async () => {
    await mount();
    press(app, "C-x o");
    expect(app.focus.pane).toBe("sidebar");
    const treeCursor = cursorRow(app);
    const treeRows = app.sidebar.rows().map((row) => row.key);

    // What a click in a paragraph does: the content takes DOM focus.
    app.view.contentDOM.focus();

    expect(app.focus.pane).toBe("editor");
    expect(app.sidebar.focused).toBe(false);
    expect(app.sidebar.element.dataset["focused"]).toBe("no");
    expect(modeline(app)).toContain("[Editor]");

    // And the text answers its own chords again: Return inserts a newline,
    // `C-n` moves the point, and the tree does not move at all.
    const line = cursorPosition(app.view).line;
    pressAt(app.view.contentDOM, "Return");
    expect(documentText(app.view)).not.toBe(ALICE);
    expect(documentText(app.view).split("\n").length).toBe(
      ALICE.split("\n").length + 1,
    );
    pressAt(app.view.contentDOM, "C-n");
    expect(cursorPosition(app.view).line).toBeGreaterThan(line);

    expect(cursorRow(app)).toBe(treeCursor);
    expect(app.sidebar.rows().map((row) => row.key)).toEqual(treeRows);
  });

  it("adopts the editor when a click in the text follows a click in the tree", async () => {
    await mount();
    const twisty = app.sidebar.element.querySelector<HTMLElement>(".tree-twisty");
    expect(twisty).not.toBeNull();
    clickAt(twisty as HTMLElement);
    expect(app.focus.pane).toBe("sidebar");

    clickAt(app.view.contentDOM);
    await settle();

    expect(app.focus.pane).toBe("editor");
    expect(modeline(app)).toContain("[Editor]");
    pressAt(app.view.contentDOM, "Return");
    expect(documentText(app.view)).not.toBe(ALICE);
    const line = cursorPosition(app.view).line;
    pressAt(app.view.contentDOM, "C-n");
    expect(cursorPosition(app.view).line).toBeGreaterThan(line);
    expect(app.chapterPath).toBe(ALICE_PATH);
  });

  it("adopts the sidebar when the keyboard lands in the tree", async () => {
    await mount();
    expect(app.focus.pane).toBe("editor");
    const before = documentText(app.view);

    // A click on a row's twisty: the keyboard is in the tree, and the tree
    // is what the chords are for.
    const rows = app.sidebar.rows();
    const bob = rows.find((row) => row.key === `chapter:${BOB_PATH}`);
    const twisty = bob?.element.querySelector<HTMLElement>(".tree-twisty");
    expect(twisty).not.toBeNull();
    clickAt(twisty as HTMLElement);

    expect(app.focus.pane).toBe("sidebar");
    expect(app.sidebar.focused).toBe(true);
    expect(app.sidebar.element.dataset["focused"]).toBe("yes");
    expect(modeline(app)).toContain("[Sidebar]");
    // The cursor is on the row she pointed at, not on the one that was
    // selected: the pointer said where she is.
    expect(cursorRow(app)).toBe(`chapter:${BOB_PATH}`);

    // And the tree answers, while the text is not typed into.
    expect(pressAt(app.sidebar.element, "C-n")).toBe(true);
    expect(cursorRow(app)).not.toBe(`chapter:${BOB_PATH}`);
    expect(documentText(app.view)).toBe(before);
  });

  it("gives the keyboard back to the text when it leaves the tree for nowhere", async () => {
    await mount();
    press(app, "C-x o");
    expect(app.focus.pane).toBe("sidebar");

    // The focus leaves the nav and lands nowhere — a click on the page's own
    // chrome, or a blur.
    app.sidebar.element.blur();
    await settle();

    expect(app.focus.pane).toBe("editor");
    expect(app.sidebar.focused).toBe(false);
    expect(modeline(app)).toContain("[Editor]");
    pressAt(app.view.contentDOM, "Return");
    expect(documentText(app.view)).not.toBe(ALICE);
  });

  it("adopts the panel when the keyboard lands in it and gives it back", async () => {
    await mount();
    const panel = createPublishPanel(publishServices());
    mountPublishPanel(app, panel);
    await panel.open();
    await settle();
    expect(app.focus.pane).toBe("panel");

    app.view.contentDOM.focus();
    expect(app.focus.pane).toBe("editor");
    expect(modeline(app)).toContain("[Editor]");

    panel.destroy();
  });
});

describe("the drawer", () => {
  it("opens the drawer with the keyboard and closes it behind Return", async () => {
    await mount();
    // At 820 CSS pixels the sidebar is a drawer. No width is read here: the
    // media query in `style.css` is the only place one appears, and this is
    // the behaviour underneath it.
    app.sidebar.setOpen(false);
    expect(app.sidebar.open).toBe(false);

    press(app, "C-x o");
    expect(app.sidebar.open).toBe(true);
    expect(app.sidebar.element.dataset["open"]).toBe("yes");

    press(app, "C-n");
    press(app, "Return");
    await settle();

    expect(app.chapterPath).toBe(BOB_PATH);
    expect(app.focus.pane).toBe("editor");
    expect(app.sidebar.open).toBe(false);
    expect(app.sidebar.element.dataset["open"]).toBe("no");
  });

  it("closes the drawer on cancel having changed nothing", async () => {
    await mount();
    app.sidebar.setOpen(false);
    const before = documentText(app.view);

    press(app, "C-x o");
    expect(app.sidebar.open).toBe(true);
    press(app, "C-n");
    press(app, "C-g");

    expect(app.sidebar.open).toBe(false);
    expect(app.focus.pane).toBe("editor");
    expect(app.chapterPath).toBe(ALICE_PATH);
    expect(documentText(app.view)).toBe(before);
    expect(written).toBeNull();
  });

  it("leaves a sidebar that was already open exactly as it was", async () => {
    await mount();
    expect(app.sidebar.open).toBe(true);

    press(app, "C-x o");
    expect(app.sidebar.open).toBe(true);
    press(app, "C-g");
    // At 1280 the column does not move: `takeFocus` opened nothing, so
    // `releaseFocus` closes nothing.
    expect(app.sidebar.open).toBe(true);
  });
});

describe("the network", () => {
  it("attempts no network request while moving between panes", async () => {
    const attempts: string[] = [];
    const originals = {
      fetch: globalThis.fetch,
      xhr: globalThis.XMLHttpRequest,
      beacon: navigator.sendBeacon,
      socket: globalThis.WebSocket,
      source: globalThis.EventSource,
    };
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
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: (url: string) => {
        attempts.push(`beacon ${url}`);
        return false;
      },
    });
    globalThis.WebSocket = class {
      constructor(url: string) {
        attempts.push(`socket ${url}`);
      }
    } as unknown as typeof WebSocket;
    globalThis.EventSource = class {
      constructor(url: string) {
        attempts.push(`source ${url}`);
      }
    } as unknown as typeof EventSource;

    try {
      await mount();
      press(app, "C-x o");
      for (const binding of BINDINGS) {
        if (scopeOf(binding) !== "sidebar") continue;
        for (const chord of binding.chords) press(app, chord);
        await settle();
        if (app.focus.pane === "editor") press(app, "C-x o");
      }
      press(app, bindingById("keys-panel")?.chords[0] ?? "C-h b");
      press(app, "C-x o");
      press(app, "C-x o");
      press(app, "C-x o");
      await settle();
    } finally {
      globalThis.fetch = originals.fetch;
      globalThis.XMLHttpRequest = originals.xhr;
      Object.defineProperty(navigator, "sendBeacon", {
        configurable: true,
        value: originals.beacon,
      });
      globalThis.WebSocket = originals.socket;
      globalThis.EventSource = originals.source;
    }

    expect(attempts).toEqual([]);
  });
});

describe("the panel in the third place", () => {
  it("gives the third place to the most recently opened panel", async () => {
    await mount();
    const panel = createPublishPanel(publishServices());
    mountPublishPanel(app, panel);
    await panel.open();
    expect(app.focus.pane).toBe("panel");
    expect(modeline(app)).toContain("[Publish]");

    // An overlay opened after it wins the place, which is the rule the
    // overlay contract already enforces between two overlays.
    openPalette(app.view);
    expect(modeline(app)).toContain("[Insert]");

    closeOverlay();
    await settle();
    panel.destroy();
  });

  it("gives the third place to a panel reopened after another one", async () => {
    // A panel is registered once at mount and is the same object every time
    // it opens, so "most recently opened" has to be read from the closed→open
    // transition. Stamping it the first time it was ever seen open would
    // leave it behind the panel that opened after it for ever.
    await mount();
    const publish = createPublishPanel(publishServices());
    mountPublishPanel(app, publish);
    const settings = createSettingsPanel(settingsServices());
    mountSettingsPanel(app, settings);

    await publish.open();
    await settle();
    expect(modeline(app)).toContain("[Publish]");

    publish.close();
    await settings.open();
    await settle();
    expect(modeline(app)).toContain("[Settings]");

    await publish.open();
    await settle();
    expect(app.focus.pane).toBe("panel");
    expect(modeline(app)).toContain("[Publish]");

    // And from the editor the cycle still reaches the newer one.
    press(app, "C-x o");
    expect(app.focus.pane).toBe("editor");
    press(app, "C-x o");
    expect(app.focus.pane).toBe("sidebar");
    press(app, "C-x o");
    expect(modeline(app)).toContain("[Publish]");

    publish.destroy();
    settings.destroy();
  });

  it("lets a panel keep its own keys, answering only the chord that leaves it", async () => {
    await mount();
    press(app, bindingById("insert-palette")?.chords[0] ?? "C-c i");
    expect(app.focus.pane).toBe("panel");

    // The palette's own filter field still receives what is typed at it: the
    // reader answers `other-window` in a panel and nothing else.
    const field = document.querySelector<HTMLInputElement>(".palette-field");
    expect(field).not.toBeNull();
    expect(document.activeElement).toBe(field);
    expect(pressAt(field as HTMLInputElement, "a")).toBe(false);

    closeOverlay();
    await settle();
  });
});
