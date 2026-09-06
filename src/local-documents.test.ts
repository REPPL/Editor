/**
 * The local-document harness (iss-2609061418065651).
 *
 * The maintainer's own documents are local test material: real writing that
 * exercises the parse, the article, and the deck the way a fixture written to
 * suit a change cannot, but that must never land in the tracked tree or in
 * anything committed. `examples/` is gitignored for exactly that reason, and
 * this file discovers document folders under it — or under whatever
 * `EDITOR_LOCAL_DOCUMENTS` names — without ever naming one: a test title
 * counts ("local document 1 of 3"), and no title, path or content from a
 * discovered document is asserted into a message a failure would print.
 *
 * Absent or empty, the root reports exactly one loud, explicit skip rather
 * than a silent pass — a suite with nothing to run must say so, not look
 * green by having proved nothing.
 *
 * For every document found: (a) every chapter round-trips onto its own bytes
 * (the byte-fidelity discipline `src/core/tree-examples.test.ts` used to
 * prove against these same folders); (b) the article and the deck build
 * exactly as the site build does (`src/publish/build.ts`); and (c) the
 * article's own script(s) run in a jsdom window and the interactions the page
 * carries today are exercised. Each interaction is one small function
 * registered in `INTERACTION_CHECKS` — later maps append theirs there
 * without touching the discovery or the byte-fidelity check around it.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { hostname, userInfo } from "node:os";
import { basename, join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseChapter } from "./core/parse";
import { sliceBytes, type Block, type Chapter } from "./core/tree";
import {
  renderVariant,
  type ChapterInput,
  type DocumentSource,
  type RenderedVariant,
} from "./publish/build";

/** Where a folder of local documents lives when nothing else is named. */
const DEFAULT_ROOT = "examples";

function root(): string {
  return process.env["EDITOR_LOCAL_DOCUMENTS"] ?? DEFAULT_ROOT;
}

/**
 * Whether a folder holds at least one Part directly, itself holding a
 * numbered chapter.
 *
 * A document folder's own `README.md` sits at its own top level, one
 * directory above where chapters live, so it does not count: a folder whose
 * only `.md` file, one level down, is a `README.md` is a document folder's
 * *child* being probed one level too shallow, not a Part of chapters.
 */
function isDocumentFolder(folder: string): boolean {
  let entries;
  try {
    entries = readdirSync(folder, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let files: string[];
    try {
      files = readdirSync(join(folder, entry.name));
    } catch {
      continue;
    }
    if (files.some((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md")) {
      return true;
    }
  }
  return false;
}

/**
 * Every document folder under the root: the root itself, if it is one
 * document folder, or every one of its children that is.
 */
function documentFolders(base: string): string[] {
  if (!existsSync(base)) return [];
  if (isDocumentFolder(base)) return [base];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(base, entry.name))
    .filter((folder) => isDocumentFolder(folder))
    .sort();
}

/** A `document.yaml` field, read without a YAML library: one scalar per line. */
function yamlField(text: string, field: string): string | null {
  const match = new RegExp(`^${field}:\\s*(.+)$`, "m").exec(text);
  if (match === null) return null;
  return (match[1] ?? "").trim().replace(/^["']|["']$/g, "");
}

interface LoadedChapter {
  /** Relative to the document root, e.g. `01-manuscript/01-opening.md`. */
  readonly path: string;
  readonly source: string;
  readonly chapter: Chapter;
}

interface LoadedDocument {
  readonly title: string;
  readonly variant: string;
  readonly chapters: readonly LoadedChapter[];
}

function loadDocument(folder: string): LoadedDocument {
  const metadataPath = join(folder, "document.yaml");
  const metadata = existsSync(metadataPath) ? readFileSync(metadataPath, "utf8") : "";
  const title = yamlField(metadata, "title") ?? basename(folder);
  const variant = yamlField(metadata, "default_variant") ?? "full";

  const chapters: LoadedChapter[] = [];
  for (const part of readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    const partPath = join(folder, part);
    for (const file of readdirSync(partPath)
      .filter((name) => name.endsWith(".md"))
      .sort()) {
      const path = `${part}/${file}`;
      const source = readFileSync(join(partPath, file), "utf8");
      chapters.push({ path, source, chapter: parseChapter(source) });
    }
  }
  return { title, variant, chapters };
}

/**
 * Every span in a chapter's tree slices back onto its own source bytes: the
 * round-trip discipline `tree-examples.test.ts` proved against these same
 * folders before the examples were untracked. A block's byte range covers
 * exactly the lines it claims, siblings never overlap, and nothing points
 * outside the source's own length.
 */
function checkByteFidelity(chapter: LoadedChapter): void {
  const bytes = new TextEncoder().encode(chapter.source).length;
  const slice = sliceBytes(chapter.source);
  const lines = chapter.source.split(/\r\n?|\n/);

  const check = (blocks: readonly Block[]): void => {
    let previousEnd = 0;
    for (const block of blocks) {
      const where = `${chapter.path}:${String(block.line)}`;
      expect(block.span.start, where).toBeGreaterThanOrEqual(0);
      expect(block.span.end, where).toBeLessThanOrEqual(bytes);
      expect(block.span.start, where).toBeLessThanOrEqual(block.span.end);
      expect(slice(block.span), where).toBe(
        lines.slice(block.line - 1, block.endLine).join("\n"),
      );
      expect(block.span.start, where).toBeGreaterThanOrEqual(previousEnd);
      previousEnd = block.span.end;
      check(block.children);
      for (const item of block.items ?? []) check(item.blocks);
    }
  };
  check(chapter.chapter.blocks);
}

/** Build the article and the deck exactly as the site build does. */
function buildRendering(doc: LoadedDocument): RenderedVariant {
  const tree: DocumentSource = {
    chapters: doc.chapters.map(
      ({ path, chapter }): ChapterInput => ({ path, chapter }),
    ),
  };
  return renderVariant(tree, doc.variant, { title: doc.title, host: "folder" });
}

/** Every `article*.js` the page's own `<script>` tags name, deduplicated. */
function articleScriptsOf(articleHtml: string): string[] {
  const found = new Set<string>();
  const pattern = /<script src="[^"]*\/(article[\w.-]*\.js)"/g;
  for (const match of articleHtml.matchAll(pattern)) {
    const name = match[1];
    if (name !== undefined) found.add(name);
  }
  return [...found];
}

/** The shape `article-video.js` installs on `window`, driven with a prober. */
interface ArticleVideoApi {
  upgradeVideos(prober: (href: string) => Promise<boolean>): Promise<unknown>;
}

/** One check, registered by name, run against every document found. */
interface InteractionCheck {
  readonly name: string;
  readonly run: (doc: LoadedDocument, rendered: RenderedVariant) => void | Promise<void>;
}

/**
 * The interactions the article and the deck carry today.
 *
 * Later maps append their own check here — a reader-controls toolbar, hidden
 * marks, keyboard movement — rather than editing the discovery or the
 * byte-fidelity check above. What a later check needs that is not already
 * built here (a script the page newly links, a construct newly rendered)
 * arrives through `rendered` and `doc`, not through a new harness parameter.
 */
const INTERACTION_CHECKS: readonly InteractionCheck[] = [
  {
    name: "the article links its own stylesheet",
    run: (_doc, rendered) => {
      expect(rendered.article).toMatch(/<link rel="stylesheet" href="[^"]+\/article\.css">/);
    },
  },
  {
    name: "one parse gives every chapter its own <article> and the deck at least one slide",
    run: (doc, rendered) => {
      const page = new DOMParser().parseFromString(rendered.article, "text/html");
      expect(page.querySelectorAll("body.article main > article").length).toBe(
        doc.chapters.length,
      );
    },
  },
  {
    name: "the deck's slides parse",
    run: (_doc, rendered) => {
      const page = new DOMParser().parseFromString(rendered.deck, "text/html");
      expect(page.querySelectorAll(".reveal .slides > section").length).toBeGreaterThan(0);
    },
  },
  {
    name: "every contents-list href resolves to an element in the page",
    run: (_doc, rendered) => {
      const page = new DOMParser().parseFromString(rendered.article, "text/html");
      const hrefs = [...page.querySelectorAll("nav.contents a[href^='#']")].map(
        (a) => (a.getAttribute("href") ?? "").slice(1),
      );
      for (const id of hrefs) {
        expect(page.getElementById(id), `no element for #${id}`).not.toBeNull();
      }
    },
  },
  {
    name: "no element in the page carries an absolute local path, a username or a hostname",
    run: (_doc, rendered) => {
      const username = userInfo().username;
      const host = hostname();
      for (const [label, html] of [
        ["article", rendered.article],
        ["deck", rendered.deck],
      ] as const) {
        expect(html, `${label}: an absolute POSIX path`).not.toMatch(/\/(?:Users|home)\//);
        expect(html, `${label}: an absolute Windows path`).not.toMatch(/[A-Za-z]:\\/);
        if (username !== "") {
          expect(html, `${label}: the local username`).not.toContain(username);
        }
        if (host !== "") {
          expect(html, `${label}: the local hostname`).not.toContain(host);
        }
      }
    },
  },
  {
    // Video is the one interaction the article script carries today. A
    // document with no video block exercises nothing here beyond confirming
    // that fact, rather than failing for lack of one.
    //
    // Pending, for later maps to register their own check for instead of
    // editing this one: reader controls (map #10), hidden marks and the
    // once-only quotation (map #12), keyboard movement and search (map #26).
    name: "every video block shows its fallback before the script runs, and a player after a probe succeeds",
    run: async (_doc, rendered) => {
      const before = new DOMParser().parseFromString(rendered.article, "text/html");
      const figures = [...before.querySelectorAll("figure.video")];
      for (const figure of figures) {
        // The poster and the caption are only there when the author wrote
        // one; the source list is not optional, and no script has run yet.
        expect(figure.querySelector("ul.video-sources")).not.toBeNull();
        expect(figure.hasAttribute("data-player-ready")).toBe(false);
      }
      if (figures.length === 0) return;

      const scripts = articleScriptsOf(rendered.article);
      expect(scripts, "a video figure with no script to upgrade it").toContain("article-video.js");

      const mount = (): void => {
        document.body.innerHTML = new DOMParser()
          .parseFromString(rendered.article, "text/html")
          .body.innerHTML;
      };

      // A function, not a stored binding: reading a fresh cast each time
      // keeps TypeScript's control-flow narrowing from carrying the `delete`
      // below across the script evaluation it cannot see into.
      const globalBag = (): {
        ARTICLE_PAGE_MANUAL?: boolean;
        ArticleVideo?: ArticleVideoApi;
        ArticlePage?: unknown;
      } => window as unknown as {
        ARTICLE_PAGE_MANUAL?: boolean;
        ArticleVideo?: ArticleVideoApi;
        ArticlePage?: unknown;
      };
      globalBag().ARTICLE_PAGE_MANUAL = true;
      delete globalBag().ArticleVideo;
      delete globalBag().ArticlePage;
      mount();
      for (const name of scripts) {
        const source = readFileSync(join(__dirname, "core/render", name), "utf8");
        // The shipped file itself, evaluated in this window — the same
        // discipline `article-video.test.ts` holds it to.
        new Function(source)();
      }
      const video = globalBag().ArticleVideo;
      if (video === undefined) throw new Error("article-video.js installed no ArticleVideo");

      await video.upgradeVideos(() => Promise.resolve(false));
      for (const figure of document.querySelectorAll("figure.video")) {
        expect(figure.querySelector("video")).toBeNull();
        expect(figure.hasAttribute("data-player-ready")).toBe(false);
      }

      // A fresh mount: the failed probe above must not be what the
      // successful one is judged against.
      mount();
      await video.upgradeVideos(() => Promise.resolve(true));
      for (const figure of document.querySelectorAll("figure.video")) {
        expect(figure.querySelector("video")).not.toBeNull();
        expect(figure.hasAttribute("data-player-ready")).toBe(true);
      }
    },
  },
];

const folders = documentFolders(root());

describe("the local-document harness", () => {
  if (folders.length === 0) {
    const named = process.env["EDITOR_LOCAL_DOCUMENTS"] === undefined ? "examples/" : "EDITOR_LOCAL_DOCUMENTS";
    it.skip(
      `no local documents found: ${named} is absent or empty — add document folders under examples/ ` +
        "(gitignored, kept only on this machine) or point EDITOR_LOCAL_DOCUMENTS at a folder of them",
      () => {
        /* Nothing to run: the point of this test is the skip itself. */
      },
    );
    return;
  }

  folders.forEach((folder, index) => {
    describe(`local document ${String(index + 1)} of ${String(folders.length)}`, () => {
      const doc = loadDocument(folder);

      it("parses and round-trips every chapter byte for byte", () => {
        for (const chapter of doc.chapters) checkByteFidelity(chapter);
      });

      const rendered = buildRendering(doc);

      for (const check of INTERACTION_CHECKS) {
        it(check.name, async () => {
          await check.run(doc, rendered);
        });
      }
    });
  });
});
