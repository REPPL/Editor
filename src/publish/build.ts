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
import { buildChapterDecks } from "../core/deck";
import { renderArticle, renderDocumentContents } from "../core/render/article";
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

function folderOf(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut < 0 ? "" : path.slice(0, cut);
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

/** What the renderers need besides the tree. */
export interface RenderOptions {
  /** The document's title, from `document.yaml`. */
  readonly title: string;
}

/** Render one variant's article and deck. */
export function renderVariant(
  tree: DocumentSource,
  variant: string,
  options: RenderOptions,
): RenderedVariant {
  // The article is one page per document, so its contents list covers every
  // chapter. Each chapter's ids carry a prefix of its own, because an outline
  // id is unique within one chapter and two chapters may open the same way.
  const idPrefix = (index: number): string => `c${String(index + 1)}-`;
  const contents = renderDocumentContents(
    tree.chapters.map((input, index) => ({
      chapter: input.chapter,
      idPrefix: idPrefix(index),
    })),
  );
  const article = [
    contents,
    ...tree.chapters.map((input, index) =>
      renderArticle(input.chapter, createAssetResolver(input.path, "article"), {
        variant,
        contents: false,
        idPrefix: idPrefix(index),
      }),
    ),
  ]
    .filter((part) => part !== "")
    .join("\n");

  // One plan for the whole document, so the deck at the link is the deck the
  // app rehearsed and no two slides claim the same id; the fragment is
  // rendered chapter by chapter because a resolver is bound to the Part whose
  // folder its references sit in.
  const plans = buildChapterDecks(
    tree.chapters.map((input) => input.chapter),
    { variant },
  );
  const fragments = tree.chapters.map((input, index) =>
    renderSlides(
      plans[index] ?? { title: null, columns: [] },
      createAssetResolver(input.path, "slides"),
      variant,
    ),
  );

  return {
    article: articleDocument(options.title, article),
    deck: deckDocument(options.title, fragments.join("\n")),
  };
}

/** The article page: one column, one stylesheet, no fixed width. */
export function articleDocument(title: string, body: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeText(title)}</title>`,
    `<link rel="stylesheet" href="${CHROME_FOLDER}/article.css">`,
    "</head>",
    '<body class="article">',
    "<main>",
    body,
    "</main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** The deck page: the engine and the stylesheet come from the site root. */
export function deckDocument(title: string, fragment: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${escapeText(title)}</title>`,
    `<link rel="stylesheet" href="${CHROME_FOLDER}/reveal/reset.css">`,
    `<link rel="stylesheet" href="${CHROME_FOLDER}/reveal/reveal.css">`,
    `<link rel="stylesheet" href="${CHROME_FOLDER}/slides.css">`,
    "</head>",
    "<body>",
    '<div class="reveal"><div class="slides">',
    fragment,
    "</div></div>",
    `<script src="${CHROME_FOLDER}/reveal/reveal.js"></script>`,
    `<script src="${CHROME_FOLDER}/reveal/plugin/notes/notes.js"></script>`,
    `<script src="${CHROME_FOLDER}/deck.js"></script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
