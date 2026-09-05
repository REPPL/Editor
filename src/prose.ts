/**
 * The prose vocabulary: the text commands an Emacs writer's hands know.
 *
 * Every command here is a plain function of a view and an options record. It
 * returns `null` when it acted and a short refusal when it did not, which the
 * application announces in the modeline; nothing in this module reaches the
 * DOM except the two commands that have to read a key, and those hold the
 * keyboard through the one overlay contract rather than a second copy of it.
 *
 * `fillParagraph` is the only command that touches more than the characters
 * around the cursor. It rewrites exactly the source lines of the one parsed
 * paragraph the cursor sits in and refuses anywhere that is not a paragraph,
 * which is how the round-trip byte-fidelity discipline survives a command that
 * reflows text: every byte before the paragraph's first line and after its
 * last is copied through untouched.
 *
 * Offsets are document offsets, so text is read with `doc.toString()` and
 * `doc.sliceString()` — both of which count a line break as one character,
 * whatever the document's own separator is — and every insertion that spans
 * lines is written with `state.lineBreak`, which is that separator.
 */

import { EditorSelection, type ChangeSet, type Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

import { parseChapter } from "./core/parse";
import type { Block } from "./core/tree";
import { killSelection } from "./emacs";
import { canonicalChord, chordFromEvent, chordIndexIn } from "./keys";
import { openOverlay, type Overlay } from "./overlay";

/** The column prose is filled at when the document states none. */
export const DEFAULT_FILL_COLUMN = 80;

/**
 * The longest message this module writes, in characters.
 *
 * The modeline has to show it on one line at 390 CSS pixels, which is the
 * narrowest window the shell allows. The number is a budget rather than a
 * measurement: jsdom has no layout, so the manual checklist is what proves the
 * pixels and this is what stops a message being written that could not fit.
 */
export const MODELINE_BUDGET = 52;

/** What a prose command needs to know about the document it is editing. */
export interface ProseOptions {
  /** The column `fillParagraph` wraps at. */
  readonly fillColumn?: number;
  /**
   * Whether a sentence ends only at two spaces or a line break.
   *
   * Emacs's own rule, and the default. There is nowhere for an author to turn
   * it off yet: `document.yaml`'s key list is fixed elsewhere and carries no
   * such key, and the settings store is machine facts only.
   */
  readonly sentenceEndDoubleSpace?: boolean;
}

/** What a prompt needs from the application. */
export interface PromptHooks {
  /** Where the prompt's overlay is mounted. */
  readonly host?: HTMLElement;
  /** Say something in the modeline. */
  announce(message: string): void;
}

/** The prompt `M-z` writes while it waits for a character. */
export const ZAP_PROMPT = "Zap to char:";

/** The prompt `C-h k` writes while it waits for a chord. */
export const DESCRIBE_PROMPT = "Describe key:";

/** What a prompt says when `C-g` or Escape closed it. */
export const CANCELLED = "Cancelled";

/** What `M-z` says when the key it was handed is not a character. */
export const ZAP_NEEDS_A_CHARACTER = "Zap needs a character";

/** The refusals the commands over the text write. */
export const NO_TWO_WORDS = "No two words to transpose";
export const NO_LINE_ABOVE = "No line above to transpose";
export const NO_WORD_TO_CAPITALISE = "No word to capitalise";
export const NO_LINE_ABOVE_TO_JOIN = "No line above to join";
export const NOTHING_TO_EXPAND = "Nothing to expand";
export const NO_EXPANSION = "No expansion found";

/** What a cursor inside a block this module has no name for is told. */
export const FILL_ELSEWHERE = "Fill does not apply here";

// ------------------------------------------------------------------ helpers

/** A run of word characters: Unicode letters, digits, and underscore. */
const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

/** One word of the document, by offset. */
interface Word {
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

/** Every word of a text, in order. */
function wordsOf(text: string): Word[] {
  const pattern = new RegExp(`${WORD_CHARACTER.source}+`, "gu");
  const found: Word[] = [];
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    found.push({
      from: match.index,
      to: match.index + match[0].length,
      text: match[0],
    });
  }
  return found;
}

/** Put the cursor somewhere, clamped to the document. */
function move(view: EditorView, at: number): void {
  const clamped = Math.max(0, Math.min(at, view.state.doc.length));
  view.dispatch({
    selection: EditorSelection.cursor(clamped),
    scrollIntoView: true,
  });
}

/**
 * Apply one change and put the cursor at the end of what it inserted.
 *
 * The end is mapped through the change set rather than computed from the
 * inserted string's length, because a line break is one character in the
 * document and two in a `\r\n` string.
 */
function replace(
  view: EditorView,
  from: number,
  to: number,
  insert: string,
): ChangeSet {
  const changes = view.state.changes({ from, to, insert });
  view.dispatch({
    changes,
    selection: EditorSelection.cursor(changes.mapPos(to, 1)),
    scrollIntoView: true,
  });
  return changes;
}

/** Whether a line holds nothing but whitespace. */
function isBlank(doc: Text, line: number): boolean {
  return doc.line(line).text.trim() === "";
}

/** The one-based line the cursor is on. */
function cursorLine(view: EditorView): number {
  return view.state.doc.lineAt(view.state.selection.main.head).number;
}

// --------------------------------------------------------------------- fill

/** Why filling does not apply, by the kind of block the cursor is in. */
const FILL_REFUSALS: Readonly<Record<string, string>> = {
  heading: "Fill does not apply on a heading",
  table: "Fill does not apply inside a table",
  div: "Fill does not apply inside a fenced div",
  code: "Fill does not apply inside a code block",
  list: "Fill does not apply inside a list",
  quote: "Fill does not apply inside a quotation",
  image: "Fill does not apply on an image",
  rule: "Fill does not apply on a rule",
  comment: "Fill does not apply inside a comment",
  html: "Fill does not apply inside raw HTML",
};

/** What a cursor on no block at all is told. */
export const NOTHING_TO_FILL = "Nothing to fill here";

/** Every refusal filling can write, so a test can sweep them. */
export function fillRefusals(): readonly string[] {
  return [...Object.values(FILL_REFUSALS), NOTHING_TO_FILL, FILL_ELSEWHERE];
}

/**
 * Every fixed message this module writes.
 *
 * Listed rather than copied into the test, so that a message added without a
 * thought for the narrowest window fails the build instead of being clipped.
 * The two messages that carry a character or a chord are built by the test
 * from these and from the binding table.
 */
export function proseMessages(): readonly string[] {
  return [
    ...fillRefusals(),
    ZAP_PROMPT,
    DESCRIBE_PROMPT,
    CANCELLED,
    ZAP_NEEDS_A_CHARACTER,
    NO_TWO_WORDS,
    NO_LINE_ABOVE,
    NO_WORD_TO_CAPITALISE,
    NO_LINE_ABOVE_TO_JOIN,
    NOTHING_TO_EXPAND,
    NO_EXPANSION,
  ];
}

/** The top-level block whose lines contain a one-based line, if any. */
function blockAtLine(
  blocks: readonly Block[],
  line: number,
): Block | undefined {
  return blocks.find((block) => block.line <= line && line <= block.endLine);
}

/**
 * Whether a word would open a block construct if it began a line.
 *
 * A plain Markdown reader has no idea a line was wrapped, so a fill that put
 * `-` or `1.` or `|` first would turn one paragraph into a list, a table, or a
 * heading. Such a word is kept on the line it is on, even past the column.
 */
export function opensBlock(word: string): boolean {
  return (
    /^[#>\-+*|:=]/.test(word) ||
    /^\d+[.)]/.test(word) ||
    word.startsWith("```") ||
    word.startsWith("~~~")
  );
}

/** Whether a word ends a sentence: `.`, `?` or `!`, then any closers. */
export function endsSentence(word: string): boolean {
  return /[.?!][\]"')}]*$/.test(word);
}

/**
 * Re-wrap one paragraph's own text at a column.
 *
 * The first line's leading whitespace becomes every line's prefix, runs of
 * whitespace collapse to one space — two after a sentence end — and a word
 * that would not fit starts the next line, unless it is longer than the column
 * or would open a block construct there.
 */
export function fillText(
  source: string,
  column: number,
  doubleSpace: boolean,
  lineBreak: string,
): string {
  const indent = /^[ \t]*/.exec(source)?.[0] ?? "";
  const words = source.trim().split(/\s+/).filter((word) => word !== "");
  const first = words[0];
  if (first === undefined) return source;

  const lines: string[] = [];
  let current = indent + first;
  let previous = first;
  for (const word of words.slice(1)) {
    const gap = doubleSpace && endsSentence(previous) ? "  " : " ";
    const fits = current.length + gap.length + word.length <= column;
    if (fits || opensBlock(word)) {
      current += gap + word;
    } else {
      lines.push(current);
      current = indent + word;
    }
    previous = word;
  }
  lines.push(current);
  return lines.join(lineBreak);
}

/**
 * `M-q`: fill the paragraph the cursor is in, and nothing else.
 *
 * The chapter is parsed and the cursor's line selects a top-level block. Only
 * a paragraph is filled; every other kind refuses by name, because the tree
 * records no continuation prefix for a list, a quotation or a fenced div and a
 * command that would guess declines instead.
 */
export function fillParagraph(
  view: EditorView,
  options: ProseOptions = {},
): string | null {
  const column = options.fillColumn ?? DEFAULT_FILL_COLUMN;
  const doubleSpace = options.sentenceEndDoubleSpace ?? true;
  const state = view.state;
  const line = cursorLine(view);
  const chapter = parseChapter(state.doc.toString());
  const block = blockAtLine(chapter.blocks, line);
  if (!block) return NOTHING_TO_FILL;
  if (block.kind !== "paragraph") {
    return FILL_REFUSALS[block.kind] ?? FILL_ELSEWHERE;
  }

  const from = state.doc.line(Math.min(block.line, state.doc.lines)).from;
  const to = state.doc.line(Math.min(block.endLine, state.doc.lines)).to;
  const source = state.doc.sliceString(from, to);
  const filled = fillText(source, column, doubleSpace, state.lineBreak);
  if (filled === source) return null;
  // One transaction, so one `C-/` takes the whole fill back.
  replace(view, from, to, filled);
  return null;
}

// ---------------------------------------------------------------- transpose

/** `M-t`: swap the two words either side of the cursor. */
export function transposeWords(view: EditorView): string | null {
  const state = view.state;
  const text = state.doc.toString();
  const head = state.selection.main.head;
  const words = wordsOf(text);

  const inside = words.find((word) => word.from < head && head < word.to);
  const first = inside ?? [...words].reverse().find((word) => word.to <= head);
  const second = inside
    ? words.find((word) => word.from >= inside.to)
    : words.find((word) => word.from >= head);

  if (!first || !second || first.to > second.from) {
    return NO_TWO_WORDS;
  }
  const between = text.slice(first.to, second.from);
  replace(view, first.from, second.to, second.text + between + first.text);
  return null;
}

/** `C-x C-t`: swap this line with the one above it. */
export function transposeLines(view: EditorView): string | null {
  const state = view.state;
  const at = cursorLine(view);
  if (at <= 1) return NO_LINE_ABOVE;
  const above = state.doc.line(at - 1);
  const here = state.doc.line(at);
  replace(
    view,
    above.from,
    here.to,
    here.text + state.lineBreak + above.text,
  );
  return null;
}

// --------------------------------------------------------------------- case

/** `M-c`: capitalise from the cursor to the end of the word ahead of it. */
export function capitalizeWord(view: EditorView): string | null {
  const state = view.state;
  const text = state.doc.toString();
  const head = state.selection.main.head;
  const word = wordsOf(text).find((candidate) => candidate.to > head);
  if (!word) return NO_WORD_TO_CAPITALISE;

  const from = Math.max(head, word.from);
  const slice = text.slice(from, word.to);
  const characters = [...slice];
  const insert =
    (characters[0] ?? "").toUpperCase() +
    characters.slice(1).join("").toLowerCase();
  if (insert === slice) {
    move(view, word.to);
    return null;
  }
  replace(view, from, word.to, insert);
  return null;
}

// ----------------------------------------------------------------- sentence

/**
 * Where each sentence of a text ends.
 *
 * Emacs's own rule: `.`, `?` or `!`, then any of `]"')}`, then two spaces or a
 * line break. One space is enough where the double-space rule is off.
 */
export function sentenceEnds(text: string, doubleSpace: boolean): number[] {
  const pattern = /[.?!][\]"')}]*/g;
  const ends: number[] = [];
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const at = match.index + match[0].length;
    const rest = text.slice(at);
    const enough = doubleSpace
      ? /^(?: {2}|[ \t]*(?:\n|$))/.test(rest)
      : /^(?:\s|$)/.test(rest);
    if (enough) ends.push(at);
  }
  return ends;
}

/** The first position at or after `at` that is not whitespace. */
function skipSpace(text: string, at: number): number {
  return at + (/^\s*/.exec(text.slice(at))?.[0].length ?? 0);
}

/** The end of the run of non-blank lines the cursor is in. */
function paragraphEnd(view: EditorView): number {
  const doc = view.state.doc;
  let line = cursorLine(view);
  while (line < doc.lines && !isBlank(doc, line + 1)) line += 1;
  return doc.line(line).to;
}

/** The start of the run of non-blank lines the cursor is in. */
function paragraphStart(view: EditorView): number {
  const doc = view.state.doc;
  let line = cursorLine(view);
  while (line > 1 && !isBlank(doc, line - 1)) line -= 1;
  return doc.line(line).from;
}

/** `M-e`: to the end of this sentence. */
export function forwardSentence(
  view: EditorView,
  options: ProseOptions = {},
): string | null {
  const text = view.state.doc.toString();
  const head = view.state.selection.main.head;
  const ends = sentenceEnds(text, options.sentenceEndDoubleSpace ?? true);
  move(view, ends.find((at) => at > head) ?? paragraphEnd(view));
  return null;
}

/** `M-a`: to the beginning of this sentence. */
export function backwardSentence(
  view: EditorView,
  options: ProseOptions = {},
): string | null {
  const text = view.state.doc.toString();
  const head = view.state.selection.main.head;
  const starts = [
    0,
    paragraphStart(view),
    ...sentenceEnds(text, options.sentenceEndDoubleSpace ?? true).map((at) =>
      skipSpace(text, at),
    ),
  ].filter((at) => at < head);
  move(view, starts.length === 0 ? 0 : Math.max(...starts));
  return null;
}

// ---------------------------------------------------------------- paragraph

/** `M-}`: over the blank lines, past the paragraph, to the blank line after. */
export function forwardParagraph(view: EditorView): string | null {
  const doc = view.state.doc;
  let line = cursorLine(view);
  while (line <= doc.lines && isBlank(doc, line)) line += 1;
  while (line <= doc.lines && !isBlank(doc, line)) line += 1;
  move(view, line <= doc.lines ? doc.line(line).from : doc.length);
  return null;
}

/** `M-{`: the same, backwards. */
export function backwardParagraph(view: EditorView): string | null {
  const doc = view.state.doc;
  const head = view.state.selection.main.head;
  const at = cursorLine(view);
  let line = head === doc.line(at).from ? at - 1 : at;
  while (line >= 1 && isBlank(doc, line)) line -= 1;
  while (line >= 1 && !isBlank(doc, line)) line -= 1;
  move(view, line >= 1 ? doc.line(line).from : 0);
  return null;
}

// --------------------------------------------------------------- whitespace

/** `M-^`: join this line to the one above, leaving one space. */
export function deleteIndentation(view: EditorView): string | null {
  const state = view.state;
  const at = cursorLine(view);
  if (at <= 1) return NO_LINE_ABOVE_TO_JOIN;
  const above = state.doc.line(at - 1);
  const here = state.doc.line(at);
  const from = above.from + above.text.replace(/[ \t]+$/, "").length;
  const to = here.from + (/^[ \t]*/.exec(here.text)?.[0].length ?? 0);
  const bare = above.text.trim() === "" || here.text.trim() === "";
  replace(view, from, to, bare ? "" : " ");
  return null;
}

/** The run of spaces and tabs around the cursor, on its own line. */
function horizontalSpace(view: EditorView): { from: number; to: number } {
  const state = view.state;
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  const at = head - line.from;
  let start = at;
  while (start > 0 && /[ \t]/.test(line.text.charAt(start - 1))) start -= 1;
  let end = at;
  while (end < line.text.length && /[ \t]/.test(line.text.charAt(end))) {
    end += 1;
  }
  return { from: line.from + start, to: line.from + end };
}

/** `M-SPC`: collapse the whitespace around the cursor to one space. */
export function justOneSpace(view: EditorView): string | null {
  const { from, to } = horizontalSpace(view);
  replace(view, from, to, " ");
  return null;
}

/** `M-\`: take the whitespace around the cursor away. */
export function deleteHorizontalSpace(view: EditorView): string | null {
  const { from, to } = horizontalSpace(view);
  replace(view, from, to, "");
  return null;
}

// ------------------------------------------------------------------ the view

/** `M-r`: to the line halfway down the window, keeping the column. */
export function moveToWindowLine(view: EditorView): string | null {
  const state = view.state;
  const head = state.selection.main.head;
  const column = head - state.doc.lineAt(head).from;
  const top = view.scrollDOM.scrollTop;
  const height = view.scrollDOM.clientHeight;
  const block = view.lineBlockAtHeight(top + height / 2);
  const line = state.doc.lineAt(block.from);
  move(view, Math.min(line.from + column, line.to));
  return null;
}

// ------------------------------------------------------------------- expand

/** One `M-/` cycle in progress, for one view. */
interface Expansion {
  /** What the author typed, which is the last stop on the cycle. */
  readonly prefix: string;
  /** The candidates, then the prefix itself. */
  readonly candidates: readonly string[];
  index: number;
  /** Where the prefix starts. */
  readonly from: number;
  /** Where the current replacement ends. */
  to: number;
  /** The document and cursor the last expansion left, so anything else ends it. */
  doc: Text;
  head: number;
}

const expansions = new WeakMap<EditorView, Expansion>();

/** The document's own words that a prefix could grow into, nearest first. */
export function expansionsFor(
  text: string,
  prefix: string,
  from: number,
  head: number,
): readonly string[] {
  const backwards: { word: string; distance: number }[] = [];
  const forwards: { word: string; distance: number }[] = [];
  for (const word of wordsOf(text)) {
    if (!word.text.startsWith(prefix) || word.text === prefix) continue;
    if (word.to <= from) {
      backwards.push({ word: word.text, distance: from - word.to });
    } else if (word.from >= head) {
      forwards.push({ word: word.text, distance: word.from - head });
    }
  }
  backwards.sort((a, b) => a.distance - b.distance);
  forwards.sort((a, b) => a.distance - b.distance);
  return [
    ...new Set([...backwards, ...forwards].map((entry) => entry.word)),
  ];
}

/** Put one stop of a cycle in the buffer and remember where it left off. */
function showExpansion(
  view: EditorView,
  entry: Expansion,
  index: number,
): string | null {
  const word = entry.candidates[index] ?? entry.prefix;
  const changes = replace(view, entry.from, entry.to, word);
  entry.index = index;
  entry.to = changes.mapPos(entry.to, 1);
  entry.doc = view.state.doc;
  entry.head = entry.to;
  expansions.set(view, entry);
  return null;
}

/**
 * `M-/`: complete the word being typed from the document's own words.
 *
 * Pressing again takes the next candidate; after the last, what was typed
 * comes back and the cycle repeats. Any transaction that changes the document,
 * and any cursor that is not where the last expansion left it, ends the cycle:
 * the entry remembers both, and a press that finds either changed starts a
 * fresh one.
 */
export function dabbrevExpand(view: EditorView): string | null {
  const state = view.state;
  const head = state.selection.main.head;
  const held = expansions.get(view);
  if (held && held.doc === state.doc && held.head === head) {
    return showExpansion(
      view,
      held,
      (held.index + 1) % held.candidates.length,
    );
  }

  const text = state.doc.toString();
  const pattern = new RegExp(`${WORD_CHARACTER.source}+$`, "u");
  const prefix = pattern.exec(text.slice(0, head))?.[0] ?? "";
  if (prefix === "") return NOTHING_TO_EXPAND;
  const from = head - prefix.length;
  const candidates = expansionsFor(text, prefix, from, head);
  if (candidates.length === 0) return NO_EXPANSION;
  return showExpansion(
    view,
    {
      prefix,
      candidates: [...candidates, prefix],
      index: -1,
      from,
      to: head,
      doc: state.doc,
      head,
    },
    0,
  );
}

// ------------------------------------------------------------- the prompts

/** Whether a keydown is a modifier held on its own. */
function isModifierOnly(event: KeyboardEvent): boolean {
  return ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(event.key);
}

/**
 * A prompt in the modeline that holds the keyboard and reads keys.
 *
 * The overlay carries no rows and shows nothing: the prompt itself is the
 * modeline message, and the overlay exists so that the keys reach this reader
 * rather than the text, and so that `C-g` and Escape cancel it under the one
 * contract rather than under a second copy of it.
 */
function openPrompt(
  label: string,
  hooks: PromptHooks,
  read: (event: KeyboardEvent) => boolean,
): Overlay {
  const element = document.createElement("div");
  element.className = "prompt";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-label", label);
  element.dataset["paneLabel"] = "Prompt";

  const target = document.createElement("span");
  target.className = "prompt-focus";
  target.tabIndex = -1;
  target.dataset["overlayFocus"] = "yes";
  element.append(target);

  hooks.announce(label);
  return openOverlay({
    element,
    ...(hooks.host ? { host: hooks.host } : {}),
    rowCount: () => 0,
    onKey: read,
    onClose: (chosen) => {
      if (!chosen) hooks.announce(CANCELLED);
    },
  });
}

/**
 * `M-z`: kill from the cursor to and including the next occurrence of a
 * character.
 *
 * The kill goes through the package's own `killRegion`, so what was zapped is
 * on the one kill ring and `C-y` yanks it back.
 */
export function zapToChar(view: EditorView, hooks: PromptHooks): Overlay {
  return openPrompt(ZAP_PROMPT, hooks, (event) => {
    if (isModifierOnly(event)) return true;
    const character = event.key;
    if ([...character].length !== 1) {
      hooks.announce(ZAP_NEEDS_A_CHARACTER);
      return false;
    }
    const state = view.state;
    const head = state.selection.main.head;
    const at = state.doc.toString().indexOf(character, head);
    if (at < 0) {
      hooks.announce(`No ${character} ahead to zap to`);
      return false;
    }
    view.dispatch({
      selection: EditorSelection.range(head, at + character.length),
    });
    killSelection(view);
    hooks.announce(`Zapped to ${character}`);
    return false;
  });
}

/** Whether a chord is the first step of a longer chord the table lists. */
function isPrefix(chord: string): boolean {
  for (const listed of chordIndexIn("editor").keys()) {
    if (listed.startsWith(`${chord} `)) return true;
  }
  return false;
}

/**
 * `C-h k`: name the row the next chord reaches.
 *
 * A prefix step keeps the prompt open, so `C-x C-s` is read as one sequence
 * and answered once. The table is the only thing consulted, in the editing
 * surface's own scope, so the answer cannot disagree with the keyboard.
 */
export function describeKey(hooks: PromptHooks): Overlay {
  const steps: string[] = [];
  return openPrompt(DESCRIBE_PROMPT, hooks, (event) => {
    if (isModifierOnly(event)) return true;
    steps.push(chordFromEvent(event));
    const chord = canonicalChord(steps.join(" "));
    const row = chordIndexIn("editor").get(chord)?.[0];
    if (row) {
      hooks.announce(`${chord} is ${row.label}`);
      return false;
    }
    if (isPrefix(chord)) {
      hooks.announce(`${DESCRIBE_PROMPT} ${chord}-`);
      return true;
    }
    hooks.announce(`${chord} is not bound`);
    return false;
  });
}
