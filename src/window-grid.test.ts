/**
 * The window tree drawn, and the divider drag.
 *
 * What jsdom can answer here is the *structure* the tree becomes — the
 * containers, their directions, the dividers between them, and the share
 * written on each child — and the arithmetic the drag does with the pointer's
 * displacement. What it cannot answer is that a share of 0.45 draws as 45 per
 * cent of the division, or that the floor lands where a window is still usable:
 * those are `spc-2609111105376860`'s manual checks M42-1 and M42-3.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { drawWindowGrid, measureSplit } from "./window-grid";
import {
  MIN_WINDOW_WIDTH,
  resize,
  splitAt,
  splitWindow,
  type WindowId,
  type WindowTree,
} from "./windows";

function id(name: string): WindowId {
  return name as WindowId;
}

/** A mint with predictable ids. */
function minting(...names: readonly string[]): () => WindowId {
  let next = 0;
  return () => {
    const name = names[next];
    next += 1;
    if (name === undefined) throw new Error("minted more windows than expected");
    return id(name);
  };
}

let host: HTMLElement;
let elements: Map<string, HTMLElement>;
let committed: { split: readonly number[]; shares: readonly number[] }[];
/** The tree as the releases so far have left it, which is what the app holds. */
let live: WindowTree;

/** One leaf's element, made on first ask so the grid has something to move. */
function elementFor(which: WindowId): HTMLElement {
  const known = elements.get(which);
  if (known) return known;
  const made = document.createElement("section");
  made.className = "editor-window";
  made.dataset["windowId"] = which;
  elements.set(which, made);
  return made;
}

/**
 * Draw a tree, and keep the tree a release writes into.
 *
 * The application's own two hooks, and they are a pair: `commit` writes a
 * drag's shares into the tree and `sharesAt` reads the tree back, so a second
 * drag on a divider starts from where the first one left it rather than from
 * the node this draw captured (`iss-2609120527457904`). A test that stubbed
 * `sharesAt` with the drawn shares could not see that.
 */
function draw(tree: WindowTree): void {
  live = tree;
  drawWindowGrid(host, tree, {
    elementFor,
    commit: (split, shares) => {
      live = resize(live, split, shares);
      committed.push({ split, shares });
    },
    sharesAt: (split) => splitAt(live, split)?.shares ?? null,
  });
}

/** The shares written on a split's children, as they reach CSS. */
function sharesOn(split: HTMLElement): number[] {
  return Array.from(split.children)
    .filter((child) => !child.classList.contains("window-divider"))
    .map((child) =>
      Number((child as HTMLElement).style.getPropertyValue("--share")),
    );
}

/**
 * A pointer event the drag can read.
 *
 * A plain `Event` with the two coordinates on it: jsdom implements no
 * `PointerEvent` constructor, and the handler reads `clientX`, `clientY` and
 * `pointerId` and nothing else.
 */
function pointer(type: string, x: number, y: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clientX", { value: x });
  Object.defineProperty(event, "clientY", { value: y });
  Object.defineProperty(event, "pointerId", { value: 1 });
  return event;
}

/** The extent the container measures at, faked for the width of one drag. */
function measuring(element: HTMLElement, width: number): void {
  element.getBoundingClientRect = (): DOMRect =>
    new DOMRect(0, 0, width, 600);
}

beforeEach(() => {
  host = document.createElement("main");
  host.className = "editor-pane";
  document.body.append(host);
  elements = new Map();
  committed = [];
});

describe("the grid", () => {
  it("draws one window as itself, with no share of its own", () => {
    draw({ kind: "leaf", id: id("w1") });
    expect(host.children).toHaveLength(1);
    const only = host.firstElementChild as HTMLElement;
    expect(only.className).toBe("editor-window");
    expect(only.style.getPropertyValue("--share")).toBe("");
  });

  it("draws a split as a container with a divider between its children", () => {
    const tree = splitWindow(
      { kind: "leaf", id: id("w1") },
      id("w1"),
      "columns",
      minting("w2"),
    ).tree;
    draw(tree);
    const split = host.firstElementChild as HTMLElement;
    expect(split.className).toBe("window-split");
    expect(split.dataset["direction"]).toBe("columns");
    expect(split.dataset["split"]).toBe("");
    expect(sharesOn(split)).toEqual([0.5, 0.5]);
    const divider = split.querySelector<HTMLElement>(".window-divider");
    expect(divider).not.toBeNull();
    expect(divider?.getAttribute("role")).toBe("separator");
    expect(divider?.getAttribute("aria-orientation")).toBe("vertical");
    expect(divider?.hasAttribute("tabindex")).toBe(false);
    // The divider sits between the two children, in draw order.
    expect(
      Array.from(split.children, (child) => child.className),
    ).toEqual(["editor-window", "window-divider", "editor-window"]);
  });

  it("moves the windows it already drew rather than rebuilding them", () => {
    // The property the whole feature rests on: a window survives a reshape, so
    // its view, its state and its caret survive with it.
    let tree: WindowTree = { kind: "leaf", id: id("w1") };
    draw(tree);
    const first = elements.get("w1");
    tree = splitWindow(tree, id("w1"), "columns", minting("w2")).tree;
    draw(tree);
    expect(host.querySelector('[data-window-id="w1"]')).toBe(first);
    tree = splitWindow(tree, id("w1"), "rows", minting("w3")).tree;
    draw(tree);
    expect(host.querySelector('[data-window-id="w1"]')).toBe(first);
    expect(host.querySelectorAll(".editor-window")).toHaveLength(3);
  });

  it("finds a nested split again by the path it was drawn under", () => {
    let tree: WindowTree = { kind: "leaf", id: id("w1") };
    tree = splitWindow(tree, id("w1"), "columns", minting("w2")).tree;
    tree = splitWindow(tree, id("w2"), "rows", minting("w3")).tree;
    draw(tree);
    expect(host.querySelector('[data-split="1"]')).not.toBeNull();
    // Measured on the axis the split divides, and nought is "unmeasured" rather
    // than "no room" for every caller.
    expect(measureSplit(host, [], "columns")).toBeGreaterThanOrEqual(0);
    expect(measureSplit(host, [9], "columns")).toBe(0);
  });
});

describe("dragging a divider", () => {
  /** Two windows side by side, in a container measuring `width`. */
  function pair(width: number): { divider: HTMLElement; split: HTMLElement } {
    const tree = splitWindow(
      { kind: "leaf", id: id("w1") },
      id("w1"),
      "columns",
      minting("w2"),
    ).tree;
    draw(tree);
    const split = host.firstElementChild as HTMLElement;
    measuring(split, width);
    const divider = split.querySelector<HTMLElement>(".window-divider");
    if (divider === null) throw new Error("no divider was drawn");
    return { divider, split };
  }

  it("moves the divider to where the pointer is, not to where it has been", () => {
    // The displacement is measured from the pointer down and applied to the
    // shares *as they were then*, every move. Applying the total displacement to
    // the shares as they now are would accumulate: the divider would run away
    // from the pointer as the square of the travel.
    const { divider, split } = pair(1000);
    divider.dispatchEvent(pointer("pointerdown", 500, 300));
    for (let step = 1; step <= 60; step += 1) {
      divider.dispatchEvent(pointer("pointermove", 500 + step, 300));
    }
    // Sixty pixels of a thousand is six hundredths of the division, so the
    // divider sits at 56 per cent and the pointer is at 56 per cent of the way
    // across. Accumulating would have pinned it against the floor long before.
    const shares = sharesOn(split);
    expect(shares[0]).toBeCloseTo(0.56, 6);
    expect(shares[1]).toBeCloseTo(0.44, 6);
  });

  it("brings the divider back when the pointer comes back", () => {
    const { divider, split } = pair(1000);
    divider.dispatchEvent(pointer("pointerdown", 500, 300));
    for (let step = 1; step <= 40; step += 1) {
      divider.dispatchEvent(pointer("pointermove", 500 + step, 300));
    }
    expect(sharesOn(split)[0]).toBeCloseTo(0.54, 6);
    // Back past where it started: the sign of the displacement changes, the
    // growing and yielding children swap, and the divider follows.
    for (let step = 39; step >= -80; step -= 1) {
      divider.dispatchEvent(pointer("pointermove", 500 + step, 300));
    }
    const shares = sharesOn(split);
    expect(shares[0]).toBeCloseTo(0.42, 6);
    expect(shares[1]).toBeCloseTo(0.58, 6);
  });

  it("stops at the floor rather than making a sliver", () => {
    // A thousand-pixel division: the floor is `MIN_WINDOW_WIDTH` of it.
    const { divider, split } = pair(1000);
    const floor = MIN_WINDOW_WIDTH / 1000;
    divider.dispatchEvent(pointer("pointerdown", 500, 300));
    for (let step = 1; step <= 400; step += 1) {
      divider.dispatchEvent(pointer("pointermove", 500 + step, 300));
    }
    const shares = sharesOn(split);
    expect(shares[1]).toBeCloseTo(floor, 6);
    expect(shares[0]).toBeCloseTo(1 - floor, 6);
    expect(shares[0]! + shares[1]!).toBeCloseTo(1, 6);
  });

  it("writes one tree for one drag, on the release", () => {
    const { divider } = pair(1000);
    divider.dispatchEvent(pointer("pointerdown", 500, 300));
    for (let step = 1; step <= 30; step += 1) {
      divider.dispatchEvent(pointer("pointermove", 500 + step, 300));
    }
    // Thirty moves, and not one tree yet: between the press and the release the
    // shares go straight to the DOM.
    expect(committed).toEqual([]);
    divider.dispatchEvent(pointer("pointerup", 530, 300));
    expect(committed).toHaveLength(1);
    expect(committed[0]?.split).toEqual([]);
    expect(committed[0]?.shares[0]).toBeCloseTo(0.53, 6);
    // And a move after the release moves nothing.
    divider.dispatchEvent(pointer("pointermove", 700, 300));
    expect(committed).toHaveLength(1);
  });

  it("starts a second drag from where the first one left the division", () => {
    // The divider is drawn once and dragged twice, with no redraw between: the
    // release writes the shares into the tree and draws nothing, so the second
    // press has to read the division from the tree rather than from the node
    // this grid was drawn from (`iss-2609120527457904`). Reading the drawn node
    // would snap the divider back to fifty-fifty on a one-pixel move.
    const { divider, split } = pair(1000);
    divider.dispatchEvent(pointer("pointerdown", 500, 300));
    divider.dispatchEvent(pointer("pointermove", 700, 300));
    divider.dispatchEvent(pointer("pointerup", 700, 300));
    expect(sharesOn(split)[0]).toBeCloseTo(0.7, 6);
    expect(committed).toHaveLength(1);

    // Press again where the divider now is, and move one pixel.
    divider.dispatchEvent(pointer("pointerdown", 700, 300));
    divider.dispatchEvent(pointer("pointermove", 701, 300));
    const shares = sharesOn(split);
    expect(shares[0]).toBeCloseTo(0.701, 6);
    expect(shares[1]).toBeCloseTo(0.299, 6);
    divider.dispatchEvent(pointer("pointerup", 701, 300));
    expect(committed).toHaveLength(2);
    expect(committed[1]?.shares[0]).toBeCloseTo(0.701, 6);
  });

  it("moves nothing while the division is unmeasured", () => {
    const { divider, split } = pair(0);
    divider.dispatchEvent(pointer("pointerdown", 0, 0));
    divider.dispatchEvent(pointer("pointermove", 50, 0));
    expect(sharesOn(split)).toEqual([0.5, 0.5]);
  });
});
