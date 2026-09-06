/**
 * The reader-controls toolbar (spc-2609061318154502, map #10): theme, text
 * size, measure, and a reset, each read and written through `localStorage`
 * alone. `itd-2609051336145770` forbids the site storing anything about a
 * reader, so the network assertion below is the discipline's own proof:
 * nothing here is ever a request. The article carries `article.css` and this
 * script only — the fixture body below is synthetic, never a real document.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { articleDocument } from "../../publish/build";

const SOURCE = readFileSync(join(__dirname, "article-controls.js"), "utf8");
const STYLESHEET = readFileSync(join(__dirname, "article.css"), "utf8");

type Theme = "light" | "dark" | "sepia";
type TextSize = "smaller" | "default" | "larger";
type Measure = "narrow" | "normal" | "wide";

interface Choice {
  theme: Theme;
  textSize: TextSize;
  measure: Measure;
}

interface ArticleControlsApi {
  boot(): void;
  readonly STORAGE_KEY: string;
  readonly DEFAULTS: Choice;
}

/**
 * A synthetic body: one paragraph and the margin note that follows it, the
 * shape `article.ts` writes (spc-2609061318090042: a note is the block's own
 * next sibling). Fixture content only.
 */
const BODY = [
  "<article>",
  '<h1 id="c1-opening">Opening</h1>',
  "<p>Alice writes a short paragraph for Bob to read.</p>",
  '<aside class="margin-note footnote">A note for Bob.</aside>',
  "</article>",
].join("");

/** The real page shape `articleDocument` builds, mounted onto this document. */
function mountArticle(): void {
  const html = articleDocument("Fixture", BODY, "chrome");
  const page = new DOMParser().parseFromString(html, "text/html");
  document.documentElement.innerHTML = page.documentElement.innerHTML;
}

/**
 * A cast rather than a global `Window` augmentation: `article-video.test.ts`
 * already augments it with the video script's own fuller shape, and a
 * second, narrower declaration for the same global is a TypeScript error,
 * not an override (the same lesson `src/preview.ts` records for its own
 * read of `ArticleVideo`).
 */
type Bag = {
  ArticleControls?: ArticleControlsApi;
  ArticlePage?: unknown;
  ARTICLE_PAGE_MANUAL?: boolean;
};

function bag(): Bag {
  return window as unknown as Bag;
}

/** Load the shipped script with no automatic boot, so a test drives it. */
function load(): ArticleControlsApi {
  bag().ARTICLE_PAGE_MANUAL = true;
  delete bag().ArticleControls;
  delete bag().ArticlePage;
  new Function(SOURCE)();
  const controls = bag().ArticleControls;
  if (controls === undefined) {
    throw new Error("article-controls.js did not install ArticleControls");
  }
  return controls;
}

function button(control: string, value: string): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    `button[data-control="${control}"][data-value="${value}"]`,
  );
  if (found === null) throw new Error(`no ${control}/${value} button in the toolbar`);
  return found;
}

function reset(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(".article-controls-reset");
  if (found === null) throw new Error("no reset button in the toolbar");
  return found;
}

/** A storage that throws on every call: a browser with it switched off. */
function unavailableStorage(): Storage {
  const boom = (): never => {
    throw new DOMException("storage is unavailable", "SecurityError");
  };
  return {
    getItem: boom,
    setItem: boom,
    removeItem: boom,
    clear: boom,
    key: boom,
    length: 0,
  } as Storage;
}

let realLocalStorage: Storage;

beforeEach(() => {
  realLocalStorage = window.localStorage;
  mountArticle();
  window.localStorage.clear();
});

afterEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: realLocalStorage,
  });
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the toolbar the article's own script builds", () => {
  it("does not exist until the script runs: the article reads with no toolbar and the article's own defaults", () => {
    expect(document.querySelector(".article-controls")).toBeNull();
    expect(document.documentElement.hasAttribute("data-article-theme")).toBe(false);
  });

  it("offers theme, text size, measure and a reset, with the article's defaults pressed", () => {
    const controls = load();
    controls.boot();
    expect(document.querySelector(".article-controls")).not.toBeNull();
    const pressedByDefault: [string, string][] = [
      ["theme", "light"],
      ["text-size", "default"],
      ["measure", "normal"],
    ];
    for (const [control, value] of pressedByDefault) {
      expect(button(control, value).getAttribute("aria-pressed")).toBe("true");
    }
    const pressedNeverByDefault: [string, string][] = [
      ["theme", "dark"],
      ["theme", "sepia"],
      ["text-size", "smaller"],
      ["text-size", "larger"],
      ["measure", "narrow"],
      ["measure", "wide"],
    ];
    for (const [control, value] of pressedNeverByDefault) {
      expect(button(control, value).getAttribute("aria-pressed")).toBe("false");
    }
    expect(reset()).not.toBeNull();
  });

  it("every control is a native, labelled button, never a widget with no name or state", () => {
    load().boot();
    const groups = document.querySelectorAll("fieldset.article-controls-group");
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      expect(group.querySelector("legend")?.textContent).not.toBe("");
      for (const control of group.querySelectorAll("button")) {
        expect(control.getAttribute("type")).toBe("button");
        expect(control.hasAttribute("aria-pressed")).toBe(true);
        expect(control.textContent).not.toBe("");
      }
    }
  });
});

describe("choosing a control", () => {
  it("sets the theme's data attribute on the root element, and shows the choice as pressed", () => {
    load().boot();
    button("theme", "dark").click();
    expect(document.documentElement.getAttribute("data-article-theme")).toBe("dark");
    expect(button("theme", "dark").getAttribute("aria-pressed")).toBe("true");
    expect(button("theme", "light").getAttribute("aria-pressed")).toBe("false");
  });

  it("sets --article-text-scale from the text-size control, and clears it again for the default step", () => {
    load().boot();
    button("text-size", "larger").click();
    expect(document.documentElement.style.getPropertyValue("--article-text-scale")).toBe("1.25");
    button("text-size", "smaller").click();
    expect(document.documentElement.style.getPropertyValue("--article-text-scale")).toBe("0.875");
    button("text-size", "default").click();
    // No override left behind: article.css's own `--article-text-scale: 1`
    // answers it once the property is cleared rather than repeated here.
    expect(document.documentElement.style.getPropertyValue("--article-text-scale")).toBe("");
  });

  it("sets --article-measure from the measure control, never as a fixed pixel width", () => {
    load().boot();
    button("measure", "wide").click();
    const wide = document.documentElement.style.getPropertyValue("--article-measure");
    expect(wide).toMatch(/^\d+(\.\d+)?(rem|em|ch)$/);
    button("measure", "narrow").click();
    const narrow = document.documentElement.style.getPropertyValue("--article-measure");
    expect(narrow).toMatch(/^\d+(\.\d+)?(rem|em|ch)$/);
    button("measure", "normal").click();
    expect(document.documentElement.style.getPropertyValue("--article-measure")).toBe("");
  });

  it("persists the choice in localStorage under one key", () => {
    load().boot();
    button("theme", "sepia").click();
    button("measure", "narrow").click();
    const raw = window.localStorage.getItem("editor-article-reader-preferences");
    expect(raw).not.toBeNull();
    const stored: Choice = JSON.parse(raw ?? "{}") as Choice;
    expect(stored).toEqual({ theme: "sepia", textSize: "default", measure: "narrow" });
  });
});

describe("reloading in the same browser", () => {
  it("keeps the larger text size, and shows it as the toolbar's current choice", () => {
    load().boot();
    button("text-size", "larger").click();

    // A reload: a fresh page, a fresh script instance, the same storage.
    mountArticle();
    const controls = load();
    controls.boot();

    expect(document.documentElement.style.getPropertyValue("--article-text-scale")).toBe("1.25");
    expect(button("text-size", "larger").getAttribute("aria-pressed")).toBe("true");
  });

  it("renders at the defaults in a second browser, which never saw the first browser's choice", () => {
    load().boot();
    button("theme", "dark").click();

    // A second browser: the same document, an empty storage.
    window.localStorage.clear();
    mountArticle();
    const controls = load();
    controls.boot();

    expect(document.documentElement.getAttribute("data-article-theme")).toBe("light");
    expect(button("theme", "light").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("reset", () => {
  it("returns theme, text size and measure to the article's defaults, and a reload keeps them", () => {
    load().boot();
    button("theme", "sepia").click();
    button("text-size", "larger").click();
    button("measure", "narrow").click();

    reset().click();

    expect(document.documentElement.getAttribute("data-article-theme")).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--article-text-scale")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--article-measure")).toBe("");
    const pressedAfterReset: [string, string][] = [
      ["theme", "light"],
      ["text-size", "default"],
      ["measure", "normal"],
    ];
    for (const [control, value] of pressedAfterReset) {
      expect(button(control, value).getAttribute("aria-pressed")).toBe("true");
    }

    // Clears the stored value: nothing is left for a reload to find.
    expect(window.localStorage.getItem("editor-article-reader-preferences")).toBeNull();
    mountArticle();
    const controls = load();
    controls.boot();
    expect(document.documentElement.getAttribute("data-article-theme")).toBe("light");
  });
});

describe("no reader preference ever leaves the browser", () => {
  it("calls neither fetch nor XMLHttpRequest while every control and reset is exercised", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, "open");

    const controls = load();
    controls.boot();
    button("theme", "dark").click();
    button("text-size", "larger").click();
    button("measure", "wide").click();
    reset().click();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
  });
});

describe("a browser where storage is unavailable or has been cleared", () => {
  it("applies the change for the visit, shows no error, and renders at the defaults on the next load", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: unavailableStorage(),
    });

    const controls = load();
    expect(() => controls.boot()).not.toThrow();
    expect(() => button("theme", "dark").click()).not.toThrow();
    expect(document.documentElement.getAttribute("data-article-theme")).toBe("dark");
    expect(button("theme", "dark").getAttribute("aria-pressed")).toBe("true");

    // The next load: the same broken storage, nothing survived the visit.
    mountArticle();
    const again = load();
    expect(() => again.boot()).not.toThrow();
    expect(document.documentElement.getAttribute("data-article-theme")).toBe("light");
  });
});

describe("legibility: the measure and the toolbar hold no fixed pixel width", () => {
  it("declares no width in article.css's toolbar section as a bare pixel value", () => {
    const section = STYLESHEET.slice(STYLESHEET.indexOf("article-controls"));
    expect(section).not.toMatch(/(?<!max-)width:\s*\d+px/);
  });

  it("caps the toolbar's own width by the viewport rather than a fixed size", () => {
    const section = STYLESHEET.slice(STYLESHEET.indexOf(".article-controls {"));
    expect(section).toMatch(/max-width:\s*calc\(100vw/);
  });
});

/** WCAG relative luminance of one sRGB channel, 0-255. */
function linearChannel(byte: number): number {
  const c = byte / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexOf(section: string, property: string): string {
  const match = new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6})`).exec(section);
  if (match?.[1] === undefined) {
    throw new Error(`article.css names no ${property} in this theme's section`);
  }
  return match[1];
}

describe("the dark and sepia themes meet a plain contrast floor (itd-2609061324342715)", () => {
  it.each(["dark", "sepia"] as const)("body text contrasts at least 4.5:1 in the %s theme", (theme) => {
    const marker = `[data-article-theme="${theme}"] {`;
    const start = STYLESHEET.indexOf(marker);
    expect(start, `article.css names no ${theme} theme`).toBeGreaterThan(-1);
    const section = STYLESHEET.slice(start, STYLESHEET.indexOf("}", start));
    const bg = hexOf(section, "--article-bg");
    const fg = hexOf(section, "--article-fg");
    expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });
});
