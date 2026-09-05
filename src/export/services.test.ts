/**
 * What an export plans, and what each row hands the shell.
 *
 * The plan is the publish path's own build with the folder's chrome base, so
 * these hold that there is one builder rather than two, and that a row carries
 * exactly the files its folder needs.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { invoke } from "@tauri-apps/api/core";

import { parseChapter } from "../core/parse";
import { DECK_ENGINE_FILES } from "../core/render/slides";
import {
  ARTICLE_PATH,
  DECK_PATH,
  buildVersion,
  renderVariant,
  type DocumentSource,
} from "../publish/build";
import type { DocumentForPublish } from "../publish/services";
import {
  FOLDER_CHROME_FILES,
  createExportServices,
  filesFor,
  folderNameFor,
  parentOf,
  requestFor,
  slugFor,
  type ExportPlan,
} from "./services";

/**
 * The one seam between the page and the shell.
 *
 * Every command the panel reaches goes through `invoke`, and what it is called
 * with is the whole of the wire contract: a name the shell answers, and the
 * arguments that name takes. Nothing else in this file needs it, so it answers
 * with nothing and the calls are read back off the mock.
 */
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
}));

const invoked = vi.mocked(invoke);

const EXAMPLES = join(__dirname, "..", "..", "examples");
const ROOT = "/documents/presentation";

function chapterOf(document: string, path: string): DocumentSource["chapters"][number] {
  const text = readFileSync(join(EXAMPLES, document, path), "utf8");
  return { path, chapter: parseChapter(text) };
}

function document(): DocumentForPublish {
  return {
    title: "Macromarketing 2026",
    variant: "talk",
    tree: {
      chapters: [
        chapterOf("presentation", "01-slides/01-technology-impact-assessment.md"),
        chapterOf("presentation", "01-slides/02-where-im-coming-from.md"),
      ],
    },
  };
}

function services(root: string | null = ROOT): ReturnType<typeof createExportServices> {
  return createExportServices(() => Promise.resolve(document()), () => root);
}

beforeEach(() => {
  invoked.mockClear();
});

describe("what the services ask the shell for", () => {
  it("opens the dialog through the shell's own command, and names no folder", async () => {
    // The dialog is the shell's, and this is the call that opens it. Without
    // this, `chooseFolder` could have gone on answering a path the page chose
    // for itself and every test above would still have passed: the panel is
    // driven by fakes, and the fakes are not the wire.
    const chosen = await services().chooseFolder("/documents");
    expect(invoked).toHaveBeenCalledWith("choose_export_destination", {
      defaultPath: "/documents",
    });
    // What comes back is the shell's nonce, handed on unchanged.
    expect(chosen).toBeNull();

    // A dialog with nowhere to open beside says so, rather than inventing one.
    invoked.mockClear();
    await services(null).chooseFolder(null);
    expect(invoked).toHaveBeenCalledWith("choose_export_destination", {
      defaultPath: null,
    });
  });

  it("hands the export and the reveal to their own commands", async () => {
    const built = await services().plan();
    invoked.mockClear();

    const request = requestFor("deck", built, "a-nonce-the-shell-minted");
    await services().exportRendering(request);
    expect(invoked).toHaveBeenCalledWith("export_rendering", { request });

    invoked.mockClear();
    await services().revealStagedVersion();
    expect(invoked).toHaveBeenCalledWith("reveal_staged_version");
  });
});

describe("the export plan", () => {
  it("builds through buildVersion, from the tree the dry run builds from", async () => {
    const plan = await services().plan();
    const source = document();
    const built = buildVersion(source.tree, source.variant, {
      rendered: renderVariant(source.tree, source.variant, {
        title: source.title,
        host: "folder",
      }),
    });
    // The plan is the builder's output, not a second list of files beside it.
    expect(plan.files).toEqual(built.files);
    expect(plan.copies).toEqual(built.copies);
    expect(plan.refusals).toEqual(built.refusals);
    // And the assets are the ones a publish would copy, unchanged: the two
    // builds differ in the chrome base and in nothing else.
    const site = buildVersion(source.tree, source.variant, {
      rendered: renderVariant(source.tree, source.variant, {
        title: source.title,
        host: "site",
      }),
    });
    expect(plan.copies).toEqual(site.copies);
  });

  it("opens the dialog beside the document folder, never inside it", async () => {
    const plan = await services().plan();
    expect(plan.beside).toBe("/documents");
    expect(parentOf(`${ROOT}/`)).toBe("/documents");
    expect(parentOf(null)).toBeNull();
    expect(parentOf("/")).toBeNull();
    // Nothing on this machine reaches the plan but the folder to open beside.
    expect(await services(null).plan()).toMatchObject({ beside: null });
  });

  it("names each folder from the document's title", async () => {
    const plan = await services().plan();
    expect(plan.slug).toBe("macromarketing-2026");
    expect(folderNameFor("deck", plan.slug)).toBe("macromarketing-2026-deck");
    expect(folderNameFor("article", plan.slug)).toBe("macromarketing-2026-article");
    // The shell holds a name to one segment of lower-case letters, digits and
    // hyphens; the page hands it one.
    for (const title of ["A talk: notes & asides", "  ", "…", "l".repeat(200)]) {
      expect(slugFor(title)).toMatch(/^[a-z0-9][a-z0-9-]{0,63}$/);
    }
  });
});

describe("what one row writes", () => {
  async function plan(): Promise<ExportPlan> {
    return services().plan();
  }

  it("hands the deck row the deck page, the engine and the images, and nothing else", async () => {
    const built = await plan();
    const request = requestFor("deck", built, "a-nonce-the-shell-minted");
    expect(request.files.map((file) => file.path)).toEqual([DECK_PATH]);
    expect(request.folder_name).toBe("macromarketing-2026-deck");
    // The nonce, not a folder: the shell holds the folder Alice chose.
    expect(request.destination_nonce).toBe("a-nonce-the-shell-minted");
    expect(Object.keys(request)).not.toContain("destination");
    expect(request.variant).toBe("talk");
    expect(request.copies).toEqual(built.copies);
    // The article's page is not in a deck folder, and the deck's is not in an
    // article folder.
    expect(
      requestFor("article", built, "a-nonce-the-shell-minted").files.map((f) => f.path),
    ).toEqual([
      ARTICLE_PATH,
    ]);

    // The row states the page, the engine beside it, and one line per image.
    const writes = filesFor("deck", built);
    expect(writes[0]).toBe(DECK_PATH);
    for (const name of DECK_ENGINE_FILES) {
      expect(writes).toContain(`presenter/reveal/${name}`);
    }
    expect(writes).toContain("presenter/slides.css");
    expect(writes).toContain("presenter/deck.js");
    expect(built.copies.length).toBeGreaterThan(0);
    for (const copy of built.copies) {
      expect(writes).toContain(copy.to);
    }
    expect(writes).toHaveLength(1 + FOLDER_CHROME_FILES.deck.length + built.copies.length);
  });

  it("gives the article row its one stylesheet and no engine", async () => {
    const writes = filesFor("article", await plan());
    expect(writes[0]).toBe(ARTICLE_PATH);
    expect(writes).toContain("presenter/article.css");
    expect(writes.filter((name) => name.includes("reveal"))).toEqual([]);
    expect(writes).not.toContain(DECK_PATH);
  });

  it("names nothing of this machine in what a row states", async () => {
    const built = await plan();
    for (const kind of ["deck", "article"] as const) {
      for (const name of filesFor(kind, built)) {
        expect(name).not.toContain(ROOT);
        expect(name).not.toMatch(/^\//);
        expect(name).not.toContain("..");
      }
    }
  });
});
