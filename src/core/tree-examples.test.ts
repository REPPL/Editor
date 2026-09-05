/**
 * The parse over every chapter of the three example documents.
 *
 * Two things are checked. A snapshot of each chapter's tree, so a change to
 * the parse shows itself against real documents rather than against fixtures
 * written to suit it; and the properties every chapter's spans must have,
 * which is what a serialiser and an annotation anchor will rest on.
 *
 * The deck bundle's own `examples.test.ts` snapshots slide plans from the same
 * documents; this file is the tree they are built from.
 */

import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { outlineOf, walkOutline } from "./outline";
import { parseChapter } from "./parse";
import { sliceBytes, walkBlocks, type Block, type Chapter } from "./tree";

/** The example documents, each a folder of Parts holding chapters. */
const EXAMPLES = ["manuscript", "talk", "presentation"];

/** Every chapter of every example, in document order. */
function chapters(): { path: string; source: string }[] {
  const found: { path: string; source: string }[] = [];
  for (const document of EXAMPLES) {
    const root = `examples/${document}`;
    for (const part of readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()) {
      for (const file of readdirSync(`${root}/${part}`)
        .filter((name) => name.endsWith(".md"))
        .sort()) {
        const path = `${root}/${part}/${file}`;
        found.push({ path, source: readFileSync(path, "utf8") });
      }
    }
  }
  return found;
}

/** One line per block: what it is, where it is, and what it carries. */
function digest(chapter: Chapter): string {
  const lines: string[] = [];
  const write = (blocks: readonly Block[], depth: number): void => {
    for (const block of blocks) {
      const attributes = [
        block.attributes.id === null ? "" : `#${block.attributes.id}`,
        ...block.attributes.classes.map((name) => `.${name}`),
        ...Object.entries(block.attributes.pairs).map(([key, value]) => `${key}="${value}"`),
      ]
        .filter(Boolean)
        .join(" ");
      const facets = [
        block.level === undefined ? "" : `h${block.level}`,
        block.image === undefined ? "" : `src=${block.image.src}`,
        block.image?.credit ? `credit="${block.image.credit}"` : "",
        block.caption === undefined ? "" : `caption="${block.caption}"`,
        block.video === undefined ? "" : `video=${block.video.sources.length}`,
        block.variants.length === 0 ? "" : `variant=${block.variants.join("+")}`,
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(
        [
          `${"  ".repeat(depth)}${block.kind}`,
          `${block.line}-${block.endLine}`,
          `[${block.span.start},${block.span.end}]`,
          attributes === "" ? "" : `{${attributes}}`,
          facets,
          JSON.stringify(block.text.replace(/\s+/g, " ").slice(0, 60)),
        ]
          .filter(Boolean)
          .join(" "),
      );
      write(block.children, depth + 1);
    }
  };
  write(chapter.blocks, 0);
  for (const [label, definition] of Object.entries(chapter.footnotes)) {
    lines.push(`footnote[${label}] ${definition.line} ${JSON.stringify(definition.blocks[0]?.text.slice(0, 60) ?? "")}`);
  }
  return lines.join("\n");
}

/** The outline as one line per node. */
function outlineDigest(chapter: Chapter): string {
  const outline = outlineOf(chapter);
  return [
    `title: ${outline.title ?? "(none)"}`,
    ...[...walkOutline(outline.nodes)].map(
      (node) => `${"  ".repeat(node.level - 2)}${node.kind} ${node.line} ${node.id}`,
    ),
  ].join("\n");
}

describe("every chapter of the examples", () => {
  for (const { path, source } of chapters()) {
    const chapter = parseChapter(source);

    it(`parses ${path}`, () => {
      expect(digest(chapter)).toMatchSnapshot();
    });

    it(`outlines ${path}`, () => {
      expect(outlineDigest(chapter)).toMatchSnapshot();
    });

    it(`spans ${path} back onto its own bytes`, () => {
      const bytes = new TextEncoder().encode(source).length;
      const slice = sliceBytes(source);
      const lines = source.split(/\r\n?|\n/);

      /**
       * One run of siblings: every span slices back to the block's own lines,
       * whole, and no two siblings overlap.
       */
      const check = (blocks: readonly Block[]): void => {
        let previousEnd = 0;
        for (const block of blocks) {
          const where = `${path}:${block.line}`;
          expect(block.span.start, where).toBeGreaterThanOrEqual(0);
          expect(block.span.end, where).toBeLessThanOrEqual(bytes);
          expect(block.span.start, where).toBeLessThanOrEqual(block.span.end);
          // The whole slice, not only its first line: a span that named the
          // right line and the wrong length would pass a first-line check.
          expect(slice(block.span), where).toBe(
            lines.slice(block.line - 1, block.endLine).join("\n"),
          );
          // Siblings are in source order and do not overlap.
          expect(block.span.start, where).toBeGreaterThanOrEqual(previousEnd);
          previousEnd = block.span.end;
          check(block.children);
          for (const item of block.items ?? []) check(item.blocks);
        }
      };
      check(chapter.blocks);
    });
  }
});

describe("the constructs the examples exercise", () => {
  /** Every block of every example chapter. */
  function everyBlock(): Block[] {
    return chapters().flatMap(({ source }) => [...walkBlocks(parseChapter(source).blocks)]);
  }

  it("finds the constructs `examples/CANON-CHECK.md` says are there", () => {
    const blocks = everyBlock();
    const classes = new Set(blocks.flatMap((block) => block.attributes.classes));
    for (const name of ["divider", "columns", "column", "notes", "credit", "refs", "full-bleed"]) {
      expect(classes, name).toContain(name);
    }
    expect(blocks.some((block) => block.kind === "rule")).toBe(true);
    expect(blocks.some((block) => block.kind === "table" && block.caption !== undefined)).toBe(
      true,
    );
    expect(
      blocks.some((block) => block.kind === "image" && block.image?.credit !== ""),
    ).toBe(true);
    expect(blocks.some((block) => block.attributes.id?.startsWith("fig:") === true)).toBe(true);
  });

  it("finds no construct the examples do not carry", () => {
    const classes = new Set(everyBlock().flatMap((block) => block.attributes.classes));
    for (const name of ["variant", "callout", "video", "opening", "egg"]) {
      expect(classes, name).not.toContain(name);
    }
  });

  it("gives every example chapter a title", () => {
    for (const { path, source } of chapters()) {
      expect(outlineOf(parseChapter(source)).title, path).not.toBeNull();
    }
  });
});
