/**
 * The export panel: five rows, what each states, and what confirming one does.
 *
 * Every chord here comes from the binding table, because the panel is an
 * overlay and the cancel and movement rules are the contract's, not its own.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EXPORT_OPEN_ACTION,
  EXPORT_OPEN_CHORD,
  PDF_PHASE,
  SINGLE_FILE_PHASE,
  createExportPanel,
  mountExportPanel,
  rowsFor,
  type ExportPanel,
} from "./export-panel";
import type { ExportPlan, ExportServices } from "./export/services";
import { bindingById } from "./keys";
import { closeOverlay, currentOverlay } from "./overlay";
import type { PanelHost } from "./publish-panel";

/** Dispatch one chord at the document, as a real key would arrive. */
function press(chord: string): KeyboardEvent {
  const modifiers = new Set<string>();
  let name = chord;
  for (;;) {
    const prefix = ["C-", "M-", "s-", "S-"].find(
      (candidate) => name.startsWith(candidate) && name.length > candidate.length,
    );
    if (!prefix) break;
    modifiers.add(prefix[0] ?? "");
    name = name.slice(2);
  }
  const event = new KeyboardEvent("keydown", {
    key: name === "Return" ? "Enter" : name,
    code: /^[a-z]$/.test(name) ? `Key${name.toUpperCase()}` : name,
    ctrlKey: modifiers.has("C"),
    altKey: modifiers.has("M"),
    metaKey: modifiers.has("s"),
    shiftKey: modifiers.has("S"),
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

const LONG_ASSET =
  "assets/01-slides/a-very-long-photograph-name-that-nobody-would-type-twice.jpg";

function plan(overrides: Partial<ExportPlan> = {}): ExportPlan {
  return {
    title: "Macromarketing 2026",
    variant: "talk",
    slug: "macromarketing-2026",
    files: [
      { path: "index.html", text: "<!doctype html>\n" },
      { path: "slides/index.html", text: "<!doctype html>\n" },
    ],
    copies: [
      { from: "01-slides/assets/lantern.jpg", to: "assets/01-slides/lantern.jpg" },
      { from: "01-slides/assets/long.jpg", to: LONG_ASSET },
    ],
    refusals: [],
    beside: "/documents",
    ...overrides,
  };
}

/** One fake, and what it was told. */
type Call = ReturnType<typeof vi.fn>;

/** A panel over fake services, with what each was told. */
interface Fakes {
  readonly panel: ExportPanel;
  readonly used: {
    readonly services: ExportServices;
    readonly calls: {
      readonly plan: Call;
      readonly chooseFolder: Call;
      readonly exportRendering: Call;
      readonly dryRun: Call;
      readonly revealStagedVersion: Call;
    };
    readonly said: string[];
  };
}

function panelWith(
  overrides: Partial<ExportPlan> = {},
  services: Partial<ExportServices> = {},
): Fakes {
  const calls = {
    plan: vi.fn(() => Promise.resolve(plan(overrides))),
    // What the shell answers with: the nonce for the folder Alice chose in
    // its own dialog, never the folder itself.
    chooseFolder: vi.fn(() => Promise.resolve("a-nonce-the-shell-minted")),
    exportRendering: vi.fn(() => Promise.resolve({ folder: "macromarketing-2026-deck", files: 9 })),
    dryRun: vi.fn(() =>
      Promise.resolve({ hash: "cccccccccccccccccccccccccc" } as never),
    ),
    revealStagedVersion: vi.fn(() => Promise.resolve()),
  };
  const said: string[] = [];
  const used: ExportServices = {
    ...(calls as unknown as ExportServices),
    ...services,
  };
  const panel = createExportPanel(used, {
    announce: (message) => said.push(message),
  });
  return { panel, used: { services: used, calls, said } };
}

afterEach(() => {
  closeOverlay();
  document.body.replaceChildren();
});

describe("the export panel", () => {
  it("lists five rows, three that write and two that name their phase", async () => {
    const { panel } = panelWith();
    await panel.open();
    const rows = [...panel.element.querySelectorAll<HTMLElement>(".export-row")];
    expect(rows.map((row) => row.dataset["row"])).toEqual([
      "deck",
      "article",
      "dry-run",
      "single-file",
      "pdf",
    ]);
    expect(rows.map((row) => row.dataset["available"])).toEqual([
      "yes",
      "yes",
      "yes",
      "no",
      "no",
    ]);
    const unavailable = rows
      .slice(3)
      .map((row) => row.querySelector(".export-unavailable")?.textContent ?? "");
    expect(unavailable[0]).toBe(SINGLE_FILE_PHASE);
    expect(unavailable[1]).toBe(PDF_PHASE);
    // Each names a phase, in the panel, rather than leaving Alice to guess.
    for (const text of unavailable) {
      expect(text).toMatch(/phase \d/);
    }
  });

  it("states each row's destination and every file it writes", async () => {
    const { panel } = panelWith();
    await panel.open();
    const rows = rowsFor(plan());

    const deck = panel.element.querySelector<HTMLElement>('[data-row="deck"]');
    expect(deck?.querySelector(".export-destination")?.textContent).toContain(
      "macromarketing-2026-deck",
    );
    const written = [...(deck?.querySelectorAll(".export-writes li") ?? [])].map(
      (item) => item.textContent ?? "",
    );
    expect(written).toEqual(rows[0]?.writes);
    // The page, the engine beside it, and one line per image.
    expect(written).toContain("slides/index.html");
    expect(written).toContain("presenter/reveal/reveal.js");
    expect(written).toContain("assets/01-slides/lantern.jpg");

    const article = panel.element.querySelector<HTMLElement>('[data-row="article"]');
    expect(article?.querySelector(".export-destination")?.textContent).toContain(
      "macromarketing-2026-article",
    );

    const dry = panel.element.querySelector<HTMLElement>('[data-row="dry-run"]');
    expect(dry?.querySelector(".export-destination")?.textContent).toContain("cache");
    expect(dry?.textContent).toContain("index.html");
  });

  it("reaches the panel through the binding table's row", () => {
    const registered: Record<string, () => void> = {};
    const panels: string[] = [];
    const surface = document.createElement("div");
    document.body.append(surface);
    const host: PanelHost = {
      registerPanel(name, element) {
        panels.push(name);
        surface.append(element);
      },
      registerCommand(id, run) {
        registered[id] = run;
      },
    };
    const { panel } = panelWith();
    mountExportPanel(host, panel);
    expect(panels).toEqual(["export"]);
    expect(Object.keys(registered)).toEqual([EXPORT_OPEN_ACTION]);
    // The chord is the table's row, not a listener of the panel's own.
    expect(bindingById(EXPORT_OPEN_ACTION)?.chords).toEqual([EXPORT_OPEN_CHORD]);
    expect(bindingById(EXPORT_OPEN_ACTION)?.owner).toBe("app");
  });

  it("opens no dialog and invokes no command on a row that is not yet available", async () => {
    for (const index of [3, 4]) {
      const { panel, used } = panelWith();
      await panel.open();
      const down = bindingById("next-line")?.chords[0] ?? "C-n";
      for (let step = 0; step < index; step += 1) press(down);
      press("Return");
      await Promise.resolve();
      expect(used.calls.chooseFolder).not.toHaveBeenCalled();
      expect(used.calls.exportRendering).not.toHaveBeenCalled();
      expect(used.calls.dryRun).not.toHaveBeenCalled();
      expect(used.calls.revealStagedVersion).not.toHaveBeenCalled();
      // It says which phase it arrives in rather than doing nothing silently.
      expect(used.said.join(" ")).toMatch(/phase \d/);
    }
  });

  it("closes on C-g and on Escape, having invoked nothing", async () => {
    for (const chord of bindingById("keyboard-quit")?.chords ?? []) {
      const before = document.createElement("input");
      document.body.append(before);
      before.focus();

      const { panel, used } = panelWith();
      await panel.open();
      expect(currentOverlay()?.element).toBe(panel.element);
      expect(document.activeElement).toBe(panel.element);

      expect(press(chord).defaultPrevented).toBe(true);
      expect(currentOverlay()).toBeNull();
      expect(panel.isOpen).toBe(false);
      expect(panel.element.isConnected).toBe(false);
      // The surface has the keyboard back, where the point was left.
      expect(document.activeElement).toBe(before);
      for (const call of Object.values(used.calls)) {
        if (call === used.calls.plan) continue;
        expect(call).not.toHaveBeenCalled();
      }
      before.remove();
    }
  });

  it("writes a folder only after the dialog answers with one", async () => {
    const { panel, used } = panelWith();
    await panel.open();
    press("Return");
    await vi.waitFor(() => expect(used.calls.exportRendering).toHaveBeenCalled());
    expect(used.calls.chooseFolder).toHaveBeenCalledWith("/documents");
    const request = (
      used.calls.exportRendering.mock.calls as unknown as [
        { kind: string; folder_name: string; files: { path: string }[] },
      ][]
    )[0]?.[0];
    expect(request).toBeDefined();
    if (request === undefined) return;
    expect(request.kind).toBe("deck");
    expect(request.folder_name).toBe("macromarketing-2026-deck");
    expect(request.files.map((file) => file.path)).toEqual(["slides/index.html"]);
    expect(used.said.join(" ")).toContain("macromarketing-2026-deck");
  });

  it("writes nothing when the dialog is cancelled", async () => {
    const { panel, used } = panelWith(
      {},
      { chooseFolder: vi.fn(() => Promise.resolve(null)) },
    );
    await panel.open();
    press("Return");
    await vi.waitFor(() => expect(used.said.length).toBeGreaterThan(0));
    expect(used.calls.exportRendering).not.toHaveBeenCalled();
  });

  it("opens the folder the dry run staged, and only after staging it", async () => {
    const { panel, used } = panelWith();
    await panel.open();
    const down = bindingById("next-line")?.chords[0] ?? "C-n";
    press(down);
    press(down);
    press("Return");
    await vi.waitFor(() => expect(used.calls.revealStagedVersion).toHaveBeenCalled());
    expect(used.calls.dryRun).toHaveBeenCalled();
    expect(used.calls.exportRendering).not.toHaveBeenCalled();
    expect(
      used.calls.dryRun.mock.invocationCallOrder[0] ?? 0,
    ).toBeLessThan(used.calls.revealStagedVersion.mock.invocationCallOrder[0] ?? 0);
  });

  it("shows every refusal the build carries, and confirms nothing", async () => {
    const { panel, used } = panelWith({
      refusals: [
        {
          chapter: "01-slides/01-opening.md",
          reference: "/Users/somebody/lantern.jpg", // abcd-lint:allow illustrative refusal path
          reason: "the reference is absolute",
        },
      ],
    });
    await panel.open();
    expect(panel.element.querySelectorAll(".export-refusal")).toHaveLength(1);
    const rows = [...panel.element.querySelectorAll<HTMLElement>(".export-row")];
    expect(rows.map((row) => row.dataset["available"])).toEqual([
      "no",
      "no",
      "no",
      "no",
      "no",
    ]);
    press("Return");
    await Promise.resolve();
    expect(used.calls.chooseFolder).not.toHaveBeenCalled();
    expect(used.calls.exportRendering).not.toHaveBeenCalled();
  });

  it("does not open at all when the document cannot be built, and says why", async () => {
    const { panel, used } = panelWith(
      {},
      {
        plan: vi.fn(() =>
          Promise.reject(new Error("This chapter has unsaved edits. Save it with C-x C-s.")),
        ),
      },
    );
    await panel.open();
    expect(panel.isOpen).toBe(false);
    expect(currentOverlay()).toBeNull();
    expect(used.said.join(" ")).toContain("unsaved edits");
  });

  it("carries no fixed width and breaks a long name", async () => {
    const { panel } = panelWith();
    await panel.open();
    // The long name is stated in full: nothing is elided into a tooltip.
    expect(panel.element.textContent).toContain(LONG_ASSET);

    const css = readFileSync(join(__dirname, "style.css"), "utf8");
    const block = css.slice(css.indexOf("/* The export panel's rows."));
    expect(block).not.toBe("");
    // No fixed width anywhere in the panel's own rules, and every long name
    // breaks rather than pushing the panel sideways.
    for (const declaration of block.matchAll(/(?:^|[;{\s])width\s*:\s*([^;}]+)/g)) {
      expect(declaration[1] ?? "").not.toMatch(/\d+px/);
    }
    expect(block).toContain("overflow-wrap: anywhere");
    expect(block).not.toContain("white-space: nowrap");
    expect(block).not.toContain("overflow-x: scroll");
  });
});

describe("the network", () => {
  let fetched: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetched = vi.fn(() => Promise.reject(new Error("no request may leave")));
    globalThis.fetch = fetched as unknown as typeof globalThis.fetch;
  });

  it("makes no request through an export", async () => {
    const { panel, used } = panelWith();
    // Each of the three available exports in turn.
    for (const index of [0, 1, 2]) {
      await panel.open();
      const down = bindingById("next-line")?.chords[0] ?? "C-n";
      for (let step = 0; step < index; step += 1) press(down);
      press("Return");
      await vi.waitFor(() =>
        expect(used.said.length).toBeGreaterThanOrEqual(index + 1),
      );
    }
    expect(used.calls.exportRendering).toHaveBeenCalledTimes(2);
    expect(used.calls.dryRun).toHaveBeenCalledTimes(1);
    expect(fetched).not.toHaveBeenCalled();
  });
});
