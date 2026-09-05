import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

/**
 * The presenter is tested as the file the site ships, not as a copy of it: the
 * shell that routes on a lectern is this exact script.
 */
const SITE = join(__dirname, "..", "..", "site");
const SOURCE = readFileSync(join(SITE, "presenter", "presenter.js"), "utf8");

const ID = "aaaaaaaaaaaaaaaaaaaaaaaaaa";
const TOKEN = "bbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH = "cccccccccccccccccccccccccc";

/** The environment the shipped script is handed: a location and a fetch. */
interface PresenterEnvironment {
  location: { pathname: string; replace: Mock };
  fetch: unknown;
}

interface Presenter {
  target(segments: string[]): { latest: string; version(hash: string): string } | null;
  present(env: PresenterEnvironment): Promise<unknown> | null;
}

/** Load the shipped script with nothing of a browser but what it is given. */
function load(): Presenter {
  const sandbox: Record<string, unknown> = { PRESENTER_MANUAL: true };
  runInNewContext(SOURCE, sandbox);
  return sandbox.Presenter as Presenter;
}

let presenter: Presenter;

beforeEach(() => {
  presenter = load();
});

/** A fetch that answers one `latest.json` and records every call. */
function fetcher(body: unknown, status = 200): Mock {
  return vi.fn(() =>
    Promise.resolve({
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

function environment(pathname: string, fetch: unknown): PresenterEnvironment {
  return {
    location: { pathname, replace: vi.fn() },
    fetch,
  };
}

describe("the segment grammar", () => {
  it("routes a stable link and a stable deck link", () => {
    expect(presenter.target([ID, TOKEN])?.latest).toBe(
      `/${ID}/${TOKEN}/latest.json`,
    );
    expect(presenter.target([ID, TOKEN])?.version(HASH)).toBe(
      `/${ID}/${TOKEN}/v/${HASH}/`,
    );
    expect(presenter.target([ID, TOKEN, "slides"])?.version(HASH)).toBe(
      `/${ID}/${TOKEN}/v/${HASH}/slides/`,
    );
  });

  it("routes nothing at the root, at a bare id, or at a version path", () => {
    expect(presenter.target([])).toBeNull();
    expect(presenter.target([ID])).toBeNull();
    expect(presenter.target([ID, TOKEN, "v", HASH])).toBeNull();
    expect(presenter.target([ID, TOKEN, "assets"])).toBeNull();
  });

  it("routes nothing for a segment outside the grammar", () => {
    expect(presenter.target(["ALICE".repeat(5) + "A", TOKEN])).toBeNull();
    expect(presenter.target([ID.slice(1), TOKEN])).toBeNull();
    expect(presenter.target([ID, `${TOKEN}x`])).toBeNull();
    expect(presenter.target(["01234567890123456789012345", TOKEN])).toBeNull();
  });
});

describe("resolving", () => {
  it("a_stable_link_resolves_to_the_latest_version", async () => {
    const fetch = fetcher({ schema_version: 1, hash: HASH });
    const env = environment(`/${ID}/${TOKEN}/`, fetch);
    await presenter.present(env);
    expect(fetch).toHaveBeenCalledWith(`/${ID}/${TOKEN}/latest.json`, {
      credentials: "omit",
    });
    expect(env.location.replace).toHaveBeenCalledWith(
      `/${ID}/${TOKEN}/v/${HASH}/`,
    );
  });

  it("a_stable_link_follows_latest_json", async () => {
    const first = environment(`/${ID}/${TOKEN}/`, fetcher({ hash: HASH }));
    await presenter.present(first);
    const later = "dddddddddddddddddddddddddd";
    const second = environment(`/${ID}/${TOKEN}/`, fetcher({ hash: later }));
    await presenter.present(second);
    expect(first.location.replace).toHaveBeenCalledWith(
      `/${ID}/${TOKEN}/v/${HASH}/`,
    );
    expect(second.location.replace).toHaveBeenCalledWith(
      `/${ID}/${TOKEN}/v/${later}/`,
    );
  });

  it("makes no request for an address outside the grammar", async () => {
    const fetch = fetcher({ hash: HASH });
    for (const pathname of ["/", `/${ID}/`, "/lantern-papers/", "/v/", `/${ID}/${TOKEN}/v/${HASH}/`]) {
      const env = environment(pathname, fetch);
      await presenter.present(env);
      expect(env.location.replace).not.toHaveBeenCalled();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("an_unpublished_hash_renders_the_shell", async () => {
    const fetch = fetcher(null, 404);
    const env = environment(`/${ID}/${TOKEN}/`, fetch);
    await presenter.present(env);
    expect(env.location.replace).not.toHaveBeenCalled();
  });

  it("stops on a body that is not a name", async () => {
    for (const body of [{ hash: "not a hash" }, { hash: 7 }, {}, null]) {
      const env = environment(`/${ID}/${TOKEN}/`, fetcher(body));
      await presenter.present(env);
      expect(env.location.replace).not.toHaveBeenCalled();
    }
  });

  it("stops, silently, when the request fails", async () => {
    const env = environment(
      `/${ID}/${TOKEN}/`,
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    await presenter.present(env);
    expect(env.location.replace).not.toHaveBeenCalled();
  });
});

describe("the shell", () => {
  const shell = readFileSync(join(SITE, "index.html"), "utf8");

  it("the_shell_is_identical_at_the_root_a_wrong_id_and_a_bare_id", () => {
    const notFound = readFileSync(join(SITE, "404.html"), "utf8");
    expect(notFound).toBe(shell);
  });

  it("the_shell_carries_no_link_and_no_list", () => {
    expect(shell).not.toMatch(/<a[\s>]/i);
    expect(shell).not.toMatch(/<ul[\s>]|<ol[\s>]|<li[\s>]/i);
    expect(shell).not.toMatch(/<h1[\s>]/i);
  });

  it("declares the viewport and names its chrome from the site root", () => {
    expect(shell).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
    expect(shell).toContain('src="/presenter/presenter.js"');
    expect(shell).not.toMatch(/https?:\/\//);
  });

  it("keeps every page out of an index", () => {
    expect(readFileSync(join(SITE, "robots.txt"), "utf8")).toContain(
      "Disallow: /",
    );
    const headers = readFileSync(join(SITE, "_headers"), "utf8");
    expect(headers).toContain("Referrer-Policy: no-referrer");
    expect(headers).toContain("X-Robots-Tag: noindex, nofollow");
    expect(headers).toContain("default-src 'none'");
  });
});
