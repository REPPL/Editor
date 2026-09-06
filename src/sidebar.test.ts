/**
 * The sidebar's citation badge (itd-2609051335502171, map #11).
 *
 * The header comment in `sidebar.ts` reserves an empty badge slot on every
 * row "so the variant, asset, and citation marks of later maps add data
 * rather than a redesign"; this is the first of the three landing, and what
 * it does to that slot on a chapter row is what is proved here.
 */

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

  it("names the count and lists the keys, for one unresolved key", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: ["nosuchkey"] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    const badge = sidebar.element.querySelector(".tree-badge-citation");
    expect(badge?.textContent).toBe("1 unresolved");
    expect(badge?.getAttribute("title")).toBe("Unresolved citation key: nosuchkey");
  });

  it("names the count and lists every key, for more than one", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: ["nosuchkey", "another"] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    const badge = sidebar.element.querySelector(".tree-badge-citation");
    expect(badge?.textContent).toBe("2 unresolved");
    expect(badge?.getAttribute("title")).toBe("Unresolved citation keys: nosuchkey, another");
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

  it("names the count and lists the entries, for one unresolved construct", () => {
    const sidebar = createSidebar(hooks());
    const facts = new Map<string, ChapterFacts>([
      ["01-a.md", { unresolvedCitations: [], unresolvedEggs: ["lantern (marker with no matching block)"] }],
    ]);
    sidebar.show(treeOf(chapter("01-a.md", "A")), new Map(), facts);
    const badge = sidebar.element.querySelector(".tree-badge-egg");
    expect(badge?.textContent).toBe("1 unresolved");
    expect(badge?.getAttribute("title")).toBe(
      "Unresolved hidden construct: lantern (marker with no matching block)",
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
    expect(badge?.textContent).toBe("2 unresolved");
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
