/**
 * The outline, against every level it must reach and against a chapter shaped
 * like a real one: several paragraphs before the first heading, a Section
 * that holds a Sub-section, and headings in source order throughout.
 */

import { describe, expect, it } from "vitest";

import { outlineOf, slugify, walkOutline } from "./outline";
import { parseChapter } from "./parse";

function outlineOfSource(source: string): ReturnType<typeof outlineOf> {
  return outlineOf(parseChapter(source));
}

describe("the outline", () => {
  it("nests Sections, Sub-sections, and Sub-sub-sections in source order", () => {
    const outline = outlineOfSource(
      [
        "# The Lantern Papers",
        "",
        "## Beginnings",
        "",
        "### The first year",
        "",
        "#### A note on dates",
        "",
        "## Findings",
        "",
      ].join("\n"),
    );
    expect(outline.title).toBe("The Lantern Papers");
    expect(outline.nodes.map((node) => node.label)).toEqual(["Beginnings", "Findings"]);
    const beginnings = outline.nodes[0];
    expect(beginnings?.kind).toBe("section");
    expect(beginnings?.children.map((node) => node.label)).toEqual(["The first year"]);
    const firstYear = beginnings?.children[0];
    expect(firstYear?.kind).toBe("subsection");
    expect(firstYear?.children[0]?.kind).toBe("subsubsection");
    expect(firstYear?.children[0]?.label).toBe("A note on dates");
    expect([...walkOutline(outline.nodes)].map((node) => node.line)).toEqual([3, 5, 7, 9]);
  });

  it("labels a node with the heading's text, its attribute block removed", () => {
    const outline = outlineOfSource("# Title\n\n## Interlude {.divider}\n");
    expect(outline.nodes[0]?.label).toBe("Interlude");
  });

  it("gives each node the heading path as its id", () => {
    const outline = outlineOfSource(
      "# Title\n\n## Beginnings\n\n### The first year\n",
    );
    expect([...walkOutline(outline.nodes)].map((node) => node.id)).toEqual([
      "beginnings",
      "beginnings/the-first-year",
    ]);
  });

  it("keeps two headings of the same name apart", () => {
    const outline = outlineOfSource("# Title\n\n## Sources\n\n## Sources\n");
    expect(outline.nodes.map((node) => node.id)).toEqual(["sources", "sources-2"]);
  });

  it("ignores a heading inside a fenced code block", () => {
    const outline = outlineOfSource(
      "# Title\n\n```\n## Not a section\n```\n\n## A section\n",
    );
    expect(outline.nodes.map((node) => node.label)).toEqual(["A section"]);
  });

  it("lists a Section that lives inside a variant block, and says which variant", () => {
    const outline = outlineOfSource(
      '# Title\n\n::: {.variant variant="talk"}\n## Only in the talk\n:::\n',
    );
    expect(outline.nodes[0]?.label).toBe("Only in the talk");
    expect(outline.nodes[0]?.variants).toEqual(["talk"]);
  });

  it("reports no title for a chapter that has no level-one heading", () => {
    const outline = outlineOfSource("## A section with no chapter title\n");
    expect(outline.title).toBeNull();
    expect(outline.nodes).toHaveLength(1);
  });

  it("carries an empty badge list on every node", () => {
    const outline = outlineOfSource("# Title\n\n## Beginnings\n");
    expect(outline.badges).toEqual([]);
    expect(outline.nodes[0]?.badges).toEqual([]);
  });

  it("draws the outline of a chapter with prose before its first heading and a nested Sub-section", () => {
    const source = [
      "# The Lantern Papers",
      "",
      "Alice opens with a short paragraph, so the first Section does not sit",
      "at the very top of the chapter, the way a real one never does.",
      "",
      "Bob supplies a second paragraph before the heading arrives, for the",
      "same reason.",
      "",
      "## Beginnings",
      "",
      "Carol reads this Section first, before anything else, and asks Alice",
      "why it starts here.",
      "",
      "## The question that opened it",
      "",
      "This Section holds one Sub-section, so the outline test can show a",
      "child node nesting under its parent's line.",
      "",
      "### A narrower answer",
      "",
      "The Sub-section needs a line of its own text so it is not an empty",
      "heading.",
      "",
      "## Where it rests",
      "",
      "The chapter's last Section, so the outline test can show three",
      "top-level nodes in source order.",
    ].join("\n");
    const outline = outlineOfSource(source);
    expect(outline.title).toBe("The Lantern Papers");
    expect(outline.titleLine).toBe(1);
    expect(outline.nodes.map((node) => [node.label, node.line])).toEqual([
      ["Beginnings", 9],
      ["The question that opened it", 14],
      ["Where it rests", 24],
    ]);
    expect(outline.nodes[1]?.children.map((node) => node.label)).toEqual([
      "A narrower answer",
    ]);
  });
});

describe("slugify", () => {
  it("makes a path segment of a heading", () => {
    expect(slugify("The first year")).toBe("the-first-year");
    expect(slugify("In 1859 the question was:")).toBe("in-1859-the-question-was");
    expect(slugify("Technikfolgenabschätzung")).toBe("technikfolgenabschatzung");
  });

  it("still makes a segment of a heading that is all punctuation", () => {
    expect(slugify("…")).toBe("section");
  });
});
