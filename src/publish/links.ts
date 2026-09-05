/**
 * The link forms, in one place.
 *
 * The presenter routes on segment shape alone, so every link Editor hands
 * Alice is built from the same three names and the same grammar: nothing else
 * decides what a published path looks like.
 */

import { isIdentifier } from "../core/identity";

/** The links one publish produces for one variant. */
export interface VersionLinks {
  /** The stable link: the article, always the newest version. */
  readonly stable: string;
  /** The stable deck link: the talk, always the newest version. */
  readonly deck: string;
  /** This version's article, frozen. */
  readonly version: string;
  /** This version's deck, frozen. */
  readonly versionDeck: string;
}

/** Strip a base URL's trailing slashes, so joining never doubles one. */
export function normaliseBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * Build the four links for one published version.
 *
 * Refuses a name that is not an identifier rather than composing a link that
 * cannot resolve: a malformed link handed to Alice at a lectern is worse than
 * a refusal she can read.
 */
export function versionLinks(
  baseUrl: string,
  id: string,
  token: string,
  hash: string,
): VersionLinks {
  for (const [name, value] of [
    ["id", id],
    ["token", token],
    ["hash", hash],
  ] as const) {
    if (!isIdentifier(value)) {
      throw new Error(`the ${name} is not a published name: ${value}`);
    }
  }
  const base = `${normaliseBase(baseUrl)}/${id}/${token}`;
  return {
    stable: `${base}/`,
    deck: `${base}/slides/`,
    version: `${base}/v/${hash}/`,
    versionDeck: `${base}/v/${hash}/slides/`,
  };
}

/** The path, inside the site, that a variant's `latest.json` sits at. */
export function latestJsonPath(id: string, token: string): string {
  return `${id}/${token}/latest.json`;
}

/** The path, inside the site, that one version folder sits at. */
export function versionPath(id: string, token: string, hash: string): string {
  return `${id}/${token}/v/${hash}`;
}
