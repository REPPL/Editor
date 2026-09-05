/**
 * The left pane: the document as five levels.
 *
 * Part, Chapter, Section, Sub-section, Sub-sub-section. The first two are
 * folders and files and come from the shell's walk; the last three are the
 * outline the core derives from the one parse, so the sidebar and the deck can
 * never disagree about what a heading is.
 *
 * Rows wrap rather than scroll: a sixty-character title takes a second line
 * and the pane never scrolls sideways. Every row carries an empty badge slot,
 * so the variant, asset, and citation marks of later maps add data rather than
 * a redesign.
 */

import type { Outline, OutlineNode } from "./core/outline";
import type { Chapter, DocumentTree, Part } from "./doctree";

/** What the sidebar asks the application to do. */
export interface SidebarHooks {
  /** A chapter was chosen, optionally at one of its headings. */
  onOpenChapter(chapter: Chapter, node?: OutlineNode): void;
  /** The Open folder button was pressed. */
  onOpenFolder(): void;
  /** The drawer was opened or closed. */
  onToggle?(open: boolean): void;
}

/**
 * One row of the tree as the keyboard sees it.
 *
 * The same walk that draws the tree collects this list, in draw order, so the
 * cursor can never disagree with what is on the screen about what comes next.
 */
export interface SidebarRow {
  /** The expansion key: `part:…`, `chapter:…` or `node:…`. */
  readonly key: string;
  readonly kind: "part" | "chapter" | "heading";
  readonly depth: number;
  /** The `.tree-row` element, which is what carries the cursor mark. */
  readonly element: HTMLElement;
  readonly expandable: boolean;
  readonly expanded: boolean;
  readonly chapter?: Chapter;
  readonly node?: OutlineNode;
}

/** The sidebar element and the calls that drive it. */
export interface Sidebar {
  readonly element: HTMLElement;
  /** Replace the tree. `outlines` is keyed by chapter path. */
  show(
    tree: DocumentTree | null,
    outlines?: ReadonlyMap<string, Outline>,
  ): void;
  /** Mark one chapter, and optionally one of its headings, as the open one. */
  select(path: string | null, nodeId?: string | null): void;
  /** Which rows are expanded, so a reload can put them back. */
  expansion(): ReadonlySet<string>;
  /** Restore an expansion set taken before a reload. */
  setExpansion(ids: Iterable<string>): void;
  /** Whether the drawer is open. Always true beside a wide window. */
  readonly open: boolean;
  /** Open or close the drawer. */
  setOpen(open: boolean): void;
  /** Flip the drawer. */
  toggle(): void;

  // The keyboard. The tree is the same tree; these only say where Alice is
  // looking in it, which is a different fact from what is open.

  /** Every visible row, in draw order. */
  rows(): readonly SidebarRow[];
  /** Where the cursor is, as an index into `rows()`, or -1 when nowhere. */
  readonly cursor: number;
  /** Move the cursor, clamped to the ends. A book has a shape; it does not wrap. */
  setCursor(index: number): void;
  /** Take the keyboard: open the drawer, put the cursor somewhere it can start. */
  takeFocus(): void;
  /**
   * Notice that the keyboard arrived by a route the tree did not drive.
   *
   * A click on a row lands on the row's own button, so the keyboard is in the
   * tree without `takeFocus` having put it there: the cursor mark and the
   * modeline have to agree with that, and moving the focus again — or opening
   * a drawer nobody asked to open — would be answering a gesture Alice did
   * not make.
   */
  adoptFocus(): void;
  /** Give the keyboard back, closing the drawer only if `takeFocus` opened it. */
  releaseFocus(): void;
  /** Whether the tree holds the keyboard. */
  readonly focused: boolean;
  /** Expand a collapsed row under the cursor. Moves nothing, opens nothing. */
  expandAtCursor(): void;
  /** Collapse an expanded row under the cursor. Moves nothing, opens nothing. */
  collapseAtCursor(): void;
  /** Open what a click on the row under the cursor would open. */
  activateCursor(): boolean;
}

/** The expansion key for a Part. */
function partKey(part: Part): string {
  return `part:${part.path}`;
}

/** The expansion key for a Chapter's outline. */
function chapterKey(chapter: Chapter): string {
  return `chapter:${chapter.path}`;
}

/** The expansion key for one heading inside a chapter. */
function nodeKey(chapter: Chapter, node: OutlineNode): string {
  return `node:${chapter.path}#${node.id}`;
}

/** An empty slot for the marks later maps compute. */
function badgeSlot(): HTMLSpanElement {
  const slot = document.createElement("span");
  slot.className = "tree-badges";
  return slot;
}

/** A disclosure control, or a spacer where a row has nothing to disclose. */
function twisty(
  expanded: boolean,
  onToggle: (() => void) | null,
): HTMLElement {
  if (!onToggle) {
    const spacer = document.createElement("span");
    spacer.className = "tree-twisty tree-twisty-empty";
    return spacer;
  }
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tree-twisty";
  button.setAttribute("aria-expanded", expanded ? "true" : "false");
  button.setAttribute("aria-label", expanded ? "Collapse" : "Expand");
  button.textContent = expanded ? "▾" : "▸";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onToggle();
  });
  return button;
}

/** Build the sidebar. */
export function createSidebar(hooks: SidebarHooks): Sidebar {
  const element = document.createElement("nav");
  element.className = "sidebar";
  element.dataset["open"] = "yes";

  const heading = document.createElement("h1");
  heading.className = "sidebar-heading";
  heading.textContent = "Editor";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "sidebar-open";
  openButton.textContent = "Open folder";
  openButton.dataset["action"] = "open-folder";
  openButton.addEventListener("click", () => {
    hooks.onOpenFolder();
  });

  const body = document.createElement("div");
  body.className = "sidebar-body";

  element.append(heading, openButton, body);

  /** Which rows are open. Survives a redraw, which is what a reload needs. */
  const expanded = new Set<string>();
  /** The flat list the keyboard walks, rebuilt by every draw. */
  let rowList: SidebarRow[] = [];
  /**
   * The row the cursor is on, by expansion key rather than by index.
   *
   * An index would move under a redraw — expanding a Part inserts rows above
   * the cursor — and the key does not.
   */
  let cursorKey: string | null = null;
  let focused = false;
  /** Whether `takeFocus` opened the drawer, and so whether it may close it. */
  let openedForFocus = false;
  let tree: DocumentTree | null = null;
  let outlines: ReadonlyMap<string, Outline> = new Map();
  let selectedPath: string | null = null;
  let selectedNode: string | null = null;
  let open = true;

  /** Whether a row is expanded, defaulting to open the first time it is seen. */
  function isExpanded(key: string): boolean {
    return expanded.has(key);
  }

  function toggleKey(key: string): void {
    if (expanded.has(key)) expanded.delete(key);
    else expanded.add(key);
    draw();
  }

  function headingItem(
    chapter: Chapter,
    node: OutlineNode,
    depth: number,
  ): HTMLLIElement {
    const item = document.createElement("li");
    item.className = `tree-heading tree-${node.kind}`;
    const key = nodeKey(chapter, node);
    const openHere = isExpanded(key);

    const row = document.createElement("div");
    row.className = "tree-row";
    row.style.setProperty("--depth", String(depth));
    row.append(
      twisty(
        openHere,
        node.children.length > 0
          ? () => {
              toggleKey(key);
            }
          : null,
      ),
    );

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-button tree-heading-button";
    button.textContent = node.label;
    button.dataset["path"] = chapter.path;
    button.dataset["nodeId"] = node.id;
    button.dataset["line"] = String(node.line);
    button.addEventListener("click", () => {
      hooks.onOpenChapter(chapter, node);
    });
    row.append(button, badgeSlot());
    item.append(row);
    rowList.push({
      key,
      kind: "heading",
      depth,
      element: row,
      expandable: node.children.length > 0,
      expanded: openHere,
      chapter,
      node,
    });

    if (openHere && node.children.length > 0) {
      const list = document.createElement("ul");
      list.className = "tree-list";
      for (const child of node.children) {
        list.append(headingItem(chapter, child, depth + 1));
      }
      item.append(list);
    }
    return item;
  }

  function chapterItem(chapter: Chapter, depth: number): HTMLLIElement {
    const item = document.createElement("li");
    item.className = "tree-chapter";
    const outline = outlines.get(chapter.path);
    const nodes = outline?.nodes ?? [];
    const key = chapterKey(chapter);
    const openHere = isExpanded(key);

    const row = document.createElement("div");
    row.className = "tree-row";
    row.style.setProperty("--depth", String(depth));
    row.append(
      twisty(
        openHere,
        nodes.length > 0
          ? () => {
              toggleKey(key);
            }
          : null,
      ),
    );

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-button";
    // The label is the chapter's own level-one heading where it has one; the
    // filename-derived title is the fallback the walk already computed.
    button.textContent =
      outline?.title !== undefined && outline.title !== null && outline.title !== ""
        ? outline.title
        : chapter.title;
    button.dataset["path"] = chapter.path;
    button.addEventListener("click", () => {
      hooks.onOpenChapter(chapter);
    });
    row.append(button, badgeSlot());
    item.append(row);
    rowList.push({
      key,
      kind: "chapter",
      depth,
      element: row,
      expandable: nodes.length > 0,
      expanded: openHere,
      chapter,
    });

    if (openHere && nodes.length > 0) {
      const list = document.createElement("ul");
      list.className = "tree-list";
      for (const node of nodes) {
        list.append(headingItem(chapter, node, depth + 1));
      }
      item.append(list);
    }
    return item;
  }

  function partItem(part: Part, depth: number): HTMLLIElement {
    const item = document.createElement("li");
    item.className = "tree-part";
    const key = partKey(part);
    const openHere = isExpanded(key);
    const hasChildren = part.chapters.length > 0 || part.parts.length > 0;

    const row = document.createElement("div");
    row.className = "tree-row tree-part-row";
    row.style.setProperty("--depth", String(depth));
    // The drop router asks the document what lies under the pointer, so the
    // Part's own path has to be on an element the pointer can land on.
    row.dataset["partPath"] = part.path;
    row.append(
      twisty(
        openHere,
        hasChildren
          ? () => {
              toggleKey(key);
            }
          : null,
      ),
    );

    const label = document.createElement("span");
    label.className = "tree-part-label";
    label.textContent = part.title;
    row.append(label, badgeSlot());
    item.append(row);
    rowList.push({
      key,
      kind: "part",
      depth,
      element: row,
      expandable: hasChildren,
      expanded: openHere,
    });

    if (openHere && hasChildren) {
      item.append(childList(part, depth + 1));
    }
    return item;
  }

  function childList(part: Part, depth: number): HTMLUListElement {
    const list = document.createElement("ul");
    list.className = "tree-list";
    for (const chapter of part.chapters) {
      list.append(chapterItem(chapter, depth));
    }
    for (const child of part.parts) {
      list.append(partItem(child, depth));
    }
    if (part.truncated) {
      const cut = document.createElement("li");
      cut.className = "tree-truncated";
      cut.textContent = "… too deeply nested to read";
      list.append(cut);
    }
    return list;
  }

  /** Every chapter beneath a Part, in draw order. */
  function chaptersIn(part: Part): Chapter[] {
    const found = [...part.chapters];
    for (const child of part.parts) found.push(...chaptersIn(child));
    return found;
  }

  /** Whether a Part holds a chapter anywhere beneath it. */
  function holdsChapters(part: Part): boolean {
    return (
      part.chapters.length > 0 || part.parts.some((child) => holdsChapters(child))
    );
  }

  function draw(): void {
    // The list is a function of the draw, so it is thrown away with it.
    rowList = [];
    if (!tree) {
      const empty = document.createElement("p");
      empty.className = "sidebar-empty";
      empty.textContent = "No document open.";
      body.replaceChildren(empty);
      return;
    }
    const title = document.createElement("h2");
    title.className = "sidebar-document";
    // The document's own row is a Part too, so a chapter can be dropped on it.
    title.dataset["partPath"] = tree.root.path;
    title.textContent = tree.root.title;

    if (!holdsChapters(tree.root)) {
      const empty = document.createElement("p");
      empty.className = "sidebar-empty";
      empty.textContent = "This folder holds no Markdown chapters.";
      body.replaceChildren(title, empty);
      return;
    }

    body.replaceChildren(title, childList(tree.root, 0));
    paint();
    paintCursor();
  }

  /**
   * Mark the row the cursor is on.
   *
   * Deliberately not the `data-open` mark the open chapter carries: where
   * Alice is looking and what is open are two facts, and a reader who cannot
   * tell them apart cannot tell whether Return would change anything.
   */
  function paintCursor(): void {
    for (const row of rowList) {
      row.element.dataset["cursor"] = row.key === cursorKey ? "yes" : "no";
    }
  }

  /** Where the cursor is in the drawn list, or -1 when it is on no row. */
  function cursorIndex(): number {
    if (cursorKey === null) return -1;
    return rowList.findIndex((row) => row.key === cursorKey);
  }

  /** Put the cursor on a row by index, clamped to the ends. */
  function moveCursor(index: number): void {
    if (rowList.length === 0) {
      cursorKey = null;
      return;
    }
    const clamped = Math.min(Math.max(index, 0), rowList.length - 1);
    cursorKey = rowList[clamped]?.key ?? null;
    paintCursor();
    rowList[clamped]?.element.scrollIntoView({ block: "nearest" });
  }

  /** The Parts on the way to a chapter, so a collapsed tree can show it. */
  function partsTo(part: Part, path: string, found: string[]): boolean {
    for (const chapter of part.chapters) {
      if (chapter.path === path) return true;
    }
    for (const child of part.parts) {
      if (partsTo(child, path, found)) {
        found.push(partKey(child));
        return true;
      }
    }
    return false;
  }

  /** The headings on the way to one node, itself included. */
  function nodesTo(
    nodes: readonly OutlineNode[],
    id: string,
    chapter: Chapter,
    found: string[],
  ): boolean {
    for (const node of nodes) {
      if (node.id === id) return true;
      if (nodesTo(node.children, id, chapter, found)) {
        found.push(nodeKey(chapter, node));
        return true;
      }
    }
    return false;
  }

  /** Expand whatever hides the open chapter, and return the row to start on. */
  function revealSelected(): string | null {
    if (!tree || selectedPath === null) return null;
    const chapter = chaptersIn(tree.root).find(
      (candidate) => candidate.path === selectedPath,
    );
    if (!chapter) return null;

    const opening: string[] = [];
    partsTo(tree.root, chapter.path, opening);
    let key = chapterKey(chapter);
    if (selectedNode !== null) {
      const nodes = outlines.get(chapter.path)?.nodes ?? [];
      const ancestors: string[] = [];
      if (nodesTo(nodes, selectedNode, chapter, ancestors)) {
        opening.push(chapterKey(chapter), ...ancestors);
        key = `node:${chapter.path}#${selectedNode}`;
      }
    }
    let changed = false;
    for (const id of opening) {
      if (!expanded.has(id)) {
        expanded.add(id);
        changed = true;
      }
    }
    if (changed) draw();
    return key;
  }

  /** Mark the open chapter and heading, without redrawing the tree. */
  function paint(): void {
    for (const button of element.querySelectorAll<HTMLButtonElement>(
      ".tree-button",
    )) {
      const isChapter = button.dataset["nodeId"] === undefined;
      const samePath =
        selectedPath !== null && button.dataset["path"] === selectedPath;
      const sameNode = isChapter
        ? selectedNode === null
        : button.dataset["nodeId"] === selectedNode;
      button.dataset["open"] = samePath && sameNode ? "yes" : "no";
    }
  }

  /** Open every Part on the way to a chapter, so a fresh tree shows it. */
  function expandParts(part: Part): void {
    if (holdsChapters(part)) expanded.add(partKey(part));
    for (const child of part.parts) expandParts(child);
  }

  return {
    element,

    show(next, nextOutlines) {
      tree = next;
      outlines = nextOutlines ?? new Map();
      // A document just opened shows its Parts; nothing else is guessed at.
      if (tree) expandParts(tree.root);
      draw();
    },

    select(path, nodeId = null) {
      selectedPath = path;
      selectedNode = nodeId;
      paint();
    },

    expansion() {
      return new Set(expanded);
    },

    setExpansion(ids) {
      expanded.clear();
      for (const id of ids) expanded.add(id);
      draw();
    },

    get open(): boolean {
      return open;
    },

    setOpen(next) {
      if (open === next) return;
      open = next;
      element.dataset["open"] = open ? "yes" : "no";
      hooks.onToggle?.(open);
    },

    toggle() {
      this.setOpen(!open);
    },

    rows() {
      return rowList;
    },

    get cursor(): number {
      return cursorIndex();
    },

    setCursor(index) {
      moveCursor(index);
    },

    get focused(): boolean {
      return focused;
    },

    /**
     * Take the keyboard.
     *
     * The cursor starts where Alice already is — the open chapter, or the
     * heading inside it she last opened — because starting anywhere else asks
     * her to find her place again. With nothing open it starts on the first
     * row, the only row it can name without guessing.
     */
    takeFocus() {
      if (!open) {
        openedForFocus = true;
        this.setOpen(true);
      }
      const start = revealSelected();
      if (start !== null && rowList.some((row) => row.key === start)) {
        cursorKey = start;
      } else if (cursorIndex() < 0) {
        cursorKey = rowList[0]?.key ?? null;
      }
      focused = true;
      element.dataset["focused"] = "yes";
      // The `nav` takes the focus itself: that is what stops the editing
      // surface seeing the keys.
      element.tabIndex = -1;
      element.focus();
      paintCursor();
      const at = cursorIndex();
      if (at >= 0) rowList[at]?.element.scrollIntoView({ block: "nearest" });
    },

    /**
     * Notice the keyboard already being here.
     *
     * The drawer is open — the keyboard could not have landed in it otherwise
     * — and the focus is on whatever Alice pointed at, so neither is touched.
     * A cursor is placed only where there is none, so the row she clicked is
     * not overruled by the one that was selected.
     */
    adoptFocus() {
      const active = element.ownerDocument.activeElement;
      const under =
        active === null
          ? undefined
          : rowList.find((row) => row.element.contains(active));
      if (under) cursorKey = under.key;
      else if (cursorIndex() < 0) cursorKey = rowList[0]?.key ?? null;
      focused = true;
      element.dataset["focused"] = "yes";
      paintCursor();
    },

    releaseFocus() {
      focused = false;
      element.dataset["focused"] = "no";
      element.blur();
      if (openedForFocus) {
        openedForFocus = false;
        this.setOpen(false);
      }
    },

    expandAtCursor() {
      const row = rowList[cursorIndex()];
      // No move to the first child: the chord promises to open the node, and
      // a cursor that jumped as well would be a second, unasked-for gesture.
      if (!row || !row.expandable || row.expanded) return;
      expanded.add(row.key);
      draw();
    },

    collapseAtCursor() {
      const row = rowList[cursorIndex()];
      if (!row || !row.expandable || !row.expanded) return;
      expanded.delete(row.key);
      draw();
    },

    /**
     * Open what a click would open.
     *
     * The hook is the one a click calls, so what happens next is the sidebar
     * spec's behaviour and this one inherits it. A Part is not a chapter, so
     * a Part row opens nothing.
     */
    activateCursor() {
      const row = rowList[cursorIndex()];
      if (!row || row.chapter === undefined) return false;
      if (row.node === undefined) hooks.onOpenChapter(row.chapter);
      else hooks.onOpenChapter(row.chapter, row.node);
      return true;
    },
  };
}
