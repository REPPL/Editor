/**
 * The publish panel's services, as the shell provides them.
 *
 * One place where the panel's needs meet the commands, so the panel itself
 * holds no knowledge of the IPC layer and a test can drive it with plain
 * objects.
 */

import { invoke } from "@tauri-apps/api/core";

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
        }),
      });
      return {
        files: built.files.map((file) => ({ path: file.path, text: file.text })),
        copies: built.copies.map((copy) => ({ from: copy.from, to: copy.to })),
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
