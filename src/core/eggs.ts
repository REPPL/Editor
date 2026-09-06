/**
 * Cross-referencing the two constructs map #12 hides in the text: the
 * once-only opening quotation and an easter egg's marker and block.
 *
 * spc-2609061318159422 is the design record. Nothing here renders — that is
 * `render/article.ts`'s job, and `render/html.ts`'s for the marker itself —
 * and nothing here is a rendering concern at all: `sidebar.ts`'s badge reads
 * the same analysis the renderer does, through [`unresolvedEggsIn`], which is
 * the one reason this sits beside `bibliography.ts`'s own
 * `unresolvedCitationKeysIn` rather than inside a `render/` module.
 *
 * An easter egg's marker and its block name each other by an id, "elsewhere
 * in the same chapter" (`05-internals.md` section 3): matching is chapter
 * scoped, never document wide, because two chapters may each open a
 * `#lantern` of their own. The opening quotation has no id at all — it is
 * "the first block of the first chapter", a position, not a name — so
 * [`validOpeningBlock`] answers a position question and [`analyseEggs`]
 * answers a matching one.
 */

import { hasClass, walkChapterBlocks, walkInlines, type Block, type Chapter } from "./tree";

/** One easter egg whose marker and block both named each other. */
export interface EggMatch {
  readonly id: string;
  /** The `.egg` block this id's marker points at. */
  readonly block: Block;
  /**
   * What the marker and the tray both show: the block's own `label`
   * attribute, so a marker moved into the tray still knows its own glyph
   * without the tray having to remember where in the paragraph it came from.
   * Falls back to the id itself, which is never empty, rather than to nothing
   * a reader would see as a blank button.
   */
  readonly label: string;
}

/** What one chapter's easter eggs resolve to. */
export interface EggAnalysis {
  /** Every id a marker and a block in this chapter both name, by id. */
  readonly matched: ReadonlyMap<string, EggMatch>;
  /** A marker's id with no block answering it, first-occurrence order. */
  readonly orphanMarkers: readonly string[];
  /** A block's id with no marker naming it, document order. */
  readonly orphanBlocks: readonly string[];
}

/** Whether a block is an `.egg` block, carrying an id worth matching. */
function isEggBlock(block: Block): boolean {
  return block.kind === "div" && hasClass(block, "egg") && block.attributes.id !== null;
}

/** Every `.egg` block in a chapter, by id — the first one wins a duplicate. */
function eggBlocksById(chapter: Chapter): Map<string, Block> {
  const byId = new Map<string, Block>();
  for (const block of walkChapterBlocks(chapter)) {
    if (!isEggBlock(block)) continue;
    const id = block.attributes.id;
    if (id !== null && !byId.has(id)) byId.set(id, block);
  }
  return byId;
}

/** Every `.egg` marker's id in a chapter, first-occurrence order. */
function eggMarkerIds(chapter: Chapter): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const block of walkChapterBlocks(chapter)) {
    for (const node of walkInlines(block.inlines)) {
      if (node.kind !== "span" || !hasClass(node, "egg")) continue;
      const id = node.attributes.pairs["egg"] ?? "";
      if (id === "" || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Match every marker and block in one chapter by id.
 *
 * "A marker with no block renders as ordinary text; a block no marker points
 * at is left out of every rendering" (`05-internals.md` section 3) — both are
 * authoring mistakes rather than reader-facing features, and both are
 * reported here rather than guessed at.
 */
export function analyseEggs(chapter: Chapter): EggAnalysis {
  const blocksById = eggBlocksById(chapter);
  const matched = new Map<string, EggMatch>();
  const orphanMarkers: string[] = [];
  for (const id of eggMarkerIds(chapter)) {
    const block = blocksById.get(id);
    if (block === undefined) {
      orphanMarkers.push(id);
      continue;
    }
    matched.set(id, { id, block, label: block.attributes.pairs["label"] ?? id });
  }
  const orphanBlocks = [...blocksById.keys()].filter((id) => !matched.has(id));
  return { matched, orphanMarkers, orphanBlocks };
}

/**
 * The `.opening` block a reader is shown, or null where this chapter has
 * none.
 *
 * "The `.opening` block belongs to the first block of the first chapter"
 * (`05-internals.md` section 3): a document has one opening, not one per
 * chapter, and it is a position — `chapter.blocks[0]` of the document's own
 * first chapter — never an id a later block could claim instead.
 */
export function validOpeningBlock(chapter: Chapter, isFirstChapter: boolean): Block | null {
  if (!isFirstChapter) return null;
  const first = chapter.blocks[0];
  if (first === undefined || first.kind !== "div" || !hasClass(first, "opening")) return null;
  return first;
}

/** Every `.opening` block in a chapter, wherever it sits. */
function openingBlocksIn(chapter: Chapter): Block[] {
  return [...walkChapterBlocks(chapter)].filter(
    (block) => block.kind === "div" && hasClass(block, "opening"),
  );
}

/**
 * How many `.opening` blocks in this chapter are not the one valid opening.
 *
 * A chapter with no `.opening` block at all, and a first chapter whose first
 * block is a valid opening, both answer 0.
 */
export function misplacedOpeningsIn(chapter: Chapter, isFirstChapter: boolean): number {
  const valid = validOpeningBlock(chapter, isFirstChapter);
  return openingBlocksIn(chapter).filter((block) => block !== valid).length;
}

/**
 * Everything about this chapter's hidden constructs Alice should fix, for
 * the sidebar to list beside it the way it already lists an unresolved
 * citation key (itd-2609051335502171).
 */
export function unresolvedEggsIn(chapter: Chapter, isFirstChapter: boolean): readonly string[] {
  const analysis = analyseEggs(chapter);
  const items: string[] = [];
  for (const id of analysis.orphanMarkers) items.push(`${id} (marker with no matching block)`);
  for (const id of analysis.orphanBlocks) items.push(`${id} (block with no marker)`);
  for (let count = misplacedOpeningsIn(chapter, isFirstChapter); count > 0; count -= 1) {
    items.push("opening (not the first block of the first chapter)");
  }
  return items;
}
