/**
 * The document in memory: the shape every rendering is a function of.
 *
 * `05-internals.md` section 2 fixes it. A Chapter holds Blocks; a Block holds
 * its attributes exactly as written, its source span, its variant set, and its
 * inline content as nodes rather than as rendered HTML. Inline content stays a
 * tree because four renderings consume it — the article, the deck, the Typst
 * source, and the annotation anchors — and a string of HTML would decide for
 * three of them.
 *
 * Nothing here parses or renders: `parse.ts` builds this shape, `outline.ts`,
 * `canon.ts` and every renderer read it. It is the one seam between them, so
 * it imports nothing.
 */

/** A node's identifier, classes, and key-value pairs, exactly as written. */
export interface Attributes {
  readonly id: string | null;
  readonly classes: readonly string[];
  readonly pairs: Readonly<Record<string, string>>;
}

/**
 * A half-open range of UTF-8 byte offsets into the chapter file.
 *
 * Bytes, not characters: the shell measures the same file in bytes, and an
 * annotation anchor that means one thing in Rust and another in the web view
 * is worse than no anchor at all.
 */
export interface Span {
  readonly start: number;
  readonly end: number;
}

/** The kinds of block the canon can produce. */
export type BlockKind =
  | "heading"
  | "paragraph"
  | "image"
  | "list"
  | "table"
  | "quote"
  | "code"
  | "div"
  | "rule"
  | "comment"
  | "html";

/** The kinds of inline node the canon can produce. */
export type InlineKind =
  | "text"
  | "emphasis"
  | "strong"
  | "strike"
  | "code"
  | "link"
  | "image"
  | "span"
  | "citation"
  | "footnote-reference"
  | "footnote-inline"
  | "break"
  | "html";

/**
 * One inline node.
 *
 * `text` is the node's plain text — its own for a leaf, its children's joined
 * for a container — which is what an annotation quote and a slide headline are
 * made of. Inline nodes carry no span in this phase: markdown-it reports no
 * position for them, and the fidelity harness that needs one arrives with the
 * serialiser.
 */
export interface Inline {
  readonly kind: InlineKind;
  readonly text: string;
  readonly attributes: Attributes;
  readonly children: readonly Inline[];
  /** `link` only: the target as written. */
  readonly href?: string;
  /** `link` and `image`: the title attribute, which for an image is the credit. */
  readonly title?: string;
  /** `image` only: the reference as written. */
  readonly src?: string;
  /** `citation` only: every key in the citation, in source order. */
  readonly keys?: readonly string[];
  /** `citation` only: what follows the last key, such as `p. 4`. */
  readonly locator?: string;
  /** `footnote-reference` only: the label between `[^` and `]`. */
  readonly label?: string;
  /** `span` only: the variant names the span belongs to, empty for all. */
  readonly variants?: readonly string[];
}

/** An image reference, with the caption and credit the canon reads from it. */
export interface ImageReference {
  readonly src: string;
  /** The alt text, which the canon calls the caption. */
  readonly caption: string;
  /** The title attribute, which the canon calls the credit. */
  readonly credit: string;
}

/** The roles a `.video` block's sources may name, in fallback order. */
export type VideoRole = "site" | "gated" | "local" | "remote";

/**
 * The variant a `.variant` div or span with an empty `variant=` belongs to.
 *
 * The palette inserts `variant=""` for the author to name; until they do, the
 * block is marked but unresolved. It belongs to this name, which no author can
 * write, so it matches no variant and is rendered into none — rather than
 * reading as the empty list, which means "every variant" and would publish
 * text nobody had finished addressing.
 */
export const UNRESOLVED_VARIANT = "\u0000unresolved";

/** The label space inline footnotes live in, apart from the author's own. */
export const INLINE_NOTE_PREFIX = "\u0000inline:";

/** One line of a `.video` block's source list. */
export interface VideoSource {
  /** The role as written, whether or not the canon knows it. */
  readonly role: string;
  /** The reference as written: a path, an `asset:` id, or a URL. */
  readonly reference: string;
  /** Whether `role` is one of the four the canon names. */
  readonly known: boolean;
}

/** One cell of a pipe table. */
export interface TableCell {
  readonly inlines: readonly Inline[];
  readonly text: string;
  readonly align: "left" | "center" | "right" | null;
  readonly header: boolean;
}

/** A pipe table's rows, head and body kept apart. */
export interface TableContent {
  readonly head: readonly (readonly TableCell[])[];
  readonly body: readonly (readonly TableCell[])[];
}

/** One item of a list, which may hold blocks of its own. */
export interface ListItem {
  readonly blocks: readonly Block[];
}

/** A `.video` block's poster, caption, and sources. */
export interface Video {
  readonly poster: string | null;
  readonly caption: string | null;
  readonly sources: readonly VideoSource[];
}

/**
 * One block.
 *
 * One shape with a facet per kind, rather than a union: every consumer walks
 * the same list and reads what its rendering needs, and a kind it does not
 * know still carries its attributes, its span, and its text.
 */
export interface Block {
  readonly kind: BlockKind;
  readonly attributes: Attributes;
  readonly span: Span;
  /** The one-based line the block starts on, which is what a cursor uses. */
  readonly line: number;
  /** The one-based line the block's own text ends on, blank lines excluded. */
  readonly endLine: number;
  /** The variants the block belongs to. Empty means every variant. */
  readonly variants: readonly string[];
  /** The plain text of the block's inline content. */
  readonly text: string;
  readonly inlines: readonly Inline[];
  /** A div's contents; empty for every other kind. */
  readonly children: readonly Block[];
  /** `heading` only: 1 to 6. */
  readonly level?: number;
  /** `image` only. */
  readonly image?: ImageReference;
  /** `div` only, when it carries the class `video`. */
  readonly video?: Video;
  /** `table` only: its rows. */
  readonly table?: TableContent;
  /** `list` only: its items. */
  readonly items?: readonly ListItem[];
  /** `table` only: the text of a `: Caption` line following the table. */
  readonly caption?: string;
  /** `code` only: the fence's info string. */
  readonly info?: string;
  /** `comment` only: what sits between `<!--` and `-->`, trimmed. */
  readonly comment?: string;
  /** `list` only. */
  readonly ordered?: boolean;
}

/** A chapter's YAML front matter, kept as written. */
export interface FrontMatter {
  readonly text: string;
  readonly span: Span;
}

/** A footnote definition, by label. */
export interface FootnoteDefinition {
  readonly label: string;
  readonly span: Span;
  readonly line: number;
  readonly blocks: readonly Block[];
  /** Whether it was written inline, as `^[a note]`. */
  readonly inline: boolean;
}

/** One parsed chapter. */
export interface Chapter {
  /** The file's text, unchanged. Every span indexes its UTF-8 bytes. */
  readonly source: string;
  readonly frontMatter: FrontMatter | null;
  readonly blocks: readonly Block[];
  /** Definitions by label; an inline note's label is the number it was given. */
  readonly footnotes: Readonly<Record<string, FootnoteDefinition>>;
}

/** Attributes with nothing set. */
export function emptyAttributes(): Attributes {
  return { id: null, classes: [], pairs: {} };
}

/** Whether a node carries a class. */
export function hasClass(
  node: { readonly attributes: Attributes },
  name: string,
): boolean {
  return node.attributes.classes.includes(name);
}

/**
 * Read a `{#id .class key="value"}` attribute block.
 *
 * The text may or may not carry its braces. Values may be quoted with single
 * or double quotes, or left bare up to the next space. Anything unparseable is
 * skipped rather than guessed at, because attributes are the author's words.
 */
export function parseAttributes(text: string): Attributes {
  const inner = text.trim().replace(/^\{/, "").replace(/\}$/, "").trim();
  let id: string | null = null;
  const classes: string[] = [];
  const pairs: Record<string, string> = {};
  const token =
    /([.#])([^\s"'=]+)|([A-Za-z_:][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s}]*))/g;
  let match: RegExpExecArray | null = token.exec(inner);
  while (match !== null) {
    const [, marker, word, key, , doubleQuoted, singleQuoted, bare] = match;
    if (marker === "#" && word !== undefined) {
      id = word;
    } else if (marker === "." && word !== undefined) {
      classes.push(word);
    } else if (key !== undefined) {
      pairs[key] = doubleQuoted ?? singleQuoted ?? bare ?? "";
    }
    match = token.exec(inner);
  }
  return { id, classes, pairs };
}

/** The UTF-8 encoder every byte measurement goes through. */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** How many UTF-8 bytes a string takes. */
export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/**
 * The source a span names, decoded back to a string.
 *
 * Convenience, for one span. It encodes the whole source every time it is
 * called, so a caller taking many spans out of one chapter uses
 * [`sliceBytes`], which encodes once.
 */
export function byteSlice(source: string, span: Span): string {
  return decoder.decode(encoder.encode(source).slice(span.start, span.end));
}

/**
 * A slicer bound to one source, which encodes it once.
 *
 * Taking every block's span out of a ten-thousand-line chapter with
 * [`byteSlice`] costs an encode per block — thirteen times the cost of the
 * parse itself. This encodes the chapter once and slices the same bytes.
 */
export function sliceBytes(source: string): (span: Span) => string {
  const bytes = encoder.encode(source);
  return (span) => decoder.decode(bytes.slice(span.start, span.end));
}

/**
 * Every block in source order, descending into everything that holds blocks.
 *
 * A div's children, a list's items, and a footnote's body all hold blocks, and
 * a walk that stopped at children would miss them. That matters most for the
 * variant filter: a `.variant` div inside a list item would otherwise never be
 * seen, and text meant for one audience would go out to every audience.
 */
export function* walkBlocks(
  blocks: readonly Block[],
): Generator<Block, void, undefined> {
  for (const block of blocks) {
    yield block;
    yield* walkBlocks(block.children);
    for (const item of block.items ?? []) yield* walkBlocks(item.blocks);
  }
}

/**
 * Every block of a chapter, its footnote definitions included.
 *
 * The footnotes are not in the block list — they are a map of their own — so a
 * consumer that must see everything a chapter holds walks this rather than
 * `chapter.blocks`.
 */
export function* walkChapterBlocks(
  chapter: Chapter,
): Generator<Block, void, undefined> {
  yield* walkBlocks(chapter.blocks);
  for (const definition of Object.values(chapter.footnotes)) {
    yield* walkBlocks(definition.blocks);
  }
}

/** Every inline node in source order, descending into containers. */
export function* walkInlines(
  inlines: readonly Inline[],
): Generator<Inline, void, undefined> {
  for (const inline of inlines) {
    yield inline;
    yield* walkInlines(inline.children);
  }
}
