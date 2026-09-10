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
  INLINE_NOTE_PREFIX,
  UNRESOLVED_VARIANT,
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
  type VideoRole,
  type VideoSource,
} from "./tree";


/**
 * The roles a `.video` source line may name, in the order they are tried.
 *
 * The order is the brief's — site, then gated, then local, then the plain
 * public address — and the list is typed as [`VideoRole`], so a role added to
 * the tree's own type and not to this list is a compile error rather than a
 * silently unread source line.
 */
const VIDEO_ROLES: readonly VideoRole[] = ["site", "gated", "local", "remote"];

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

/**
 * Measure every line of the source once.
 *
 * A line ends at `\r\n`, at a lone `\r`, or at `\n`, because markdown-it
 * breaks on all three. Counting only `\n` would put every span after a stray
 * carriage return one line out, and a span that names the wrong line is worse
 * than no span at all.
 */
function lineTable(source: string): LineTable {
  const lines: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  let index = 0;
  for (;;) {
    let cursor = index;
    while (
      cursor < source.length &&
      source[cursor] !== "\n" &&
      source[cursor] !== "\r"
    ) {
      cursor += 1;
    }
    lines.push(source.slice(index, cursor));
    starts.push(offset);
    offset += bytesBetween(source, index, cursor);
    ends.push(offset);
    if (cursor >= source.length) break;
    // The break itself is the file's, not a line's, and every form of it is
    // ASCII: one byte per character.
    let after = cursor + 1;
    if (source[cursor] === "\r" && source[after] === "\n") after += 1;
    offset += after - cursor;
    index = after;
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

/**
 * The variant names an attribute set declares.
 *
 * Three cases, and they are not the same thing. No `.variant` class at all is
 * "every variant", and reads as the empty list. `.variant variant="talk"` is
 * that one variant. `.variant variant=""` — the form the palette inserts, with
 * the name still to be typed — is marked but unresolved: it belongs to no
 * variant yet, and rendering it into every variant would publish text the
 * author had not finished addressing. That case reads as [`UNRESOLVED_VARIANT`],
 * a name no author can write, so it matches nothing.
 */
function variantsOf(attributes: Attributes): string[] {
  if (!attributes.classes.includes("variant")) return [];
  const named = (attributes.pairs["variant"] ?? "").split(/\s+/).filter(Boolean);
  return named.length === 0 ? [UNRESOLVED_VARIANT] : named;
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
        const id = meta?.id ?? -1;
        const entry = context.env.footnotes?.list?.[id];
        const children = inlinesFrom(entry?.tokens ?? [], context);
        // An inline note has no label the author wrote, so markdown-it's index
        // is all there is. It is given a label space of its own, because `1`
        // is also a perfectly ordinary label for an author's own `[^1]`, and
        // two different notes must never answer to one name.
        push({
          kind: "footnote-inline",
          text: textOf(children),
          attributes: emptyAttributes(),
          children,
          label: `${INLINE_NOTE_PREFIX}${String(id)}`,
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
      known: (VIDEO_ROLES as readonly string[]).includes(role),
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
        // A definition with nothing in it is still a definition: the label is
        // spoken for, and a reference to it is resolved rather than dangling.
        // Its span is the definition line the token names.
        const first = children[0];
        const last = children[children.length - 1];
        const [openLine, closeLine] = mapOf(token, [0, 0]);
        const empty = rangeOfLines(context.table, openLine, closeLine);
        context.footnotes[label] =
          first === undefined || last === undefined
            ? {
                label,
                span: empty.span,
                line: empty.line,
                blocks: [],
                inline: false,
              }
            : {
                label,
                span: { start: first.span.start, end: last.span.end },
                line: first.line,
                blocks: children,
                inline: false,
              };
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

/** Two attribute sets, the later one winning where they name the same thing. */
function mergeAttributes(first: Attributes, second: Attributes): Attributes {
  return {
    id: second.id ?? first.id,
    classes: [...new Set([...first.classes, ...second.classes])],
    pairs: { ...first.pairs, ...second.pairs },
  };
}

/**
 * The two joins the canon asks for, applied to a finished run of blocks.
 *
 * A **chapter title** that runs to two lines is one heading: a level-one
 * heading immediately followed by another level-one heading, with no blank
 * line between, folds into one. Only level one. The brief writes the rule for
 * a title, and `## One` above `## Two` is two Sections, not one Section named
 * "One Two" — folding those would silently lose a slide.
 *
 * A paragraph beginning `: ` immediately after a table is that table's
 * caption, which is how the canon writes one. **One** caption: a second `: `
 * paragraph after the same table is a paragraph, because a table has one
 * caption and the second would otherwise quietly replace the first.
 *
 * Both folds keep the attributes of both parts, the second line's winning
 * where the two name the same class or key, so `## Interlude\n## continued
 * {.divider}` is a divider.
 */
function fold(blocks: readonly Block[]): Block[] {
  const folded: Block[] = [];
  /** Which tables already carry a caption, by their place in `folded`. */
  const captioned = new Set<number>();
  for (const block of blocks) {
    const at = folded.length - 1;
    const previous = folded[at];
    if (
      previous !== undefined &&
      previous.kind === "heading" &&
      block.kind === "heading" &&
      previous.level === 1 &&
      block.level === 1 &&
      block.line === previous.endLine + 1
    ) {
      folded[at] = {
        ...previous,
        attributes: mergeAttributes(previous.attributes, block.attributes),
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
      !captioned.has(at) &&
      block.kind === "paragraph" &&
      /^:\s/.test(block.text)
    ) {
      captioned.add(at);
      folded[at] = {
        ...previous,
        attributes: mergeAttributes(previous.attributes, block.attributes),
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

/** A YAML mapping key, which is what a metadata block's first line must be. */
const YAML_KEY = /^(?:%|[^\s#][^:]*:(?:\s|$))/;

/**
 * The chapter's YAML front matter, when it opens with one — Pandoc's rule.
 *
 * Pandoc reads a metadata block as `---` on the first line, a YAML object, and
 * `---` or `...` on a line of its own; **the opening `---` may not be followed
 * by a blank line**. That last clause is the one that matters here, because a
 * chapter may open with a slide split, which is also `---`, and the canon
 * writes a split with a blank line after it. Without the rule, a chapter that
 * opens with a split and splits again later loses everything between the two:
 * the first slide is read as metadata and disappears.
 *
 * One tightening beyond Pandoc: the first line inside must look like a YAML
 * mapping key or a directive. Pandoc would read `---\n# Title\n---`
 * as metadata and then fail on it as YAML; a chapter is worth more than a
 * failure, so it is read as the Markdown it plainly is.
 */
function frontMatterOf(table: LineTable): FrontMatter | null {
  if ((table.lines[0] ?? "").trim() !== "---") return null;
  const opening = (table.lines[1] ?? "").trim();
  if (opening === "") return null;
  if (opening === "---" || opening === "...") return null;
  if (!YAML_KEY.test(opening)) return null;
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
