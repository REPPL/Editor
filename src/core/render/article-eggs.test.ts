/**
 * The once-only opening and the easter eggs (spc-2609061318159422, map #12):
 * the shipped script, driven through the exact page shape `article.ts`
 * writes. `itd-2609051336145770` forbids the site storing anything about a
 * reader, so the network assertion below is the discipline's own proof:
 * nothing here is ever a request. The fixture body is synthetic, never a
 * real document.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { articleDocument } from "../../publish/build";

const SOURCE = readFileSync(join(__dirname, "article-eggs.js"), "utf8");

interface ArticleEggsApi {
  boot(): void;
  documentScope(): string;
  readonly STORAGE_KEY_OPENING: string;
  readonly STORAGE_KEY_COLLECTED: string;
  readonly KONAMI_SEQUENCE: readonly string[];
}

/**
 * The article body shape `article.ts` writes for an opening quotation and
 * two easter eggs, one carrying a video. Fixture content only.
 */
const BODY = [
  '<article><div class="opening" data-once="per-browser">',
  "<blockquote><p>The lantern was not the point.</p></blockquote>",
  "<p>— Carol</p>",
  "</div>",
  "<h1>Beginnings</h1>",
  '<p>The survey ran for three winters<button type="button" class="egg-marker" ',
  'data-egg="egg-lantern" aria-haspopup="dialog" aria-label="Reveal hidden content">✦</button> ',
  "without a break.</p>",
  '<template id="egg-lantern" data-egg-label="✦"><p>A photograph of the lantern.</p></template>',
  '<p>A second word<button type="button" class="egg-marker" data-egg="egg-clip" ',
  'aria-haspopup="dialog" aria-label="Reveal hidden content">✦</button> follows.</p>',
  '<template id="egg-clip" data-egg-label="✦"><figure class="video">',
  '<ul class="video-sources"><li data-role="site"><a href="clip.mp4">clip.mp4</a></li></ul>',
  "</figure></template>",
  "</article>",
].join("");

function mountArticle(): void {
  const html = articleDocument("Fixture", BODY, "chrome");
  const page = new DOMParser().parseFromString(html, "text/html");
  document.documentElement.innerHTML = page.documentElement.innerHTML;
}

type Bag = {
  ArticleEggs?: ArticleEggsApi;
  ArticleVideo?: unknown;
  ArticlePage?: unknown;
  ARTICLE_PAGE_MANUAL?: boolean;
};

function bag(): Bag {
  return window as unknown as Bag;
}

/** Load the shipped script with no automatic boot, so a test drives it. */
function load(): ArticleEggsApi {
  bag().ARTICLE_PAGE_MANUAL = true;
  delete bag().ArticleEggs;
  delete bag().ArticlePage;
  new Function(SOURCE)();
  const eggs = bag().ArticleEggs;
  if (eggs === undefined) {
    throw new Error("article-eggs.js did not install ArticleEggs");
  }
  return eggs;
}

function marker(id: string): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(`.egg-marker[data-egg="${id}"]`);
  if (found === null) throw new Error(`no marker for ${id}`);
  return found;
}

/** A storage that throws on every call: a browser with it switched off. */
function unavailableStorage(): Storage {
  const boom = (): never => {
    throw new DOMException("storage is unavailable", "SecurityError");
  };
  return {
    getItem: boom,
    setItem: boom,
    removeItem: boom,
    clear: boom,
    key: boom,
    length: 0,
  } as Storage;
}

let realLocalStorage: Storage;

beforeEach(() => {
  realLocalStorage = window.localStorage;
  mountArticle();
  window.localStorage.clear();
  // jsdom does not implement layout, so `scrollIntoView` is absent; the
  // Konami reveal calls it, and this is what lets that call be observed.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: realLocalStorage,
  });
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("first visit", () => {
  it("shows the opening as a modal over the page, and takes it out of the flow", () => {
    load().boot();
    const modal = document.querySelector(".opening-modal");
    expect(modal).not.toBeNull();
    expect(modal?.getAttribute("role")).toBe("dialog");
    expect(modal?.getAttribute("aria-modal")).toBe("true");
    expect(modal?.textContent).toContain("The lantern was not the point.");
    // Nothing else on the page still carries the flow copy: it was moved,
    // not cloned, into the modal that is the one place it now sits.
    expect(document.querySelectorAll(".opening")).toHaveLength(1);
    expect(document.querySelector<HTMLElement>(".opening")?.hidden).toBe(false);
  });

  it("leaves every marker visible and the tray empty", () => {
    load().boot();
    expect(marker("egg-lantern").hidden).toBe(false);
    expect(marker("egg-clip").hidden).toBe(false);
    expect(document.querySelector(".egg-tray")).toBeNull();
  });
});

describe("dismissal", () => {
  it("removes the modal, marks the opening seen, and never shows it again this visit", () => {
    const eggs = load();
    eggs.boot();
    document.querySelector<HTMLButtonElement>(".opening-dismiss")?.click();
    expect(document.querySelector(".opening-modal")).toBeNull();
    // Scoped to the document (iss-2609070642209805): the bare key is never
    // written on its own any more.
    expect(window.localStorage.getItem(`${eggs.STORAGE_KEY_OPENING}::${eggs.documentScope()}`)).not.toBeNull();
  });

  it("Escape also dismisses the modal", () => {
    load().boot();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector(".opening-modal")).toBeNull();
  });
});

describe("reload", () => {
  it("opens directly at the text with no quotation shown, in the same browser", () => {
    load().boot();
    document.querySelector<HTMLButtonElement>(".opening-dismiss")?.click();

    mountArticle();
    const again = load();
    again.boot();

    expect(document.querySelector(".opening-modal")).toBeNull();
    expect(document.querySelector<HTMLElement>(".opening")?.hidden).toBe(true);
  });

  it("shows the quotation again in a second browser, which never saw the first browser's choice", () => {
    load().boot();
    document.querySelector<HTMLButtonElement>(".opening-dismiss")?.click();

    window.localStorage.clear();
    mountArticle();
    const again = load();
    again.boot();

    expect(document.querySelector(".opening-modal")).not.toBeNull();
  });
});

describe("the memory is scoped to the document, not the origin (iss-2609070642209805)", () => {
  afterEach(() => {
    window.history.pushState(null, "", "/");
  });

  it("keeps two documents on one site apart: dismissing one leaves the other's opening showing", () => {
    window.history.pushState(null, "", "/doc-a/token/");
    load().boot();
    document.querySelector<HTMLButtonElement>(".opening-dismiss")?.click();
    expect(document.querySelector(".opening-modal")).toBeNull();

    window.history.pushState(null, "", "/doc-b/token/");
    mountArticle();
    const again = load();
    again.boot();
    expect(document.querySelector(".opening-modal")).not.toBeNull();
  });

  it("shares one memory between a document's stable link and one of its own frozen versions", () => {
    window.history.pushState(null, "", "/doc-a/token/");
    load().boot();
    document.querySelector<HTMLButtonElement>(".opening-dismiss")?.click();

    window.history.pushState(null, "", "/doc-a/token/v/abc123/");
    mountArticle();
    const again = load();
    again.boot();
    expect(document.querySelector(".opening-modal")).toBeNull();
  });

  it("prefers a data-document-scope attribute over the path, for a host whose path never changes", () => {
    load().boot();
    document.body.setAttribute("data-document-scope", "folder-hash-one");
    document.querySelector<HTMLButtonElement>(".opening-dismiss")?.click();
    expect(document.querySelector(".opening-modal")).toBeNull();

    // The same fixed pathname, a different document's own scope attribute:
    // the app's preview window, one page for every document Alice opens.
    mountArticle();
    document.body.setAttribute("data-document-scope", "folder-hash-two");
    const again = load();
    again.boot();
    expect(document.querySelector(".opening-modal")).not.toBeNull();
  });
});

describe("a second Preview leaves nothing of the first document's own dialogs behind (Fable F14, GLM F10)", () => {
  it("discards a stale panel and opening modal rather than leaking them across a re-render", () => {
    load().boot();
    marker("egg-lantern").click();
    expect(document.querySelector(".egg-panel")).not.toBeNull();

    // A fresh document replaces `<main>` while the panel is still open.
    mountArticle();
    const again = load();
    again.boot();

    expect(document.querySelector(".egg-panel")).toBeNull();
    // The new document's own opening shows: dismissing the first one never
    // silently marked the second one seen.
    expect(document.querySelector(".opening-modal")).not.toBeNull();
  });

  it("resets originsById, so a marker collected before the re-render does not focus a detached node", () => {
    load().boot();
    marker("egg-lantern").click();
    document.querySelector<HTMLButtonElement>(".egg-panel-close")?.click();
    const firstParagraph = marker("egg-lantern").closest("p");

    mountArticle();
    const again = load();
    again.boot();

    marker("egg-lantern").click();
    document.querySelector<HTMLButtonElement>(".egg-panel-close")?.click();
    // Focus goes to the new document's own paragraph, never the first
    // render's detached one.
    expect(document.activeElement).not.toBe(firstParagraph);
    expect(document.activeElement).toBe(marker("egg-lantern").closest("p"));
  });
});

describe("both dialogs trap Tab inside themselves (Fable F23, GLM F9)", () => {
  it("wraps Tab forward from the egg panel's own last focusable element back to its first", () => {
    load().boot();
    marker("egg-lantern").click();
    const close = document.querySelector<HTMLButtonElement>(".egg-panel-close");
    close?.focus();
    expect(document.activeElement).toBe(close);

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.className).toBe("egg-panel-close");
  });

  it("wraps Shift-Tab backward from the opening modal's own first focusable element to its last", () => {
    load().boot();
    const dismiss = document.querySelector<HTMLButtonElement>(".opening-dismiss");
    dismiss?.focus();
    expect(document.activeElement).toBe(dismiss);

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dismiss);
  });
});

describe("marker click", () => {
  it("opens a labelled dialog carrying the block's own content", () => {
    load().boot();
    marker("egg-lantern").click();
    const panel = document.querySelector(".egg-panel");
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("role")).toBe("dialog");
    expect(panel?.getAttribute("aria-modal")).toBe("true");
    expect(panel?.getAttribute("aria-label")).not.toBe("");
    expect(panel?.textContent).toContain("A photograph of the lantern.");
    expect(document.querySelector(".egg-panel-close")).not.toBeNull();
  });

  it("hides the marker once its panel has been opened", () => {
    load().boot();
    marker("egg-lantern").click();
    expect(marker("egg-lantern").hidden).toBe(true);
  });

  it("upgrades a video inside the panel through the ordinary video rule when a source loads", async () => {
    load().boot();
    const probe = vi.fn().mockResolvedValue(true);
    (window as unknown as { ArticleVideo: unknown }).ArticleVideo = {
      chooseSource: (sources: { href: string }[], prober: (href: string) => Promise<boolean>) =>
        prober(sources[0]?.href ?? "").then((ok) => (ok ? sources[0] : null)),
      probe,
    };
    marker("egg-clip").click();
    // The upgrade is asynchronous; let its promise chain settle.
    await Promise.resolve();
    await Promise.resolve();
    const figure = document.querySelector(".egg-panel-body figure.video");
    expect(figure?.querySelector("video")).not.toBeNull();
  });
});

describe("closing a panel and the tray", () => {
  it("moves the marker into a list at the foot of the page, reachable and reopenable", () => {
    load().boot();
    marker("egg-lantern").click();
    document.querySelector<HTMLButtonElement>(".egg-panel-close")?.click();

    expect(document.querySelector(".egg-panel")).toBeNull();
    expect(marker("egg-lantern").hidden).toBe(true);

    const tray = document.querySelector(".egg-tray");
    expect(tray?.tagName).toBe("NAV");
    expect(tray?.querySelector("ul")).not.toBeNull();
    const trayButton = tray?.querySelector<HTMLButtonElement>('button[data-egg="egg-lantern"]');
    expect(trayButton).not.toBeNull();
    expect(trayButton?.textContent).toBe("✦");

    trayButton?.click();
    expect(document.querySelector(".egg-panel")?.textContent).toContain(
      "A photograph of the lantern.",
    );
  });

  it("returns focus to the paragraph the marker sat in, once the panel closes", () => {
    load().boot();
    const paragraph = marker("egg-lantern").closest("p");
    marker("egg-lantern").click();
    document.querySelector<HTMLButtonElement>(".egg-panel-close")?.click();
    expect(document.activeElement).toBe(paragraph);
  });

  it("keeps the collected mark hidden and its tray entry present after a reload", () => {
    load().boot();
    marker("egg-lantern").click();
    document.querySelector<HTMLButtonElement>(".egg-panel-close")?.click();

    mountArticle();
    const again = load();
    again.boot();

    expect(marker("egg-lantern").hidden).toBe(true);
    expect(document.querySelector('.egg-tray button[data-egg="egg-lantern"]')).not.toBeNull();
    // The other mark, never collected, is unaffected.
    expect(marker("egg-clip").hidden).toBe(false);
  });
});

describe("the Konami code", () => {
  const SEQUENCE = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];

  function type(keys: readonly string[]): void {
    for (const key of keys) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }
  }

  it("flashes every uncollected mark and scrolls to the first, without collecting any of them", () => {
    load().boot();
    // One mark is already collected; the code must not reveal it again.
    marker("egg-lantern").click();
    document.querySelector<HTMLButtonElement>(".egg-panel-close")?.click();

    type(SEQUENCE);

    expect(marker("egg-clip").classList.contains("egg-marker-revealed")).toBe(true);
    expect(marker("egg-clip").scrollIntoView).toHaveBeenCalled();
    // Still uncollected: revealing is not collecting.
    expect(marker("egg-clip").hidden).toBe(false);
    expect(document.querySelector('.egg-tray button[data-egg="egg-clip"]')).toBeNull();
  });

  it("fades the reveal after a short delay", () => {
    vi.useFakeTimers();
    load().boot();
    type(SEQUENCE);
    expect(marker("egg-lantern").classList.contains("egg-marker-revealed")).toBe(true);
    vi.runAllTimers();
    expect(marker("egg-lantern").classList.contains("egg-marker-revealed")).toBe(false);
  });

  it("does nothing for keys that are not the sequence", () => {
    load().boot();
    type(["a", "b", "c", "ArrowUp"]);
    expect(marker("egg-lantern").classList.contains("egg-marker-revealed")).toBe(false);
  });
});

describe("no reader progress ever leaves the browser", () => {
  it("calls neither fetch nor XMLHttpRequest through the opening, a marker, and the tray", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, "open");

    load().boot();
    document.querySelector<HTMLButtonElement>(".opening-dismiss")?.click();
    marker("egg-lantern").click();
    document.querySelector<HTMLButtonElement>(".egg-panel-close")?.click();
    document.querySelector<HTMLButtonElement>('.egg-tray button[data-egg="egg-lantern"]')?.click();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
  });
});

describe("a browser where storage is unavailable", () => {
  it("applies the visit's own choices, shows no error, and returns to first-visit state next load", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: unavailableStorage(),
    });

    const eggs = load();
    expect(() => eggs.boot()).not.toThrow();
    expect(document.querySelector(".opening-modal")).not.toBeNull();

    expect(() =>
      document.querySelector<HTMLButtonElement>(".opening-dismiss")?.click(),
    ).not.toThrow();
    expect(document.querySelector(".opening-modal")).toBeNull();

    expect(() => marker("egg-lantern").click()).not.toThrow();
    expect(() =>
      document.querySelector<HTMLButtonElement>(".egg-panel-close")?.click(),
    ).not.toThrow();

    // Nothing survived the visit: the next load is first-visit again.
    mountArticle();
    const again = load();
    expect(() => again.boot()).not.toThrow();
    expect(document.querySelector(".opening-modal")).not.toBeNull();
    expect(marker("egg-lantern").hidden).toBe(false);
  });
});
