/**
 * The preview window's own logic: the whole document, from chapters as the
 * shell would hand them over — outside the shell, so this drives the pure
 * functions the way `present.test.ts` drives `present.ts`'s.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { articleOf, idPrefixFor, show } from "./preview";
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

describe("articleOf, with a bibliography (itd-2609051335502171)", () => {
  const BIB = [
    "@article{smith2020,",
    "  author = {Smith, Alice},",
    "  title = {The Lantern Papers},",
    "  year = {2020},",
    "}",
  ].join("\n");

  it("numbers a resolved citation and appends the generated reference list", async () => {
    const source: PreviewSource = {
      title: "A Paper",
      variant: "full",
      bibliography: BIB,
      chapters: [
        { path: "01-part/01-a.md", text: "# A Paper\n\nAs shown [@smith2020].\n" },
      ],
    };
    const html = await articleOf(source);
    expect(html).toContain('<span class="citation">[<a href="#ref-1">1</a>]</span>');
    expect(html).toContain('<li id="ref-1">Smith, Alice. 2020. The Lantern Papers.</li>');
  });

  it("marks an unresolved key rather than printing its brackets", async () => {
    const source: PreviewSource = {
      title: "A Paper",
      variant: "full",
      bibliography: BIB,
      chapters: [{ path: "01-part/01-a.md", text: "As shown [@nosuchkey].\n" }],
    };
    const html = await articleOf(source);
    expect(html).not.toContain("[@nosuchkey]");
    expect(html).toContain('<span class="citation-key unresolved">nosuchkey</span>');
  });

  it("marks a citation unresolved rather than printing its brackets when the document names no bibliography at all (GLM F4)", async () => {
    const source: PreviewSource = {
      title: "A Paper",
      variant: "full",
      chapters: [{ path: "01-part/01-a.md", text: "As shown [@smith2020].\n" }],
    };
    const html = await articleOf(source);
    expect(html).not.toContain("[@smith2020]");
    expect(html).toContain('<span class="citation-key unresolved">smith2020</span>');
    expect(html).not.toContain("reference-list");
  });

  it("gives a citation written only inside a .notes div no article entry (Fable F7)", async () => {
    const source: PreviewSource = {
      title: "A Paper",
      variant: "full",
      bibliography: BIB,
      chapters: [
        {
          path: "01-part/01-a.md",
          text: ["# A Paper", "", "::: {.notes}", "An aside [@smith2020].", ":::", ""].join("\n"),
        },
      ],
    };
    const html = await articleOf(source);
    expect(html).not.toContain("reference-list");
    expect(html).not.toContain('id="ref-1"');
  });
});

describe("show: the document-scope attribute (iss-2609070642209805) and the video probe (GLM F8)", () => {
  beforeEach(() => {
    document.body.innerHTML = "<main></main>";
    delete (window as unknown as { ArticleVideo?: unknown }).ArticleVideo;
  });

  it("writes data-document-scope from the source, and clears it for a caller that predates the field", async () => {
    await show({ title: "A", variant: "full", chapters: [], documentScope: "abc123" });
    expect(document.body.getAttribute("data-document-scope")).toBe("abc123");

    await show({ title: "B", variant: "full", chapters: [] });
    expect(document.body.hasAttribute("data-document-scope")).toBe(false);
  });

  it("never probes an external video address on its own, but still probes an already-local one", async () => {
    const probe = vi.fn().mockResolvedValue(true);
    const upgradeVideos = vi.fn((prober: (href: string, timeoutMs: number) => Promise<boolean>) =>
      Promise.all([
        prober("https://example.com/clip.mp4", 4000),
        prober("data:video/mp4;base64,AAA", 4000),
      ]),
    );
    (window as unknown as { ArticleVideo: unknown }).ArticleVideo = { upgradeVideos, probe };

    await show({ title: "A", variant: "full", chapters: [] });

    expect(upgradeVideos).toHaveBeenCalledTimes(1);
    // Only the already-local address ever reaches the real prober: the app
    // never fetches an external source on its own initiative
    // (`02-constraints.md`'s "network only on publish").
    expect(probe).toHaveBeenCalledTimes(1);
    expect(probe).toHaveBeenCalledWith("data:video/mp4;base64,AAA", 4000);
  });
});
