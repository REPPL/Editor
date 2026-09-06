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

  it("carries each row's label and chords, verbatim from the table", () => {
    const data = readingBindingData();
    for (const row of data) {
      const binding = bindingById(row.id);
      expect(binding, `${row.id} is not a row in BINDINGS`).toBeDefined();
      expect(row.label).toBe(binding?.label);
      expect(row.chords).toEqual(binding?.chords);
    }
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
