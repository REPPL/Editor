/**
 * The window tree, as arithmetic.
 *
 * Everything here is a pure function over a tree of ids, which is the point of
 * the module: the shape `C-x 2` and `C-x 3` build, the room `C-x 0` gives
 * back, the order `C-x o` walks, the refusal at a width too narrow to divide,
 * and the share one resize chord moves are all decidable without a layout
 * engine. What jsdom cannot show — that a split looks like a split, that a
 * share of 0.45 draws as 45 per cent, that the floor lands where a window is
 * still usable — is manual, in `spc-2609111105376860`'s own checklist.
 */

import { describe, expect, it } from "vitest";

import {
  DIVIDER_PX,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  RESIZE_STEP,
  closeOtherWindows,
  closeWindow,
  floorShare,
  heirOf,
  leafIds,
  mayDivide,
  resize,
  resizeTarget,
  splitAt,
  splitWindow,
  stepShares,
  type WindowId,
  type WindowSplit,
  type WindowTree,
} from "./windows";

/** An id, spelled as the application spells them. */
function id(name: string): WindowId {
  return name as WindowId;
}

function leaf(name: string): WindowTree {
  return { kind: "leaf", id: id(name) };
}

/** A mint with predictable ids, so a test can name the window that appears. */
function minting(...names: readonly string[]): () => WindowId {
  let next = 0;
  return () => {
    const name = names[next];
    next += 1;
    if (name === undefined) throw new Error("minted more windows than expected");
    return id(name);
  };
}

/** The tree as a split, for a test that has just made one. */
function asSplit(tree: WindowTree): WindowSplit {
  if (tree.kind !== "split") throw new Error("expected a split");
  return tree;
}

describe("the window tree", () => {
  it("splits a leaf into two, keeping the focused window's identity first", () => {
    // The whole mechanism of "the keyboard stays in the window she was in, and
    // the caret has not moved": the leaf that divided keeps its id, so it
    // keeps its view, its state and its caret, and a sibling appears beside
    // it.
    const change = splitWindow(leaf("w1"), id("w1"), "columns", minting("w2"));
    expect(change.refusal).toBeNull();
    expect(change.opened).toBe("w2");
    expect(change.closed).toEqual([]);
    const split = asSplit(change.tree);
    expect(split.direction).toBe("columns");
    expect(split.children).toEqual([leaf("w1"), leaf("w2")]);
    expect(split.shares).toEqual([0.5, 0.5]);
    expect(leafIds(change.tree)).toEqual(["w1", "w2"]);
  });

  it("divides above and below on the other direction, with the same shape", () => {
    const change = splitWindow(leaf("w1"), id("w1"), "rows", minting("w2"));
    expect(asSplit(change.tree).direction).toBe("rows");
    expect(asSplit(change.tree).children[0]).toEqual(leaf("w1"));
  });

  it("nests a split inside a split, to any depth", () => {
    // Splits nest rather than flatten, which is Emacs's own behaviour: only
    // the window being divided changes size and its neighbours are left
    // alone. Three presses of `C-x 3` therefore give a column, then a nested
    // column inside its right half, not three equal columns.
    let tree: WindowTree = leaf("w1");
    tree = splitWindow(tree, id("w1"), "columns", minting("w2")).tree;
    tree = splitWindow(tree, id("w2"), "columns", minting("w3")).tree;
    tree = splitWindow(tree, id("w3"), "rows", minting("w4")).tree;
    expect(leafIds(tree)).toEqual(["w1", "w2", "w3", "w4"]);

    const root = asSplit(tree);
    expect(root.children).toHaveLength(2);
    expect(root.children[0]).toEqual(leaf("w1"));
    const second = asSplit(root.children[1]!);
    expect(second.direction).toBe("columns");
    expect(second.children[0]).toEqual(leaf("w2"));
    const third = asSplit(second.children[1]!);
    expect(third.direction).toBe("rows");
    expect(third.children).toEqual([leaf("w3"), leaf("w4")]);
    // A fourth division inside the deepest leaf still nests, so the depth is
    // a property of the tree and not of a limit written anywhere.
    const deeper = splitWindow(tree, id("w4"), "columns", minting("w5")).tree;
    expect(leafIds(deeper)).toEqual(["w1", "w2", "w3", "w4", "w5"]);
  });

  it("walks the leaves in reading order", () => {
    // The one order `C-x o` and the DOM both come from: depth first, children
    // in the order they are drawn — top to bottom in a `rows` split, left to
    // right in a `columns` one, which is reading order in the only script
    // Editor targets.
    const grid: WindowTree = {
      kind: "split",
      direction: "columns",
      shares: [0.5, 0.5],
      children: [
        {
          kind: "split",
          direction: "rows",
          shares: [0.5, 0.5],
          children: [leaf("top-left"), leaf("bottom-left")],
        },
        {
          kind: "split",
          direction: "rows",
          shares: [0.5, 0.5],
          children: [leaf("top-right"), leaf("bottom-right")],
        },
      ],
    };
    expect(leafIds(grid)).toEqual([
      "top-left",
      "bottom-left",
      "top-right",
      "bottom-right",
    ]);
  });

  it("closes a window and gives its share to its siblings", () => {
    const three: WindowTree = {
      kind: "split",
      direction: "columns",
      shares: [0.5, 0.3, 0.2],
      children: [leaf("w1"), leaf("w2"), leaf("w3")],
    };
    const change = closeWindow(three, id("w2"));
    expect(change.refusal).toBeNull();
    expect(change.closed).toEqual(["w2"]);
    const split = asSplit(change.tree);
    expect(split.children).toEqual([leaf("w1"), leaf("w3")]);
    // In proportion to theirs: 0.5 and 0.2 of the 0.7 they held between them.
    expect(split.shares[0]).toBeCloseTo(0.5 / 0.7, 10);
    expect(split.shares[1]).toBeCloseTo(0.2 / 0.7, 10);
    expect(split.shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 10);
  });

  it("collapses a split that is left with one child", () => {
    // No degenerate node whose share nothing divides, so a close followed by a
    // close leaves a tree the same shape a tree of that many windows would
    // have been built as.
    let tree: WindowTree = leaf("w1");
    tree = splitWindow(tree, id("w1"), "columns", minting("w2")).tree;
    tree = splitWindow(tree, id("w2"), "rows", minting("w3")).tree;
    expect(leafIds(tree)).toEqual(["w1", "w2", "w3"]);
    const change = closeWindow(tree, id("w3"));
    expect(change.refusal).toBeNull();
    // The `rows` split that held w2 and w3 is gone; w2 is the root's second
    // child again, and it keeps the share the split had.
    const split = asSplit(change.tree);
    expect(split.direction).toBe("columns");
    expect(split.children).toEqual([leaf("w1"), leaf("w2")]);
    expect(split.shares).toEqual([0.5, 0.5]);
  });

  it("names the window that receives a closing window's space", () => {
    // Where the keyboard goes when `C-x 0` closes the window holding it. In
    // `(w1 | (w2 | w3))` the space of w3 goes to w2 beside it, and the first
    // leaf of the whole tree — w1, across the frame — is not a neighbour of
    // anything (`iss-2609120527458704`).
    let tree: WindowTree = leaf("w1");
    tree = splitWindow(tree, id("w1"), "columns", minting("w2")).tree;
    tree = splitWindow(tree, id("w2"), "columns", minting("w3")).tree;
    expect(leafIds(tree)).toEqual(["w1", "w2", "w3"]);
    expect(heirOf(tree, id("w3"))).toBe("w2");
    // And the other way: w2's own next sibling is w3.
    expect(heirOf(tree, id("w2"))).toBe("w3");
    // w1's neighbour is the division beside it, whose nearest leaf is w2.
    expect(heirOf(tree, id("w1"))).toBe("w2");
  });

  it("takes the nearest leaf of the division that receives the space", () => {
    // `((w1 | w3) | w2)`: w2 is its split's last child, so the space goes to
    // the division before it and the keyboard goes to that division's *last*
    // leaf, which is the window against the divider w2 left behind.
    let tree: WindowTree = leaf("w1");
    tree = splitWindow(tree, id("w1"), "columns", minting("w2")).tree;
    tree = splitWindow(tree, id("w1"), "rows", minting("w3")).tree;
    expect(leafIds(tree)).toEqual(["w1", "w3", "w2"]);
    expect(heirOf(tree, id("w2"))).toBe("w3");
  });

  it("names no heir for a lone window or a window that has gone", () => {
    expect(heirOf(leaf("w1"), id("w1"))).toBeNull();
    expect(heirOf(leaf("w1"), id("gone"))).toBeNull();
  });

  it("refuses to close the only window", () => {
    const change = closeWindow(leaf("w1"), id("w1"));
    expect(change.refusal).toBe("This is the only window");
    expect(change.closed).toEqual([]);
    expect(change.tree).toEqual(leaf("w1"));
  });

  it("closes every window but the one that is kept", () => {
    let tree: WindowTree = leaf("w1");
    tree = splitWindow(tree, id("w1"), "columns", minting("w2")).tree;
    tree = splitWindow(tree, id("w2"), "rows", minting("w3")).tree;
    const change = closeOtherWindows(tree, id("w2"));
    expect(change.refusal).toBeNull();
    expect(change.tree).toEqual(leaf("w2"));
    expect([...change.closed].sort()).toEqual(["w1", "w3"]);
    expect(change.opened).toBeNull();
  });

  it("keeps the only window when it is the one to keep", () => {
    const change = closeOtherWindows(leaf("w1"), id("w1"));
    expect(change.refusal).toBeNull();
    expect(change.closed).toEqual([]);
    expect(change.tree).toEqual(leaf("w1"));
  });

  it("refuses a chord aimed at a window that is not in the tree", () => {
    for (const change of [
      splitWindow(leaf("w1"), id("gone"), "columns", minting("w2")),
      closeWindow(leaf("w1"), id("gone")),
      closeOtherWindows(leaf("w1"), id("gone")),
    ]) {
      expect(change.refusal).toBe("No such window");
      expect(change.tree).toEqual(leaf("w1"));
    }
  });
});

describe("the refusal at a width too narrow to divide", () => {
  it("refuses to divide an extent too narrow for two windows", () => {
    // The arithmetic the criterion fixes from three sides: refuse at 390,
    // allow at 820 and at 1280. The widths themselves are manual — jsdom
    // measures every element at nought and evaluates no media query.
    const needed = MIN_WINDOW_WIDTH * 2 + DIVIDER_PX;
    expect(needed).toBe(486);
    expect(mayDivide(390, "columns")).toBe(false);
    expect(mayDivide(needed - 1, "columns")).toBe(false);
    expect(mayDivide(needed, "columns")).toBe(true);
    expect(mayDivide(820, "columns")).toBe(true);
    // At 1280 with the sidebar shown as a column the editing area is about
    // 1020, so each half of a `C-x 3` is about 507 and divides again: two
    // levels of left-and-right division at the width the grid is demonstrated
    // at.
    expect(mayDivide(507, "columns")).toBe(true);
    expect(mayDivide(250, "columns")).toBe(false);

    const tall = MIN_WINDOW_HEIGHT * 2 + DIVIDER_PX;
    expect(tall).toBe(326);
    expect(mayDivide(390, "rows")).toBe(true);
    expect(mayDivide(192, "rows")).toBe(false);
  });

  it("allows a division when the extent is unmeasured", () => {
    // Nought is jsdom and the first frame before layout runs, not a sliver. A
    // chord dead in the harness and dead for one frame at startup is a worse
    // failure than a narrow window.
    for (const direction of ["rows", "columns"] as const) {
      expect(mayDivide(0, direction)).toBe(true);
      expect(mayDivide(-1, direction)).toBe(true);
      expect(floorShare(0, direction)).toBeNull();
    }
    expect(floorShare(960, "columns")).toBeCloseTo(0.25, 10);
    expect(floorShare(640, "rows")).toBeCloseTo(0.25, 10);
  });
});

describe("resizing by keyboard", () => {
  /** Two windows side by side, the shape `C-x 3` leaves. */
  function pair(): WindowTree {
    return splitWindow(leaf("w1"), id("w1"), "columns", minting("w2")).tree;
  }

  /** A 2 × 2 grid: a `columns` split of two `rows` splits. */
  function grid(): WindowTree {
    let tree = pair();
    tree = splitWindow(tree, id("w1"), "rows", minting("w3")).tree;
    tree = splitWindow(tree, id("w2"), "rows", minting("w4")).tree;
    return tree;
  }

  it("moves one step of share from the next sibling to the focused window", () => {
    const tree = pair();
    const target = resizeTarget(tree, id("w1"), "columns", true);
    expect(target).not.toBeNull();
    expect(target?.split).toEqual([]);
    expect(target?.grows).toBe(0);
    expect(target?.yields).toBe(1);
    const shares = asSplit(tree).shares;
    const next = stepShares(shares, target!, RESIZE_STEP, null);
    expect(next).not.toBeNull();
    // By the same amount, as an equality rather than as a description.
    expect(next![0]! - shares[0]!).toBeCloseTo(RESIZE_STEP, 10);
    expect(shares[1]! - next![1]!).toBeCloseTo(RESIZE_STEP, 10);
    expect(next!.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 10);
  });

  it("moves one step of share the other way when the window narrows", () => {
    // The same function with `widen` false, which is why the two chords cannot
    // disagree about the step or the floor.
    const tree = pair();
    const target = resizeTarget(tree, id("w1"), "columns", false);
    expect(target?.grows).toBe(1);
    expect(target?.yields).toBe(0);
    const next = stepShares(asSplit(tree).shares, target!, RESIZE_STEP, null);
    expect(next![0]).toBeCloseTo(0.5 - RESIZE_STEP, 10);
    expect(next![1]).toBeCloseTo(0.5 + RESIZE_STEP, 10);
  });

  it("takes the previous sibling when the focused branch is last", () => {
    const tree = pair();
    const target = resizeTarget(tree, id("w2"), "columns", true);
    expect(target?.grows).toBe(1);
    expect(target?.yields).toBe(0);
  });

  it("will not take a sibling below the usable minimum", () => {
    const tree = pair();
    const target = resizeTarget(tree, id("w1"), "columns", true)!;
    // A 960-pixel division: the floor is a quarter of it.
    const floor = floorShare(960, "columns")!;
    let shares = asSplit(tree).shares;
    for (let press = 0; press < 5; press += 1) {
      const next = stepShares(shares, target, RESIZE_STEP, floor);
      expect(next, `press ${String(press + 1)}`).not.toBeNull();
      shares = next!;
    }
    // Clamped to the floor rather than refused, so the last press that had
    // anything to give moved to the floor exactly.
    expect(shares[1]).toBeCloseTo(floor, 10);
    expect(shares[0]).toBeCloseTo(1 - floor, 10);
    // And the next press has nothing left, so it returns null and the chord
    // says so.
    expect(stepShares(shares, target, RESIZE_STEP, floor)).toBeNull();
  });

  it("clamps a step that would overshoot the floor to the floor", () => {
    const target = resizeTarget(pair(), id("w1"), "columns", true)!;
    const next = stepShares([0.5, 0.5], target, RESIZE_STEP, 0.48);
    expect(next![1]).toBeCloseTo(0.48, 10);
    expect(next![0]).toBeCloseTo(0.52, 10);
    expect(stepShares(next!, target, RESIZE_STEP, 0.48)).toBeNull();
  });

  it("resizes the nearest rows division for the taller chord", () => {
    const stacked = splitWindow(leaf("w1"), id("w1"), "rows", minting("w2")).tree;
    const target = resizeTarget(stacked, id("w1"), "rows", true);
    expect(target?.split).toEqual([]);
    expect(target?.grows).toBe(0);
    expect(target?.yields).toBe(1);
    const next = stepShares(asSplit(stacked).shares, target!, RESIZE_STEP, null)!;
    expect(next[0]).toBeCloseTo(0.55, 10);
    expect(next[1]).toBeCloseTo(0.45, 10);
  });

  it("walks up to the nearest division on the chord's own axis", () => {
    // In a 2 × 2 grid the widening chord moves the root's divider and widens a
    // whole column, because the nearest `columns` ancestor of any leaf is the
    // root and no division in the tree would widen one cell without widening
    // the cell above it. The taller chord moves the focused column's own
    // divider. Both are Emacs's.
    const tree = grid();
    expect(leafIds(tree)).toEqual(["w1", "w3", "w2", "w4"]);

    const wider = resizeTarget(tree, id("w3"), "columns", true);
    expect(wider?.split).toEqual([]);
    expect(wider?.grows).toBe(0);
    expect(wider?.yields).toBe(1);

    const taller = resizeTarget(tree, id("w3"), "rows", true);
    expect(taller?.split).toEqual([0]);
    // w3 is the second child of the left column, so it grows and its
    // predecessor yields.
    expect(taller?.grows).toBe(1);
    expect(taller?.yields).toBe(0);
    expect(splitAt(tree, taller!.split)?.direction).toBe("rows");
  });

  it("finds no division to move with a single window", () => {
    // The same answer a `rows`-only layout gives the widening chord: one rule,
    // and no special case for the single-window state.
    const only = leaf("w1");
    for (const axis of ["rows", "columns"] as const) {
      for (const widen of [true, false]) {
        expect(resizeTarget(only, id("w1"), axis, widen)).toBeNull();
      }
    }
    const stacked = splitWindow(leaf("w1"), id("w1"), "rows", minting("w2")).tree;
    expect(resizeTarget(stacked, id("w1"), "columns", true)).toBeNull();
    const beside = splitWindow(leaf("w1"), id("w1"), "columns", minting("w2")).tree;
    expect(resizeTarget(beside, id("w1"), "rows", true)).toBeNull();
  });

  it("writes new shares into the one split the path names", () => {
    const tree = grid();
    const next = resize(tree, [0], [0.7, 0.3]);
    expect(asSplit(next).shares).toEqual([0.5, 0.5]);
    expect(splitAt(next, [0])?.shares).toEqual([0.7, 0.3]);
    // Every other split is untouched.
    expect(splitAt(next, [1])?.shares).toEqual([0.5, 0.5]);
    // A path or a share count that does not fit leaves the tree alone rather
    // than building a split whose shares do not match its children.
    expect(resize(tree, [5], [0.7, 0.3])).toBe(tree);
    expect(resize(tree, [], [0.7, 0.2, 0.1])).toBe(tree);
    expect(resize(leaf("w1"), [], [1])).toEqual(leaf("w1"));
  });
});
