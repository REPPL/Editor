/**
 * Matching an easter egg's marker to its block, and placing the opening
 * quotation, against synthetic fixtures invented for this test alone.
 */

import { describe, expect, it } from "vitest";

import { analyseEggs, misplacedOpeningsIn, unresolvedEggsIn, validOpeningBlock } from "./eggs";
import { parseChapter } from "./parse";

describe("analyseEggs", () => {
  it("matches a marker and a block that name each other", () => {
    const chapter = parseChapter(
      'The survey ran[✦]{.egg egg="lantern"} on.\n\n::: {.egg #lantern label="✦"}\nA photograph.\n:::\n',
    );
    const analysis = analyseEggs(chapter);
    expect([...analysis.matched.keys()]).toEqual(["lantern"]);
    expect(analysis.matched.get("lantern")?.label).toBe("✦");
    expect(analysis.orphanMarkers).toEqual([]);
    expect(analysis.orphanBlocks).toEqual([]);
  });

  it("falls back to the id itself when the block carries no label", () => {
    const chapter = parseChapter(
      'A word[✦]{.egg egg="lantern"} follows.\n\n::: {.egg #lantern}\nContent.\n:::\n',
    );
    expect(analyseEggs(chapter).matched.get("lantern")?.label).toBe("lantern");
  });

  it("reports a marker whose id names no block as an orphan marker", () => {
    const chapter = parseChapter('A word[✦]{.egg egg="lantern"} follows.\n');
    const analysis = analyseEggs(chapter);
    expect(analysis.matched.size).toBe(0);
    expect(analysis.orphanMarkers).toEqual(["lantern"]);
    expect(analysis.orphanBlocks).toEqual([]);
  });

  it("reports a block no marker names as an orphan block", () => {
    const chapter = parseChapter('::: {.egg #lantern label="✦"}\nContent.\n:::\n');
    const analysis = analyseEggs(chapter);
    expect(analysis.matched.size).toBe(0);
    expect(analysis.orphanMarkers).toEqual([]);
    expect(analysis.orphanBlocks).toEqual(["lantern"]);
  });

  it("finds a marker nested inside a list item or a table cell", () => {
    const chapter = parseChapter(
      '- An item[✦]{.egg egg="lantern"} in a list.\n\n::: {.egg #lantern label="✦"}\nContent.\n:::\n',
    );
    expect([...analyseEggs(chapter).matched.keys()]).toEqual(["lantern"]);
  });

  it("keeps two chapters' matching independent, each against its own text", () => {
    const first = parseChapter(
      'A word[✦]{.egg egg="lantern"} here.\n\n::: {.egg #lantern label="✦"}\nOne.\n:::\n',
    );
    const second = parseChapter('::: {.egg #lantern label="✦"}\nTwo.\n:::\n');
    expect(analyseEggs(first).orphanBlocks).toEqual([]);
    expect(analyseEggs(second).orphanBlocks).toEqual(["lantern"]);
  });
});

describe("validOpeningBlock", () => {
  it("answers the first chapter's first block when it is an .opening div", () => {
    const chapter = parseChapter(
      '::: {.opening once="per-browser"}\n> A quotation.\n\n— Carol\n:::\n\n# Beginnings\n',
    );
    const block = validOpeningBlock(chapter, true);
    expect(block?.attributes.classes).toEqual(["opening"]);
  });

  it("answers null when the chapter is not the document's first", () => {
    const chapter = parseChapter('::: {.opening once="per-browser"}\n> A quotation.\n:::\n');
    expect(validOpeningBlock(chapter, false)).toBeNull();
  });

  it("answers null when the first block is not an .opening div", () => {
    const chapter = parseChapter('# Beginnings\n\n::: {.opening once="per-browser"}\n> Late.\n:::\n');
    expect(validOpeningBlock(chapter, true)).toBeNull();
  });

  it("answers null for a chapter with no .opening block at all", () => {
    expect(validOpeningBlock(parseChapter("A paragraph.\n"), true)).toBeNull();
  });
});

describe("misplacedOpeningsIn", () => {
  it("counts zero for a chapter with no .opening block", () => {
    expect(misplacedOpeningsIn(parseChapter("A paragraph.\n"), true)).toBe(0);
  });

  it("counts zero for the one valid opening", () => {
    const chapter = parseChapter('::: {.opening once="per-browser"}\n> A quotation.\n:::\n');
    expect(misplacedOpeningsIn(chapter, true)).toBe(0);
  });

  it("counts an .opening block in a chapter that is not the document's first", () => {
    const chapter = parseChapter('::: {.opening once="per-browser"}\n> A quotation.\n:::\n');
    expect(misplacedOpeningsIn(chapter, false)).toBe(1);
  });

  it("counts an .opening block that is not the chapter's first block", () => {
    const chapter = parseChapter(
      '# Beginnings\n\n::: {.opening once="per-browser"}\n> Late.\n:::\n',
    );
    expect(misplacedOpeningsIn(chapter, true)).toBe(1);
  });
});

describe("unresolvedEggsIn", () => {
  it("lists nothing for a chapter with every marker and block matched", () => {
    const chapter = parseChapter(
      'A word[✦]{.egg egg="lantern"} here.\n\n::: {.egg #lantern label="✦"}\nOne.\n:::\n',
    );
    expect(unresolvedEggsIn(chapter, true)).toEqual([]);
  });

  it("lists an orphan marker, an orphan block, and a misplaced opening together", () => {
    const chapter = parseChapter(
      [
        "# Beginnings",
        "",
        '::: {.opening once="per-browser"}',
        "> Late.",
        ":::",
        "",
        'A word[✦]{.egg egg="lantern"} here.',
        "",
        '::: {.egg #unrelated label="✦"}',
        "Content.",
        ":::",
        "",
      ].join("\n"),
    );
    const items = unresolvedEggsIn(chapter, true);
    expect(items).toContain("lantern (marker with no matching block)");
    expect(items).toContain("unrelated (block with no marker)");
    expect(items).toContain("opening (not the first block of the first chapter)");
    expect(items).toHaveLength(3);
  });
});
