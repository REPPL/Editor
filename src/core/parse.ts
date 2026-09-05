/**
 * Chapter text to the document tree.
 *
 * One parse, on markdown-it 14, configured for the canon of
 * `05-internals.md` section 3 and nothing else. Every rendering — the article,
 * the deck, the Typst source — is a function of what this returns, so a
 * difference between two renderings is a difference in a renderer and never in
 * how the file was read.
 *
 * The instance itself, with the fenced-div and citation rules that are
 * Editor's own, is `markdown.ts`; this module turns its tokens into the tree.
 *
 * The parse never writes, and never rewrites what it read: attributes are kept
 * as written, and every block carries the byte span it came from.
 */

import type { Token } from "markdown-it";

import { markdown } from "./markdown";
import {
  emptyAttributes,
  parseAttributes,
  type Attributes,
  type Block,
  type BlockKind,
  type Chapter,
  type FootnoteDefinition,
  type FrontMatter,
  type Inline,
  type InlineKind,
  type ListItem,
  type Span,
  type TableCell,
  type TableContent,
  type Video,
  type VideoSource,
} from "./tree";


/** The roles a `.video` source line may name, in the order they are tried. */
const VIDEO_ROLES = ["local", "site", "gated", "remote"];

/** Where each line begins and ends, in UTF-8 bytes. */
interface LineTable {
  readonly lines: readonly string[];
  /** Byte offset of the first character of each line. */
  readonly starts: readonly number[];
  /** Byte offset just past the last character of each line, newline excluded. */
  readonly ends: readonly number[];
}

/** How many UTF-8 bytes one code point at `index` takes. */
function unitBytes(text: string, index: number): number {
  const code = text.charCodeAt(index);
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  // A surrogate pair is four bytes across two code units, so each unit is two.
  return code >= 0xd800 && code <= 0xdfff ? 2 : 3;
}

/** The UTF-8 byte length of `source` between two code-unit indexes. */
function bytesBetween(source: string, from: number, to: number): number {
  let bytes = 0;
  for (let index = from; index < to; index += 1) bytes += unitBytes(source, index);
  return bytes;
}

/** Measure every line of the source once. */
function lineTable(source: string): LineTable {
  const lines: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  let index = 0;
  for (;;) {
    let cursor = index;
    while (cursor < source.length && source[cursor] !== "\n") cursor += 1;
    let contentEnd = cursor;
    if (contentEnd > index && source[contentEnd - 1] === "\r") contentEnd -= 1;
    lines.push(source.slice(index, contentEnd));
    starts.push(offset);
    offset += bytesBetween(source, index, contentEnd);
    ends.push(offset);
    // The carriage return, then the newline: both are the file's, not a line's.
    offset += bytesBetween(source, contentEnd, cursor);
    if (cursor >= source.length) break;
    offset += 1;
    index = cursor + 1;
  }
  return { lines, starts, ends };
}

/** What one parse needs to hand to every step of the walk. */
interface ParseContext {
  readonly table: LineTable;
  readonly footnotes: Record<string, FootnoteDefinition>;
  readonly env: FootnoteEnv;
}

/** The shape `markdown-it-footnote` leaves in the parse environment. */
interface FootnoteEnv {
  footnotes?: {
    list?: { label?: string; content?: string; tokens?: Token[] }[];
  };
}

/** Where a block sits: its byte span and its one-based first and last lines. */
interface Range {
  readonly span: Span;
  readonly line: number;
  readonly endLine: number;
}

/**
 * The range of the source lines `[from, to)`.
 *
 * Trailing blank lines are left out, so a block's span is the text the author
 * wrote and the blank line after it belongs to no block. `to` is exclusive, as
 * markdown-it's own line maps are.
 */
function rangeOfLines(table: LineTable, from: number, to: number): Range {
  const start = table.starts[from] ?? 0;
  let last = Math.min(to, table.lines.length) - 1;
  while (last > from && (table.lines[last] ?? "").trim() === "") last -= 1;
  const end = table.ends[last] ?? start;
  return {
    span: { start, end: Math.max(start, end) },
    line: from + 1,
    endLine: Math.max(from, last) + 1,
  };
}

/** The line map of a token, or the fallback when it carries none. */
function mapOf(token: Token, fallback: [number, number]): [number, number] {
  const map = token.map;
  return map === null ? fallback : [map[0], map[1]];
}

/**
 * markdown-it's attribute list as the tree's attribute shape.
 *
 * `src`, `alt` and `title` are Markdown's own syntax rather than an attribute
 * block, and the tree carries them on the image itself, so they are left out
 * of "the attributes, exactly as written".
 */
const SYNTAX_ATTRIBUTES = ["src", "alt", "title", "href"];

function attributesOf(token: Token): Attributes {
  const list = token.attrs;
  if (list === null) return emptyAttributes();
  let id: string | null = null;
  const classes: string[] = [];
  const pairs: Record<string, string> = {};
  for (const [name, value] of list) {
    if (name === "id") id = value;
    else if (name === "class") classes.push(...value.split(/\s+/).filter(Boolean));
    else if (!SYNTAX_ATTRIBUTES.includes(name)) pairs[name] = value;
  }
  return { id, classes, pairs };
}

/**
 * A fenced div's attributes.
 *
 * `markdown-it-attrs` reads a `{...}` fence and moves it onto the token, which
 * leaves `info` empty; a fence written Pandoc's other way, `::: notes`, keeps
 * its info and means the class of that name.
 */
function divAttributes(token: Token): Attributes {
  const info = token.info.trim();
  if (info === "") return attributesOf(token);
  if (info.startsWith("{")) return parseAttributes(info);
  return { id: null, classes: info.split(/\s+/).filter(Boolean), pairs: {} };
}

/** The variant names an attribute set declares, empty for every variant. */
function variantsOf(attributes: Attributes): string[] {
  if (!attributes.classes.includes("variant")) return [];
  return (attributes.pairs["variant"] ?? "").split(/\s+/).filter(Boolean);
}

/** The plain text of a list of inline nodes. */
function textOf(inlines: readonly Inline[]): string {
  return inlines.map((inline) => inline.text).join("");
}

/** The inline kind a markdown-it token opens, if the tree names one. */
const INLINE_CONTAINERS: Readonly<Record<string, InlineKind>> = {
  em: "emphasis",
  strong: "strong",
  s: "strike",
  link: "link",
  span: "span",
};

/** Convert one run of inline tokens into inline nodes. */
function inlinesFrom(
  tokens: readonly Token[],
  context: ParseContext,
): Inline[] {
  const nodes: Inline[] = [];
  const stack: { node: Inline; children: Inline[] }[] = [];
  const push = (node: Inline): void => {
    const top = stack[stack.length - 1];
    if (top === undefined) nodes.push(node);
    else top.children.push(node);
  };

  for (const token of tokens) {
    const container = INLINE_CONTAINERS[token.type.replace(/_(open|close)$/, "")];
    if (token.nesting === 1 && container !== undefined) {
      const attributes = attributesOf(token);
      const children: Inline[] = [];
      const node: Inline = {
        kind: container,
        text: "",
        attributes,
        children,
        ...(token.attrGet("href") !== null ? { href: token.attrGet("href") ?? "" } : {}),
        ...(token.attrGet("title") !== null ? { title: token.attrGet("title") ?? "" } : {}),
        ...(container === "span" ? { variants: variantsOf(attributes) } : {}),
      };
      stack.push({ node, children });
      continue;
    }
    if (token.nesting === -1 && container !== undefined) {
      const top = stack.pop();
      if (top === undefined) continue;
      push({ ...top.node, text: textOf(top.children), children: top.children });
      continue;
    }
    switch (token.type) {
      case "text":
        push({ kind: "text", text: token.content, attributes: emptyAttributes(), children: [] });
        break;
      case "code_inline":
        push({ kind: "code", text: token.content, attributes: emptyAttributes(), children: [] });
        break;
      case "softbreak":
      case "hardbreak":
        push({ kind: "break", text: "\n", attributes: emptyAttributes(), children: [] });
        break;
      case "html_inline":
        push({ kind: "html", text: token.content, attributes: emptyAttributes(), children: [] });
        break;
      case "image": {
        push({
          kind: "image",
          // The alt text is the caption, and it is inline content of its own:
          // the examples write a citation inside one.
          text: token.content,
          attributes: attributesOf(token),
          children: inlinesFrom(token.children ?? [], context),
          src: token.attrGet("src") ?? "",
          title: token.attrGet("title") ?? "",
        });
        break;
      }
      case "citation": {
        const meta = token.meta as { keys?: string[]; locator?: string } | null;
        push({
          kind: "citation",
          text: token.content,
          attributes: emptyAttributes(),
          children: [],
          keys: meta?.keys ?? [],
          locator: meta?.locator ?? "",
        });
        break;
      }
      case "footnote_ref": {
        const meta = token.meta as { id?: number; label?: string } | null;
        if (meta?.label !== undefined) {
          push({
            kind: "footnote-reference",
            text: `[^${meta.label}]`,
            attributes: emptyAttributes(),
            children: [],
            label: meta.label,
          });
          break;
        }
        const entry = context.env.footnotes?.list?.[meta?.id ?? -1];
        const children = inlinesFrom(entry?.tokens ?? [], context);
        push({
          kind: "footnote-inline",
          text: textOf(children),
          attributes: emptyAttributes(),
          children,
          label: String(meta?.id ?? ""),
        });
        break;
      }
      default:
        break;
    }
  }
  // An unclosed container still carries what it holds.
  while (stack.length > 0) {
    const top = stack.pop();
    if (top !== undefined) {
      push({ ...top.node, text: textOf(top.children), children: top.children });
    }
  }
  return nodes;
}

/** The index of the token that closes the container opened at `open`. */
function closeOf(tokens: readonly Token[], open: number, end: number): number {
  let depth = 0;
  for (let index = open; index < end; index += 1) {
    depth += tokens[index]?.nesting ?? 0;
    if (depth === 0) return index;
  }
  return end - 1;
}

/** A cell's alignment, from the inline style markdown-it puts on it. */
function alignOf(token: Token): "left" | "center" | "right" | null {
  const style = token.attrGet("style") ?? "";
  if (style.includes("right")) return "right";
  if (style.includes("center")) return "center";
  if (style.includes("left")) return "left";
  return null;
}

/** Read a table's head and body rows. */
function tableFrom(
  tokens: readonly Token[],
  from: number,
  to: number,
  context: ParseContext,
): TableContent {
  const head: TableCell[][] = [];
  const body: TableCell[][] = [];
  let inHead = false;
  let row: TableCell[] | null = null;
  for (let index = from; index < to; index += 1) {
    const token = tokens[index];
    if (token === undefined) continue;
    if (token.type === "thead_open") inHead = true;
    else if (token.type === "thead_close") inHead = false;
    else if (token.type === "tr_open") row = [];
    else if (token.type === "tr_close") {
      if (row !== null) (inHead ? head : body).push(row);
      row = null;
    } else if (token.type === "th_open" || token.type === "td_open") {
      const inline = tokens[index + 1];
      const inlines =
        inline?.type === "inline" ? inlinesFrom(inline.children ?? [], context) : [];
      row?.push({
        inlines,
        text: textOf(inlines),
        align: alignOf(token),
        header: token.type === "th_open",
      });
    }
  }
  return { head, body };
}

/** Read the `- role: reference` lines of a `.video` div from its own source. */
function videoFrom(attributes: Attributes, source: string): Video {
  const sources: VideoSource[] = [];
  for (const line of source.split("\n")) {
    const match = /^\s*[-+*]\s+([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (match === null) continue;
    const role = match[1] ?? "";
    sources.push({
      role,
      reference: (match[2] ?? "").trim(),
      known: VIDEO_ROLES.includes(role),
    });
  }
  return {
    poster: attributes.pairs["poster"] ?? null,
    caption: attributes.pairs["caption"] ?? null,
    sources,
  };
}

/** The text between `<!--` and `-->`, or null when the block is not a comment. */
function commentText(html: string): string | null {
  const match = /^\s*<!--([\s\S]*?)-->\s*$/.exec(html);
  return match === null ? null : (match[1] ?? "").trim();
}

/** Build one block, with the fields its kind needs and no others. */
function makeBlock(
  kind: BlockKind,
  range: Range,
  variants: readonly string[],
  extra: Partial<Block>,
): Block {
  return {
    kind,
    attributes: emptyAttributes(),
    span: range.span,
    line: range.line,
    endLine: range.endLine,
    variants,
    text: "",
    inlines: [],
    children: [],
    ...extra,
  };
}

/**
 * Walk a run of block tokens into blocks.
 *
 * `variants` is what the enclosing div declared: a block inside a variant div
 * belongs to that variant unless it says otherwise, which is what lets a
 * Section live in one variant alone.
 */
function blocksFrom(
  tokens: readonly Token[],
  from: number,
  to: number,
  context: ParseContext,
  variants: readonly string[],
): Block[] {
  const blocks: Block[] = [];
  let index = from;
  while (index < to) {
    const token = tokens[index];
    if (token === undefined) break;
    switch (token.type) {
      case "heading_open": {
        const inline = tokens[index + 1];
        const close = closeOf(tokens, index, to);
        const [start, end] = mapOf(token, [0, 0]);
        const inlines =
          inline?.type === "inline" ? inlinesFrom(inline.children ?? [], context) : [];
        blocks.push(
          makeBlock("heading", rangeOfLines(context.table, start, end), variants, {
            attributes: attributesOf(token),
            level: Number(token.tag.slice(1)) || 1,
            inlines,
            text: textOf(inlines).trim(),
          }),
        );
        index = close + 1;
        break;
      }
      case "paragraph_open": {
        const inline = tokens[index + 1];
        const close = closeOf(tokens, index, to);
        const [start, end] = mapOf(token, [0, 0]);
        const inlines =
          inline?.type === "inline" ? inlinesFrom(inline.children ?? [], context) : [];
        const range = rangeOfLines(context.table, start, end);
        const only = onlyImage(inlines);
        if (only !== null) {
          blocks.push(
            makeBlock("image", range, variants, {
              attributes: only.attributes,
              inlines,
              text: only.text,
              image: {
                src: only.src ?? "",
                caption: only.text,
                credit: only.title ?? "",
              },
            }),
          );
        } else {
          blocks.push(
            makeBlock("paragraph", range, variants, {
              attributes: attributesOf(token),
              inlines,
              text: textOf(inlines),
            }),
          );
        }
        index = close + 1;
        break;
      }
      case "div_open": {
        const close = closeOf(tokens, index, to);
        const attributes = divAttributes(token);
        const declared = variantsOf(attributes);
        const inherited = declared.length > 0 ? declared : variants;
        const children = blocksFrom(tokens, index + 1, close, context, inherited);
        const [start, end] = mapOf(token, [0, 0]);
        const range = rangeOfLines(context.table, start, end);
        const source = context.table.lines.slice(start, end).join("\n");
        blocks.push(
          makeBlock("div", range, inherited, {
            attributes,
            children,
            text: children.map((child) => child.text).join("\n"),
            ...(attributes.classes.includes("video")
              ? { video: videoFrom(attributes, source) }
              : {}),
          }),
        );
        index = close + 1;
        break;
      }
      case "blockquote_open": {
        const close = closeOf(tokens, index, to);
        const children = blocksFrom(tokens, index + 1, close, context, variants);
        const [start, end] = mapOf(token, [0, 0]);
        blocks.push(
          makeBlock("quote", rangeOfLines(context.table, start, end), variants, {
            attributes: attributesOf(token),
            children,
            text: children.map((child) => child.text).join("\n"),
          }),
        );
        index = close + 1;
        break;
      }
      case "bullet_list_open":
      case "ordered_list_open": {
        const close = closeOf(tokens, index, to);
        const items: ListItem[] = [];
        let cursor = index + 1;
        while (cursor < close) {
          const item = tokens[cursor];
          if (item?.type === "list_item_open") {
            const itemClose = closeOf(tokens, cursor, close);
            items.push({
              blocks: blocksFrom(tokens, cursor + 1, itemClose, context, variants),
            });
            cursor = itemClose + 1;
          } else {
            cursor += 1;
          }
        }
        const [start, end] = mapOf(token, [0, 0]);
        blocks.push(
          makeBlock("list", rangeOfLines(context.table, start, end), variants, {
            attributes: attributesOf(token),
            ordered: token.type === "ordered_list_open",
            items,
            text: items
              .map((item) => item.blocks.map((block) => block.text).join(" "))
              .join("\n"),
          }),
        );
        index = close + 1;
        break;
      }
      case "table_open": {
        const close = closeOf(tokens, index, to);
        const table = tableFrom(tokens, index, close, context);
        const [start, end] = mapOf(token, [0, 0]);
        blocks.push(
          makeBlock("table", rangeOfLines(context.table, start, end), variants, {
            attributes: attributesOf(token),
            table,
            text: [...table.head, ...table.body]
              .map((row) => row.map((cell) => cell.text).join(" | "))
              .join("\n"),
          }),
        );
        index = close + 1;
        break;
      }
      case "footnote_reference_open": {
        const close = closeOf(tokens, index, to);
        const children = blocksFrom(tokens, index + 1, close, context, variants);
        const meta = token.meta as { label?: string } | null;
        const label = meta?.label ?? "";
        const first = children[0];
        const last = children[children.length - 1];
        if (first !== undefined && last !== undefined) {
          context.footnotes[label] = {
            label,
            span: { start: first.span.start, end: last.span.end },
            line: first.line,
            blocks: children,
            inline: false,
          };
        }
        index = close + 1;
        break;
      }
      case "fence":
      case "code_block": {
        const [start, end] = mapOf(token, [0, 0]);
        blocks.push(
          makeBlock("code", rangeOfLines(context.table, start, end), variants, {
            attributes: attributesOf(token),
            info: token.info.trim(),
            text: token.content,
          }),
        );
        index += 1;
        break;
      }
      case "hr": {
        const [start, end] = mapOf(token, [0, 0]);
        blocks.push(
          makeBlock("rule", rangeOfLines(context.table, start, end), variants, {
            attributes: attributesOf(token),
          }),
        );
        index += 1;
        break;
      }
      case "html_block": {
        const [start, end] = mapOf(token, [0, 0]);
        const comment = commentText(token.content);
        blocks.push(
          makeBlock(
            comment === null ? "html" : "comment",
            rangeOfLines(context.table, start, end),
            variants,
            {
              text: token.content.trimEnd(),
              ...(comment === null ? {} : { comment }),
            },
          ),
        );
        index += 1;
        break;
      }
      default:
        index += 1;
        break;
    }
  }
  return fold(blocks);
}

/** The single image a paragraph holds, when that is all it holds. */
function onlyImage(inlines: readonly Inline[]): Inline | null {
  const meaningful = inlines.filter(
    (inline) => !(inline.kind === "break" || (inline.kind === "text" && inline.text.trim() === "")),
  );
  const first = meaningful[0];
  return meaningful.length === 1 && first?.kind === "image" ? first : null;
}

/**
 * The two joins the canon asks for, applied to a finished run of blocks.
 *
 * A heading immediately followed by another heading of the same level, with no
 * blank line between, is one heading: "a title that runs to two lines is one
 * heading". A paragraph beginning `: ` immediately after a table is that
 * table's caption, which is how the canon writes one.
 */
function fold(blocks: readonly Block[]): Block[] {
  const folded: Block[] = [];
  for (const block of blocks) {
    const previous = folded[folded.length - 1];
    if (
      previous !== undefined &&
      previous.kind === "heading" &&
      block.kind === "heading" &&
      previous.level === block.level &&
      block.line === previous.endLine + 1
    ) {
      folded[folded.length - 1] = {
        ...previous,
        text: `${previous.text} ${block.text}`.trim(),
        inlines: [
          ...previous.inlines,
          { kind: "text", text: " ", attributes: emptyAttributes(), children: [] },
          ...block.inlines,
        ],
        span: { start: previous.span.start, end: block.span.end },
        endLine: block.endLine,
      };
      continue;
    }
    if (
      previous !== undefined &&
      previous.kind === "table" &&
      block.kind === "paragraph" &&
      /^:\s/.test(block.text)
    ) {
      folded[folded.length - 1] = {
        ...previous,
        attributes: block.attributes,
        caption: block.text.replace(/^:\s*/, "").trim(),
        span: { start: previous.span.start, end: block.span.end },
        endLine: block.endLine,
      };
      continue;
    }
    folded.push(block);
  }
  return folded;
}

/** The chapter's YAML front matter, when it opens with one. */
function frontMatterOf(table: LineTable): FrontMatter | null {
  if ((table.lines[0] ?? "").trim() !== "---") return null;
  for (let line = 1; line < table.lines.length; line += 1) {
    const text = (table.lines[line] ?? "").trim();
    if (text === "---" || text === "...") {
      return {
        text: table.lines.slice(1, line).join("\n"),
        span: rangeOfLines(table, 0, line + 1).span,
      };
    }
  }
  return null;
}

/**
 * Parse one chapter.
 *
 * The source is never rewritten: front matter is blanked out for markdown-it
 * so that every line number still names the line it names in the file, and
 * every span indexes the file's own bytes.
 */
export function parseChapter(source: string): Chapter {
  const table = lineTable(source);
  const frontMatter = frontMatterOf(table);
  const skipped = frontMatter === null ? 0 : countLines(frontMatter.text) + 2;
  const body =
    skipped === 0
      ? source
      : "\n".repeat(skipped) + table.lines.slice(skipped).join("\n");

  const env: FootnoteEnv = {};
  const tokens = markdown.parse(body, env);
  const context: ParseContext = { table, footnotes: {}, env };
  const blocks = blocksFrom(tokens, 0, tokens.length, context, []);

  return { source, frontMatter, blocks, footnotes: context.footnotes };
}

/** How many lines a run of text holds. */
function countLines(text: string): number {
  return text === "" ? 0 : text.split("\n").length;
}
