/**
 * The Tufte article, from the same tree the deck is built from.
 *
 * One parse feeds both renderings, and the slide-only constructs cost the
 * article nothing. Every placement is read from `canon.ts`'s Article column —
 * the table, not this module, is where an ignore rule lives — so a `.notes`
 * div is absent, a `.columns` div puts its content in the flow, a
 * `{.divider}` heading is an ordinary heading, and a rule is a rule.
 *
 * spc-2609061318090042 (map #9) is what turned the phase-1 skeleton into a
 * page: a contents list to four levels, [`renderMarginNote`] as the one
 * generic shape a footnote, a citation, a `.margin` span and a `.credit` div
 * all share, a callout box, and the video rule `article-video.js` upgrades at
 * runtime. `article.css` is the one stylesheet every host reads or copies,
 * and this module renders the markup that stylesheet gives its shape to —
 * nothing here decides how wide the margin is or where it folds, because
 * that is what "stylesheet rules alone" in the intent's own falsifiable
 * claim means: change the width at one breakpoint, in one file, and every
 * host that links or embeds it changes with it.
 */

import { pathResolver, type Resolver } from "../assets";
import type { CitationResolution } from "../bibliography";
import { placementOf } from "../canon";
import { outlineOf, slugify, type OutlineNode } from "../outline";
import { hasClass, walkChapterBlocks, type Block, type Chapter, type FootnoteDefinition, type Inline } from "../tree";
import { walkInlines } from "../tree";
import {
  attributes,
  classAttribute,
  escapeAttribute,
  escapeText,
  inlineInVariant,
  renderCommonBlock,
  renderFigure,
  renderInlines,
  renderVideo,
  type RenderContext,
} from "./html";

// `?inline` reads the file's own text at build time rather than emitting a
// second stylesheet: `article.css` is the one source spc-2609061318090042
// names, the app's preview links it directly by path, and the site build and
// the folder export copy its bytes (`src-tauri/src/publish/stage.rs`). This
// export exists so a test can hold the rules a jsdom test can reach without
// reading the file from disk a second way.
import stylesheet from "./article.css?inline";

/** The article's one stylesheet, read from its one source file. */
export const ARTICLE_STYLESHEET: string = stylesheet;

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
  /**
   * The document's citations, resolved once by `bibliography.ts`.
   *
   * Absent is the phase-1 fallback a caller testing this module in isolation
   * may still choose: a citation renders the literal text the author wrote,
   * exactly as `html.ts`'s own default does. Every production caller —
   * `preview.ts`, `publish/build.ts` — resolves the whole document's chapters
   * once and hands the same [`CitationResolution`] to every chapter it
   * renders, which is what keeps one key's marker, its margin note, and the
   * generated reference list in agreement.
   */
  readonly citations?: CitationResolution | undefined;
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

/** The contents list, from the outline the sidebar reads. */
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

/**
 * The same nodes with every Sub-sub-section gone.
 *
 * The intent's own words for what map #9's contents list carries — "the
 * Parts, the Chapters, the Sections, and the Sub-sections" — name four
 * levels and stop one short of a Sub-sub-section. A Sub-sub-section still
 * gets a heading and an anchor on the page; it is only left out of the list
 * that jumps to one.
 */
function forContents(nodes: readonly OutlineNode[]): OutlineNode[] {
  return nodes
    .filter((node) => node.kind !== "subsubsection")
    .map((node) => ({ ...node, children: forContents(node.children) }));
}

/** The heading ids the contents list points at, by the line they sit on. */
function anchorsByLine(chapter: Chapter, prefix: string): Map<number, string> {
  const byLine = new Map<number, string>();
  const outline = outlineOf(chapter);
  if (outline.titleLine !== null) {
    // The chapter's own title carries no id from the outline — the outline
    // draws only the levels below it — so the contents list's "Chapter"
    // entry would otherwise have nowhere on the page to send a reader.
    byLine.set(outline.titleLine, `${prefix}${slugify(outline.title ?? "")}`);
  }
  const walk = (nodes: readonly OutlineNode[]): void => {
    for (const node of nodes) {
      byLine.set(node.line, `${prefix}${node.id}`);
      walk(node.children);
    }
  };
  walk(outline.nodes);
  return byLine;
}

/** The anchor a document-wide contents list sends a Chapter entry to. */
function chapterHref(chapter: Chapter, idPrefix: string): string {
  return `${idPrefix}${slugify(outlineOf(chapter).title ?? "")}`;
}

/** One entry `renderDocumentContents` reads a Chapter from. */
export interface DocumentContentsChapter {
  readonly chapter: Chapter;
  readonly idPrefix: string;
  /**
   * The Part's display label, as the sidebar shows it — the folder name
   * with its numeric prefix and its hyphens gone. Consecutive entries
   * sharing one label are read as one Part's chapters; omit it for a
   * document the caller does not group by Part.
   */
  readonly part?: string;
}

/** One Chapter's own entry: its title, linked, with its Sections nested. */
function chapterItem(entry: DocumentContentsChapter): string {
  const outline = outlineOf(entry.chapter);
  const nested = renderContents(forContents(prefixed(outline.nodes, entry.idPrefix)));
  if (outline.title === null && nested === "") {
    // Nothing to send a reader to: a chapter with no title and no Section
    // contributes no entry, rather than one that links nowhere useful.
    return "";
  }
  const href = chapterHref(entry.chapter, entry.idPrefix);
  const label = `<a href="#${escapeAttribute(href)}">${escapeText(outline.title ?? "Untitled")}</a>`;
  return `<li>${label}${nested}</li>`;
}

/**
 * The contents list for a whole document, to four levels: Part, Chapter,
 * Section, Sub-section.
 *
 * The article is one page per document, so its contents list covers every
 * chapter rather than the first. Each chapter's ids carry its own prefix,
 * which is what keeps two chapters' identical headings pointing at
 * different places. A Part has no heading of its own on the page — it is a
 * folder, not a construct the canon renders — so its own entry is a label
 * rather than a link: choosing it would only repeat the choice of the
 * Chapter nested directly beneath it, which is the entry with somewhere new
 * to send a reader.
 */
export function renderDocumentContents(
  chapters: readonly DocumentContentsChapter[],
): string {
  if (!chapters.some((entry) => (entry.part ?? "") !== "")) {
    // No caller named a Part: the flat list phase 1 always wrote, one entry
    // per Chapter, is exactly what a single-chapter preview still wants.
    const items = chapters.map((entry) => chapterItem(entry)).join("");
    return items === "" ? "" : `<nav class="contents"><ol>${items}</ol></nav>`;
  }
  const groups: { part: string; chapters: DocumentContentsChapter[] }[] = [];
  for (const entry of chapters) {
    const part = entry.part ?? "";
    const current = groups[groups.length - 1];
    if (current !== undefined && current.part === part) {
      current.chapters.push(entry);
    } else {
      groups.push({ part, chapters: [entry] });
    }
  }
  const items = groups
    .map((group) => {
      // A label, not a link: a Part's own anchor would only duplicate the
      // Chapter nested beneath it, and every href in one document's contents
      // list otherwise names a distinct heading.
      const label = `<span class="part">${escapeText(group.part)}</span>`;
      const chapterItems = group.chapters.map((entry) => chapterItem(entry)).join("");
      return `<li>${label}<ol>${chapterItems}</ol></li>`;
    })
    .join("");
  return items === "" ? "" : `<nav class="contents"><ol>${items}</ol></nav>`;
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
  /** The footnote definitions a reference in this chapter resolves against. */
  readonly chapter: Chapter;
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

/**
 * A `.callout` div: a box in the flow, its kind carried as `data-kind`.
 *
 * The kind is the author's data, not markup — `warning`, say — so it reaches
 * the page as an attribute `article.css` reads with a selector, the same
 * discipline a declared image width and a table's alignment already follow
 * under this site's `style-src 'self'`.
 */
function renderCallout(block: Block, article: Article): string {
  const kind = block.attributes.pairs["kind"] ?? "";
  return `<div${attributes([
    ["id", block.attributes.id],
    ["data-kind", kind],
  ])}${classAttribute(block.attributes.classes)}>${renderBlocks(block.children, article)}</div>`;
}

/** Whether an inline node is a `.margin` span. */
function isMarginSpan(node: Inline): boolean {
  return node.kind === "span" && hasClass(node, "margin");
}

/**
 * The same inline nodes, with every `.margin` span removed.
 *
 * A footnote and a citation leave a marker behind in the sentence — a
 * footnote's own superscript, a citation's own literal key — because that is
 * what lets a reader follow the mark to the note beside it. A `.margin` span
 * has none: `05-internals.md` section 3 calls it "a margin aside without a
 * marker", so its words belong only to the note [`inlineMarginNotes`] builds
 * from it, and are not left a second time in the sentence that held them.
 */
function withoutMarginSpans(nodes: readonly Inline[]): Inline[] {
  return nodes
    .filter((node) => !isMarginSpan(node))
    .map((node) =>
      node.children.length === 0
        ? node
        : { ...node, children: withoutMarginSpans(node.children) },
    );
}

/** A block with every `.margin` span gone from its own inline content. */
function strippedOfMarginSpans(block: Block): Block {
  return block.inlines.length === 0
    ? block
    : { ...block, inlines: withoutMarginSpans(block.inlines) };
}

/**
 * The one shape a footnote, a citation, and a `.margin` span all render as.
 *
 * Any inline node or any block can call it: `article.css` carries exactly one
 * selector, `.margin-note`, for the appearance every one of them shares, and
 * `kind` is the extra class — `footnote`, `margin`, `credit`, `citation`, or
 * `citation unresolved` — a stylesheet rule tells them apart by. A resolved
 * citation's body is the same reference text the generated list carries; an
 * unresolved one's is the key exactly as the author wrote it, which is also
 * what the sidebar lists against the chapter (itd-2609051335502171, map #11).
 */
export function renderMarginNote(kind: string, body: string, id: string | null = null): string {
  return `<aside${attributes([["id", id]])} class="margin-note ${escapeAttribute(kind)}">${body}</aside>`;
}

/**
 * The margin notes one citation inline node produces, one per key.
 *
 * itd-2609051335502171 (map #11) resolves what spc-2609061318090042 left as a
 * seam: a key that resolves gets the same reference text the generated
 * reference list carries, so a reader beside the paragraph and a reader at
 * the end of the page are told the same thing about the same work; a key that
 * does not resolve keeps the placeholder [`renderMarginNote`] always offered
 * — the key alone, marked unresolved — which is also what the sidebar lists
 * against the chapter.
 */
function citationMarginNotes(node: Inline, article: Article): string[] {
  const citations = article.context.citations;
  if (citations === undefined) {
    // No resolution was handed to this rendering: the phase-1 placeholder,
    // the key exactly as written, kept for a caller testing this module
    // without a bibliography.
    return [renderMarginNote("citation unresolved", escapeText(node.text))];
  }
  const notes: string[] = [];
  for (const key of node.keys ?? []) {
    const reference = citations.byKey.get(key);
    notes.push(
      reference === undefined
        ? renderMarginNote("citation unresolved", escapeText(key))
        : renderMarginNote("citation", `<p>${escapeText(reference.text)}</p>`),
    );
  }
  return notes;
}

/**
 * Every margin note one block's own inline content produces, in source
 * order: a citation, a footnote reference, an inline footnote, and a
 * `.margin` span. Rendered as the block's own next sibling by [`renderBlocks`],
 * which is the whole of how "beside the paragraph at 820 and 1280 CSS px" and
 * "in the flow directly after it at 390" come to be one answer: the note
 * never moves in the markup, and only `article.css` decides which of those
 * two the reader sees.
 */
function inlineMarginNotes(block: Block, article: Article): string {
  const notes: string[] = [];
  const prefix = escapeAttribute(article.idPrefix);
  for (const node of walkInlines(block.inlines)) {
    if (!inlineInVariant(node, article.variant)) continue;
    if (node.kind === "citation") {
      notes.push(...citationMarginNotes(node, article));
    } else if (node.kind === "footnote-inline") {
      const label = node.label ?? "";
      notes.push(
        renderMarginNote(
          "footnote",
          `<p>${renderInlines(node.children, article.context)}</p>`,
          `${prefix}fn-${escapeAttribute(label)}`,
        ),
      );
    } else if (node.kind === "footnote-reference") {
      const label = node.label ?? "";
      const definition: FootnoteDefinition | undefined = article.chapter.footnotes[label];
      const body = definition === undefined ? "" : renderBlocks(definition.blocks, article);
      notes.push(renderMarginNote("footnote", body, `${prefix}fn-${escapeAttribute(label)}`));
    } else if (isMarginSpan(node)) {
      notes.push(renderMarginNote("margin", renderInlines(node.children, article.context)));
    }
  }
  return notes.join("");
}

/** One block's own body: its margin notes are the caller's, not this. */
function renderOneBlock(block: Block, article: Article): string {
  const clean = strippedOfMarginSpans(block);
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
      if (block.kind === "heading") return renderHeading(clean, article);
      if (block.kind === "div") return renderColumnsInFlow(block, article);
      break;
    case "margin":
      // A `.credit` div is a margin note, beside the block it follows — the
      // same shape a footnote and a citation render through.
      return renderMarginNote("credit", renderBlocks(block.children, article));
    case "appendix":
      // A `.refs` heading is where Alice asked the generated reference list
      // to sit; the heading itself renders as an ordinary heading and the
      // list follows it, so a document that writes one gets its appendix
      // there rather than appended a second time after the last chapter.
      return renderHeading(clean, article) + renderReferenceList(article.context.citations);
    case "callout":
      return renderCallout(block, article);
    case "honoured":
      return renderFigure(clean, article.context);
    case "contents":
      return renderHeading(clean, article);
    default:
      break;
  }
  if (block.kind === "heading") return renderHeading(clean, article);
  if (block.kind === "div") return renderDiv(block, article);
  if (block.kind === "rule") return "<hr />";
  if (block.kind === "image") return renderFigure(clean, article.context);
  return (
    renderCommonBlock(clean, article.context, (children, context) =>
      renderBlocks(children, { ...article, context }),
    ) ?? ""
  );
}

/**
 * Render a run of blocks into the article's flow.
 *
 * A margin note a block's inline content produces is appended as that
 * block's own next sibling here, and nowhere else — which is what keeps
 * [`renderOneBlock`] free to be called recursively (a list item, a quote, a
 * div's children) without every caller remembering to ask for its notes too.
 */
function renderBlocks(blocks: readonly Block[], article: Article): string {
  return blocks
    .filter((block) => inVariant(block, article.variant))
    .map((block) => renderOneBlock(block, article) + inlineMarginNotes(block, article))
    .join("");
}

/**
 * The generated reference list: one entry per cited key that resolved, in
 * first-citation order, and no others.
 *
 * "Every reference list is generated; none is typed" (`04-surfaces.md`
 * section 3). A resolution with nothing cited — no bibliography, or no
 * citation in the chapters it was built from — writes nothing at all, which
 * is what keeps a document with no bibliography ordinary rather than an empty
 * heading with nothing beneath it.
 */
export function renderReferenceList(citations: CitationResolution | undefined): string {
  const references = citations?.references ?? [];
  if (references.length === 0) return "";
  const items = references
    .map((reference) => `<li id="ref-${String(reference.number)}">${escapeText(reference.text)}</li>`)
    .join("");
  return `<ol class="reference-list">${items}</ol>`;
}

/**
 * Whether a chapter writes a `## Sources {.refs}` heading anywhere in it.
 *
 * The document-level composer (`preview.ts`, `publish/build.ts`) calls this
 * across every chapter before appending a reference list of its own: a
 * document that placed the heading itself gets the list there, through
 * [`renderOneBlock`]'s `appendix` case, and nowhere a second time.
 */
export function chapterHasRefsHeading(chapter: Chapter): boolean {
  for (const block of walkChapterBlocks(chapter)) {
    if (block.kind === "heading" && hasClass(block, "refs")) return true;
  }
  return false;
}

/** A `.columns` div in the article: the fence is gone, the content is not. */
function renderColumnsInFlow(block: Block, article: Article): string {
  const children = block.children.flatMap((child) =>
    child.attributes.classes.includes("column") ? child.children : [child],
  );
  return renderBlocks(children, article);
}

/**
 * The article skeleton for one chapter.
 *
 * Headings to four levels, a contents list, paragraphs, images with their
 * captions and credits, and video as its poster and a link. A footnote, a
 * citation, a `.margin` span, and a `.credit` div render as margin notes
 * beside the block that made them, through [`renderMarginNote`]; none of
 * them is printed at the foot of the page.
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
      citations: options.citations,
    },
    variant,
    anchors: anchorsByLine(chapter, idPrefix),
    idPrefix,
    chapter,
  };
  const contents =
    options.contents === false
      ? ""
      : renderDocumentContents([{ chapter, idPrefix }]);
  const body = renderBlocks(chapter.blocks, article);
  return `<article>${contents}${body}</article>`;
}
