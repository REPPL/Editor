/**
 * The deck's markup, and the two envelopes that carry it.
 *
 * What is checked here is the fragment reveal.js expects, the constructs'
 * markup and their stylesheet rules, and the two disciplines the deck answers
 * for by itself: nothing is fetched, and every control the deck offers works.
 */

import { describe, expect, it } from "vitest";

import { pathResolver } from "../assets";
import { buildDeck } from "../deck";
import { parseChapter } from "../parse";
import { isLinkable } from "./html";
import {
  DECK_CONFIG,
  DECK_ENGINE_FILES,
  DECK_STYLESHEET,
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

  it("sizes the columns from the declared widths, with no inline style", () => {
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
    // The site serves under `style-src 'self'`, which drops a style attribute
    // unread: the shares are data attributes and the stylesheet holds the rule.
    expect(html).not.toContain("style=");
    expect(html).toContain('class="columns" data-columns="2"');
    expect(html).toContain('<div class="column" data-width="60"><p>Left.</p></div>');
    expect(html).toContain('<div class="column" data-width="40"><p>Right.</p></div>');
    expect(DECK_STYLESHEET).toContain(
      '.reveal .column[data-width="60"] { flex: 0 0 calc(60% - var(--column-gap)); }',
    );
    // And below iPad width they stack in source order.
    expect(DECK_STYLESHEET).toMatch(
      /@media \(max-width: 819px\) \{\s*\.reveal \.columns \{\s*display: block;/,
    );
  });

  it("sizes a picture by a class rule rather than by a style attribute", () => {
    const html = markup('![A lantern](assets/lantern.jpg){width="75%"}\n');
    expect(html).not.toContain("style=");
    expect(html).toContain('data-width="75"');
    expect(html).not.toContain('width="75%"');
    expect(DECK_STYLESHEET).toContain('.reveal img[data-width="75"] { width: 75%; height: auto; }');
    // A width in pixels is an HTML width and stays one.
    expect(markup('![A lantern](assets/lantern.jpg){width="320"}\n')).toContain('width="320"');
  });

  it("aligns a table cell by a data attribute the stylesheet reads", () => {
    const html = markup(
      ["## Numbers", "", "| a | b |", "|:--|--:|", "| 1 | 2 |", ""].join("\n"),
    );
    expect(html).not.toContain("style=");
    expect(html).toContain('<td data-align="left">');
    expect(html).toContain('<td data-align="right">');
    expect(DECK_STYLESHEET).toContain('td[data-align="right"] { text-align: right; }');
  });

  it("keeps a variant span out of the variant it was marked against", () => {
    const source = [
      "## Beginnings",
      "",
      'A [talk only]{.variant variant="talk"} and [paper only]{.variant variant="paper"}.',
      "",
    ].join("\n");
    const talk = renderSlides(
      buildDeck(parseChapter(source), { variant: "talk" }),
      pathResolver(),
      "talk",
    );
    expect(talk).toContain("talk only");
    expect(talk).not.toContain("paper only");
  });

  it("writes no href for a video source naming a scheme it will not link to", () => {
    // A chapter is a file and a file can come from anywhere, so an address in
    // one is the author's text rather than something to be handed to a browser.
    const html = markup(
      [
        "## Beginnings",
        "",
        "::: {.video}",
        "- remote: javascript:alert(1)",
        "- remote: https://videos.example.org/keynote.mp4",
        ":::",
        "",
      ].join("\n"),
    );
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("javascript:alert(1)</a>");
    expect(html).toContain('href="https://videos.example.org/keynote.mp4"');

    expect(isLinkable("https://example.invalid/a")).toBe(true);
    expect(isLinkable("assets/lantern.jpg")).toBe(true);
    expect(isLinkable("mailto:alice@example.invalid")).toBe(true);
    expect(isLinkable("javascript:alert(1)")).toBe(false);
    expect(isLinkable("data:text/html,<script>")).toBe(false);
    expect(isLinkable("file:///etc/hosts")).toBe(false);
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
    const html = markup("![A lantern](assets/lantern.jpg)\n", pathResolver("slides/"));
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
