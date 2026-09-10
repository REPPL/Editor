/**
 * The image-reference resolver seam.
 *
 * A renderer never opens a file. It is handed a reference as the author wrote
 * it and asks for a URL, and the host decides what that URL is: the app reads
 * the bytes through the shell and answers with a `data:` URI, the site build
 * answers with the path the file was copied to. One seam, so the deck and the
 * article agree about a picture and neither knows what a file system is.
 *
 * The seam is also where "no machine in the document" is enforced. A reference
 * that is absolute, or that climbs above the chapter with `..`, resolves to
 * nothing and is reported: those are the two shapes that name the author's
 * machine rather than the document, and a rendering that silently followed one
 * would publish it.
 *
 * And it is where a reference's percent escapes are read back. A drop writes a
 * reference a Markdown destination reads unquoted — `assets/a%20lantern.jpg`
 * for a file whose name carries a space — while the copy on disk keeps the
 * space, so something has to decode, and [`decodeReference`] is the one thing
 * that does. Every host resolves the decoded name, and so does the publish
 * build's copy list; the shell has one decode of its own at the moment it
 * opens the file, and nothing else in the app decodes anything.
 */

import { walkChapterBlocks, walkInlines, type Chapter } from "./tree";

/** What shape a reference is, which is what decides whether it may resolve. */
export type ReferenceKind =
  /** A path inside the chapter's own folder. The only resolvable shape. */
  | "relative"
  /** `/var/…`, `C:\…`, or a `file:` URL: the author's machine, refused. */
  | "absolute"
  /** `../…` reaching above the chapter's folder, refused. */
  | "climbing"
  /** `https:`, `data:` and the like: not a path, and not ours to rewrite. */
  | "remote"
  /** Nothing was written. */
  | "empty";

/** One reference, classified. */
export interface Reference {
  /** Exactly what the author wrote. */
  readonly written: string;
  readonly kind: ReferenceKind;
  /** The path with `.` segments removed; empty unless the kind is relative. */
  readonly path: string;
}

/** What a resolver answers. */
export interface Resolution {
  readonly reference: string;
  readonly kind: ReferenceKind;
  /** Where the rendering should point, or null when it may not point anywhere. */
  readonly url: string | null;
  /** Why nothing was resolved, in words a person can read. Null on success. */
  readonly problem: string | null;
}

/** A host's answer to "where is this picture?". */
export type Resolver = (reference: string) => Resolution;

/** A scheme at the front of a reference, such as `https:` or `data:`. */
const SCHEME = /^[A-Za-z][A-Za-z\d+.-]*:/;

/** A Windows drive letter, which the scheme pattern would otherwise claim. */
const DRIVE = /^[A-Za-z]:[\\/]/;

/** Classify a reference without touching a file system. */
export function classify(written: string): Reference {
  const text = written.trim();
  if (text === "") return { written, kind: "empty", path: "" };
  if (DRIVE.test(text) || text.startsWith("/") || text.startsWith("\\")) {
    return { written, kind: "absolute", path: "" };
  }
  const scheme = SCHEME.exec(text);
  if (scheme !== null) {
    // `file:` is a path with a scheme in front of it, and it names a machine.
    const kind = /^file:/i.test(text) ? "absolute" : "remote";
    return { written, kind, path: "" };
  }
  const segments: string[] = [];
  for (const segment of text.split(/[\\/]+/)) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      // A climb the path does not pay back leaves the chapter's folder.
      if (segments.length === 0) return { written, kind: "climbing", path: "" };
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  if (segments.length === 0) return { written, kind: "empty", path: "" };
  return { written, kind: "relative", path: segments.join("/") };
}

/**
 * A reference with its percent escapes read back: the name on disk.
 *
 * `assets/a%20lantern.jpg` names the file `a lantern.jpg`, because that is
 * what the drop wrote and what the file is called. Null where the escapes do
 * not name a file the reference could have named in plain text: a malformed
 * escape, an escape that decodes to a path separator, or one that decodes to
 * `..`. A segment written `..` is left alone — a climb in plain sight is the
 * classifier's business, and this refuses only a climb in disguise.
 */
export function decodeReference(reference: string): string | null {
  const decoded: string[] = [];
  for (const segment of reference.split(/[\\/]/)) {
    let read: string;
    try {
      read = decodeURIComponent(segment);
    } catch {
      return null; // a malformed escape names nothing
    }
    if (read.includes("/") || read.includes("\\")) return null;
    if (read === ".." && segment !== "..") return null;
    decoded.push(read);
  }
  return decoded.join("/");
}

/** The refusal a kind earns, or null when it resolves. */
function problemOf(kind: ReferenceKind): string | null {
  switch (kind) {
    case "absolute":
      return "an absolute path names the author's machine rather than the document";
    case "climbing":
      return "a reference above the chapter's folder is outside the document";
    case "empty":
      return "the reference is empty";
    default:
      return null;
  }
}

/**
 * Refuse what must be refused; hand everything else to `resolve`.
 *
 * `resolve` is handed the reference and the name it decodes to, so a host
 * looks a file up by what it is called rather than by how it was written.
 */
function guarded(
  written: string,
  resolve: (reference: Reference, decoded: string) => string | null,
): Resolution {
  const reference = classify(written);
  const problem = problemOf(reference.kind);
  if (problem !== null) {
    return { reference: written, kind: reference.kind, url: null, problem };
  }
  const decoded =
    reference.kind === "relative" ? decodeReference(reference.path) : "";
  if (decoded === null) {
    return {
      reference: written,
      kind: reference.kind,
      url: null,
      problem: "the reference's escapes name something outside the chapter's folder",
    };
  }
  const url = resolve(reference, decoded);
  return {
    reference: written,
    kind: reference.kind,
    url,
    problem: url === null ? "no copy of this file was found" : null,
  };
}

/**
 * The resolver that resolves nothing.
 *
 * What a snapshot and a test want: every refusal still reported, and every
 * good reference left as the author wrote it, so a rendering can be compared
 * without a file system anywhere near it.
 */
export function pathResolver(prefix = ""): Resolver {
  return (written) =>
    guarded(written, (reference, decoded) =>
      reference.kind === "remote" ? reference.written.trim() : prefix + decoded,
    );
}

/**
 * The app's resolver: the bytes the shell read, as a `data:` URI.
 *
 * A reference the map has no entry for resolves to nothing and is reported,
 * which is what a picture the shell refused — too large, or not an image this
 * phase carries — looks like to a renderer.
 *
 * The map may be keyed by the reference as written or by the name it decodes
 * to, because the shell is asked for a picture by the author's reference and
 * answers about a file on disk: `assets/a%20lantern.jpg` finds an entry under
 * either it or `assets/a lantern.jpg`.
 */
export function dataResolver(
  byReference: ReadonlyMap<string, string>,
): Resolver {
  return (written) =>
    guarded(written, (reference, decoded) => {
      if (reference.kind === "remote") return reference.written.trim();
      return (
        byReference.get(reference.path) ??
        byReference.get(decoded) ??
        byReference.get(written) ??
        null
      );
    });
}

/**
 * Every image reference in a chapter, in source order, without repeats.
 *
 * The app reads these through the shell before it builds a deck; the site
 * build copies them beside it. Both want the same list, so it is derived once
 * from the tree rather than by each of them walking the blocks again.
 */
export function referencesOf(chapter: Chapter): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (written: string | null | undefined): void => {
    if (written === null || written === undefined) return;
    const text = written.trim();
    if (text === "" || seen.has(text)) return;
    seen.add(text);
    found.push(text);
  };
  for (const block of walkChapterBlocks(chapter)) {
    add(block.image?.src);
    add(block.video?.poster);
    for (const inline of walkInlines(block.inlines)) {
      if (inline.kind === "image") add(inline.src);
    }
  }
  return found;
}
