/**
 * The parse, construct by construct.
 *
 * One test per construct of `05-internals.md` section 3, plus the span
 * arithmetic every annotation anchor will rest on. The assertions are about
 * the tree, not about markdown-it, so the harness underneath can be replaced
 * without rewriting what the canon means.
 */

import { describe, expect, it } from "vitest";

import { parseChapter } from "./parse";
import { byteSlice, walkInlines, type Block, type Inline } from "./tree";

/** The first block of a parsed source. */
function firstBlock(source: string): Block {
  const block = parseChapter(source).blocks[0];
  if (block === undefined) throw new Error("no block was parsed");
  return block;
}

/** Every inline node of a source, flattened. */
function allInlines(source: string): Inline[] {
  const chapter = parseChapter(source);
  const found: Inline[] = [];
  const walk = (blocks: readonly Block[]): void => {
    for (const block of blocks) {
      found.push(...walkInlines(block.inlines));
      walk(block.children);
    }
  };
  walk(chapter.blocks);
  return found;
}

describe("structure and text", () => {
  it("reads the four heading levels as the four levels the canon names", () => {
    const chapter = parseChapter(
      "# The Lantern Papers\n\n## Beginnings\n\n### The first year\n\n#### A note on dates\n",
    );
    expect(chapter.blocks.map((block) => [block.kind, block.level])).toEqual([
      ["heading", 1],
      ["heading", 2],
      ["heading", 3],
      ["heading", 4],
    ]);
    expect(chapter.blocks.map((block) => block.line)).toEqual([1, 3, 5, 7]);
  });

  it("joins a title that runs to two lines into one heading", () => {
    const chapter = parseChapter("# The Lantern Papers\n# Three winters\n\nProse.\n");
    expect(chapter.blocks.map((block) => block.kind)).toEqual(["heading", "paragraph"]);
    expect(chapter.blocks[0]?.text).toBe("The Lantern Papers Three winters");
    expect(chapter.blocks[0]?.endLine).toBe(2);
  });

  it("does not join two headings with a blank line between them", () => {
    const chapter = parseChapter("# One\n\n# Two\n");
    expect(chapter.blocks).toHaveLength(2);
  });

  it("makes a slide split a rule of its own", () => {
    const block = firstBlock("---\n\nAfter.\n");
    expect(block.kind).toBe("rule");
  });

  it("carries a divider as a class on the heading and never as text", () => {
    const block = firstBlock("## Interlude {.divider}\n");
    expect(block.attributes.classes).toEqual(["divider"]);
    expect(block.text).toBe("Interlude");
  });

  it("carries a divider on a chapter's own heading too", () => {
    const block = firstBlock("# Where I'm coming from {.divider}\n");
    expect(block.level).toBe(1);
    expect(block.attributes.classes).toEqual(["divider"]);
  });

  it("carries the appendix-of-sources class on its heading", () => {
    const block = firstBlock("## Sources {.refs}\n");
    expect(block.attributes.classes).toEqual(["refs"]);
    expect(block.text).toBe("Sources");
  });

  it("reads a page break as a comment carrying its own word", () => {
    const block = firstBlock("<!-- pagebreak -->\n");
    expect(block.kind).toBe("comment");
    expect(block.comment).toBe("pagebreak");
  });

  it("reads an HTML comment that is not a page break as a comment all the same", () => {
    expect(firstBlock("<!-- a note to myself -->\n").comment).toBe("a note to myself");
  });

  it("ignores a heading inside a fenced code block", () => {
    const chapter = parseChapter("# Title\n\n```\n## Not a section\n```\n");
    expect(chapter.blocks.map((block) => block.kind)).toEqual(["heading", "code"]);
  });
});

describe("citations and footnotes", () => {
  it("reads a bracketed citation and keeps the text the author wrote", () => {
    const citation = allInlines("A claim [@smith2020].\n").find(
      (inline) => inline.kind === "citation",
    );
    expect(citation?.keys).toEqual(["smith2020"]);
    expect(citation?.text).toBe("[@smith2020]");
  });

  it("reads a citation's locator", () => {
    const citation = allInlines("A claim [@smith2020, p. 4].\n").find(
      (inline) => inline.kind === "citation",
    );
    expect(citation?.keys).toEqual(["smith2020"]);
    expect(citation?.locator).toBe("p. 4");
  });

  it("reads several keys in one citation, and a prefix before them", () => {
    const citation = allInlines("As shown [e.g., @punnen2025prompts; @ge2025survey].\n").find(
      (inline) => inline.kind === "citation",
    );
    expect(citation?.keys).toEqual(["punnen2025prompts", "ge2025survey"]);
  });

  it("reads a citation written in prose", () => {
    const citation = allInlines("As @smith2020 shows.\n").find(
      (inline) => inline.kind === "citation",
    );
    expect(citation?.keys).toEqual(["smith2020"]);
    expect(citation?.text).toBe("@smith2020");
  });

  it("leaves an address that merely holds an at sign alone", () => {
    expect(
      allInlines("Write to alice@example.org today.\n").some(
        (inline) => inline.kind === "citation",
      ),
    ).toBe(false);
  });

  it("leaves a link alone", () => {
    const inlines = allInlines("See [the paper](https://example.org/@smith2020).\n");
    expect(inlines.some((inline) => inline.kind === "citation")).toBe(false);
    expect(inlines.some((inline) => inline.kind === "link")).toBe(true);
  });

  it("reads a footnote reference and its definition, each where it was written", () => {
    const chapter = parseChapter(
      "The survey ran[^dates].\n\n[^dates]: Between 1996 and 1999.\n",
    );
    const reference = [...walkInlines(chapter.blocks[0]?.inlines ?? [])].find(
      (inline) => inline.kind === "footnote-reference",
    );
    expect(reference?.label).toBe("dates");
    const definition = chapter.footnotes["dates"];
    expect(definition?.line).toBe(3);
    expect(definition?.blocks[0]?.text).toBe("Between 1996 and 1999.");
    expect(byteSlice(chapter.source, definition?.span ?? { start: 0, end: 0 })).toBe(
      "[^dates]: Between 1996 and 1999.",
    );
  });

  it("reads an inline footnote and keeps its content on the node", () => {
    const note = allInlines("The survey ran^[an inline note] for years.\n").find(
      (inline) => inline.kind === "footnote-inline",
    );
    expect(note?.text).toBe("an inline note");
  });
});

describe("spans and attributes", () => {
  it("gives every block a span that slices back to its own source", () => {
    const source =
      "# Title\n\nA paragraph.\n\n## Section\n\n- one\n- two\n\n::: {.notes}\nA note.\n:::\n";
    const chapter = parseChapter(source);
    expect(chapter.blocks.map((block) => byteSlice(source, block.span))).toEqual([
      "# Title",
      "A paragraph.",
      "## Section",
      "- one\n- two",
      "::: {.notes}\nA note.\n:::",
    ]);
  });

  it("measures spans in UTF-8 bytes, not in characters", () => {
    const source = "# Technikfolgenabschätzung\n\nAfter.\n";
    const chapter = parseChapter(source);
    // The heading holds one two-byte character, so the paragraph starts a byte
    // later than a character count would say.
    expect(chapter.blocks[0]?.span).toEqual({ start: 0, end: 27 });
    expect(byteSlice(source, chapter.blocks[1]?.span ?? { start: 0, end: 0 })).toBe("After.");
  });

  it("measures spans in a file with CRLF line endings", () => {
    const source = "# Title\r\n\r\nA paragraph.\r\n";
    const chapter = parseChapter(source);
    expect(chapter.blocks.map((block) => byteSlice(source, block.span))).toEqual([
      "# Title",
      "A paragraph.",
    ]);
  });

  it("keeps a chapter's front matter out of the blocks and names its span", () => {
    const source = "---\ntitle: A chapter\n---\n\n# Title\n\nProse.\n";
    const chapter = parseChapter(source);
    expect(chapter.frontMatter?.text).toBe("title: A chapter");
    expect(byteSlice(source, chapter.frontMatter?.span ?? { start: 0, end: 0 })).toBe(
      "---\ntitle: A chapter\n---",
    );
    expect(chapter.blocks.map((block) => block.line)).toEqual([5, 7]);
  });
});

describe("images and tables", () => {
  it("makes an image paragraph a block of its own, alt the caption and title the credit", () => {
    const block = firstBlock(
      '![The lantern at dusk](assets/lantern.jpg "Photograph by Carol"){.full-bleed}\n',
    );
    expect(block.kind).toBe("image");
    expect(block.image).toEqual({
      src: "assets/lantern.jpg",
      caption: "The lantern at dusk",
      credit: "Photograph by Carol",
    });
    expect(block.attributes.classes).toEqual(["full-bleed"]);
  });

  it("keeps an image's width and its cross-reference target", () => {
    const block = firstBlock('![Dusk](assets/lantern.jpg){#fig:lantern width="75%"}\n');
    expect(block.attributes.id).toBe("fig:lantern");
    expect(block.attributes.pairs["width"]).toBe("75%");
  });

  it("leaves a paragraph that holds an image and prose a paragraph", () => {
    expect(firstBlock("Before ![Dusk](assets/lantern.jpg) after.\n").kind).toBe("paragraph");
  });

  it("folds a caption line into the table it follows", () => {
    const chapter = parseChapter(
      "| a | b |\n|---|---|\n| 1 | 2 |\n\n: The counts by winter {#tbl:counts}\n",
    );
    expect(chapter.blocks).toHaveLength(1);
    const table = chapter.blocks[0];
    expect(table?.kind).toBe("table");
    expect(table?.caption).toBe("The counts by winter");
    expect(table?.attributes.id).toBe("tbl:counts");
    expect(table?.table?.head[0]?.map((cell) => cell.text)).toEqual(["a", "b"]);
    expect(table?.table?.body[0]?.map((cell) => cell.text)).toEqual(["1", "2"]);
  });

  it("keeps a link's target and a cross-reference to a figure", () => {
    const link = allInlines("See [the lantern](#fig:lantern).\n").find(
      (inline) => inline.kind === "link",
    );
    expect(link?.href).toBe("#fig:lantern");
    expect(link?.text).toBe("the lantern");
  });
});

describe("fenced divs", () => {
  it("nests the canon's columns form rather than closing at the first fence", () => {
    const chapter = parseChapter(
      '::: {.columns}\n' +
        '::: {.column width="50%"}\nLeft.\n:::\n' +
        '::: {.column width="50%"}\nRight.\n:::\n' +
        ':::\n\nAfter.\n',
    );
    expect(chapter.blocks.map((block) => block.kind)).toEqual(["div", "paragraph"]);
    const columns = chapter.blocks[0];
    expect(columns?.attributes.classes).toEqual(["columns"]);
    expect(columns?.children.map((child) => child.attributes.pairs["width"])).toEqual([
      "50%",
      "50%",
    ]);
    expect(columns?.children[0]?.children[0]?.text).toBe("Left.");
    expect(chapter.blocks[1]?.text).toBe("After.");
  });

  it("reads a speaker-notes div", () => {
    const block = firstBlock("::: {.notes}\nSlow down here.\n:::\n");
    expect(block.kind).toBe("div");
    expect(block.attributes.classes).toEqual(["notes"]);
    expect(block.children[0]?.text).toBe("Slow down here.");
  });

  it("reads a callout and its kind", () => {
    const block = firstBlock('::: {.callout kind="warning"}\nEstimates.\n:::\n');
    expect(block.attributes.classes).toEqual(["callout"]);
    expect(block.attributes.pairs["kind"]).toBe("warning");
  });

  it("reads a source credit", () => {
    const block = firstBlock("::: {.credit}\nPhotograph by Carol.\n:::\n");
    expect(block.attributes.classes).toEqual(["credit"]);
  });

  it("reads an opening quotation and its once rule", () => {
    const block = firstBlock(
      '::: {.opening once="per-browser"}\n> The lantern was not the point.\n\n— Carol\n:::\n',
    );
    expect(block.attributes.classes).toEqual(["opening"]);
    expect(block.attributes.pairs["once"]).toBe("per-browser");
    expect(block.children.map((child) => child.kind)).toEqual(["quote", "paragraph"]);
  });

  it("reads an easter egg's block and its marker", () => {
    const chapter = parseChapter(
      'The survey ran[✦]{.egg egg="lantern"} on.\n\n::: {.egg #lantern label="✦"}\nA photograph.\n:::\n',
    );
    const marker = [...walkInlines(chapter.blocks[0]?.inlines ?? [])].find(
      (inline) => inline.kind === "span",
    );
    expect(marker?.attributes.classes).toEqual(["egg"]);
    expect(marker?.attributes.pairs["egg"]).toBe("lantern");
    const block = chapter.blocks[1];
    expect(block?.attributes.id).toBe("lantern");
    expect(block?.attributes.pairs["label"]).toBe("✦");
  });

  it("carries an unknown div's classes rather than dropping the div", () => {
    const block = firstBlock("::: {.lantern}\nProse.\n:::\n");
    expect(block.kind).toBe("div");
    expect(block.attributes.classes).toEqual(["lantern"]);
    expect(block.children[0]?.text).toBe("Prose.");
  });

  it("reads a div written Pandoc's other way, as a bare class name", () => {
    expect(firstBlock("::: notes\nProse.\n:::\n").attributes.classes).toEqual(["notes"]);
  });
});

describe("variants", () => {
  it("reads a variant block's names and hands them to what it holds", () => {
    const block = firstBlock(
      '::: {.variant variant="talk full"}\n## A section for two\n:::\n',
    );
    expect(block.variants).toEqual(["talk", "full"]);
    expect(block.children[0]?.variants).toEqual(["talk", "full"]);
  });

  it("leaves a block with no variant attribute in every variant", () => {
    expect(firstBlock("A paragraph.\n").variants).toEqual([]);
  });

  it("reads an inline variant span", () => {
    const span = allInlines(
      'She arrived [in the second week]{.variant variant="full"} and stayed.\n',
    ).find((inline) => inline.kind === "span");
    expect(span?.variants).toEqual(["full"]);
    expect(span?.text).toBe("in the second week");
  });

  it("reads a margin aside", () => {
    const span = allInlines("A sentence [a remark in the margin]{.margin} ends.\n").find(
      (inline) => inline.kind === "span",
    );
    expect(span?.attributes.classes).toEqual(["margin"]);
  });
});

describe("video", () => {
  it("reads every source role in order, the new remote role among them", () => {
    const block = firstBlock(
      '::: {.video poster="assets/keynote-poster.jpg" caption="The second half"}\n' +
        "- local: asset:b1946ac92492d234\n" +
        "- site: keynote.mp4\n" +
        "- remote: https://example.org/keynote.mp4\n" +
        "- gated: https://media.example.org/keynote.mp4\n" +
        ":::\n",
    );
    expect(block.video?.poster).toBe("assets/keynote-poster.jpg");
    expect(block.video?.caption).toBe("The second half");
    expect(block.video?.sources).toEqual([
      { role: "local", reference: "asset:b1946ac92492d234", known: true },
      { role: "site", reference: "keynote.mp4", known: true },
      { role: "remote", reference: "https://example.org/keynote.mp4", known: true },
      { role: "gated", reference: "https://media.example.org/keynote.mp4", known: true },
    ]);
  });

  it("keeps a role the canon does not name, and says it does not know it", () => {
    const block = firstBlock("::: {.video}\n- stream: rtmp://example.org/live\n:::\n");
    expect(block.video?.sources[0]).toEqual({
      role: "stream",
      reference: "rtmp://example.org/live",
      known: false,
    });
  });
});
