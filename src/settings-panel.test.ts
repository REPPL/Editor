import { afterEach, describe, expect, it } from "vitest";

import { bindingById } from "./keys";
import {
  SETTINGS_OPEN_ACTION,
  SETTINGS_OPEN_CHORD,
  createSettingsPanel,
  mountSettingsPanel,
  type Settings,
  type SettingsPanel,
  type SettingsServices,
} from "./settings-panel";

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    schema_version: 1,
    publish: {
      repository: "/repos/site",
      remote: "origin",
      branch: "main",
      base_url: "https://example.invalid",
      site_dir: "site",
    },
    asset_roots: { photos: "/pictures" },
    text_scale: 0,
    ...overrides,
  };
}

interface Harness {
  panel: SettingsPanel;
  targets: { repository: string; remote: string; branch: string; baseUrl: string }[];
  roots: [string, string][];
}

let mounted: SettingsPanel | null = null;

function panelWith(services: Partial<SettingsServices> = {}): Harness {
  let stored = settings();
  const targets: Harness["targets"] = [];
  const roots: Harness["roots"] = [];
  const panel = createSettingsPanel({
    getSettings: () => Promise.resolve(stored),
    setPublishTarget: (target) => {
      targets.push(target);
      stored = settings({
        publish: { ...stored.publish, ...target, base_url: target.baseUrl },
      });
      return Promise.resolve(stored);
    },
    setAssetRoot: (name, root) => {
      roots.push([name, root]);
      const next = { ...stored.asset_roots };
      if (root === "") delete next[name];
      else next[name] = root;
      stored = settings({ asset_roots: next });
      return Promise.resolve(stored);
    },
    ...services,
  });
  document.body.append(panel.element);
  mounted = panel;
  return { panel, targets, roots };
}

afterEach(() => {
  mounted?.destroy();
  mounted = null;
});

describe("the settings panel", () => {
  it("shows the production repository, remote, branch and base URL", async () => {
    const { panel } = panelWith();
    await panel.open();
    const value = (selector: string): string =>
      panel.element.querySelector<HTMLInputElement>(selector)?.value ?? "";
    expect(value(".settings-repository")).toBe("/repos/site");
    expect(value(".settings-remote")).toBe("origin");
    expect(value(".settings-branch")).toBe("main");
    expect(value(".settings-base-url")).toBe("https://example.invalid");
  });

  it("shows the named asset roots and the folders they name", async () => {
    const { panel } = panelWith();
    await panel.open();
    const row = panel.element.querySelector<HTMLElement>('.settings-root[data-root="photos"]');
    expect(row?.querySelector(".settings-root-where")?.textContent).toBe("/pictures");
  });

  it("edits the publish target through set_publish_target", async () => {
    const { panel, targets } = panelWith();
    await panel.open();
    const input = panel.element.querySelector<HTMLInputElement>(".settings-branch");
    if (input) input.value = "live";
    panel.element.querySelector<HTMLButtonElement>(".settings-save-publish")?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(targets).toEqual([
      {
        repository: "/repos/site",
        remote: "origin",
        branch: "live",
        baseUrl: "https://example.invalid",
      },
    ]);
  });

  it("adds and removes an asset root through set_asset_root", async () => {
    const { panel, roots } = panelWith();
    await panel.open();
    const name = panel.element.querySelector<HTMLInputElement>(".settings-root-name");
    const path = panel.element.querySelector<HTMLInputElement>(".settings-root-folder");
    if (name) name.value = "talks";
    if (path) path.value = "/talks";
    panel.element.querySelector<HTMLButtonElement>(".settings-add-root")?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(roots).toEqual([["talks", "/talks"]]);
    panel.element
      .querySelector<HTMLButtonElement>('.settings-root[data-root="photos"] .settings-root-remove')
      ?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(roots).toEqual([
      ["talks", "/talks"],
      ["photos", ""],
    ]);
  });

  it("shows the shell's refusal rather than inventing its own", async () => {
    const { panel } = panelWith({
      setPublishTarget: () => Promise.reject(new Error("the base URL names no host: https://")),
    });
    await panel.open();
    panel.element.querySelector<HTMLButtonElement>(".settings-save-publish")?.click();
    await Promise.resolve();
    await Promise.resolve();
    const status = panel.element.querySelector<HTMLElement>(".settings-status");
    expect(status?.textContent).toContain("names no host");
    expect(status?.dataset["state"]).toBe("failed");
  });

  it("closes on Escape and on C-g", async () => {
    const { panel } = panelWith();
    await panel.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(panel.isOpen).toBe(false);
    await panel.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "g", ctrlKey: true }));
    expect(panel.isOpen).toBe(false);
  });

  it("mounts through the application's own extension points", async () => {
    const { panel } = panelWith();
    const panels: string[] = [];
    const commands = new Map<string, () => void>();
    mountSettingsPanel(
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
    expect(panels).toEqual(["settings"]);
    expect([...commands.keys()]).toEqual([SETTINGS_OPEN_ACTION]);
    commands.get(SETTINGS_OPEN_ACTION)?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(panel.isOpen).toBe(true);
  });

  it("is reached by the binding table's own row", () => {
    expect(bindingById(SETTINGS_OPEN_ACTION)?.chords).toEqual([SETTINGS_OPEN_CHORD]);
    expect(bindingById(SETTINGS_OPEN_ACTION)?.owner).toBe("app");
  });
});
