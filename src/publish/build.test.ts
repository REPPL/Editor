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

  it("carries no style attribute on any element of a built page", () => {
    // The site serves under `style-src 'self'`, which drops a style attribute
    // unread — so a page that laid itself out in one would arrive at the link
    // with its columns collapsed and its table alignment gone. Every declared
    // size is a data attribute the site's stylesheets answer.
    const built = build(presentation());
    for (const file of built.files) {
      expect(file.text, file.path).not.toMatch(/\sstyle\s*=/);
      expect(file.text, file.path).not.toContain("<style");
    }
    // And the pages the site carries once, for every version.
    for (const name of ["presenter/article.css", "presenter/deck.js", "index.html"]) {
      const text = readFileSync(join(__dirname, "..", "..", "site", name), "utf8");
      if (name.endsWith(".html")) {
        expect(text, name).not.toMatch(/\sstyle\s*=/);
      }
    }
  });

  it("gives the whole document one contents list, chapter by chapter", () => {
    // The article is one page per document, and an outline id is unique within
    // one chapter only: without a prefix, two chapters opening the same way
    // would send both contents entries to the first one.
    const rendered = renderVariant(presentation(), "talk", { title: "Macromarketing 2026" });
    const navs = rendered.article.match(/<nav class="contents">/g) ?? [];
    expect(navs).toHaveLength(1);
    const targets = [...rendered.article.matchAll(/<nav class="contents">([\s\S]*?)<\/nav>/g)]
      .flatMap((match) => [...(match[1] ?? "").matchAll(/href="#([^"]+)"/g)])
      .map((match) => match[1] ?? "");
    expect(targets.length).toBeGreaterThan(1);
    expect(new Set(targets).size).toBe(targets.length);
    // Every entry points at a heading that is on the page.
    const ids = new Set(
      [...rendered.article.matchAll(/<h[1-6][^>]*\sid="([^"]+)"/g)].map((m) => m[1] ?? ""),
    );
    for (const target of targets) {
      expect(ids.has(target), target).toBe(true);
    }
    // Both chapters are represented, each under its own prefix.
    expect(targets.some((id) => id.startsWith("c1-"))).toBe(true);
    expect(targets.some((id) => id.startsWith("c2-"))).toBe(true);
  });

  it("wraps the deck in an envelope with no absolute URL and one configuration", () => {
    // The envelope that ships is the site build's, because the site's policy
    // forbids the inline script the core's own envelope used.
    const deck = build(presentation()).files.find((file) => file.path === DECK_PATH);
    const text = deck?.text ?? "";
    expect(text).not.toMatch(/https?:\/\//);
    expect(text).not.toContain("cdn");
    expect(text).toContain('<div class="reveal"><div class="slides">');
    expect(text).toContain('<link rel="stylesheet" href="/presenter/reveal/reveal.css">');
    expect(text).toContain('<script src="/presenter/deck.js"></script>');
    expect(text).not.toContain("Reveal.initialize");
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
        "![One](/Users/alice/lantern.jpg)", // abcd-lint:allow illustrative refusal path
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

  it("refuses a reference to a file a published version does not carry", () => {
    // The build names what the shell copies, and the shell holds the same list:
    // a sidecar or a key beside a picture must not reach a public site.
    const chapter = parseChapter(
      [
        "# A chapter",
        "",
        "::: {.video}",
        "- local: assets/keynote.mp4",
        ":::",
        "",
        "![A note](assets/notes.txt)",
        "",
        "![A lantern](assets/lantern.jpg)",
        "",
      ].join("\n"),
    );
    const { copies, refusals } = assetPlan(
      { chapters: [{ path: "01-part/01-chapter.md", chapter }] },
      "talk",
    );
    expect(copies.map((copy) => copy.from)).toEqual(["01-part/assets/lantern.jpg"]);
    expect(refusals.map((refusal) => refusal.reference).sort()).toEqual([
      "assets/keynote.mp4",
      "assets/notes.txt",
    ]);
    for (const refusal of refusals) {
      expect(refusal.reason).toContain("picture formats");
    }
  });

  it("leaves out an asset an inline variant span does not carry", () => {
    // A `.variant` span sits inside a block that belongs to every variant, so
    // the block filter never sees it: without this the picture would be copied
    // into a variant the renderers leave it out of.
    const chapter = parseChapter(
      [
        "# A chapter",
        "",
        'Here is [![Only in the paper](assets/long.svg)]{.variant variant="full"} and ',
        "![In every variant](assets/short.svg).",
        "",
      ].join("\n"),
    );
    const tree = { chapters: [{ path: "01-part/01-chapter.md", chapter }] };
    expect(assetPlan(tree, "talk").copies.map((copy) => copy.to)).toEqual([
      "assets/01-part/short.svg",
    ]);
    expect(assetPlan(tree, "full").copies.map((copy) => copy.to)).toContain(
      "assets/01-part/long.svg",
    );
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
