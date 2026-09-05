/**
 * Degrade gracefully in a plain tool.
 *
 * The bar is not that a plain tool understands a fenced div — it will not —
 * but that it reads past it: a plain conversion of a shaped chapter must lose
 * no paragraph, swallow none inside a construct, and reach the end of the
 * file. A bare markdown-it, with no Editor plugin registered, is the plain
 * tool this suite can run; Pandoc, the tool the canon is written against, is a
 * manual check recorded with the phase's acceptance run, because it is a
 * development convenience and not a dependency of this repository.
 *
 * The second half is the byte-fidelity criterion: inserting a construct
 * changes the inserted div and its blank lines, and nothing else in the file.
 */

import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vitest";

import { formById } from "./inserts";
import { parseChapter } from "./parse";
import { byteLength } from "./tree";

/** The plain tool: markdown-it with nothing of Editor's added to it. */
const plain = new MarkdownIt();

/** A chapter carrying one of each of this phase's constructs. */
const SHAPED = [
  "# The Lantern Papers",
  "",
  "## Interlude {.divider}",
  "",
  "A breath before the second half.",
  "",
  "## Beginnings",
  "",
  "The first winter was the coldest.",
  "",
  "---",
  "",
  "The second winter was worse.",
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
  "::: {.notes}",
  "Slow down here. The point is the date, not the number.",
  ":::",
  "",
  "::: {.credit}",
  "Photograph by Carol, used with permission.",
  ":::",
  "",
  "<!-- pagebreak -->",
  "",
  "The last paragraph of the file.",
  "",
].join("\n");

/** The same chapter with every construct's markup taken out. */
const STRIPPED = [
  "# The Lantern Papers",
  "",
  "## Interlude",
  "",
  "A breath before the second half.",
  "",
  "## Beginnings",
  "",
  "The first winter was the coldest.",
  "",
  "The second winter was worse.",
  "",
  "Left.",
  "",
  "Right.",
  "",
  "Slow down here. The point is the date, not the number.",
  "",
  "Photograph by Carol, used with permission.",
  "",
  "The last paragraph of the file.",
  "",
].join("\n");

/** Undo the entities a plain conversion writes, so the prose compares. */
function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * The prose a conversion carries, one line per line of text.
 *
 * The fence markers, the heading attribute and the page-break comment are the
 * visible cost the canon accepted in exchange for a Pandoc-compatible form,
 * and a plain tool prints them as text — markdown-it's default settings escape
 * an HTML comment rather than passing it through. They are taken out here;
 * every other line has to match.
 */
function prose(html: string): string[] {
  return decode(html.replace(/<[^>]*>/g, "\n"))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .filter((line) => !/^:{3,}/.test(line))
    .filter((line) => !/^<!--/.test(line))
    .map((line) => line.replace(/\s*\{\.[^}]*\}$/, ""));
}

describe("a plain tool", () => {
  it("converts to the same prose with the constructs stripped", () => {
    const shaped = prose(plain.render(SHAPED));
    const stripped = prose(plain.render(STRIPPED));
    expect(shaped).toEqual(stripped);
    // No paragraph is lost, and none is swallowed by a construct.
    for (const line of stripped) expect(shaped).toContain(line);
  });

  it("reaches the end of the file in both cases", () => {
    const shaped = prose(plain.render(SHAPED));
    const stripped = prose(plain.render(STRIPPED));
    expect(shaped[shaped.length - 1]).toBe("The last paragraph of the file.");
    expect(stripped[stripped.length - 1]).toBe("The last paragraph of the file.");
  });

  it("swallows nothing inside a fence: the columns' own text survives", () => {
    const shaped = prose(plain.render(SHAPED));
    expect(shaped).toContain("Left.");
    expect(shaped).toContain("Right.");
  });

  it("prints every canonical insert form's prose", () => {
    for (const id of ["slide-split", "columns", "speaker-notes", "credit", "page-break"]) {
      const form = formById(id);
      expect(form, id).toBeDefined();
      const html = plain.render(`Before.\n\n${form?.text ?? ""}\n\nAfter.\n`);
      expect(prose(html), id).toContain("Before.");
      expect(prose(html), id).toContain("After.");
    }
  });
});

/**
 * Insert a block at a line boundary, one blank line either side.
 *
 * This is the shape the palette writes; what is under test here is that a
 * chapter is otherwise untouched, so the insertion is done by the test rather
 * than by a module that might normalise something on the way.
 */
function insertAtLine(source: string, line: number, block: string): {
  next: string;
  at: number;
  length: number;
} {
  const lines = source.split("\n");
  const at = lines.slice(0, line).reduce((total, text) => total + text.length + 1, 0);
  const inserted = `${block}\n\n`;
  return {
    next: source.slice(0, at) + inserted + source.slice(at),
    at,
    length: inserted.length,
  };
}

describe("byte fidelity", () => {
  it("leaves every byte outside the inserted div alone", () => {
    const form = formById("speaker-notes");
    expect(form).toBeDefined();
    const { next, at, length } = insertAtLine(SHAPED, 9, form?.text ?? "");
    expect(next.slice(0, at)).toBe(SHAPED.slice(0, at));
    expect(next.slice(at + length)).toBe(SHAPED.slice(at));
    expect(byteLength(next)).toBe(byteLength(SHAPED) + byteLength(next.slice(at, at + length)));
    // Nothing elsewhere reflowed, re-escaped or realigned.
    expect(next.replace(next.slice(at, at + length), "")).toBe(SHAPED);
  });

  it("leaves the source unchanged by parsing it", () => {
    const before = SHAPED;
    const chapter = parseChapter(SHAPED);
    expect(chapter.source).toBe(before);
    expect(SHAPED).toBe(before);
  });
});
