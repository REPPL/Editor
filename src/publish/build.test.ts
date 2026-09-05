import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseChapter } from "../core/parse";
import {
  ARTICLE_PATH,
  DECK_PATH,
  assetHref,
  assetPlan,
  buildVersion,
  renderVariant,
  resolveReference,
  type DocumentSource,
} from "./build";
import { versionLinks } from "./links";
import { DECK_CONFIG } from "../core/render/slides";

const EXAMPLES = join(__dirname, "..", "..", "examples");

/** One chapter of an example document, parsed, with its document-relative path. */
function chapterOf(document: string, path: string): DocumentSource["chapters"][number] {
  const text = readFileSync(join(EXAMPLES, document, path), "utf8");
  return { path, chapter: parseChapter(text) };
}

function presentation(): DocumentSource {
  return {
    chapters: [
      chapterOf("presentation", "01-slides/01-technology-impact-assessment.md"),
      chapterOf("presentation", "01-slides/02-where-im-coming-from.md"),
    ],
  };
}

function build(tree: DocumentSource, variant = "talk"): ReturnType<typeof buildVersion> {
  return buildVersion(tree, variant, {
    rendered: renderVariant(tree, variant, { title: "Macromarketing 2026" }),
  });
}

describe("buildVersion", () => {
  it("writes the article and the deck at the version folder's two paths", () => {
    const built = build(presentation());
    expect(built.files.map((file) => file.path)).toEqual([
      ARTICLE_PATH,
      DECK_PATH,
    ]);
  });

  it("is deterministic: the same tree renders the same bytes twice", () => {
    const first = build(presentation());
    const second = build(presentation());
    expect(first.files).toEqual(second.files);
    expect(first.copies).toEqual(second.copies);
  });

  it("embeds no id, token, hash or timestamp in any built file", () => {
    const built = build(presentation());
    const links = versionLinks(
      "https://example.invalid",
      "aaaaaaaaaaaaaaaaaaaaaaaaaa",
      "bbbbbbbbbbbbbbbbbbbbbbbbbb",
      "cccccccccccccccccccccccccc",
    );
    for (const file of built.files) {
      expect(file.text).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaaaa");
      expect(file.text).not.toContain("bbbbbbbbbbbbbbbbbbbbbbbbbb");
      expect(file.text).not.toContain("cccccccccccccccccccccccccc");
      expect(file.text).not.toContain(links.stable);
      // An RFC 3339 stamp, in any year.
      expect(file.text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
      // Nothing that names the machine the build ran on.
      expect(file.text).not.toContain(EXAMPLES);
      expect(file.text).not.toContain("/Users/");
    }
  });

  it("built_pages_declare_the_viewport_and_no_fixed_width", () => {
    const built = build(presentation());
    for (const file of built.files) {
      expect(file.text).toMatch(
        /<meta name="viewport" content="width=device-width, initial-scale=1[^"]*">/,
      );
      expect(file.text).not.toMatch(/width\s*[:=]\s*"?\d+px/);
      expect(file.text).not.toMatch(/min-width\s*:\s*\d+px/);
    }
  });

  it("deck_js_starts_the_engine_with_the_core_config", () => {
    // The site starts the engine from a file, because its policy forbids an
    // inline script; the configuration is still the core's one.
    const source = readFileSync(
      join(__dirname, "..", "..", "site", "presenter", "deck.js"),
      "utf8",
    );
    const written = source.slice(source.indexOf("var CONFIG = ") + "var CONFIG = ".length);
    const config: unknown = JSON.parse(written.slice(0, written.indexOf("};") + 1));
    expect(config).toEqual({ ...DECK_CONFIG });
  });

  it("names no absolute URL in a built page", () => {
    for (const file of build(presentation()).files) {
      expect(file.text).not.toMatch(/https?:\/\//);
    }
  });
});

describe("the asset plan", () => {
  it("puts a Part's assets in a folder of their own", () => {
    expect(
      resolveReference("01-beginnings/01-opening.md", "assets/lantern.jpg"),
    ).toEqual({
      from: "01-beginnings/assets/lantern.jpg",
      to: "assets/01-beginnings/lantern.jpg",
    });
  });

  it("keeps two Parts' lanterns apart", () => {
    const first = resolveReference("01-beginnings/a.md", "assets/lantern.jpg");
    const second = resolveReference("02-findings/b.md", "assets/lantern.jpg");
    expect(first?.to).not.toBe(second?.to);
  });

  it("copies each asset once, however many chapters reference it", () => {
    const { copies } = assetPlan(presentation(), "talk");
    expect(new Set(copies.map((copy) => copy.to)).size).toBe(copies.length);
    expect(copies.length).toBeGreaterThan(0);
    for (const copy of copies) {
      expect(copy.from.startsWith("01-slides/assets/")).toBe(true);
      expect(copy.to.startsWith("assets/01-slides/")).toBe(true);
    }
  });

  it("refuses an absolute reference, a URL and a climb out of the Part", () => {
    const chapter = parseChapter(
      [
        "# A chapter",
        "",
        "![One](/Users/alice/lantern.jpg)",
        "",
        "![Two](https://example.invalid/lantern.jpg)",
        "",
        "![Three](../../elsewhere/lantern.jpg)",
        "",
      ].join("\n"),
    );
    const { copies, refusals } = assetPlan(
      { chapters: [{ path: "01-part/01-chapter.md", chapter }] },
      "talk",
    );
    expect(copies).toEqual([]);
    expect(refusals).toHaveLength(3);
    expect(refusals.map((refusal) => refusal.chapter)).toEqual([
      "01-part/01-chapter.md",
      "01-part/01-chapter.md",
      "01-part/01-chapter.md",
    ]);
  });

  it("leaves out an asset the variant does not carry", () => {
    const chapter = parseChapter(
      [
        "# A chapter",
        "",
        '::: {.variant variant="full"}',
        "![Only in the paper](assets/long.svg)",
        ":::",
        "",
        "![In every variant](assets/short.svg)",
        "",
      ].join("\n"),
    );
    const tree = { chapters: [{ path: "01-part/01-chapter.md", chapter }] };
    const talk = assetPlan(tree, "talk").copies.map((copy) => copy.to);
    const full = assetPlan(tree, "full").copies.map((copy) => copy.to);
    expect(talk).toEqual(["assets/01-part/short.svg"]);
    expect(full).toContain("assets/01-part/long.svg");
  });

  it("resolves the same file to a deeper path for the deck", () => {
    expect(
      assetHref("01-part/01-chapter.md", "assets/lantern.jpg", "article"),
    ).toBe("assets/01-part/lantern.jpg");
    expect(
      assetHref("01-part/01-chapter.md", "assets/lantern.jpg", "slides"),
    ).toBe("../assets/01-part/lantern.jpg");
  });
});

/**
 * The deck at the link is one deck.
 *
 * Every chapter is rendered with its own asset resolver, because a reference
 * is relative to the Part its chapter sits in. That must not cost the deck its
 * ids: two chapters that open with the same heading would otherwise both claim
 * the same `#fragment`, and a link Alice sends would land on whichever the
 * browser found first.
 */
describe("slide ids across a whole document", () => {
  function idsOf(html: string): string[] {
    return [...html.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((match) => match[1] ?? "");
  }

  it("gives no two slides the same id, across chapters", () => {
    const rendered = renderVariant(presentation(), "talk", { title: "Macromarketing 2026" });
    const ids = idsOf(rendered.deck);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps two chapters with the very same headings apart", () => {
    const one = "# A chapter\n\n## Why this matters\n\nBecause.\n";
    const two = "# Another chapter\n\n## Why this matters\n\nBecause again.\n";
    const tree: DocumentSource = {
      chapters: [
        { path: "01-parts/01-one.md", chapter: parseChapter(one) },
        { path: "01-parts/02-two.md", chapter: parseChapter(two) },
      ],
    };
    const ids = idsOf(renderVariant(tree, "talk", { title: "Two chapters" }).deck);
    expect(ids.filter((id) => id === "why-this-matters")).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
