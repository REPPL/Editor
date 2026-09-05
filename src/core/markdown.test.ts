/**
 * The two rules that are Editor's own: fenced divs and citations.
 *
 * Each case here was a real misreading found in review, so each keeps the
 * smallest chapter that shows it.
 */

import { describe, expect, it } from "vitest";

import { parseChapter } from "./parse";
import { walkBlocks, walkInlines, type Block, type Inline } from "./tree";

/** Every block of a source, divs descended into. */
function blocks(source: string): Block[] {
  return [...walkBlocks(parseChapter(source).blocks)];
}

/** Every inline node of a source. */
function inlines(source: string): Inline[] {
  const found: Inline[] = [];
  for (const block of blocks(source)) found.push(...walkInlines(block.inlines));
  return found;
}

describe("fenced divs", () => {
  it("does not let colons inside a code fence close the div", () => {
    // The canon's own chapter shows a reader how to write a fenced div, inside
    // a fenced div. Counting the example's `:::` would close the outer one and
    // land everything after it in the wrong place.
    const source = [
      "::: {.callout}",
      "",
      "How to write one:",
      "",
      "```markdown",
      "A div closes with three colons:",
      ":::",
      "```",
      "",
      "And a closing word.",
      "",
      ":::",
      "",
      "A paragraph after the div.",
      "",
    ].join("\n");
    const parsed = parseChapter(source);
    expect(parsed.blocks.map((block) => block.kind)).toEqual(["div", "paragraph"]);
    const div = parsed.blocks[0];
    expect(div?.attributes.classes).toEqual(["callout"]);
    expect(div?.children.map((block) => block.kind)).toEqual([
      "paragraph",
      "code",
      "paragraph",
    ]);
    expect(parsed.blocks[1]?.text).toBe("A paragraph after the div.");
  });

  it("reads a tilde fence the same way", () => {
    const source = ["::: {.notes}", "~~~", ":::", "~~~", ":::", "", "After.", ""].join("\n");
    const parsed = parseChapter(source);
    expect(parsed.blocks.map((block) => block.kind)).toEqual(["div", "paragraph"]);
  });

  it("still nests divs written with colons", () => {
    const parsed = parseChapter(
      "::: {.columns}\n\n::: {.column}\n\nOne.\n\n:::\n\n::: {.column}\n\nTwo.\n\n:::\n\n:::\n\nAfter.\n",
    );
    expect(parsed.blocks.map((block) => block.kind)).toEqual(["div", "paragraph"]);
    expect(parsed.blocks[0]?.children.map((block) => block.kind)).toEqual(["div", "div"]);
  });
});

describe("citations", () => {
  it("takes the locator from where the key ended, not from a search for it", () => {
    // The key's own text also appears in the locator. `lastIndexOf` would cut
    // the locator in the wrong place and lose most of it.
    const citation = inlines("As shown [@smith2020, see also smith2020 p. 4].\n").find(
      (node) => node.kind === "citation",
    );
    expect(citation?.keys).toEqual(["smith2020"]);
    expect(citation?.locator).toBe("see also smith2020 p. 4");
  });

  it("takes the locator after the last key when a citation names several", () => {
    const citation = inlines("[see @one; @two, p. 4]\n").find(
      (node) => node.kind === "citation",
    );
    expect(citation?.keys).toEqual(["one", "two"]);
    expect(citation?.locator).toBe("p. 4");
  });

  it("leaves a code span inside brackets alone", () => {
    const found = inlines("Write [`@handle`] in the field.\n");
    expect(found.some((node) => node.kind === "citation")).toBe(false);
    expect(found.some((node) => node.kind === "code")).toBe(true);
  });

  it("reads a bare key in prose, and only where one starts", () => {
    const found = inlines("As @smith2020 says, write to alice@example.invalid.\n");
    const citations = found.filter((node) => node.kind === "citation");
    expect(citations.map((node) => node.keys)).toEqual([["smith2020"]]);
  });

  it("does not read an address in a long paragraph as a citation", () => {
    const paragraph = `Write to alice@example.invalid. ${"Filler. ".repeat(200)}`;
    const found = inlines(`${paragraph}\n`);
    expect(found.filter((node) => node.kind === "citation")).toHaveLength(0);
  });
});
