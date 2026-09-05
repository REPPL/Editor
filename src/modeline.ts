/**
 * The modeline at the foot of the window.
 *
 * It reports the cursor position, the prefix chord in progress, and whether
 * the mark is set, so that a half-typed `C-x` is visible rather than silent.
 * Every cell that stands for an action names that action's chord in its
 * tooltip, read from the binding table rather than typed here: a chord written
 * twice is a chord that will be wrong once.
 */

import type { EditorView } from "@codemirror/view";

import { cursorPosition } from "./editor";
import { emacsStatus } from "./emacs";
import { describeChord } from "./keyspanel";

/** What the modeline shows besides the cursor position. */
export interface ModelineContext {
  /**
   * The pane holding the keyboard, by name: `Editor`, `Sidebar`, `Keys`.
   *
   * Alice never has to press a key to find out where she is, because the line
   * she already reads for the unsaved mark and her position says so.
   */
  pane?: string;
  /**
   * A prefix chord half-typed outside the editing surface.
   *
   * A `C-x` typed in the sidebar is the same half-typed chord as one typed in
   * the text, so it shows in the same cell. Absent or null means ask the
   * editing surface's own handler instead.
   */
  prefix?: string | null;
  /** The chapter's display name, or null when nothing is open. */
  chapter: string | null;
  /** Whether the open chapter has unsaved edits. */
  dirty: boolean;
  /**
   * Whether the chapter's file has gone from disk.
   *
   * A detached buffer is not lost — it is still on screen and still the
   * author's text — but its save is refused with the missing path named, so
   * the modeline has to say so rather than letting `**` imply a file to write
   * back to.
   */
  detached?: boolean;
  /** A transient message, such as the result of a save. */
  message: string;
}

/** The modeline element and the call that refreshes it. */
export interface Modeline {
  readonly element: HTMLElement;
  update(view: EditorView | null, context: ModelineContext): void;
}

function cell(className: string, title?: string): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = `modeline-cell ${className}`;
  if (title !== undefined) element.title = title;
  return element;
}

/** Build the modeline. */
export function createModeline(): Modeline {
  const element = document.createElement("footer");
  element.className = "modeline";

  const paneCell = cell(
    "modeline-pane",
    describeChord("other-window", "The pane holding the keyboard; change it"),
  );
  const chapterCell = cell(
    "modeline-chapter",
    describeChord("save-chapter", "The open chapter; save it"),
  );
  const positionCell = cell(
    "modeline-position",
    describeChord("goto-line", "Line and column; go to a line"),
  );
  const prefixCell = cell(
    "modeline-prefix",
    describeChord("keyboard-quit", "The chord in progress; cancel it"),
  );
  const markCell = cell(
    "modeline-mark",
    describeChord("set-mark", "Whether the mark is set"),
  );
  const messageCell = cell("modeline-message");
  element.append(
    paneCell,
    chapterCell,
    positionCell,
    prefixCell,
    markCell,
    messageCell,
  );

  return {
    element,
    update(view, context) {
      const pane = context.pane ?? "Editor";
      paneCell.textContent = `[${pane}]`;
      paneCell.dataset["pane"] = pane;

      if (context.chapter) {
        // `!!` is louder than `**` on purpose: the file is gone, and the next
        // save will refuse rather than write.
        const state = context.detached ? "!!" : context.dirty ? "**" : "--";
        chapterCell.textContent = `${state} ${context.chapter}`;
        chapterCell.dataset["detached"] = context.detached ? "yes" : "no";
      } else {
        chapterCell.textContent = "-- no chapter";
        chapterCell.dataset["detached"] = "no";
      }

      // One prefix cell, two readers. The editing surface's own handler
      // cannot hear a key while another pane holds the keyboard, so a prefix
      // half-typed there is fed in instead; a disagreement between the two
      // would show here, which is where it should.
      const outside =
        context.prefix !== undefined &&
        context.prefix !== null &&
        context.prefix !== "";

      if (view) {
        const { line, column } = cursorPosition(view);
        positionCell.textContent = `L${line}:C${column}`;
        const status = emacsStatus(view);
        const prefix = outside ? context.prefix : status.prefix;
        prefixCell.textContent = prefix ? `${prefix}-` : "";
        prefixCell.dataset["active"] = prefix ? "yes" : "no";
        markCell.textContent = status.markActive ? "Mark" : "";
      } else {
        positionCell.textContent = "L1:C1";
        prefixCell.textContent = outside ? `${context.prefix ?? ""}-` : "";
        prefixCell.dataset["active"] = outside ? "yes" : "no";
        markCell.textContent = "";
      }

      messageCell.textContent = context.message;
    },
  };
}
