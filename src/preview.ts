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
import { parseBibliography, resolveCitations, type CitationResolution } from "./core/bibliography";
import { parseChapter } from "./core/parse";
import {
  chapterHasRefsHeading,
  renderArticle,
  renderDocumentContents,
  renderReferenceList,
} from "./core/render/article";
import { READING_KEYS_DATA_ID, readingBindingDataJson } from "./core/render/reading-keys";
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
 * The window `article-eggs.js` installs (map #12, spc-2609061318159422),
 * loaded as a plain script beside this module.
 *
 * `boot` is idempotent — it re-scans the DOM this module just wrote, rather
 * than assuming it runs once over a page that never changes — which is what
 * lets a second Preview event replace `<main>` and still have the opening
 * and every egg's marker wired up, the same way `articleVideo`'s own
 * `upgradeVideos` is called again below rather than assumed to still hold.
 */
function articleEggs(): { boot(): void } | undefined {
  return (window as unknown as { ArticleEggs?: { boot(): void } }).ArticleEggs;
}

/**
 * The window `article-keys.js` installs (map #26, spc-2609061318158216),
 * loaded as a plain script beside this module. `boot` is idempotent for the
 * same reason `articleEggs`'s own is: a fresh Preview means fresh headings,
 * and a reading position from the document this replaced no longer means
 * anything against them.
 */
function articleKeys(): { boot(): void } | undefined {
  return (window as unknown as { ArticleKeys?: { boot(): void } }).ArticleKeys;
}

/**
 * Write the reading views' own honoured rows into the page, once.
 *
 * `articleDocument` (`src/publish/build.ts`) writes the same block for the
 * site build and the folder export; the preview window has no equivalent
 * call, because its `<head>` is `preview.html`'s own static markup rather
 * than something this module builds. The data is a fixed function of the
 * binding table, not of the document being previewed, so writing it once at
 * module load — before `article-keys.js`'s own `<script>` tag in the body
 * even runs — is enough for every later Preview.
 */
function writeReadingKeysData(): void {
  if (document.getElementById(READING_KEYS_DATA_ID) !== null) return;
  const script = document.createElement("script");
  script.type = "application/json";
  script.id = READING_KEYS_DATA_ID;
  script.textContent = readingBindingDataJson();
  document.head.append(script);
}

writeReadingKeysData();

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
  citations: CitationResolution | undefined,
): Promise<RenderedChapter> {
  const chapter = parseChapter(source.text);
  const assets = await readAssets(source.text, source.path);
  const idPrefix = idPrefixFor(index);
  return {
    chapter,
    idPrefix,
    part: partTitleOf(folderOf(source.path)),
    html: renderArticle(chapter, dataResolver(assets), {
      variant,
      contents: false,
      idPrefix,
      citations,
      // The once-only opening belongs to the document's own first chapter
      // alone (itd-2609051335518134, map #12).
      isFirstChapter: index === 0,
    }),
  };
}

/**
 * The document's citations, resolved once against every chapter's own text.
 *
 * `undefined` for a document that names no bibliography at all — an ordinary
 * document (itd-2609051335502171's own Assumption) — so a citation in it
 * still renders, as the literal text `html.ts`'s own fallback shows.
 */
function citationsFor(source: PreviewSource): CitationResolution | undefined {
  const bibliography = source.bibliography;
  if (bibliography === null || bibliography === undefined) return undefined;
  const chapters = source.chapters.map((chapter) => parseChapter(chapter.text));
  return resolveCitations(chapters, parseBibliography(bibliography));
}

/** The whole document's article: one contents list, every chapter in order. */
export async function articleOf(source: PreviewSource): Promise<string> {
  const variant = source.variant === "" ? null : source.variant;
  const citations = citationsFor(source);
  const rendered = await Promise.all(
    source.chapters.map((chapter, index) => renderChapter(chapter, index, variant, citations)),
  );
  const contents = renderDocumentContents(rendered);
  // A `.refs` heading writes the reference list where the document asked for
  // it, through `renderArticle`'s own "appendix" placement; a document that
  // wrote none gets it once, after the last chapter, rather than not at all.
  const appendix = rendered.some((entry) => chapterHasRefsHeading(entry.chapter))
    ? ""
    : renderReferenceList(citations);
  return [contents, ...rendered.map((entry) => entry.html), appendix]
    .filter((part) => part !== "")
    .join("\n");
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
  // Re-applies the opening and every egg's marker to the freshly written
  // `<main>`; harmless where the script never loaded, the same as the video
  // upgrade above.
  articleEggs()?.boot();
  // Re-scans the freshly written `<main>` for headings and resets the
  // reading position to it, the same reason the two calls above run again
  // on every Preview rather than once at page load.
  articleKeys()?.boot();
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
