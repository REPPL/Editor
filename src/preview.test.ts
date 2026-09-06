/**
 * The preview window's own logic: the whole document, from chapters as the
 * shell would hand them over — outside the shell, so this drives the pure
 * functions the way `present.test.ts` drives `present.ts`'s.
 */
import { describe, expect, it } from "vitest";

import { articleOf, idPrefixFor } from "./preview";
import type { PreviewSource } from "./doctree";

/** A document of two Parts holding four chapters in all — the intent's own
 * scenario for spc-2609061318090042's first criterion. */
function fourChapterDocument(): PreviewSource {
  return {
    title: "The Lantern Papers",
    variant: "talk",
    chapters: [
      {
        path: "01-beginnings/01-opening.md",
        text: "# The Lantern Papers\n\n## Beginnings\n\n### The first year\n",
      },
      {
        path: "01-beginnings/02-method.md",
        text: "# Method\n\n## Sources\n",
      },
      {
        path: "02-findings/01-results.md",
        text: "# Results\n\n## Later work\n",
      },
      {
        path: "02-findings/02-closing.md",
        text: "# Closing notes\n",
      },
    ],
  };
}

describe("idPrefixFor", () => {
  it("gives each chapter its own prefix, one-based", () => {
    expect(idPrefixFor(0)).toBe("c1-");
    expect(idPrefixFor(3)).toBe("c4-");
  });
});

describe("articleOf", () => {
  it("renders the whole document as one page, with a contents list carrying every chapter's own heading", async () => {
    const html = await articleOf(fourChapterDocument());
    expect(html).toContain('<nav class="contents">');
    // The Parts, from each chapter's own folder — the same title the
    // sidebar shows for it, since the numeric prefix and the separator are
    // gone.
    expect(html).toContain('<span class="part">beginnings</span>');
    expect(html).toContain('<span class="part">findings</span>');
    // Every chapter's own title, and its Sections.
    expect(html).toContain('<a href="#c1-the-lantern-papers">The Lantern Papers</a>');
    expect(html).toContain('<a href="#c1-beginnings">Beginnings</a>');
    expect(html).toContain('<a href="#c1-beginnings/the-first-year">The first year</a>');
    expect(html).toContain('<a href="#c2-method">Method</a>');
    expect(html).toContain('<a href="#c3-results">Results</a>');
    expect(html).toContain('<a href="#c4-closing-notes">Closing notes</a>');
    // Every heading the contents list points at is actually on the page,
    // under the same prefix.
    expect(html).toContain('id="c1-the-lantern-papers"');
    expect(html).toContain('id="c4-closing-notes"');
  });

  it("renders every chapter in reading order, one page for the whole document", async () => {
    const html = await articleOf(fourChapterDocument());
    const order = ["c1-the-lantern-papers", "c2-method", "c3-results", "c4-closing-notes"].map(
      (id) => html.indexOf(`id="${id}"`),
    );
    for (const position of order) expect(position).toBeGreaterThanOrEqual(0);
    expect([...order]).toEqual([...order].sort((a, b) => a - b));
  });

  it("renders the document's declared variant, filtering a block marked for another", async () => {
    const source: PreviewSource = {
      title: "Two audiences",
      variant: "talk",
      chapters: [
        {
          path: "01-part/01-opening.md",
          text: [
            "# Two audiences",
            "",
            "::: {.variant variant=\"full\"}",
            "Only the readers see this.",
            ":::",
            "",
            "Everyone sees this.",
            "",
          ].join("\n"),
        },
      ],
    };
    const html = await articleOf(source);
    expect(html).toContain("Everyone sees this.");
    expect(html).not.toContain("Only the readers see this.");
  });
});
