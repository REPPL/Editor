import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { bindingById } from "./keys";
import {
  NEW_DOCUMENT_OPEN_ACTION,
  NEW_DOCUMENT_OPEN_CHORD,
  createNewDocumentPanel,
  mountNewDocumentPanel,
  type NewDocumentOutcome,
  type NewDocumentPanel,
  type NewDocumentServices,
} from "./new-document-panel";

let mounted: NewDocumentPanel | null = null;

interface Harness {
  panel: NewDocumentPanel;
  created: { title: string; nonce: string }[];
  outcomes: NewDocumentOutcome[];
}

function panelWith(
  services: Partial<NewDocumentServices> = {},
  onCreated?: (outcome: NewDocumentOutcome) => void,
): Harness {
  const created: Harness["created"] = [];
  const outcomes: Harness["outcomes"] = [];
  const panel = createNewDocumentPanel(
    {
      chooseFolder: () =>
        Promise.resolve({ nonce: "nonce-1", name: "the-lantern-papers" }),
      createDocument: (title, nonce) => {
        created.push({ title, nonce });
        const outcome: NewDocumentOutcome = {
          root: "/talks/the-lantern-papers",
          chapter: "/talks/the-lantern-papers/01-chapters/01-the-lantern-papers.md",
        };
        return Promise.resolve(outcome);
      },
      ...services,
    },
    {
      onCreated: (outcome) => {
        outcomes.push(outcome);
        onCreated?.(outcome);
      },
    },
  );
  document.body.append(panel.element);
  mounted = panel;
  return { panel, created, outcomes };
}

function choose(panel: NewDocumentPanel): HTMLButtonElement | null {
  return panel.element.querySelector<HTMLButtonElement>(".new-document-choose-folder");
}

function create(panel: NewDocumentPanel): HTMLButtonElement | null {
  return panel.element.querySelector<HTMLButtonElement>(".new-document-create");
}

function title(panel: NewDocumentPanel): HTMLInputElement | null {
  return panel.element.querySelector<HTMLInputElement>(".new-document-title");
}

afterEach(() => {
  mounted?.destroy();
  mounted = null;
});

describe("the new document panel", () => {
  it("opens with an empty title, no folder chosen, and Create disabled", async () => {
    const { panel } = panelWith();
    await panel.open();
    expect(title(panel)?.value).toBe("");
    expect(panel.element.textContent).toContain("No folder chosen yet.");
    expect(create(panel)?.disabled).toBe(true);
  });

  it("enables Create only once a title is typed and a folder is chosen", async () => {
    const { panel } = panelWith();
    await panel.open();
    const input = title(panel);
    if (input) {
      input.value = "The Lantern Papers";
      input.dispatchEvent(new Event("input"));
    }
    expect(create(panel)?.disabled).toBe(true);

    choose(panel)?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(panel.element.textContent).toContain("Folder chosen: the-lantern-papers");
    expect(create(panel)?.disabled).toBe(false);
  });

  it("leaves the state alone when the author cancels the folder dialog", async () => {
    const { panel } = panelWith({ chooseFolder: () => Promise.resolve(null) });
    await panel.open();
    choose(panel)?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(panel.element.textContent).toContain("No folder chosen yet.");
    expect(create(panel)?.disabled).toBe(true);
  });

  it("creates the document with the title exactly as typed and the chosen folder's nonce", async () => {
    const { panel, created, outcomes } = panelWith();
    await panel.open();
    const input = title(panel);
    if (input) {
      input.value = "  Café Life: 1999–2001 (a memoir)  ";
      input.dispatchEvent(new Event("input"));
    }
    choose(panel)?.click();
    await Promise.resolve();
    await Promise.resolve();
    create(panel)?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(created).toEqual([
      { title: "  Café Life: 1999–2001 (a memoir)  ", nonce: "nonce-1" },
    ]);
    expect(outcomes).toHaveLength(1);
    expect(panel.isOpen).toBe(false);
  });

  it("shows the shell's own refusal and requires the folder to be chosen again", async () => {
    const { panel } = panelWith({
      createDocument: () =>
        Promise.reject(
          new Error("the-lantern-papers already holds a document: it has a document.yaml already there."),
        ),
    });
    await panel.open();
    const input = title(panel);
    if (input) {
      input.value = "The Lantern Papers";
      input.dispatchEvent(new Event("input"));
    }
    choose(panel)?.click();
    await Promise.resolve();
    await Promise.resolve();
    create(panel)?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(panel.isOpen).toBe(true);
    const status = panel.element.querySelector<HTMLElement>(".new-document-status");
    expect(status?.textContent).toContain("already holds a document");
    expect(status?.dataset["state"]).toBe("failed");
    // A screen reader has no other route to the refusal: it must speak on
    // its own (`itd-2609061324342715`).
    expect(status?.getAttribute("aria-live")).toBe("polite");
    // The nonce was spent on the attempt, win or lose: a retry needs a fresh
    // choice, exactly as an export's own destination nonce behaves.
    expect(panel.element.textContent).toContain("No folder chosen yet.");
    expect(create(panel)?.disabled).toBe(true);
  });

  it("closes on Escape and on C-g, writing nothing", async () => {
    const { panel, created } = panelWith();
    await panel.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(panel.isOpen).toBe(false);
    await panel.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "g", ctrlKey: true }));
    expect(panel.isOpen).toBe(false);
    expect(created).toHaveLength(0);
  });

  it("mounts through the application's own extension points", async () => {
    const { panel } = panelWith();
    const panels: string[] = [];
    const commands = new Map<string, () => void>();
    mountNewDocumentPanel(
      {
        registerPanel(name, element) {
          panels.push(name);
          expect(element).toBe(panel.element);
        },
        registerCommand(id, run) {
          commands.set(id, run);
        },
      },
      panel,
    );
    expect(panels).toEqual(["new-document"]);
    expect([...commands.keys()]).toEqual([NEW_DOCUMENT_OPEN_ACTION]);
    commands.get(NEW_DOCUMENT_OPEN_ACTION)?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(panel.isOpen).toBe(true);
  });

  it("is reached by the binding table's own row", () => {
    expect(bindingById(NEW_DOCUMENT_OPEN_ACTION)?.chords).toEqual([NEW_DOCUMENT_OPEN_CHORD]);
    expect(bindingById(NEW_DOCUMENT_OPEN_ACTION)?.owner).toBe("app");
  });

  it("carries no fixed width and breaks a long folder name", async () => {
    const longName = "a".repeat(80);
    const { panel } = panelWith({
      chooseFolder: () => Promise.resolve({ nonce: "nonce-1", name: longName }),
    });
    await panel.open();
    choose(panel)?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(panel.element.textContent).toContain(longName);

    const css = readFileSync(join(__dirname, "style.css"), "utf8");
    const block = css.slice(css.indexOf("/* The new document panel."));
    expect(block).not.toBe("");
    for (const declaration of block.matchAll(/(?:^|[;{\s])width\s*:\s*([^;}]+)/g)) {
      expect(declaration[1] ?? "").not.toMatch(/\d+px/);
    }
    expect(block).toContain("overflow-wrap: anywhere");
    expect(block).not.toContain("white-space: nowrap");
    expect(block).not.toContain("overflow-x: scroll");
  });
});
