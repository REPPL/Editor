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

  /** Whether a Part holds a chapter anywhere beneath it. */
  function holdsChapters(part: Part): boolean {
    return (
      part.chapters.length > 0 || part.parts.some((child) => holdsChapters(child))
    );
  }

  function draw(): void {
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
  };
}
