/**
 * `M-x`: one place to reach anything the keyboard reaches.
 *
 * The palette is a view over two tables and copies neither. Its rows are every
 * binding the page can run from the text — every row of `src/keys.ts` in the
 * `editor` scope whose owner is not `shell`, because a menu accelerator has no
 * page-side command and a `sidebar` row is answered by a pane the palette is
 * not open over — plus every
 * insert form `src/core/inserts.ts` offers in this phase. Choosing a binding
 * runs it through `runBinding`; choosing a form inserts it through the insert
 * palette's own `insertForm`. Nothing about a chord, a label, or a canonical
 * form is written here.
 *
 * The overlay is `openListOverlay`, the same one the insert palette opens, so
 * movement and cancelling are the one contract rather than a second copy.
 */

import type { EditorView } from "@codemirror/view";

import { formsVisibleIn, type InsertForm } from "./core/inserts";
import { runBinding } from "./emacs";
import { BINDINGS, scopeOf, type Binding } from "./keys";
import { openListOverlay, type ListEntry, type Overlay } from "./overlay";
import { insertForm, PALETTE_PHASE } from "./palette";

/** The prefix an insert form's entry carries, so the two spaces cannot collide. */
export const INSERT_PREFIX = "insert:";

/** One row of the command palette. */
export interface CommandEntry extends ListEntry {
  /** The binding row this entry runs, or null for an insert form. */
  readonly binding: Binding | null;
  /** The insert form this entry writes, or null for a binding. */
  readonly form: InsertForm | null;
}

/** What the palette needs from the application. */
export interface CommandPaletteHooks {
  /** Where the overlay is mounted. */
  readonly host?: HTMLElement;
  /** Say something in the modeline — what ran, or why nothing did. */
  announce?(message: string): void;
}

/**
 * Every entry the palette offers, in the order the tables list them.
 *
 * Read at open time, never cached: a row added to either table is a row here.
 */
export function commandEntries(): readonly CommandEntry[] {
  const entries: CommandEntry[] = [];
  for (const binding of BINDINGS) {
    // A `shell` row is the window menu's accelerator; the page has no command
    // behind it, so offering it would be a dead end.
    if (binding.owner === "shell") continue;
    // `M-x` is opened over the text, and the text is where the row it runs
    // has to answer. A `sidebar` row is the tree's — it moves a cursor the
    // palette is not looking at, and `runBinding` would otherwise resolve it
    // by chord against whatever the editor binds the same chord to: Return on
    // "Open the chapter here" would insert a newline. Both ends refuse.
    if (scopeOf(binding) !== "editor") continue;
    entries.push({
      id: binding.id,
      label: binding.label,
      binding,
      form: null,
    });
  }
  for (const form of formsVisibleIn(PALETTE_PHASE)) {
    entries.push({
      id: `${INSERT_PREFIX}${form.id}`,
      label: form.label,
      binding: null,
      form,
    });
  }
  return entries;
}

/** How well an entry matches, lowest first; `null` means it does not. */
function rank(entry: CommandEntry, needle: string): number | null {
  const label = entry.label.toLowerCase();
  const id = entry.id.toLowerCase();
  if (label.startsWith(needle)) return 0;

  const words = label.split(/[^a-z0-9]+/i).filter((word) => word !== "");
  if (words.some((word) => word.startsWith(needle))) return 1;

  const initials = words.map((word) => word.charAt(0)).join("");
  if (initials.startsWith(needle)) return 2;

  if (id.includes(needle)) return 3;
  if (isSubsequence(needle, label)) return 4;
  return null;
}

/** Whether every character of `needle` appears in `haystack`, in order. */
function isSubsequence(needle: string, haystack: string): boolean {
  let at = 0;
  for (const character of haystack) {
    if (character === needle.charAt(at)) at += 1;
    if (at === needle.length) return true;
  }
  return needle.length === 0;
}

/**
 * The entries a query matches, best first.
 *
 * Label prefix, then label-word prefix, then the initials of the label's words
 * — which is what puts `Transpose words` first for `tw` — then the id, then a
 * subsequence anywhere. Ties keep the tables' own order.
 */
export function matchCommands(
  query: string,
  entries: readonly CommandEntry[] = commandEntries(),
): readonly CommandEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return entries;
  const scored: { entry: CommandEntry; score: number; at: number }[] = [];
  entries.forEach((entry, at) => {
    const score = rank(entry, needle);
    if (score !== null) scored.push({ entry, score, at });
  });
  return scored
    .sort((a, b) => a.score - b.score || a.at - b.at)
    .map((entry) => entry.entry);
}

/** Run one entry. Returns what the modeline should say. */
export function runEntry(view: EditorView, entry: CommandEntry): string {
  if (entry.form) {
    return insertForm(view, entry.form) ?? `Inserted ${entry.form.label}`;
  }
  if (entry.binding) {
    return runBinding(view, entry.binding.id) ?? "";
  }
  return `${entry.label} did nothing here`;
}

/** Open the command palette over the editing surface. */
export function openCommandPalette(
  view: EditorView,
  hooks: CommandPaletteHooks = {},
): Overlay {
  const offered = commandEntries();
  return openListOverlay<CommandEntry>({
    ...(hooks.host ? { host: hooks.host } : {}),
    className: "palette",
    label: "Run a command",
    paneLabel: "M-x",
    rowKey: "command",
    placeholder: "M-x…",
    fieldLabel: "Filter commands",
    entries: (query) => matchCommands(query, offered),
    onChoose: (entry) => {
      const said = runEntry(view, entry);
      if (said !== "") hooks.announce?.(said);
    },
    onClose: (chosen) => {
      // Cancelling changes not one byte, and the keyboard goes back to where
      // it came from with the selection it had.
      if (!chosen) view.focus();
    },
  });
}
