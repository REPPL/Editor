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
 * buffer's, so an unsaved edit previews; every other chapter is read fresh
 * from disk at the moment of the press (`src/main.ts`'s own `readChapters`
 * call, not a value carried over from an earlier read — Fable F20). Nothing
 * is written: the article is a string built here from that text, and
 * closing the window loses nothing because the work never lived here.
 */

import { dataResolver, referencesOf } from "./core/assets";
import {
  EMPTY_RESOLUTION,
  parseBibliography,
  resolveCitations,
  type CitationResolution,
} from "./core/bibliography";
import { parseChapter } from "./core/parse";
import { renderArticle } from "./core/render/article";
import { escapeText } from "./core/render/html";
import { READING_KEYS_DATA_ID, readingBindingDataJson } from "./core/render/reading-keys";
import {
  inShell,
  pendingPreview,
  readAsset,
  PREVIEW_EVENT,
  type PreviewChapter,
  type PreviewSource,
} from "./doctree";
import { composeArticle, folderOf, partTitleOf, type ComposedChapter } from "./publish/build";

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
/** A video prober's own shape: `article-video.js`'s `probe`, or a test's fake. */
type VideoProber = (href: string, timeoutMs: number) => Promise<boolean>;

function articleVideo():
  | { upgradeVideos(prober?: VideoProber): Promise<unknown>; probe?: VideoProber }
  | undefined {
  return (
    window as unknown as {
      ArticleVideo?: { upgradeVideos(prober?: VideoProber): Promise<unknown>; probe?: VideoProber };
    }
  ).ArticleVideo;
}

/**
 * An address `previewProber` never probes on its own: an absolute `http(s)`
 * URL is a `remote:`/`gated:` video source `context.resolve` left
 * untouched, rather than one `readAssets` already turned into a `data:` URI
 * (`local`/`site`, read once through the shell alongside every chapter).
 */
const EXTERNAL_ADDRESS = /^https?:/i;

/**
 * Probe every video figure the way a published page does, except an
 * external source's own address, which this app must never fetch on its
 * own initiative (`02-constraints.md`'s "network only on publish": the app
 * touches the network during a publish Alice started, and at no other time
 * — GLM F8). A `local`/`site` source is already a `data:` URI by the time
 * it reaches the page, so probing it touches no network at all and is left
 * to the real prober.
 */
function previewProber(): VideoProber {
  return (href, timeoutMs) => {
    if (EXTERNAL_ADDRESS.test(href)) return Promise.resolve(false);
    const real = articleVideo()?.probe;
    return real ? real(href, timeoutMs) : Promise.resolve(false);
  };
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

/** One chapter of the preview, parsed and rendered against its own pictures. */
async function renderChapter(
  source: PreviewChapter,
  index: number,
  variant: string | null,
  citations: CitationResolution,
): Promise<ComposedChapter> {
  const chapter = parseChapter(source.text);
  const assets = await readAssets(source.text, source.path);
  const idPrefix = idPrefixFor(index);
  return {
    chapter,
    idPrefix,
    part: partTitleOf(folderOf(source.path)),
    // The raw folder, not the display label: two folders can share one
    // label ("01-intro" and "02-intro" both read "intro"), and grouping by
    // the label alone merged them into one Part in the contents list
    // (Fable/GLM F14).
    partKey: folderOf(source.path),
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
 * `EMPTY_RESOLUTION` for a document that names no bibliography at all — an
 * ordinary document (itd-2609051335502171's own Assumption) — so a citation
 * in it is marked unresolved the same way an unknown key is, rather than
 * printed as the literal brackets the author wrote (GLM F4: `undefined` is
 * `html.ts`'s own phase-1 fallback for a caller with no resolution at all,
 * the deck's speaker notes, not this one). `"article"` is the placement
 * filter, so a citation written only inside a `.notes` div earns no entry
 * here (Fable F7).
 */
function citationsFor(source: PreviewSource): CitationResolution {
  const bibliography = source.bibliography;
  if (bibliography === null || bibliography === undefined) return EMPTY_RESOLUTION;
  const chapters = source.chapters.map((chapter) => parseChapter(chapter.text));
  return resolveCitations(chapters, parseBibliography(bibliography), "article");
}

/** The whole document's article: one contents list, every chapter in order. */
export async function articleOf(source: PreviewSource): Promise<string> {
  const variant = source.variant === "" ? null : source.variant;
  const citations = citationsFor(source);
  const rendered = await Promise.all(
    source.chapters.map((chapter, index) => renderChapter(chapter, index, variant, citations)),
  );
  // `build.ts`'s own `renderVariant` composes its article the same way, from
  // the same function: the one place both hosts must agree (Fable F8).
  return composeArticle(rendered, citations);
}

/** Say why there is nothing to show, on the page rather than in a console. */
function reportEmpty(message: string): void {
  const main = document.querySelector("main");
  if (main === null) return;
  // `escapeText` (GLM F12: the hand-rolled version here escaped `<` and `&`
  // but not `>`, which a message quoting a tag or a comparison could carry).
  main.innerHTML = `<p>${escapeText(message)}</p>`;
}

/**
 * Write this document's own memory scope onto `<body>`, or clear it.
 *
 * `article-eggs.js` reads `data-document-scope` before falling back to
 * `location.pathname`, which never changes between two documents in this
 * one window (iss-2609070642209805): a scope absent from `source` — a
 * caller that predates the field — clears any earlier document's own
 * attribute rather than leaving it to be read for a document it was never
 * about.
 */
function applyDocumentScope(source: PreviewSource): void {
  if (source.documentScope === undefined || source.documentScope === "") {
    document.body.removeAttribute("data-document-scope");
    return;
  }
  document.body.setAttribute("data-document-scope", source.documentScope);
}

/** Build and show the document the shell is holding, exported for `preview.test.ts`. */
export async function show(source: PreviewSource): Promise<void> {
  document.title = source.title === "" ? "Preview" : source.title;
  applyDocumentScope(source);
  const main = document.querySelector("main");
  if (main === null) return;
  main.innerHTML = await articleOf(source);
  // The script already ran once at page load, over an empty `<main>`; a
  // later preview needs it run again over what this just wrote. Its own
  // absence is not a failure — the poster and the link already stand. The
  // prober here never touches an external address on its own (GLM F8).
  await articleVideo()
    ?.upgradeVideos(previewProber())
    .catch(() => {
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
