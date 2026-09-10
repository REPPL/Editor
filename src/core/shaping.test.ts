/**
 * The five phase-1 slide constructs: what the deck does when Alice says
 * something.
 *
 * Each test is one of `itd-2609051335458626`'s criteria. The constructs are
 * written here exactly as `05-internals.md` section 3 writes them, because a
 * construct that only works when spelled some other way is not the canon's.
 */

import { describe, expect, it } from "vitest";

import { buildDeck, type DeckPlan, type Slide } from "./deck";
import { parseChapter } from "./parse";
import { renderArticle } from "./render/article";
import { renderSlides } from "./render/slides";

function deck(source: string): DeckPlan {
  return buildDeck(parseChapter(source));
}

function slides(plan: DeckPlan): Slide[] {
  return plan.columns.flatMap((column) => column.slides);
}

function textOf(blocks: readonly { readonly text: string }[]): string[] {
  return blocks.map((block) => block.text.trim());
}

describe("the rule", () => {
  it("splits a Section at a rule and puts the following text on the second slide", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "Before the rule.",
        "",
        "---",
        "",
        "After the rule.",
        "",
      ].join("\n"),
    );
    expect(plan.columns).toHaveLength(2);
    const first = plan.columns[0]?.slides[0];
    const second = plan.columns[1]?.slides[0];
    expect(first?.headline).toBe("Beginnings");
    expect(textOf(first?.notes ?? [])).toEqual(["Before the rule."]);
    // The text after the rule is on the face, not in the first slide's notes.
    expect(second?.headline).toBe("");
    expect(second?.kind).toBe("continuation");
    expect(textOf(second?.face ?? [])).toEqual(["After the rule."]);
    expect(second?.notes).toEqual([]);
    expect(textOf(first?.notes ?? [])).not.toContain("After the rule.");
  });

  it("keeps both halves in the main line", () => {
    const plan = deck("## Beginnings\n\nA.\n\n---\n\nB.\n\n## Findings\n");
    // Two horizontal slides for the Section, then the next Section.
    expect(plan.columns.map((column) => column.slides.length)).toEqual([1, 1, 1]);
    expect(plan.columns[2]?.slides[0]?.headline).toBe("Findings");
  });

  it("splits vertically beneath a Sub-section", () => {
    const plan = deck(
      ["## Beginnings", "", "### The first year", "", "A.", "", "---", "", "B.", ""].join(
        "\n",
      ),
    );
    expect(plan.columns).toHaveLength(1);
    expect(plan.columns[0]?.slides.map((slide) => slide.kind)).toEqual([
      "section",
      "subsection",
      "continuation",
    ]);
    expect(textOf(plan.columns[0]?.slides[2]?.face ?? [])).toEqual(["B."]);
  });

  it("splits on the Sub-section's axis from inside a Sub-sub-section", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "### The first year",
        "",
        "#### A note on dates",
        "",
        "Folded.",
        "",
        "---",
        "",
        "Split.",
        "",
      ].join("\n"),
    );
    expect(plan.columns).toHaveLength(1);
    expect(plan.columns[0]?.slides.map((slide) => slide.kind)).toEqual([
      "section",
      "subsection",
      "continuation",
    ]);
    expect(textOf(plan.columns[0]?.slides[2]?.face ?? [])).toEqual(["Split."]);
  });

  it("splits the opening slide when it sits before the first Section", () => {
    const plan = deck("# The Lantern Papers\n\nA.\n\n---\n\nB.\n");
    expect(plan.columns).toHaveLength(2);
    expect(plan.columns[0]?.slides[0]?.kind).toBe("title");
    expect(textOf(plan.columns[1]?.slides[0]?.face ?? [])).toEqual(["B."]);
  });
});

describe("the divider", () => {
  it("makes a divider slide with its headline alone", () => {
    const plan = deck("## Interlude {.divider}\n\nProse beneath it.\n");
    const slide = plan.columns[0]?.slides[0];
    expect(slide?.kind).toBe("divider");
    expect(slide?.headline).toBe("Interlude");
    expect(slide?.face).toEqual([]);
    // The decision log: prose under a divider heading becomes its notes.
    expect(textOf(slide?.notes ?? [])).toEqual(["Prose beneath it."]);
  });

  it("makes a divider of a chapter's own heading too", () => {
    const plan = deck("# Where I'm coming from {.divider}\n\n## Next\n");
    expect(plan.columns[0]?.slides[0]?.kind).toBe("divider");
  });

  it("keeps an image off a divider's face", () => {
    const plan = deck("## Interlude {.divider}\n\n![A lantern](assets/lantern.jpg)\n");
    expect(plan.columns[0]?.slides[0]?.face).toEqual([]);
    expect(plan.columns[1]?.slides[0]?.kind).toBe("image");
  });

  it("puts .divider nowhere in the rendered text of any slide", () => {
    const markup = renderSlides(deck("## Interlude {.divider}\n\nProse.\n"));
    expect(markup).toContain('class="slide slide-divider divider"');
    expect(markup).not.toContain("{.divider}");
    expect(markup.replace(/<[^>]*>/g, "")).not.toContain("divider");
  });
});

describe("columns", () => {
  const COLUMNS = [
    "## Comparison",
    "",
    "::: {.columns}",
    '::: {.column width="50%"}',
    "Left.",
    ":::",
    '::: {.column width="50%"}',
    "Right.",
    ":::",
    ":::",
    "",
  ].join("\n");

  it("puts a columns div on the face wherever it sits", () => {
    const slide = deck(COLUMNS).columns[0]?.slides[0];
    expect(slide?.face.map((block) => block.attributes.classes)).toEqual([["columns"]]);
    expect(slide?.notes).toEqual([]);
  });

  it("keeps an image inside a column as column content, never an image slide", () => {
    const plan = deck(
      [
        "## Comparison",
        "",
        "::: {.columns}",
        '::: {.column width="50%"}',
        "![A lantern](assets/lantern.jpg)",
        ":::",
        ":::",
        "",
      ].join("\n"),
    );
    expect(plan.columns).toHaveLength(1);
    expect(plan.columns[0]?.slides).toHaveLength(1);
  });
});

describe("the notes div", () => {
  it("lets an authored notes div replace the generated note", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "The paragraph written for readers.",
        "",
        "::: {.notes}",
        "Slow down here.",
        ":::",
        "",
      ].join("\n"),
    );
    const slide = plan.columns[0]?.slides[0];
    expect(slide?.notesSource).toBe("authored");
    expect(textOf(slide?.notes ?? [])).toEqual(["Slow down here."]);
    // The Section's own paragraph is neither the note nor on the slide.
    expect(textOf(slide?.notes ?? [])).not.toContain("The paragraph written for readers.");
    expect(slide?.face).toEqual([]);
  });

  it("attaches a notes div to the slide whose content it follows", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "Generated for the first slide.",
        "",
        "---",
        "",
        "The second slide's content.",
        "",
        "::: {.notes}",
        "Only for the second.",
        ":::",
        "",
      ].join("\n"),
    );
    const first = plan.columns[0]?.slides[0];
    const second = plan.columns[1]?.slides[0];
    expect(first?.notesSource).toBe("generated");
    expect(textOf(first?.notes ?? [])).toEqual(["Generated for the first slide."]);
    expect(second?.notesSource).toBe("authored");
    expect(textOf(second?.notes ?? [])).toEqual(["Only for the second."]);
  });

  it("appends a second notes div on one slide rather than replacing again", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "::: {.notes}",
        "First note.",
        ":::",
        "",
        "::: {.notes}",
        "Second note.",
        ":::",
        "",
      ].join("\n"),
    );
    const slide = plan.columns[0]?.slides[0];
    expect(textOf(slide?.notes ?? [])).toEqual(["First note.", "Second note."]);
  });

  it("shows a notes div on no slide the audience sees", () => {
    const markup = renderSlides(
      deck("## Beginnings\n\n::: {.notes}\nA private remark.\n:::\n"),
    );
    const face = markup.replace(/<aside class="notes"[^]*?<\/aside>/g, "");
    expect(face).not.toContain("A private remark.");
    expect(markup).toContain("A private remark.");
  });
});

describe("the credit", () => {
  it("puts a credit at the foot of its slide", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "![A lantern](assets/lantern.jpg)",
        "",
        "::: {.credit}",
        "Photograph by Carol, used with permission.",
        ":::",
        "",
      ].join("\n"),
    );
    const slide = plan.columns[0]?.slides[0];
    expect(slide?.foot).toHaveLength(1);
    expect(slide?.foot[0]?.kind).toBe("credit");
    expect(textOf(slide?.foot[0]?.blocks ?? [])).toEqual([
      "Photograph by Carol, used with permission.",
    ]);
    // Not body text, and not a speaker note.
    expect(slide?.notes).toEqual([]);
  });

  it("prints a footnote in the same place as a credit", () => {
    const plan = deck(
      [
        "## Beginnings",
        "",
        "---",
        "",
        "A claim.[^dates]",
        "",
        "[^dates]: The dates are estimates.",
        "",
      ].join("\n"),
    );
    const slide = plan.columns[1]?.slides[0];
    expect(slide?.foot.map((line) => line.kind)).toEqual(["footnote"]);
    expect(textOf(slide?.foot[0]?.blocks ?? [])).toEqual(["The dates are estimates."]);
  });
});

describe("the page break", () => {
  it("ignores a page-break comment", () => {
    const plan = deck(
      ["## Beginnings", "", "Before.", "", "<!-- pagebreak -->", "", "After.", ""].join(
        "\n",
      ),
    );
    // No slide break, no blank slide.
    expect(plan.columns).toHaveLength(1);
    expect(plan.columns[0]?.slides).toHaveLength(1);
    expect(textOf(plan.columns[0]?.slides[0]?.notes ?? [])).toEqual(["Before.", "After."]);
    // And no visible output.
    const markup = renderSlides(plan);
    expect(markup).not.toContain("pagebreak");
    expect(renderArticle(parseChapter("<!-- pagebreak -->\n"))).not.toContain("pagebreak");
  });
});

describe("a construct the canon does not know", () => {
  it("carries an unrecognised div's classes and places its children by the default rule", () => {
    const plan = deck(
      ["## Beginnings", "", "::: {.callout kind=\"warning\"}", "Careful.", ":::", ""].join(
        "\n",
      ),
    );
    const slide = plan.columns[0]?.slides[0];
    expect(slide?.notes[0]?.attributes.classes).toEqual(["callout"]);
    expect(renderSlides(plan)).toContain('class="callout"');
  });

  it("treats a .refs heading as an ordinary Section heading and carries its class", () => {
    const plan = deck("## Sources {.refs}\n\nA list.\n");
    const slide = plan.columns[0]?.slides[0];
    expect(slide?.kind).toBe("section");
    expect(slide?.classes).toEqual(["refs"]);
    expect(renderSlides(plan)).toContain("slide-section refs");
  });
});

describe("one source", () => {
  it("builds the deck and the article skeleton from one parse", () => {
    const chapter = parseChapter(
      [
        "# The Lantern Papers",
        "",
        "## Beginnings {.divider}",
        "",
        "Prose.",
        "",
        "::: {.notes}",
        "A remark.",
        ":::",
        "",
      ].join("\n"),
    );
    const plan = buildDeck(chapter);
    const article = renderArticle(chapter);
    // Each slide's headline is its heading's own text.
    for (const slide of slides(plan)) {
      if (slide.headline === "") continue;
      expect(chapter.source).toContain(slide.headline);
    }
    // And the article never learns a talk was shaped in the file.
    expect(article).not.toContain("A remark.");
  });
});
