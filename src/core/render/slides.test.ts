/**
 * The deck's markup, and the two envelopes that carry it.
 *
 * What is checked here is the fragment reveal.js expects, the constructs'
 * markup and their stylesheet rules, and the two disciplines the deck answers
 * for by itself: nothing is fetched, and every control the deck offers works.
 */

import { describe, expect, it } from "vitest";

import { pathResolver, siteResolver } from "../assets";
import { buildDeck } from "../deck";
import { parseChapter } from "../parse";
import {
  DECK_CONFIG,
  DECK_ENGINE_FILES,
  DECK_STYLESHEET,
  deckDocument,
  renderSlides,
} from "./slides";

/** The fragment for one chapter. */
function markup(source: string, resolve = pathResolver()): string {
  return renderSlides(buildDeck(parseChapter(source)), resolve);
}

describe("the fragment", () => {
  it("gives each column a section and nothing around it", () => {
    const html = markup("## Beginnings\n\nA.\n\n## Findings\n\nB.\n");
    expect(html.startsWith("<section")).toBe(true);
    expect(html).not.toContain("<html");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<style");
    expect(html.match(/<section /g)).toHaveLength(2);
  });

  it("nests a Sub-section inside its Section's section element", () => {
    const html = markup(
      ["## Beginnings", "", "### The first year", "", "One.", "", "## Findings", ""].join(
        "\n",
      ),
    );
    // A column of several slides is one section holding them.
    expect(html).toMatch(/<section><section [^>]*id="beginnings"/);
    expect(html).toContain('id="the-first-year"');
    // The next Section is a sibling column, not a vertical slide.
    expect(html).toMatch(/<\/section><section [^>]*id="findings"/);
  });

  it("writes the speaker notes as an aside reveal.js knows", () => {
    const html = markup("## Beginnings\n\nThe note.\n");
    expect(html).toContain('<aside class="notes" data-source="generated">');
    expect(html).toContain("<p>The note.</p>");
  });

  it("renders an image slide with its caption and its credit", () => {
    const html = markup(
      [
        "## Beginnings",
        "",
        "Prose.",
        "",
        '![The lantern at dusk](assets/lantern.jpg "Photograph by Carol")',
        "",
      ].join("\n"),
    );
    expect(html).toContain('class="slide slide-image"');
    expect(html).toContain('<figure class="full-bleed">');
    expect(html).toContain('src="assets/lantern.jpg"');
    expect(html).toContain('alt="The lantern at dusk"');
    expect(html).toContain('<span class="caption">The lantern at dusk</span>');
    expect(html).toContain('<span class="credit">Photograph by Carol</span>');
  });

  it("carries a divider as a class and never as text", () => {
    const html = markup("## Interlude {.divider}\n\nProse.\n");
    expect(html).toContain('class="slide slide-divider divider"');
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/divider/);
  });

  it("sizes the column tracks from the declared widths", () => {
    const html = markup(
      [
        "## Comparison",
        "",
        "::: {.columns}",
        '::: {.column width="60%"}',
        "Left.",
        ":::",
        '::: {.column width="40%"}',
        "Right.",
        ":::",
        ":::",
        "",
      ].join("\n"),
    );
    expect(html).toContain('class="columns" style="--column-tracks: 60% 40%"');
    expect(html).toContain('<div class="column"><p>Left.</p></div>');
    // The stylesheet reads the property, and collapses it below iPad width.
    expect(DECK_STYLESHEET).toContain("grid-template-columns: var(--column-tracks, 1fr)");
    expect(DECK_STYLESHEET).toMatch(
      /@media \(max-width: 819px\) \{\s*\.reveal \.columns \{\s*grid-template-columns: 1fr;/,
    );
  });

  it("renders a credit in the credit style", () => {
    const html = markup(
      [
        "## Beginnings",
        "",
        "::: {.credit}",
        "Photograph by Carol, used with permission.",
        ":::",
        "",
      ].join("\n"),
    );
    expect(html).toContain(
      '<footer class="slide-foot"><p class="credit">Photograph by Carol, used with permission.</p></footer>',
    );
    // A line, not a paragraph of body type.
    expect(DECK_STYLESHEET).toContain(".reveal .slide-foot {");
    expect(DECK_STYLESHEET).toMatch(/\.reveal \.slide-foot p \{\s*margin: 0;/);
  });

  it("keeps a citation as the literal text the author wrote", () => {
    const html = markup("## Beginnings\n\nAs shown [@smith2020, p. 4].\n");
    expect(html).toContain('<span class="citation">[@smith2020, p. 4]</span>');
  });

  it("escapes the author's text rather than trusting it", () => {
    const html = markup("## Beginnings\n\nA < b & c.\n");
    expect(html).toContain("A &lt; b &amp; c.");
  });

  it("reports an image reference that may not resolve, and keeps its caption", () => {
    const html = markup("![A lantern](/Users/someone/lantern.jpg)\n"); // abcd-lint:allow illustrative refusal path
    expect(html).not.toContain("/Users/someone"); // abcd-lint:allow illustrative refusal path
    expect(html).toContain('class="missing-image"');
    expect(html).toContain("A lantern");
  });

  it("resolves a picture through the seam the host supplies", () => {
    const html = markup("![A lantern](assets/lantern.jpg)\n", siteResolver("slides/"));
    expect(html).toContain('src="slides/assets/lantern.jpg"');
  });
});

describe("the engine", () => {
  it("turns on touch and the on-screen controls", () => {
    expect(DECK_CONFIG.touch).toBe(true);
    expect(DECK_CONFIG.controls).toBe(true);
    expect(DECK_CONFIG.keyboard).toBe(true);
  });

  it("lets this stylesheet lay the slides out rather than scaling them", () => {
    expect(DECK_CONFIG.disableLayout).toBe(true);
    expect(DECK_STYLESHEET).not.toMatch(/transform:\s*scale/);
    expect(DECK_STYLESHEET).not.toMatch(/\bzoom:\s*[0-9.]/);
  });

  it("names the vendored files a build copies, and no theme among them", () => {
    expect(DECK_ENGINE_FILES).toContain("reveal.js");
    expect(DECK_ENGINE_FILES).toContain("reveal.css");
    expect(DECK_ENGINE_FILES).toContain("LICENSE");
    expect(DECK_ENGINE_FILES.some((file) => file.includes("theme"))).toBe(false);
  });
});

describe("the document envelope", () => {
  const html = deckDocument(markup("## Beginnings\n\nA.\n"), {
    title: "The Lantern Papers",
    engine: "linked",
  });

  it("names no absolute URL anywhere", () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain("cdn");
  });

  it("links the engine and this deck's stylesheet by relative path", () => {
    expect(html).toContain('<link rel="stylesheet" href="reveal/reveal.css" />');
    expect(html).toContain('<link rel="stylesheet" href="slides.css" />');
    expect(html).toContain('<script src="reveal/reveal.js"></script>');
  });

  it("carries the one configuration the app uses too", () => {
    expect(html).toContain(JSON.stringify(DECK_CONFIG));
  });

  it("mounts the fragment inside the container reveal.js expects", () => {
    expect(html).toContain('<div class="reveal"><div class="slides">');
    expect(html).toContain('<section id="beginnings"');
  });
});
