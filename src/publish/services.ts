/**
 * The publish panel's services, as the shell provides them.
 *
 * One place where the panel's needs meet the commands, so the panel itself
 * holds no knowledge of the IPC layer and a test can drive it with plain
 * objects.
 */

import { invoke } from "@tauri-apps/api/core";

import { parseChapter } from "../core/parse";

import type {
  DeployCheck,
  PublishEntry,
  PublishOutcome,
  PublishServices,
} from "../publish-panel";
import { buildVersion, renderVariant, type DocumentSource } from "./build";

/** What the application must supply: the document, parsed, and its title. */
export interface DocumentForPublish {
  readonly title: string;
  readonly variant: string;
  readonly tree: DocumentSource;
  /**
   * The bibliography file's own text, or `null` where the document names
   * none. Read once, here, and resolved once against every chapter in
   * `tree` by `renderVariant`, so the article, the deck and the export all
   * agree on what a citation names (itd-2609051335502171).
   */
  readonly bibliography: string | null;
}

/** The application, as the publish load sees it. */
export interface PublishSource {
  readonly documentRoot: string | null;
  /** Whether the open chapter has edits the file does not have. */
  readonly dirty: boolean;
  readonly chapters: readonly { readonly path: string; readonly title: string }[];
}

/** The reads a publish makes, as functions a test can stand in for. */
export interface PublishReaders {
  readChapters(paths: readonly string[]): Promise<{
    readonly reads: readonly { readonly path: string; readonly text: string }[];
    readonly failures: readonly string[];
  }>;
  readDocumentMetadata(): Promise<{
    readonly title: string | null;
    readonly variants: readonly string[];
    readonly default_variant: string | null;
  }>;
  /**
   * The bibliography file's own text, or `null` where the document names
   * none. Optional, so a test written before itd-2609051335502171 still
   * satisfies this interface; its absence is read the same as `null`.
   */
  readBibliography?(): Promise<string | null>;
}

/**
 * The document as the publish build sees it.
 *
 * The parse is the one parse: the chapters are read in a single round trip and
 * handed to `parseChapter`, and the paths are made relative to the document
 * root, because the build names an asset by where it sits in the document and
 * never by where the document sits on this machine.
 *
 * Everything this refuses, it refuses before anything is built: a version at a
 * public link that is a chapter short, or that says something other than the
 * screen the publish was started from, cannot be taken back.
 */
export async function documentForPublish(
  source: PublishSource,
  readers: PublishReaders,
): Promise<DocumentForPublish> {
  const documentRoot = source.documentRoot;
  if (documentRoot === null) {
    throw new Error("Open a document folder before publishing");
  }
  const chapters = source.chapters;
  if (chapters.length === 0) {
    throw new Error("This document holds no chapters to publish");
  }
  // The buffer is what the author is looking at; the publish reads the files.
  if (source.dirty) {
    throw new Error(
      "This chapter has unsaved edits. Save it with C-x C-s, then publish.",
    );
  }
  const batch = await readers.readChapters(chapters.map((chapter) => chapter.path));
  const byPath = new Map(batch.reads.map((read) => [read.path, read.text]));
  const metadata = await readers.readDocumentMetadata();
  const bibliography = (await readers.readBibliography?.()) ?? null;
  const prefix = documentRoot.endsWith("/") ? documentRoot : `${documentRoot}/`;
  const inputs = [];
  const missing: string[] = [];
  for (const chapter of chapters) {
    const relative = chapter.path.startsWith(prefix)
      ? chapter.path.slice(prefix.length)
      : chapter.path;
    const text = byPath.get(chapter.path);
    if (text === undefined) {
      // A chapter that will not read is not a chapter to leave out: the
      // version would be published a chapter short and nothing would say so.
      missing.push(relative);
      continue;
    }
    inputs.push({ path: relative, chapter: parseChapter(text) });
  }
  if (missing.length > 0) {
    throw new Error(
      `These chapters could not be read, so nothing was published: ${missing.join(", ")}`,
    );
  }
  const variant = metadata.default_variant ?? metadata.variants[0] ?? "";
  if (variant === "") {
    // The variant names the token the link is minted under and the line the
    // log writes. A nameless one would publish under a name nobody can say.
    throw new Error(
      "This document declares no variant. Name one in document.yaml under `variants:` before publishing.",
    );
  }
  return {
    title: metadata.title ?? chapters[0]?.title ?? "Untitled",
    variant,
    bibliography,
    tree: { chapters: inputs },
  };
}

/**
 * Wire the panel to the shell.
 *
 * `load` is the application's: it hands over the parsed chapters and the
 * title, which is everything the build is a pure function of.
 *
 * `renderVariant` runs the rendering core — `buildDocumentDeck`,
 * `renderSlides` and `renderArticle` — and hands the two pages to
 * `buildVersion`, which is a pure function of them and the tree.
 */
export function createPublishServices(
  load: () => Promise<DocumentForPublish>,
): PublishServices {
  return {
    async describe() {
      const document = await load();
      return { title: document.title, variant: document.variant };
    },
    async build(variant) {
      const document = await load();
      const built = buildVersion(document.tree, variant, {
        rendered: renderVariant(document.tree, variant, {
          title: document.title,
          // The site build: its chrome is the one kept at the site root.
          host: "site",
          bibliography: document.bibliography,
        }),
      });
      return {
        files: built.files.map((file) => ({ path: file.path, text: file.text })),
        copies: built.copies.map((copy) => ({ from: copy.from, to: copy.to })),
        // A reference the build would not resolve is carried out rather than
        // dropped: the page it names would otherwise go to the site with a
        // missing picture on it and nobody told.
        refusals: built.refusals.map((refusal) => ({
          chapter: refusal.chapter,
          reference: refusal.reference,
          reason: refusal.reason,
        })),
      };
    },
    publish: (request) => invoke<PublishOutcome>("publish", { request }),
    publishDryRun: (request) => invoke<PublishOutcome>("publish_dry_run", { request }),
    checkDeploy: (url, expectedHash) =>
      invoke<DeployCheck>("check_deploy", { url, expectedHash }),
    readPublishLog: () => invoke<PublishEntry[]>("read_publish_log"),
    openLink: (url) => invoke<void>("open_published_link", { url }),
    copyLink: (url) => navigator.clipboard.writeText(url),
  };
}
