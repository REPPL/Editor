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

/**
 * A synthetic two-chapter talk, one Part, invented for this file alone.
 *
 * A real one used to live on disk until iss-2609061418065651 untracked that
 * folder; this no longer reads it. Two chapters, each with its own title,
 * one Section and one image, is everything the tests below ask of a talk of
 * more than one chapter — a contents list spanning both, an asset copied
 * from each, and slide ids that must not collide across them.
 */
function presentation(): DocumentSource {
  return {
    chapters: [
      {
        path: "01-slides/01-opening.md",
        chapter: parseChapter(
          [
            "# Why Macromarketing Matters",
            "",
            "## The scale of the problem",
            "",
            "A claim the talk opens with.",
            "",
            "![A chart of the trend](assets/trend.svg)",
            "",
          ].join("\n"),
        ),
      },
      {
        path: "01-slides/02-closing.md",
        chapter: parseChapter(
          [
            "# Where I'm Coming From",
            "",
            "## A closing argument",
            "",
            "A claim the talk closes with.",
            "",
            "![A photograph of the site](assets/site.svg)",
            "",
          ].join("\n"),
        ),
      },
    ],
  };
}

function build(tree: DocumentSource, variant = "talk"): ReturnType<typeof buildVersion> {
  return buildVersion(tree, variant, {
    rendered: renderVariant(tree, variant, { title: "Macromarketing 2026", host: "site" }),
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
    // And the pages the site carries once, for every version. The article's
    // stylesheet is the rendering core's own file — `src/core/render/`,
    // not a copy under `site/presenter/` — the same way the deck's already
    // is; everything else here is the site's own.
    const files: readonly [string, string][] = [
      ["presenter/article.css", join(__dirname, "..", "core", "render", "article.css")],
      ["presenter/deck.js", join(__dirname, "..", "..", "site", "presenter", "deck.js")],
      ["index.html", join(__dirname, "..", "..", "site", "index.html")],
    ];
    for (const [name, path] of files) {
      const text = readFileSync(path, "utf8");
      if (name.endsWith(".html")) {
        expect(text, name).not.toMatch(/\sstyle\s*=/);
      }
    }
  });

  it("gives the whole document one contents list, chapter by chapter", () => {
    // The article is one page per document, and an outline id is unique within
    // one chapter only: without a prefix, two chapters opening the same way
    // would send both contents entries to the first one.
    const rendered = renderVariant(presentation(), "talk", { title: "Macromarketing 2026", host: "site" });
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

  it("copies an escaped name from the file on disk to a name needing no escaping", () => {
    // The drop wrote `assets/a%20lantern.jpg` for a file the disk calls
    // `a lantern.jpg`. The copy is named from the file, and the published
    // name is one a URL path reads plainly.
    expect(
      resolveReference("01-beginnings/01-opening.md", "assets/a%20lantern.jpg"),
    ).toEqual({
      from: "01-beginnings/assets/a%20lantern.jpg",
      to: "assets/01-beginnings/a-lantern.jpg",
    });
  });

  it("puts the published name in both renderings and copies the file once", () => {
    const chapter = parseChapter(
      ["# A chapter", "", "![A lantern](assets/a%20lantern.jpg)", ""].join("\n"),
    );
    const tree = { chapters: [{ path: "01-part/01-chapter.md", chapter }] };
    const built = buildVersion(tree, "talk", {
      rendered: renderVariant(tree, "talk", { title: "A document", host: "site" }),
    });
    expect(built.copies).toEqual([
      {
        from: "01-part/assets/a%20lantern.jpg",
        to: "assets/01-part/a-lantern.jpg",
      },
    ]);
    expect(built.refusals).toEqual([]);
    const article = built.files.find((file) => file.path === ARTICLE_PATH);
    const deck = built.files.find((file) => file.path === DECK_PATH);
    expect(article?.text).toContain('src="assets/01-part/a-lantern.jpg"');
    expect(deck?.text).toContain('src="../assets/01-part/a-lantern.jpg"');
    for (const file of built.files) {
      expect(file.text).not.toContain("%20");
    }
  });

  it("refuses a reference whose escapes decode to a climb", () => {
    const chapter = parseChapter(
      ["# A chapter", "", "![Away](%2e%2e/x.jpg)", ""].join("\n"),
    );
    const { copies, refusals } = assetPlan(
      { chapters: [{ path: "01-part/01-chapter.md", chapter }] },
      "talk",
    );
    expect(copies).toEqual([]);
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.reason).toMatch(/escapes/);
    expect(resolveReference("01-part/01-chapter.md", "%2e%2e/x.jpg")).toBeNull();
    // And a chapter at the document root cannot climb out of it either.
    expect(resolveReference("01-chapter.md", "../x.jpg")).toBeNull();
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
    const rendered = renderVariant(presentation(), "talk", { title: "Macromarketing 2026", host: "site" });
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
    const ids = idsOf(renderVariant(tree, "talk", { title: "Two chapters", host: "site" }).deck);
    expect(ids.filter((id) => id === "why-this-matters")).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ---------------------------------------------------------------------------
 * The folder host: one build, two chrome bases.
 *
 * The export writes the same version the publish stages, into a folder that
 * carries its own copy of the chrome. So the two builds differ in the
 * attributes that name the chrome and in nothing else, and these tests are
 * where that is held true rather than assumed.
 * ------------------------------------------------------------------------- */

/** Every `href` and `src` a page names. */
function references(page: string): string[] {
  return [...page.matchAll(/(?:href|src)="([^"]*)"/g)].map((match) => match[1] ?? "");
}

function rendered(host: "site" | "folder"): ReturnType<typeof renderVariant> {
  return renderVariant(presentation(), "talk", { title: "Macromarketing 2026", host });
}

describe("the folder host", () => {
  it("an exported page is the staged page with the chrome base substituted, byte for byte", () => {
    const site = rendered("site");
    const folder = rendered("folder");

    // The deck sits one folder in, at `slides/index.html`, so it climbs one.
    const deckSubstituted = site.deck.split('="/presenter').join('="../presenter');
    expect(folder.deck).toBe(deckSubstituted);
    // The article sits at the folder's root.
    const articleSubstituted = site.article.split('="/presenter').join('="presenter');
    expect(folder.article).toBe(articleSubstituted);

    // Which is to say: the difference is the chrome attributes and nothing
    // else. Every other reference — every asset — is the same string.
    const chrome = (page: string): string[] =>
      references(page).filter((url) => url.includes("presenter/"));
    const rest = (page: string): string[] =>
      references(page).filter((url) => !url.includes("presenter/"));
    expect(chrome(site.deck).length).toBeGreaterThan(0);
    expect(rest(folder.deck)).toEqual(rest(site.deck));
    expect(rest(folder.article)).toEqual(rest(site.article));

    // And the assets a version carries are one plan, whatever the host.
    expect(buildVersion(presentation(), "talk", { rendered: folder }).copies).toEqual(
      buildVersion(presentation(), "talk", { rendered: site }).copies,
    );
  });

  it("a folder build names its engine beside it, and nothing above the folder", () => {
    const folder = rendered("folder");
    for (const name of [
      "../presenter/reveal/reset.css",
      "../presenter/reveal/reveal.css",
      "../presenter/slides.css",
      "../presenter/reveal/reveal.js",
      "../presenter/reveal/plugin/notes/notes.js",
      "../presenter/deck.js",
    ]) {
      expect(folder.deck).toContain(name);
    }
    expect(folder.article).toContain('href="presenter/article.css"');
    expect(folder.deck).not.toContain('="/presenter');
    expect(folder.article).not.toContain('="/presenter');
  });

  it("names nothing above the folder it is written into", () => {
    const folder = rendered("folder");
    // The article is at the folder's root, so nothing it names may climb at
    // all; the deck is one folder in, so it may climb exactly one.
    for (const url of references(folder.article)) {
      expect(url, url).not.toMatch(/^(?:[a-z][a-z0-9+.-]*:|\/|\.\.)/i);
    }
    for (const url of references(folder.deck)) {
      expect(url, url).not.toMatch(/^(?:[a-z][a-z0-9+.-]*:|\/)/i);
      expect(url, url).not.toContain("../../");
    }
    for (const page of [folder.article, folder.deck]) {
      expect(page).not.toContain("file:");
      expect(page).not.toContain("/Users/");
    }
  });
});

/* ---------------------------------------------------------------------------
 * Citations (itd-2609051335502171, map #11): one resolver, every rendering.
 *
 * Every fixture below is synthetic — a `.bib` file and two chapters invented
 * for this test alone, never a document from disk (iss-2609061418065651 is
 * why: a test naming a document on a shared, untracked path would fail for
 * everyone else).
 * ------------------------------------------------------------------------- */

describe("citations, resolved once and shared by the article and the deck", () => {
  const BIB = [
    "@book{carroll1999,",
    "  author = {Carroll, Carol},",
    "  title = {Reading by Lamplight},",
    "  year = {1999},",
    "}",
    "@article{smith2020,",
    "  author = {Smith, Alice},",
    "  title = {The Lantern Papers},",
    "  year = {2020},",
    "}",
  ].join("\n");

  function twoChapters(): DocumentSource {
    return {
      chapters: [
        {
          path: "01-part/01-beginnings.md",
          chapter: parseChapter("# A Paper\n\n## Beginnings\n\nAs shown [@carroll1999].\n"),
        },
        {
          path: "01-part/02-findings.md",
          chapter: parseChapter(
            "## Findings\n\nAlso [@smith2020], and once more [@nosuchkey].\n",
          ),
        },
      ],
    };
  }

  it("numbers the article's reference list in first-citation order, one entry per cited key", () => {
    const built = renderVariant(twoChapters(), "full", {
      title: "A Paper",
      host: "site",
      bibliography: BIB,
    });
    expect(built.article).toContain('<span class="citation">[1]</span>');
    expect(built.article).toContain('<span class="citation">[2]</span>');
    expect(built.article).toContain(
      '<li id="ref-1">Carroll, Carol. 1999. Reading by Lamplight.</li>',
    );
    expect(built.article).toContain(
      '<li id="ref-2">Smith, Alice. 2020. The Lantern Papers.</li>',
    );
  });

  it("marks the unresolved key rather than printing its brackets, anywhere in the article", () => {
    const built = renderVariant(twoChapters(), "full", {
      title: "A Paper",
      host: "site",
      bibliography: BIB,
    });
    expect(built.article).not.toContain("[@nosuchkey]");
    expect(built.article).toContain('<span class="citation-key unresolved">nosuchkey</span>');
  });

  it("writes the resolved reference beside each citation and the same text at the end of the page", () => {
    const built = renderVariant(twoChapters(), "full", {
      title: "A Paper",
      host: "site",
      bibliography: BIB,
    });
    expect(built.article).toContain(
      '<aside class="margin-note citation"><p>Carroll, Carol. 1999. Reading by Lamplight.</p></aside>',
    );
    expect(built.article).toContain('<ol class="reference-list">');
  });

  it("gives every deck slide whose Section cites a resolved key a credit line naming it, and no reference list", () => {
    const built = renderVariant(twoChapters(), "full", {
      title: "A Paper",
      host: "site",
      bibliography: BIB,
    });
    expect(built.deck).toContain('<footer class="slide-foot"><p class="citation">Carroll, 1999</p></footer>');
    expect(built.deck).toContain('<footer class="slide-foot"><p class="citation">Smith, 2020</p></footer>');
    expect(built.deck).not.toMatch(/reference-list|class="refs"/);
  });

  it("agrees: the article's reference list and the deck's credit lines name the same works, in the same order", () => {
    const built = renderVariant(twoChapters(), "full", {
      title: "A Paper",
      host: "site",
      bibliography: BIB,
    });
    const articleEntries = [...built.article.matchAll(/<li id="ref-\d+">([^<]*)<\/li>/g)].map(
      (match) => match[1],
    );
    expect(articleEntries).toEqual([
      "Carroll, Carol. 1999. Reading by Lamplight.",
      "Smith, Alice. 2020. The Lantern Papers.",
    ]);
    const creditLines = [...built.deck.matchAll(/<p class="citation">([^<]*)<\/p>/g)].map(
      (match) => match[1],
    );
    // The deck names each work by author and year, the article by its full
    // reference — the two are the same works, first cited in the same order,
    // never one the other omits.
    expect(creditLines).toEqual(["Carroll, 1999", "Smith, 2020"]);
    expect(creditLines).toHaveLength(articleEntries.length);
  });

  it("renders and generates nothing when the document names no bibliography", () => {
    const built = renderVariant(
      { chapters: [{ path: "01-part/01-a.md", chapter: parseChapter("As shown [@carroll1999].\n") }] },
      "full",
      { title: "A Paper", host: "site" },
    );
    expect(built.article).toContain('<span class="citation">[@carroll1999]</span>');
    expect(built.article).not.toContain('class="reference-list"');
    expect(built.deck).not.toContain('class="slide-foot"');
  });

  it("renders a chapter with neither a citation nor a bibliography as an ordinary chapter", () => {
    const tree: DocumentSource = {
      chapters: [{ path: "01-part/01-a.md", chapter: parseChapter("# A Paper\n\nPlain prose.\n") }],
    };
    const built = renderVariant(tree, "full", { title: "A Paper", host: "site" });
    expect(built.article).toContain("Plain prose.");
    expect(built.article).not.toContain("reference-list");
    expect(built.deck).not.toContain("slide-foot");
  });
});
