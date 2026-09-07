/**
 * What a publish refuses before it builds anything, and what variant it
 * publishes under when it does not refuse.
 *
 * A version at a public link cannot be taken back, so everything that would
 * make one wrong is answered here, before a single file is rendered: a buffer
 * the file does not match, a chapter that would go missing from the page, and
 * several variants named with none of them confirmed as the default. A
 * document that names no variant at all is not refused — it publishes as its
 * own single default variant.
 */

import { describe, expect, it, vi } from "vitest";

import { documentForPublish, type PublishReaders, type PublishSource } from "./services";

const ROOT = "/documents/lantern";

function source(overrides: Partial<PublishSource> = {}): PublishSource {
  return {
    documentRoot: ROOT,
    dirty: false,
    chapters: [
      { path: `${ROOT}/01-part/01-opening.md`, title: "Opening" },
      { path: `${ROOT}/01-part/02-method.md`, title: "Method" },
    ],
    ...overrides,
  };
}

function readers(overrides: Partial<PublishReaders> = {}): PublishReaders {
  return {
    readChapters: vi.fn((paths: readonly string[]) =>
      Promise.resolve({
        reads: paths.map((path) => ({ path, text: "# A chapter\n\nA paragraph.\n" })),
        failures: [] as readonly string[],
      }),
    ),
    readDocumentMetadata: vi.fn(() =>
      Promise.resolve({
        title: "The Lantern Papers",
        variants: ["talk", "full"] as readonly string[],
        default_variant: "talk",
      }),
    ),
    ...overrides,
  };
}

describe("the document a publish is given", () => {
  it("names every chapter relative to the document root", async () => {
    const loaded = await documentForPublish(source(), readers());
    expect(loaded.title).toBe("The Lantern Papers");
    expect(loaded.variant).toBe("talk");
    expect(loaded.tree.chapters.map((chapter) => chapter.path)).toEqual([
      "01-part/01-opening.md",
      "01-part/02-method.md",
    ]);
  });

  it("carries the bibliography's own text through, or null where a reader gives none", async () => {
    const withOne = await documentForPublish(
      source(),
      readers({ readBibliography: vi.fn(() => Promise.resolve("@misc{a, year = {2020}}")) }),
    );
    expect(withOne.bibliography).toBe("@misc{a, year = {2020}}");
    // No `readBibliography` at all: a reader written before itd-2609051335502171.
    const withNone = await documentForPublish(source(), readers());
    expect(withNone.bibliography).toBeNull();
  });

  it("refuses while the buffer differs from the file", async () => {
    // The publish reads the files; the buffer is what the author is looking at.
    // Publishing over an unsaved edit would put a version at a public link that
    // says something other than the screen it was started from.
    const read = readers();
    await expect(documentForPublish(source({ dirty: true }), read)).rejects.toThrow(
      /unsaved edits/,
    );
    expect(read.readChapters).not.toHaveBeenCalled();
  });

  it("refuses when a chapter would not read, and names it", async () => {
    const read = readers({
      readChapters: vi.fn((paths: readonly string[]) =>
        Promise.resolve({
          reads: paths
            .filter((path) => !path.endsWith("02-method.md"))
            .map((path) => ({ path, text: "# One\n" })),
          failures: ["cannot read 02-method.md: permission denied"],
        }),
      ),
    });
    await expect(documentForPublish(source(), read)).rejects.toThrow(
      /nothing was published: 01-part\/02-method\.md/,
    );
  });

  it("publishes a document that declares no variant as its own single default variant", async () => {
    // `C-x C-n` writes exactly this document.yaml — no `variants:` at all
    // (itd-2609051402191319 AC3) — so the tutorial that starts there must be
    // able to publish and export, not be refused for want of a name nobody
    // was ever asked to type (iss-2609070642219301, review round one Fable
    // F4).
    const read = readers({
      readDocumentMetadata: vi.fn(() =>
        Promise.resolve({ title: "Untitled", variants: [], default_variant: null }),
      ),
    });
    const loaded = await documentForPublish(source(), read);
    expect(loaded.variant).toBe("default");
  });

  it("refuses a document that declares more than one variant but names no default", async () => {
    // Unlike a document that declares none at all, guessing among several
    // named variants could publish one Alice never confirmed — the refusal
    // this finding's fix keeps rather than lifts.
    const read = readers({
      readDocumentMetadata: vi.fn(() =>
        Promise.resolve({ title: null, variants: ["full"], default_variant: null }),
      ),
    });
    await expect(documentForPublish(source(), read)).rejects.toThrow(/names no default/);
  });

  it("refuses with no folder open and with no chapters", async () => {
    await expect(
      documentForPublish(source({ documentRoot: null }), readers()),
    ).rejects.toThrow(/Open a document folder/);
    await expect(documentForPublish(source({ chapters: [] }), readers())).rejects.toThrow(
      /holds no chapters/,
    );
  });
});
