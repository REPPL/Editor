/**
 * The insert palette: one chord, three letters, the canonical form.
 *
 * Nothing about a construct's spelling lives here. `src/core/inserts.ts` is
 * the one table of canonical forms and their cursor offsets; this module is
 * the overlay over it, and the single transaction that puts one in the buffer.
 * One transaction matters twice: undo takes an insertion back in one press,
 * and the buffer's text after the insertion is what a save writes, byte for
 * byte.
 */

import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

import {
  formsVisibleIn,
  matchForms,
  type InsertForm,
} from "./core/inserts";
import {
  openListOverlay,
  type ListEntry,
  type Overlay,
} from "./overlay";

/**
 * The phase whose forms the palette offers.
 *
 * A later phase changes this number; no form moves, and none is written twice.
 */
export const PALETTE_PHASE = 1;

/** What the palette needs from the application. */
export interface PaletteHooks {
  /** Where the overlay is mounted. */
  readonly host?: HTMLElement;
  /** Say something in the modeline — a refusal, or what was inserted. */
  announce?(message: string): void;
}

/** Whether a line is an ATX heading, which is what a divider attaches to. */
function isHeading(line: string): boolean {
  return /^\s{0,3}#{1,6}\s/.test(line);
}

/** One change and one selection: what choosing a form comes to. */
export interface Insertion {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
  readonly cursor: number;
}

/**
 * Work out the single edit a form makes at the cursor.
 *
 * A `block` is pushed onto a paragraph of its own: a blank line before it when
 * the cursor's line already holds text, and a line break after it when text
 * follows the cursor on that line. On a blank line the form goes in exactly as
 * the canon writes it, which is the criterion the intent states. An `inline`
 * goes in where the cursor is, with nothing added. A `heading-attribute`
 * appends to the heading on the cursor's line and inserts no block at all;
 * with no heading there, it refuses and writes nothing.
 */
export function insertionFor(
  view: EditorView,
  form: InsertForm,
): Insertion | { refused: string } {
  const state = view.state;
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);

  if (form.shape === "heading-attribute") {
    if (!isHeading(line.text)) {
      return {
        refused: `${form.label} needs a heading on this line`,
      };
    }
    const at = line.to;
    return { from: at, to: at, insert: form.text, cursor: at + form.text.length };
  }

  if (form.shape === "inline") {
    const from = state.selection.main.from;
    const to = state.selection.main.to;
    return { from, to, insert: form.text, cursor: from + form.cursor };
  }

  const before = line.text.slice(0, head - line.from);
  const after = line.text.slice(head - line.from);
  const prefix = before.trim() === "" ? "" : "\n\n";
  const suffix = after.trim() === "" ? "" : "\n";
  const insert = `${prefix}${form.text}${suffix}`;
  return {
    from: head,
    to: state.selection.main.to,
    insert,
    cursor: head + prefix.length + form.cursor,
  };
}

/** Put one form in the buffer. Returns the refusal, if it was refused. */
export function insertForm(
  view: EditorView,
  form: InsertForm,
): string | null {
  const planned = insertionFor(view, form);
  if ("refused" in planned) return planned.refused;
  view.dispatch({
    changes: { from: planned.from, to: planned.to, insert: planned.insert },
    selection: EditorSelection.cursor(planned.cursor),
    scrollIntoView: true,
  });
  view.focus();
  return null;
}

/**
 * Open the palette over the editing surface.
 *
 * The list, the highlight and the cancel are `openListOverlay`'s, which the
 * command palette opens too: one overlay seen twice, so the two cannot drift.
 * What is this module's is only which forms are offered and what choosing one
 * writes.
 */
export function openPalette(view: EditorView, hooks: PaletteHooks = {}): Overlay {
  const offered = formsVisibleIn(PALETTE_PHASE);
  return openListOverlay<InsertForm & ListEntry>({
    ...(hooks.host ? { host: hooks.host } : {}),
    className: "palette",
    label: "Insert a construct",
    paneLabel: "Insert",
    rowKey: "form",
    placeholder: "Insert…",
    fieldLabel: "Filter constructs",
    entries: (query) => matchForms(query, offered),
    onChoose: (form) => {
      const refusal = insertForm(view, form);
      hooks.announce?.(refusal ?? `Inserted ${form.label}`);
    },
    onClose: (chosen) => {
      if (!chosen) view.focus();
    },
  });
}
