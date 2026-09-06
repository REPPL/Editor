/**
 * The preview window: the whole document, from the buffers the shell holds.
 *
 * A second window rather than a pane inside the editor, in the manner of
 * `present.ts`: `tauri.conf.json` sets `script-src 'self'`, so a page that
 * rendered here inline could not run `article-video.js` either. This page
 * loads from the same bundle, under the same policy, with no relaxation.
 *
 * The article is one page per document (spc-2609061318090042), so unlike a
 * Present — which shows one chapter's deck — a Preview shows every chapter
 * the shell knows about, in reading order. The open chapter's text is its
 * buffer's, so an unsaved edit previews; every other chapter is read as the
 * shell last read it. Nothing is written: the article is a string built here
 * from that text, and closing the window loses nothing because the work
 * never lived here.
 */

import { dataResolver, referencesOf } from "./core/assets";
import { parseChapter } from "./core/parse";
import { renderArticle, renderDocumentContents } from "./core/render/article";
import type { Chapter } from "./core/tree";
import {
  inShell,
  pendingPreview,
  readAsset,
  PREVIEW_EVENT,
  type PreviewChapter,
  type PreviewSource,
} from "./doctree";
import { folderOf, partTitleOf } from "./publish/build";

/**
 * The window `article-video.js` installs, loaded as a plain script beside
 * this module.
 *
 * Read through a cast rather than a global `Window` augmentation, because
 * `article-video.test.ts` already augments it with the script's own fuller
 * shape and a second, narrower declaration for the same global is a
 * TypeScript error, not an override. Its absence is not a failure either way:
 * the poster and the link are already in the markup this module writes.
 */
function articleVideo(): { upgradeVideos(): Promise<unknown> } | undefined {
  return (window as unknown as { ArticleVideo?: { upgradeVideos(): Promise<unknown> } })
    .ArticleVideo;
}

/**
 * Read every picture one chapter refers to, through the shell.
 *
 * One round trip per reference, and a reference the shell refuses is simply
 * absent from the map, which the resolver reports on the page rather than
 * failing the whole preview over — the same rule `present.ts`'s own
 * `readAssets` follows for a deck.
 */
export async function readAssets(
  text: string,
  chapterPath: string,
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const reference of referencesOf(parseChapter(text))) {
    try {
      const asset = await readAsset(chapterPath, reference);
      found.set(reference, `data:${asset.mime};base64,${asset.base64}`);
    } catch (error) {
      console.warn(`${reference}: ${String(error)}`);
    }
  }
  return found;
}

/** What every id one chapter's rendering writes is prefixed with. */
export function idPrefixFor(index: number): string {
  return `c${String(index + 1)}-`;
}

/** One chapter, parsed and rendered, with the Part it reports for the contents list. */
interface RenderedChapter {
  readonly chapter: Chapter;
  readonly idPrefix: string;
  readonly part: string;
  readonly html: string;
}

/** One chapter of the preview, parsed and rendered against its own pictures. */
async function renderChapter(
  source: PreviewChapter,
  index: number,
  variant: string | null,
): Promise<RenderedChapter> {
  const chapter = parseChapter(source.text);
  const assets = await readAssets(source.text, source.path);
  const idPrefix = idPrefixFor(index);
  return {
    chapter,
    idPrefix,
    part: partTitleOf(folderOf(source.path)),
    html: renderArticle(chapter, dataResolver(assets), { variant, contents: false, idPrefix }),
  };
}

/** The whole document's article: one contents list, every chapter in order. */
export async function articleOf(source: PreviewSource): Promise<string> {
  const variant = source.variant === "" ? null : source.variant;
  const rendered = await Promise.all(
    source.chapters.map((chapter, index) => renderChapter(chapter, index, variant)),
  );
  const contents = renderDocumentContents(rendered);
  return [contents, ...rendered.map((entry) => entry.html)].filter((part) => part !== "").join("\n");
}

/** Say why there is nothing to show, on the page rather than in a console. */
function reportEmpty(message: string): void {
  const main = document.querySelector("main");
  if (main === null) return;
  main.innerHTML = `<p>${message.replace(/[<&]/g, (character) =>
    character === "<" ? "&lt;" : "&amp;",
  )}</p>`;
}

/** Build and show the document the shell is holding. */
async function show(source: PreviewSource): Promise<void> {
  document.title = source.title === "" ? "Preview" : source.title;
  const main = document.querySelector("main");
  if (main === null) return;
  main.innerHTML = await articleOf(source);
  // The script already ran once at page load, over an empty `<main>`; a
  // later preview needs it run again over what this just wrote. Its own
  // absence is not a failure — the poster and the link already stand.
  await articleVideo()?.upgradeVideos().catch(() => {
    /* A source that errors after the probe leaves the fallback standing. */
  });
}

/**
 * Ask the shell for the document, and ask again whenever it says there is a
 * new one.
 *
 * The window outlives one Preview: a second Preview emits the event rather
 * than opening a second window, so there is never a second copy of the text.
 */
async function start(): Promise<void> {
  const draw = async (): Promise<void> => {
    try {
      await show(await pendingPreview());
    } catch (error) {
      reportEmpty(String(error));
    }
  };
  const { listen } = await import("@tauri-apps/api/event");
  await listen(PREVIEW_EVENT, () => {
    void draw();
  });
  await draw();
}

if (inShell()) {
  void start();
}
