/**
 * The one configured markdown-it instance, and the two rules that are Editor's
 * own.
 *
 * - **Fenced divs.** The canon writes nested divs with three colons at every
 *   level, as Pandoc does. `markdown-it-container` closes the outer div at the
 *   first bare `:::`, which turns the canon's own columns example into three
 *   sibling divs and swallows the paragraph after it, so the block rule here
 *   counts opening and closing fences instead.
 * - **Citations.** `[@smith2020, p. 4]` and `@smith2020` become citation
 *   tokens carrying their keys and their literal text. Nothing is resolved:
 *   the bibliography arrives with map #11, and until then a citation renders
 *   as what the author wrote, which is what a plain tool does with it too.
 *
 * Nothing here builds the tree; `parse.ts` does, out of the tokens this
 * produces.
 */

import MarkdownIt from "markdown-it";
import type { PluginSimple, StateBlock, StateInline } from "markdown-it";
import attrs from "markdown-it-attrs";
import bracketedSpans from "markdown-it-bracketed-spans";
import footnote from "markdown-it-footnote";

/** `:` — the fence character of a Pandoc fenced div. */
const COLON = 0x3a;

/** A fenced-div marker on one line: how long, and what follows it. */
interface Fence {
  readonly length: number;
  readonly params: string;
}

/** Read a run of three or more colons at `start`, and what follows on the line. */
function fenceAt(src: string, start: number, max: number): Fence | null {
  let pos = start;
  while (pos < max && src.charCodeAt(pos) === COLON) pos += 1;
  const length = pos - start;
  if (length < 3) return null;
  return { length, params: src.slice(pos, max).trim() };
}

/** A code fence on one line: its character, how long, and what follows it. */
interface CodeFence {
  readonly marker: number;
  readonly length: number;
  readonly params: string;
}

/** ` and ~ — the two characters a fenced code block may be written with. */
const BACKTICK = 0x60;
const TILDE = 0x7e;

/** Read a run of three or more backticks or tildes at `start`. */
function codeFenceAt(src: string, start: number, max: number): CodeFence | null {
  const marker = src.charCodeAt(start);
  if (marker !== BACKTICK && marker !== TILDE) return null;
  let pos = start;
  while (pos < max && src.charCodeAt(pos) === marker) pos += 1;
  const length = pos - start;
  if (length < 3) return null;
  return { marker, length, params: src.slice(pos, max).trim() };
}

/**
 * Pandoc's fenced divs, nested by counting fences.
 *
 * A line of three or more colons followed by anything opens a div; a line of
 * three or more colons alone closes the innermost open one. A div left open at
 * the end of the chapter runs to the end, which is what Pandoc does and what
 * lets a half-typed div still show the text inside it.
 */
const pandocDivs: PluginSimple = (md) => {
  const rule = (
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean,
  ): boolean => {
    if ((state.sCount[startLine] ?? 0) - state.blkIndent >= 4) return false;
    const start = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
    const max = state.eMarks[startLine] ?? 0;
    const opening = fenceAt(state.src, start, max);
    if (opening === null || opening.params.length === 0) return false;
    if (silent) return true;

    // Colons inside a code fence are text, not fences. A chapter that shows
    // the reader how to write a fenced div — and the canon's own chapter does
    // — would otherwise close the div it is written inside, and everything
    // after it would land in the wrong place.
    let depth = 1;
    let closeLine = endLine;
    let openCodeFence: CodeFence | null = null;
    for (let line = startLine + 1; line < endLine; line += 1) {
      if ((state.sCount[line] ?? 0) - state.blkIndent >= 4) continue;
      const lineStart = (state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0);
      const lineMax = state.eMarks[line] ?? 0;
      const code = codeFenceAt(state.src, lineStart, lineMax);
      if (openCodeFence !== null) {
        if (
          code !== null &&
          code.marker === openCodeFence.marker &&
          code.length >= openCodeFence.length &&
          code.params.length === 0
        ) {
          openCodeFence = null;
        }
        continue;
      }
      if (code !== null) {
        openCodeFence = code;
        continue;
      }
      const fence = fenceAt(state.src, lineStart, lineMax);
      if (fence === null) continue;
      if (fence.params.length === 0) {
        depth -= 1;
        if (depth === 0) {
          closeLine = line;
          break;
        }
      } else {
        depth += 1;
      }
    }

    const parentType = state.parentType;
    const lineMax = state.lineMax;
    state.parentType = "root";
    state.lineMax = closeLine;

    const open = state.push("div_open", "div", 1);
    open.markup = ":".repeat(opening.length);
    open.info = opening.params;
    open.map = [startLine, Math.min(closeLine + 1, endLine)];
    md.block.tokenize(state, startLine + 1, closeLine);
    const close = state.push("div_close", "div", -1);
    close.markup = ":".repeat(opening.length);

    state.parentType = parentType;
    state.lineMax = lineMax;
    state.line = Math.min(closeLine + 1, endLine);
    return true;
  };
  md.block.ruler.before("fence", "pandoc_div", rule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
};

/** A citation key: Pandoc's shape, which must end on a letter or a digit. */
const CITATION_KEY = /@([A-Za-z\d_][\w:.#$%&+?<>~/-]*[A-Za-z\d_]|[A-Za-z\d_])/g;

/** The same key, anchored: "is there one exactly here?". */
const STICKY_CITATION_KEY = new RegExp(CITATION_KEY.source, "y");

/** Every key in a bracketed citation, in source order, with where it ended. */
interface CitationKeys {
  readonly keys: string[];
  /** The index just past the last key, in the text that was searched. */
  readonly end: number;
}

/**
 * Read the keys of a bracketed citation.
 *
 * The end is the match's own index, never a search for the key's text: a
 * citation may name the same key twice, or name a key whose text also appears
 * in the locator, and `lastIndexOf` would then cut the locator in the wrong
 * place. The match knows where it was.
 */
function citationKeys(text: string): CitationKeys {
  const keys: string[] = [];
  let end = 0;
  CITATION_KEY.lastIndex = 0;
  let match: RegExpExecArray | null = CITATION_KEY.exec(text);
  while (match !== null) {
    if (match[1] !== undefined) keys.push(match[1]);
    end = match.index + match[0].length;
    match = CITATION_KEY.exec(text);
  }
  return { keys, end };
}

/**
 * Pandoc's citations, recognised but not resolved.
 *
 * `[@key]`, `[@key, p. 4]`, `[see @key; @other]` and a bare `@key` in prose all
 * become one citation node carrying its keys, its locator, and the text the
 * author wrote. A bracket followed by `(`, `[` or `{` is left alone: that is a
 * link or a bracketed span, and both belong to rules that already exist.
 */
const citations: PluginSimple = (md) => {
  const rule = (state: StateInline, silent: boolean): boolean => {
    const code = state.src.charCodeAt(state.pos);
    if (code === 0x5b /* [ */) {
      const close = state.src.indexOf("]", state.pos + 1);
      if (close === -1 || close > state.posMax) return false;
      const inner = state.src.slice(state.pos + 1, close);
      // A backtick inside the brackets means a code span, and `[`@` is code`]`
      // is not a citation: what is inside a code span is text the author asked
      // to be shown exactly as written.
      if (inner.includes("[") || inner.startsWith("^") || inner.includes("`")) {
        return false;
      }
      const next = state.src.charCodeAt(close + 1);
      if (next === 0x28 || next === 0x5b || next === 0x7b) return false;
      const { keys, end } = citationKeys(inner);
      if (keys.length === 0) return false;
      if (!silent) {
        const token = state.push("citation", "", 0);
        token.content = state.src.slice(state.pos, close + 1);
        const after = inner.slice(end);
        token.meta = { keys, locator: after.replace(/^\s*,\s*/, "").trim() };
      }
      state.pos = close + 1;
      return true;
    }
    if (code !== 0x40 /* @ */) return false;
    const before = state.pos > 0 ? state.src.charCodeAt(state.pos - 1) : 0x20;
    if (/[\w@]/.test(String.fromCharCode(before))) return false;
    // Sticky, not global: the rule asks whether a key starts *here*, and a
    // global search would run to the end of the paragraph on every `@` that
    // is not one — an email address in a long paragraph, say.
    STICKY_CITATION_KEY.lastIndex = state.pos;
    const match = STICKY_CITATION_KEY.exec(state.src);
    if (match === null) return false;
    if (!silent) {
      const token = state.push("citation", "", 0);
      token.content = match[0];
      token.meta = { keys: [match[1] ?? ""], locator: "" };
    }
    state.pos += match[0].length;
    return true;
  };
  md.inline.ruler.before("link", "citation", rule);
};

// `@types/markdown-it-attrs` and `@types/markdown-it-footnote` are written
// against markdown-it's CommonJS typings, while this module imports its ES
// module ones. The two describe the same object; the cast says so once, here,
// rather than at every call.
const attrsPlugin = attrs as unknown as PluginSimple;
const footnotePlugin = footnote as unknown as PluginSimple;

/**
 * The one configured instance. Stateless between parses; the env is not.
 */
export const markdown = new MarkdownIt({ html: true, typographer: false, linkify: false })
  .use(bracketedSpans)
  .use(attrsPlugin)
  .use(footnotePlugin)
  .use(pandocDivs)
  .use(citations);

// The tail rule moves footnote definitions to the end of the token stream and
// drops the ones nothing references. Both would cost a definition its place in
// the file, and a span that does not name where the text is is not a span.
markdown.core.ruler.disable("footnote_tail");
