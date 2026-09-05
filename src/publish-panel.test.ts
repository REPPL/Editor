import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bindingById } from "./keys";
import {
  createPublishPanel,
  mountPublishPanel,
  PUBLISH_OPEN_ACTION,
  GATED_NOTE,
  PUBLISH_OPEN_CHORD,
  UNLISTED_SENTENCE,
  type PublishEntry,
  type PublishOutcome,
  type PublishServices,
} from "./publish-panel";

const ID = "aaaaaaaaaaaaaaaaaaaaaaaaaa";
const TOKEN = "bbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH = "cccccccccccccccccccccccccc";
const OLDER = "dddddddddddddddddddddddddd";
const BASE = "https://example.invalid";

function links(hash: string): PublishEntry["links"] {
  return {
    talk: {
      stable: `${BASE}/${ID}/${TOKEN}/`,
      deck: `${BASE}/${ID}/${TOKEN}/slides/`,
      version: `${BASE}/${ID}/${TOKEN}/v/${hash}/`,
    },
  };
}

function entry(hash: string, published: string, created = true): PublishEntry {
  return {
    action: "publish",
    published,
    hash,
    variants: ["talk"],
    flag: "unlisted",
    created_version: created,
    links: links(hash),
  };
}

function outcome(overrides: Partial<PublishOutcome> = {}): PublishOutcome {
  return {
    id: ID,
    token: TOKEN,
    hash: HASH,
    created_version: true,
    pushed: true,
    stable_link: `${BASE}/${ID}/${TOKEN}/`,
    deck_link: `${BASE}/${ID}/${TOKEN}/slides/`,
    version_link: `${BASE}/${ID}/${TOKEN}/v/${HASH}/`,
    dry_run: false,
    steps: [
      { name: "mint", state: "done", detail: "minted the document's names" },
      { name: "stage", state: "done", detail: "2 files staged" },
      { name: "install", state: "done", detail: "wrote the version folder" },
      { name: "commit", state: "done", detail: `publish ${ID} ${HASH}` },
      { name: "push", state: "done", detail: "pushed" },
      { name: "record", state: "done", detail: "wrote the publish log entry" },
    ],
    failure: null,
    ...overrides,
  };
}

function services(overrides: Partial<PublishServices> = {}): PublishServices {
  return {
    describe: vi.fn(() =>
      Promise.resolve({ title: "The Lantern Papers", variant: "talk" }),
    ),
    build: vi.fn(() => Promise.resolve({ files: [], copies: [] })),
    publish: vi.fn(() => Promise.resolve(outcome())),
    publishDryRun: vi.fn(() => Promise.resolve(outcome({ dry_run: true, pushed: false }))),
    checkDeploy: vi.fn(() => Promise.resolve({ answered: false, hash: null })),
    readPublishLog: vi.fn(() => Promise.resolve([] as PublishEntry[])),
    openLink: vi.fn(() => Promise.resolve()),
    copyLink: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

let mounted: ReturnType<typeof createPublishPanel> | null = null;

function panelWith(overrides: Partial<PublishServices> = {}): {
  panel: ReturnType<typeof createPublishPanel>;
  used: PublishServices;
} {
  const used = services(overrides);
  const panel = createPublishPanel(used, { intervalMs: 10, limitMs: 40 });
  document.body.append(panel.element);
  mounted = panel;
  return { panel, used };
}

afterEach(() => {
  mounted?.destroy();
  mounted = null;
  document.body.replaceChildren();
});

describe("what the panel says", () => {
  it("states_that_unlisted_is_not_private", async () => {
    const { panel } = panelWith();
    await panel.open();
    const warning = panel.element.querySelector(".publish-warning");
    expect(warning?.textContent).toBe(UNLISTED_SENTENCE);
    // Beside the choice and behind no disclosure.
    expect(panel.element.querySelector("details")).toBeNull();
    expect(warning?.closest("[hidden]")).toBeNull();
  });

  it("states_it_again_on_the_second_open", async () => {
    const { panel } = panelWith();
    await panel.open();
    panel.close();
    expect(panel.element.querySelector(".publish-warning")).toBeNull();
    await panel.open();
    expect(panel.element.querySelector(".publish-warning")?.textContent).toBe(
      UNLISTED_SENTENCE,
    );
  });

  it("offers unlisted and gated, and says plainly what gated does in phase 1", async () => {
    const { panel } = panelWith();
    await panel.open();
    const flags = [...panel.element.querySelectorAll<HTMLInputElement>(
      "input[name='publish-flag']",
    )];
    expect(flags.map((input) => input.value)).toEqual(["unlisted", "gated"]);
    expect(flags[0]?.checked).toBe(true);
    expect(panel.element.querySelector(".publish-gated-note")?.textContent).toBe(
      GATED_NOTE,
    );
    expect(GATED_NOTE).toContain("not enforced");
  });

  it("publishes under the flag Alice chose", async () => {
    const { panel, used } = panelWith();
    await panel.open();
    const gated = panel.element.querySelector<HTMLInputElement>(
      "input[value='gated']",
    );
    gated!.checked = true;
    gated!.dispatchEvent(new Event("change"));
    panel.element.querySelector<HTMLButtonElement>(".publish-run")?.click();
    await vi.waitFor(() =>
      expect(used.publish).toHaveBeenCalledWith(
        expect.objectContaining({ flag: "gated", variant: "talk" }),
      ),
    );
  });
});

describe("the links", () => {
  it("shows_the_stable_link_with_a_copy_action, the deck first", async () => {
    const { panel, used } = panelWith();
    await panel.open();
    panel.element.querySelector<HTMLButtonElement>(".publish-run")?.click();
    await vi.waitFor(() =>
      expect(panel.element.querySelectorAll(".publish-links .publish-link")).toHaveLength(3),
    );
    const rows = [...panel.element.querySelectorAll(".publish-links .publish-link")];
    expect(rows[0]?.querySelector(".publish-link-label")?.textContent).toBe("Deck");
    expect(rows[0]?.querySelector(".publish-link-url")?.textContent).toBe(
      `${BASE}/${ID}/${TOKEN}/slides/`,
    );
    expect(rows[1]?.querySelector(".publish-link-url")?.textContent).toBe(
      `${BASE}/${ID}/${TOKEN}/`,
    );
    rows[0]?.querySelector<HTMLButtonElement>(".publish-copy-link")?.click();
    expect(used.copyLink).toHaveBeenCalledWith(`${BASE}/${ID}/${TOKEN}/slides/`);
    rows[0]?.querySelector<HTMLButtonElement>(".publish-open-link")?.click();
    expect(used.openLink).toHaveBeenCalledWith(`${BASE}/${ID}/${TOKEN}/slides/`);
  });

  it("names_the_failing_step", async () => {
    const failed = outcome({
      pushed: false,
      steps: [
        { name: "mint", state: "done", detail: "minted the document's names" },
        { name: "commit", state: "done", detail: "committed" },
        {
          name: "push",
          state: "failed",
          detail: "fatal: could not read Username",
        },
      ],
      failure: "fatal: could not read Username",
    });
    const { panel } = panelWith({ publish: vi.fn(() => Promise.resolve(failed)) });
    await panel.open();
    panel.element.querySelector<HTMLButtonElement>(".publish-run")?.click();
    await vi.waitFor(() =>
      expect(panel.element.querySelector(".publish-failure")).not.toBeNull(),
    );
    const step = panel.element.querySelector("[data-state='failed']");
    expect(step?.getAttribute("data-step")).toBe("push");
    expect(step?.textContent).toContain("could not read Username");
    expect(panel.element.querySelector(".publish-failure")?.textContent).toContain(
      "the site still serves what it served before",
    );
    // No link is offered for a publish that never landed.
    expect(panel.element.querySelectorAll(".publish-links .publish-link")).toHaveLength(0);
  });

  it("says a dry run wrote nothing and left the machine alone", async () => {
    const { panel, used } = panelWith();
    await panel.open();
    panel.element.querySelector<HTMLButtonElement>(".publish-dry")?.click();
    await vi.waitFor(() =>
      expect(panel.element.querySelector(".publish-dry-run")).not.toBeNull(),
    );
    expect(used.publishDryRun).toHaveBeenCalled();
    expect(used.publish).not.toHaveBeenCalled();
    expect(used.checkDeploy).not.toHaveBeenCalled();
  });
});

describe("the versions", () => {
  const two = [
    entry(HASH, "2026-09-05T10:00:00Z"),
    entry(OLDER, "2026-03-14T09:12:44Z"),
  ];

  it("lists_two_entries_newest_first", async () => {
    const { panel } = panelWith({
      readPublishLog: vi.fn(() => Promise.resolve(two)),
    });
    await panel.open();
    const rows = [...panel.element.querySelectorAll<HTMLElement>(".publish-version")];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.dataset.hash).toBe(HASH);
    expect(rows[1]?.dataset.hash).toBe(OLDER);
  });

  it("each_row_shows_the_stamp_hash_variants_flag_and_links", async () => {
    const { panel } = panelWith({
      readPublishLog: vi.fn(() => Promise.resolve(two)),
    });
    await panel.open();
    const line = panel.element.querySelector(".publish-version-line")?.textContent ?? "";
    expect(line).toContain("2026-09-05T10:00:00Z");
    expect(line).toContain(HASH);
    expect(line).toContain("talk");
    expect(line).toContain("unlisted");
    expect(line).toContain("not yet seen at the link");
  });

  it("each_row_offers_open_and_copy", async () => {
    const { panel, used } = panelWith({
      readPublishLog: vi.fn(() => Promise.resolve(two)),
    });
    await panel.open();
    const row = panel.element.querySelector(".publish-version");
    const version = [...(row?.querySelectorAll(".publish-link") ?? [])].find(
      (link) => link.querySelector(".publish-link-label")?.textContent === "talk version",
    );
    version?.querySelector<HTMLButtonElement>(".publish-open-link")?.click();
    version?.querySelector<HTMLButtonElement>(".publish-copy-link")?.click();
    expect(used.openLink).toHaveBeenCalledWith(`${BASE}/${ID}/${TOKEN}/v/${HASH}/`);
    expect(used.copyLink).toHaveBeenCalledWith(`${BASE}/${ID}/${TOKEN}/v/${HASH}/`);
  });

  it("says so when a version was seen at the link", async () => {
    const { panel } = panelWith({
      readPublishLog: vi.fn(() =>
        Promise.resolve([
          { ...entry(HASH, "2026-09-05T10:00:00Z"), seen_at_link: "2026-09-05T10:00:31Z" },
        ]),
      ),
    });
    await panel.open();
    expect(panel.element.querySelector(".publish-version-line")?.textContent).toContain(
      "seen at the link 2026-09-05T10:00:31Z",
    );
  });

  it("names an unparsable log rather than showing an empty list", async () => {
    const { panel } = panelWith({
      readPublishLog: vi.fn(() =>
        Promise.reject(new Error("cannot read publish-log.json: expected value")),
      ),
    });
    await panel.open();
    expect(panel.element.querySelector(".publish-versions")?.textContent).toContain(
      "publish-log.json",
    );
  });
});

describe("the panel's keyboard", () => {
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
    mountPublishPanel(
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
    expect(panels).toEqual(["publish"]);
    expect([...commands.keys()]).toEqual([PUBLISH_OPEN_ACTION]);
    commands.get(PUBLISH_OPEN_ACTION)?.();
    await vi.waitFor(() => expect(panel.isOpen).toBe(true));
  });

  it("carries no keyboard listener of its own for its chord", async () => {
    const { panel } = panelWith();
    mountPublishPanel(
      { registerPanel: () => undefined, registerCommand: () => undefined },
      panel,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "c", ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "l", ctrlKey: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(panel.isOpen).toBe(false);
    // The chord is the binding table's row, not the panel's listener.
    expect(bindingById(PUBLISH_OPEN_ACTION)?.chords).toEqual([PUBLISH_OPEN_CHORD]);
  });
});

describe("the network", () => {
  let fetched: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetched = vi.fn(() => Promise.reject(new Error("no request may leave")));
    globalThis.fetch = fetched as unknown as typeof globalThis.fetch;
  });

  it("an_editing_session_makes_no_request", async () => {
    const { panel, used } = panelWith();
    // Open the panel, read the log, look at the choice, close it again.
    await panel.open();
    panel.close();
    await panel.open();
    panel.close();
    expect(fetched).not.toHaveBeenCalled();
    expect(used.publish).not.toHaveBeenCalled();
    expect(used.checkDeploy).not.toHaveBeenCalled();
  });

  it("watches the link only after a publish, and stops when asked", async () => {
    const { panel, used } = panelWith();
    await panel.open();
    panel.element.querySelector<HTMLButtonElement>(".publish-run")?.click();
    await vi.waitFor(() => expect(used.checkDeploy).toHaveBeenCalled());
    expect(used.checkDeploy).toHaveBeenCalledWith(
      `${BASE}/${ID}/${TOKEN}/latest.json`,
      HASH,
    );
    panel.element.querySelector<HTMLButtonElement>(".publish-stop")?.click();
    const calls = (used.checkDeploy as ReturnType<typeof vi.fn>).mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect((used.checkDeploy as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });

  it("stops watching once the link answers", async () => {
    const { panel } = panelWith({
      checkDeploy: vi.fn(() => Promise.resolve({ answered: true, hash: HASH })),
    });
    await panel.open();
    panel.element.querySelector<HTMLButtonElement>(".publish-run")?.click();
    await vi.waitFor(() =>
      expect(panel.element.querySelector(".publish-seen")).not.toBeNull(),
    );
    expect(panel.element.querySelector(".publish-stop")).toBeNull();
  });
});
