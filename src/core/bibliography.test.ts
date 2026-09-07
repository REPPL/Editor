/**
 * The bibliography reader and resolver, against synthetic fixtures.
 *
 * No fixture here is a real BibTeX file: iss-2609061418065651 removed the
 * example documents from the tree, so every entry below is invented for this
 * test alone, in the shape a real `.bib` file takes.
 */

import { describe, expect, it } from "vitest";

import {
  authorsOf,
  citationPartsOf,
  formatReference,
  parseBibliography,
  resolveCitations,
  shortAuthorLabel,
  shortReference,
  surnameOf,
  unresolvedCitationKeysIn,
  type BibEntry,
  type Bibliography,
} from "./bibliography";
import { parseChapter } from "./parse";
import type { Chapter } from "./tree";

const SAMPLE_BIB = `
% A synthetic bibliography, invented for this test alone.
@string{cup = {Cambridge University Press}}

@article{smith2020,
  author = {Smith, Alice and Jones, Bob},
  title = {The {Lantern} Papers},
  journal = {Journal of Winters},
  year = {2020},
  volume = {12},
  number = {3},
  pages = {1--20},
}

@book{carroll1999,
  author = "Carroll, Carol",
  title = "Reading by Lamplight",
  publisher = {Harbour Press},
  year = 1999
}

@misc{noauthor2021,
  title = {A note with no author},
  year = {2021},
}

@comment{
  This whole block, braces and all, is not an entry.
}

@article{smith2020,
  author = {Someone Else},
  title = {A duplicate key, which the reader ignores},
  year = {2099},
}
`;

function bib(): Bibliography {
  return parseBibliography(SAMPLE_BIB);
}

describe("parseBibliography", () => {
  it("reads every entry's type and fields", () => {
    const { entries } = bib();
    const smith = entries.get("smith2020");
    expect(smith?.type).toBe("article");
    expect(smith?.fields["title"]).toBe("The Lantern Papers");
    expect(smith?.fields["journal"]).toBe("Journal of Winters");
    expect(smith?.fields["year"]).toBe("2020");
  });

  it("reads a double-quoted entry, including a bare numeric value", () => {
    const { entries } = bib();
    const carroll = entries.get("carroll1999");
    expect(carroll?.fields["author"]).toBe("Carroll, Carol");
    expect(carroll?.fields["title"]).toBe("Reading by Lamplight");
    expect(carroll?.fields["year"]).toBe("1999");
  });

  it("collapses internal whitespace and newlines in a value", () => {
    const { entries } = parseBibliography(
      "@article{wrapped,\n  title = {A title\n    that wraps\n    across lines},\n}",
    );
    expect(entries.get("wrapped")?.fields["title"]).toBe("A title that wraps across lines");
  });

  it("strips braces that protect capitalisation, rather than showing them to a reader (Fable F17)", () => {
    const { entries } = bib();
    const title = entries.get("smith2020")?.fields["title"];
    expect(title).not.toContain("{");
    expect(title).not.toContain("}");
    expect(title).toBe("The Lantern Papers");
  });

  it("folds a LaTeX accent command into the character it draws, each letter braced on its own", () => {
    // `String.raw` so a backslash reaches the reader as one character, not
    // an escape this test file's own source would otherwise consume — the
    // shape a reference manager's export commonly writes.
    const source = String.raw`@article{accents,
  title = {Caf\'{e} \"{u}ber \`{e}l\^{e}ve fa\c{c}ade se\~{n}or},
}`;
    const { entries } = parseBibliography(source);
    // Acute, umlaut, grave, circumflex, cedilla and tilde, one per word.
    expect(entries.get("accents")?.fields["title"]).toBe("Café über èlêve façade señor");
  });

  it("also folds the bare form, with no braces around the letter at all", () => {
    const source = String.raw`@article{bare,
  title = {Caf\'e \"uber},
}`;
    const { entries } = parseBibliography(source);
    expect(entries.get("bare")?.fields["title"]).toBe("Café über");
  });

  it("folds a double dash into an en dash, in a page range", () => {
    const { entries } = bib();
    expect(entries.get("smith2020")?.fields["pages"]).toBe("1–20");
  });

  it("folds a LaTeX tie (~) into an ordinary space", () => {
    const { entries } = parseBibliography(
      "@article{tie,\n  title = {See Figure~1},\n}",
    );
    expect(entries.get("tie")?.fields["title"]).toBe("See Figure 1");
  });

  it("ignores a @comment block entirely", () => {
    const { entries } = bib();
    expect(entries.has("comment")).toBe(false);
    expect([...entries.keys()]).not.toContain("This");
  });

  it("ignores a @string macro, with a note naming it", () => {
    const { notes } = bib();
    expect(notes.some((note) => note.includes("@string macro 'cup'"))).toBe(true);
  });

  it("keeps the first of two entries sharing a key, with a note", () => {
    const { entries, notes } = bib();
    expect(entries.get("smith2020")?.fields["year"]).toBe("2020");
    expect(notes.some((note) => note.includes("repeated key 'smith2020'"))).toBe(true);
  });

  it("reads an entry with no author field", () => {
    const { entries } = bib();
    expect(entries.get("noauthor2021")?.fields["title"]).toBe("A note with no author");
  });

  it("reads an empty file as an empty bibliography", () => {
    const { entries, notes } = parseBibliography("");
    expect(entries.size).toBe(0);
    expect(notes).toEqual([]);
  });

  it("does not loop forever on a malformed entry", () => {
    const { entries } = parseBibliography("@article{broken, not a field at all @@@ }");
    // Whatever it makes of the field list, the scan terminates and reports
    // the file's other entries, which is the property under test.
    expect(entries).toBeInstanceOf(Map);
  });
});

describe("authorsOf and the names it builds", () => {
  it("splits an author field on 'and'", () => {
    const smith = bib().entries.get("smith2020");
    expect(smith).toBeDefined();
    if (smith === undefined) throw new Error("unreachable");
    expect(authorsOf(smith)).toEqual(["Smith, Alice", "Jones, Bob"]);
  });

  it("reads a surname from 'Last, First' and from 'First Last'", () => {
    expect(surnameOf("Smith, Alice")).toBe("Smith");
    expect(surnameOf("Alice Smith")).toBe("Smith");
  });

  it("labels one, two, and three or more authors", () => {
    const one: BibEntry = {
      key: "one",
      type: "misc",
      fields: { author: "Smith, Alice" },
    };
    const two = { ...one, fields: { author: "Smith, Alice and Jones, Bob" } };
    const three = { ...one, fields: { author: "Smith, Alice and Jones, Bob and Carroll, Carol" } };
    expect(shortAuthorLabel(one)).toBe("Smith");
    expect(shortAuthorLabel(two)).toBe("Smith and Jones");
    expect(shortAuthorLabel(three)).toBe("Smith et al.");
  });
});

describe("formatReference", () => {
  it("writes authors, year, title, container, and what else the entry gives, in a fixed order", () => {
    const smith = bib().entries.get("smith2020");
    if (smith === undefined) throw new Error("unreachable");
    expect(formatReference(smith)).toBe(
      "Smith, Alice and Jones, Bob. 2020. The Lantern Papers. Journal of Winters. 12(3). 1–20.",
    );
  });

  it("falls back to the key when an entry carries none of the fields", () => {
    expect(formatReference({ key: "bare2020", type: "misc", fields: {} })).toBe("bare2020");
  });

  it("names an entry with no author by its title and year alone", () => {
    const entry = bib().entries.get("noauthor2021");
    if (entry === undefined) throw new Error("unreachable");
    expect(formatReference(entry)).toBe("2021. A note with no author.");
  });
});

describe("shortReference, for the deck's credit line", () => {
  it("names the work by author and year", () => {
    const carroll = bib().entries.get("carroll1999");
    if (carroll === undefined) throw new Error("unreachable");
    expect(shortReference(carroll)).toBe("Carroll, 1999");
  });

  it("falls back to the key when there is nothing else to name it by", () => {
    expect(shortReference({ key: "onlykey", type: "misc", fields: {} })).toBe("onlykey");
  });
});

// ------------------------------------------------------------- resolving

/** One chapter, from Markdown text a citation walks. */
function chapterOf(...lines: string[]): Chapter {
  return parseChapter(lines.join("\n"));
}

describe("resolveCitations", () => {
  it("numbers keys in first-citation order, one entry per key, no others", () => {
    const chapter = chapterOf(
      "# A Paper",
      "",
      "First [@carroll1999], then [@smith2020], then [@carroll1999] again.",
      "",
    );
    const resolution = resolveCitations([chapter], bib());
    expect(resolution.references.map((reference) => reference.key)).toEqual([
      "carroll1999",
      "smith2020",
    ]);
    expect(resolution.references.map((reference) => reference.number)).toEqual([1, 2]);
    expect(resolution.numberOf.get("carroll1999")).toBe(1);
    expect(resolution.numberOf.get("smith2020")).toBe(2);
  });

  it("carries the locator on the citation node, not on the resolution", () => {
    const chapter = chapterOf("A claim, with a page [@smith2020, p. 4].");
    const resolution = resolveCitations([chapter], bib());
    expect(resolution.references[0]?.key).toBe("smith2020");
  });

  it("numbers across chapters, in the order the chapters are given", () => {
    const first = chapterOf("An early claim [@smith2020].");
    const second = chapterOf("A later claim [@carroll1999], and [@smith2020] again.");
    const resolution = resolveCitations([first, second], bib());
    expect(resolution.references.map((reference) => reference.key)).toEqual([
      "smith2020",
      "carroll1999",
    ]);
  });

  it("lists a key that resolves to nothing, once, and keeps it out of the reference list", () => {
    const chapter = chapterOf("Citing [@nosuchkey] and again [@nosuchkey], and [@smith2020].");
    const resolution = resolveCitations([chapter], bib());
    expect(resolution.unresolvedKeys).toEqual(["nosuchkey"]);
    expect(resolution.references.map((reference) => reference.key)).toEqual(["smith2020"]);
  });

  it("gives a .notes-only citation no article entry, so nothing points at it (Fable F7)", () => {
    const chapter = chapterOf(
      "A visible claim [@smith2020].",
      "",
      "::: {.notes}",
      "An aside only a slide's speaker sees [@carroll1999].",
      ":::",
    );
    const resolution = resolveCitations([chapter], bib(), "article");
    expect(resolution.references.map((reference) => reference.key)).toEqual(["smith2020"]);
    expect(resolution.byKey.has("carroll1999")).toBe(false);
    expect(resolution.numberOf.has("carroll1999")).toBe(false);
  });

  it("still counts a .notes-only citation with no rendering filter, for the deck's own credit line", () => {
    const chapter = chapterOf(
      "A visible claim [@smith2020].",
      "",
      "::: {.notes}",
      "An aside only a slide's speaker sees [@carroll1999].",
      ":::",
    );
    const resolution = resolveCitations([chapter], bib());
    expect(resolution.references.map((reference) => reference.key)).toEqual([
      "smith2020",
      "carroll1999",
    ]);
  });

  it("resolves nothing and lists nothing for a chapter with no citations", () => {
    const chapter = chapterOf("# A Paper", "", "Plain prose, no citation at all.");
    const resolution = resolveCitations([chapter], bib());
    expect(resolution.references).toEqual([]);
    expect(resolution.unresolvedKeys).toEqual([]);
  });

  it("resolves nothing against an empty bibliography, without throwing", () => {
    const chapter = chapterOf("Citing [@smith2020].");
    const resolution = resolveCitations([chapter], parseBibliography(""));
    expect(resolution.references).toEqual([]);
    expect(resolution.unresolvedKeys).toEqual(["smith2020"]);
  });

  it("resolves a footnote's own citation, because a footnote body is walked too", () => {
    const chapter = chapterOf(
      "A claim with a note.[^n]",
      "",
      "[^n]: The note itself cites [@carroll1999].",
    );
    const resolution = resolveCitations([chapter], bib());
    expect(resolution.references.map((reference) => reference.key)).toEqual(["carroll1999"]);
  });
});

describe("unresolvedCitationKeysIn", () => {
  it("lists a chapter's own unresolved keys, in first-citation order, each once", () => {
    const chapter = chapterOf("Citing [@nosuchkey], [@smith2020], and [@nosuchkey] again, then [@other].");
    expect(unresolvedCitationKeysIn(chapter, bib())).toEqual(["nosuchkey", "other"]);
  });

  it("lists nothing for a chapter whose citations all resolve", () => {
    const chapter = chapterOf("Citing [@smith2020] and [@carroll1999].");
    expect(unresolvedCitationKeysIn(chapter, bib())).toEqual([]);
  });

  it("lists nothing for a chapter with no citations, bibliography or none", () => {
    const chapter = chapterOf("# A Paper", "", "Plain prose.");
    expect(unresolvedCitationKeysIn(chapter, bib())).toEqual([]);
    expect(unresolvedCitationKeysIn(chapter, parseBibliography(""))).toEqual([]);
  });
});

describe("citationPartsOf", () => {
  it("splits a multi-key citation into its resolved numbers and its unresolved keys", () => {
    const chapter = chapterOf("A joint claim [@smith2020; @nosuchkey].");
    const resolution = resolveCitations([chapter], bib());
    const node = chapter.blocks[0]?.inlines.find((inline) => inline.kind === "citation");
    if (node === undefined) throw new Error("the fixture carries a citation");
    expect(citationPartsOf(node, resolution)).toEqual({
      numbers: [1],
      unresolvedKeys: ["nosuchkey"],
      locator: "",
    });
  });

  it("carries the citation's own locator through", () => {
    const chapter = chapterOf("A claim [@smith2020, p. 4].");
    const resolution = resolveCitations([chapter], bib());
    const node = chapter.blocks[0]?.inlines.find((inline) => inline.kind === "citation");
    if (node === undefined) throw new Error("the fixture carries a citation");
    expect(citationPartsOf(node, resolution).locator).toBe("p. 4");
  });
});
