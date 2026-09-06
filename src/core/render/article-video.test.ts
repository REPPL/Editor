/**
 * The article's script, loaded as the file it ships rather than as a copy of
 * it — the same discipline `src/site/presenter.test.ts` holds the shell
 * router to. spc-2609061318090042's video rule: try every source in the
 * order the author wrote it, and touch nothing when none of them plays.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SOURCE = readFileSync(join(__dirname, "article-video.js"), "utf8");

interface VideoSource {
  readonly role: string;
  readonly href: string;
}

interface ArticleVideo {
  chooseSource(
    sources: readonly VideoSource[],
    prober: (href: string) => Promise<boolean>,
  ): Promise<VideoSource | null>;
  upgradeVideos(prober?: (href: string) => Promise<boolean>): Promise<unknown>;
}

interface ArticlePage {
  register(module: () => void): void;
  readonly modules: readonly (() => void)[];
  boot(): void;
}

declare global {
  interface Window {
    ArticleVideo?: ArticleVideo;
    ArticlePage?: ArticlePage;
    ARTICLE_PAGE_MANUAL?: boolean;
  }
}

/** Load the shipped script with no automatic boot, so a test drives it. */
function load(): { video: ArticleVideo; page: ArticlePage } {
  window.ARTICLE_PAGE_MANUAL = true;
  delete (window as { ArticleVideo?: unknown }).ArticleVideo;
  delete (window as { ArticlePage?: unknown }).ArticlePage;
  new Function(SOURCE)();
  const video = window.ArticleVideo;
  const page = window.ArticlePage;
  if (video === undefined || page === undefined) {
    throw new Error("article-video.js did not install ArticleVideo/ArticlePage");
  }
  return { video, page };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("trying sources in the order they were written", () => {
  it("stops at the first source that plays", async () => {
    const { video } = load();
    const tried: string[] = [];
    const prober = (href: string): Promise<boolean> => {
      tried.push(href);
      return Promise.resolve(href === "site.mp4");
    };
    const found = await video.chooseSource(
      [
        { role: "local", href: "local.mp4" },
        { role: "site", href: "site.mp4" },
        { role: "gated", href: "gated.mp4" },
      ],
      prober,
    );
    expect(found).toEqual({ role: "site", href: "site.mp4" });
    expect(tried).toEqual(["local.mp4", "site.mp4"]);
  });

  it("resolves null when no source plays, and tries every one", async () => {
    const { video } = load();
    const tried: string[] = [];
    const prober = (href: string): Promise<boolean> => {
      tried.push(href);
      return Promise.resolve(false);
    };
    const found = await video.chooseSource(
      [
        { role: "local", href: "local.mp4" },
        { role: "site", href: "site.mp4" },
        { role: "gated", href: "gated.mp4" },
      ],
      prober,
    );
    expect(found).toBeNull();
    expect(tried).toEqual(["local.mp4", "site.mp4", "gated.mp4"]);
  });

  it("asks nothing of an empty source list", async () => {
    const { video } = load();
    const prober = vi.fn(() => Promise.resolve(true));
    expect(await video.chooseSource([], prober)).toBeNull();
    expect(prober).not.toHaveBeenCalled();
  });
});

describe("upgrading a video figure on the page", () => {
  function figure(): HTMLElement {
    document.body.innerHTML = [
      '<figure class="video">',
      '<img src="poster.jpg" alt="Part two" />',
      "<figcaption>Part two</figcaption>",
      '<ul class="video-sources">',
      '<li data-role="local"><a href="local.mp4">local.mp4</a></li>',
      '<li data-role="site"><a href="site.mp4">site.mp4</a></li>',
      '<li data-role="gated"><a href="gated.mp4">gated.mp4</a></li>',
      "</ul>",
      "</figure>",
    ].join("");
    const element = document.querySelector<HTMLElement>("figure.video");
    if (element === null) throw new Error("no figure in the fixture");
    return element;
  }

  it("stands a player up on the first source that plays, and marks the figure", async () => {
    const { video } = load();
    figure();
    const prober = (href: string): Promise<boolean> => Promise.resolve(href === "site.mp4");
    await video.upgradeVideos(prober);
    const player = document.querySelector("video");
    expect(player).not.toBeNull();
    expect(player?.getAttribute("src")).toBe("site.mp4");
    expect(player?.hasAttribute("controls")).toBe(true);
    expect(document.querySelector("figure.video")?.hasAttribute("data-player-ready")).toBe(
      true,
    );
    // The poster and the source list are left in the markup: the stylesheet
    // hides them behind the same attribute, not the script.
    expect(document.querySelector("img")).not.toBeNull();
    expect(document.querySelector("ul.video-sources")).not.toBeNull();
  });

  it("inserts no player and marks nothing when every source is unreachable", async () => {
    const { video } = load();
    figure();
    const prober = (): Promise<boolean> => Promise.resolve(false);
    await video.upgradeVideos(prober);
    expect(document.querySelector("video")).toBeNull();
    expect(document.querySelector("figure.video")?.hasAttribute("data-player-ready")).toBe(
      false,
    );
    // The fallback markup a script-free reader gets is exactly what is left.
    expect(document.querySelector("img")?.getAttribute("src")).toBe("poster.jpg");
    expect(document.querySelectorAll("ul.video-sources li")).toHaveLength(3);
  });

  it("does nothing to a page that carries no video figure", async () => {
    const { video } = load();
    document.body.innerHTML = "<p>No video here.</p>";
    await expect(video.upgradeVideos(() => Promise.resolve(true))).resolves.toEqual([]);
    expect(document.querySelector("video")).toBeNull();
  });
});

describe("the module registration seam", () => {
  it("runs every module once boot fires, in the order each was registered", () => {
    const { page } = load();
    const order: string[] = [];
    page.register(() => order.push("first"));
    page.register(() => order.push("second"));
    expect(order).toEqual([]);
    page.boot();
    expect(order).toEqual(["first", "second"]);
  });

  it("runs a module registered after boot at once, so a later map's own script never races the boot moment", () => {
    const { page } = load();
    page.boot();
    const late: string[] = [];
    page.register(() => late.push("third"));
    expect(late).toEqual(["third"]);
  });
});
