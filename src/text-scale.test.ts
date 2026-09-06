/**
 * The editing surface's type size, from the keyboard.
 *
 * Every criterion of `itd-2609061141039863` a jsdom test can reach. What it
 * cannot reach is what a real keyboard and a real layout engine answer: whether
 * the web view takes `C-=` and `C--` before the page sees them, and how the
 * enlarged text actually wraps at 390 CSS pixels. Both are on the manual
 * checklist for `spc-2609061145242761`.
 */

import type { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp, type App, type AppServices } from "./app";
import { commandEntries, runEntry } from "./command-palette";
import type { Chapter, DocumentTree } from "./doctree";
import { documentText } from "./editor";
import { BINDINGS, bindingById } from "./keys";
import { openKeysPanel } from "./keyspanel";
import { closeOverlay } from "./overlay";
import {
  BASE_FONT_SIZE_PX,
  TEXT_SCALE_LIMIT,
  fontSizeFor,
  percentOf,
  textScaleStep,
} from "./text-scale";

/** The three rows this spec adds, largest first. */
const ROWS = [
  ["text-scale-increase", "C-x C-="],
  ["text-scale-decrease", "C-x C--"],
  ["text-scale-reset", "C-x C-0"],
] as const;

const SAMPLE = ["# Alice and Bob", "", "Carol reads the second line."].join("\n");

/** A chapter with the longest line the intent names, and no trailing newline. */
const LONG_LINE = `A very long line: ${"the quick brown fox jumps over the lazy dog. ".repeat(13)}`
  .slice(0, 543)
  .padEnd(544, ".");
const HAZARDOUS = [
  "# A hazardous chapter",
  "",
  LONG_LINE,
  "",
  "\tA tab-indented note, with trailing space.   ",
  "",
  "Last line, no trailing newline.",
].join("\n");

/** The physical key each chord name in this file sits on. */
const CODES: Readonly<Record<string, string>> = {
  "=": "Equal",
  "-": "Minus",
  "0": "Digit0",
  "/": "Slash",
  x: "KeyX",
  g: "KeyG",
  a: "KeyA",
};

/** Dispatch one chord step at the surface; true when the page claimed it. */
function press(view: EditorView, chord: string): boolean {
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
  const event = new KeyboardEvent("keydown", {
    key: name,
    code: CODES[name] ?? name,
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

/** Dispatch every step of a chord, in order. */
function pressSequence(view: EditorView, chord: string): boolean {
  let claimed = false;
  for (const step of chord.split(" ")) claimed = press(view, step);
  return claimed;
}

/** The size the browser would draw an element at. */
function sizeOf(element: Element): string {
  return getComputedStyle(element).fontSize;
}

/** What the modeline is saying. */
function saying(app: App): string {
  return (
    app.modeline.element.querySelector(".modeline-message")?.textContent ?? ""
  );
}

/** Where the modeline says the cursor is. */
function position(app: App): string {
  return (
    app.modeline.element.querySelector(".modeline-position")?.textContent ?? ""
  );
}

/** Every style rule in the page that sets a given font size. */
function rulesSetting(size: string): CSSStyleRule[] {
  const found: CSSStyleRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSStyleRule &&
        rule.style.getPropertyValue("font-size") === size
      ) {
        found.push(rule);
      }
    }
  }
  return found;
}

function chapter(name: string, title: string, path: string): Chapter {
  return { name, title, path, order: 1, bytes: 0, modified: null };
}

function documentTree(title: string, chapters: readonly Chapter[]): DocumentTree {
  return {
    root: {
      name: title,
      title,
      path: title,
      order: null,
      parts: [],
      chapters: [...chapters],
      truncated: false,
    },
    failures: [],
  };
}

describe("the text-scale rows", () => {
  it("gives each row a label, a chord, and a place in the control group", () => {
    for (const [id, chord] of ROWS) {
      const binding = bindingById(id);
      expect(binding?.chords, id).toEqual([chord]);
      expect(binding?.label.length, id).toBeGreaterThan(0);
      expect(binding?.group, id).toBe("control");
      expect(binding?.owner, id).toBe("editor");
    }
  });

  it("leaves the bare chords to redo and to nothing", () => {
    // `C--` is redo's, and stays redo's; `C-=` is claimed by no row at all,
    // which is what taking the three chords behind `C-x` bought.
    expect(bindingById("redo")?.chords).toContain("C--");
    const claimed = BINDINGS.flatMap((binding) => binding.chords);
    expect(claimed).not.toContain("C-=");
    expect(claimed).not.toContain("C-0");
  });
});

describe("the scale itself", () => {
  it("steps by 1.2 and lands on the default to the pixel", () => {
    expect(fontSizeFor(0)).toBe(`${String(BASE_FONT_SIZE_PX)}px`);
    expect(fontSizeFor(1)).toBe("16.8px");
    expect(parseFloat(fontSizeFor(1)) / parseFloat(fontSizeFor(0))).toBeCloseTo(1.2, 10);
    expect(parseFloat(fontSizeFor(2)) / parseFloat(fontSizeFor(1))).toBeCloseTo(1.2, 3);
  });

  it("reaches the range the intent names, and no further", () => {
    expect(percentOf(TEXT_SCALE_LIMIT)).toBe(249);
    expect(percentOf(-TEXT_SCALE_LIMIT)).toBe(40);
    expect(percentOf(0)).toBe(100);
  });
});

describe("scaling the editing surface", () => {
  let host: HTMLElement;
  let app: App;
  let written: { path: string; text: string } | null;
  let scaleWrites: number[];
  let storedScale: number;
  let chapterText: string;

  const only = chapter("01-alice.md", "alice", "document/01-alice.md");

  function services(): AppServices {
    return {
      chooseFolder: () => Promise.resolve(null),
      openFolder: (path) =>
        Promise.resolve(path === "document" ? documentTree("document", [only]) : documentTree(path, [])),
      readChapter: () => Promise.resolve(chapterText),
      writeChapter: (path, text) => {
        written = { path, text };
        return Promise.resolve();
      },
      confirmDiscard: () => Promise.resolve(true),
      readTextScale: () => Promise.resolve(storedScale),
      writeTextScale: (steps) => {
        scaleWrites.push(steps);
        return Promise.resolve();
      },
    };
  }

  beforeEach(() => {
    written = null;
    scaleWrites = [];
    storedScale = 0;
    chapterText = SAMPLE;
    host = document.createElement("div");
    document.body.append(host);
    app = createApp(host, services());
  });

  afterEach(() => {
    closeOverlay();
    app.destroy();
    host.remove();
    vi.useRealTimers();
  });

  it("enlarges the surface by 1.2 and moves nothing else on the page", () => {
    const before = {
      surface: sizeOf(app.view.dom),
      sidebar: sizeOf(app.sidebar.element),
      modeline: sizeOf(app.modeline.element),
      body: sizeOf(document.body),
    };
    expect(before.surface).toBe("14px");

    expect(pressSequence(app.view, "C-x C-=")).toBe(true);

    expect(sizeOf(app.view.dom)).toBe("16.8px");
    expect(parseFloat(sizeOf(app.view.dom)) / parseFloat(before.surface)).toBeCloseTo(1.2, 10);
    expect(sizeOf(app.sidebar.element)).toBe(before.sidebar);
    expect(sizeOf(app.modeline.element)).toBe(before.modeline);
    expect(sizeOf(document.body)).toBe(before.body);

    // And the rule that did it can only ever reach the surface: every style
    // rule in the page setting the new size matches the editor element and
    // matches nothing beside it.
    const rules = rulesSetting("16.8px");
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(app.view.dom.matches(rule.selectorText), rule.selectorText).toBe(true);
      expect(app.sidebar.element.matches(rule.selectorText)).toBe(false);
      expect(app.modeline.element.matches(rule.selectorText)).toBe(false);
    }
  });

  it("shrinks the surface on C-x C-- and leaves redo where it was", () => {
    expect(pressSequence(app.view, "C-x C--")).toBe(true);
    expect(textScaleStep(app.view)).toBe(-1);
    expect(sizeOf(app.view.dom)).toBe(fontSizeFor(-1));
  });

  it("returns to the default size to the pixel", () => {
    pressSequence(app.view, "C-x C-=");
    pressSequence(app.view, "C-x C-=");
    pressSequence(app.view, "C-x C--");
    expect(textScaleStep(app.view)).toBe(1);

    // `C-x C-0` is the one chord the shipped Emacs package reads as the start
    // of a numeric argument before it consults its own prefix chain.
    expect(pressSequence(app.view, "C-x C-0")).toBe(true);
    expect(textScaleStep(app.view)).toBe(0);
    expect(sizeOf(app.view.dom)).toBe("14px");
    expect(sizeOf(app.view.dom)).toBe(fontSizeFor(0));
  });

  it("shows the scale in the modeline and then clears it", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    pressSequence(app.view, "C-x C-=");
    expect(saying(app)).toBe("Text scale 120%");
    // The position and the mark never left; only the message cell spoke.
    expect(position(app)).toBe("L1:C1");
    vi.advanceTimersByTime(1500);
    expect(saying(app)).toBe("");
    expect(position(app)).toBe("L1:C1");
  });

  it("stops at the largest step and says so", () => {
    for (let at = 0; at < TEXT_SCALE_LIMIT; at += 1) {
      pressSequence(app.view, "C-x C-=");
    }
    expect(textScaleStep(app.view)).toBe(TEXT_SCALE_LIMIT);
    const size = sizeOf(app.view.dom);
    const writes = scaleWrites.length;

    pressSequence(app.view, "C-x C-=");
    expect(textScaleStep(app.view)).toBe(TEXT_SCALE_LIMIT);
    expect(sizeOf(app.view.dom)).toBe(size);
    expect(saying(app)).toBe("Text scale 249%, the largest step");
    // Nothing moved, so nothing is remembered.
    expect(scaleWrites.length).toBe(writes);
  });

  it("stops at the smallest step and says so", () => {
    for (let at = 0; at < TEXT_SCALE_LIMIT; at += 1) {
      pressSequence(app.view, "C-x C--");
    }
    expect(textScaleStep(app.view)).toBe(-TEXT_SCALE_LIMIT);
    const size = sizeOf(app.view.dom);

    pressSequence(app.view, "C-x C--");
    expect(textScaleStep(app.view)).toBe(-TEXT_SCALE_LIMIT);
    expect(sizeOf(app.view.dom)).toBe(size);
    expect(saying(app)).toBe("Text scale 40%, the smallest step");
  });

  it("leaves redo on C-- and leaves C-= unbound", async () => {
    await app.openChapter(only);
    app.view.dispatch({ changes: { from: 0, insert: "Bob " } });
    expect(documentText(app.view)).toContain("Bob ");
    press(app.view, "C-/");
    expect(documentText(app.view)).toBe(SAMPLE);

    const size = sizeOf(app.view.dom);
    press(app.view, "C--");
    expect(documentText(app.view)).toContain("Bob ");
    expect(sizeOf(app.view.dom)).toBe(size);
    expect(textScaleStep(app.view)).toBe(0);

    press(app.view, "C-=");
    expect(sizeOf(app.view.dom)).toBe(size);
    expect(textScaleStep(app.view)).toBe(0);
  });

  it("changes not one byte of the open chapter", async () => {
    chapterText = HAZARDOUS;
    await app.openChapter(only);
    expect(documentText(app.view)).toBe(HAZARDOUS);
    expect(app.dirty).toBe(false);

    pressSequence(app.view, "C-x C-=");
    pressSequence(app.view, "C-x C--");
    pressSequence(app.view, "C-x C-0");

    expect(documentText(app.view)).toBe(HAZARDOUS);
    expect(app.dirty).toBe(false);
    // Nothing was written to the chapter, and there is no route from here to
    // `document.yaml` at all: the scale went to the settings and nowhere else.
    expect(written).toBeNull();
    // Up, down, and a restore that had nothing left to restore: the third
    // chord moved nothing, so it remembered nothing.
    expect(scaleWrites).toEqual([1, 0]);
  });

  it("writes the scale through the shell's settings and into no chapter", async () => {
    await app.openChapter(only);
    pressSequence(app.view, "C-x C-=");
    pressSequence(app.view, "C-x C-=");
    expect(scaleWrites).toEqual([1, 2]);
    expect(written).toBeNull();
  });

  it("carries the scale across a chapter change", async () => {
    pressSequence(app.view, "C-x C-=");
    pressSequence(app.view, "C-x C-=");
    await app.openChapter(only);
    expect(textScaleStep(app.view)).toBe(2);
    expect(sizeOf(app.view.dom)).toBe(fontSizeFor(2));
  });

  it("keeps the surface wrapping at every step", async () => {
    chapterText = HAZARDOUS;
    await app.openChapter(only);
    const longest = HAZARDOUS.split("\n").reduce(
      (found, line) => (line.length > found ? line.length : found),
      0,
    );
    expect(longest).toBe(544);
    for (let at = 0; at < 2; at += 1) {
      pressSequence(app.view, "C-x C-=");
      // Wrapping is the property that keeps a long line off a sideways
      // scrollbar; jsdom has no layout engine, so the manual check at 390 CSS
      // pixels is what proves the rest.
      expect(app.view.contentDOM.classList.contains("cm-lineWrapping")).toBe(true);
    }
  });

  it("lists three labelled rows in the keys panel and in M-x", () => {
    const panel = openKeysPanel(document.body);
    const entries = commandEntries();
    for (const [id] of ROWS) {
      const row = panel.element.querySelector(`[data-binding="${id}"]`);
      expect(row?.textContent, id).toBe(bindingById(id)?.label);
      const entry = entries.find((candidate) => candidate.id === id);
      expect(entry?.label, id).toBe(bindingById(id)?.label);
    }
    panel.close();
  });

  it("runs each row from M-x with the effect of its chord", () => {
    const entries = commandEntries();
    const entryFor = (id: string): (typeof entries)[number] => {
      const found = entries.find((candidate) => candidate.id === id);
      if (!found) throw new Error(`${id} is not offered by M-x`);
      return found;
    };

    runEntry(app.view, entryFor("text-scale-increase"));
    runEntry(app.view, entryFor("text-scale-increase"));
    expect(textScaleStep(app.view)).toBe(2);
    expect(sizeOf(app.view.dom)).toBe(fontSizeFor(2));

    runEntry(app.view, entryFor("text-scale-decrease"));
    expect(textScaleStep(app.view)).toBe(1);

    runEntry(app.view, entryFor("text-scale-reset"));
    expect(textScaleStep(app.view)).toBe(0);
    expect(sizeOf(app.view.dom)).toBe("14px");
  });
});

describe("the scale this machine was left at", () => {
  let host: HTMLElement;
  let app: App | null;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    app = null;
  });

  afterEach(() => {
    app?.destroy();
    host.remove();
  });

  /** Mount an application whose shell answers with a stored scale. */
  function mount(stored: number | Promise<number>): App {
    return createApp(host, {
      chooseFolder: () => Promise.resolve(null),
      openFolder: (path) => Promise.resolve(documentTree(path, [])),
      readChapter: () => Promise.resolve(SAMPLE),
      writeChapter: () => Promise.resolve(),
      confirmDiscard: () => Promise.resolve(true),
      readTextScale: () => Promise.resolve(stored),
      writeTextScale: () => Promise.resolve(),
    });
  }

  it("opens at the scale the shell remembers", async () => {
    app = mount(2);
    await Promise.resolve();
    await Promise.resolve();
    expect(textScaleStep(app.view)).toBe(2);
    expect(sizeOf(app.view.dom)).toBe(fontSizeFor(2));
    // And nothing was said about it: Alice pressed nothing.
    expect(saying(app)).toBe("");
  });

  it("opens at the default when the shell has nothing to say", async () => {
    app = mount(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(textScaleStep(app.view)).toBe(0);
    expect(sizeOf(app.view.dom)).toBe("14px");
  });

  it("clamps a stored scale outside the range rather than obeying it", async () => {
    const warnings: unknown[] = [];
    const warn = console.warn;
    console.warn = (...args: unknown[]): void => {
      warnings.push(args[0]);
    };
    try {
      app = mount(40);
      await Promise.resolve();
      await Promise.resolve();
    } finally {
      console.warn = warn;
    }
    expect(textScaleStep(app!.view)).toBe(TEXT_SCALE_LIMIT);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("the network", () => {
  it("attempts no network request while scaling", async () => {
    const attempts: string[] = [];
    const originals = { fetch: globalThis.fetch, xhr: globalThis.XMLHttpRequest };
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

    const host = document.createElement("div");
    document.body.append(host);
    try {
      const app = createApp(host, {
        chooseFolder: () => Promise.resolve(null),
        openFolder: (path) => Promise.resolve(documentTree(path, [])),
        readChapter: () => Promise.resolve(SAMPLE),
        writeChapter: () => Promise.resolve(),
        confirmDiscard: () => Promise.resolve(true),
        readTextScale: () => Promise.resolve(0),
        writeTextScale: () => Promise.resolve(),
      });
      await Promise.resolve();
      for (const [, chord] of ROWS) {
        for (let at = 0; at < 3; at += 1) pressSequence(app.view, chord);
      }
      app.destroy();
    } finally {
      globalThis.fetch = originals.fetch;
      globalThis.XMLHttpRequest = originals.xhr;
      host.remove();
    }

    expect(attempts).toEqual([]);
  });
});
