/**
 * Pipe-table source geometry, and the one filter that keeps a table's columns
 * aligned while its author is typing in it (`itd-2609061653559060`, map #39).
 *
 * Two things live here and nowhere else.
 *
 * The first is **pipe-table source geometry**: where a row's cells begin and
 * end in the bytes of the line, how wide a cell's text draws, and what the
 * whitespace of an aligned row should be. `core/parse.ts` cannot answer that —
 * `cell.text` is the flattened text of the parsed inlines, so `**x**` comes
 * back as `x` and `` `y\|z` `` comes back as `y|z` — and alignment rewrites
 * source, not rendering.
 *
 * The second is the `EditorState.transactionFilter` that appends the
 * realignment to the author's own transaction. It is a filter and not a
 * `transactionExtender` because an extender cannot add a character:
 * `extendTransaction` merges each extender's spec into a local one and then
 * finishes with `Transaction.create(state, tr.changes, tr.selection, …)`, so
 * the merged `changes` and `selection` are thrown away
 * (`node_modules/@codemirror/state/dist/index.cjs`).
 *
 * What is *not* here is any second answer to "is this a table, where does it
 * begin, and how is each column aligned". That is `parseChapter`'s, read
 * unchanged, exactly as `src/outline-commands.ts` reads it for headings
 * (`itd-2609051336090390`, one source, always). This module asks it and then
 * measures the source rows it names.
 *
 * The rewrite is admissible under `adr-2609092000099546`, which permits an
 * author's own edit reformatting the construct their caret is in on three
 * conditions, and forbids everything else:
 *
 * 1. **The author's own edit is the occasion.** The only entry point is a
 *    transaction filter, which runs on a dispatched transaction and on nothing
 *    else. There is no timer, no save hook, no background pass, and opening a
 *    chapter is `view.setState` (`src/editor.ts`), which dispatches no
 *    transaction at all — so a chapter with a ragged table is loaded ragged
 *    and saved ragged.
 * 2. **The construct the caret is in is the limit.** Every change is inside
 *    the one table `parseChapter` puts the caret's line in, and only the
 *    whitespace between its pipes and the dash run of its delimiter row move.
 *    No cell's content is altered, no pipe is added or removed, and no line
 *    outside the table's own rows is touched.
 * 3. **One undo undoes it.** The realignment is composed into the keystroke's
 *    own transaction, so the history carries one entry for the two.
 */

import {
  EditorSelection,
  EditorState,
  type Extension,
  type Line,
  type Transaction,
  type TransactionSpec,
} from "@codemirror/state";

import { parseChapter } from "./core/parse";
import type { Block, TableCell } from "./core/tree";

// ------------------------------------------------------------- the off switch

/**
 * Whether an edit inside a table realigns it, for the life of this process.
 *
 * A module-level boolean, not a `StateField` and not a `Compartment`. Both of
 * those live in the `EditorState`, and `setDocument` (`src/editor.ts`) opens a
 * chapter by building a fresh state with `view.setState`, so alignment turned
 * off would come back on the moment another chapter was opened — which is not
 * a session. "Session" here means the life of the app process, so process
 * state is what it is.
 *
 * Off means the filter runs and returns the transaction untouched. The filter
 * is never torn down and never re-added.
 */
let aligning = true;

/** Whether tables realign as the author types. */
export function tableAlignmentOn(): boolean {
  return aligning;
}

/**
 * Turn alignment on or off, and say what it now is.
 *
 * Writing the flag is the whole of it: nothing is dispatched, no text is
 * touched, and no setting is read or written. Turning alignment back on
 * therefore leaves every table exactly as it is until the next edit inside
 * one (cond-2609091900422614).
 */
export function setTableAlignment(next: boolean): boolean {
  aligning = next;
  return aligning;
}

// ------------------------------------------------------------- source cells

/** One cell of a pipe-table row, as offsets into the line that carries it. */
export interface SourceCell {
  /** Just past the pipe that opens the cell. */
  readonly from: number;
  /** At the pipe that closes the cell. */
  readonly to: number;
  /** The first character of the content; `to` when the cell is blank. */
  readonly contentFrom: number;
  /** Just past the last character of the content; `to` when it is blank. */
  readonly contentTo: number;
  /** The content as written, trimmed, with every escape and marker intact. */
  readonly text: string;
}

/** Up to three spaces of indent and the pipe that opens the first cell. */
const ROW_OPENING = /^( {0,3})\|/;

function isBlank(character: string | undefined): boolean {
  return character === " " || character === "\t";
}

function cellBetween(line: string, from: number, to: number): SourceCell {
  let contentFrom = from;
  while (contentFrom < to && isBlank(line[contentFrom])) contentFrom += 1;
  let contentTo = to;
  while (contentTo > contentFrom && isBlank(line[contentTo - 1])) contentTo -= 1;
  return {
    from,
    to,
    contentFrom,
    contentTo,
    text: line.slice(contentFrom, contentTo),
  };
}

/**
 * The cells of one source row, or `null` when the line is not one.
 *
 * A row is up to three spaces of indent, a leading `|`, cells separated by
 * `|`, and a trailing `|`. A `|` preceded by an odd number of backslashes is
 * escaped and belongs to the cell rather than to the boundary — the whole of
 * the GFM rule, and the same reading `parseChapter` gives: `` | `y\|z` | ``
 * comes back from it as one cell whose text is `y|z`. A pipe inside a code
 * span is *not* protected in GFM and is not protected here either, which is
 * what keeps the two agreeing.
 *
 * GFM also permits a row with no edge pipes. Such a row returns `null`,
 * because aligning it would mean *adding* pipes, which is neither whitespace
 * nor a delimiter row's dashes and so falls outside what
 * cond-2609091733490634 admits. Whitespace after the closing pipe is left
 * where it is: it is outside every cell, so no change is ever written over it.
 */
export function cellsOf(line: string): SourceCell[] | null {
  const opening = ROW_OPENING.exec(line);
  if (opening === null) return null;
  const end = line.trimEnd().length;
  if (line[end - 1] !== "|") return null;
  const first = (opening[1] ?? "").length + 1;
  // A line that is one pipe and nothing else opens no cell.
  if (first > end - 1) return null;
  const cells: SourceCell[] = [];
  let from = first;
  let backslashes = 0;
  for (let at = first; at < end; at += 1) {
    const character = line[at];
    if (character === "|" && backslashes % 2 === 0) {
      cells.push(cellBetween(line, from, at));
      from = at + 1;
    }
    backslashes = character === "\\" ? backslashes + 1 : 0;
  }
  // The last pipe on the line was escaped, so the row does not in fact end
  // with one: `| a\|` opens a cell that nothing closes.
  if (from !== end) return null;
  return cells;
}

// --------------------------------------------------------------- measurement

let cutter: Intl.Segmenter | null | undefined;

function segmenter(): Intl.Segmenter | null {
  if (cutter === undefined) {
    cutter =
      typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  return cutter;
}

/**
 * The UTF-16 index each grapheme cluster of `text` starts at, then its length.
 *
 * One array answers both of the questions alignment asks — how wide is this
 * cell, and where in it does the caret's own cluster start — so the width a
 * column is padded to and the offset the caret is placed at can never come
 * from two different counts.
 */
function clusterStarts(text: string): readonly number[] {
  const starts: number[] = [];
  const cut = segmenter();
  if (cut === null) {
    // Code points, on a platform without `Intl.Segmenter`. A decomposed `é`
    // then measures two and its column draws one too wide; nothing is
    // rewritten either way.
    for (let at = 0; at < text.length; ) {
      starts.push(at);
      at += (text.codePointAt(at) ?? 0) > 0xffff ? 2 : 1;
    }
  } else {
    for (const segment of cut.segment(text)) starts.push(segment.index);
  }
  starts.push(text.length);
  return starts;
}

/**
 * How wide a cell's source text draws, in grapheme clusters.
 *
 * Right for ASCII, for Latin text with combining marks — `e` + U+0301 is one
 * cluster and one glyph — and for an emoji ZWJ sequence or a flag, which is
 * one cluster rather than five code points.
 *
 * Wrong, and accepted (cond-2609091733499546): a character whose drawn advance
 * is two columns — CJK, most emoji, fullwidth forms — measures one, so its
 * column draws one cell narrow for each such character. No width table is
 * added to fix it, and the text is never altered; only the padding is out.
 *
 * Wrong, and correct: `**bold**` measures eight rather than four, because
 * eight characters are what the surface draws. Editor aligns the source, and
 * the source is what is on the screen. `\|` measures two for the same reason.
 */
export function measure(text: string): number {
  return clusterStarts(text).length - 1;
}

// ---------------------------------------------------------------- alignment

/** A column's alignment, as `parseChapter` reports it. */
type Align = TableCell["align"];

/**
 * The smallest a column may be, whatever its cells hold.
 *
 * Three, which is the narrowest column a delimiter row reads as a rule in:
 * `|---|` is a table anyone recognises and `|-|` is a line of punctuation.
 */
const MINIMUM_WIDTH = 3;

/**
 * The gutter and the padding around one cell's content.
 *
 * One space of gutter each side, always; the slack on the right for `left` and
 * for an unmarked column, on the left for `right`, and split with the odd
 * character on the right for `center`.
 */
function padsFor(text: string, width: number, align: Align): [string, string] {
  const slack = Math.max(0, width - measure(text));
  if (align === "right") return [" ".repeat(slack + 1), " "];
  if (align === "center") {
    const left = Math.floor(slack / 2);
    return [" ".repeat(left + 1), " ".repeat(slack - left + 1)];
  }
  return [" ", " ".repeat(slack + 1)];
}

/**
 * One cell of the delimiter row, regenerated from the column's alignment.
 *
 * Regenerated rather than padded, because a delimiter row *is* the column
 * widths: an author who wrote `|-|-|` gets `|---|---|`. Every marker they
 * wrote survives; the run of dashes does not survive character for character,
 * which cond-2609091733490634 admits in as many words.
 *
 * `span` is the whole distance between the two pipes, which is the column's
 * width plus its two gutter spaces, and the rule fills it: no gutter spaces of
 * its own, which is the conventional GFM shape and is what puts the pipes of
 * the rule in the same columns as the pipes of the rows. A rule filled to the
 * column's width alone would leave every pipe of the delimiter row two columns
 * short of the row above it, which is the one thing this whole feature exists
 * to prevent.
 */
function ruleFor(span: number, align: Align): string {
  if (align === "left") return `:${"-".repeat(span - 1)}`;
  if (align === "right") return `${"-".repeat(span - 1)}:`;
  if (align === "center") return `:${"-".repeat(span - 2)}:`;
  return "-".repeat(span);
}

// ------------------------------------------------------------------ the rows

/** One source row of a table: the line it sits on, and its cells. */
interface SourceRow {
  readonly line: Line;
  readonly cells: readonly SourceCell[];
}

/**
 * The top-level `table` block a one-based line sits in, if it sits in one.
 *
 * Top-level on purpose: a table inside a fenced div or behind a `>` prefix is
 * a `div` or a `quote` here, so it is not found and is left exactly as typed.
 * Extending alignment into a nested or quoted table is a later intent.
 */
function tableOn(source: string, line: number): Block | null {
  for (const block of parseChapter(source).blocks) {
    if (block.kind !== "table") continue;
    if (block.line <= line && line <= block.endLine) return block;
  }
  return null;
}

/**
 * The one-based line the table's last row sits on.
 *
 * Counted from `parseChapter`'s own rows — one header row, one delimiter row,
 * and one line per body row — rather than taken from `block.endLine`, which is
 * not the last row when the table carries a caption: a `: Caption` paragraph
 * after a blank line folds into the table block and extends `endLine` over
 * both (`fold` in `src/core/parse.ts`). Reading the count off the parser keeps
 * this from becoming a second answer to "where does the table end".
 */
function lastRowOf(block: Block): number {
  return block.line + 1 + (block.table?.body.length ?? 0);
}

// ------------------------------------------------------------- the realigner

/**
 * Append the realignment of the table the caret is in to the author's own
 * transaction, or return the transaction untouched.
 *
 * The predicates run cheapest first, and the load-bearing one is the fourth:
 * almost every keystroke in a chapter is in prose, and a line that holds no
 * `|` is refused by a string scan, so `parseChapter` never runs on ordinary
 * typing.
 *
 * No re-entry guard is needed and none is added. `filterTransaction` resolves
 * whatever a filter returns with `resolveTransaction(state, specs, false)` —
 * the third argument is `filter` — so the transaction this produces does not
 * run the filters again. The guard is that this function dispatches nothing.
 */
function realign(
  transaction: Transaction,
): TransactionSpec | readonly TransactionSpec[] {
  // 0. Alignment is off for the session. One boolean read.
  if (!aligning) return transaction;

  // 1. A bare cursor move.
  if (!transaction.docChanged) return transaction;

  // 2. An undo or a redo. The alignment being reversed rode in on the
  //    transaction being reversed, so the history's own inverse is already
  //    right; appending anything would make an undo write text the author
  //    never had.
  if (transaction.isUserEvent("undo") || transaction.isUserEvent("redo")) {
    return transaction;
  }

  // 3. Not one empty cursor. `rectangularSelection` is on the surface, so
  //    several cursors are reachable, and a multi-cursor edit inside a table
  //    has no single cell to anchor to.
  const selection = transaction.newSelection;
  if (selection.ranges.length !== 1 || !selection.main.empty) {
    return transaction;
  }

  // 4. The caret's line holds no `|`. This is the cost gate.
  const doc = transaction.newDoc;
  const caret = selection.main.head;
  const caretLine = doc.lineAt(caret);
  if (!caretLine.text.includes("|")) return transaction;

  // 5. `parseChapter` puts no top-level `table` block on the caret's line.
  const block = tableOn(doc.toString(), caretLine.number);
  if (block === null) return transaction;
  const lastRow = lastRowOf(block);
  if (lastRow > block.endLine) return transaction;
  if (caretLine.number > lastRow) return transaction;

  // 6. The author's own change landed outside the table's rows. An edit
  //    elsewhere that happens to leave the caret in a table realigns nothing.
  const tableFrom = doc.line(block.line).from;
  const tableTo = doc.line(lastRow).to;
  let touched = false;
  transaction.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    if (fromB <= tableTo && toB >= tableFrom) touched = true;
  });
  if (!touched) return transaction;

  // 7. The caret is in the delimiter row. This is what stops the table being
  //    rewritten under the author's hands on the very keystroke that makes it
  //    a table, and what lets them type `:---:` a character at a time without
  //    the row regenerating around them. The alignment just declared takes
  //    effect on the next edit in any other row.
  const delimiterLine = block.line + 1;
  if (caretLine.number === delimiterLine) return transaction;

  // 8 and 9. The source rows are not uniform, or one of them carries no edge
  //    pipes. `cellsOf` answers both: it returns `null` for a row without
  //    them, and the cell counts are compared here. This is the malformed
  //    case, and it is what catches the author on the keystroke that deletes
  //    a pipe — markdown-it pads a short row and truncates a long one rather
  //    than rejecting it, so the check has to be over the source.
  const rows: SourceRow[] = [];
  for (let number = block.line; number <= lastRow; number += 1) {
    const line = doc.line(number);
    const cells = cellsOf(line.text);
    if (cells === null) return transaction;
    rows.push({ line, cells });
  }
  const header = rows[0];
  if (header === undefined) return transaction;
  const columns = header.cells.length;
  if (columns === 0) return transaction;
  if (rows.some((row) => row.cells.length !== columns)) return transaction;

  // The alignments are `parseChapter`'s, read and not re-derived from the
  // delimiter row. A parser that saw a different number of columns than the
  // splitter did is a disagreement, and a disagreement is refused rather than
  // guessed at.
  const marked = block.table?.head[0];
  if (marked === undefined || marked.length !== columns) return transaction;
  const aligns = marked.map((cell) => cell.align);

  const widths: number[] = [];
  for (let column = 0; column < columns; column += 1) {
    let width = MINIMUM_WIDTH;
    for (const row of rows) {
      if (row.line.number === delimiterLine) continue;
      width = Math.max(width, measure(row.cells[column]?.text ?? ""));
    }
    widths.push(width);
  }

  // Each row is built whole and its changes are written per whitespace run
  // from the same construction, so the text the caret is placed against and
  // the text the document ends up with cannot disagree. A run that is already
  // right contributes no change; a table already aligned contributes none at
  // all and the transaction goes back untouched.
  const changes: { from: number; to: number; insert: string }[] = [];
  const built: string[] = [];
  /** Where each cell's content starts in the row as rebuilt. */
  const contentStarts: number[][] = [];
  /** The gutter and padding each cell is rebuilt with, left then right. */
  const pads: [string, string][][] = [];
  for (const row of rows) {
    const rule = row.line.number === delimiterLine;
    const first = row.cells[0];
    const last = row.cells[columns - 1];
    if (first === undefined || last === undefined) return transaction;
    let text = row.line.text.slice(0, first.from);
    const starts: number[] = [];
    const gutters: [string, string][] = [];
    for (let column = 0; column < columns; column += 1) {
      const cell = row.cells[column];
      if (cell === undefined) return transaction;
      const width = widths[column] ?? MINIMUM_WIDTH;
      const align = aligns[column] ?? null;
      if (rule) {
        // The two gutter spaces a header or body cell carries are dashes
        // here, so the rule's pipes land in the row's own columns.
        const dashes = ruleFor(width + 2, align);
        starts.push(text.length);
        gutters.push(["", ""]);
        text += dashes;
        if (row.line.text.slice(cell.from, cell.to) !== dashes) {
          changes.push({
            from: row.line.from + cell.from,
            to: row.line.from + cell.to,
            insert: dashes,
          });
        }
      } else {
        const [left, right] = padsFor(cell.text, width, align);
        starts.push(text.length + left.length);
        gutters.push([left, right]);
        text += left + cell.text + right;
        if (row.line.text.slice(cell.from, cell.contentFrom) !== left) {
          changes.push({
            from: row.line.from + cell.from,
            to: row.line.from + cell.contentFrom,
            insert: left,
          });
        }
        if (row.line.text.slice(cell.contentTo, cell.to) !== right) {
          changes.push({
            from: row.line.from + cell.contentTo,
            to: row.line.from + cell.to,
            insert: right,
          });
        }
      }
      text += "|";
    }
    built.push(text + row.line.text.slice(last.to + 1));
    contentStarts.push(starts);
    pads.push(gutters);
  }
  if (changes.length === 0) return transaction;

  // The caret is placed, not mapped. `mapPos` is right for the common case —
  // an insertion at the caret leaves the caret before it — and wrong for the
  // case that matters, an author whose caret is parked inside a run of padding
  // being shortened: it would send them to the start of the replaced run.
  // Recording where the caret sits in its own cell and writing the position
  // back sends it to the same place in the same cell.
  //
  // Three places a caret can sit in a cell, and each keeps what it has:
  //
  // - **In the content**, which is the case that matters: the offset is
  //   recorded in grapheme clusters from the content's start, so the caret
  //   comes back beside the same character however the padding around it
  //   moved.
  // - **In the padding after the content**, which is where an author sits the
  //   moment they type a space: that space is trailing whitespace, so it is
  //   padding rather than content, and a caret clamped to the content's end
  //   would land *before* it — the next character would then join the previous
  //   word and `Alice Smith` could not be typed at all. The distance from the
  //   content is kept instead, clamped to the padding the cell is rebuilt
  //   with, so the caret stays one column past `Alice` and the `S` lands where
  //   the author put it.
  // - **In the padding before the content**, which is where a right-aligned
  //   column's gutter is: the distance from the opening pipe is kept, clamped
  //   the same way.
  //
  // Every one of the three is inside the cell's own pipes, so the caret cannot
  // leave the cell it was in, which is the intent's own falsifier.
  const rowIndex = caretLine.number - block.line;
  const row = rows[rowIndex];
  if (row === undefined) return transaction;
  const inLine = caret - caretLine.from;
  let cellIndex = -1;
  for (let column = 0; column < columns; column += 1) {
    const cell = row.cells[column];
    if (cell !== undefined && inLine >= cell.from && inLine <= cell.to) {
      cellIndex = column;
      break;
    }
  }
  // The caret is in the row's indent, or out past its closing pipe. There is
  // no cell to hold it in, so nothing is rewritten.
  if (cellIndex < 0) return transaction;
  const cell = row.cells[cellIndex];
  const start = contentStarts[rowIndex]?.[cellIndex];
  const gutter = pads[rowIndex]?.[cellIndex];
  if (cell === undefined || start === undefined || gutter === undefined) {
    return transaction;
  }

  let inCell: number;
  if (inLine < cell.contentFrom) {
    inCell = start - gutter[0].length + Math.min(inLine - cell.from, gutter[0].length);
  } else if (inLine > cell.contentTo) {
    inCell =
      start +
      cell.text.length +
      Math.min(inLine - cell.contentTo, gutter[1].length);
  } else {
    const within = inLine - cell.contentFrom;
    const starts = clusterStarts(cell.text);
    let clusters = 0;
    while (
      clusters + 1 < starts.length &&
      (starts[clusters + 1] ?? 0) <= within
    ) {
      clusters += 1;
    }
    inCell = start + (starts[clusters] ?? 0);
  }

  let at = tableFrom;
  for (let index = 0; index < rowIndex; index += 1) {
    // One position per line break, whatever the document's own separator is:
    // `EditorState.lineSeparator` changes what `sliceDoc` joins with, never
    // what a break costs in the document's own coordinates.
    at += (built[index] ?? "").length + 1;
  }
  at += inCell;

  // Three specs, not two. `sequential: true` is what makes the appended
  // offsets read against the document as the author's own edit left it —
  // `mergeTransaction` then composes rather than mapping ours back through
  // theirs. The selection travels in a third spec of its own because
  // `mergeTransaction` maps an appended spec's selection through
  // `ChangeSet.empty(b.changes.length)`, whose length is the document *before*
  // that spec's changes: a caret in a table at the end of a chapter can sit
  // past that length once the table has grown, and `mapPos` throws a
  // `RangeError` rather than clamping. A spec of its own is resolved against
  // the realigned length, so the identity mapping is an identity.
  return [
    transaction,
    { changes, sequential: true },
    { selection: EditorSelection.cursor(at), sequential: true },
  ];
}

/**
 * Keep the table the caret is in aligned as its author types in it.
 *
 * The one extension on the surface that writes a document change the author
 * did not type. See the three conditions at the head of this module.
 */
export function alignTables(): Extension {
  return EditorState.transactionFilter.of(realign);
}
