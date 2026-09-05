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

import { CANON_ROWS } from "./canon";
import { formById, formsVisibleIn, matchForms, INSERT_FORMS, type InsertForm } from "./inserts";
import { parseChapter } from "./parse";
import { walkBlocks, walkInlines, type Block, type Inline } from "./tree";

const INTERNALS = ".abcd/development/brief/05-internals.md";

/**
 * A sentinel the author would have typed into a form's cursor slot.
 *
 * A form with a body is inserted with the cursor in it, so what a plain tool
 * must show is not only the prose around the construct but the text inside
 * it. Each sentinel is unique to its row, so a form that swallowed its own
 * content — or another row's — is caught.
 */
function sentinelFor(form: InsertForm): string {
  return `Sentinel-${form.id}`;
}

/** One form as an author leaves it: the sentinel typed into the cursor slot. */
function withSentinel(form: InsertForm): string {
  const sentinel = sentinelFor(form);
  const body =
    form.cursor >= form.text.length
      ? form.text + sentinel
      : form.text.slice(0, form.cursor) + sentinel + form.text.slice(form.cursor);
  return body.replace(/^\n+/, "").replace(/\n+$/, "");
}

/** A chapter holding one of every form, with prose between them. */
function chapterOfEveryForm(): {
  source: string;
  prose: string[];
  sentinels: string[];
} {
  const prose: string[] = [];
  const sentinels: string[] = [];
  const parts: string[] = ["# A chapter of every construct", ""];
  INSERT_FORMS.forEach((form, index) => {
    const line = `Prose ${index} before ${form.id}.`;
    prose.push(line);
    parts.push(line, "");
    if (form.shape === "heading-attribute") {
      parts.push(`## Interlude${form.text}`, "");
    } else if (form.shape === "inline") {
      sentinels.push(sentinelFor(form));
      parts.push(`A sentence with ${withSentinel(form)} in it.`, "");
    } else {
      sentinels.push(sentinelFor(form));
      parts.push(withSentinel(form), "");
    }
  });
  const last = "The last paragraph of the chapter.";
  prose.push(last);
  parts.push(last, "");
  return { source: parts.join("\n"), prose, sentinels };
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

  it("offers the phase-1 constructs in phase 1 and every form by phase 4", () => {
    expect(formsVisibleIn(1).map((form) => form.id)).toEqual([
      "slide-split",
      "divider",
      "columns",
      "speaker-notes",
      "credit",
      "page-break",
      "footnote",
    ]);
    expect(formsVisibleIn(4)).toHaveLength(16);
  });

  it("takes every phase from the canon and keeps none of its own", () => {
    // One source for a construct's phase: the placement table. A form whose
    // number had been written here as well would drift from it, which is what
    // this holds against.
    for (const form of INSERT_FORMS) {
      const row = CANON_ROWS.find(
        (candidate) => candidate.phase === form.visibleFrom && candidate.id !== "",
      );
      expect(row, form.id).toBeDefined();
    }
    const byId = new Map(CANON_ROWS.map((row) => [row.id, row.phase]));
    expect(formById("variant-block")?.visibleFrom).toBe(byId.get("variant"));
    expect(formById("variant-span")?.visibleFrom).toBe(byId.get("variant"));
    expect(formById("opening")?.visibleFrom).toBe(byId.get("opening"));
    expect(formById("egg-marker")?.visibleFrom).toBe(byId.get("egg"));
    expect(formById("egg-block")?.visibleFrom).toBe(byId.get("egg"));
    expect(formById("footnote")?.visibleFrom).toBe(byId.get("footnote"));
    expect(formById("slide-split")?.visibleFrom).toBe(byId.get("rule"));
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
      // The blank lines a form carries so that it parses where it lands are
      // not part of its shape; other whitespace is (the divider's own form is
      // a space and an attribute list).
      const text = form.text.replace(/^\n+/, "").replace(/\n+$/, "");
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

describe("a form with prose directly after it", () => {
  /** The form on a line of its own, with the next sentence right behind it. */
  function beforeProse(form: InsertForm): string {
    return `A paragraph.\n\n${form.text}The next sentence.\n`;
  }

  it("splits the slide and leaves the next sentence its own paragraph", () => {
    // The one case the earlier test could not see: it put a blank line after
    // every form itself, so a form that needed one and did not carry one
    // passed anyway.
    const form = formById("slide-split");
    if (form === undefined) throw new Error("no slide-split form");
    const blocks = parseChapter(beforeProse(form)).blocks;
    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "rule", "paragraph"]);
    expect(blocks[2]?.text).toBe("The next sentence.");
  });

  it("writes a page break as a block, not as part of the paragraph after it", () => {
    const form = formById("page-break");
    if (form === undefined) throw new Error("no page-break form");
    const blocks = parseChapter(beforeProse(form)).blocks;
    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "comment", "paragraph"]);
    expect(blocks[2]?.text).toBe("The next sentence.");
  });

  it("leaves every block form its own construct, and the prose its own", () => {
    for (const form of INSERT_FORMS) {
      if (form.shape !== "block") continue;
      const blocks = parseChapter(beforeProse(form)).blocks;
      const kinds = blocks.map((block) => block.kind);
      expect(kinds[0], form.id).toBe("paragraph");
      expect(kinds, form.id).toContain(form.expects.nodeKind);
      expect(blocks[blocks.length - 1]?.text, form.id).toBe("The next sentence.");
    }
  });

  it("carries no leading newline, so a form on a blank line is the canon's own", () => {
    for (const form of INSERT_FORMS) {
      expect(form.text.startsWith("\n"), form.id).toBe(false);
    }
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

  it("shows what the author typed inside every construct", () => {
    // Prose between the constructs is not the promise. The promise is that
    // the words the author put *in* a construct are still readable in a tool
    // that knows nothing about the canon — which a check on the surrounding
    // paragraphs alone would never notice going missing.
    const { source, sentinels } = chapterOfEveryForm();
    const html = new MarkdownIt("commonmark").render(source);
    expect(sentinels.length).toBeGreaterThan(0);
    for (const sentinel of sentinels) {
      expect(html, sentinel).toContain(sentinel);
    }
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
