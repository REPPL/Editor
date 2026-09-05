/**
 * The left pane: the document hierarchy as Parts and Chapters.
 */

import type { Chapter, DocumentTree, Part } from "./doctree";

/** The sidebar element and the calls that drive it. */
export interface Sidebar {
  readonly element: HTMLElement;
  /** Replace the tree on show. */
  show(tree: DocumentTree | null): void;
  /** Mark one chapter as the open one. */
  select(path: string | null): void;
}

function chapterItem(
  chapter: Chapter,
  onOpen: (chapter: Chapter) => void,
): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "tree-chapter";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tree-button";
  button.textContent = chapter.title;
  button.dataset["path"] = chapter.path;
  button.addEventListener("click", () => {
    onOpen(chapter);
  });
  item.append(button);
  return item;
}

function partList(
  part: Part,
  onOpen: (chapter: Chapter) => void,
): HTMLUListElement {
  const list = document.createElement("ul");
  list.className = "tree-list";
  for (const chapter of part.chapters) {
    list.append(chapterItem(chapter, onOpen));
  }
  for (const child of part.parts) {
    const item = document.createElement("li");
    item.className = "tree-part";
    const label = document.createElement("span");
    label.className = "tree-part-label";
    label.textContent = child.title;
    item.append(label, partList(child, onOpen));
    list.append(item);
  }
  if (part.truncated) {
    const cut = document.createElement("li");
    cut.className = "tree-truncated";
    cut.textContent = "… too deeply nested to read";
    list.append(cut);
  }
  return list;
}

/** What the sidebar asks the application to do. */
export interface SidebarHooks {
  /** A chapter was clicked. */
  onOpenChapter(chapter: Chapter): void;
  /** The Open folder button was pressed. */
  onOpenFolder(): void;
}

/** Build the sidebar. */
export function createSidebar(hooks: SidebarHooks): Sidebar {
  const onOpen = (chapter: Chapter): void => {
    hooks.onOpenChapter(chapter);
  };
  const element = document.createElement("nav");
  element.className = "sidebar";

  const heading = document.createElement("h1");
  heading.className = "sidebar-heading";
  heading.textContent = "Editor";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "sidebar-open";
  openButton.textContent = "Open folder";
  openButton.title = "Open a document folder (C-x C-f)";
  openButton.dataset["action"] = "open-folder";
  openButton.addEventListener("click", () => {
    hooks.onOpenFolder();
  });

  const body = document.createElement("div");
  body.className = "sidebar-body";

  element.append(heading, openButton, body);

  return {
    element,
    show(tree) {
      if (!tree) {
        body.replaceChildren();
        const empty = document.createElement("p");
        empty.className = "sidebar-empty";
        empty.textContent = "No document open.";
        body.append(empty);
        return;
      }
      const title = document.createElement("h2");
      title.className = "sidebar-document";
      title.textContent = tree.root.title;
      body.replaceChildren(title, partList(tree.root, onOpen));
    },
    select(path) {
      for (const button of element.querySelectorAll<HTMLButtonElement>(
        ".tree-button",
      )) {
        button.dataset["open"] =
          path !== null && button.dataset["path"] === path ? "yes" : "no";
      }
    },
  };
}
