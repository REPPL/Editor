/**
 * The sidebar's citation badge (itd-2609051335502171, map #11).
 *
 * The header comment in `sidebar.ts` reserves an empty badge slot on every
 * row "so the variant, asset, and citation marks of later maps add data
 * rather than a redesign"; this is the first of the three landing, and what
 * it does to that slot on a chapter row is what is proved here.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createSidebar, type ChapterFacts, type SidebarHooks } from "./sidebar";
import type { Chapter, DocumentTree } from "./doctree";

function chapter(path: string, title: string): Chapter {
  return { name: path, title, path, order: 1, bytes: 10, modified: null };
}

function treeOf(...chapters: Chapter[]): DocumentTree {
  return {
    root: {
      name: "root",
      title: "A Paper",
      path: "",
      order: null,
      parts: [],
      chapters,
      truncated: false,
    },
    failures: [],
  };
}

function hooks(): SidebarHooks {
  return { onOpenChapter: vi.fn(), onOpenFolder: vi.fn() };
}

describe("the citation badge on a chapter row", () => {
  it("shows nothing when no facts are given at all", () => {
    const sidebar = createSidebar(hooks());
    sidebar.show(treeOf(chapter("01-a.md", "A")));
    expect(sidebar.element.querySelector(".tree-badge-citation")).toBeNull();
  });

  it("shows nothing for a chapter whose citations all resolve", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([["01-a.md", { unresolvedCitations: [] }]]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    expect(sidebar.element.querySelector(".tree-badge-citation")).toBeNull();
  });

  it("names the count and lists the keys, for one unresolved key (Fable F9)", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: ["nosuchkey"] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    const badge = sidebar.element.querySelector(".tree-badge-citation");
    // "1 citation", not "1 unresolved": the egg badge beside it must read
    // differently, not merely in a different colour.
    expect(badge?.textContent).toBe("1 citation");
    expect(badge?.getAttribute("title")).toBe("Unresolved citation key: nosuchkey");
    // The key itself reaches a screen reader or a keyboard-only reader too,
    // not only the `title` tooltip a pointer hovers to see.
    expect(badge?.getAttribute("aria-label")).toBe("1 citation: nosuchkey");
  });

  it("names the count and lists every key, for more than one", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: ["nosuchkey", "another"] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    const badge = sidebar.element.querySelector(".tree-badge-citation");
    expect(badge?.textContent).toBe("2 citations");
    expect(badge?.getAttribute("title")).toBe("Unresolved citation keys: nosuchkey, another");
    expect(badge?.getAttribute("aria-label")).toBe("2 citations: nosuchkey, another");
  });

  it("marks only the chapter facts names, not one it says nothing about", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: ["nosuchkey"] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A"), chapter("02-b.md", "B")), new Map(), facts);
    const badges = sidebar.element.querySelectorAll(".tree-badge-citation");
    expect(badges).toHaveLength(1);
  });
});

describe("the hidden-construct badge on a chapter row (itd-2609051335518134, map #12)", () => {
  it("shows nothing when no facts are given at all", () => {
    const sidebar = createSidebar(hooks());
    sidebar.show(treeOf(chapter("01-a.md", "A")));
    expect(sidebar.element.querySelector(".tree-badge-egg")).toBeNull();
  });

  it("shows nothing for a chapter whose facts name no unresolved egg", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: [], unresolvedEggs: [] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    expect(sidebar.element.querySelector(".tree-badge-egg")).toBeNull();
  });

  it("names the count and lists the entries, for one unresolved construct (Fable F9)", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: [], unresolvedEggs: ["lantern (marker with no matching block)"] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    const badge = sidebar.element.querySelector(".tree-badge-egg");
    // "1 hidden mark", not "1 unresolved": distinguishable from the
    // citation badge by its own word, not only by colour.
    expect(badge?.textContent).toBe("1 hidden mark");
    expect(badge?.getAttribute("title")).toBe(
      "Unresolved hidden construct: lantern (marker with no matching block)",
    );
    expect(badge?.getAttribute("aria-label")).toBe(
      "1 hidden mark: lantern (marker with no matching block)",
    );
  });

  it("names the count and lists every entry, for more than one", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      [
        "01-a.md",
        {
          unresolvedCitations: [],
          unresolvedEggs: [
            "lantern (marker with no matching block)",
            "opening (not the first block of the first chapter)",
          ],
        },
      ],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    const badge = sidebar.element.querySelector(".tree-badge-egg");
    expect(badge?.textContent).toBe("2 hidden marks");
  });

  it("shows the citation and the egg badge side by side when a chapter carries both", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: ["nosuchkey"], unresolvedEggs: ["lantern (block with no marker)"] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    expect(sidebar.element.querySelector(".tree-badge-citation")).not.toBeNull();
    expect(sidebar.element.querySelector(".tree-badge-egg")).not.toBeNull();
  });
});

/**
 * What hiding the sidebar hides (`iss-2609091754178640`).
 *
 * `setOpen` writes `data-open`, and that much is proven in `src/focus.test.ts`
 * against the chords that call it. What the attribute is worth is a claim about
 * the stylesheet, and jsdom applies no media query, so the rule is read here as
 * text: hiding has to be honoured wherever the sidebar is drawn, and it was
 * honoured only inside the drawer's own query, which left a hidden tree on
 * screen as a column above 820 CSS pixels. The pixels themselves stay a manual
 * check (M30-1); what is provable here is that no width guards the rule.
 */
describe("the stylesheet's rule for a hidden sidebar", () => {
  /**
   * The stylesheet with every media block dropped: what applies at every width.
   *
   * The file is Prettier-formatted, so a rule inside a query is indented and
   * one outside it is not, but reading the braces is the claim itself rather
   * than a claim about the formatter.
   */
  function atEveryWidth(css: string): string {
    let kept = "";
    let at = 0;
    for (;;) {
      const start = css.indexOf("@media", at);
      if (start < 0) return kept + css.slice(at);
      kept += css.slice(at, start);
      let depth = 0;
      let index = css.indexOf("{", start);
      for (; index < css.length; index += 1) {
        if (css[index] === "{") depth += 1;
        else if (css[index] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      at = index + 1;
    }
  }

  const css = readFileSync(join(__dirname, "style.css"), "utf8");

  it("takes the sidebar off the page at every width, in one rule", () => {
    expect(css.match(/\.sidebar\[data-open="no"\]/g)).toHaveLength(1);
    expect(atEveryWidth(css)).toMatch(
      /\.sidebar\[data-open="no"\] \{\s*display: none;\s*\}/,
    );
  });

  it("leaves the drawer's query holding the drawer's shape and nothing else", () => {
    const drawer = css.slice(css.indexOf("@media (max-width: 820px)"));
    const block = drawer.slice(0, drawer.indexOf("\n}\n"));
    // The right query: the sidebar's, not the modeline's at the same width.
    expect(block).toContain(".sidebar {");
    expect(block).not.toContain("data-open");
  });

  it("gives the width back to the editing surface rather than leaving a gap", () => {
    // `.layout` is a flex row, so the hidden element takes its track with it;
    // the surface beside it grows into what the track held.
    const everywhere = atEveryWidth(css);
    expect(everywhere).toMatch(/\.layout \{[^}]*display: flex;/);
    expect(everywhere).toMatch(/\.editor-pane \{[^}]*flex: 1 1 auto;/);
  });
});
