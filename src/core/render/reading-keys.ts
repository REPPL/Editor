/**
 * The reading views' own vocabulary, serialised as page data.
 *
 * `spc-2609061318158216` (map #26) is the design record. A reading view
 * declares which rows of `src/keys.ts`'s own table it honours
 * (`READING_BINDING_IDS`) rather than inventing a chord of its own, but the
 * article's own script, `article-keys.js`, is a plain file the published
 * site serves under `script-src 'self'` with no bundler — it cannot import
 * `src/keys.ts` at all. This module is the one place that gap is crossed:
 * it reads the table (safe from Node and from a browser alike, because
 * `src/keys.ts` imports nothing) and writes exactly what a reading page
 * needs — the id, the label, and the chords a reader would recognise from
 * the editing surface — as the one `<script type="application/json">` block
 * `articleDocument` (`src/publish/build.ts`) and the app's own preview
 * window (`src/preview.ts`) both write, so the site build, the folder
 * export and the app's preview agree with no second copy of the list
 * (`itd-2609051336090390`, one source, always).
 */

import { readingBindings } from "../../keys";

/** One honoured row, exactly as `article-keys.js` reads it back. */
export interface ReadingBindingData {
  readonly id: string;
  readonly label: string;
  readonly chords: readonly string[];
}

/** The id the `<script type="application/json">` block carries. */
export const READING_KEYS_DATA_ID = "article-keys-data";

/**
 * A chord this reading page never claims, even where the editing surface's
 * own row lists it — the browser's own key wins outright, with no chord of
 * this page's own left to fall back to (iss-2609070642203845, Fable F27):
 *
 * - `s-f` (Cmd-F): the spec's own Design names the browser's native find as
 *   the accessible route to search, and this page's own `C-s` already
 *   answers `isearch-forward` without it.
 * - `Down`/`Up`: bare, they are the browser's own scroll, and a reader who
 *   has not yet moved to a Section (`sectionIndex === -1`) got a swallowed
 *   key that moved nothing at all; `C-n`/`C-p` still answer `next-line`/
 *   `previous-line`.
 */
const READING_EXCLUDED_CHORDS: ReadonlySet<string> = new Set(["s-f", "Down", "Up"]);

/**
 * The reading views' own vocabulary, ready to serialise.
 *
 * A plain object literal per row rather than the `Binding` itself: the
 * article's script has no use for `group` or `owner`, and a reading page's
 * data should carry only what it reads, not the whole shape of a table it
 * never sees. A row whose every chord is excluded is dropped rather than
 * serialised with an empty `chords` array, which `article-keys.js` would
 * otherwise read as a prefix or a chord no press could ever complete.
 */
export function readingBindingData(): ReadingBindingData[] {
  return readingBindings()
    .map(({ id, label, chords }) => ({
      id,
      label,
      chords: chords.filter((chord) => !READING_EXCLUDED_CHORDS.has(chord)),
    }))
    .filter((row) => row.chords.length > 0);
}

/**
 * The JSON text `readingBindingData` serialises to, with `<` escaped.
 *
 * None of the table's own labels or chords contain `<`, but a
 * `<script type="application/json">` block is still HTML: escaping the
 * character that could end the tag early is the same discipline any
 * JSON-in-HTML embedding follows, proven once here rather than trusted to
 * stay true of every row a later edit to the table might add.
 */
export function readingBindingDataJson(): string {
  return JSON.stringify(readingBindingData()).replace(/</g, "\\u003c");
}

/**
 * The `<script type="application/json">` block itself, verbatim.
 *
 * `articleDocument` and the preview window both write this exact string, so
 * a fix to what a reading page honours reaches every host from one function.
 */
export function readingKeysDataScript(): string {
  return `<script type="application/json" id="${READING_KEYS_DATA_ID}">${readingBindingDataJson()}</script>`;
}
