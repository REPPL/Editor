/**
 * The export panel's services, as the shell provides them.
 *
 * One place where the panel's needs meet the commands, so the panel holds no
 * knowledge of the IPC layer and a test can drive it with plain objects.
 *
 * There is no builder here. The plan is `buildVersion` over the tree
 * `documentForPublish` reads — the publish path's own two functions — with the
 * folder's chrome base rather than the site's. That is the whole of the
 * difference between what Alice carries into a room and what the site serves.
 */

import { invoke } from "@tauri-apps/api/core";

import { slugify } from "../core/outline";
import { DECK_ENGINE_FILES } from "../core/render/slides";
import type { PublishOutcome } from "../publish-panel";
import {
  ARTICLE_PATH,
  DECK_PATH,
  FOLDER_CHROME,
  buildVersion,
  renderVariant,
  type AssetCopy,
  type BuildRefusal,
  type BuiltFile,
} from "../publish/build";
import type { DocumentForPublish } from "../publish/services";

/** Which rendering a folder carries. */
export type ExportKind = "deck" | "article";

/**
 * What one export asks the shell for.
 *
 * The same shapes a publish request carries, because the build runs here and
 * hands the shell exactly what it built.
 */
export interface ExportRequest {
  readonly kind: ExportKind;
  readonly variant: string;
  readonly folder_name: string;
  /**
   * The nonce the shell minted for the folder Alice chose.
   *
   * Not a path: the dialog is the shell's, its answer stays there, and this
   * names that answer. A script in the view can ask for the folder she just
   * chose and for nothing else.
   */
  readonly destination_nonce: string;
  readonly files: readonly BuiltFile[];
  readonly copies: readonly AssetCopy[];
}

/** What one export wrote: a folder's name and a count, never a path. */
export interface ExportOutcome {
  readonly folder: string;
  readonly files: number;
}

/** One build of the open document, as a folder would carry it. */
export interface ExportPlan {
  readonly title: string;
  readonly variant: string;
  /** The document's title, as a folder name: `<slug>-deck`, `<slug>-article`. */
  readonly slug: string;
  readonly files: readonly BuiltFile[];
  readonly copies: readonly AssetCopy[];
  readonly refusals: readonly BuildRefusal[];
  /** The folder holding the document folder: where the dialog opens. */
  readonly beside: string | null;
}

/**
 * The chrome an exported folder carries, beside the page.
 *
 * The shell writes the site's own bytes for each of these — `chrome_for_folder`
 * in `src-tauri/src/publish/stage.rs` — and this is the list the panel states
 * before Alice confirms. `the_page_and_the_shell_name_one_set_of_chrome_files`
 * holds the two in step.
 */
export const FOLDER_CHROME_FILES: Readonly<Record<ExportKind, readonly string[]>> = {
  deck: [
    ...DECK_ENGINE_FILES.map((name) => `${FOLDER_CHROME}/reveal/${name}`),
    `${FOLDER_CHROME}/slides.css`,
    `${FOLDER_CHROME}/deck.js`,
  ],
  article: [
    `${FOLDER_CHROME}/article.css`,
    `${FOLDER_CHROME}/article-video.js`,
    `${FOLDER_CHROME}/article-controls.js`,
    `${FOLDER_CHROME}/article-eggs.js`,
  ],
};

/** The page one kind of export writes, inside its folder. */
export function pageOf(kind: ExportKind): string {
  return kind === "deck" ? DECK_PATH : ARTICLE_PATH;
}

/** The folder one kind of export creates, inside the folder Alice chooses. */
export function folderNameFor(kind: ExportKind, slug: string): string {
  return `${slug}-${kind}`;
}

/**
 * Every file one row writes, in the order the folder holds them.
 *
 * Read off the plan and the chrome table, never written out as prose: what the
 * panel states stays true when the build changes.
 */
export function filesFor(kind: ExportKind, plan: ExportPlan): string[] {
  const page = pageOf(kind);
  return [
    ...plan.files.filter((file) => file.path === page).map((file) => file.path),
    ...FOLDER_CHROME_FILES[kind],
    ...plan.copies.map((copy) => copy.to),
  ];
}

/** Every file the dry run stages: the version a publish would push. */
export function dryRunFiles(plan: ExportPlan): string[] {
  return [...plan.files.map((file) => file.path), ...plan.copies.map((copy) => copy.to)];
}

/** What one row hands the shell. */
export function requestFor(
  kind: ExportKind,
  plan: ExportPlan,
  destinationNonce: string,
): ExportRequest {
  const page = pageOf(kind);
  return {
    kind,
    variant: plan.variant,
    folder_name: folderNameFor(kind, plan.slug),
    destination_nonce: destinationNonce,
    // One page per folder: a deck export carries the deck and nothing else.
    files: plan.files.filter((file) => file.path === page),
    copies: plan.copies,
  };
}

/** What the panel needs from the world outside the page. */
export interface ExportServices {
  /** Build the open document as a folder would carry it. Writes nothing. */
  plan(): Promise<ExportPlan>;
  /**
   * The native folder chooser, opened beside the document folder.
   *
   * Answers with the nonce the shell minted for the folder Alice chose, or
   * null where she chose nothing. The path itself never crosses into the page.
   */
  chooseFolder(defaultPath: string | null): Promise<string | null>;
  /** Write one rendering into a folder, and show it. */
  exportRendering(request: ExportRequest): Promise<ExportOutcome>;
  /** Stage the version a publish would push, without publishing it. */
  dryRun(): Promise<PublishOutcome>;
  /** Show the folder the dry run staged. */
  revealStagedVersion(): Promise<void>;
}

/**
 * The longest a slug may be before the folder name it makes is unwieldy.
 *
 * The shell holds a name to 64 characters, and the suffix costs eight of them.
 */
const SLUG_LIMIT = 48;

/** The document's title as one path segment. */
export function slugFor(title: string): string {
  const slug = slugify(title).slice(0, SLUG_LIMIT).replace(/-+$/, "");
  return slug === "" ? "document" : slug;
}

/** The folder holding a folder, or null where there is none to name. */
export function parentOf(path: string | null): string | null {
  if (path === null) return null;
  const trimmed = path.replace(/\/+$/, "");
  const cut = trimmed.lastIndexOf("/");
  if (cut <= 0) return null;
  return trimmed.slice(0, cut);
}

/**
 * Wire the panel to the shell.
 *
 * `load` is the application's, and it is `documentForPublish`: a dirty buffer,
 * an unreadable chapter and a nameless variant are refused there, once, for
 * the publish and the export alike.
 */
export function createExportServices(
  load: () => Promise<DocumentForPublish>,
  documentRoot: () => string | null,
): ExportServices {
  const build = async (host: "site" | "folder"): Promise<DocumentForPublish & {
    built: ReturnType<typeof buildVersion>;
  }> => {
    const document = await load();
    const built = buildVersion(document.tree, document.variant, {
      rendered: renderVariant(document.tree, document.variant, {
        title: document.title,
        host,
        bibliography: document.bibliography,
      }),
    });
    return { ...document, built };
  };

  return {
    async plan() {
      const { title, variant, built } = await build("folder");
      return {
        title,
        variant,
        slug: slugFor(title),
        files: built.files,
        copies: built.copies,
        refusals: built.refusals,
        // The dialog opens beside the document folder, never inside it.
        beside: parentOf(documentRoot()),
      };
    },
    chooseFolder: (defaultPath) =>
      // The dialog is opened shell-side, so the destination an export writes
      // into is the author's own answer to it rather than a path this page
      // was in a position to choose.
      invoke<string | null>("choose_export_destination", { defaultPath }),
    exportRendering: (request) => invoke<ExportOutcome>("export_rendering", { request }),
    async dryRun() {
      // The dry run stands in for a publish, so it is the site build that is
      // staged: what would be pushed, exactly as it would be pushed.
      const { variant, built } = await build("site");
      return invoke<PublishOutcome>("publish_dry_run", {
        request: {
          variant,
          flag: "unlisted",
          files: built.files.map((file) => ({ path: file.path, text: file.text })),
          copies: built.copies.map((copy) => ({ from: copy.from, to: copy.to })),
        },
      });
    },
    revealStagedVersion: () => invoke<void>("reveal_staged_version"),
  };
}
