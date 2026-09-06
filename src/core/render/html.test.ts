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
  it("renders a bare numbered marker", () => {
    const source = "As shown [@smith2020].";
    const html = renderInlines([citationNode(source)], contextFor(source));
    expect(html).toBe('<span class="citation">[1]</span>');
  });

  it("carries a locator after the number, inside the brackets", () => {
    const source = "As shown [@smith2020, p. 4].";
    const html = renderInlines([citationNode(source)], contextFor(source));
    expect(html).toBe('<span class="citation">[1, p. 4]</span>');
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
    expect(html).toContain('<span class="citation">[1]; ');
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
