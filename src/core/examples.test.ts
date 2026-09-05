/**
 * The mapping on real documents.
 *
 * Every chapter of the three example documents, through the one parse, into a
 * slide plan and into the deck's markup. The snapshots are the record of what
 * the mapping actually does to writing nobody wrote for it: a change to the
 * mapping shows itself here against real talks and a real paper, rather than
 * against a fixture written to suit the change.
 *
 * The same tree also builds the article skeleton, which is what the
 * one-source discipline asks a spec to show — two renderings, one parse, and
 * each slide's headline its heading's own text.
 */

import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { pathResolver, referencesOf } from "./assets";
import { buildDeck, walkSlides, type DeckPlan } from "./deck";
import { parseChapter } from "./parse";
import { renderArticle } from "./render/article";
import { renderSlides } from "./render/slides";
import type { Chapter } from "./tree";

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

/** One line per slide: where it sits, what opened it, and what it carries. */
function digest(plan: DeckPlan): string {
  const lines: string[] = [];
  plan.columns.forEach((column, across) => {
    column.slides.forEach((slide, down) => {
      const face = slide.face.map((block) => block.kind).join(",");
      const notes = slide.notes.map((block) => block.kind).join(",");
      const foot = slide.foot.map((line) => line.kind).join(",");
      lines.push(
        [
          `${String(across)}.${String(down)}`,
          slide.kind,
          `#${slide.id}`,
          slide.classes.length === 0 ? "" : `.${slide.classes.join(".")}`,
          JSON.stringify(slide.headline),
          face === "" ? "" : `face=[${face}]`,
          notes === "" ? "" : `notes:${slide.notesSource}=[${notes}]`,
          foot === "" ? "" : `foot=[${foot}]`,
        ]
          .filter(Boolean)
          .join(" "),
      );
    });
  });
  return lines.join("\n");
}

/** Break a long line of markup so a snapshot can be read. */
function readable(markup: string): string {
  return markup.replace(/></g, ">\n<");
}

const parsed: { path: string; chapter: Chapter; plan: DeckPlan }[] = chapters().map(
  ({ path, source }) => {
    const chapter = parseChapter(source);
    return { path, chapter, plan: buildDeck(chapter) };
  },
);

describe("the slide plan on every example chapter", () => {
  for (const { path, plan } of parsed) {
    it(path, () => {
      expect(digest(plan)).toMatchSnapshot();
    });
  }
});

describe("the built deck on every example chapter", () => {
  for (const { path, plan } of parsed) {
    it(path, () => {
      expect(readable(renderSlides(plan, pathResolver()))).toMatchSnapshot();
    });
  }
});

describe("one source, always", () => {
  it("builds deck and article skeleton from one parseChapter result", () => {
    for (const { path, chapter, plan } of parsed) {
      const article = renderArticle(chapter, pathResolver());
      expect(article.startsWith("<article>"), path).toBe(true);
      expect(renderSlides(plan, pathResolver()).length, path).toBeGreaterThan(0);
    }
  });

  it("makes each slide headline its heading's own text", () => {
    for (const { path, chapter, plan } of parsed) {
      for (const slide of walkSlides(plan)) {
        if (slide.headline === "") continue;
        const heading = chapter.blocks.find(
          (block) => block.kind === "heading" && block.line === slide.line,
        );
        expect(heading?.text, `${path}: ${slide.id}`).toBe(slide.headline);
      }
    }
  });

  it("shows a speaker note on no slide the audience sees", () => {
    for (const { path, plan } of parsed) {
      const markup = renderSlides(plan, pathResolver());
      for (const slide of walkSlides(plan)) {
        if (slide.notesSource !== "authored") continue;
        for (const block of slide.notes) {
          if (block.text.trim() === "") continue;
          const face = markup.replace(/<aside class="notes"[^]*?<\/aside>/g, "");
          expect(face.includes(block.text.trim().slice(0, 30)), path).toBe(false);
        }
      }
    }
  });
});

describe("network only on publish", () => {
  it("names no absolute URL in any built deck, only what the chapter wrote", () => {
    for (const { path, chapter, plan } of parsed) {
      const markup = renderSlides(plan, pathResolver());
      for (const url of markup.match(/https?:\/\/[^"'\s<]+/g) ?? []) {
        // A link the author wrote is the author's; what may not appear is an
        // engine or a stylesheet fetched from somewhere.
        expect(chapter.source.includes(url), `${path}: ${url}`).toBe(true);
      }
      expect(markup, path).not.toContain("<script");
    }
  });
});

describe("no machine in the document", () => {
  it("finds no absolute or climbing image reference in any example", () => {
    const resolve = pathResolver();
    for (const { path, chapter } of parsed) {
      for (const reference of referencesOf(chapter)) {
        expect(resolve(reference).problem, `${path}: ${reference}`).toBeNull();
      }
    }
  });
});
