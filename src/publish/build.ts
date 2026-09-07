/**
 * One version's built output.
 *
 * [`buildVersion`] takes the parsed document, the variant being published and
 * the rendered article and deck for that variant, and returns the text files
 * to write and the assets to copy. It writes nothing and reads nothing: no
 * clock, no random value, no path from the machine, and no built file carrying
 * the document's id, a variant token, the version hash or a timestamp. That is
 * what makes the version hash a function of the content alone, so a republish
 * of unchanged text lands on the version folder that is already there and the
 * dry run is faithful to the publish it stands in for.
 *
 * Asset bytes never pass through here. A copy names a file by its path
 * relative to the document root and its path inside the version folder, and
 * the shell moves the bytes disk to disk.
 */

import {
  classify,
  decodeReference,
  pathResolver,
  type Resolution,
  type Resolver,
} from "../core/assets";
import {
  EMPTY_RESOLUTION,
  parseBibliography,
  resolveCitations,
  type CitationResolution,
} from "../core/bibliography";
import type { Rendering } from "../core/canon";
import { buildChapterDecks } from "../core/deck";
import {
  chapterHasRefsHeading,
  renderArticle,
  renderDocumentContents,
  renderReferenceList,
} from "../core/render/article";
// `escapeText` is the one function `articleDocument`/`deckDocument` share
// with `html.ts`'s own inline renderer: a private copy here was the exact
// "two answers to one question" pattern this range was reviewed against
// (GLM F11, Sonnet F6).
import { escapeText } from "../core/render/html";
import { readingKeysDataScript } from "../core/render/reading-keys";
import { renderSlides } from "../core/render/slides";
import type { Block, Chapter, Inline } from "../core/tree";
import { walkChapterBlocks } from "../core/tree";

/** A text file to write into the version folder. */
export interface BuiltFile {
  /** The path relative to the version folder, with `/` separators. */
  readonly path: string;
  readonly text: string;
}

/** An asset to copy into the version folder. */
export interface AssetCopy {
  /**
   * The path relative to the document root, as the author's reference wrote
   * it: percent escapes and all. The shell reads those back once, at the
   * moment it opens the file, so no name is decoded twice.
   */
  readonly from: string;
  /**
   * The path relative to the version folder, under a name that needs no
   * escaping: see [`publishedName`].
   */
  readonly to: string;
}

/** A reference the build would not resolve, and why. */
export interface BuildRefusal {
  /** The chapter that carries the reference, relative to the document root. */
  readonly chapter: string;
  /** The reference exactly as it was written. */
  readonly reference: string;
  readonly reason: string;
}

/** What one publish writes. */
export interface VersionBuild {
  readonly files: readonly BuiltFile[];
  readonly copies: readonly AssetCopy[];
  /** References that resolve to nothing, reported rather than guessed at. */
  readonly refusals: readonly BuildRefusal[];
}

/** One chapter of the document, with the path it sits at. */
export interface ChapterInput {
  /** The path relative to the document root, e.g. `01-parts/01-opening.md`. */
  readonly path: string;
  readonly chapter: Chapter;
}

/** The document as the build sees it: chapters in reading order. */
export interface DocumentSource {
  readonly chapters: readonly ChapterInput[];
}

/**
 * The rendered pages for one variant.
 *
 * Both are complete HTML documents produced by the rendering core — one parse,
 * two renderings — so this module composes a version out of them rather than
 * rendering anything itself.
 */
export interface RenderedVariant {
  /** The article: the version folder's `index.html`. */
  readonly article: string;
  /** The deck: the version folder's `slides/index.html`. */
  readonly deck: string;
}

/** What `buildVersion` is given besides the tree and the variant. */
export interface BuildContext {
  readonly rendered: RenderedVariant;
}

/** Where the article and the deck land inside a version folder. */
export const ARTICLE_PATH = "index.html";
export const DECK_PATH = "slides/index.html";

/** Where copied assets land inside a version folder. */
export const ASSETS_FOLDER = "assets";

/**
 * Build one version.
 *
 * A pure function of its three arguments.
 */
export function buildVersion(
  tree: DocumentSource,
  variant: string,
  context: BuildContext,
): VersionBuild {
  const plan = assetPlan(tree, variant);
  return {
    files: [
      { path: ARTICLE_PATH, text: context.rendered.article },
      { path: DECK_PATH, text: context.rendered.deck },
    ],
    copies: plan.copies,
    refusals: plan.refusals,
  };
}

/** The copies and refusals for one variant, without the rendered pages. */
export function assetPlan(
  tree: DocumentSource,
  variant: string,
): { copies: AssetCopy[]; refusals: BuildRefusal[] } {
  const copies: AssetCopy[] = [];
  const refusals: BuildRefusal[] = [];
  const claimed = new Map<string, string>();
  for (const input of tree.chapters) {
    for (const reference of chapterReferences(input.chapter, variant)) {
      const resolved = resolveReference(input.path, reference);
      if (resolved === null) {
        refusals.push({
          chapter: input.path,
          reference,
          reason: refusalReason(reference),
        });
        continue;
      }
      const claim = claimed.get(resolved.to);
      if (claim !== undefined) {
        // The same file, referenced from two chapters of one Part: one copy.
        // Two different files under one published name is a different thing,
        // and reported rather than resolved by whichever was copied first.
        if (claim !== resolved.from) {
          refusals.push({
            chapter: input.path,
            reference,
            reason: `another file is already published as ${resolved.to}`,
          });
        }
        continue;
      }
      claimed.set(resolved.to, resolved.from);
      copies.push(resolved);
    }
  }
  return { copies, refusals };
}

/**
 * Where one chapter's reference lands inside a version folder.
 *
 * `01-beginnings/01-opening.md` referencing `assets/lantern.jpg` lands at
 * `assets/01-beginnings/lantern.jpg`: one folder per Part, as on disk, so two
 * Parts may each hold a `lantern.jpg`.
 */
export function resolveReference(
  chapterPath: string,
  reference: string,
): AssetCopy | null {
  if (!isCopyable(reference)) {
    return null;
  }
  const partFolder = folderOf(chapterPath);
  const from = normalisePath(
    partFolder === "" ? reference : `${partFolder}/${reference}`,
  );
  if (from === null || from.startsWith("../")) {
    return null;
  }
  // A reference that climbs out of the chapter's own folder resolves to
  // nothing: an asset belongs to the Part that references it.
  if (partFolder !== "" && !from.startsWith(`${partFolder}/`)) {
    return null;
  }
  const name = publishedName(from);
  if (name === null) {
    return null;
  }
  const to =
    partFolder === ""
      ? `${ASSETS_FOLDER}/${name}`
      : `${ASSETS_FOLDER}/${partFolder}/${name}`;
  return { from, to };
}

/**
 * The name a copied file carries inside the version folder.
 *
 * The document folder keeps the name the author gave the file — a space and
 * all — and the reference in the text carries that name percent-escaped. A
 * published version keeps neither: the copy is named in the characters a URL
 * path reads plainly, so the page's `src` and the file beside it are the same
 * characters and nothing on the way to a reader has to agree with us about
 * what `%20` means. `a lantern.jpg` publishes as `a-lantern.jpg`.
 *
 * Null where the reference's escapes name something it could not have named
 * in plain text, which is [`decodeReference`]'s refusal, and null where
 * nothing is left of the name.
 */
function publishedName(reference: string): string | null {
  const decoded = decodeReference(reference);
  if (decoded === null) {
    return null;
  }
  const name = basename(decoded).replace(/[^A-Za-z0-9._~-]/g, "-");
  return name === "" ? null : name;
}

/**
 * The URL a rendered page uses for a reference.
 *
 * The article sits at the version folder's root and the deck one level below
 * it, so the deck climbs one folder. Both are relative: nothing in a version
 * folder names the site, so a version folder is complete in itself.
 */
export function assetHref(
  chapterPath: string,
  reference: string,
  rendering: "article" | "slides",
): string | null {
  const resolved = resolveReference(chapterPath, reference);
  if (resolved === null) {
    return null;
  }
  return rendering === "slides" ? `../${resolved.to}` : resolved.to;
}

/**
 * A resolver for the rendering core, bound to one chapter and one rendering.
 *
 * The core takes `resolve` — a reference in, a URL out — and this is the site
 * build's: it answers with the path the file is copied to, and with nothing
 * for a reference the build refuses, which is what the core reports.
 */
export function createAssetResolver(
  chapterPath: string,
  rendering: "article" | "slides",
): Resolver {
  const clean = pathResolver();
  return (written: string): Resolution => {
    const resolution = clean(written);
    if (resolution.url === null || resolution.kind === "remote") {
      return resolution;
    }
    const href = assetHref(chapterPath, written, rendering);
    if (href === null) {
      return {
        reference: written,
        kind: classify(written).kind,
        url: null,
        problem: "no copy of this file was found",
      };
    }
    return { ...resolution, url: href };
  };
}

/** Every asset reference one chapter makes, in source order. */
function chapterReferences(chapter: Chapter, variant: string): string[] {
  const references: string[] = [];
  for (const block of walkChapterBlocks(chapter)) {
    if (!belongsTo(block, variant)) {
      continue;
    }
    if (block.image) {
      references.push(block.image.src);
    }
    if (block.video) {
      if (block.video.poster) {
        references.push(block.video.poster);
      }
      for (const source of block.video.sources) {
        // `local:` and `site:` name a file in the document folder; `gated:`
        // and `remote:` name something the site does not carry.
        if (source.role === "local" || source.role === "site") {
          references.push(source.reference);
        }
      }
    }
    if (block.kind !== "image") {
      // An image paragraph carries its reference on the block; walking its
      // inlines as well would count the same file twice.
      references.push(...inlineReferences(block.inlines, variant));
    }
  }
  return references;
}

/**
 * Every picture the inline nodes refer to, in this variant.
 *
 * `walkInlines` would flatten a `.variant` span into its neighbours, so a
 * picture the author marked out of this variant would be copied into it: the
 * renderers filter that span out, and the copies have to agree with them.
 */
function inlineReferences(nodes: readonly Inline[], variant: string): string[] {
  const references: string[] = [];
  for (const node of nodes) {
    const variants = node.variants ?? [];
    if (variants.length > 0 && !variants.includes(variant)) {
      continue;
    }
    if (node.kind === "image" && node.src) {
      references.push(node.src);
    }
    references.push(...inlineReferences(node.children, variant));
  }
  return references;
}

/** Whether a block belongs to the variant being published. */
function belongsTo(block: Block, variant: string): boolean {
  return block.variants.length === 0 || block.variants.includes(variant);
}

/**
 * The file extensions a published version carries, lower-cased.
 *
 * The same list the shell holds a copy to — `ASSET_EXTENSIONS` in
 * `src-tauri/src/document.rs` — so what the build asks for and what the shell
 * will copy are one answer rather than two. A reference to anything else is
 * refused and reported rather than quietly put on a public site.
 */
export const ASSET_EXTENSIONS: readonly string[] = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "avif",
];

/**
 * Whether a name carries an extension a published version carries.
 *
 * The name is the decoded one, so a reference is held to what the file is
 * called rather than to how the reference spells it.
 */
function isPublishableAsset(reference: string): boolean {
  const name = basename((decodeReference(reference) ?? reference).split(/[?#]/)[0] ?? "");
  const cut = name.lastIndexOf(".");
  if (cut <= 0) {
    return false;
  }
  return ASSET_EXTENSIONS.includes(name.slice(cut + 1).toLowerCase());
}

/** Whether a reference names a file this build may copy. */
function isCopyable(reference: string): boolean {
  if (reference.trim() === "") {
    return false;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) {
    return false; // a URL, an `asset:` id, or a scheme we do not know
  }
  if (reference.startsWith("/") || /^[a-z]:[\\/]/i.test(reference)) {
    return false; // absolute: no machine in the document
  }
  if (decodeReference(reference) === null) {
    return false; // an escape naming a folder the reference does not name
  }
  return isPublishableAsset(reference);
}

function refusalReason(reference: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) {
    return "the reference names a scheme, not a file in the document folder";
  }
  if (reference.startsWith("/")) {
    return "the reference is absolute";
  }
  if (decodeReference(reference) === null) {
    return "the reference's escapes name something outside the document folder";
  }
  if (!isPublishableAsset(reference)) {
    return "a published version carries only the picture formats the app reads";
  }
  return "the reference climbs above the document folder";
}

/** The folder a chapter path sits in: its Part, for a path the build reads. */
export function folderOf(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut < 0 ? "" : path.slice(0, cut);
}

/**
 * A Part folder's display title: its numeric prefix and its separator gone,
 * its remaining hyphens and underscores turned to spaces.
 *
 * The article's contents list groups chapters by Part (spc-2609061318090042,
 * criterion one: "two Parts holding four chapters in all"), and this is the
 * same title the sidebar already shows for the folder — `title_of` in
 * `src-tauri/src/document.rs` — so a reader sees one name for a Part rather
 * than the app's own and the article's own disagreeing.
 */
export function partTitleOf(name: string): string {
  const digits = /^\d+/.exec(name)?.[0] ?? "";
  let rest = name;
  if (digits !== "") {
    const after = name.slice(digits.length);
    const trimmed = after.replace(/^[ \-_.]+/, "");
    rest = trimmed === "" ? name : trimmed;
  }
  return rest.replace(/[-_]/g, " ");
}

function basename(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut < 0 ? path : path.slice(cut + 1);
}

/** Collapse `.` and `..`; `null` where the path is not a file path at all. */
function normalisePath(path: string): string | null {
  const out: string[] = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      const last = out[out.length - 1];
      if (last === undefined || last === "..") {
        out.push("..");
      } else {
        out.pop();
      }
      continue;
    }
    out.push(segment);
  }
  if (out.length === 0) {
    return null;
  }
  return out.join("/");
}

/* -------------------------------------------------------------------------
 * The renderings, from the core.
 *
 * `buildVersion` takes rendered pages; this is where the site build gets
 * them. The slide plan, the slide markup, the article skeleton and the deck's
 * stylesheet are all the rendering core's — one parse, two renderings — and
 * what belongs to the site build is only the envelope: which stylesheet a page
 * links, where the engine sits, and how a copied asset is addressed from a
 * page one folder down.
 *
 * The envelope is the site's own rather than the core's `deckDocument`,
 * because the site serves under a `default-src 'none'` policy with `'self'`
 * for script: the core's envelope starts the engine from an inline `<script>`,
 * which that policy forbids. `presenter/deck.js` starts it instead, with the
 * same `DECK_CONFIG`, and `deck_js_starts_the_engine_with_the_core_config`
 * holds the two in step.
 * ------------------------------------------------------------------------- */

/** Where the shared chrome sits at the site root, for every version. */
export const CHROME_FOLDER = "/presenter";

/**
 * Where the chrome sits beside a folder written to disk.
 *
 * The site keeps its chrome once at its root, so a built page names it
 * `/presenter/…`; that path resolves to nothing under a `file:` URL. A folder
 * carries its own copy at the folder's root instead, and the pages address it
 * relatively: `presenter` from the article, `../presenter` from the deck one
 * folder down. Nothing else about the build changes.
 */
export const FOLDER_CHROME = "presenter";

/** Where a built page will be read from. */
export type BuildHost = "site" | "folder";

/** What the renderers need besides the tree. */
export interface RenderOptions {
  /** The document's title, from `document.yaml`. */
  readonly title: string;
  /** Where the pages will be read from: the site, or a folder on disk. */
  readonly host: BuildHost;
  /**
   * The bibliography file's own text, when `document.yaml` names one.
   *
   * Read once here and resolved once against every chapter in `tree`, so the
   * article's numbering, its generated reference list and the deck's credit
   * lines all agree — `05-internals.md` section 4's "one resolver for every
   * rendering". Absent is a document that names no bibliography, which is
   * ordinary: nothing is numbered and no reference list appears.
   */
  readonly bibliography?: string | null;
}

/**
 * The base a page names its chrome by.
 *
 * One function, so the two envelopes cannot answer differently and a page's
 * host is the only thing that decides it.
 */
export function chromeBase(host: BuildHost, rendering: "article" | "slides"): string {
  if (host === "site") {
    return CHROME_FOLDER;
  }
  return rendering === "slides" ? `../${FOLDER_CHROME}` : FOLDER_CHROME;
}

/**
 * Resolve a document's citations once, from the bibliography text
 * `RenderOptions` carries.
 *
 * `rendering` is the placement filter passed on to `resolveCitations`:
 * `"article"` for the resolution the article's own numbering and reference
 * list are built from, so a citation written only inside a `.notes` div
 * earns neither there (Fable F7); left undefined for the deck's own
 * resolution, which credits a citation wherever a slide's own content
 * carries it, speaker notes included — the deck's `citationLinesFor`
 * (`core/deck.ts`) walks a slide's own notes on purpose, and `render/
 * slides.ts`'s own face and headline read the same resolution now
 * (iss-2609070746140986), so the number on the face and the credit line at
 * the foot always name the same key the same way.
 *
 * A document that names no bibliography at all is an ordinary document, not
 * an empty one (itd-2609051335502171's own Assumption), and this always
 * returns `EMPTY_RESOLUTION` for it rather than `undefined`: a citation is
 * marked unresolved the same way an unknown key is, never printed as the
 * literal brackets `html.ts`'s own phase-1 fallback shows a caller with no
 * resolution at all — which is `undefined`, the shape `render/slides.ts`
 * itself still falls back to for a slide's speaker notes alone, never for a
 * reader's own surface (the article, or a slide's headline and face).
 */
function citationsFor(
  tree: DocumentSource,
  bibliography: string | null | undefined,
  rendering?: Rendering,
): CitationResolution {
  if (bibliography === null || bibliography === undefined) return EMPTY_RESOLUTION;
  return resolveCitations(
    tree.chapters.map((input) => input.chapter),
    parseBibliography(bibliography),
    rendering,
  );
}

/**
 * One chapter, already rendered against its own picture resolver, ready
 * for [`composeArticle`].
 *
 * The shape both `renderVariant` and `preview.ts`'s own `renderChapter`
 * produce, so the one composer below can build either host's article from
 * it: a resolver is bound to a folder's assets and, for the app's own
 * preview, read asynchronously before rendering, so the chapter-rendering
 * call itself is each host's own to make — only what happens once every
 * chapter is a string is shared.
 */
export interface ComposedChapter {
  readonly chapter: Chapter;
  readonly idPrefix: string;
  readonly part: string;
  readonly partKey: string;
  readonly html: string;
}

/**
 * Compose the whole document's article from every chapter already
 * rendered: one document-wide contents list, every chapter's own page in
 * order, and the generated reference list once, wherever no chapter's own
 * `.refs` heading claimed it.
 *
 * `preview.ts`'s own `articleOf` and this module's `renderVariant` used to
 * each build this by hand, with their own copy of the id-prefix rule and
 * their own `citationsFor` — the exact "two hand-kept compositions" review
 * round one's Fable F8 named, with nothing proving they still agreed once
 * either changed. Both now call this one function for the part every host
 * must build identically; `build.test.ts`'s own "the two hosts agree"
 * group renders one `DocumentSource` through both and asserts equality.
 */
export function composeArticle(
  entries: readonly ComposedChapter[],
  citations: CitationResolution | undefined,
): string {
  const contents = renderDocumentContents(entries);
  // A `.refs` heading writes the reference list where the document asked
  // for it, through `renderArticle`'s own "appendix" placement; a document
  // that wrote none gets it once, after the last chapter, rather than not
  // at all.
  const appendix = entries.some((entry) => chapterHasRefsHeading(entry.chapter))
    ? ""
    : renderReferenceList(citations);
  return [contents, ...entries.map((entry) => entry.html), appendix]
    .filter((part) => part !== "")
    .join("\n");
}

/** Render one variant's article and deck. */
export function renderVariant(
  tree: DocumentSource,
  variant: string,
  options: RenderOptions,
): RenderedVariant {
  const citations = citationsFor(tree, options.bibliography, "article");
  const deckCitations = citationsFor(tree, options.bibliography);

  // The article is one page per document, so its contents list covers every
  // chapter. Each chapter's ids carry a prefix of its own, because an outline
  // id is unique within one chapter and two chapters may open the same way.
  const idPrefix = (index: number): string => `c${String(index + 1)}-`;
  const chapterEntries: ComposedChapter[] = tree.chapters.map((input, index) => ({
    chapter: input.chapter,
    idPrefix: idPrefix(index),
    part: partTitleOf(folderOf(input.path)),
    // The raw folder, not the display label: see `preview.ts`'s own
    // comment on the same field (Fable/GLM F14).
    partKey: folderOf(input.path),
    html: renderArticle(input.chapter, createAssetResolver(input.path, "article"), {
      variant,
      contents: false,
      idPrefix: idPrefix(index),
      citations,
      // The once-only opening belongs to the document's own first chapter
      // alone (itd-2609051335518134, map #12); every other chapter's own
      // `.opening`, if it wrote one, is a misplaced block the sidebar lists.
      isFirstChapter: index === 0,
    }),
  }));
  const article = composeArticle(chapterEntries, citations);

  // One plan for the whole document, so the deck at the link is the deck the
  // app rehearsed and no two slides claim the same id; the fragment is
  // rendered chapter by chapter because a resolver is bound to the Part whose
  // folder its references sit in.
  const plans = buildChapterDecks(
    tree.chapters.map((input) => input.chapter),
    { variant, citations: deckCitations },
  );
  const fragments = tree.chapters.map((input, index) =>
    renderSlides(
      plans[index] ?? { title: null, columns: [] },
      createAssetResolver(input.path, "slides"),
      variant,
      deckCitations,
    ),
  );

  return {
    article: articleDocument(
      options.title,
      article,
      chromeBase(options.host, "article"),
    ),
    deck: deckDocument(
      options.title,
      fragments.join("\n"),
      chromeBase(options.host, "slides"),
    ),
  };
}

/** The article page: one column, one stylesheet, no fixed width. */
export function articleDocument(
  title: string,
  body: string,
  chrome: string = CHROME_FOLDER,
): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeText(title)}</title>`,
    `<link rel="stylesheet" href="${chrome}/article.css">`,
    "</head>",
    '<body class="article">',
    "<main>",
    body,
    "</main>",
    // A plain file, not an inline script: the site serves under
    // `script-src 'self'`, and the page works with none of it at all — the
    // poster and the source list are already in `body`, and this only
    // upgrades a video to a player when a source loads.
    `<script src="${chrome}/article-video.js" defer></script>`,
    // The reader-controls toolbar (map #10, spc-2609061318154502): it builds
    // itself onto the page, so the article still reads with no toolbar and
    // the article's own defaults when this fails to load or does not run.
    `<script src="${chrome}/article-controls.js" defer></script>`,
    // The once-only opening and the easter eggs (map #12,
    // spc-2609061318159422): with this absent, the opening quotation stays
    // in the flow as an epigraph and a marked-up egg marker is simply an
    // inert button, because the markup that degrade needs is already in
    // `body` either way.
    `<script src="${chrome}/article-eggs.js" defer></script>`,
    // Keyboard movement, the contents list, search, cancel and the keys
    // panel (map #26, spc-2609061318158216): the data block is the one
    // table's own rows, read by `article-keys.js` and by the fidelity
    // tests alike; with both absent the article still reads and every
    // link, heading and control the page already carries still works by
    // Tab and by touch.
    readingKeysDataScript(),
    `<script src="${chrome}/article-keys.js" defer></script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** The deck page: the engine and the stylesheet come from the chrome base. */
export function deckDocument(
  title: string,
  fragment: string,
  chrome: string = CHROME_FOLDER,
): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${escapeText(title)}</title>`,
    `<link rel="stylesheet" href="${chrome}/reveal/reset.css">`,
    `<link rel="stylesheet" href="${chrome}/reveal/reveal.css">`,
    `<link rel="stylesheet" href="${chrome}/slides.css">`,
    "</head>",
    "<body>",
    '<div class="reveal"><div class="slides">',
    fragment,
    "</div></div>",
    `<script src="${chrome}/reveal/reveal.js"></script>`,
    `<script src="${chrome}/reveal/plugin/notes/notes.js"></script>`,
    `<script src="${chrome}/deck.js"></script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
