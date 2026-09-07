/**
 * `spc-2609061318158216` (map #26): the reading views' own vocabulary,
 * serialised. `article-keys.js` cannot import `src/keys.ts` at all — the
 * published site serves it under `script-src 'self'` with no bundler — so
 * this module is the one place the table's own rows become the JSON that
 * script reads. Every assertion below is really an assertion about that
 * crossing: the data this module writes must name exactly the ids
 * `READING_BINDING_IDS` names, in that order, with nothing invented and
 * nothing dropped.
 */
import { describe, expect, it } from "vitest";

import { READING_BINDING_IDS, bindingById } from "../../keys";
import {
  READING_KEYS_DATA_ID,
  readingBindingData,
  readingBindingDataJson,
  readingKeysDataScript,
} from "./reading-keys";

describe("readingBindingData", () => {
  it("names exactly the reading views' own ids, in the table's own order", () => {
    const data = readingBindingData();
    expect(data.map((row) => row.id)).toEqual([...READING_BINDING_IDS]);
  });

  /**
   * A chord the table names for a row but this page never claims — the
   * browser's own key wins outright (iss-2609070642203845, Fable F27), so
   * `readingBindingData`'s own copy of that row's chords is the table's
   * own list with these removed, not the table's list verbatim.
   */
  const EXCLUDED: ReadonlySet<string> = new Set(["s-f", "Down", "Up"]);

  it("carries each row's label, and the table's own chords with the browser's own excluded", () => {
    const data = readingBindingData();
    for (const row of data) {
      const binding = bindingById(row.id);
      expect(binding, `${row.id} is not a row in BINDINGS`).toBeDefined();
      expect(row.label).toBe(binding?.label);
      expect(row.chords).toEqual((binding?.chords ?? []).filter((chord) => !EXCLUDED.has(chord)));
    }
  });

  it("excludes s-f, so the browser's own Cmd-F reaches the page rather than this page's own search", () => {
    const search = readingBindingData().find((row) => row.id === "isearch-forward");
    expect(search?.chords).not.toContain("s-f");
    expect(search?.chords).toContain("C-s");
  });

  it("excludes bare Down and Up, so the browser's own scroll is never swallowed", () => {
    const next = readingBindingData().find((row) => row.id === "next-line");
    const previous = readingBindingData().find((row) => row.id === "previous-line");
    expect(next?.chords).not.toContain("Down");
    expect(next?.chords).toContain("C-n");
    expect(previous?.chords).not.toContain("Up");
    expect(previous?.chords).toContain("C-p");
  });

  it("carries nothing beyond id, label and chords", () => {
    for (const row of readingBindingData()) {
      expect(Object.keys(row).sort()).toEqual(["chords", "id", "label"]);
    }
  });
});

describe("readingBindingDataJson", () => {
  it("parses back to the same rows readingBindingData returns", () => {
    expect(JSON.parse(readingBindingDataJson())).toEqual(readingBindingData());
  });

  it("escapes a bare '<' so the JSON can never end its own script tag early", () => {
    // No row in the table happens to carry one today, so the escape is
    // proven directly against the character rather than against a fixture
    // row that might drift.
    expect(readingBindingDataJson()).not.toContain("<");
  });
});

describe("readingKeysDataScript", () => {
  it("writes one script tag, carrying the data's own id and JSON", () => {
    const html = readingKeysDataScript();
    expect(html).toBe(
      `<script type="application/json" id="${READING_KEYS_DATA_ID}">${readingBindingDataJson()}</script>`,
    );
  });

  it("parses as a real script element a page can read back by id", () => {
    const page = new DOMParser().parseFromString(
      `<!doctype html><html><body>${readingKeysDataScript()}</body></html>`,
      "text/html",
    );
    const script = page.getElementById(READING_KEYS_DATA_ID);
    expect(script?.tagName).toBe("SCRIPT");
    expect(script?.getAttribute("type")).toBe("application/json");
    expect(JSON.parse(script?.textContent ?? "")).toEqual(readingBindingData());
  });
});
