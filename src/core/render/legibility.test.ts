/**
 * Legible on three device classes, as far as a test can go.
 *
 * **The limit, stated plainly.** jsdom performs no layout: it has no box
 * model, `scrollWidth` and `clientWidth` are always zero, and `clamp()`,
 * `grid` and media queries are never evaluated. So this file cannot measure a
 * slide. What it can do is hold the deck to the properties that make
 * horizontal scrolling and pinch zoom possible in the first place — a scaled
 * base font, a fixed pixel width, an image that may exceed its box, a grid
 * that never collapses — and prove the markup carries nothing of the kind. The
 * measurement itself is the manual check at 390, 820 and 1280 CSS px recorded
 * with the phase's acceptance run, and the app's window minimum is 390 CSS px
 * so that it can be run there.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { pathResolver } from "../assets";
import { buildDeck } from "../deck";
import { parseChapter } from "../parse";
import { DECK_STYLESHEET, renderSlides } from "./slides";

/**
 * A chapter shaped like a real talk: a title slide, a heading with an image
 * and a caption, and a divider — the constructs the manual check at 390, 820
 * and 1280 CSS px also exercises. Invented content, not a copy of any real
 * document (iss-2609061418065651).
 */
const CHAPTER = [
  "# The Lantern Papers",
  "",
  "Alice opens with a short paragraph before the first Section.",
  "",
  "## Where the light falls",
  "",
  "![A lantern on a desk](assets/lantern.svg){.full-bleed}",
  "",
  "*Figure: a lantern, drawn for the talk.*",
  "",
  "- Bob reads by lamplight",
  "- Carol prefers the window",
  "",
  "## Interlude {.divider}",
  "",
  "### A closer look",
  "",
  "| Reader | Preference |",
  "| --- | --- |",
  "| Bob | Lamplight |",
  "| Carol | Daylight |",
  "",
  "Table: what each reader prefers.",
].join("\n");

/** iPhone width, in CSS pixels. */
const PHONE = 390;

/** Mount the deck at phone width, with the deck's own stylesheet over it. */
function mount(): void {
  const plan = buildDeck(parseChapter(CHAPTER));
  const style = document.createElement("style");
  style.textContent = DECK_STYLESHEET;
  document.head.replaceChildren(style);
  document.body.innerHTML = `<div class="reveal"><div class="slides">${renderSlides(
    plan,
    pathResolver(),
  )}</div></div>`;
  // reveal.js marks the slide in view; nothing else is on the screen.
  const first = document.querySelector(".reveal .slides > section");
  first?.classList.add("present");
  Object.defineProperty(window, "innerWidth", { value: PHONE, configurable: true });
}

/** Every declaration of one property in the stylesheet. */
function declarations(property: string): string[] {
  const found: string[] = [];
  const pattern = new RegExp(`(?:^|[;{\\s])${property}\\s*:\\s*([^;}]+)`, "g");
  let match = pattern.exec(DECK_STYLESHEET);
  while (match !== null) {
    found.push((match[1] ?? "").trim());
    match = pattern.exec(DECK_STYLESHEET);
  }
  return found;
}

/**
 * The deck's type scale, evaluated at one window size.
 *
 * jsdom does not evaluate `clamp()`, so the rule is read out of the stylesheet
 * and worked out here instead. That is enough to answer the one question the
 * maintainer asked — does a bigger window mean bigger type — without a layout
 * engine, and it fails the day the rule stops depending on the window.
 */
function typeScaleAt(width: number, height: number, root = 16): number {
  const rule = declarations("--deck-type")[0] ?? "";
  const clamp = /^clamp\((.+),(.+),(.+)\)$/.exec(rule.trim());
  if (clamp === null) throw new Error(`--deck-type is not a clamp: ${rule}`);
  const term = (expression: string): number => {
    let total = 0;
    for (const part of expression.split("+")) {
      const found = /^\s*(-?[\d.]+)(rem|vw|vh|vmin|vmax|px)\s*$/.exec(part);
      if (found === null) throw new Error(`unreadable length: ${part}`);
      const value = Number(found[1]);
      switch (found[2]) {
        case "rem":
          total += value * root;
          break;
        case "vw":
          total += (value * width) / 100;
          break;
        case "vh":
          total += (value * height) / 100;
          break;
        case "vmin":
          total += (value * Math.min(width, height)) / 100;
          break;
        case "vmax":
          total += (value * Math.max(width, height)) / 100;
          break;
        default:
          total += value;
      }
    }
    return total;
  };
  const [, low = "", middle = "", high = ""] = clamp;
  return Math.min(Math.max(term(middle), term(low)), term(high));
}

describe("the deck at 390 CSS px", () => {
  beforeEach(() => {
    mount();
  });

  it("leaves the body font unscaled", () => {
    // Nothing in the deck touches the page's own base size, so the reader's
    // 16px stays 16px; the slide's own size is the deck's type scale, whose
    // floor is a little over 1rem.
    expect(window.getComputedStyle(document.body).fontSize).toBe("16px");
    expect(declarations("font-size")).toContain("var(--deck-type)");
    for (const size of declarations("font-size")) {
      expect(size, "no font size is a fixed pixel value").not.toMatch(/\d(px|pt)\b/);
    }
    // And no transform or zoom shrinks a slide to fit a fixed stage.
    expect(DECK_STYLESHEET).not.toMatch(/transform:\s*scale/);
    expect(DECK_STYLESHEET).not.toMatch(/\bzoom\s*:/);
  });

  it("declares no width a phone cannot hold", () => {
    for (const width of [
      ...declarations("width"),
      ...declarations("min-width"),
      ...declarations("max-width"),
    ]) {
      expect(width, `${width} is a fixed pixel width`).not.toMatch(/\d+px/);
    }
    // Every pixel measurement in the file is a hairline rule or the media
    // query's breakpoint; nothing sizes a box.
    const pixels = DECK_STYLESHEET.match(/\d+px/g) ?? [];
    expect(new Set(pixels)).toEqual(new Set(["1px", "819px"]));
  });

  it("gives everything that could be wide a way not to overflow", () => {
    expect(DECK_STYLESHEET).toMatch(/\.reveal img[^{]*\{[^}]*max-width: 100%/);
    expect(DECK_STYLESHEET).toMatch(/\.reveal pre,\s*\.reveal table \{[^}]*overflow-x: auto/);
    expect(DECK_STYLESHEET).toContain("overflow-wrap: anywhere");
    expect(DECK_STYLESHEET).toContain("box-sizing: border-box");
  });

  it("stacks the columns in source order below iPad width", () => {
    expect(DECK_STYLESHEET).toMatch(
      /@media \(max-width: 819px\) \{\s*\.reveal \.columns \{\s*display: block;/,
    );
  });

  it("carries no inline style at all on a real chapter's deck", () => {
    // The site serves under `style-src 'self'`, which drops a style attribute
    // unread: a deck that laid itself out in one would collapse at the link
    // while looking right in the app. Every declared size is a data attribute
    // the stylesheet answers.
    expect(document.querySelectorAll("[style]")).toHaveLength(0);
    // An image sized by the author is sized in percent, never in pixels.
    for (const image of document.querySelectorAll("img[width]")) {
      expect(image.getAttribute("width")).not.toMatch(/^\d+$/);
    }
    for (const sized of document.querySelectorAll("[data-width]")) {
      expect(sized.getAttribute("data-width")).toMatch(/^\d{1,3}$/);
    }
  });

  it("keeps the deck's own scale off the floor at phone width", () => {
    // The floor is the smallest the deck ever gets, and it is a little above
    // the reader's own 16px rather than below it.
    expect(typeScaleAt(PHONE, 844)).toBeGreaterThanOrEqual(16);
  });

  it("reports no horizontal overflow, as far as jsdom can tell", () => {
    // Both numbers are zero in jsdom, which lays nothing out. The assertion is
    // kept so the shape of the check is written down where the manual one is
    // referenced, and so it starts failing the day a real layout arrives.
    const scrolling = document.scrollingElement ?? document.documentElement;
    expect(scrolling.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});

/**
 * A bigger window means bigger type.
 *
 * The engine runs with `disableLayout: true` and scales nothing, so the deck's
 * own type scale is the only thing that answers a window being made larger.
 * The maintainer's report was that it did not: the scale was capped in `rem`
 * at about 1370 CSS px of width and read no height at all, so a deck enlarged
 * on a large display or made taller stayed exactly the size it was. jsdom
 * evaluates no `clamp()`, so the rule is read out of the stylesheet and worked
 * out; that is enough to hold it to growing in both directions.
 */
describe("the deck's type scale", () => {
  /** The window sizes the manual check uses, and a large display beyond them. */
  const SIZES: readonly (readonly [number, number])[] = [
    [PHONE, 844],
    [820, 1180],
    [1280, 800],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
  ];

  it("grows with every step up in window size", () => {
    const scales = SIZES.map(([width, height]) => typeScaleAt(width, height));
    for (let index = 1; index < scales.length; index += 1) {
      expect(
        scales[index],
        `${JSON.stringify(SIZES[index])} is no larger than ${JSON.stringify(
          SIZES[index - 1],
        )}`,
      ).toBeGreaterThan(scales[index - 1] ?? 0);
    }
  });

  it("is no smaller at the window Present opens than the rule it replaced", () => {
    // `present_chapter` opens the present window at 1100 by 760, and the rule
    // this replaced worked out to 26.6px there. The fix was that the old rule
    // stopped growing past about 1370 CSS px and read no height at all — not
    // that the deck was too small to begin with, so it does not start smaller.
    expect(typeScaleAt(1100, 760)).toBeGreaterThanOrEqual(26);
  });

  it("grows when only the height grows, and when only the width does", () => {
    // A window can be dragged taller as well as wider, and a projector is a
    // different shape from a laptop, so the scale reads both axes.
    expect(typeScaleAt(1280, 1024)).toBeGreaterThan(typeScaleAt(1280, 800));
    expect(typeScaleAt(1600, 800)).toBeGreaterThan(typeScaleAt(1280, 800));
  });

  it("is nowhere near its ceiling at the largest window anyone presents from", () => {
    // A ceiling that a real window reaches is the bug reported: past it, the
    // deck stops answering. The 6K display is the far end of what a lectern
    // machine drives.
    expect(typeScaleAt(3008, 1692)).toBeGreaterThan(typeScaleAt(2560, 1440));
  });

  it("holds every other size on a slide to that one scale", () => {
    // The headline and the divider are multiples of the deck's type, not
    // scales of their own, so one rule grows and the whole slide grows with
    // it. Nothing on a slide declares a viewport unit of its own.
    expect(DECK_STYLESHEET).toMatch(/\.reveal \.headline \{[^}]*font-size: [\d.]+em/);
    expect(DECK_STYLESHEET).toMatch(
      /\.reveal \.slide-divider \.headline \{[^}]*font-size: [\d.]+em/,
    );
    const viewportSizes = declarations("font-size").filter((size) =>
      /\d(vw|vh|vmin|vmax)\b/.test(size),
    );
    expect(viewportSizes, "only the deck's own scale reads the viewport").toEqual([]);
  });
});

/**
 * One slide on the screen, and the deck no taller than the window.
 *
 * `iss-2609061209123970`: the slides were blocks of normal flow, hidden with
 * `display: none` and shown with `display: flex`. reveal.js writes `display`
 * as an inline style — `updateSlidesVisibility` shows every slide within its
 * view distance with `element.style.display = "block"` — and an inline style
 * beats a stylesheet, so every slide was laid out, the deck stood three
 * windows tall, and the window's `overflow: hidden` cropped it after the
 * title. jsdom lays nothing out and so cannot measure that; what it can do is
 * read the rules back, and the rules are where the answer lives: the slides
 * are positioned over one another, and the one not in view is taken off the
 * screen with a property the engine never writes.
 *
 * The behaviour against the real engine — the index moves, the slide left
 * behind goes, the slide arrived at comes — is held in `src/present.test.ts`.
 */
describe("the deck's stacking", () => {
  /** The body of the first rule whose selector list matches. */
  function rule(selector: string): string {
    const at = DECK_STYLESHEET.indexOf(selector);
    expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
    const opened = DECK_STYLESHEET.indexOf("{", at);
    return DECK_STYLESHEET.slice(opened + 1, DECK_STYLESHEET.indexOf("}", opened));
  }

  /** The rule every slide takes, top-level sections and vertical ones alike. */
  const SECTIONS = ".reveal .slides > section,\n.reveal .slides > section > section {";

  it("lays every slide over the stage rather than under the last one", () => {
    expect(rule(SECTIONS)).toMatch(/position: absolute/);
    expect(rule(SECTIONS)).toMatch(/inset: 0/);
    // The stage is the window, and it is the box that clips.
    expect(rule(".reveal .slides {")).toMatch(/position: absolute/);
    expect(rule(".reveal .slides {")).toMatch(/inset: 0/);
    expect(rule(".reveal {")).toMatch(/height: 100svh/);
    expect(rule(".reveal {")).toMatch(/overflow: hidden/);
    // A stack is a `> section` too, so the rule above places it; what its own
    // rule must not do is put it back into the flow.
    const stack = rule(".reveal .slides > section.stack {");
    expect(stack).not.toMatch(/position:\s*static/);
    expect(stack).toMatch(/display: block/);
  });

  it("hides the slide out of view with visibility, never with display", () => {
    const sections = rule(SECTIONS);
    expect(sections).toMatch(/visibility: hidden/);
    expect(sections).toMatch(/pointer-events: none/);
    // `display: none` here is the bug: the engine overwrites it inline.
    expect(sections, "a slide is never hidden by display").not.toMatch(
      /display:\s*none/,
    );
    const present = rule(
      ".reveal .slides > section.present,\n.reveal .slides > section > section.present {",
    );
    expect(present).toMatch(/visibility: visible/);
    expect(present).toMatch(/pointer-events: auto/);
    // And the face of the slide in view is laid out by this stylesheet
    // whatever `display` the engine wrote on it.
    expect(DECK_STYLESHEET).toMatch(/display: flex !important/);
  });

  it("gives a slide too long for the stage its own scrolling", () => {
    // The stage clips, so a slide that overflows scrolls inside itself rather
    // than running off the bottom of the window with no way to reach it.
    expect(rule(SECTIONS)).toMatch(/overflow-y: auto/);
  });
});
