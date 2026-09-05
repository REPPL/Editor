/**
 * The default slide mapping: what the deck does when Alice says nothing.
 *
 * The fixtures are the intent's own criteria, written out as chapters. Where a
 * criterion names a chapter, that chapter is here word for word, so a change
 * to the mapping is measured against what was promised rather than against
 * what the mapping happens to do.
 */

import { describe, expect, it } from "vitest";

import { buildDeck, buildDocumentDeck, walkSlides, type DeckPlan } from "./deck";
import { parseChapter } from "./parse";

/** Build a deck from chapter text. */
function deck(source: string): DeckPlan {
  return buildDeck(parseChapter(source));
}

/** Every slide's headline, column by column. */
function shape(plan: DeckPlan): string[][] {
  return plan.columns.map((column) => column.slides.map((slide) => slide.headline));
}

/** The plain text of a run of blocks. */
function textOf(blocks: readonly { readonly text: string }[]): string[] {
  return blocks.map((block) => block.text.trim());
}

const TWO_SECTIONS = [
  "# The Lantern Papers",
  "",
  "## Beginnings",
  "",
  "The first winter was the coldest.",
  "",
  "## Findings",
  "",
  "The counts were wrong.",
  "",
].join("\n");

describe("the default mapping", () => {
  it("maps each Section to a horizontal slide and its prose to notes", () => {
    const plan = deck(TWO_SECTIONS);
    expect(shape(plan)).toEqual([
      ["The Lantern Papers"],
      ["Beginnings"],
      ["Findings"],
    ]);
    const beginnings = plan.columns[1]?.slides[0];
    expect(beginnings?.kind).toBe("section");
    expect(textOf(beginnings?.notes ?? [])).toEqual(["The first winter was the coldest."]);
    // On no slide the audience sees.
    expect(beginnings?.face).toEqual([]);
    const findings = plan.columns[2]?.slides[0];
    expect(textOf(findings?.notes ?? [])).toEqual(["The counts were wrong."]);
    expect(findings?.face).toEqual([]);
  });

  it("opens the deck with the chapter's title", () => {
    const plan = deck(TWO_SECTIONS);
    expect(plan.title).toBe("The Lantern Papers");
    expect(plan.columns[0]?.slides[0]?.kind).toBe("title");
  });

  it("hangs each Sub-section beneath its Section", () => {
    const plan = deck(
      [
        "# The Lantern Papers",
        "",
        "## Beginnings",
        "",
        "Prose.",
        "",
        "### The first year",
        "",
        "One.",
        "",
        "### The second year",
        "",
        "Two.",
        "",
        "## Findings",
        "",
        "Three.",
        "",
      ].join("\n"),
    );
    expect(shape(plan)).toEqual([
      ["The Lantern Papers"],
      ["Beginnings", "The first year", "The second year"],
      ["Findings"],
    ]);
    const column = plan.columns[1];
    expect(textOf(column?.slides[1]?.notes ?? [])).toEqual(["One."]);
    expect(textOf(column?.slides[2]?.notes ?? [])).toEqual(["Two."]);
    // Moving right from Beginnings reaches Findings, not a Sub-section.
    expect(plan.columns[2]?.slides[0]?.headline).toBe("Findings");
  });

  it("gives every image after the first block a slide of its own", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "The first winter was the coldest.",
        "",
        '![The lantern at dusk](assets/lantern.jpg "Photograph by Carol")',
        "",
        '![The second winter](assets/winter.jpg "Photograph by Carol")',
        "",
      ].join("\n"),
    );
    expect(shape(plan)).toEqual([["Beginnings"], [""], [""]]);
    const first = plan.columns[1]?.slides[0];
    const second = plan.columns[2]?.slides[0];
    expect(first?.kind).toBe("image");
    expect(first?.face[0]?.image).toEqual({
      src: "assets/lantern.jpg",
      caption: "The lantern at dusk",
      credit: "Photograph by Carol",
    });
    expect(second?.face[0]?.image?.src).toBe("assets/winter.jpg");
    // In source order.
    expect((first?.line ?? 0) < (second?.line ?? 0)).toBe(true);
  });

  it("keeps the first image on the heading's own slide", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "![The lantern at dusk](assets/lantern.jpg)",
        "",
        "Some prose.",
        "",
        "![The second winter](assets/winter.jpg)",
        "",
      ].join("\n"),
    );
    expect(shape(plan)).toEqual([["Beginnings"], [""]]);
    expect(plan.columns[0]?.slides[0]?.face[0]?.image?.src).toBe("assets/lantern.jpg");
    expect(plan.columns[1]?.slides[0]?.face[0]?.image?.src).toBe("assets/winter.jpg");
  });

  it("folds a Sub-sub-section into its Sub-section's notes", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "### The first year",
        "",
        "One.",
        "",
        "#### A note on dates",
        "",
        "Dates were kept badly.",
        "",
        "#### A note on counts",
        "",
        "Counts were kept worse.",
        "",
        "### The second year",
        "",
        "Two.",
        "",
      ].join("\n"),
    );
    expect(shape(plan)).toEqual([["Beginnings", "The first year", "The second year"]]);
    const first = plan.columns[0]?.slides[1];
    expect(textOf(first?.notes ?? [])).toEqual([
      "One.",
      "A note on dates",
      "Dates were kept badly.",
      "A note on counts",
      "Counts were kept worse.",
    ]);
  });

  it("folds an image inside a Sub-sub-section into the notes rather than making a slide", () => {
    const plan = deck(
      [
        "### The first year",
        "",
        "#### A note on dates",
        "",
        "![A page of the log](assets/log.jpg)",
        "",
      ].join("\n"),
    );
    expect(shape(plan)).toEqual([["The first year"]]);
    expect(plan.columns[0]?.slides[0]?.notes.map((block) => block.kind)).toEqual([
      "heading",
      "image",
    ]);
  });

  it("yields one slide for a Section with one paragraph", () => {
    const plan = deck("## Beginnings\n\nOne paragraph.\n");
    expect(plan.columns).toHaveLength(1);
    expect(plan.columns[0]?.slides).toHaveLength(1);
    expect([...walkSlides(plan)]).toHaveLength(1);
  });

  it("drops a slide with no headline, no face and no notes", () => {
    // A trailing rule opens a continuation that nothing was written on.
    const plan = deck("## Beginnings\n\nOne paragraph.\n\n---\n");
    expect(plan.columns).toHaveLength(1);
  });

  it("sends every ordinary block to the notes, not only paragraphs", () => {
    const plan = deck(
      ["## Beginnings", "", "- one", "- two", "", "> A quotation.", ""].join("\n"),
    );
    const slide = plan.columns[0]?.slides[0];
    expect(slide?.face).toEqual([]);
    expect(slide?.notes.map((block) => block.kind)).toEqual(["list", "quote"]);
  });

  it("gives every slide an id unique within the deck", () => {
    const plan = deck(
      ["## Beginnings", "", "## Beginnings", "", "## Findings", ""].join("\n"),
    );
    const ids = [...walkSlides(plan)].map((slide) => slide.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["beginnings", "beginnings-2", "findings"]);
  });

  it("builds the same plan from the same text", () => {
    expect(deck(TWO_SECTIONS)).toEqual(deck(TWO_SECTIONS));
  });
});

describe("a whole document", () => {
  it("concatenates each chapter's columns in order, ids still unique", () => {
    const one = parseChapter("# One\n\n## Beginnings\n\nA.\n");
    const two = parseChapter("# Two\n\n## Beginnings\n\nB.\n");
    const plan = buildDocumentDeck([one, two]);
    expect(shape(plan)).toEqual([["One"], ["Beginnings"], ["Two"], ["Beginnings"]]);
    const ids = [...walkSlides(plan)].map((slide) => slide.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("variants", () => {
  const SOURCE = [
    "## Beginnings",
    "",
    "Shared prose.",
    "",
    '::: {.variant variant="talk"}',
    "## Only in the talk",
    "",
    "Talk prose.",
    ":::",
    "",
    "## Findings",
    "",
  ].join("\n");

  it("keeps every block when no variant is selected", () => {
    expect(shape(buildDeck(parseChapter(SOURCE)))).toEqual([
      ["Beginnings"],
      ["Only in the talk"],
      ["Findings"],
    ]);
  });

  it("keeps a Section that belongs to the selected variant", () => {
    expect(shape(buildDeck(parseChapter(SOURCE), { variant: "talk" }))).toEqual([
      ["Beginnings"],
      ["Only in the talk"],
      ["Findings"],
    ]);
  });

  it("leaves out a Section belonging to another variant as if it were not written", () => {
    expect(shape(buildDeck(parseChapter(SOURCE), { variant: "full" }))).toEqual([
      ["Beginnings"],
      ["Findings"],
    ]);
  });
});
