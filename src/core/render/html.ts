/**
 * The markup both renderings are made of.
 *
 * Escaping, attributes, inline nodes, and the block shapes that are the same
 * in a deck and in an article — a list is a list, a table is a table. Where
 * the two renderings differ, they differ in `canon.ts`'s table and in the
 * module that reads its column, not here.
 *
 * Inline content is rendered here rather than by the parse, because the tree
 * keeps inline nodes: a string of HTML built once would have decided for the
 * article, the deck, the Typst source and the annotation anchors alike.
 */

import type { Resolver } from "../assets";
import { citationPartsOf, type CitationResolution } from "../bibliography";
import { hasClass, type Block, type Inline, type ListItem, type TableCell } from "../tree";

/** What a renderer hands the shared shapes. */
export interface RenderContext {
  /** Where a picture is, as the host answers it. */
  readonly resolve: Resolver;
  /** Which column of the canon table is being rendered. */
  readonly rendering: "article" | "slides";
  /** The anchor a footnote reference points at, or null for no link. */
  readonly footnoteHref?: (label: string) => string | null;
  /**
   * The document's citations, resolved once by `bibliography.ts`.
   *
   * Present for the article, where a citation renders as a numbered marker;
   * absent for the deck, whose speaker notes are not a surface a reader
   * reaches (`04-surfaces.md` section 5) and which names a cited work through
   * a credit line of its own (`deck.ts`), not through this inline marker.
   * Absent is also the phase-1 fallback: the literal text the author wrote,
   * which is what a plain tool shows too.
   */
  readonly citations?: CitationResolution | undefined;
  /**
   * What every id this rendering writes is prefixed with.
   *
   * An article is one page for a whole document, so two chapters' footnotes
   * would otherwise write the same anchor twice.
   */
  readonly idPrefix?: string;
  /**
   * The variant being rendered; null or absent renders every variant.
   *
   * Blocks are filtered before they reach a renderer. Inline spans are not,
   * because a span is inside a block that belongs to every variant — so the
   * filter has to happen here, or a `.variant` span reaches a rendering it was
   * marked out of.
   */
  readonly variant?: string | null;
  /**
   * The label of every `.egg` block this chapter's markers match, by the id
   * they name each other by (itd-2609051335518134, map #12).
   *
   * Present only for the article: the deck's own placement for an egg marker
   * is "absent" (`canon.ts`), so [`inline`] never reads this for `context.
   * rendering === "slides"` and a marker there renders as nothing at all,
   * matching the block it never carries. An id with no entry here is an
   * orphan marker — no block in the chapter answered it — and renders as the
   * plain text a reader with no script, and a plain Markdown tool, both show.
   */
  readonly eggLabels?: ReadonlyMap<string, string>;
}

/** Whether an inline node belongs to the variant being rendered. */
export function inlineInVariant(node: Inline, variant: string | null | undefined): boolean {
  if (variant === null || variant === undefined) return true;
  const variants = node.variants ?? [];
  return variants.length === 0 || variants.includes(variant);
}

/**
 * The schemes a rendering will write into an `href`.
 *
 * A chapter is a file and a file can come from anywhere, so an address in one
 * is the author's text rather than something to be trusted: `javascript:` and
 * `data:` are addresses a published page must never hand a reader's browser.
 * A reference with no scheme at all is relative, and relative is what a version
 * folder is made of.
 */
const LINKABLE_SCHEMES = ["http", "https", "mailto"];

/** Whether an address is one a rendering may link to. */
export function isLinkable(url: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim());
  return scheme === null || LINKABLE_SCHEMES.includes(scheme[1]?.toLowerCase() ?? "");
}

/**
 * A declared width as a whole percentage the stylesheets carry a rule for.
 *
 * The site serves under `style-src 'self'`, which drops a `style` attribute on
 * the floor, so a declared width reaches the page as a data attribute and the
 * stylesheet holds the rule. The scale is fives, which is every width an author
 * writes and a stylesheet that can be read in one screen.
 */
export function widthBucket(width: string | null | undefined): string | null {
  if (width === null || width === undefined) return null;
  const percent = /^(\d{1,3})\s*%$/.exec(width.trim());
  if (percent === null) return null;
  const value = Number(percent[1]);
  if (value <= 0 || value > 100) return null;
  return String(Math.min(100, Math.max(5, Math.round(value / 5) * 5)));
}

/** Escape text for a text node. */
export function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape text for a double-quoted attribute value. */
export function escapeAttribute(text: string): string {
  return escapeText(text).replace(/"/g, "&quot;");
}

/** Render a list of `name="value"` pairs, empty values included. */
export function attributes(
  pairs: readonly (readonly [string, string | null])[],
): string {
  return pairs
    .filter((pair): pair is [string, string] => pair[1] !== null && pair[1] !== "")
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
}

/** A class attribute from a list of names, or nothing when there are none. */
export function classAttribute(names: readonly string[]): string {
  const wanted = names.filter((name) => name !== "");
  return wanted.length === 0 ? "" : ` class="${escapeAttribute(wanted.join(" "))}"`;
}

/** One image, resolved through the seam, with whatever the author sized it. */
function image(
  src: string,
  alt: string,
  block: { readonly attributes: Block["attributes"] } | null,
  context: RenderContext,
): string {
  const resolution = context.resolve(src);
  const width = block?.attributes.pairs["width"] ?? null;
  if (resolution.url === null) {
    // A reference that may not resolve still leaves its caption on the page:
    // the picture is missing, the sentence about it is not. The reference
    // itself is not written out — the shapes that are refused are the ones
    // that name the author's machine, and a rendering must not carry one.
    return `<span class="missing-image"${attributes([
      ["data-problem", resolution.problem],
    ])}>${escapeText(alt)}</span>`;
  }
  // A width in pixels is an HTML width; a width in percent is not — the
  // attribute takes no percentages — so it reaches the page as the data
  // attribute the stylesheets carry a rule for.
  const pixels = width !== null && /^\d+$/.test(width.trim()) ? width.trim() : null;
  return `<img${attributes([
    ["src", resolution.url],
    ["alt", alt],
    ["width", pixels],
    ["data-width", widthBucket(width)],
  ])} />`;
}

/**
 * A citation whose keys have been resolved: a numbered marker, its locator
 * inside the brackets, and a resolved key that did not resolve marked as its
 * own key rather than printed as the brackets the author wrote.
 *
 * `05-internals.md` section 3: "Citation … numbered reference in the list".
 * A key that resolves to nothing is not silently dropped: itd-2609051335502171
 * requires it "marked … rather than printed as literal bracketed text", so an
 * unresolved key stands as a marked span carrying the key itself, inside the
 * brackets beside any key that did resolve, or alone when none did.
 */
function renderResolvedCitation(node: Inline, citations: CitationResolution): string {
  const { numbers, unresolvedKeys, locator } = citationPartsOf(node, citations);
  const unresolvedSpans = unresolvedKeys
    .map((key) => `<span class="citation-key unresolved">${escapeText(key)}</span>`)
    .join(", ");
  if (numbers.length === 0) {
    // Nothing in this citation resolved: no brackets, just the key, marked.
    return unresolvedSpans;
  }
  const marker = locator === "" ? numbers.join(", ") : `${numbers.join(", ")}, ${escapeText(locator)}`;
  const mixed = unresolvedKeys.length === 0 ? "" : `; ${unresolvedSpans}`;
  return `<span class="citation">[${marker}]${mixed}</span>`;
}

/**
 * An easter-egg marker: a button over the block it matches, in the article
 * alone.
 *
 * `canon.ts` places an egg marker "absent" in the deck, so this answers
 * nothing at all outside the article — a slide never carries the button, the
 * dom id, or the marker's own text either, which is what "the deck omits
 * both constructs entirely" (itd-2609051335518134) requires of a marker as
 * much as of the block it opens. Inside the article, an id `context.
 * eggLabels` does not carry is an orphan marker: it renders as the plain
 * text the marker's own children hold, which is also what a plain Markdown
 * tool shows a `[✦]{.egg …}` span as, and nothing there is clickable.
 */
function eggMarker(node: Inline, context: RenderContext): string {
  if (context.rendering !== "article") return "";
  const id = node.attributes.pairs["egg"] ?? "";
  const label = context.eggLabels?.get(id);
  if (label === undefined) return renderInlines(node.children, context);
  const target = `${context.idPrefix ?? ""}egg-${id}`;
  // A screen reader announces the accessible name, not the glyph a sighted
  // reader sees, so `aria-label` says what activating it does
  // (itd-2609061324342715: "announces what it is before it is activated"),
  // and `aria-haspopup="dialog"` is the native way to say that in advance.
  return `<button type="button" class="egg-marker"${attributes([
    ["data-egg", target],
  ])} aria-haspopup="dialog" aria-label="Reveal hidden content">${escapeText(
    label,
  )}</button>`;
}

/** Render one inline node. */
function inline(node: Inline, context: RenderContext): string {
  const children = (): string => renderInlines(node.children, context);
  switch (node.kind) {
    case "text":
      return escapeText(node.text);
    case "break":
      return "\n";
    case "html":
      // The trust contract: a chapter is a file, and a file can come from
      // anywhere — a Markdown file dropped onto a Part becomes a chapter. The
      // tree keeps raw HTML as written, because a plain tool reads the file
      // and the parse must not lose what is in it; every renderer escapes it.
      // A `<script>` in a chapter is therefore text on the page, never a
      // script in the reader's browser or on the published site.
      return escapeText(node.text);
    case "code":
      return `<code>${escapeText(node.text)}</code>`;
    case "emphasis":
      return `<em>${children()}</em>`;
    case "strong":
      return `<strong>${children()}</strong>`;
    case "strike":
      return `<s>${children()}</s>`;
    case "link": {
      const href = node.href ?? "";
      // An address the rendering will not write stays as its text: the words
      // the author wrote are on the page, and nothing is handed to a browser.
      return `<a${attributes([
        ["href", isLinkable(href) ? href : null],
        ["title", node.title ?? null],
      ])}>${children()}</a>`;
    }
    case "span":
      if (hasClass(node, "egg")) return eggMarker(node, context);
      return `<span${attributes([["id", node.attributes.id]])}${classAttribute(
        node.attributes.classes,
      )}>${children()}</span>`;
    case "image":
      return image(node.src ?? "", node.text, { attributes: node.attributes }, context);
    case "citation": {
      const citations = context.citations;
      if (citations === undefined) {
        // No resolution was handed to this rendering — the deck's own notes,
        // never a reader's surface — so the citation stays the literal text
        // the author wrote, which is what a plain tool shows too.
        return `<span class="citation">${escapeText(node.text)}</span>`;
      }
      return renderResolvedCitation(node, citations);
    }
    case "footnote-reference":
    case "footnote-inline": {
      const label = node.label ?? "";
      const href = context.footnoteHref?.(label) ?? null;
      const marker = escapeText(label);
      const body =
        href === null
          ? marker
          : `<a href="${escapeAttribute(href)}" id="${escapeAttribute(
              context.idPrefix ?? "",
            )}fnref-${escapeAttribute(label)}">${marker}</a>`;
      return `<sup class="footnote-reference">${body}</sup>`;
    }
    default:
      return escapeText(node.text);
  }
}

/** Render a run of inline nodes. */
export function renderInlines(
  nodes: readonly Inline[],
  context: RenderContext,
): string {
  return nodes
    .filter((node) => inlineInVariant(node, context.variant))
    .map((node) => inline(node, context))
    .join("");
}

/** Render one table cell. */
function cell(item: TableCell, context: RenderContext): string {
  const tag = item.header ? "th" : "td";
  // The alignment is a data attribute rather than a `style`: the site serves
  // under `style-src 'self'`, which drops a style attribute unread.
  return `<${tag}${attributes([["data-align", item.align]])}>${renderInlines(
    item.inlines,
    context,
  )}</${tag}>`;
}

/** Render one list item. */
function listItem(
  item: ListItem,
  context: RenderContext,
  flow: (blocks: readonly Block[], context: RenderContext) => string,
): string {
  // A single paragraph is the common case and wants no `<p>` inside the item.
  const only = item.blocks[0];
  if (item.blocks.length === 1 && only?.kind === "paragraph") {
    return `<li>${renderInlines(only.inlines, context)}</li>`;
  }
  return `<li>${flow(item.blocks, context)}</li>`;
}

/**
 * The block shapes both renderings share.
 *
 * `flow` is how the caller renders a run of blocks, which is what a list item
 * and a quote hold: passing it in keeps the recursion in one renderer rather
 * than making this module a third one.
 */
export function renderCommonBlock(
  block: Block,
  context: RenderContext,
  flow: (blocks: readonly Block[], context: RenderContext) => string,
): string | null {
  switch (block.kind) {
    case "paragraph":
      return `<p${attributes([["id", block.attributes.id]])}${classAttribute(
        block.attributes.classes,
      )}>${renderInlines(block.inlines, context)}</p>`;
    case "list": {
      const tag = block.ordered === true ? "ol" : "ul";
      const items = (block.items ?? [])
        .map((item) => listItem(item, context, flow))
        .join("");
      return `<${tag}>${items}</${tag}>`;
    }
    case "quote":
      return `<blockquote>${flow(block.children, context)}</blockquote>`;
    case "code": {
      const language = block.info === undefined || block.info === "" ? null : block.info;
      return `<pre><code${attributes([
        ["class", language === null ? null : `language-${language}`],
      ])}>${escapeText(block.text)}</code></pre>`;
    }
    case "table": {
      const table = block.table ?? { head: [], body: [] };
      const head =
        table.head.length === 0
          ? ""
          : `<thead>${table.head
              .map((row) => `<tr>${row.map((item) => cell(item, context)).join("")}</tr>`)
              .join("")}</thead>`;
      const body =
        table.body.length === 0
          ? ""
          : `<tbody>${table.body
              .map((row) => `<tr>${row.map((item) => cell(item, context)).join("")}</tr>`)
              .join("")}</tbody>`;
      const caption =
        block.caption === undefined
          ? ""
          : `<caption>${escapeText(block.caption)}</caption>`;
      return `<table${attributes([["id", block.attributes.id]])}>${caption}${head}${body}</table>`;
    }
    case "html":
      // Escaped, under the same trust contract as an inline `html` node.
      return `<p>${escapeText(block.text)}</p>`;
    case "comment":
      // Read and thrown away in both phase-1 renderings.
      return "";
    default:
      return null;
  }
}

/**
 * A figure for an image block: the picture, its caption, and its credit.
 *
 * "Alt text is the caption; the title attribute is the credit", and a credit
 * is a line of its own rather than a sentence appended to the caption.
 */
export function renderFigure(
  block: Block,
  context: RenderContext,
  extraClasses: readonly string[] = [],
): string {
  const reference = block.image ?? { src: "", caption: "", credit: "" };
  const picture = image(reference.src, reference.caption, block, context);
  // The alt text is inline content of its own — the examples write a citation
  // inside one — so the caption is rendered from the image node's children
  // rather than from the flattened string the `alt` attribute carries.
  const captionNodes = block.inlines.flatMap((node) =>
    node.kind === "image" ? node.children : [],
  );
  const caption =
    reference.caption === ""
      ? ""
      : `<span class="caption">${renderInlines(captionNodes, context)}</span>`;
  const credit =
    reference.credit === ""
      ? ""
      : `<span class="credit">${escapeText(reference.credit)}</span>`;
  const body = caption === "" && credit === "" ? "" : `<figcaption>${caption}${credit}</figcaption>`;
  return `<figure${attributes([["id", block.attributes.id]])}${classAttribute([
    ...extraClasses,
    ...block.attributes.classes,
  ])}>${picture}${body}</figure>`;
}

/**
 * A `.video` block as its poster and its links.
 *
 * Phase 1 seeds no video, and no rendering plays one yet: the poster and a
 * link are what both the article and the printed page fall back to, so that a
 * chapter that carries one is not silently short of a paragraph.
 */
export function renderVideo(block: Block, context: RenderContext): string {
  const video = block.video ?? { poster: null, caption: null, sources: [] };
  const poster =
    video.poster === null ? "" : image(video.poster, video.caption ?? "", null, context);
  const links = video.sources
    .map((source) => {
      const resolution = context.resolve(source.reference);
      const target = resolution.url ?? source.reference;
      // A source that names a scheme this rendering will not write is listed
      // as its own text: the author sees what they wrote, and no reader's
      // browser is handed a `javascript:` or a `data:` address.
      return `<li${attributes([["data-role", source.role]])}><a${attributes([
        ["href", isLinkable(target) ? target : null],
      ])}>${escapeText(source.reference)}</a></li>`;
    })
    .join("");
  const caption =
    video.caption === null
      ? ""
      : `<figcaption>${escapeText(video.caption)}</figcaption>`;
  return `<figure class="video">${poster}${caption}<ul class="video-sources">${links}</ul></figure>`;
}
