/**
 * The modeline at the foot of the window.
 *
 * It reports the cursor position, the prefix chord in progress, and whether
 * the mark is set, so that a half-typed `C-x` is visible rather than silent.
 */

import type { EditorView } from "@codemirror/view";

import { cursorPosition } from "./editor";
import { emacsStatus } from "./emacs";

/** What the modeline shows besides the cursor position. */
export interface ModelineContext {
  /** The chapter's display name, or null when nothing is open. */
  chapter: string | null;
  /** Whether the open chapter has unsaved edits. */
  dirty: boolean;
  /** A transient message, such as the result of a save. */
  message: string;
}

/** The modeline element and the call that refreshes it. */
export interface Modeline {
  readonly element: HTMLElement;
  update(view: EditorView | null, context: ModelineContext): void;
}

function cell(className: string): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = `modeline-cell ${className}`;
  return element;
}

/** Build the modeline. */
export function createModeline(): Modeline {
  const element = document.createElement("footer");
  element.className = "modeline";

  const chapterCell = cell("modeline-chapter");
  const positionCell = cell("modeline-position");
  const prefixCell = cell("modeline-prefix");
  const markCell = cell("modeline-mark");
  const messageCell = cell("modeline-message");
  element.append(chapterCell, positionCell, prefixCell, markCell, messageCell);

  return {
    element,
    update(view, context) {
      chapterCell.textContent = context.chapter
        ? `${context.dirty ? "**" : "--"} ${context.chapter}`
        : "-- no chapter";

      if (view) {
        const { line, column } = cursorPosition(view);
        positionCell.textContent = `L${line}:C${column}`;
        const status = emacsStatus(view);
        prefixCell.textContent = status.prefix ? `${status.prefix}-` : "";
        prefixCell.dataset["active"] = status.prefix ? "yes" : "no";
        markCell.textContent = status.markActive ? "Mark" : "";
      } else {
        positionCell.textContent = "L1:C1";
        prefixCell.textContent = "";
        markCell.textContent = "";
      }

      messageCell.textContent = context.message;
    },
  };
}
