/**
 * The window tree: what the editing surface is divided into.
 *
 * One editing window used to be the whole of the surface. It is now a leaf of
 * a tree inside the one frame, the shape `C-x 2` and `C-x 3` build and `C-x 0`
 * and `C-x 1` take apart (`adr-2609091832455881`). This module is that tree as
 * data and nothing else: it holds no DOM, imports nothing from CodeMirror, and
 * every operation returns a new tree rather than changing one.
 *
 * It holds ids and not windows. A tree is rebuilt on every operation while a
 * window's view, its element and its cursor memory have to survive being
 * re-shaped around, so those live in a map the application holds beside the
 * tree and this module never sees them.
 *
 * Splits are binary and are never flattened into their parent. `C-x 3` inside
 * a column therefore nests rather than adding a third column, which is Emacs's
 * own behaviour: only the window being divided changes size, and its
 * neighbours are left exactly where Alice put them. `children` is nonetheless
 * two-or-more, because closing one child of a three-child split has to have a
 * shape; what `C-x 2` and `C-x 3` produce is always two.
 */

/** One editing window's identity, opaque and stable for the window's life. */
export type WindowId = string & { readonly __window: unique symbol };

/** A window tree: a leaf that shows a chapter, or a split of two or more. */
export type WindowTree = WindowLeaf | WindowSplit;

export interface WindowLeaf {
  readonly kind: "leaf";
  readonly id: WindowId;
}

export interface WindowSplit {
  readonly kind: "split";
  /** Rows for `C-x 2`, columns for `C-x 3`. */
  readonly direction: "rows" | "columns";
  /** Two or more, in the order they are drawn. */
  readonly children: readonly WindowTree[];
  /** Each child's share of the split's main axis, summing to one. */
  readonly shares: readonly number[];
}

/** What one layout chord did, or did not do. */
export interface TreeChange {
  readonly tree: WindowTree;
  /** Windows that no longer exist, for the caller to tear down. */
  readonly closed: readonly WindowId[];
  /** The window that has just come into being, if one did. */
  readonly opened: WindowId | null;
  /** What the chord could not do, or null when it did it. */
  readonly refusal: string | null;
}

/** The narrowest an editing window may be, in CSS pixels. */
export const MIN_WINDOW_WIDTH = 240;
/** The shortest it may be. */
export const MIN_WINDOW_HEIGHT = 160;
/** The divider between two windows. */
export const DIVIDER_PX = 6;

/**
 * How much of a division one press of a resize chord moves.
 *
 * A share and not a pixel count, because the shares *are* the model: nothing
 * has to be measured to take a step, and a step is the same fraction of
 * whatever division it is applied to, so the chord feels the same in a
 * full-width split and in a nested quarter. Twenty presses traverse a
 * division, which is the density of Emacs's own chord held down. Emacs's unit
 * is one text column and its multiplier is `C-u`, which no row in this
 * application honours, so a faithful-looking unit of one column would make
 * the chord useless: one twentieth is honest about being Editor's own choice.
 */
export const RESIZE_STEP = 0.05;

/**
 * The smallest share difference worth calling a difference.
 *
 * Shares are added and subtracted repeatedly, so a child sitting exactly on
 * its floor reads as a hair above it in binary — `0.5 - 0.05 × 4` is
 * `0.30000000000000004`. Without this, the press that has nothing left to give
 * would report a success and move a share by a quadrillionth of a division.
 */
const SHARE_EPSILON = 1e-6;

/** Every leaf, depth-first, in the order the grid draws them. */
export function leafIds(tree: WindowTree): readonly WindowId[] {
  if (tree.kind === "leaf") return [tree.id];
  const found: WindowId[] = [];
  for (const child of tree.children) found.push(...leafIds(child));
  return found;
}

/** Whether a window is still in the tree. */
export function hasLeaf(tree: WindowTree, at: WindowId): boolean {
  return leafIds(tree).includes(at);
}

/** Equal shares for a split of `count` children. */
function equalShares(count: number): number[] {
  return Array.from({ length: count }, () => 1 / count);
}

/**
 * Replace one leaf with a split of itself and a fresh sibling.
 *
 * `at` keeps its id, and therefore its view, its state, its caret and its
 * remembered positions: nothing happens to the window Alice is in except that
 * a sibling appears beside it. That is the whole of why "the keyboard stays in
 * the window she was in, and the caret has not moved" needs no code of its
 * own. `mint` is injected so this module needs no counter and a test can
 * supply predictable ids.
 */
export function splitWindow(
  tree: WindowTree,
  at: WindowId,
  direction: "rows" | "columns",
  mint: () => WindowId,
): TreeChange {
  if (!hasLeaf(tree, at)) {
    return { tree, closed: [], opened: null, refusal: "No such window" };
  }
  const fresh = mint();
  function divide(node: WindowTree): WindowTree {
    if (node.kind === "leaf") {
      if (node.id !== at) return node;
      return {
        kind: "split",
        direction,
        children: [
          { kind: "leaf", id: at },
          { kind: "leaf", id: fresh },
        ],
        shares: equalShares(2),
      };
    }
    return { ...node, children: node.children.map(divide) };
  }
  return { tree: divide(tree), closed: [], opened: fresh, refusal: null };
}

/**
 * The shares of a split one child has just left, renormalised.
 *
 * The departing child's share goes to its siblings in proportion to theirs,
 * which is "its space goes to the rest". Siblings that between them hold
 * nothing share the division equally instead, because proportion has no
 * meaning there.
 */
function withoutShare(
  shares: readonly number[],
  removed: number,
): readonly number[] {
  const rest = shares.filter((_, index) => index !== removed);
  const total = rest.reduce((sum, share) => sum + share, 0);
  if (total <= 0) return equalShares(rest.length);
  return rest.map((share) => share / total);
}

/**
 * Take one leaf out of a subtree.
 *
 * `undefined` means the leaf is not in here; `null` means this node was the
 * leaf and is gone. A split left with one child is replaced by that child, so
 * the tree carries no degenerate node whose share nothing divides.
 */
function withoutLeaf(
  node: WindowTree,
  at: WindowId,
): WindowTree | null | undefined {
  if (node.kind === "leaf") return node.id === at ? null : undefined;
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (child === undefined) continue;
    const replaced = withoutLeaf(child, at);
    if (replaced === undefined) continue;
    if (replaced === null) {
      const children = node.children.filter((_, other) => other !== index);
      const only = children[0];
      if (children.length === 1 && only !== undefined) return only;
      return { ...node, children, shares: withoutShare(node.shares, index) };
    }
    return {
      ...node,
      children: node.children.map((other, where) =>
        where === index ? replaced : other,
      ),
    };
  }
  return undefined;
}

/** `C-x 0`: close one window and give its room to the rest. */
export function closeWindow(tree: WindowTree, at: WindowId): TreeChange {
  if (tree.kind === "leaf") {
    return {
      tree,
      closed: [],
      opened: null,
      refusal:
        tree.id === at ? "This is the only window" : "No such window",
    };
  }
  const next = withoutLeaf(tree, at);
  if (next === undefined || next === null) {
    return { tree, closed: [], opened: null, refusal: "No such window" };
  }
  return { tree: next, closed: [at], opened: null, refusal: null };
}

/**
 * The window that receives the space of the one about to close.
 *
 * Where the keyboard goes when `C-x 0` closes the window holding it, and Emacs's
 * own answer: the space goes to the sibling side of the division the closing
 * window sits in, so that is where the keyboard follows it. Taking the first
 * leaf of the whole tree instead put the keyboard across the frame from the
 * window Alice closed, while both the how-to page and the intent's ninth
 * criterion promise a neighbour (`iss-2609120527458704`).
 *
 * The heir is the next child of the closing window's own split, and the
 * previous one when it is that split's last child — the same
 * "next, or the previous when there is no next" rule `resizeTarget` follows, so
 * the two chords cannot disagree about which side of a window its neighbour is
 * on. Where that child is itself a split, the leaf nearest the closing window
 * is taken: the first in reading order when the heir follows it, the last when
 * the heir precedes it. Null for a lone window and for a window that is not in
 * the tree, which are the two cases where nothing is closed either.
 *
 * Splits of three or more children divide the space between all of them rather
 * than handing it to one (`withoutShare`), so "received the space" names a side
 * and not a sole beneficiary there. The adjacent window is still the honest
 * answer, and it is the one the promise is written about.
 */
export function heirOf(tree: WindowTree, at: WindowId): WindowId | null {
  const descent = descendTo(tree, at);
  if (descent === null) return null;
  const parent = descent.nodes[descent.nodes.length - 2];
  const branch = descent.indices[descent.indices.length - 1];
  if (parent === undefined || branch === undefined) return null;
  if (parent.kind !== "split") return null;
  const next = branch + 1 < parent.children.length ? branch + 1 : branch - 1;
  const heir = parent.children[next];
  if (next < 0 || heir === undefined) return null;
  const leaves = leafIds(heir);
  const nearest = next > branch ? leaves[0] : leaves[leaves.length - 1];
  return nearest ?? null;
}

/** `C-x 1`: keep one window and close every other. */
export function closeOtherWindows(
  tree: WindowTree,
  keep: WindowId,
): TreeChange {
  if (!hasLeaf(tree, keep)) {
    return { tree, closed: [], opened: null, refusal: "No such window" };
  }
  const closed = leafIds(tree).filter((id) => id !== keep);
  return {
    tree: { kind: "leaf", id: keep },
    closed,
    opened: null,
    refusal: null,
  };
}

/**
 * Write new shares into one split, addressed by its path from the root.
 *
 * The one place shares are written. Both routes to a size end here — the
 * pointer drag on `pointerup` and each of the three resize chords — so there
 * is one floor they respect and they cannot disagree about it. A path or a
 * share count that does not fit the tree leaves the tree alone rather than
 * building a split whose shares do not match its children.
 */
export function resize(
  tree: WindowTree,
  split: readonly number[],
  shares: readonly number[],
): WindowTree {
  if (split.length === 0) {
    if (tree.kind !== "split") return tree;
    if (shares.length !== tree.children.length) return tree;
    return { ...tree, shares: [...shares] };
  }
  if (tree.kind !== "split") return tree;
  const [index, ...rest] = split;
  if (index === undefined) return tree;
  const child = tree.children[index];
  if (child === undefined) return tree;
  const replaced = resize(child, rest, shares);
  if (replaced === child) return tree;
  return {
    ...tree,
    children: tree.children.map((other, where) =>
      where === index ? replaced : other,
    ),
  };
}

/** Which division a resize chord moves, and between which two children. */
export interface ResizeTarget {
  /** The path from the root to the split whose divider moves. */
  readonly split: readonly number[];
  /** The child that grows, and the one that yields. */
  readonly grows: number;
  readonly yields: number;
}

/** The chain of nodes from the root down to one leaf, and the way taken. */
function descendTo(
  tree: WindowTree,
  at: WindowId,
): { nodes: WindowTree[]; indices: number[] } | null {
  if (tree.kind === "leaf") {
    return tree.id === at ? { nodes: [tree], indices: [] } : null;
  }
  for (let index = 0; index < tree.children.length; index += 1) {
    const child = tree.children[index];
    if (child === undefined) continue;
    const below = descendTo(child, at);
    if (below === null) continue;
    return {
      nodes: [tree, ...below.nodes],
      indices: [index, ...below.indices],
    };
  }
  return null;
}

/**
 * Which divider a resize chord moves, or null when there is none to move.
 *
 * The chord walks *up* from the focused leaf to the nearest ancestor split on
 * its own axis — `columns` for the narrowing and widening chords, `rows` for
 * the taller one — and moves the divider inside that split, between the
 * ancestor's child holding the focused leaf and that child's neighbour. This
 * is Emacs's "nearest relevant division", and it is why in a 2 × 2 grid the
 * widening chord widens a whole column: the nearest `columns` ancestor of any
 * leaf there is the root, and no division in the tree would widen one cell
 * without widening the cell above it.
 *
 * The neighbour is the next child in draw order, and the previous one when the
 * focused branch is last, so the pair of chords is symmetric: one pushes the
 * divider on the focused window's trailing edge outward and the other pulls it
 * back. Null with a single window, and null for the widening chord in a
 * `rows`-only layout — one rule and no special case for either.
 */
export function resizeTarget(
  tree: WindowTree,
  at: WindowId,
  axis: "rows" | "columns",
  widen: boolean,
): ResizeTarget | null {
  const descent = descendTo(tree, at);
  if (descent === null) return null;
  for (let depth = descent.nodes.length - 2; depth >= 0; depth -= 1) {
    const node = descent.nodes[depth];
    const branch = descent.indices[depth];
    if (node === undefined || branch === undefined) continue;
    if (node.kind !== "split" || node.direction !== axis) continue;
    const neighbour = branch + 1 < node.children.length ? branch + 1 : branch - 1;
    if (neighbour < 0) continue;
    return {
      split: descent.indices.slice(0, depth),
      grows: widen ? branch : neighbour,
      yields: widen ? neighbour : branch,
    };
  }
  return null;
}

/**
 * Move one step of share from the yielding child to the growing one.
 *
 * Null when there is nothing left to move: the yielding child is already at
 * the floor, so the press says so rather than pretending. A step that would
 * take it below the floor is clamped to the floor instead of refused, so the
 * first press moves to the floor and does something and the next says there is
 * nowhere left to go. A null floor is an unmeasured division — jsdom, and the
 * frame before layout runs — where nothing is clamped beyond keeping a share
 * off zero.
 *
 * Only `grows` and `yields` of the target are read: the same arithmetic serves
 * the three chords and the pointer drag, which is what keeps one floor between
 * them.
 */
export function stepShares(
  shares: readonly number[],
  target: ResizeTarget,
  step: number,
  floor: number | null,
): readonly number[] | null {
  const grows = shares[target.grows];
  const yields = shares[target.yields];
  if (grows === undefined || yields === undefined) return null;
  const limit = floor === null ? 0 : floor;
  const room = yields - limit;
  if (room <= SHARE_EPSILON || step <= 0) return null;
  const moved = Math.min(step, room);
  const next = [...shares];
  next[target.grows] = grows + moved;
  next[target.yields] = yields - moved;
  return next;
}

/**
 * Whether a window of this extent can become two.
 *
 * An extent of nought or less is unmeasured, not narrow, and the division
 * proceeds: jsdom measures every element at nought, and a real engine measures
 * nought for the frame before layout runs. Refusing on an unmeasured surface
 * would make the chord dead in the test harness and dead for one frame at
 * startup, which is a worse failure than a sliver.
 */
export function mayDivide(
  extent: number,
  direction: "rows" | "columns",
): boolean {
  if (extent <= 0) return true;
  const floor = direction === "columns" ? MIN_WINDOW_WIDTH : MIN_WINDOW_HEIGHT;
  return extent >= floor * 2 + DIVIDER_PX;
}

/** The floor for one axis, as a share of a division of this extent. */
export function floorShare(
  extent: number,
  direction: "rows" | "columns",
): number | null {
  if (extent <= 0) return null;
  const floor = direction === "columns" ? MIN_WINDOW_WIDTH : MIN_WINDOW_HEIGHT;
  return floor / extent;
}

/** The split a path names, or null when the path does not fit the tree. */
export function splitAt(
  tree: WindowTree,
  path: readonly number[],
): WindowSplit | null {
  let node: WindowTree = tree;
  for (const index of path) {
    if (node.kind !== "split") return null;
    const child = node.children[index];
    if (child === undefined) return null;
    node = child;
  }
  return node.kind === "split" ? node : null;
}
