/**
 * The editing surface's branch of the drop router.
 *
 * The shell has already done every part of this that touches the file system:
 * it received the native drop, classified the bytes, hashed them, converted a
 * phone-native photograph, stripped the metadata, copied the file beside the
 * chapter and recorded it. What arrives here is a finished reference, relative
 * to the chapter and percent-encoded, and this module's whole job is where it
 * goes in the text and where the cursor is left.
 *
 * The forms come from `core/inserts.ts`, so the drop and the palette write one
 * set of constructs and a plain tool reads past both.
 */

import { EditorSelection } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

import { formById } from "./core/inserts";
import type { DropOutcome, DropPayload, DropReport, PasteOutcome } from "./doctree";

/** Where text goes, and where the cursor is left after it. */
export interface Insertion {
  /** The offset the text is inserted at. */
  readonly from: number;
  /** The text itself, with the document's own line separator. */
  readonly text: string;
  /** The cursor's offset in the document after the insert. */
  readonly cursor: number;
}

/** What the surface's drop branch needs from the shell. */
export interface DropTargetServices {
  dropOnChapter(chapter: string, nonce: string): Promise<DropReport>;
  pasteReference(chapter: string, text: string): Promise<PasteOutcome>;
}

/**
 * One editing window as a drop sees it: where the text goes, and whose it is.
 *
 * The two travel together because they have to. A reference is relative to the
 * chapter the shell copied the file beside, so the chapter that is asked and the
 * window that is written must be the same one — resolving the window from the
 * pointer and the chapter from the keyboard would copy a file beside one chapter
 * and write its reference into another, where it resolves to nothing.
 */
export interface DropWindow {
  readonly view: EditorView;
  /** The chapter that window shows, or null when it shows none. */
  readonly chapter: string | null;
}

/** How the branch is built. */
export interface DropTargetOptions {
  /**
   * The editing area, whatever it is divided into.
   *
   * One drop target for the whole area, which is what it already was
   * conceptually: the listeners sit on the grid's host rather than on one
   * window's element, and which window a gesture belongs to is resolved from the
   * event. No per-window registration, and no new extension point on `App`.
   */
  readonly host: HTMLElement;
  /**
   * The window holding the keyboard. Where a paste goes.
   *
   * A paste has no coordinates worth trusting — it is a keystroke — so it goes
   * where the keyboard is.
   */
  focused(): DropWindow;
  /**
   * The window under a point in CSS pixels, or null for none. Where a drop goes.
   *
   * A drop has coordinates and Alice aimed them, so it goes where she pointed.
   */
  windowAt(x: number, y: number): DropWindow | null;
  readonly services: DropTargetServices;
  /** Say what happened, in the modeline. */
  announce?(message: string): void;
}

/** The branch, ready to hand to `createDropRouter` as its `onText`. */
export interface DropTarget {
  /** Fills `DropTargets.onText`. */
  onText(payload: DropPayload): void;
  /**
   * A pasted or dragged address. Resolves true when it wrote a video block,
   * which is the caller's cue to have suppressed the paste.
   */
  handleAddress(text: string, at: number, gesture: "paste" | "drop"): Promise<boolean>;
  /** Stop listening. */
  dispose(): void;
}

/** The video form, whose shape belongs to the one forms module. */
const VIDEO_FORM = formById("video");

/**
 * The video block, with one source named.
 *
 * The block's spelling is `core/inserts.ts`'s; only the role and the address
 * are substituted, so the drop cannot drift from the palette. No `site` or
 * `gated` entry is invented, and no poster or caption is guessed at.
 */
export function videoBlock(
  role: string,
  source: string,
  lineBreak: string,
): string {
  const form = VIDEO_FORM?.text ?? "::: {.video}\n- local: \n:::\n";
  return form
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => (line.startsWith("- ") ? `- ${role}: ${source}` : line))
    .join(lineBreak);
}

/** An image reference, with the cursor in the alt text. */
export function imageInsertion(at: number, reference: string): Insertion {
  const text = `![](${reference})`;
  return { from: at, text, cursor: at + 2 };
}

/** An ordinary link, with the cursor in the link text. */
export function linkInsertion(at: number, reference: string): Insertion {
  const text = `[](${reference})`;
  return { from: at, text, cursor: at + 1 };
}

/**
 * A fenced div at the end of the block the drop landed in.
 *
 * A block is not an inline construct, so it never splits a paragraph and never
 * rewrites a line: it goes after the block the point sits in, with a blank
 * line either side, adding only the separators that are not already there.
 * The cursor lands on the line after the block, which is where the author has
 * something to say next.
 */
export function blockInsertion(
  state: EditorState,
  at: number,
  body: string,
): Insertion {
  const br = state.lineBreak;
  const doc = state.doc;
  const point = Math.max(0, Math.min(at, doc.length));
  let line = doc.lineAt(point);

  if (line.text.trim() === "") {
    const previousBlank = line.number === 1 || doc.line(line.number - 1).text.trim() === "";
    const prefix = previousBlank ? "" : br;
    const text = prefix + body + br;
    return { from: line.from, text, cursor: line.from + text.length };
  }

  while (line.number < doc.lines) {
    const next = doc.line(line.number + 1);
    if (next.text.trim() === "") break;
    line = next;
  }
  const from = line.to;
  const prefix = br + br;
  const followedByBlank =
    line.number < doc.lines && doc.line(line.number + 1).text.trim() === "";
  const suffix = followedByBlank ? "" : br;
  return {
    from,
    text: prefix + body + suffix,
    cursor: from + prefix.length + body.length + br.length,
  };
}

/** What one accepted file writes. */
export function insertionFor(
  state: EditorState,
  at: number,
  outcome: DropOutcome,
): Insertion {
  if (outcome.kind === "video") {
    return blockInsertion(
      state,
      at,
      videoBlock("local", outcome.reference, state.lineBreak),
    );
  }
  if (outcome.kind === "image") {
    return imageInsertion(at, outcome.reference);
  }
  return linkInsertion(at, outcome.reference);
}

/** Put one insertion into the buffer and leave the cursor in its slot. */
export function applyInsertion(view: EditorView, insertion: Insertion): void {
  view.dispatch({
    changes: { from: insertion.from, insert: insertion.text },
    selection: EditorSelection.cursor(insertion.cursor),
    scrollIntoView: true,
  });
}

/**
 * Write every accepted file, in the order it was dropped.
 *
 * The point advances past each construct, so several files read down the page
 * in the order the author dropped them, and the cursor ends in the last slot.
 */
export function insertOutcomes(
  view: EditorView,
  at: number,
  outcomes: readonly DropOutcome[],
): number {
  let point = Math.max(0, Math.min(at, view.state.doc.length));
  for (const outcome of outcomes) {
    const insertion = insertionFor(view.state, point, outcome);
    applyInsertion(view, insertion);
    point = insertion.from + insertion.text.length;
  }
  return point;
}

/** The document offset under a point in CSS pixels, or the end of the text. */
export function offsetAt(view: EditorView, x: number, y: number): number {
  return view.posAtCoords({ x, y }) ?? view.state.doc.length;
}


/** What one drop's report reads as in the modeline. */
export function describe(report: DropReport): string {
  const parts: string[] = [];
  const reused = report.accepted.filter((outcome) => outcome.deduplicated).length;
  const referenced = report.accepted.filter(
    (outcome) => outcome.mode === "referenced",
  ).length;
  if (report.accepted.length > 0) {
    parts.push(
      report.accepted.length === 1
        ? "Added 1 file"
        : `Added ${String(report.accepted.length)} files`,
    );
  }
  if (reused > 0) parts.push(`${String(reused)} already here`);
  if (referenced > 0) parts.push(`${String(referenced)} too large to copy`);
  for (const refusal of report.refused) {
    parts.push(`${refusal.name}: ${refusal.reason}`);
  }
  return parts.join(" — ");
}

/**
 * Build the surface's drop branch.
 *
 * It also takes the `paste` on the editing surface, because a video address
 * arrives that way: Tauri's native drag-and-drop carries file paths only, so
 * an address reaches the page through the web view's own paste, and through
 * its own `drop` where the platform lets a non-file drag fall through.
 */
export function createDropTarget(options: DropTargetOptions): DropTarget {
  const { host, services } = options;
  const announce = options.announce ?? ((): void => undefined);

  async function handleAddress(
    text: string,
    at: number,
    gesture: "paste" | "drop",
    target: DropWindow = options.focused(),
  ): Promise<boolean> {
    const { view: into, chapter } = target;
    if (chapter === null) return false;
    let outcome: PasteOutcome;
    try {
      outcome = await services.pasteReference(chapter, text);
    } catch (error) {
      announce(String(error));
      return false;
    }
    if (outcome.kind === "video") {
      const body = videoBlock(
        outcome.role ?? "remote",
        outcome.reference,
        into.state.lineBreak,
      );
      applyInsertion(into, blockInsertion(into.state, at, body));
      announce("Added a video block");
      return true;
    }
    // A page URL from a site that offers no media address is not a video.
    // Dropped, it is an ordinary link; pasted, it is left exactly as the
    // author pasted it, because a paste that rewrites itself is unusable.
    if (gesture === "drop" && /^https?:\/\//i.test(outcome.reference)) {
      applyInsertion(into, linkInsertion(at, outcome.reference));
      announce("Added a link");
      return true;
    }
    return false;
  }

  const onPaste = (event: ClipboardEvent): void => {
    const target = options.focused();
    // The text, and only the text. The listener is on the whole editing area,
    // and CodeMirror's own panels live inside a window beside its content: a
    // paste into the search field `C-s` opens is the field's, and swallowing it
    // would put the address into the chapter instead of into the search.
    const landed = event.target;
    if (!(landed instanceof Node) || !target.view.contentDOM.contains(landed)) {
      return;
    }
    const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
    if (text === "" || !/^https?:\/\//i.test(text)) return;
    if (target.chapter === null) return;
    const at = target.view.state.selection.main.head;
    // The paste is held back until the shell has said what the address is; a
    // plain address is then pasted as text, unchanged.
    event.preventDefault();
    void handleAddress(text, at, "paste", target).then((wrote) => {
      if (wrote) return;
      applyInsertion(target.view, { from: at, text, cursor: at + text.length });
    });
  };

  const onDomDrop = (event: DragEvent): void => {
    const text = event.dataTransfer?.getData("text/uri-list") ?? "";
    const address = (text || event.dataTransfer?.getData("text/plain") || "").trim();
    if (address === "" || !/^https?:\/\//i.test(address)) return;
    const target =
      options.windowAt(event.clientX, event.clientY) ?? options.focused();
    if (target.chapter === null) return;
    event.preventDefault();
    const at = offsetAt(target.view, event.clientX, event.clientY);
    void handleAddress(address, at, "drop", target);
  };

  host.addEventListener("paste", onPaste);
  host.addEventListener("drop", onDomDrop);

  return {
    onText(payload: DropPayload): void {
      // The window Alice aimed at, and nothing at all where she aimed outside
      // the editing area: a drop on the sidebar is the sidebar's branch.
      const target = options.windowAt(payload.x, payload.y);
      if (target === null) return;
      // That window's chapter, because the shell copies the file beside the
      // chapter it is told about and returns a reference relative to it. Asking
      // the focused window instead would copy the file beside one chapter and
      // write its reference into another, where it resolves to nothing.
      const chapter = target.chapter;
      if (chapter === null) {
        announce("Open a chapter before dropping a file into it");
        return;
      }
      const at = offsetAt(target.view, payload.x, payload.y);
      void (async () => {
        try {
          const report = await services.dropOnChapter(chapter, payload.nonce);
          insertOutcomes(target.view, at, report.accepted);
          announce(describe(report));
        } catch (error) {
          announce(String(error));
        }
      })();
    },
    handleAddress,
    dispose(): void {
      host.removeEventListener("paste", onPaste);
      host.removeEventListener("drop", onDomDrop);
    },
  };
}
