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

import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it } from "vitest";

import { pathResolver } from "../assets";
import { buildDeck } from "../deck";
import { parseChapter } from "../parse";
import { DECK_STYLESHEET, renderSlides } from "./slides";

/** The chapter the manual check uses too, so both look at one deck. */
const CHAPTER = "examples/presentation/01-slides/01-technology-impact-assessment.md";

/** iPhone width, in CSS pixels. */
const PHONE = 390;

/** Mount the deck at phone width, with the deck's own stylesheet over it. */
function mount(): void {
  const plan = buildDeck(parseChapter(readFileSync(CHAPTER, "utf8")));
  const style = document.createElement("style");
  style.textContent = DECK_STYLESHEET;
  document.head.replaceChildren(style);
  document.body.innerHTML = `<div class="reveal"><div class="slides">${renderSlides(
    plan,
    pathResolver(),
  )}</div></div>`;
  // reveal.js marks the slide in view; nothing else is displayed.
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

describe("the deck at 390 CSS px", () => {
  beforeEach(() => {
    mount();
  });

  it("leaves the body font unscaled", () => {
    // Nothing in the deck touches the page's own base size, so the reader's
    // 16px stays 16px; the slide's own size is a clamp whose floor is 1rem.
    expect(window.getComputedStyle(document.body).fontSize).toBe("16px");
    expect(declarations("font-size")).toContain("clamp(1rem, 0.7rem + 1.4vw, 1.9rem)");
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

  it("reports no horizontal overflow, as far as jsdom can tell", () => {
    // Both numbers are zero in jsdom, which lays nothing out. The assertion is
    // kept so the shape of the check is written down where the manual one is
    // referenced, and so it starts failing the day a real layout arrives.
    const scrolling = document.scrollingElement ?? document.documentElement;
    expect(scrolling.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});
