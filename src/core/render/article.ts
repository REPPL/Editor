/**
 * The article skeleton, from the same tree the deck is built from.
 *
 * Unstyled and unpublished in phase 1: its job here is to show that one parse
 * feeds both renderings, and that the slide-only constructs cost the article
 * nothing. Every placement is read from `canon.ts`'s Article column — the
 * table, not this module, is where an ignore rule lives — so a `.notes` div is
 * absent, a `.columns` div puts its content in the flow, a `{.divider}`
 * heading is an ordinary heading, and a rule is a rule.
 *
 * Map #9 owns the Tufte page in phase 2 and inherits this file.
 */

import { pathResolver, type Resolver } from "../assets";
import { placementOf } from "../canon";
import { outlineOf, type OutlineNode } from "../outline";
import type { Block, Chapter, FootnoteDefinition, Inline } from "../tree";
import { walkBlocks, walkInlines } from "../tree";
import {
  attributes,
  classAttribute,
  escapeAttribute,
  escapeText,
  renderCommonBlock,
  renderFigure,
  renderInlines,
  renderVideo,
  type RenderContext,
} from "./html";

/** What a build may be told about an article. */
export interface ArticleOptions {
  /** The variant to render; null renders everything, which is phase 1. */
  readonly variant?: string | null;
  /** Whether to write the contents list. */
  readonly contents?: boolean;
  /**
   * What every id this chapter writes is prefixed with.
   *
   * An article is one page for the whole document, and an outline id is unique
   * within one chapter only — so two chapters each opening with "Beginnings"
   * would write the same id twice and the contents list would send both entries
   * to the first one. The build gives each chapter its own prefix.
   */
  readonly idPrefix?: string;
}

/** The anchor a footnote's marker points at. */
function footnoteHrefWith(prefix: string): (label: string) => string {
  return (label: string) => `#${prefix}fn-${label}`;
}

/** Whether a block belongs to the variant being rendered. */
function inVariant(block: Block, variant: string | null): boolean {
  if (variant === null || block.variants.length === 0) return true;
  return block.variants.includes(variant);
}

/** The contents list, to four levels, from the outline the sidebar reads. */
function renderContents(nodes: readonly OutlineNode[]): string {
  if (nodes.length === 0) return "";
  const items = nodes
    .map(
      (node) =>
        `<li><a href="#${escapeAttribute(node.id)}">${escapeText(node.label)}</a>${renderContents(
          node.children,
        )}</li>`,
    )
    .join("");
  return `<ol>${items}</ol>`;
}

/** The heading ids the contents list points at, by the line they sit on. */
function anchorsByLine(chapter: Chapter, prefix: string): Map<number, string> {
  const byLine = new Map<number, string>();
  const walk = (nodes: readonly OutlineNode[]): void => {
    for (const node of nodes) {
      byLine.set(node.line, `${prefix}${node.id}`);
      walk(node.children);
    }
  };
  walk(outlineOf(chapter).nodes);
  return byLine;
}

/**
 * The contents list for a whole document, one entry per heading in reading
 * order.
 *
 * The article is one page per document, so its contents list covers every
 * chapter rather than the first. Each chapter's ids carry its own prefix, which
 * is what keeps two chapters' identical headings pointing at different places.
 */
export function renderDocumentContents(
  chapters: readonly { readonly chapter: Chapter; readonly idPrefix: string }[],
): string {
  const nodes = chapters.flatMap((entry) => prefixed(outlineOf(entry.chapter).nodes, entry.idPrefix));
  const list = renderContents(nodes);
  return list === "" ? "" : `<nav class="contents">${list}</nav>`;
}

/** The same nodes with every id prefixed, children included. */
function prefixed(nodes: readonly OutlineNode[], prefix: string): OutlineNode[] {
  return nodes.map((node) => ({
    ...node,
    id: `${prefix}${node.id}`,
    children: prefixed(node.children, prefix),
  }));
}

/** One article rendering, with the state a chapter's footnotes need. */
interface Article {
  readonly context: RenderContext;
  readonly variant: string | null;
  readonly anchors: ReadonlyMap<number, string>;
  /** What every id this chapter writes is prefixed with. */
  readonly idPrefix: string;
}

/** A heading, to four levels, its classes carried and its anchor set. */
function renderHeading(block: Block, article: Article): string {
  const level = Math.min(Math.max(block.level ?? 1, 1), 6);
  const id = article.anchors.get(block.line) ?? block.attributes.id;
  return `<h${String(level)}${attributes([["id", id]])}${classAttribute(
    block.attributes.classes,
  )}>${renderInlines(block.inlines, article.context)}</h${String(level)}>`;
}

/** A div this phase does not render specially: classes on the wrapper. */
function renderDiv(block: Block, article: Article): string {
  if (block.video !== undefined) return renderVideo(block, article.context);
  return `<div${attributes([["id", block.attributes.id]])}${classAttribute(
    block.attributes.classes,
  )}>${renderBlocks(block.children, article)}</div>`;
}

/** Render a run of blocks into the article's flow. */
function renderBlocks(blocks: readonly Block[], article: Article): string {
  return blocks
    .filter((block) => inVariant(block, article.variant))
    .map((block) => {
      switch (placementOf(block, "article")) {
        case "absent":
          // A `.notes` div is the speaker's, and the reader never learns a
          // talk was shaped in the file they are reading.
          return "";
        case "ignored":
          return "";
        case "filtered":
          // A variant block that survived the filter is transparent.
          return renderBlocks(block.children, article);
        case "flow":
          // A rule is a rule; a `.divider` heading is an ordinary heading; a
          // `.columns` div is ignored and its content is in the flow.
          if (block.kind === "rule") return "<hr />";
          if (block.kind === "heading") return renderHeading(block, article);
          if (block.kind === "div") return renderColumnsInFlow(block, article);
          break;
        case "margin":
          // A `.credit` div is a margin note in the article; phase 2 puts it
          // in the margin, and phase 1 marks it as one.
          return `<aside class="credit">${renderBlocks(block.children, article)}</aside>`;
        case "honoured":
          return renderFigure(block, article.context);
        case "contents":
          return renderHeading(block, article);
        default:
          break;
      }
      if (block.kind === "heading") return renderHeading(block, article);
      if (block.kind === "div") return renderDiv(block, article);
      if (block.kind === "rule") return "<hr />";
      if (block.kind === "image") return renderFigure(block, article.context);
      return renderCommonBlock(block, article.context, (children, context) =>
        renderBlocks(children, { ...article, context }),
      ) ?? "";
    })
    .join("");
}

/** A `.columns` div in the article: the fence is gone, the content is not. */
function renderColumnsInFlow(block: Block, article: Article): string {
  const children = block.children.flatMap((child) =>
    child.attributes.classes.includes("column") ? child.children : [child],
  );
  return renderBlocks(children, article);
}

/** Every footnote the article's own text references, in source order. */
function referencedFootnotes(chapter: Chapter, variant: string | null): Inline[] {
  const found: Inline[] = [];
  const seen = new Set<string>();
  for (const block of walkBlocks(chapter.blocks)) {
    if (!inVariant(block, variant)) continue;
    for (const inline of walkInlines(block.inlines)) {
      if (inline.kind !== "footnote-reference" && inline.kind !== "footnote-inline") continue;
      const label = inline.label ?? "";
      if (seen.has(label)) continue;
      seen.add(label);
      found.push(inline);
    }
  }
  return found;
}

/** The notes, where the article puts its notes until the margin arrives. */
function renderFootnotes(chapter: Chapter, article: Article): string {
  const referenced = referencedFootnotes(chapter, article.variant);
  if (referenced.length === 0) return "";
  const items = referenced
    .map((note) => {
      const label = note.label ?? "";
      const definition: FootnoteDefinition | undefined = chapter.footnotes[label];
      const body =
        note.kind === "footnote-inline"
          ? `<p>${renderInlines(note.children, article.context)}</p>`
          : definition === undefined
            ? ""
            : renderBlocks(definition.blocks, article);
      const prefix = escapeAttribute(article.idPrefix);
      return `<li id="${prefix}fn-${escapeAttribute(label)}"><a class="footnote-back" href="#${prefix}fnref-${escapeAttribute(
        label,
      )}">${escapeText(label)}</a>${body}</li>`;
    })
    .join("");
  return `<section class="footnotes"><ol>${items}</ol></section>`;
}

/**
 * The article skeleton for one chapter.
 *
 * Headings to four levels, a contents list, paragraphs, images with their
 * captions and credits, footnotes, citations as the unresolved keys the author
 * wrote, and video as its poster and a link. No styling of any kind: that is
 * phase 2's, and putting it here would make two answers to one question.
 */
export function renderArticle(
  chapter: Chapter,
  resolve: Resolver = pathResolver(),
  options: ArticleOptions = {},
): string {
  const variant = options.variant ?? null;
  const idPrefix = options.idPrefix ?? "";
  const article: Article = {
    context: {
      resolve,
      rendering: "article",
      footnoteHref: footnoteHrefWith(idPrefix),
      variant,
      idPrefix,
    },
    variant,
    anchors: anchorsByLine(chapter, idPrefix),
    idPrefix,
  };
  const outline = outlineOf(chapter);
  const contents =
    options.contents === false
      ? ""
      : (() => {
          const list = renderContents(outline.nodes);
          return list === "" ? "" : `<nav class="contents">${list}</nav>`;
        })();
  const body = renderBlocks(chapter.blocks, article);
  return `<article>${contents}${body}${renderFootnotes(chapter, article)}</article>`;
}
