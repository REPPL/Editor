/**
 * The bibliography: BibTeX read once, resolved once, for every rendering.
 *
 * `05-internals.md` section 4 names one module for this — "reads BibTeX,
 * resolves keys, generates reference lists" — because a citation renders
 * three ways (a numbered marker with a margin note in the article, a credit
 * line at the foot of a slide, a numbered entry in the PDF) and three
 * separate resolvers would be three chances to disagree about which keys a
 * document cites, in what order, and what a reference says. Every rendering
 * calls the pure functions here; nothing else parses a `.bib` file or numbers
 * a reference.
 *
 * `03-evidence.md` leaves the catalogue of citation styles open and this
 * intent (itd-2609051335502171) covers the one style `document.yaml` can
 * currently name, `numeric`: a marker in reading order, `[1]`, the locator
 * after it inside the brackets, and a reference list numbered in
 * first-citation order, one entry per cited key and no others. An
 * unrecognised `citation_style` falls back to `numeric` rather than refusing
 * to render, because a typo in that one line of metadata is not a reason to
 * stop the reference list a chapter's citations already earn.
 */

import { placementOf, type Rendering } from "./canon";
import { walkInlines, type Block, type Chapter, type Inline } from "./tree";

/** One BibTeX entry: its type, and every field it carries. */
export interface BibEntry {
  /** The citation key, exactly as the file names it. BibTeX keys are case-sensitive. */
  readonly key: string;
  /** The entry type — `article`, `book`, `inproceedings` — lower-cased. */
  readonly type: string;
  /** Every field the entry carries, field names lower-cased, whitespace collapsed. */
  readonly fields: Readonly<Record<string, string>>;
}

/**
 * A `.bib` file, read once.
 *
 * `notes` is what the reader skipped rather than guessed at: a `@string`
 * macro (left unexpanded, "may be ignored with a note"), an entry with no
 * citation key, or a second entry that repeats a key the file already
 * defined (the first stands). One line each, so a broken file is
 * diagnosable rather than silently thin.
 */
export interface Bibliography {
  /** Every entry, by key, in the order the file defines them. */
  readonly entries: ReadonlyMap<string, BibEntry>;
  readonly notes: readonly string[];
}

/** A bibliography with nothing in it: a document that names no `.bib` file. */
export const EMPTY_BIBLIOGRAPHY: Bibliography = { entries: new Map(), notes: [] };

// --------------------------------------------------------------- the reader

/** Whether a character can start or continue a BibTeX entry-type or field name. */
function isNameCharacter(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_-]/.test(char);
}

/**
 * A one-based line counter for a monotonically increasing index.
 *
 * `parseBibliography`'s own scan only ever asks for a later index than its
 * last question, so this counts each newline once across the whole file —
 * an O(n) total rather than the O(n²) a rescan from the start, once per
 * note, made real on a hostile file of many bad entries (Fable F17).
 */
function lineCounter(text: string): (index: number) => number {
  let line = 1;
  let countedUpTo = 0;
  return (index: number): number => {
    while (countedUpTo < index && countedUpTo < text.length) {
      if (text[countedUpTo] === "\n") line += 1;
      countedUpTo += 1;
    }
    return line;
  };
}

/** Collapse runs of whitespace, including newlines, into a single space. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** A LaTeX accent command's own character to the combining mark it draws. */
const LATEX_ACCENT_COMBINING: Readonly<Record<string, string>> = {
  '"': "̈", // dieresis / umlaut
  "'": "́", // acute
  "`": "̀", // grave
  "^": "̂", // circumflex
  "~": "̃", // tilde
  c: "̧", // cedilla
  v: "̌", // caron
  "=": "̄", // macron
  H: "̋", // double acute
  r: "̊", // ring above
  u: "̆", // breve
  ".": "̇", // dot above
};

/**
 * Fold what a reference manager's own BibTeX export writes for a reader who
 * has no LaTeX to render it: the protective braces around a title BibTeX
 * styles would otherwise lower-case (`{The {Great} War}`), the dozen common
 * accent commands, braced or bare (`{\"o}` and `\'e` both), a double or
 * triple dash into an en or em dash, and a tie (`~`) into an ordinary space
 * (Fable F17). Every remaining `{`/`}` is protective by the time a value
 * reaches here — nothing upstream keeps one for any other reason — so they
 * are simply removed rather than matched brace by brace.
 */
function foldLatexEscapes(value: string): string {
  return value
    .replace(/[{}]/g, "")
    .replace(/\\([`'^"~=Hcvru.])([A-Za-z])/g, (match, command: string, letter: string) => {
      const mark = LATEX_ACCENT_COMBINING[command];
      return mark === undefined ? match : (letter + mark).normalize("NFC");
    })
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/~/g, " ");
}

/**
 * Read a `{`-delimited value starting at `open` (the index of the `{`).
 *
 * Braces nest — `title = {The {Great} War}` is one value — so the reader
 * counts depth rather than stopping at the first `}`. An unclosed brace runs
 * to the end of the file, which is what lets a half-typed entry still read
 * back something rather than throwing the whole file away.
 */
function readBraced(text: string, open: number): { value: string; end: number } {
  let depth = 0;
  let cursor = open;
  for (; cursor < text.length; cursor += 1) {
    const char = text[cursor];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return { value: text.slice(open + 1, cursor), end: cursor + 1 };
      }
    }
  }
  return { value: text.slice(open + 1), end: text.length };
}

/**
 * Read a `"`-delimited value starting at `open` (the index of the `"`).
 *
 * A brace inside a quoted value protects a `"` from closing it — BibTeX's own
 * quirk, used to write a quotation inside a title — so the reader tracks
 * brace depth here too and only a `"` at depth zero ends the value.
 */
function readQuoted(text: string, open: number): { value: string; end: number } {
  let depth = 0;
  let cursor = open + 1;
  for (; cursor < text.length; cursor += 1) {
    const char = text[cursor];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === '"' && depth <= 0) {
      return { value: text.slice(open + 1, cursor), end: cursor + 1 };
    }
  }
  return { value: text.slice(open + 1), end: text.length };
}

/** Read a bare value — a number or an unexpanded macro name — up to `,` or the closer. */
function readBare(text: string, start: number, closer: string): { value: string; end: number } {
  let cursor = start;
  while (cursor < text.length && text[cursor] !== "," && text[cursor] !== closer) {
    cursor += 1;
  }
  return { value: text.slice(start, cursor), end: cursor };
}

/** Skip whitespace, returning the index of the first non-whitespace character. */
function skipSpace(text: string, start: number): number {
  let cursor = start;
  while (cursor < text.length && /\s/.test(text[cursor] ?? "")) cursor += 1;
  return cursor;
}

/**
 * Skip one balanced `{…}` or `(…)` block, whichever `open` names.
 *
 * Used for `@comment` and `@string`, whose content this reader has no use
 * for once it has noted that it skipped it.
 */
function skipBalanced(text: string, open: number): number {
  const opener = text[open];
  const closer = opener === "(" ? ")" : "}";
  let depth = 0;
  let cursor = open;
  for (; cursor < text.length; cursor += 1) {
    if (text[cursor] === opener) depth += 1;
    else if (text[cursor] === closer) {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
  }
  return text.length;
}

/**
 * Parse the text of a `.bib` file.
 *
 * A single left-to-right scan: everything outside an `@type{…}` block —
 * blank lines, prose, a `%` comment some BibTeX flavours allow — is text the
 * reader was never asked to understand, and is simply the space between one
 * `@` and the next. `and`-separated authors are left as the file wrote them,
 * in the `author` field, for [`authorsOf`] to split; nothing here decides how
 * a name is displayed.
 */
export function parseBibliography(text: string): Bibliography {
  const lineAt = lineCounter(text);
  const entries = new Map<string, BibEntry>();
  const notes: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const at = text.indexOf("@", cursor);
    if (at === -1) break;
    let typeEnd = at + 1;
    while (isNameCharacter(text[typeEnd])) typeEnd += 1;
    const type = text.slice(at + 1, typeEnd).toLowerCase();
    if (type === "") {
      cursor = at + 1;
      continue;
    }
    const openAt = skipSpace(text, typeEnd);
    const opener = text[openAt];
    if (opener !== "{" && opener !== "(") {
      // Not a recognisable entry — an `@` in running prose between entries.
      cursor = typeEnd;
      continue;
    }
    const closer = opener === "(" ? ")" : "}";

    if (type === "comment") {
      cursor = skipBalanced(text, openAt);
      continue;
    }
    if (type === "string") {
      const nameEnd = (() => {
        let end = skipSpace(text, openAt + 1);
        while (isNameCharacter(text[end])) end += 1;
        return end;
      })();
      const name = text.slice(skipSpace(text, openAt + 1), nameEnd).trim();
      notes.push(`ignored a @string macro '${name}', line ${String(lineAt(at))}`);
      cursor = skipBalanced(text, openAt);
      continue;
    }

    // An ordinary entry: a key, then `field = value` pairs to the closer.
    let keyEnd = openAt + 1;
    while (keyEnd < text.length && text[keyEnd] !== "," && text[keyEnd] !== closer) {
      keyEnd += 1;
    }
    const key = text.slice(openAt + 1, keyEnd).trim();
    const fields: Record<string, string> = {};
    let fieldCursor = keyEnd;
    if (text[fieldCursor] === ",") fieldCursor += 1;
    for (;;) {
      fieldCursor = skipSpace(text, fieldCursor);
      if (fieldCursor >= text.length || text[fieldCursor] === closer) {
        fieldCursor += 1;
        break;
      }
      if (text[fieldCursor] === ",") {
        fieldCursor += 1;
        continue;
      }
      let nameEnd = fieldCursor;
      while (isNameCharacter(text[nameEnd])) nameEnd += 1;
      if (nameEnd === fieldCursor) {
        // Something the reader does not recognise as a field name: give up on
        // this entry's fields rather than loop without moving.
        fieldCursor = skipBalanced(text, openAt);
        break;
      }
      const name = text.slice(fieldCursor, nameEnd).toLowerCase();
      let valueStart = skipSpace(text, nameEnd);
      if (text[valueStart] !== "=") {
        fieldCursor = skipBalanced(text, openAt);
        break;
      }
      valueStart = skipSpace(text, valueStart + 1);
      const first = text[valueStart];
      const read =
        first === "{"
          ? readBraced(text, valueStart)
          : first === '"'
            ? readQuoted(text, valueStart)
            : readBare(text, valueStart, closer);
      fields[name] = foldLatexEscapes(collapseWhitespace(read.value));
      fieldCursor = skipSpace(text, read.end);
      if (text[fieldCursor] === ",") fieldCursor += 1;
    }

    if (key === "") {
      notes.push(`an entry with no citation key, line ${String(lineAt(at))}`);
    } else if (entries.has(key)) {
      notes.push(`ignored a repeated key '${key}', line ${String(lineAt(at))}`);
    } else {
      entries.set(key, { key, type, fields });
    }
    cursor = fieldCursor;
  }
  return { entries, notes };
}

// ------------------------------------------------------------- author names

/** The authors of one entry, in the order the file lists them. */
export function authorsOf(entry: BibEntry): readonly string[] {
  const author = entry.fields["author"];
  if (author === undefined || author === "") return [];
  return author
    .split(/\s+and\s+/i)
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

/**
 * One author's surname.
 *
 * BibTeX writes a name either `Last, First` or `First Last`; this reads the
 * first form directly and takes the last word of the second, which is
 * imprecise for a name with a multi-word surname but is a plain rendering, not
 * a bibliographic engine.
 */
export function surnameOf(author: string): string {
  const commaAt = author.indexOf(",");
  if (commaAt !== -1) return author.slice(0, commaAt).trim();
  const words = author.trim().split(/\s+/);
  return words[words.length - 1] ?? author;
}

/** Every author's name, in the order BibTeX itself displays a full list: "A, B and C". */
export function formatAuthorList(authors: readonly string[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return authors[0] ?? "";
  const last = authors[authors.length - 1];
  return `${authors.slice(0, -1).join(", ")} and ${last ?? ""}`;
}

/** A short label naming who wrote an entry, for a place too narrow for a full list. */
export function shortAuthorLabel(entry: BibEntry): string {
  const surnames = authorsOf(entry).map(surnameOf);
  if (surnames.length === 0) return "";
  if (surnames.length === 1) return surnames[0] ?? "";
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`;
  return `${surnames[0]} et al.`;
}

// ------------------------------------------------------------- the wording

/**
 * The generated reference-list text for one entry.
 *
 * "Formatted plainly (authors, year, title, container, and whatever the
 * entry gives, in a fixed order)": the fixed order is the full author list,
 * the year, the title, the container — `journal`, then `booktitle`, then
 * `publisher`, whichever the entry gives first — and finally `volume`,
 * `number`, `pages` and `url` where the entry carries them. A field the
 * entry does not carry is simply absent rather than shown empty, and an
 * entry with none of them prints its own key rather than an empty line.
 */
export function formatReference(entry: BibEntry): string {
  const authors = formatAuthorList(authorsOf(entry));
  const year = entry.fields["year"] ?? "";
  const title = entry.fields["title"] ?? "";
  const container =
    entry.fields["journal"] ?? entry.fields["booktitle"] ?? entry.fields["publisher"] ?? "";
  const volume = entry.fields["volume"] ?? "";
  const number = entry.fields["number"] ?? "";
  const pages = entry.fields["pages"] ?? "";
  const url = entry.fields["url"] ?? "";
  const volumeNumber =
    volume === "" && number === "" ? "" : `${volume}${number === "" ? "" : `(${number})`}`;
  const parts = [authors, year, title, container, volumeNumber, pages, url].filter(
    (part) => part !== "",
  );
  return parts.length === 0 ? entry.key : `${parts.join(". ")}.`;
}

/** A short label naming an entry, for the deck's credit line: "Author, Year". */
export function shortReference(entry: BibEntry): string {
  const label = shortAuthorLabel(entry);
  const year = entry.fields["year"] ?? "";
  const named = [label, year].filter((part) => part !== "").join(", ");
  return named === "" ? entry.key : named;
}

/** The one style this phase configures. `03-evidence.md` leaves the rest open. */
export const DEFAULT_CITATION_STYLE = "numeric";

// ---------------------------------------------------------------- resolving

/**
 * Every citation inline of a chapter, in source order, footnote bodies
 * included.
 *
 * `rendering` skips a block, and everything inside it, wherever that
 * rendering's own placement for it is "absent" — a `.notes` div is absent
 * from the article, so a citation written only inside one earns no numbered
 * entry and no margin note there (Fable F7): nothing on the page ever points
 * at it. Left undefined, every citation counts, wherever it sits — the
 * shape the deck's own `citationLinesFor` needs, since it credits a
 * citation in a slide's own speaker notes on purpose. `walkChapterBlocks`
 * is not reused here because its own descent has no way to stop at an
 * absent container's own children; this walk does, one call at a time.
 */
function citationsIn(chapter: Chapter, rendering?: Rendering): Inline[] {
  const found: Inline[] = [];
  const visit = (blocks: readonly Block[]): void => {
    for (const block of blocks) {
      if (rendering !== undefined && placementOf(block, rendering) === "absent") continue;
      for (const inline of walkInlines(block.inlines)) {
        if (inline.kind === "citation") found.push(inline);
      }
      visit(block.children);
      for (const item of block.items ?? []) visit(item.blocks);
    }
  };
  visit(chapter.blocks);
  for (const definition of Object.values(chapter.footnotes)) visit(definition.blocks);
  return found;
}

/** One entry of a generated reference list. */
export interface ReferenceListEntry {
  /** 1-based, in first-citation order across the chapters resolved together. */
  readonly number: number;
  readonly key: string;
  readonly entry: BibEntry;
  readonly text: string;
}

/**
 * What resolving a document's chapters against its bibliography produces.
 *
 * One resolution, shared by the article, the deck and the PDF: each asks this
 * for the same chapters and the same bibliography, and none of them numbers a
 * key or writes a reference itself.
 */
export interface CitationResolution {
  /** The reference list, one entry per cited key that resolves, first-citation order. */
  readonly references: readonly ReferenceListEntry[];
  /** The number a resolved key was given. */
  readonly numberOf: ReadonlyMap<string, number>;
  /** A resolved key's reference-list entry, for a margin note or a credit line. */
  readonly byKey: ReadonlyMap<string, ReferenceListEntry>;
  /** Every key the chapters cite that resolves to no entry, first-citation order, each once. */
  readonly unresolvedKeys: readonly string[];
}

/** A resolution with nothing cited: a chapter with no citations, or no bibliography at all. */
export const EMPTY_RESOLUTION: CitationResolution = {
  references: [],
  numberOf: new Map(),
  byKey: new Map(),
  unresolvedKeys: [],
};

/**
 * Resolve every citation in a run of chapters against one bibliography.
 *
 * The one resolver `05-internals.md` section 4 asks for: called once per
 * document, with the chapters in reading order, so the reference list, the
 * article's numbering, the deck's credit lines and the PDF's numbering all
 * come from the one pass over the one tree.
 *
 * `rendering` is the placement filter `citationsIn` applies — pass
 * `"article"` for the resolution that feeds the article's own numbering
 * and reference list, so a citation written only inside a `.notes` div
 * never earns an entry there (Fable F7); leave it undefined for the deck's
 * own resolution, which credits a citation wherever a slide's own content
 * carries it, speaker notes included.
 */
export function resolveCitations(
  chapters: readonly Chapter[],
  bibliography: Bibliography,
  rendering?: Rendering,
): CitationResolution {
  const numberOf = new Map<string, number>();
  const byKey = new Map<string, ReferenceListEntry>();
  const references: ReferenceListEntry[] = [];
  const unresolvedKeys: string[] = [];
  const seenUnresolved = new Set<string>();
  for (const chapter of chapters) {
    for (const citation of citationsIn(chapter, rendering)) {
      for (const key of citation.keys ?? []) {
        const found = bibliography.entries.get(key);
        if (found === undefined) {
          if (!seenUnresolved.has(key)) {
            seenUnresolved.add(key);
            unresolvedKeys.push(key);
          }
          continue;
        }
        if (numberOf.has(key)) continue;
        const number = references.length + 1;
        const reference: ReferenceListEntry = { number, key, entry: found, text: formatReference(found) };
        numberOf.set(key, number);
        byKey.set(key, reference);
        references.push(reference);
      }
    }
  }
  return { references, numberOf, byKey, unresolvedKeys };
}

/**
 * The keys one chapter cites that resolve to nothing, first-citation order.
 *
 * The sidebar's own question — "what does this chapter carry that I have not
 * finished?" — is per chapter, unlike [`resolveCitations`], which is asked
 * once for the whole document so its numbering agrees everywhere.
 */
export function unresolvedCitationKeysIn(
  chapter: Chapter,
  bibliography: Bibliography,
): readonly string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const citation of citationsIn(chapter)) {
    for (const key of citation.keys ?? []) {
      if (bibliography.entries.has(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

/** The parts a citation's inline marker is built from, once numbers are known. */
export interface CitationParts {
  /** The numbers of every key that resolved, in the order the citation names them. */
  readonly numbers: readonly number[];
  /** Every key in the citation that did not resolve, in the order it names them. */
  readonly unresolvedKeys: readonly string[];
  readonly locator: string;
}

/** Split one citation inline's keys into what resolved and what did not. */
export function citationPartsOf(node: Inline, resolution: CitationResolution): CitationParts {
  const numbers: number[] = [];
  const unresolvedKeys: string[] = [];
  for (const key of node.keys ?? []) {
    const number = resolution.numberOf.get(key);
    if (number === undefined) unresolvedKeys.push(key);
    else numbers.push(number);
  }
  return { numbers, unresolvedKeys, locator: node.locator ?? "" };
}
