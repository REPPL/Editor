/**
 * The forms table: that each form is the canon's form, parses to the node the
 * canon names, and reads in a plain tool.
 *
 * Every row is checked, not only the six phase 1 offers, so a later phase
 * changes one number rather than adding a form and its tests together.
 */

import { readFileSync } from "node:fs";

import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vitest";

import { formById, formsVisibleIn, matchForms, INSERT_FORMS, type InsertForm } from "./inserts";
import { parseChapter } from "./parse";
import { walkBlocks, walkInlines, type Block, type Inline } from "./tree";

const INTERNALS = ".abcd/development/brief/05-internals.md";

/** A chapter holding one of every form, with prose between them. */
function chapterOfEveryForm(): { source: string; prose: string[] } {
  const prose: string[] = [];
  const parts: string[] = ["# A chapter of every construct", ""];
  INSERT_FORMS.forEach((form, index) => {
    const line = `Prose ${index} before ${form.id}.`;
    prose.push(line);
    parts.push(line, "");
    if (form.shape === "heading-attribute") {
      parts.push(`## Interlude${form.text}`, "");
    } else if (form.shape === "inline") {
      parts.push(`A sentence with ${form.text} in it.`, "");
    } else {
      parts.push(form.text.trimEnd(), "");
    }
  });
  const last = "The last paragraph of the chapter.";
  prose.push(last);
  parts.push(last, "");
  return { source: parts.join("\n"), prose };
}

/**
 * The text as it reaches the parse.
 *
 * Pandoc's citation and footnote are the two forms whose node exists only once
 * there is content between the brackets — `[@]` is text, `[@key]` is a
 * citation — so those two are filled at the cursor, where the author types.
 */
function filled(form: InsertForm): string {
  if (form.id !== "citation" && form.id !== "footnote") return form.text;
  return `${form.text.slice(0, form.cursor)}key${form.text.slice(form.cursor)}`;
}

/** Parse one form on its own and hand back the node it produced. */
function nodeOf(form: InsertForm): Block | Inline {
  if (form.shape === "heading-attribute") {
    const block = parseChapter(`## Interlude${form.text}\n`).blocks[0];
    if (block === undefined) throw new Error(`${form.id} parsed to nothing`);
    return block;
  }
  if (form.shape === "inline") {
    const chapter = parseChapter(`A sentence with ${filled(form)} in it.\n`);
    for (const block of walkBlocks(chapter.blocks)) {
      for (const node of walkInlines(block.inlines)) {
        if (node.kind === form.expects.nodeKind) return node;
      }
    }
    throw new Error(`${form.id} produced no ${form.expects.nodeKind}`);
  }
  const block = parseChapter(form.text).blocks[0];
  if (block === undefined) throw new Error(`${form.id} parsed to nothing`);
  return block;
}

describe("the table", () => {
  it("holds sixteen rows: the press release's fourteen, the rule, and the egg's second form", () => {
    expect(INSERT_FORMS).toHaveLength(16);
    expect(formById("slide-split")).toBeDefined();
    expect(formById("egg-marker")).toBeDefined();
    expect(formById("egg-block")).toBeDefined();
  });

  it("names each form once", () => {
    const ids = INSERT_FORMS.map((form) => form.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("offers six forms in phase 1 and every form by phase 4", () => {
    expect(formsVisibleIn(1).map((form) => form.id)).toEqual([
      "slide-split",
      "divider",
      "columns",
      "speaker-notes",
      "credit",
      "page-break",
    ]);
    expect(formsVisibleIn(4)).toHaveLength(16);
  });

  it("carries no cursor marker into the buffer", () => {
    for (const form of INSERT_FORMS) {
      expect(form.text, form.id).not.toContain("▮");
      expect(form.cursor, form.id).toBeGreaterThanOrEqual(0);
      expect(form.cursor, form.id).toBeLessThanOrEqual(form.text.length);
    }
  });

  it("puts the cursor where the content goes", () => {
    const columns = formById("columns");
    expect(columns?.text.slice(0, columns.cursor)).toBe(
      '::: {.columns}\n::: {.column width="50%"}\n',
    );
    const notes = formById("speaker-notes");
    expect(notes?.text.slice(0, notes.cursor)).toBe("::: {.notes}\n");
    expect(notes?.text.slice(notes.cursor)).toBe("\n:::\n");
    const margin = formById("margin-aside");
    expect(margin?.text.slice(0, margin.cursor)).toBe("[");
  });
});

describe("every form is the canon's form", () => {
  it("writes one of the five permitted shapes, or Pandoc's own citation or footnote", () => {
    const permitted = [
      /^:::\s/, // a fenced div with attributes
      /^\s\{[^}]*\}$/, // a heading attribute
      /^\[[\s\S]*\]\{[^}]*\}$/, // a bracketed span attribute
      /^<!--[\s\S]*-->$/, // an HTML comment
      /^\[@[^\]]*\]$/, // Pandoc's citation
      /^\^\[[^\]]*\]$/, // Pandoc's footnote
      /^---\n?$/, // a horizontal rule, which is not an extension at all
    ];
    for (const form of INSERT_FORMS) {
      const text = form.text.trimEnd();
      expect(
        permitted.some((shape) => shape.test(text)),
        `${form.id}: ${JSON.stringify(text)}`,
      ).toBe(true);
    }
  });

  it("spells every construct the way the internals chapter spells it", () => {
    const brief = readFileSync(INTERNALS, "utf8");
    for (const form of INSERT_FORMS) {
      const first = form.expects.classes[0];
      const marker =
        first !== undefined
          ? `{.${first}`
          : form.expects.nodeKind === "citation"
            ? "[@"
            : form.expects.nodeKind === "footnote-inline"
              ? "^["
              : form.expects.nodeKind === "comment"
                ? "<!-- pagebreak -->"
                : "---";
      expect(brief, `${form.id}: ${marker}`).toContain(marker);
      // An attribute the form fills in is the brief's own, spelt its way; one
      // the author fills in is empty here and cannot be quoted.
      for (const [key, value] of Object.entries(form.expects.pairs)) {
        if (value === "") expect(brief, `${form.id}.${key}`).toContain(`${key}=`);
        else expect(brief, `${form.id}.${key}`).toContain(`${key}="${value}"`);
      }
    }
  });

  it("parses to the node the mapping table names, with its attributes as written", () => {
    for (const form of INSERT_FORMS) {
      const node = nodeOf(form);
      expect(node.kind, form.id).toBe(form.expects.nodeKind);
      expect(node.attributes.classes, form.id).toEqual(form.expects.classes);
      for (const [key, value] of Object.entries(form.expects.pairs)) {
        expect(node.attributes.pairs[key], `${form.id}.${key}`).toBe(value);
      }
      const children = form.expects.children;
      if (children !== undefined) {
        const parsed = (node as Block).children;
        expect(parsed.map((child) => child.kind), form.id).toEqual(
          children.map((child) => child.nodeKind),
        );
        children.forEach((child, index) => {
          expect(parsed[index]?.attributes.classes, `${form.id}[${index}]`).toEqual(
            child.classes,
          );
        });
      }
    }
  });

  it("carries no path, no name, and no machine-local value", () => {
    for (const form of INSERT_FORMS) {
      expect(form.text, form.id).not.toMatch(/(^|[\s:="])[~/]/);
      expect(form.text, form.id).not.toContain("\\");
      expect(form.text.toLowerCase(), form.id).not.toContain("users");
    }
  });

  it("leaves an empty local source for the author to fill", () => {
    expect(formById("video")?.text).toBe("::: {.video}\n- local: \n:::\n");
  });
});

describe("a plain tool", () => {
  it("renders every paragraph, in order, and reaches the end of the file", () => {
    const { source, prose } = chapterOfEveryForm();
    // CommonMark and nothing more: the tool that knows none of the canon.
    const plain = new MarkdownIt("commonmark");
    const html = plain.render(source);
    let cursor = -1;
    for (const line of prose) {
      const found = html.indexOf(line, cursor + 1);
      expect(found, line).toBeGreaterThan(cursor);
      cursor = found;
    }
    expect(html).toContain("The last paragraph of the chapter.");
  });

  it("is read by Editor's own parse as the constructs it claims", () => {
    const { source } = chapterOfEveryForm();
    const chapter = parseChapter(source);
    const classes = [...walkBlocks(chapter.blocks)].flatMap(
      (block) => block.attributes.classes,
    );
    for (const id of ["columns", "notes", "credit", "callout", "video", "opening", "egg"]) {
      expect(classes, id).toContain(id);
    }
  });
});

describe("the filter", () => {
  it("reaches Columns first on a prefix", () => {
    // `spc-2609051353398011` offers "col" reaching Columns before Callout;
    // "callout" holds no "col", so on this table it reaches Columns alone.
    expect(matchForms("col").map((form) => form.id)).toEqual(["columns"]);
  });

  it("ranks a prefix above a substring", () => {
    const ids = matchForms("note").map((form) => form.id);
    expect(ids[0]).toBe("speaker-notes");
    expect(ids).toContain("footnote");
    expect(ids.indexOf("speaker-notes")).toBeLessThan(ids.indexOf("footnote"));
  });

  it("matches a keyword as well as a label", () => {
    expect(matchForms("speaker").map((form) => form.id)).toContain("speaker-notes");
    expect(matchForms("epigraph").map((form) => form.id)).toEqual(["opening"]);
  });

  it("matches everything on an empty query, and nothing on a miss", () => {
    expect(matchForms("")).toHaveLength(16);
    expect(matchForms("lantern")).toHaveLength(0);
  });

  it("filters within the phase it is given", () => {
    expect(matchForms("col", formsVisibleIn(1)).map((form) => form.id)).toEqual(["columns"]);
  });
});
