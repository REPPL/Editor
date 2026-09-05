/**
 * The trust contract for what a chapter holds.
 *
 * A chapter is a file, and a file can come from anywhere: a Markdown file
 * dropped onto a Part becomes a chapter without anyone reading it first. The
 * parse keeps raw HTML exactly as written, because a plain tool reads the same
 * file and the tree must not lose what is in it. Every rendering escapes it.
 *
 * This is the file that holds all three renderings to that, and it holds the
 * walks the variant filter rests on to seeing everything a chapter contains.
 */

import { describe, expect, it } from "vitest";

import { buildDeck, buildDocumentDeck } from "./deck";
import { parseChapter } from "./parse";
import { renderArticle } from "./render/article";
import { renderSlides } from "./render/slides";
import {
  UNRESOLVED_VARIANT,
  sliceBytes,
  walkBlocks,
  walkChapterBlocks,
  type Block,
} from "./tree";

/** A chapter carrying a script in every place a chapter can carry one. */
const HOSTILE = [
  "# A chapter from somewhere else",
  "",
  '<script>alert("block")</script>',
  "",
  'A paragraph with <script>alert("inline")</script> in it.',
  "",
  "::: {.notes}",
  '<script>alert("notes")</script>',
  ":::",
  "",
  "- An item with <img src=x onerror=alert(1)> in it",
  "",
  "A claim.[^one]",
  "",
  '[^one]: A note with <script>alert("footnote")</script> in it.',
  "",
].join("\n");

describe("raw HTML in a chapter", () => {
  it("survives the parse exactly as written", () => {
    const chapter = parseChapter(HOSTILE);
    const html = [...walkChapterBlocks(chapter)].filter((block) => block.kind === "html");
    expect(html.map((block) => block.text.trim())).toContain('<script>alert("block")</script>');
  });

  it("never reaches the article as markup", () => {
    const chapter = parseChapter(HOSTILE);
    const rendered = renderArticle(chapter);
    expect(rendered).not.toMatch(/<script\b/i);
    expect(rendered).not.toMatch(/<img\b/i);
    expect(rendered).toContain("&lt;script&gt;");
  });

  it("never reaches the deck as markup", () => {
    const chapter = parseChapter(HOSTILE);
    const rendered = renderSlides(buildDeck(chapter));
    expect(rendered).not.toMatch(/<script\b/i);
    expect(rendered).not.toMatch(/<img\b/i);
    expect(rendered).toContain("&lt;script&gt;");
  });

  it("never reaches a whole-document deck as markup", () => {
    const rendered = renderSlides(buildDocumentDeck([parseChapter(HOSTILE)]));
    expect(rendered).not.toMatch(/<script\b/i);
    expect(rendered).not.toMatch(/<img\b/i);
  });
});

describe("the walks a filter rests on", () => {
  const NESTED = [
    "- An item",
    "",
    '    ::: {.variant variant="full"}',
    "",
    "    Only for the full version.",
    "",
    "    :::",
    "",
    "A claim.[^one]",
    "",
    '[^one]: ::: {.variant variant="full"}',
    "",
    "    Also only for the full version.",
    "",
    "    :::",
    "",
  ].join("\n");

  it("descends into a list's items", () => {
    const chapter = parseChapter("- One\n\n- Two\n");
    const kinds = [...walkBlocks(chapter.blocks)].map((block) => block.kind);
    expect(kinds).toContain("list");
    expect(kinds).toContain("paragraph");
  });

  it("descends into a footnote's body", () => {
    const chapter = parseChapter("A claim.[^one]\n\n[^one]: The note's own paragraph.\n");
    const inBlocks = [...walkBlocks(chapter.blocks)].map((block) => block.text);
    const everywhere = [...walkChapterBlocks(chapter)].map((block) => block.text);
    expect(inBlocks).not.toContain("The note's own paragraph.");
    expect(everywhere).toContain("The note's own paragraph.");
  });

  it("finds a variant div wherever a chapter puts one", () => {
    const chapter = parseChapter(NESTED);
    const marked = [...walkChapterBlocks(chapter)].filter((block) =>
      block.attributes.classes.includes("variant"),
    );
    // One inside a list item, one inside a footnote's body: a walk that
    // stopped at a div's children would have found neither, and text meant
    // for one audience would go out to every audience.
    expect(marked.length).toBeGreaterThanOrEqual(2);
    expect(marked.every((block) => block.variants.includes("full"))).toBe(true);
  });

  it("keeps an unnamed variant out of every variant", () => {
    const chapter = parseChapter('::: {.variant variant=""}\nUnfinished.\n:::\n');
    const block = chapter.blocks[0] as Block;
    expect(block.variants).toEqual([UNRESOLVED_VARIANT]);
    expect(renderArticle(chapter, undefined, { variant: "talk" })).not.toContain("Unfinished");
    expect(renderArticle(chapter, undefined, { variant: "full" })).not.toContain("Unfinished");
  });
});

describe("slicing one chapter many times", () => {
  it("gives the same text a span at a time as it does one span at a time", () => {
    const source = "# One\n\nA paragraph with an em dash — and a café.\n\n## Two\n";
    const chapter = parseChapter(source);
    const slice = sliceBytes(source);
    for (const block of walkBlocks(chapter.blocks)) {
      expect(slice(block.span)).toBe(
        source.split("\n").slice(block.line - 1, block.endLine).join("\n"),
      );
    }
  });
});
