/**
 * The shared inline renderer's citation case, resolved and unresolved.
 *
 * `renderInlines` is what both the article and the deck call for a run of
 * inline nodes; this exercises it directly with a synthetic `Bibliography`
 * rather than through a whole page, so the marker and the unresolved-key
 * fallback are proven once, at the seam every rendering shares.
 */

import { describe, expect, it } from "vitest";

import { parseBibliography, resolveCitations } from "../bibliography";
import { parseChapter } from "../parse";
import { pathResolver } from "../assets";
import type { Inline } from "../tree";
import { renderInlines, type RenderContext } from "./html";

const BIB = [
  "@article{smith2020,",
  "  author = {Smith, Alice},",
  "  title = {The Lantern Papers},",
  "  year = {2020},",
  "}",
].join("\n");

function contextFor(source: string): RenderContext {
  const chapter = parseChapter(source);
  const citations = resolveCitations([chapter], parseBibliography(BIB));
  return { resolve: pathResolver(), rendering: "article", citations };
}

function citationNode(source: string): Inline {
  const inline = parseChapter(source).blocks[0]?.inlines.find(
    (node) => node.kind === "citation",
  );
  if (inline === undefined) throw new Error("the fixture carries a citation");
  return inline;
}

describe("a resolved citation", () => {
  it("renders a bare numbered marker, linked to the reference list's own anchor (GLM F13)", () => {
    const source = "As shown [@smith2020].";
    const html = renderInlines([citationNode(source)], contextFor(source));
    expect(html).toBe('<span class="citation">[<a href="#ref-1">1</a>]</span>');
  });

  it("carries a locator after the number, inside the brackets, the number still linked", () => {
    const source = "As shown [@smith2020, p. 4].";
    const html = renderInlines([citationNode(source)], contextFor(source));
    expect(html).toBe('<span class="citation">[<a href="#ref-1">1</a>, p. 4]</span>');
  });
});

describe("an unresolved citation", () => {
  it("prints the key as a marked span, never the brackets the author wrote", () => {
    const source = "As shown [@nosuchkey].";
    const html = renderInlines([citationNode(source)], contextFor(source));
    expect(html).not.toContain("[@nosuchkey]");
    expect(html).not.toContain("[");
    expect(html).toBe('<span class="citation-key unresolved">nosuchkey</span>');
  });

  it("marks only the key that failed to resolve, beside the one that did", () => {
    const source = "As shown [@smith2020; @nosuchkey].";
    const html = renderInlines([citationNode(source)], contextFor(source));
    expect(html).toContain('<span class="citation">[<a href="#ref-1">1</a>]; ');
    expect(html).toContain('<span class="citation-key unresolved">nosuchkey</span>');
    expect(html).not.toContain("[@nosuchkey]");
  });

  it("escapes an unresolved key rather than trusting it", () => {
    const chapter = parseChapter("As shown [@nosuchkey].");
    const node = { ...citationNode("As shown [@nosuchkey]."), keys: ["<script>"] };
    const citations = resolveCitations([chapter], parseBibliography(BIB));
    const html = renderInlines(
      [node],
      { resolve: pathResolver(), rendering: "article", citations },
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("no resolution handed to the rendering", () => {
  it("falls back to the literal text the author wrote", () => {
    const source = "As shown [@smith2020, p. 4].";
    const html = renderInlines([citationNode(source)], {
      resolve: pathResolver(),
      rendering: "slides",
    });
    expect(html).toBe('<span class="citation">[@smith2020, p. 4]</span>');
  });
});

/** The one `.egg` marker span a synthetic paragraph carries. */
function eggMarker(source: string): Inline {
  const inline = parseChapter(source).blocks[0]?.inlines.find(
    (node) => node.kind === "span" && node.attributes.classes.includes("egg"),
  );
  if (inline === undefined) throw new Error("the fixture carries an egg marker");
  return inline;
}

describe("an easter-egg marker (itd-2609051335518134, map #12)", () => {
  const SOURCE = 'A word[✦]{.egg egg="lantern"} follows.';

  it("renders a button in the article when the id is one of eggLabels", () => {
    const html = renderInlines([eggMarker(SOURCE)], {
      resolve: pathResolver(),
      rendering: "article",
      eggLabels: new Map([["lantern", "✦"]]),
    });
    expect(html).toBe(
      '<button type="button" class="egg-marker" data-egg="egg-lantern" aria-haspopup="dialog" ' +
        'aria-label="Reveal hidden content">✦</button>',
    );
  });

  it("prefixes the target with idPrefix, so two chapters' own ids never collide", () => {
    const html = renderInlines([eggMarker(SOURCE)], {
      resolve: pathResolver(),
      rendering: "article",
      idPrefix: "c2-",
      eggLabels: new Map([["lantern", "✦"]]),
    });
    expect(html).toContain('data-egg="c2-egg-lantern"');
  });

  it("renders the marker's own text where the id names no eggLabels entry", () => {
    const html = renderInlines([eggMarker(SOURCE)], {
      resolve: pathResolver(),
      rendering: "article",
      eggLabels: new Map(),
    });
    expect(html).toBe("✦");
  });

  it("renders the marker's own text where the article carries no eggLabels at all", () => {
    const html = renderInlines([eggMarker(SOURCE)], {
      resolve: pathResolver(),
      rendering: "article",
    });
    expect(html).toBe("✦");
  });

  it("renders nothing in the deck, matched or not — the deck omits the construct entirely", () => {
    const matched = renderInlines([eggMarker(SOURCE)], {
      resolve: pathResolver(),
      rendering: "slides",
      eggLabels: new Map([["lantern", "✦"]]),
    });
    expect(matched).toBe("");
  });
});
