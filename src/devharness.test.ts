/**
 * The development harness's frontend half.
 *
 * `iss-2609061211328807` settled the harness staying live in release builds
 * on four confinement claims. Two of them are the shell's to keep
 * (`src-tauri/src/devharness.rs`'s own tests); these two are this module's:
 * the environment is read once, at start, and never again from the page, and
 * the page is told whether a key log is being written, never where.
 */

import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("./doctree", () => ({
  inShell: vi.fn(() => true),
  presentChapter: vi.fn(() => Promise.resolve()),
}));

vi.mock("./editor", () => ({
  documentText: vi.fn(() => "chapter text"),
}));

import type { App } from "./app";
import { startDevHarness } from "./devharness";
import { inShell } from "./doctree";

const invoked = vi.mocked(invoke);
const shellCheck = vi.mocked(inShell);

/** What `dev_harness` answers, in the shape the shell serialises. */
interface Settings {
  open_folder: string | null;
  key_log: boolean;
  present_on_open: boolean;
}

/** A fake app carrying only what `startDevHarness` touches. */
function fakeApp(): App {
  return {
    view: { focus: vi.fn() },
    chapterPath: null,
    chapters: [],
    keyLog: { observe: vi.fn() },
    openFolder: vi.fn(() => Promise.resolve()),
    openChapter: vi.fn(() => Promise.resolve()),
  } as unknown as App;
}

function settings(over: Partial<Settings> = {}): Settings {
  return { open_folder: null, key_log: false, present_on_open: false, ...over };
}

beforeEach(() => {
  invoked.mockReset();
  shellCheck.mockReturnValue(true);
});

describe("the environment is read once, at start", () => {
  it("asks the shell for the settings exactly once, whatever the run then does", async () => {
    invoked.mockResolvedValueOnce(settings({ key_log: true }));
    invoked.mockResolvedValue(undefined);
    await startDevHarness(fakeApp());
    const calls = invoked.mock.calls.filter(([command]) => command === "dev_harness");
    expect(calls).toHaveLength(1);
  });

  it("never asks the shell at all outside the shell", async () => {
    shellCheck.mockReturnValue(false);
    await startDevHarness(fakeApp());
    expect(invoked).not.toHaveBeenCalled();
  });

  it("touches the shell only for that one settings call when every switch is off", async () => {
    invoked.mockResolvedValueOnce(settings());
    await startDevHarness(fakeApp());
    expect(invoked).toHaveBeenCalledTimes(1);
    expect(invoked).toHaveBeenCalledWith("dev_harness");
  });

  it("carries the settings it read at start rather than asking again once a folder opens", async () => {
    invoked.mockResolvedValueOnce(settings({ open_folder: "/a/document" }));
    invoked.mockResolvedValue(undefined);
    const app = fakeApp();
    await startDevHarness(app);
    expect(app.openFolder).toHaveBeenCalledWith("/a/document");
    // Opening the folder and its first chapter is driven by the one settings
    // object read at start; nothing here asks the shell for the harness's
    // settings a second time.
    const calls = invoked.mock.calls.filter(([command]) => command === "dev_harness");
    expect(calls).toHaveLength(1);
  });
});

describe("the page is told whether a log is kept, never where", () => {
  it("holds the key log as a boolean, with no path reaching anything this module writes", async () => {
    invoked.mockResolvedValueOnce(settings({ key_log: true }));
    invoked.mockResolvedValue(undefined);
    await startDevHarness(fakeApp());
    const written = invoked.mock.calls.filter(([command]) => command === "dev_log_key");
    expect(written.length).toBeGreaterThan(0);
    for (const [, payload] of written) {
      const line = (payload as { line: string }).line;
      expect(typeof line).toBe("string");
      const record: Record<string, unknown> = JSON.parse(line);
      // The shell resolves the log's path once and keeps it to itself
      // (`src-tauri/src/devharness.rs`); the page never holds one to send
      // back, so no observation this module writes can carry one either.
      expect(record).not.toHaveProperty("path");
    }
  });

  it("writes nothing to the key log when the switch is off", async () => {
    invoked.mockResolvedValueOnce(settings({ key_log: false, open_folder: "/a/document" }));
    invoked.mockResolvedValue(undefined);
    await startDevHarness(fakeApp());
    const written = invoked.mock.calls.filter(([command]) => command === "dev_log_key");
    expect(written).toHaveLength(0);
  });
});
