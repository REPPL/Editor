/**
 * The outline, against a real chapter and against the levels it must reach.
 *
 * The examples carry no fourth-level heading — `examples/CANON-CHECK.md` says
 * so — so the level-four case is a fixture written here, beside the real
 * chapter that supplies the rest.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { outlineOf, slugify, walkOutline } from "./outline";
import { parseChapter } from "./parse";

/** The first chapter of the macro talk, which the specs name as the fixture. */
const MACRO_TALK = "examples/presentation/01-slides/01-technology-impact-assessment.md";

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

  it("draws the outline of a real chapter", () => {
    const outline = outlineOfSource(readFileSync(MACRO_TALK, "utf8"));
    expect(outline.title).toBe("Technology Impact Assessment");
    expect(outline.titleLine).toBe(1);
    expect(outline.nodes.map((node) => [node.label, node.line])).toEqual([
      ["Denver, 1858", 11],
      ["In 1859 the question was:", 28],
      ["The 2026 rush", 36],
    ]);
    expect(outline.nodes[1]?.children.map((node) => node.label)).toEqual([
      "Perhaps for 2026?",
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
