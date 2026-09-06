/**
 * The outline vocabulary: the document model as headings, the way Emacs's
 * Markdown mode and Org mode treat it.
 *
 * Every command here is a plain function of a view, in the shape
 * `src/prose.ts` already proved for tier one: `null` when it acted, a short
 * refusal when it did not, which the application announces in the modeline.
 * Heading structure is read through `core/parse.ts`'s `parseChapter` — the
 * same tree `core/outline.ts` derives the sidebar's outline from — never
 * through CodeMirror's own Markdown grammar, so the two can never disagree
 * about what a heading is (`itd-2609051336090390`, one source, always).
 *
 * Folding and narrowing never call `view.dispatch` with a document change:
 * both are CodeMirror decorations over the untouched text, so
 * `documentText(view)` — what every save reads — is identical whichever
 * state either is in. That is what lets the round-trip byte-fidelity
 * discipline hold by construction rather than by care for those two.
 *
 * Promote, demote and moving a section do change the document, but only the
 * exact line ranges the operation names, computed from the state before any
 * dispatch and applied in one transaction, so the operation either wholly
 * applies or wholly refuses.
 */

import {
  EditorSelection,
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
  type Text,
} from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import {
  codeFolding,
  foldEffect,
  foldService,
  foldedRanges,
  toggleFold,
  unfoldAll,
} from "@codemirror/language";

import { parseChapter } from "./core/parse";
import type { Chapter } from "./core/tree";
import { walkBlocks } from "./core/tree";
import { revealLine } from "./editor";
import { openListOverlay, type ListEntry, type Overlay } from "./overlay";

// ------------------------------------------------------------------ shared

/** What a heading command needs to know about one heading. */
interface HeadingRef {
  readonly line: number;
  readonly level: number;
}

/** Every heading of a chapter, in document order, regardless of level. */
function orderedHeadings(chapter: Chapter): HeadingRef[] {
  const found: HeadingRef[] = [];
  for (const block of walkBlocks(chapter.blocks)) {
    if (block.kind === "heading") {
      found.push({ line: block.line, level: block.level ?? 1 });
    }
  }
  return found;
}

/**
 * The parsed chapter for a state, cached against the last state seen.
 *
 * A single slot, not a `WeakMap`: every command in this module reads the
 * view it was just handed, so the one most recently parsed is always the one
 * about to be asked for again. `foldAll` alone can ask dozens of times in one
 * call, and this is what stops that becoming dozens of parses.
 */
let cachedFor: Text | null = null;
let cached: Chapter | null = null;

function chapterOf(state: EditorState): Chapter {
  if (cachedFor === state.doc && cached) return cached;
  const chapter = parseChapter(documentTextOf(state));
  cachedFor = state.doc;
  cached = chapter;
  return chapter;
}

/** `documentText` reads a view; folding is asked for a state alone. */
function documentTextOf(state: EditorState): string {
  return state.sliceDoc();
}

/** The one-based line the cursor is on. */
function cursorLine(view: EditorView): number {
  return view.state.doc.lineAt(view.state.selection.main.head).number;
}

/** The headings of the view's chapter, and the index of the current one. */
function context(view: EditorView): { headings: HeadingRef[]; index: number } {
  const headings = orderedHeadings(chapterOf(view.state));
  const line = cursorLine(view);
  let index = -1;
  for (let i = 0; i < headings.length; i += 1) {
    if ((headings[i] as HeadingRef).line <= line) index = i;
    else break;
  }
  return { headings, index };
}

/**
 * The last line belonging to a heading's subtree.
 *
 * The line before the next heading whose level is at most the given
 * heading's own, or the document's last line with no such heading.
 */
function subtreeEndLine(
  headings: readonly HeadingRef[],
  index: number,
  totalLines: number,
): number {
  const level = (headings[index] as HeadingRef).level;
  for (let i = index + 1; i < headings.length; i += 1) {
    if ((headings[i] as HeadingRef).level <= level) {
      return (headings[i] as HeadingRef).line - 1;
    }
  }
  return totalLines;
}

// --------------------------------------------------------------- movement

export const NOT_IN_A_SECTION = "Not in a section";
export const NO_NEXT_HEADING = "No heading after this one";
export const NO_PREVIOUS_HEADING = "No heading before this one";
export const NO_NEXT_SIBLING = "No next heading at this level";
export const NO_PREVIOUS_SIBLING = "No previous heading at this level";
export const NO_PARENT_HEADING = "This heading has no parent";

/** `C-c C-n`: the next heading, at any level. */
export function nextHeading(view: EditorView): string | null {
  const headings = orderedHeadings(chapterOf(view.state));
  const line = cursorLine(view);
  const next = headings.find((heading) => heading.line > line);
  if (!next) return NO_NEXT_HEADING;
  revealLine(view, next.line);
  return null;
}

/** `C-c p`: the previous heading, at any level. */
export function previousHeading(view: EditorView): string | null {
  const headings = orderedHeadings(chapterOf(view.state));
  const line = cursorLine(view);
  const before = headings.filter((heading) => heading.line < line);
  const previous = before[before.length - 1];
  if (!previous) return NO_PREVIOUS_HEADING;
  revealLine(view, previous.line);
  return null;
}

/**
 * `C-c C-f`/`C-c C-b`: the next or previous heading at the current one's own
 * level, refusing the moment a shallower heading is crossed first — which is
 * what makes the result a sibling rather than a heading in a different
 * parent's subtree.
 */
function sameLevelHeading(
  view: EditorView,
  direction: 1 | -1,
  notInSection: string,
  noSibling: string,
): string | null {
  const { headings, index } = context(view);
  if (index === -1) return notInSection;
  const level = (headings[index] as HeadingRef).level;
  for (
    let i = index + direction;
    direction === 1 ? i < headings.length : i >= 0;
    i += direction
  ) {
    const heading = headings[i] as HeadingRef;
    if (heading.level < level) break;
    if (heading.level === level) {
      revealLine(view, heading.line);
      return null;
    }
  }
  return noSibling;
}

export function forwardSameLevelHeading(view: EditorView): string | null {
  return sameLevelHeading(view, 1, NOT_IN_A_SECTION, NO_NEXT_SIBLING);
}

export function backwardSameLevelHeading(view: EditorView): string | null {
  return sameLevelHeading(view, -1, NOT_IN_A_SECTION, NO_PREVIOUS_SIBLING);
}

/** `C-c C-u`: up to the parent heading — the nearest shallower one before it. */
export function upHeading(view: EditorView): string | null {
  const { headings, index } = context(view);
  if (index === -1) return NOT_IN_A_SECTION;
  const level = (headings[index] as HeadingRef).level;
  for (let i = index - 1; i >= 0; i -= 1) {
    const heading = headings[i] as HeadingRef;
    if (heading.level < level) {
      revealLine(view, heading.line);
      return null;
    }
  }
  return NO_PARENT_HEADING;
}

// ------------------------------------------------------------------ folding

/**
 * A `@codemirror/language` fold service, computed from `core/parse.ts`'s own
 * tree rather than CodeMirror's Markdown grammar. Registering it is the
 * whole of folding: `toggleFold`, `foldAll` and `unfoldAll` all consult it
 * through `foldable()` before falling back to any syntax-tree-based folding,
 * and none of the three touches the document — each dispatches an effect a
 * decoration field reads.
 */
function headingFoldRange(
  state: EditorState,
  lineStart: number,
): { from: number; to: number } | null {
  const chapter = chapterOf(state);
  const headings = orderedHeadings(chapter);
  const line = state.doc.lineAt(lineStart).number;
  const index = headings.findIndex((heading) => heading.line === line);
  if (index === -1) return null;
  const endLine = subtreeEndLine(headings, index, state.doc.lines);
  const heading = headings[index] as HeadingRef;
  if (endLine <= heading.line) return null;
  const from = state.doc.line(heading.line).to;
  const to = state.doc.line(Math.min(endLine, state.doc.lines)).to;
  return to > from ? { from, to } : null;
}

export const NOTHING_TO_FOLD = "Nothing to fold here";

/** `Tab`: fold or unfold the section under the cursor. */
export function toggleHeadingFold(view: EditorView): string | null {
  return toggleFold(view) ? null : NOTHING_TO_FOLD;
}

/**
 * The heading level the outline's own top belongs to.
 *
 * Level one is a chapter's own title (`core/outline.ts`'s `FIRST_LEVEL`
 * starts the sidebar's outline at level two for the same reason): folding
 * everything below the title, rather than each of its top-level sections in
 * turn, is not "the outermost headings" the acceptance criterion means.
 */
const OUTLINE_TOP_LEVEL = 2;

/**
 * `S-Tab`: cycle the whole outline.
 *
 * Two states, not Org's exact three (`cond-2609061344224051`): every
 * level-two heading's subtree folded, or everything open. Folding stops at
 * the outline's own top level rather than walking the document with
 * `foldAll` from position zero, because a chapter's level-one title would
 * otherwise fold its entire body on the first press — a heavier default than
 * the acceptance criterion's "outermost headings" asks for. Each fold is
 * still dispatched as the same `foldEffect` `codeFolding()` keeps and
 * `unfoldAll` clears, so the storage and the decoration are CodeMirror's own.
 */
export function cycleOutline(view: EditorView): string | null {
  if (foldedRanges(view.state).size > 0) {
    unfoldAll(view);
    return null;
  }
  const headings = orderedHeadings(chapterOf(view.state));
  const effects = headings
    .filter((heading) => heading.level === OUTLINE_TOP_LEVEL)
    .map((heading) => headingFoldRange(view.state, view.state.doc.line(heading.line).from))
    .filter((range): range is { from: number; to: number } => range !== null)
    .map((range) => foldEffect.of(range));
  if (effects.length === 0) return "Nothing to fold in this chapter";
  view.dispatch({ effects });
  return null;
}

/**
 * The extensions folding and narrowing need, spliced into
 * `editorExtensions()` in `src/editor.ts`.
 */
export function outlineExtensions(): Extension[] {
  return [codeFolding(), foldService.of(headingFoldRange), narrowField, narrowDecorationField];
}

// ---------------------------------------------------------- promote/demote

export const NOTHING_TO_PROMOTE = "Cannot promote past the top level";
export const NOTHING_TO_DEMOTE = "Cannot demote past level six";
export const NOT_AN_ATX_HEADING =
  "Promote and demote apply only to a heading written with #";

/** An ATX heading line: up to three spaces, one to six `#`, then its text. */
const ATX_HEADING = /^( {0,3})(#{1,6})(\s.*)?$/;

/** The current heading and every heading of its subtree, by index. */
function affectedHeadingIndices(
  headings: readonly HeadingRef[],
  index: number,
): number[] {
  const level = (headings[index] as HeadingRef).level;
  const affected = [index];
  for (let i = index + 1; i < headings.length; i += 1) {
    if ((headings[i] as HeadingRef).level <= level) break;
    affected.push(i);
  }
  return affected;
}

function shiftHeadingLevel(
  view: EditorView,
  delta: -1 | 1,
  limitMessage: string,
): string | null {
  const { headings, index } = context(view);
  if (index === -1) return NOT_IN_A_SECTION;
  const affected = affectedHeadingIndices(headings, index);
  const doc = view.state.doc;
  const changes: { from: number; to: number; insert: string }[] = [];
  for (const i of affected) {
    const heading = headings[i] as HeadingRef;
    const newLevel = heading.level + delta;
    if (newLevel < 1 || newLevel > 6) return limitMessage;
    const line = doc.line(heading.line);
    const match = ATX_HEADING.exec(line.text);
    if (!match) return NOT_AN_ATX_HEADING;
    const indent = match[1] ?? "";
    const rest = match[3] ?? "";
    changes.push({
      from: line.from,
      to: line.to,
      insert: `${indent}${"#".repeat(newLevel)}${rest}`,
    });
  }
  view.dispatch({ changes });
  return null;
}

/** `C-c Left`: promote the heading and its subtree one level. */
export function promoteHeading(view: EditorView): string | null {
  return shiftHeadingLevel(view, -1, NOTHING_TO_PROMOTE);
}

/** `C-c Right`: demote the heading and its subtree one level. */
export function demoteHeading(view: EditorView): string | null {
  return shiftHeadingLevel(view, 1, NOTHING_TO_DEMOTE);
}

// --------------------------------------------------------- moving a section

export const NO_SECTION_TO_MOVE = "No section to swap with at this level";

/**
 * `C-c Up`/`C-c Down`: swap the current section, subtree included, with its
 * nearest same-level sibling in the given direction.
 *
 * The same "stop at a shallower heading" rule as same-level movement finds
 * the sibling, which is also what guarantees the two sections are always
 * contiguous: the sibling's own subtree, by construction, ends exactly where
 * the other section begins. Swapping is two non-overlapping changes in one
 * transaction; nothing outside their combined span moves.
 */
function moveHeadingBy(view: EditorView, direction: 1 | -1): string | null {
  const { headings, index } = context(view);
  if (index === -1) return NOT_IN_A_SECTION;
  const level = (headings[index] as HeadingRef).level;
  let siblingIndex = -1;
  for (
    let i = index + direction;
    direction === 1 ? i < headings.length : i >= 0;
    i += direction
  ) {
    const heading = headings[i] as HeadingRef;
    if (heading.level < level) break;
    if (heading.level === level) {
      siblingIndex = i;
      break;
    }
  }
  if (siblingIndex === -1) return NO_SECTION_TO_MOVE;

  const doc = view.state.doc;
  const totalLines = doc.lines;
  const firstIndex = Math.min(index, siblingIndex);
  const secondIndex = Math.max(index, siblingIndex);
  const firstEnd = subtreeEndLine(headings, firstIndex, totalLines);
  const secondEnd = subtreeEndLine(headings, secondIndex, totalLines);
  const firstFrom = doc.line((headings[firstIndex] as HeadingRef).line).from;
  const firstTo = doc.line(Math.min(firstEnd, totalLines)).to;
  const secondFrom = doc.line((headings[secondIndex] as HeadingRef).line).from;
  const secondTo = doc.line(Math.min(secondEnd, totalLines)).to;
  const firstText = doc.sliceString(firstFrom, firstTo);
  const secondText = doc.sliceString(secondFrom, secondTo);

  view.dispatch({
    changes: [
      { from: firstFrom, to: firstTo, insert: secondText },
      { from: secondFrom, to: secondTo, insert: firstText },
    ],
  });
  return null;
}

export function moveHeadingUp(view: EditorView): string | null {
  return moveHeadingBy(view, -1);
}

export function moveHeadingDown(view: EditorView): string | null {
  return moveHeadingBy(view, 1);
}

// --------------------------------------------------------- region markup

/** Wrap a selection in a marker pair, or open an empty pair at the cursor. */
function wrapOrInsert(view: EditorView, marker: string): void {
  const { state } = view;
  const range = state.selection.main;
  if (range.empty) {
    const at = range.from;
    view.dispatch({
      changes: { from: at, to: at, insert: marker + marker },
      selection: EditorSelection.cursor(at + marker.length),
      scrollIntoView: true,
    });
    return;
  }
  const text = state.sliceDoc(range.from, range.to);
  const insert = marker + text + marker;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.cursor(range.from + insert.length),
    scrollIntoView: true,
  });
}

/** `C-c C-s b`: bold the selection, or open `**|**`. */
export function boldRegion(view: EditorView): string | null {
  wrapOrInsert(view, "**");
  return null;
}

/** `C-c C-s i`: italicise the selection, or open `*|*`. */
export function italicRegion(view: EditorView): string | null {
  wrapOrInsert(view, "*");
  return null;
}

/**
 * Insert `prefix[label]()`, a selection becoming the label; with no
 * selection, place the cursor between the square brackets, and with one,
 * between the parentheses — where the next thing typed belongs either way.
 */
function insertBracketed(view: EditorView, prefix: string): void {
  const { state } = view;
  const range = state.selection.main;
  if (range.empty) {
    const insert = `${prefix}[]()`;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: EditorSelection.cursor(range.from + prefix.length + 1),
      scrollIntoView: true,
    });
    return;
  }
  const label = state.sliceDoc(range.from, range.to);
  const insert = `${prefix}[${label}]()`;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.cursor(range.from + insert.length - 1),
    scrollIntoView: true,
  });
}

/** `C-c l`: insert a link template. */
export function insertLink(view: EditorView): string | null {
  insertBracketed(view, "");
  return null;
}

/** `C-c C-i`: insert an image template. */
export function insertImage(view: EditorView): string | null {
  insertBracketed(view, "!");
  return null;
}

// -------------------------------------------------------------- narrowing

/** Move a view to a narrowed range, or clear it. */
const setNarrow = StateEffect.define<{ from: number; to: number } | null>();

/**
 * The narrowed range, if any, mapped through every edit.
 *
 * Only the range is held here; `narrowDecorationField` below derives what to
 * hide from it. Neither ever appears in a document change, which is the
 * whole of why narrowing cannot produce a truncated write: `documentText`
 * never looks at either field.
 */
const narrowField = StateField.define<{ from: number; to: number } | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setNarrow)) return effect.value;
    }
    if (value === null) return null;
    const from = transaction.changes.mapPos(value.from, -1);
    const to = transaction.changes.mapPos(value.to, 1);
    return from < to ? { from, to } : null;
  },
});

const HIDDEN_LINE = Decoration.line({ attributes: { class: "cm-outline-narrowed" } });

function narrowDecorations(state: EditorState): DecorationSet {
  const range = state.field(narrowField, false) ?? null;
  if (!range) return Decoration.none;
  const doc = state.doc;
  const firstLine = doc.lineAt(range.from).number;
  const lastLine = doc.lineAt(Math.max(range.to - 1, range.from)).number;
  const decorations = [];
  for (let n = 1; n <= doc.lines; n += 1) {
    if (n >= firstLine && n <= lastLine) continue;
    decorations.push(HIDDEN_LINE.range(doc.line(n).from));
  }
  return Decoration.set(decorations);
}

const narrowDecorationField = StateField.define<DecorationSet>({
  create: (state) => narrowDecorations(state),
  update(value, transaction) {
    if (transaction.effects.some((effect) => effect.is(setNarrow))) {
      return narrowDecorations(transaction.state);
    }
    return transaction.docChanged ? narrowDecorations(transaction.state) : value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const NOTHING_TO_NARROW_TO = "Not in a section to narrow to";
export const NOT_NARROWED = "Not narrowed";

/**
 * `C-x n n`: narrow to the section under the cursor.
 *
 * A visual aid only (`cond-2609061344223793`): it hides every line outside
 * the section from the window, but the document, the cursor and every other
 * command still reach the whole chapter. Because nothing about the model
 * narrows, a save while narrowed writes every byte of the file, hidden lines
 * included.
 */
export function narrowToSection(view: EditorView): string | null {
  const { headings, index } = context(view);
  if (index === -1) return NOTHING_TO_NARROW_TO;
  const doc = view.state.doc;
  const totalLines = doc.lines;
  const endLine = subtreeEndLine(headings, index, totalLines);
  const from = doc.line((headings[index] as HeadingRef).line).from;
  const to = doc.line(Math.min(endLine, totalLines)).to;
  view.dispatch({ effects: setNarrow.of({ from, to }) });
  return null;
}

/** `C-x n w`: widen — show every line again. */
export function widenSection(view: EditorView): string | null {
  if (!view.state.field(narrowField, false)) return NOT_NARROWED;
  view.dispatch({ effects: setNarrow.of(null) });
  return null;
}

/** Whether a view is currently narrowed, for a test to assert against. */
export function isNarrowed(view: EditorView): boolean {
  const range = view.state.field(narrowField, false);
  return range !== undefined && range !== null;
}

// ------------------------------------------------------- switch and occur

/** What `openSwitchChapter` and `openOccur` need from a chapter. */
export interface ChapterLike {
  readonly path: string;
  readonly title: string;
}

/** Entries whose label contains the query, case-insensitively. */
function filterByLabel(entries: readonly ListEntry[], query: string): readonly ListEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return entries;
  return entries.filter((entry) => entry.label.toLowerCase().includes(needle));
}

/**
 * `C-x b`: switch chapter by name, with completion.
 *
 * The same `openListOverlay` the command palette and the quit confirmation
 * already open, so movement, filtering and cancelling are the one contract.
 * `app.chapters` and `app.openChapter` already exist for the sidebar
 * (`itd-2609051335399446`); this reaches the same list from the text.
 */
export function openSwitchChapter(
  chapters: readonly ChapterLike[],
  onChoose: (path: string) => void,
  hooks: { host?: HTMLElement } = {},
): Overlay {
  const entries: ListEntry[] = chapters.map((chapter) => ({
    id: chapter.path,
    label: chapter.title,
  }));
  return openListOverlay<ListEntry>({
    ...(hooks.host ? { host: hooks.host } : {}),
    className: "palette",
    label: "Switch chapter",
    paneLabel: "C-x b",
    rowKey: "chapter",
    placeholder: "Switch to chapter…",
    fieldLabel: "Filter chapters",
    entries: (query) => filterByLabel(entries, query),
    onChoose: (entry) => {
      onChoose(entry.id);
    },
  });
}

/**
 * `M-s o`: occur — every line matching a typed query, as a list.
 *
 * Offered only once something is typed: an empty query would list the whole
 * chapter, which is not "keep it small". Choosing a row moves the cursor
 * there and changes no byte; occur only ever reads.
 */
export function openOccur(view: EditorView, hooks: { host?: HTMLElement } = {}): Overlay {
  const doc = view.state.doc;
  const lines: ListEntry[] = [];
  for (let n = 1; n <= doc.lines; n += 1) {
    lines.push({ id: String(n), label: `${String(n)}: ${doc.line(n).text}` });
  }
  return openListOverlay<ListEntry>({
    ...(hooks.host ? { host: hooks.host } : {}),
    className: "palette",
    label: "Occur",
    paneLabel: "M-s o",
    rowKey: "occur",
    placeholder: "Occur…",
    fieldLabel: "Search the document",
    entries: (query) => {
      const needle = query.trim();
      if (needle === "") return [];
      return filterByLabel(lines, needle);
    },
    onChoose: (entry) => {
      revealLine(view, Number(entry.id));
    },
    onClose: (chosen) => {
      if (!chosen) view.focus();
    },
  });
}
