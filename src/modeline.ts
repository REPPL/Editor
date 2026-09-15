/**
 * The modeline at the foot of the window.
 *
 * It reports the cursor position, the prefix chord in progress, and whether
 * the mark is set, so that a half-typed `C-x` is visible rather than silent.
 * Every cell that stands for an action names that action's chord in its
 * tooltip, read from the binding table rather than typed here: a chord written
 * twice is a chord that will be wrong once. The progress cell is the one
 * exception, and it is an exception because it stands for no action: it is
 * decoration carrying one fact, so it has no chord to name.
 *
 * One cell of the line speaks as well as shows. The message cell is a live
 * region, so a refusal, a prompt or the outcome of a save reaches a reader
 * who cannot see the footer (`itd-2609061324342715`, which forbids "a live
 * change … reaching sighted readers only"; `iss-2609100647545513`). It is the
 * only cell that is live, and deliberately: the chapter, the pane, `L12:C34`
 * and the trail change under the caret, and a region wide enough to hold them
 * would recite the cursor's position on every keystroke.
 */

import type { EditorView } from "@codemirror/view";

import { chapterProgress, cursorPosition } from "./editor";
import { emacsStatus, packageKeymapInstalled } from "./emacs";
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
   * Which editing window holds the keyboard, of how many.
   *
   * The ordinal in reading order, and not the chapter: the chapter is the very
   * next cell along and two cells answering one question is what this module's
   * own doc comment forbids; the ordinal is what `C-x o` moves and so the thing
   * Alice is tracking; and it is four characters where a title is as long as a
   * file name. Absent, or a count of one, leaves the cell reading exactly
   * `[Editor]` — the addition is invisible until Alice divides the area.
   */
  window?: { readonly at: number; readonly of: number };
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
  /**
   * Which announcement `message` is: a count of the times something was said.
   *
   * The footer redraws on every caret move with the standing message
   * unchanged, and the message cell is a live region, so the cell must be
   * written when the author is told something and left alone otherwise. The
   * words alone cannot tell the two apart: `C-x C-u` refused twice running
   * says `No region to change case` twice, and both refusals are the author's
   * own and must both be heard. So the caller counts what it says, and a
   * number that has moved is a new announcement however familiar the words.
   *
   * Absent means nought — a caller that never says anything, such as a test
   * exercising the other cells.
   */
  announcement?: number;
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

/**
 * How many positions the cat can take along the trail.
 *
 * Twenty, for three reasons in ascending order of weight. Every label gets a
 * round number, because each step is five per cent. It is fine enough that the
 * quantisation is invisible: one step of the trail's 132-pixel cap is 6.6
 * pixels, and the cat that marks the position is nearly fourteen. And it is
 * coarse enough that the cell writes nothing on almost every keystroke — on a
 * chapter of N characters one step is N/20 characters, so a single-character
 * move changes the drawn step once in two thousand moves on a
 * forty-thousand-character chapter.
 */
export const TRAIL_STEPS = 20;

/**
 * The proportion in words, from the step the cell is drawn at.
 *
 * From the step and from nothing else, so the words and the drawing can never
 * disagree about where the caret is. The two ends are words rather than
 * "0 per cent" and "100 per cent" because they are the two positions an author
 * actually notices and remarks on, and because a chapter of zero length lands
 * on the first of them, which is the honest thing for it to say. Every other
 * step is a multiple of five.
 */
export function trailLabel(step: number): string {
  if (step <= 0) return "Start of the chapter";
  if (step >= TRAIL_STEPS) return "End of the chapter";
  return `${String(step * (100 / TRAIL_STEPS))} per cent through the chapter`;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * The cat: five shapes, inline, in `currentColor`.
 *
 * Inline and not a file, so nothing is fetched at runtime and nothing joins
 * the asset pipeline. An outline head rather than a silhouette because the cat
 * sits over the trail at one end of its travel and over the empty track at the
 * other, so a fixed fill could not punch eye-holes that work at both ends: an
 * outline lets whatever is behind it show through, and the two eye dots are
 * `currentColor` either way. An emoji was declined — `src/` carries none, a
 * colour-font glyph would be the only coloured mark in a `currentColor`
 * footer, its metrics belong to the system font rather than to Editor, and it
 * does not follow the theme.
 *
 * Which cat this is, is taste and not mechanism: what is load-bearing is that
 * it is inline, `currentColor`, sized in `em` by the stylesheet, and
 * `aria-hidden`.
 */
function catDrawing(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "modeline-cat");
  svg.setAttribute("viewBox", "0 0 16 14");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const outline = document.createElementNS(SVG_NS, "g");
  outline.setAttribute("fill", "none");
  outline.setAttribute("stroke", "currentColor");
  outline.setAttribute("stroke-width", "1.2");
  outline.setAttribute("stroke-linejoin", "round");
  for (const d of ["M3.4 6.2 4.3 1.6 7.6 3.6", "M12.6 6.2 11.7 1.6 8.4 3.6"]) {
    const ear = document.createElementNS(SVG_NS, "path");
    ear.setAttribute("d", d);
    outline.append(ear);
  }
  const head = document.createElementNS(SVG_NS, "circle");
  head.setAttribute("cx", "8");
  head.setAttribute("cy", "8");
  head.setAttribute("r", "4.6");
  outline.append(head);
  svg.append(outline);

  for (const cx of ["6.3", "9.7"]) {
    const eye = document.createElementNS(SVG_NS, "circle");
    eye.setAttribute("cx", cx);
    eye.setAttribute("cy", "7.2");
    eye.setAttribute("r", "0.9");
    eye.setAttribute("fill", "currentColor");
    svg.append(eye);
  }
  return svg;
}

/**
 * The trail through the chapter, and the cat at its head.
 *
 * `role="img"` with an `aria-label` collapses the three elements into one
 * labelled graphic: the label is read and the cat is not announced as content.
 * `role="progressbar"` was declined — it is the semantically precise role, but
 * it is a widget role, so screen readers list it among controls and some
 * announce every value change as a live update, and this must never behave
 * like a pane (cond-2609091733494632).
 */
function progressDrawing(): HTMLSpanElement {
  const element = cell("modeline-progress");
  element.setAttribute("role", "img");
  // The start, until the first refresh says otherwise: a cell drawn at no step
  // at all would be a cell with no width and no label for the moment between
  // being built and being updated.
  element.setAttribute("aria-label", trailLabel(0));
  element.style.setProperty("--at", "0");
  element.dataset["step"] = "0";

  const track = document.createElement("span");
  track.className = "modeline-track";
  track.setAttribute("aria-hidden", "true");
  const trail = document.createElement("span");
  trail.className = "modeline-trail";
  track.append(trail);

  element.append(track, catDrawing());
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
  const progressCell = progressDrawing();
  const prefixCell = cell(
    "modeline-prefix",
    describeChord("keyboard-quit", "The chord in progress; cancel it"),
  );
  const markCell = cell(
    "modeline-mark",
    describeChord("set-mark", "Whether the mark is set"),
  );
  const messageCell = cell("modeline-message");
  // The one cell that speaks. `role="status"` names it as the place the
  // application reports what it has just done, and the two attributes beside
  // it are the implicit values of that role written out, because the implicit
  // pair is not honoured uniformly and this cell's behaviour is load-bearing.
  //
  // `polite` and never `assertive`: every message here answers a key the
  // author has just pressed, so it is never an emergency, and `assertive`
  // would cut across whatever a screen reader is in the middle of reading —
  // including the text the author is writing. A refusal that waits for the end
  // of the current phrase is still heard; one that interrupts the sentence
  // under the caret costs more than it tells.
  //
  // `aria-atomic="true"` because the message is one sentence and is read as
  // one: the cell holds a whole thought, not a field with a changing part.
  //
  // The cell is built empty and mounted before anything is said, which is the
  // condition a live region has to meet to be watched at all.
  messageCell.setAttribute("role", "status");
  messageCell.setAttribute("aria-live", "polite");
  messageCell.setAttribute("aria-atomic", "true");
  // Empty in every build where the keymap survived, which is every build:
  // the cell exists so that the one build where it did not says so where the
  // author is already looking, rather than in a console she will never open.
  const keymapCell = cell(
    "modeline-keymap",
    "The Emacs keymap installed no commands: the build dropped " +
      "@replit/codemirror-emacs's own bindings, and every chord the package " +
      "owns will do nothing (see the treeshake note in vite.config.ts)",
  );
  element.append(
    paneCell,
    chapterCell,
    positionCell,
    progressCell,
    prefixCell,
    markCell,
    keymapCell,
    messageCell,
  );

  /**
   * The step the cell was last drawn at, so it is not redrawn at the same one.
   *
   * Everything drawn is a function of the step alone — the trail's width, the
   * cat's position, the words in the label — so two calls at the same step
   * must produce the same cell, whatever else changed between them. `-1` is
   * no step, so the first call always draws.
   */
  let drawnStep = -1;

  /**
   * The message the cell was last written with, and which announcement it was.
   *
   * The same guard the trail has, for the same reason and one more. `update`
   * runs on every caret move carrying whatever is standing in the message
   * cell, so an unguarded write would put the last refusal into a live region
   * on every keystroke and a screen reader would say it on every keystroke.
   * And because the guard is what makes the cell quiet, it is also what has to
   * let the same words through twice: the announcement count is the caller's
   * word that this is a second thing said and not the first thing redrawn.
   */
  let saidMessage = "";
  let saidAnnouncement = 0;

  return {
    element,
    update(view, context) {
      const pane = context.pane ?? "Editor";
      const at = context.window;
      // `MODELINE_BUDGET` is the *message*'s floor and not this cell's, and
      // `.modeline-chapter` is the cell that yields at every width, so the five
      // extra characters are paid for by the chapter title's ellipsis.
      paneCell.textContent =
        at && at.of > 1 ? `[${pane} ${String(at.at)}/${String(at.of)}]` : `[${pane}]`;
      paneCell.dataset["pane"] = pane;
      if (at && at.of > 1) {
        paneCell.dataset["window"] = `${String(at.at)}/${String(at.of)}`;
      } else {
        delete paneCell.dataset["window"];
      }

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

      // The cat's position, quantised before it is drawn. `Math.round`, so the
      // drawn position is within half a step of the true proportion. One
      // custom property drives both the trail's width and the cat's offset, so
      // the two cannot fall out of step with each other; nothing here reads
      // layout, so nothing here can force a reflow.
      const step = view ? Math.round(chapterProgress(view) * TRAIL_STEPS) : 0;
      if (step !== drawnStep) {
        drawnStep = step;
        progressCell.style.setProperty("--at", String(step / TRAIL_STEPS));
        progressCell.setAttribute("aria-label", trailLabel(step));
        progressCell.dataset["step"] = String(step);
      }

      // Read every refresh rather than once at mount: the check is cheap, and
      // a cell that told the truth only about the moment the window opened
      // would be its own kind of lie.
      const keymap = packageKeymapInstalled();
      keymapCell.textContent = keymap ? "" : "no keymap";
      keymapCell.dataset["installed"] = keymap ? "yes" : "no";

      const announcement = context.announcement ?? 0;
      if (context.message !== saidMessage || announcement !== saidAnnouncement) {
        saidMessage = context.message;
        saidAnnouncement = announcement;
        // A text node taken away and another put in its place, rather than a
        // write to the one already there. Assigning the same string to
        // `textContent` is entitled to change nothing when the cell holds that
        // string already, and a live region that does not change says nothing
        // — which is exactly the case this branch exists to serve, the same
        // refusal said twice. Emptied first so that an empty message leaves an
        // empty cell rather than an empty text node.
        messageCell.replaceChildren();
        if (context.message !== "") messageCell.append(context.message);
      }
    },
  };
}
