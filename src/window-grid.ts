/**
 * The window tree, drawn.
 *
 * `src/windows.ts` is the tree as arithmetic and holds no DOM; this is the
 * other half — the recursive flex grid the tree becomes, the dividers between
 * its children, and the pointer drag that moves one. It is a separate module
 * for the reason the tree is: what is drawn and what the numbers are are two
 * questions, and the tree has to stay testable without a layout engine.
 *
 * Leaf elements are **moved, not rebuilt**. Appending an element that is
 * already in the document moves it, so a reshape never destroys a view: the
 * window Alice was typing in is the same element, the same `EditorView` and the
 * same state after a split as before it. Two consequences the caller handles
 * rather than discovers — a re-parented view has to be told to measure again,
 * and re-parenting the element holding DOM focus blurs it in WebKit, so the
 * focused window is focused last.
 */

import {
  floorShare,
  stepShares,
  type ResizeTarget,
  type WindowId,
  type WindowSplit,
  type WindowTree,
} from "./windows";

/** What the grid needs from the application. */
export interface GridOptions {
  /** The element one window is mounted in. */
  elementFor(id: WindowId): HTMLElement | null;
  /**
   * Write a drag's shares into the tree, once.
   *
   * Called on `pointerup` and not on `pointermove`: between the two the shares
   * go straight to the DOM, so one drag makes one tree rather than one per
   * frame.
   */
  commit(split: readonly number[], shares: readonly number[]): void;
  /**
   * The shares one split holds *now*, or null when the path no longer fits.
   *
   * Asked at every `pointerdown`, because a drag starts from the division as it
   * is and the node this grid was drawn from is a value taken at draw time: a
   * release writes new shares into the tree without redrawing, so the second
   * drag on a divider would otherwise start from where the first one began and
   * snap the division back (`iss-2609120527457904`). The tree is the one place
   * shares live, and this is the question that reads them there.
   */
  sharesAt(split: readonly number[]): readonly number[] | null;
}

/** How a split's path is spelled in the DOM, so it can be measured again. */
function pathKey(path: readonly number[]): string {
  return path.join("/");
}

/**
 * The main-axis extent of one split, in CSS pixels, or nought when unmeasured.
 *
 * Nought is jsdom and the frame before layout runs, and every caller treats it
 * as "unmeasured" rather than as "no room" — the same rule `mayDivide` follows.
 */
export function measureSplit(
  host: HTMLElement,
  path: readonly number[],
  direction: "rows" | "columns",
): number {
  const element = host.querySelector<HTMLElement>(
    `.window-split[data-split="${pathKey(path)}"]`,
  );
  if (element === null) return 0;
  const rect = element.getBoundingClientRect();
  return direction === "columns" ? rect.width : rect.height;
}

/** A placeholder for a leaf whose window record has gone. */
function placeholder(): HTMLElement {
  const element = document.createElement("div");
  element.className = "editor-window";
  return element;
}

/**
 * The divider between two children of a split, and the drag that moves it.
 *
 * `role="separator"` with an orientation and no tab stop. That is deliberate
 * and it is not an accessibility compromise: the keyboard route to a size is
 * the *window's* — `C-x {`, `C-x }` and `C-x ^` act on the window holding the
 * keyboard, as every other chord in the application does — so a focusable
 * separator would be a second way to do one thing, and the two would have to
 * agree about the floor. They agree about it here instead, by both ending in
 * `stepShares` and then in `resize`.
 */
function divider(
  node: WindowSplit,
  path: readonly number[],
  before: number,
  container: HTMLElement,
  children: readonly HTMLElement[],
  options: GridOptions,
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "window-divider";
  bar.setAttribute("role", "separator");
  bar.setAttribute(
    "aria-orientation",
    node.direction === "columns" ? "vertical" : "horizontal",
  );

  const columns = node.direction === "columns";
  let dragging = false;
  /** Where the pointer went down, and the shares as they were then. */
  let origin = 0;
  let began: readonly number[] = node.shares;
  let extent = 0;
  let floor: number | null = null;
  /** The shares as last drawn, which is what a release writes into the tree. */
  let drawn: readonly number[] = node.shares;

  function onDown(event: PointerEvent): void {
    const rect = container.getBoundingClientRect();
    extent = columns ? rect.width : rect.height;
    origin = columns ? event.clientX : event.clientY;
    floor = floorShare(extent, node.direction);
    // The division as it is, not as it was when this divider was drawn: a
    // release before this one wrote its shares into the tree and drew nothing
    // (`iss-2609120527457904`). A path that no longer fits the tree falls back
    // to the drawn node, which is this divider's own last truth.
    began = options.sharesAt(path) ?? node.shares;
    drawn = began;
    dragging = true;
    if (typeof bar.setPointerCapture === "function") {
      bar.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  }

  /**
   * The pointer moved, so redraw the two children from where the drag began.
   *
   * Absolute and not incremental: the displacement is measured from the pointer
   * down and applied to the shares *as they were then*, every time. Taking the
   * total displacement and applying it to the shares as they now are would
   * accumulate — the divider would run away from the pointer as the square of
   * the travel, pin itself against the floor within a few tens of pixels, and
   * refuse to come back, because the sign of the displacement never changes
   * while the pointer is still on the far side of where it started.
   */
  function onMove(event: PointerEvent): void {
    if (!dragging) return;
    const moved = (columns ? event.clientX : event.clientY) - origin;
    if (extent <= 0 || moved === 0) return;
    const fraction = moved / extent;
    // The same arithmetic and the same floor the three chords use: whichever
    // way the pointer went, one child grows and the other yields.
    const target: ResizeTarget =
      fraction > 0
        ? { split: path, grows: before, yields: before + 1 }
        : { split: path, grows: before + 1, yields: before };
    const next = stepShares(began, target, Math.abs(fraction), floor);
    if (next === null) return;
    drawn = next;
    children.forEach((child, index) => {
      child.style.setProperty("--share", String(next[index] ?? 1));
    });
  }

  function onUp(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    if (typeof bar.releasePointerCapture === "function") {
      bar.releasePointerCapture(event.pointerId);
    }
    options.commit(path, drawn);
  }

  bar.addEventListener("pointerdown", onDown);
  bar.addEventListener("pointermove", onMove);
  bar.addEventListener("pointerup", onUp);
  bar.addEventListener("pointercancel", onUp);
  return bar;
}

/** One node of the tree as an element, its children already in place. */
function build(
  node: WindowTree,
  path: readonly number[],
  options: GridOptions,
): HTMLElement {
  if (node.kind === "leaf") {
    return options.elementFor(node.id) ?? placeholder();
  }
  const container = document.createElement("div");
  container.className = "window-split";
  container.dataset["direction"] = node.direction;
  container.dataset["split"] = pathKey(path);

  const children = node.children.map((child, index) =>
    build(child, [...path, index], options),
  );
  children.forEach((child, index) => {
    child.style.setProperty(
      "--share",
      String(node.shares[index] ?? 1 / children.length),
    );
  });
  children.forEach((child, index) => {
    if (index > 0) {
      container.append(
        divider(node, path, index - 1, container, children, options),
      );
    }
    container.append(child);
  });
  return container;
}

/**
 * Draw the tree into its host, moving the windows that survive.
 *
 * The host is `.editor-pane`, which stops being the editing surface and becomes
 * the grid's own root. A single leaf draws as that window's element alone, with
 * no share written on it, so one window is exactly what one window was.
 */
export function drawWindowGrid(
  host: HTMLElement,
  tree: WindowTree,
  options: GridOptions,
): void {
  const root = build(tree, [], options);
  root.style.removeProperty("--share");
  host.replaceChildren(root);
}
