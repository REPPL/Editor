/**
 * The editing surface's drop branch: what lands in the text, and where the
 * cursor is left.
 *
 * jsdom has no layout engine, so the drop point is given as an offset rather
 * than measured from a pointer; what the tests hold is the text that is
 * written, the cursor, and the bytes that are not touched. The manual
 * checklist covers what only a real engine can answer.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEditor, documentText } from "./editor";
import type { DropOutcome, DropPayload, DropReport, PasteOutcome } from "./doctree";
import {
  blockInsertion,
  createDropTarget,
  describe as describeReport,
  imageInsertion,
  insertOutcomes,
  insertionFor,
  linkInsertion,
  videoBlock,
} from "./drop-target";
import type { DropTarget, DropTargetServices } from "./drop-target";
import type { EditorView } from "@codemirror/view";

/** A chapter with the hazards the acceptance project holds. */
const HAZARDOUS = [
  "# The second winter",
  "",
  `The survey ran for three winters without a break, and the count of lanterns kept through each of them is what the table below records, in the order the keepers wrote them down, with the gaps left exactly where the keepers left them and nothing filled in.`,
  "",
  "| Winter | Count | Note |",
  "|---|--:|---|",
  "| 1996 | 3 | first |",
  "| 1997 | 11 |",
  "| 1998 | 7 | estimated \\| unreliable |",
  "",
  "<!-- pagebreak -->",
  "",
  "A closing paragraph.",
  "",
].join("\n");

function outcome(over: Partial<DropOutcome> = {}): DropOutcome {
  return {
    kind: "image",
    reference: "assets/lantern.jpg",
    id: "3f79bb7b435b0532",
    bytes: 240118,
    mode: "copied",
    converted_from: null,
    deduplicated: false,
    ...over,
  };
}

function mount(text: string): { view: EditorView; parent: HTMLElement } {
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = createEditor(parent, text);
  return { view, parent };
}

describe("the forms a drop writes", () => {
  it("writes an image reference and puts the cursor in the alt text", () => {
    const insertion = imageInsertion(10, "assets/lantern.jpg");
    expect(insertion.text).toBe("![](assets/lantern.jpg)");
    expect(insertion.cursor).toBe(12);
    expect(insertion.text.slice(insertion.cursor - insertion.from)).toBe(
      "](assets/lantern.jpg)",
    );
  });

  it("writes a link and puts the cursor in the link text", () => {
    const insertion = linkInsertion(4, "assets/the%20counts.xlsx");
    expect(insertion.text).toBe("[](assets/the%20counts.xlsx)");
    expect(insertion.cursor).toBe(5);
  });

  it("writes the video block in the canon's own form, with one source", () => {
    const block = videoBlock("local", "assets/keynote.mp4", "\n");
    expect(block).toBe("::: {.video}\n- local: assets/keynote.mp4\n:::");
    expect(block).not.toContain("site:");
    expect(block).not.toContain("gated:");
    expect(block).not.toContain("poster");
    expect(block).not.toContain("caption");
  });

  it("names a public address under the remote role", () => {
    expect(videoBlock("remote", "https://videos.example.org/k.mp4", "\n")).toBe(
      "::: {.video}\n- remote: https://videos.example.org/k.mp4\n:::",
    );
  });

  it("uses the document's own line separator", () => {
    const { view } = mount("A line.\r\n\r\nAnother.\r\n");
    expect(view.state.lineBreak).toBe("\r\n");
    const insertion = blockInsertion(view.state, 2, videoBlock("local", "a.mp4", "\r\n"));
    expect(insertion.text).toContain("\r\n");
    expect(insertion.text).not.toMatch(/[^\r]\n/);
    view.destroy();
  });
});

describe("where a construct lands", () => {
  it("inserts an image reference at the drop point and leaves the cursor in the alt text", () => {
    const { view } = mount("A paragraph.\n");
    insertOutcomes(view, 2, [outcome()]);
    expect(documentText(view)).toBe("A ![](assets/lantern.jpg)paragraph.\n");
    expect(view.state.selection.main.head).toBe(4);
    expect(view.state.selection.main.empty).toBe(true);
    view.destroy();
  });

  it("inserts a link and leaves the cursor in the link text", () => {
    const { view } = mount("See .\n");
    insertOutcomes(view, 4, [
      outcome({ kind: "file", reference: "assets/the%20counts.xlsx" }),
    ]);
    expect(documentText(view)).toBe("See [](assets/the%20counts.xlsx).\n");
    expect(view.state.selection.main.head).toBe(5);
    view.destroy();
  });

  it("writes a video block after the paragraph, never inside it", () => {
    const { view } = mount("One.\nTwo.\n\nThree.\n");
    // A point in the middle of the first line of a two-line paragraph.
    insertOutcomes(view, 2, [
      outcome({ kind: "video", reference: "assets/keynote.mp4" }),
    ]);
    expect(documentText(view)).toBe(
      "One.\nTwo.\n\n::: {.video}\n- local: assets/keynote.mp4\n:::\n\nThree.\n",
    );
    // The cursor sits on the line after the block.
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    expect(line.text).toBe("");
    expect(view.state.doc.line(line.number - 1).text).toBe(":::");
    view.destroy();
  });

  it("gives a block a blank line either side when there is none", () => {
    const { view } = mount("One.\nAfter.");
    insertOutcomes(view, 0, [
      outcome({ kind: "video", reference: "assets/keynote.mp4" }),
    ]);
    expect(documentText(view)).toBe(
      "One.\nAfter.\n\n::: {.video}\n- local: assets/keynote.mp4\n:::\n",
    );
    view.destroy();
  });

  it("writes several files in the order they were dropped", () => {
    const { view } = mount("Here: .\n");
    insertOutcomes(view, 6, [
      outcome({ reference: "assets/one.jpg" }),
      outcome({ reference: "assets/two.jpg" }),
    ]);
    expect(documentText(view)).toBe(
      "Here: ![](assets/one.jpg)![](assets/two.jpg).\n",
    );
    // The cursor ends in the last slot.
    expect(view.state.selection.main.head).toBe(6 + "![](assets/one.jpg)".length + 2);
    view.destroy();
  });

  it("changes only the bytes of the inserted span", () => {
    const { view } = mount(HAZARDOUS);
    const before = documentText(view);
    const at = before.indexOf("A closing paragraph.") + 2;
    insertOutcomes(view, at, [outcome()]);
    const after = documentText(view);

    const inserted = "![](assets/lantern.jpg)";
    expect(after.length).toBe(before.length + inserted.length);
    expect(after.slice(0, at)).toBe(before.slice(0, at));
    expect(after.slice(at, at + inserted.length)).toBe(inserted);
    expect(after.slice(at + inserted.length)).toBe(before.slice(at));
    // The hazards are untouched.
    expect(after).toContain("<!-- pagebreak -->");
    expect(after).toContain("| 1997 | 11 |");
    expect(after).toContain("estimated \\| unreliable");
    view.destroy();
  });

  it("round-trips a reference holding a percent-encoded space", () => {
    const { view } = mount("Look: .\n");
    insertOutcomes(view, 6, [outcome({ reference: "assets/a%20lantern.jpg" })]);
    const written = documentText(view);
    expect(written).toContain("![](assets/a%20lantern.jpg)");
    // A save and a reload is the text going out and coming back unchanged.
    const { view: reloaded } = mount(written);
    expect(documentText(reloaded)).toBe(written);
    view.destroy();
    reloaded.destroy();
  });

  it("names the asset by its manifest id when the file stayed where it is", () => {
    const { view } = mount("Clip: .\n");
    const insertion = insertionFor(
      view.state,
      6,
      outcome({ kind: "video", mode: "referenced", reference: "asset:b1946ac92492d234" }),
    );
    expect(insertion.text).toContain("- local: asset:b1946ac92492d234");
    view.destroy();
  });
});

describe("the drop branch", () => {
  let fetchCalls = 0;

  beforeEach(() => {
    fetchCalls = 0;
    vi.stubGlobal("fetch", (): never => {
      fetchCalls += 1;
      throw new Error("the drop gesture reached the network");
    });
  });

  interface Harness {
    view: EditorView;
    branch: DropTarget;
    messages: string[];
  }

  function target(
    text: string,
    services: Partial<DropTargetServices> = {},
    chapter: string | null = "01-part/01-opening.md",
  ): Harness {
    const { view } = mount(text);
    const messages: string[] = [];
    const branch = createDropTarget({
      view,
      chapterPath: () => chapter,
      announce: (message) => messages.push(message),
      services: {
        dropOnChapter:
          services.dropOnChapter ??
          ((): Promise<DropReport> =>
            Promise.resolve({ accepted: [outcome()], refused: [] })),
        pasteReference:
          services.pasteReference ??
          ((_chapter, address): Promise<PasteOutcome> =>
            Promise.resolve({ kind: "other", role: null, reference: address })),
      },
    });
    return { view, branch, messages };
  }

  const payload: DropPayload = { nonce: "abc", count: 1, x: 4, y: 4 };

  it("asks the shell by nonce and never by a path", async () => {
    const seen: string[] = [];
    const { view, branch } = target("A paragraph.\n", {
      dropOnChapter: (chapter, nonce) => {
        seen.push(`${chapter}|${nonce}`);
        return Promise.resolve({ accepted: [outcome()], refused: [] });
      },
    });
    branch.onText(payload);
    await Promise.resolve();
    await Promise.resolve();
    expect(seen).toEqual(["01-part/01-opening.md|abc"]);
    expect(documentText(view)).toContain("![](assets/lantern.jpg)");
    branch.dispose();
    view.destroy();
  });

  it("says so rather than writing when no chapter is open", () => {
    const { view, branch, messages } = target("A paragraph.\n", {}, null);
    branch.onText(payload);
    expect(documentText(view)).toBe("A paragraph.\n");
    expect(messages[0]).toContain("Open a chapter");
    branch.dispose();
    view.destroy();
  });

  it("reports a refusal without losing the files that were taken", async () => {
    const { view, branch, messages } = target("A paragraph.\n", {
      dropOnChapter: (): Promise<DropReport> =>
        Promise.resolve({
          accepted: [outcome()],
          refused: [{ name: "IMG_0001.heic", reason: "the heic image could not be converted" }],
        }),
    });
    branch.onText(payload);
    await Promise.resolve();
    await Promise.resolve();
    expect(documentText(view)).toContain("![](assets/lantern.jpg)");
    expect(messages.join(" ")).toContain("IMG_0001.heic");
    branch.dispose();
    view.destroy();
  });

  it("writes a video block for a pasted media address", async () => {
    const { view, branch } = target("A paragraph.\n\n", {
      pasteReference: (_chapter, address): Promise<PasteOutcome> =>
        Promise.resolve({ kind: "video", role: "remote", reference: address }),
    });
    const wrote = await branch.handleAddress(
      "https://videos.example.org/keynote.mp4",
      2,
      "paste",
    );
    expect(wrote).toBe(true);
    expect(documentText(view)).toContain(
      "::: {.video}\n- remote: https://videos.example.org/keynote.mp4\n:::",
    );
    branch.dispose();
    view.destroy();
  });

  it("leaves a page address alone on a paste and links it on a drop", async () => {
    const { view, branch } = target("A paragraph.\n");
    const pasted = await branch.handleAddress("https://example.org/talks", 2, "paste");
    expect(pasted).toBe(false);
    expect(documentText(view)).toBe("A paragraph.\n");

    const dropped = await branch.handleAddress("https://example.org/talks", 2, "drop");
    expect(dropped).toBe(true);
    expect(documentText(view)).toContain("[](https://example.org/talks)");
    branch.dispose();
    view.destroy();
  });

  it("never reaches the network for a video address", async () => {
    let dropCalls = 0;
    const { view, branch } = target("A paragraph.\n\n", {
      dropOnChapter: (): Promise<DropReport> => {
        dropCalls += 1;
        return Promise.resolve({ accepted: [], refused: [] });
      },
      pasteReference: (_chapter, address): Promise<PasteOutcome> =>
        Promise.resolve({ kind: "video", role: "remote", reference: address }),
    });
    await branch.handleAddress("https://videos.example.org/keynote.mp4", 2, "paste");
    expect(fetchCalls).toBe(0);
    expect(dropCalls).toBe(0);
    branch.dispose();
    view.destroy();
  });
});

describe("what the modeline says", () => {
  it("counts what was added, reused, and left where it is", () => {
    expect(
      describeReport({
        accepted: [outcome(), outcome({ deduplicated: true })],
        refused: [],
      }),
    ).toBe("Added 2 files — 1 already here");
    expect(
      describeReport({
        accepted: [outcome({ mode: "referenced" })],
        refused: [{ name: "a-folder", reason: "a folder is not a file to drop" }],
      }),
    ).toBe("Added 1 file — 1 too large to copy — a-folder: a folder is not a file to drop");
  });
});
