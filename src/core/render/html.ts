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
import type { Block, Inline, ListItem, TableCell } from "../tree";

/** What a renderer hands the shared shapes. */
export interface RenderContext {
  /** Where a picture is, as the host answers it. */
  readonly resolve: Resolver;
  /** Which column of the canon table is being rendered. */
  readonly rendering: "article" | "slides";
  /** The anchor a footnote reference points at, or null for no link. */
  readonly footnoteHref?: (label: string) => string | null;
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
  return `<img${attributes([
    ["src", resolution.url],
    ["alt", alt],
    ["width", width],
  ])} />`;
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
    case "link":
      return `<a${attributes([
        ["href", node.href ?? ""],
        ["title", node.title ?? null],
      ])}>${children()}</a>`;
    case "span":
      return `<span${attributes([["id", node.attributes.id]])}${classAttribute(
        node.attributes.classes,
      )}>${children()}</span>`;
    case "image":
      return image(node.src ?? "", node.text, { attributes: node.attributes }, context);
    case "citation":
      // Nothing resolves a key in this phase, so a citation renders as the
      // literal text the author wrote — which is what a plain tool does too.
      return `<span class="citation">${escapeText(node.text)}</span>`;
    case "footnote-reference":
    case "footnote-inline": {
      const label = node.label ?? "";
      const href = context.footnoteHref?.(label) ?? null;
      const marker = escapeText(label);
      const body =
        href === null
          ? marker
          : `<a href="${escapeAttribute(href)}" id="fnref-${escapeAttribute(label)}">${marker}</a>`;
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
  return nodes.map((node) => inline(node, context)).join("");
}

/** Render one table cell. */
function cell(item: TableCell, context: RenderContext): string {
  const tag = item.header ? "th" : "td";
  const style = item.align === null ? null : `text-align: ${item.align}`;
  return `<${tag}${attributes([["style", style]])}>${renderInlines(
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
      return `<li${attributes([["data-role", source.role]])}><a${attributes([
        ["href", target],
      ])}>${escapeText(source.reference)}</a></li>`;
    })
    .join("");
  const caption =
    video.caption === null
      ? ""
      : `<figcaption>${escapeText(video.caption)}</figcaption>`;
  return `<figure class="video">${poster}${caption}<ul class="video-sources">${links}</ul></figure>`;
}
