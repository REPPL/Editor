/**
 * The outline the sidebar draws, derived from the tree.
 *
 * Five levels: Part, Chapter, Section, Sub-section, Sub-sub-section. The first
 * two are folders and files, and the shell's walk reports them; the last three
 * are heading levels two, three and four inside one chapter, and they are what
 * this module derives. A chapter's own level-one heading is its title, which is
 * the label the sidebar shows for the file.
 *
 * There is one parse. The outline is a function of the tree `parse.ts` builds,
 * not a second, lighter read of the same file: a sidebar and a deck that
 * disagreed about what a heading is would be two answers to one question.
 */

import { walkBlocks, type Block, type Chapter } from "./tree";

/** A mark beside a node. Nothing computes one in this phase. */
export interface Badge {
  readonly kind: "variant" | "assets" | "unresolved";
  readonly label: string;
  readonly count?: number;
}

/** What a heading level below the chapter title is called. */
export type OutlineKind = "section" | "subsection" | "subsubsection";

/** One heading in the outline. */
export interface OutlineNode {
  /**
   * The heading path, slugified and joined by slashes, unique within the
   * chapter. It survives a reload that renumbers files, so the sidebar's
   * expansion state does too, and it is the path shape an annotation anchor
   * uses.
   */
  readonly id: string;
  readonly kind: OutlineKind;
  /** The heading's text with its attribute block gone. */
  readonly label: string;
  /** The heading level: 2, 3 or 4. */
  readonly level: number;
  /** The heading's one-based line in the chapter file. */
  readonly line: number;
  /** The variants the heading belongs to. Empty means every variant. */
  readonly variants: readonly string[];
  readonly children: readonly OutlineNode[];
  readonly badges: readonly Badge[];
}

/** One chapter's outline. */
export interface Outline {
  /** The first level-one heading's text, or null when the chapter has none. */
  readonly title: string | null;
  /** The line the title sits on, one-based, or null with no title. */
  readonly titleLine: number | null;
  readonly nodes: readonly OutlineNode[];
  readonly badges: readonly Badge[];
}

/** The heading levels the outline draws, below the chapter's own title. */
const FIRST_LEVEL = 2;
const LAST_LEVEL = 4;

const KIND_BY_LEVEL: Readonly<Record<number, OutlineKind>> = {
  2: "section",
  3: "subsection",
  4: "subsubsection",
};

/**
 * A heading's text as one path segment.
 *
 * Lower case, runs of anything else collapsed to one hyphen. A heading of
 * nothing but punctuation still needs a segment, so it gets `section`.
 */
export function slugify(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "section" : slug;
}

/** A node being built, with the path that gives it its id. */
interface Building {
  readonly node: OutlineNode;
  readonly children: OutlineNode[];
  readonly level: number;
}

/**
 * Derive one chapter's outline.
 *
 * Headings inside a fenced div count: a variant block may hold a Section, and
 * leaving it out would hide from the sidebar the very thing the badge is meant
 * to mark. Headings inside a fenced code block do not, because markdown-it
 * never made them headings.
 */
export function outlineOf(chapter: Chapter): Outline {
  const nodes: OutlineNode[] = [];
  const stack: Building[] = [];
  const taken = new Set<string>();
  let title: string | null = null;
  let titleLine: number | null = null;

  for (const block of walkBlocks(chapter.blocks)) {
    if (block.kind !== "heading") continue;
    const level = block.level ?? 1;
    if (level === 1) {
      if (title === null) {
        title = block.text;
        titleLine = block.line;
      }
      continue;
    }
    if (level < FIRST_LEVEL || level > LAST_LEVEL) continue;

    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    const path = [...stack.map((entry) => slugify(entry.node.label)), slugify(block.text)];
    const children: OutlineNode[] = [];
    const node: OutlineNode = {
      id: unique(path.join("/"), taken),
      kind: KIND_BY_LEVEL[level] ?? "section",
      label: block.text,
      level,
      line: block.line,
      variants: block.variants,
      children,
      badges: [],
    };
    if (parent === undefined) nodes.push(node);
    else parent.children.push(node);
    stack.push({ node, children, level });
  }

  return { title, titleLine, nodes, badges: [] };
}

/** The chapter's title, or the fallback the caller offers. */
export function chapterLabel(chapter: Chapter, fallback: string): string {
  const title = outlineOf(chapter).title;
  return title === null || title === "" ? fallback : title;
}

/** Every node of an outline in source order. */
export function* walkOutline(
  nodes: readonly OutlineNode[],
): Generator<OutlineNode, void, undefined> {
  for (const node of nodes) {
    yield node;
    yield* walkOutline(node.children);
  }
}

/** The heading block a node names, for a caller that has both. */
export function blockOf(chapter: Chapter, node: OutlineNode): Block | undefined {
  for (const block of walkBlocks(chapter.blocks)) {
    if (block.kind === "heading" && block.line === node.line) return block;
  }
  return undefined;
}

/** Keep an id unique within one chapter without changing what it means. */
function unique(id: string, taken: Set<string>): string {
  if (!taken.has(id)) {
    taken.add(id);
    return id;
  }
  let counter = 2;
  while (taken.has(`${id}-${counter}`)) counter += 1;
  const next = `${id}-${counter}`;
  taken.add(next);
  return next;
}
