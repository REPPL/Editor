/**
 * The placement table, held against the brief it transcribes.
 *
 * The strongest assertion here reads `05-internals.md` section 3 and checks
 * that every cell's wording is the brief's own words. A table that has drifted
 * from the chapter it quotes is the failure this catches.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CANON_ROWS,
  inlinePlacementOf,
  placementOf,
  rowById,
  rowFor,
  rowForInline,
  type Rendering,
} from "./canon";
import { parseChapter } from "./parse";
import { walkInlines, type Block, type Inline } from "./tree";

const INTERNALS = ".abcd/development/brief/05-internals.md";
const RENDERINGS: readonly Rendering[] = ["article", "slides", "print"];

/**
 * The brief's own placement table, parsed into rows of cells.
 *
 * Four cells a row: the construct, then the article, the slides and the PDF,
 * in the chapter's own column order.
 */
function briefTable(): string[][] {
  const brief = readFileSync(INTERNALS, "utf8");
  const from = brief.indexOf("### What each rendering does with each construct");
  const table = brief.slice(from, brief.indexOf("\n## ", from));
  return table
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|\s*$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells[0] !== "Construct" && !(cells[0] ?? "").startsWith("---"));
}

/** The first block of a source. */
function block(source: string): Block {
  const first = parseChapter(source).blocks[0];
  if (first === undefined) throw new Error("no block was parsed");
  return first;
}

/** The first inline node of a source that has the wanted kind. */
function inline(source: string, kind: Inline["kind"]): Inline {
  for (const parsed of parseChapter(source).blocks) {
    for (const node of walkInlines(parsed.inlines)) {
      if (node.kind === kind) return node;
    }
  }
  throw new Error(`no ${kind} was parsed`);
}

describe("the table", () => {
  it("gives every construct a placement in all three renderings", () => {
    for (const row of CANON_ROWS) {
      for (const rendering of RENDERINGS) {
        expect(row[rendering].placement, `${row.id}.${rendering}`).toBeTruthy();
        expect(row[rendering].wording.length, `${row.id}.${rendering}`).toBeGreaterThan(0);
      }
    }
  });

  it("names each construct once", () => {
    const ids = CANON_ROWS.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("quotes the internals chapter cell for cell", () => {
    // Not `toContain` against the whole chapter: that passes even when two
    // cells of a row have been swapped, which is exactly the drift this is
    // here to catch. The brief's table is parsed, and each cell is held
    // against the cell in the same row and the same column.
    const brief = briefTable();
    expect(brief.length).toBe(CANON_ROWS.length);
    CANON_ROWS.forEach((row, index) => {
      const cells = brief[index];
      expect(cells, row.id).toBeDefined();
      expect(cells?.[0], `${row.id}.construct`).toBe(row.construct);
      RENDERINGS.forEach((rendering, column) => {
        expect(cells?.[column + 1], `${row.id}.${rendering}`).toBe(row[rendering].wording);
      });
    });
  });

  it("catches a row whose cells have been swapped", () => {
    // The check above must fail on a swap, or it is checking nothing.
    const brief = briefTable();
    const row = CANON_ROWS.find((candidate) => candidate.id === "columns");
    const cells = brief.find((line) => line[0] === row?.construct);
    expect(row?.article.wording).not.toBe(row?.slides.wording);
    expect(cells?.[1]).not.toBe(row?.slides.wording);
  });

  it("covers every construct the brief's own table lists", () => {
    const constructs = briefTable().map((cells) => cells[0]);
    expect(constructs.length).toBe(CANON_ROWS.length);
    expect(CANON_ROWS.map((row) => row.construct)).toEqual(constructs);
  });

  it("finds a row by its id", () => {
    expect(rowById("credit")?.construct).toBe("`.credit`");
    expect(rowById("lantern")).toBeUndefined();
  });
});

describe("what a block is", () => {
  it("reads the phase-1 constructs as the table's own rows", () => {
    expect(rowFor(block("## Beginnings\n"))?.id).toBe("headings");
    expect(rowFor(block("## Interlude {.divider}\n"))?.id).toBe("divider");
    expect(rowFor(block("## Sources {.refs}\n"))?.id).toBe("refs");
    expect(rowFor(block("---\n"))?.id).toBe("rule");
    expect(rowFor(block("::: {.columns}\n:::\n"))?.id).toBe("columns");
    expect(rowFor(block("::: {.notes}\nA note.\n:::\n"))?.id).toBe("notes");
    expect(rowFor(block("::: {.credit}\nBy Carol.\n:::\n"))?.id).toBe("credit");
    expect(rowFor(block("<!-- pagebreak -->\n"))?.id).toBe("pagebreak");
    expect(rowFor(block("![Dusk](assets/lantern.jpg)\n"))?.id).toBe("image-attributes");
  });

  it("reads the constructs later phases seed", () => {
    expect(rowFor(block('::: {.callout kind="warning"}\nMind.\n:::\n'))?.id).toBe("callout");
    expect(rowFor(block('::: {.variant variant="talk"}\nOnly here.\n:::\n'))?.id).toBe(
      "variant",
    );
    expect(rowFor(block("::: {.video}\n- local: a.mp4\n:::\n"))?.id).toBe("video");
    expect(rowFor(block('::: {.opening once="per-browser"}\n> Quiet.\n:::\n'))?.id).toBe(
      "opening",
    );
    expect(rowFor(block('::: {.egg #lantern label="✦"}\nHidden.\n:::\n'))?.id).toBe("egg");
  });

  it("names no construct for a block the canon does not know", () => {
    expect(rowFor(block("An ordinary paragraph.\n"))).toBeUndefined();
    expect(rowFor(block("::: {.lantern}\nProse.\n:::\n"))).toBeUndefined();
  });

  it("reads the inline constructs", () => {
    expect(rowForInline(inline("A claim [@smith2020].\n", "citation"))?.id).toBe("citation");
    expect(rowForInline(inline("A note[^dates].\n\n[^dates]: Here.\n", "footnote-reference"))?.id).toBe(
      "footnote",
    );
    expect(rowForInline(inline("A ^[note] here.\n", "footnote-inline"))?.id).toBe("footnote");
    expect(rowForInline(inline("A [remark]{.margin} here.\n", "span"))?.id).toBe("margin");
    expect(
      rowForInline(inline('A [phrase]{.variant variant="full"} here.\n', "span"))?.id,
    ).toBe("variant");
    expect(rowForInline(inline('A[✦]{.egg egg="lantern"} here.\n', "span"))?.id).toBe("egg");
  });
});

describe("what each rendering does", () => {
  it("places the five slide constructs as the table says", () => {
    expect(placementOf(block("---\n"), "slides")).toBe("split");
    expect(placementOf(block("---\n"), "article")).toBe("flow");
    expect(placementOf(block("## Interlude {.divider}\n"), "slides")).toBe("section-break");
    expect(placementOf(block("## Interlude {.divider}\n"), "article")).toBe("flow");
    expect(placementOf(block("::: {.columns}\n:::\n"), "slides")).toBe("columns");
    expect(placementOf(block("::: {.columns}\n:::\n"), "article")).toBe("flow");
    expect(placementOf(block("::: {.notes}\nA note.\n:::\n"), "slides")).toBe("notes");
    expect(placementOf(block("::: {.notes}\nA note.\n:::\n"), "article")).toBe("absent");
    expect(placementOf(block("::: {.credit}\nBy Carol.\n:::\n"), "slides")).toBe("foot");
    expect(placementOf(block("::: {.credit}\nBy Carol.\n:::\n"), "article")).toBe("margin");
  });

  it("ignores a page break in both phase-1 renderings", () => {
    expect(placementOf(block("<!-- pagebreak -->\n"), "slides")).toBe("ignored");
    expect(placementOf(block("<!-- pagebreak -->\n"), "article")).toBe("ignored");
    expect(placementOf(block("<!-- pagebreak -->\n"), "print")).toBe("page-break");
  });

  it("puts a citation and a footnote at the foot of a slide", () => {
    expect(inlinePlacementOf(inline("A claim [@smith2020].\n", "citation"), "slides")).toBe(
      "foot",
    );
    expect(inlinePlacementOf(inline("A ^[note] here.\n", "footnote-inline"), "slides")).toBe(
      "foot",
    );
    expect(inlinePlacementOf(inline("A ^[note] here.\n", "footnote-inline"), "article")).toBe(
      "margin",
    );
  });
});
