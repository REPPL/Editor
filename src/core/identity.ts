/**
 * The three names a published document is known by, and the one grammar they
 * share.
 *
 * A stable id, a variant token and a version hash are each sixteen bytes
 * written as RFC 4648 base32, lower-cased and unpadded: twenty-six characters
 * over `[a-z2-7]`. One shape, so one validator serves every path segment the
 * presenter meets.
 *
 * Base32 and not hex, because the production repository is checked out on a
 * case-insensitive file system where two names differing only in case collide.
 * Base32 and not base64url, because the alphabet omits `0`, `1`, `8` and `9`,
 * so no character has a look-alike to mistype from a lectern.
 *
 * This module is the frontend's copy of the grammar; `src-tauri/src/publish/
 * identity.rs` is the shell's, and `identity.test.ts` and its Rust twin share
 * the same vectors so the two cannot drift.
 */

/** How many bytes an id, a token and a version hash each carry. */
export const IDENTIFIER_BYTES = 16;

/** How many characters those sixteen bytes encode to. */
export const IDENTIFIER_LENGTH = 26;

/** The one grammar every id, token and hash is validated against. */
export const IDENTIFIER_PATTERN = /^[a-z2-7]{26}$/;

/** RFC 4648 base32, lower-cased. */
const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/** Whether a path segment is a well-formed id, token or version hash. */
export function isIdentifier(value: string): boolean {
  return IDENTIFIER_PATTERN.test(value);
}

/** Encode bytes as lower-case unpadded base32. */
export function encodeBase32(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(buffer >> bits) & 0b11111];
    }
  }
  if (bits > 0) {
    // The tail is padded with zero bits rather than with `=`: the length is
    // fixed by the byte count, so padding carries no information.
    out += ALPHABET[(buffer << (5 - bits)) & 0b11111];
  }
  return out;
}

/**
 * Decode lower-case unpadded base32.
 *
 * Refuses a character outside the alphabet rather than skipping it, because a
 * segment that is nearly an id is not an id.
 */
export function decodeBase32(text: string): Uint8Array {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of text) {
    const value = ALPHABET.indexOf(character);
    if (value < 0) {
      throw new Error(`not base32: ${JSON.stringify(character)}`);
    }
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

/** Where random bytes come from; a test hands in its own. */
export type RandomBytes = (length: number) => Uint8Array;

function systemRandom(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Mint one identifier.
 *
 * A hundred and twenty-eight bits, because for an unlisted document the id is
 * the whole of the protection.
 */
export function mintIdentifier(random: RandomBytes = systemRandom): string {
  return encodeBase32(random(IDENTIFIER_BYTES));
}

/** One file in the version folder, named by its content. */
export interface ListingEntry {
  /** The path relative to the version folder, with `/` separators. */
  readonly path: string;
  /** The file's SHA-256 as lower-case hex. */
  readonly sha256: string;
}

/**
 * The canonical listing a version hash is taken over.
 *
 * One line per file, `<hex> + "  " + <path> + "\n"`, sorted ascending by the
 * path's UTF-8 bytes. Content and layout only: no mode, no size, no
 * timestamp, so the same built output hashes the same on any machine.
 */
export function canonicalListing(entries: readonly ListingEntry[]): string {
  const encoder = new TextEncoder();
  const sorted = [...entries].sort((left, right) =>
    compareBytes(encoder.encode(left.path), encoder.encode(right.path)),
  );
  return sorted.map((entry) => `${entry.sha256}  ${entry.path}\n`).join("");
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const shared = Math.min(left.length, right.length);
  for (let index = 0; index < shared; index += 1) {
    const a = left[index] as number;
    const b = right[index] as number;
    if (a !== b) {
      return a < b ? -1 : 1;
    }
  }
  return left.length - right.length;
}

/** SHA-256 of some bytes, as lower-case hex. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as ArrayBuffer,
  );
  return hex(new Uint8Array(digest));
}

/** SHA-256 of a string's UTF-8 bytes, as lower-case hex. */
export async function sha256HexOfText(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(text));
}

/**
 * The version hash: the first sixteen bytes of the listing's digest.
 *
 * A hundred and twenty-eight bits leaves a birthday bound of 2^64 versions,
 * which is more versions than a document will ever have.
 */
export async function versionHash(
  entries: readonly ListingEntry[],
): Promise<string> {
  const listing = canonicalListing(entries);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(listing) as unknown as ArrayBuffer,
  );
  return encodeBase32(new Uint8Array(digest).slice(0, IDENTIFIER_BYTES));
}

function hex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}
