/**
 * `spc-2609061318158216` (map #26): moving through the article by keyboard.
 *
 * The article carries `article-keys.js`, its own `<script
 * type="application/json" id="article-keys-data">` block, and nothing
 * else this file needs — the fixture body below is synthetic, in the shape
 * `src/core/render/article.ts` writes for two Parts of two Chapters each
 * (headings, a document-wide contents list, and paragraphs a search can
 * find), never a real document under `examples/`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chordFromEvent as tsChordFromEvent } from "../../keys";
import { articleDocument } from "../../publish/build";
import { CHORD_MAPPING_FIXTURE } from "./chord-mapping.fixture";
import { READING_KEYS_DATA_ID } from "./reading-keys";

const SOURCE = readFileSync(join(__dirname, "article-keys.js"), "utf8");
const STYLESHEET = readFileSync(join(__dirname, "article.css"), "utf8");

/**
 * Two Parts, four Chapters, headings to three levels, and one word —
 * "lantern" — repeated three times across three different paragraphs, for
 * the search criterion. The exact shape `article.ts` writes: a document-wide
 * `<nav class="contents">` grouped by Part, each Chapter its own `<article>`
 * with a flat run of headings and blocks.
 */
const NAV = [
  '<nav class="contents"><ol>',
  '<li><span class="part">Front matter</span><ol>',
  '<li><a href="#c1-opening">Opening</a><ol>',
  '<li><a href="#c1-first-section">First section</a></li>',
  "</ol></li>",
  '<li><a href="#c2-second-chapter">Second chapter</a></li>',
  "</ol></li>",
  '<li><span class="part">Back matter</span><ol>',
  '<li><a href="#c3-third-chapter">Third chapter</a><ol>',
  '<li><a href="#c3-sub">Sub heading</a></li>',
  "</ol></li>",
  '<li><a href="#c4-fourth-chapter">Fourth chapter</a></li>',
  "</ol></li>",
  "</ol></nav>",
].join("");

const ARTICLES = [
  '<article><h1 id="c1-opening">Opening</h1>',
  "<p>Alice opens with a short paragraph.</p>",
  '<h2 id="c1-first-section">First section</h2>',
  "<p>The first section mentions a lantern once.</p>",
  "<p>The first section's second paragraph.</p></article>",
  '<article><h1 id="c2-second-chapter">Second chapter</h1>',
  "<p>Bob reads on, and the lantern is mentioned again here.</p></article>",
  '<article><h1 id="c3-third-chapter">Third chapter</h1>',
  "<p>Some third-chapter prose.</p>",
  '<h2 id="c3-sub">Sub heading</h2>',
  "<p>A third lantern mention sits under the sub heading.</p></article>",
  '<article><h1 id="c4-fourth-chapter">Fourth chapter</h1>',
  "<p>The fourth chapter's own paragraph.</p></article>",
].join("");

const BODY = NAV + ARTICLES;

function mountArticle(): void {
  const html = articleDocument("Fixture", BODY, "chrome");
  const page = new DOMParser().parseFromString(html, "text/html");
  document.documentElement.innerHTML = page.documentElement.innerHTML;
}

interface ArticleKeysApi {
  boot(): void;
  chordFromEvent(event: KeyboardEvent): string;
  state(): { sectionIndex: number; itemIndex: number; overlay: string | null };
  dispose(): void;
}

type Bag = {
  ArticleKeys?: ArticleKeysApi;
  ArticlePage?: unknown;
  ARTICLE_PAGE_MANUAL?: boolean;
};

function bag(): Bag {
  return window as unknown as Bag;
}

/** Load the shipped script with no automatic boot, so a test drives it. */
function load(): ArticleKeysApi {
  // Retire the previous test's own copy first: each `load()` evaluates a
  // fresh closure with its own document-level `keydown` listener, and
  // `mountArticle`'s `innerHTML` reset does not touch a listener bound to
  // `document` itself.
  bag().ArticleKeys?.dispose();
  bag().ARTICLE_PAGE_MANUAL = true;
  delete bag().ArticleKeys;
  delete bag().ArticlePage;
  new Function(SOURCE)();
  const keys = bag().ArticleKeys;
  if (keys === undefined) throw new Error("article-keys.js did not install ArticleKeys");
  return keys;
}

function press(
  chord: {
    code: string;
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  },
  target: EventTarget = document,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    code: chord.code,
    key: chord.key,
    ctrlKey: chord.ctrlKey ?? false,
    altKey: chord.altKey ?? false,
    metaKey: chord.metaKey ?? false,
    shiftKey: chord.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

const NEXT_SECTION = { code: "KeyC", key: "c", ctrlKey: true }; // C-c, first step
const NEXT_SECTION_2 = { code: "KeyN", key: "n", ctrlKey: true }; // C-n, second step -> C-c C-n
const PREV_SECTION_2 = { code: "KeyP", key: "p" }; // p -> C-c p
const NEXT_ITEM = { code: "KeyN", key: "n", ctrlKey: true }; // C-n
const PREV_ITEM = { code: "KeyP", key: "p", ctrlKey: true }; // C-p
const CONTENTS_1 = { code: "KeyS", key: "s", altKey: true }; // M-s, first step
const CONTENTS_2 = { code: "KeyO", key: "o" }; // o -> M-s o
const SEARCH_FORWARD = { code: "KeyS", key: "s", ctrlKey: true }; // C-s
const SEARCH_BACKWARD = { code: "KeyR", key: "r", ctrlKey: true }; // C-r
const CANCEL_G = { code: "KeyG", key: "g", ctrlKey: true }; // C-g
const CANCEL_ESC = { code: "Escape", key: "Escape" }; // Escape
const KEYS_PANEL_1 = { code: "KeyH", key: "h", ctrlKey: true }; // C-h, first step
const KEYS_PANEL_2 = { code: "KeyB", key: "b" }; // b -> C-h b
const RETURN = { code: "Enter", key: "Enter" };
const UNHONOURED = { code: "KeyK", key: "k", ctrlKey: true }; // C-k, kill-line — not honoured

function pressPrefixed(
  first: { code: string; key: string; ctrlKey?: boolean; altKey?: boolean },
  second: { code: string; key: string },
): void {
  press(first);
  press(second);
}

beforeEach(() => {
  mountArticle();
});

afterEach(() => {
  bag().ArticleKeys?.dispose();
  document.documentElement.innerHTML = "<head></head><body></body>";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("wiring", () => {
  it("carries its own script tag and its data block, in the built page", () => {
    expect(document.querySelector('script[src$="article-keys.js"]')).not.toBeNull();
    const script = document.getElementById(READING_KEYS_DATA_ID);
    expect(script).not.toBeNull();
    expect(script?.getAttribute("type")).toBe("application/json");
    const rows = JSON.parse(script?.textContent ?? "[]") as { id: string }[];
    expect(rows.map((row) => row.id)).toContain("outline-next-heading");
  });

  it("installs ArticleKeys once loaded", () => {
    const keys = load();
    keys.boot();
    expect(bag().ArticleKeys).toBe(keys);
  });
});

describe("the chord mapping", () => {
  it("agrees with src/keys.ts's chordFromEvent over the shared fixture", () => {
    const keys = load();
    for (const fixture of CHORD_MAPPING_FIXTURE) {
      const event = new KeyboardEvent("keydown", {
        code: fixture.code,
        key: fixture.key,
        ctrlKey: fixture.ctrlKey ?? false,
        altKey: fixture.altKey ?? false,
        metaKey: fixture.metaKey ?? false,
        shiftKey: fixture.shiftKey ?? false,
      });
      const fromScript = keys.chordFromEvent(event);
      const fromTable = tsChordFromEvent(event);
      expect(fromScript, fixture.description).toBe(fixture.expected);
      expect(fromTable, fixture.description).toBe(fixture.expected);
      expect(fromScript, `${fixture.description}: script and table disagree`).toBe(fromTable);
    }
  });
});

describe("moving by Section", () => {
  it("moves to each heading in document order, and back, from the top of the page", () => {
    const keys = load();
    keys.boot();

    const order = [
      "c1-opening",
      "c1-first-section",
      "c2-second-chapter",
      "c3-third-chapter",
      "c3-sub",
      "c4-fourth-chapter",
    ];
    for (const id of order) {
      pressPrefixed(NEXT_SECTION, NEXT_SECTION_2);
      expect(document.activeElement?.id).toBe(id);
    }
    for (const id of [...order].reverse().slice(1)) {
      pressPrefixed(NEXT_SECTION, PREV_SECTION_2);
      expect(document.activeElement?.id).toBe(id);
    }
  });

  it("starting with no Section chosen, previous opens at the last heading and next at the first", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(NEXT_SECTION, PREV_SECTION_2);
    expect(document.activeElement?.id).toBe("c4-fourth-chapter");
  });

  it("refuses past the last heading, matching the editor's own outline-next-heading (Fable F28)", () => {
    const keys = load();
    keys.boot();
    for (let step = 0; step < 6; step += 1) {
      pressPrefixed(NEXT_SECTION, NEXT_SECTION_2);
    }
    expect(document.activeElement?.id).toBe("c4-fourth-chapter");
    const before = keys.state().sectionIndex;
    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2);
    // Stayed put: no wrap to the first heading.
    expect(keys.state().sectionIndex).toBe(before);
    expect(document.activeElement?.id).toBe("c4-fourth-chapter");
  });

  it("refuses before the first heading, matching the editor's own outline-previous-heading (Fable F28)", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2);
    expect(document.activeElement?.id).toBe("c1-opening");
    pressPrefixed(NEXT_SECTION, PREV_SECTION_2);
    // Stayed at the first heading: no wrap to the last.
    expect(document.activeElement?.id).toBe("c1-opening");
  });
});

describe("moving by item inside a Section", () => {
  it("steps through the blocks between one heading and the next", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2); // -> c1-opening
    press(NEXT_ITEM);
    expect(document.activeElement?.textContent).toBe("Alice opens with a short paragraph.");

    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2); // -> c1-first-section
    press(NEXT_ITEM);
    expect(document.activeElement?.textContent).toBe("The first section mentions a lantern once.");
    press(NEXT_ITEM);
    expect(document.activeElement?.textContent).toBe("The first section's second paragraph.");
    press(PREV_ITEM);
    expect(document.activeElement?.textContent).toBe("The first section mentions a lantern once.");
  });

  it("does nothing before any Section has been chosen", () => {
    const keys = load();
    keys.boot();
    const before = keys.state();
    const activeBefore = document.activeElement;
    press(NEXT_ITEM);
    expect(keys.state()).toEqual(before);
    expect(document.activeElement).toBe(activeBefore);
  });
});

describe("the contents list", () => {
  it("opens listing Parts, Chapters and Sections, moves with the movement chords, and Return jumps and closes", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(CONTENTS_1, CONTENTS_2);
    expect(keys.state().overlay).toBe("contents");

    const overlay = document.querySelector(".article-contents-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain("Front matter");
    expect(overlay?.textContent).toContain("Back matter");
    expect(overlay?.textContent).toContain("Opening");
    expect(overlay?.textContent).toContain("First section");

    // Move to the third row ("Second chapter": Opening, First section, Second chapter).
    press(NEXT_ITEM);
    press(NEXT_ITEM);
    press(RETURN);

    expect(keys.state().overlay).toBeNull();
    expect(document.activeElement?.id).toBe("c2-second-chapter");
  });

  it("does not open when there is nothing to jump to", () => {
    document.querySelector("nav.contents")?.remove();
    const keys = load();
    keys.boot();
    pressPrefixed(CONTENTS_1, CONTENTS_2);
    expect(keys.state().overlay).toBeNull();
  });
});

describe("cancel", () => {
  it("closes the contents list on C-g, keeping the reading position", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2); // c1-opening
    const before = keys.state().sectionIndex;
    pressPrefixed(CONTENTS_1, CONTENTS_2);
    expect(keys.state().overlay).toBe("contents");
    press(CANCEL_G);
    expect(keys.state().overlay).toBeNull();
    expect(keys.state().sectionIndex).toBe(before);
  });

  it("closes the contents list on Escape too", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(CONTENTS_1, CONTENTS_2);
    press(CANCEL_ESC);
    expect(keys.state().overlay).toBeNull();
  });
});

describe("incremental search", () => {
  it("steps forward and backward through three matches, and cancel returns to the paragraph it started from", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2); // -> c1-opening
    const origin = document.activeElement;

    press(SEARCH_FORWARD);
    expect(keys.state().overlay).toBe("search");
    const field = document.querySelector<HTMLInputElement>(".article-search-field");
    expect(field).not.toBeNull();
    field!.value = "lantern";
    field!.dispatchEvent(new Event("input", { bubbles: true }));

    expect(document.activeElement?.textContent).toBe("The first section mentions a lantern once.");
    press(SEARCH_FORWARD, field!);
    expect(document.activeElement?.textContent).toBe(
      "Bob reads on, and the lantern is mentioned again here.",
    );
    press(SEARCH_FORWARD, field!);
    expect(document.activeElement?.textContent).toBe(
      "A third lantern mention sits under the sub heading.",
    );
    press(SEARCH_BACKWARD, field!);
    expect(document.activeElement?.textContent).toBe(
      "Bob reads on, and the lantern is mentioned again here.",
    );

    press(CANCEL_G, field!);
    expect(keys.state().overlay).toBeNull();
    expect(document.activeElement).toBe(origin);
  });

  it("keeps typing in the field for a plain character", () => {
    const keys = load();
    keys.boot();
    press(SEARCH_FORWARD);
    const field = document.querySelector<HTMLInputElement>(".article-search-field")!;
    const event = press({ code: "KeyL", key: "l" }, field);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("the keys panel", () => {
  it("lists every honoured action with its label and chords, and no other action", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(KEYS_PANEL_1, KEYS_PANEL_2);
    expect(keys.state().overlay).toBe("keys");
    const panel = document.querySelector(".article-keys-panel");
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain("Next heading");
    expect(panel?.textContent).toContain("Previous heading");
    expect(panel?.textContent).toContain("Next line");
    expect(panel?.textContent).toContain("Cancel");
    expect(panel?.textContent).toContain("Show the keys panel");
    expect(panel?.querySelectorAll("dt")).toHaveLength(9);
    // Undo is a real row in the binding table, and not one this page honours.
    expect(panel?.textContent).not.toContain("Undo");
  });

  it("opens the same panel from the visible help button, reachable by Tab alone", () => {
    const keys = load();
    keys.boot();
    const button = document.querySelector<HTMLButtonElement>(".article-keys-help");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("type")).toBe("button");
    expect(document.body.firstElementChild).toBe(button);
    button?.click();
    expect(keys.state().overlay).toBe("keys");
  });
});

describe("a chord the reading views do not honour", () => {
  it("does nothing: no overlay, no movement, and the event is left unclaimed", () => {
    const keys = load();
    keys.boot();
    const before = keys.state();
    const event = press(UNHONOURED);
    expect(keys.state()).toEqual(before);
    expect(event.defaultPrevented).toBe(false);
    expect(document.querySelector(".article-contents-overlay, .article-search-panel, .article-keys-panel")).toBeNull();
  });
});

describe("coordination with map #12's own panel", () => {
  it("does nothing but relay C-g as Escape while an egg panel is open", () => {
    const keys = load();
    keys.boot();
    const backdrop = document.createElement("div");
    backdrop.className = "egg-panel-backdrop";
    document.body.append(backdrop);

    const seen: string[] = [];
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") seen.push("escape");
    });

    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2);
    expect(keys.state().sectionIndex).toBe(-1);

    press(CANCEL_G);
    expect(seen.filter((entry) => entry === "escape").length).toBeGreaterThanOrEqual(1);
  });
});

describe("nothing stored, nothing sent (itd-2609051336145770)", () => {
  it("calls neither fetch nor XMLHttpRequest while every action is exercised", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, "open");

    const keys = load();
    keys.boot();
    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2);
    press(NEXT_ITEM);
    pressPrefixed(CONTENTS_1, CONTENTS_2);
    press(CANCEL_ESC);
    press(SEARCH_FORWARD);
    const field = document.querySelector<HTMLInputElement>(".article-search-field")!;
    field.value = "lantern";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    press(CANCEL_G, field);
    pressPrefixed(KEYS_PANEL_1, KEYS_PANEL_2);
    press(CANCEL_ESC);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
  });

  it("keeps a search term in memory only — nothing is left once the panel closes", () => {
    const keys = load();
    keys.boot();
    press(SEARCH_FORWARD);
    const field = document.querySelector<HTMLInputElement>(".article-search-field")!;
    field.value = "lantern";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    press(CANCEL_G, field);
    expect(window.localStorage.length).toBe(0);
    expect(document.querySelector(".article-search-panel")).toBeNull();
  });
});

describe("the browser's own keys are not stolen (iss-2609070642203845, Fable F27)", () => {
  it("never prevents default on bare Down or Up, leaving the browser's own scroll alone", () => {
    const keys = load();
    keys.boot();
    const down = press({ code: "ArrowDown", key: "ArrowDown" });
    expect(down.defaultPrevented).toBe(false);
    const up = press({ code: "ArrowUp", key: "ArrowUp" });
    expect(up.defaultPrevented).toBe(false);
    // Neither moved the reading position: they are simply not honoured here.
    expect(keys.state().itemIndex).toBe(-1);
  });

  it("still moves by item on C-n and C-p", () => {
    const keys = load();
    keys.boot();
    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2); // -> c1-opening
    press(NEXT_ITEM);
    expect(document.activeElement?.textContent).toBe("Alice opens with a short paragraph.");
  });

  it("does not open this page's own search on Cmd-F, leaving the browser's own find alone", () => {
    const keys = load();
    keys.boot();
    const event = press({ code: "KeyF", key: "f", metaKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(keys.state().overlay).toBeNull();
  });

  it("still opens search on C-s", () => {
    const keys = load();
    keys.boot();
    press(SEARCH_FORWARD);
    expect(keys.state().overlay).toBe("search");
  });

  it("does not start the C-c prefix while text is selected, leaving the browser's own copy alone", () => {
    const original = window.getSelection;
    window.getSelection = (): Selection =>
      ({ toString: () => "selected text" }) as unknown as Selection;
    try {
      const keys = load();
      keys.boot();
      const event = press(NEXT_SECTION);
      expect(event.defaultPrevented).toBe(false);
      // No chord pending: a second step never completes outline-next-heading.
      press(NEXT_SECTION_2);
      expect(keys.state().sectionIndex).toBe(-1);
    } finally {
      window.getSelection = original;
    }
  });

  it("still starts the C-c prefix, and completes the chord, when nothing is selected", () => {
    const keys = load();
    keys.boot();
    const event = press(NEXT_SECTION);
    expect(event.defaultPrevented).toBe(true);
    press(NEXT_SECTION_2);
    expect(document.activeElement?.id).toBe("c1-opening");
  });
});

describe("Tab stays inside the search dialog (Fable F29)", () => {
  it("wraps Tab back to the field rather than letting it leave the dialog", () => {
    const keys = load();
    keys.boot();
    press(SEARCH_FORWARD);
    const field = document.querySelector<HTMLInputElement>(".article-search-field")!;
    const event = press({ code: "Tab", key: "Tab" }, field);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(field);
    expect(keys.state().overlay).toBe("search");
  });
});

describe("a heading nested inside a div still has items (Fable F31)", () => {
  it("finds the items after a heading that sits inside a callout, not only a direct child of <article>", () => {
    const html = articleDocument(
      "Fixture",
      '<article><div class="callout"><h2 id="nested">Nested</h2><p>Inside the callout.</p></div></article>',
      "chrome",
    );
    const page = new DOMParser().parseFromString(html, "text/html");
    document.documentElement.innerHTML = page.documentElement.innerHTML;
    const keys = load();
    keys.boot();
    pressPrefixed(NEXT_SECTION, NEXT_SECTION_2);
    expect(document.activeElement?.id).toBe("nested");
    press(NEXT_ITEM);
    expect(document.activeElement?.textContent).toBe("Inside the callout.");
  });
});

describe("legible at 390 CSS px (itd-2609051336128348)", () => {
  it("declares no width in map #26's own section as a bare pixel value", () => {
    const section = STYLESHEET.slice(STYLESHEET.indexOf("Map #26"));
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toMatch(/(?<!max-)width:\s*\d+px/);
  });

  it("shrinks every one of its own panels to the viewport rather than a fixed size", () => {
    const section = STYLESHEET.slice(STYLESHEET.indexOf(".article-contents-overlay,"));
    const rule = section.slice(0, section.indexOf("}"));
    expect(rule).toMatch(/width:\s*calc\(100vw/);
    expect(rule).toMatch(/max-height:\s*calc\(100vh/);
  });

  it("marks the contents list's current row with weight and an underline, not colour alone", () => {
    const section = STYLESHEET.slice(STYLESHEET.indexOf('.article-contents-row[data-current="yes"]'));
    const rule = section.slice(0, section.indexOf("}"));
    expect(rule).toMatch(/font-weight:\s*bold/);
    expect(rule).toMatch(/text-decoration:\s*underline/);
  });
});
