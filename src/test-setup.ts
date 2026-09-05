/**
 * The DOM facilities jsdom does not implement, faked well enough for
 * CodeMirror.
 *
 * jsdom has no layout engine: `Range.getClientRects` is missing and every
 * element measures zero. CodeMirror asks for coordinates whenever a command
 * is geometric — moving by visual line, moving to a wrapped line's boundary,
 * recentring — so without this the editor throws instead of moving the
 * cursor.
 *
 * The fake is a monospace grid: every line is `LINE_HEIGHT` tall and stacked
 * in document order, every character is `CHAR_WIDTH` wide. That is enough for
 * the commands to agree with the document, and it is honest about its limits:
 * it says nothing about how a real engine wraps, shapes, or scrolls text. The
 * spike's manual checklist covers what only a real engine can answer.
 *
 * Loaded by `vitest.config.ts` as a setup file; it is never bundled into the
 * application.
 */

/** The width of one character in the fake grid. */
const CHAR_WIDTH = 8;
/** The height of one line in the fake grid. */
const LINE_HEIGHT = 16;
/** The size of the fake viewport. */
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

function makeRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return new DOMRect(left, top, width, height);
}

function rectList(rects: DOMRect[]): DOMRectList {
  const list = {
    length: rects.length,
    item: (index: number): DOMRect | null => rects[index] ?? null,
    [Symbol.iterator]: () => rects[Symbol.iterator](),
  };
  Object.assign(list, rects);
  return list as unknown as DOMRectList;
}

/** The `.cm-line` element a node sits inside, if any. */
function lineElementOf(node: Node | null): Element | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof Element && current.classList.contains("cm-line")) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

/** Where a line sits in the stack of lines. */
function lineIndexOf(line: Element): number {
  const content = line.closest(".cm-content");
  if (!content) return 0;
  const lines = Array.from(content.querySelectorAll(".cm-line"));
  return Math.max(0, lines.indexOf(line));
}

/** The character offset of a DOM position within its line. */
function columnOf(line: Element, node: Node, offset: number): number {
  if (node === line || node.nodeType !== Node.TEXT_NODE) {
    const children = Array.from(node.childNodes).slice(0, offset);
    return children.reduce((sum, child) => sum + (child.textContent ?? "").length, 0);
  }
  let column = 0;
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current === node) return column + offset;
    column += current.nodeValue?.length ?? 0;
    current = walker.nextNode();
  }
  return column;
}

function rangeRects(range: Range): DOMRect[] {
  const line = lineElementOf(range.startContainer);
  if (!line) return [];
  const top = lineIndexOf(line) * LINE_HEIGHT;
  const from = columnOf(line, range.startContainer, range.startOffset);
  const to = columnOf(
    lineElementOf(range.endContainer) ?? line,
    range.endContainer,
    range.endOffset,
  );
  const left = Math.min(from, to) * CHAR_WIDTH;
  const right = Math.max(from, to) * CHAR_WIDTH;
  return [makeRect(left, top, right - left, LINE_HEIGHT)];
}

function elementRect(element: Element): DOMRect {
  if (element.classList.contains("cm-line")) {
    return makeRect(0, lineIndexOf(element) * LINE_HEIGHT, VIEW_WIDTH, LINE_HEIGHT);
  }
  const content = element.classList.contains("cm-content")
    ? element
    : element.querySelector(".cm-content");
  if (content) {
    const lines = content.querySelectorAll(".cm-line").length || 1;
    return makeRect(0, 0, VIEW_WIDTH, lines * LINE_HEIGHT);
  }
  return makeRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

Range.prototype.getClientRects = function getClientRects(
  this: Range,
): DOMRectList {
  return rectList(rangeRects(this));
};

Range.prototype.getBoundingClientRect = function getBoundingClientRect(
  this: Range,
): DOMRect {
  return rangeRects(this)[0] ?? makeRect(0, 0, 0, 0);
};

Element.prototype.getClientRects = function getClientRects(
  this: Element,
): DOMRectList {
  return rectList([elementRect(this)]);
};

Element.prototype.getBoundingClientRect = function getBoundingClientRect(
  this: Element,
): DOMRect {
  return elementRect(this);
};

Element.prototype.scrollIntoView = function scrollIntoView(): void {
  // No layout, nothing to scroll.
};

// `M-w` copies the region through the asynchronous clipboard API, which jsdom
// does not provide.
if (!("clipboard" in navigator)) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: (): Promise<void> => Promise.resolve(),
      readText: (): Promise<string> => Promise.resolve(""),
    },
  });
}
