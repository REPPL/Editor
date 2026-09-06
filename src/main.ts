/**
 * The entry point inside the Tauri shell.
 *
 * Everything the bundles built separately is joined here and nowhere else:
 * each reaches the application through the three extension points the surface
 * offers — `registerCommand`, `registerPanel`, `onDropTarget` — so the
 * application knows nothing about publishing, dropping, or presenting.
 */

import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { confirm, open } from "@tauri-apps/plugin-dialog";

import { createApp, type AppServices } from "./app";
import { startDevHarness } from "./devharness";
import { createDropTarget } from "./drop-target";
import { documentText, revealLine } from "./editor";
import {
  CHANGED_EVENT,
  addChapter,
  dropOnChapter,
  inShell,
  openDocumentSource,
  openFolder,
  pasteReference,
  pickDocumentFile,
  pickDocumentFolder,
  presentChapter,
  previewDocument,
  readBibliography,
  readChapter,
  readChapters,
  readDocumentMetadata,
  setDirty,
  writeChapter,
  type PreviewSource,
} from "./doctree";
import { createPublishPanel, mountPublishPanel } from "./publish-panel";
import {
  createPublishServices,
  documentForPublish,
  type DocumentForPublish,
} from "./publish/services";
import { createSettingsPanel, mountSettingsPanel } from "./settings-panel";
import { createSettingsServices, createTextScaleServices } from "./settings";
import { createExportPanel, mountExportPanel } from "./export-panel";
import { createExportServices } from "./export/services";
import {
  createNewDocumentPanel,
  mountNewDocumentPanel,
  type NewDocumentOutcome,
} from "./new-document-panel";
import { chooseNewDocumentFolder, createNewDocument } from "./new-document";
import "./style.css";

/** The event the shell emits when the Open Folder menu item fires. */
const OPEN_FOLDER_EVENT = "menu://open-folder";

/** The event the shell emits when it holds a close back. */
const CLOSE_REQUESTED_EVENT = "window://close-requested";

/**
 * The one way the window goes.
 *
 * The shell holds a close back until the page answers, and `C-x C-c` asks the
 * same question in the page; both end here, so there is one quit and not two.
 * Clearing the flag the shell is holding on is what stops it holding the close
 * back a second time.
 */
async function quitWindow(): Promise<void> {
  await setDirty(false);
  await getCurrentWindow().destroy();
}

const services: AppServices = {
  async chooseFolder() {
    const chosen = await open({ directory: true, multiple: false });
    return typeof chosen === "string" ? chosen : null;
  },
  openFolder,
  pickDocumentFolder,
  pickDocumentFile,
  openDocumentSource,
  readChapter,
  readChapters,
  writeChapter,
  addChapter,
  readDocumentMetadata,
  readBibliography,
  confirmDiscard(question) {
    return confirm(question, { title: "Editor", kind: "warning" });
  },
  reportDirty(dirty) {
    void setDirty(dirty);
  },
  // Only in the shell: outside it there is no window to close, and the page
  // says so rather than failing quietly. The type scale is the same — outside
  // the shell there is no per-machine store, so the surface opens at its
  // default and the chords still work for the session.
  ...(inShell() ? { quit: quitWindow, ...createTextScaleServices() } : {}),
  async subscribe<T>(event: string, handler: (payload: T) => void) {
    return listen<T>(event, (received) => {
      handler(received.payload);
    });
  },
};

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("missing #app element");

const app = createApp(root, services);

// Present, `C-c C-p`. The row is the binding table's; the action is the deck
// bundle's. The buffer's text is presented, not the file's, so an unsaved edit
// presents, and nothing is written anywhere.
app.registerCommand("present", () => {
  const path = app.chapterPath;
  if (path === null) {
    app.announce("No chapter to present");
    return;
  }
  void presentChapter(documentText(app.view), path).catch((error: unknown) => {
    app.announce(String(error));
  });
});

/**
 * The document as the preview window sees it.
 *
 * The article is one page for the whole document, so every chapter's text
 * travels, not one: the open chapter's is the buffer's, so an unsaved edit
 * previews, and every other chapter is read as the shell last read it — the
 * same rule `present` follows for the one chapter it hands over.
 */
function loadForPreview(): Promise<PreviewSource> {
  const root = app.documentRoot;
  if (root === null) {
    return Promise.reject(new Error("Open a document folder before previewing"));
  }
  const chapters = app.chapters;
  if (chapters.length === 0) {
    return Promise.reject(new Error("This document holds no chapters to preview"));
  }
  const prefix = root.endsWith("/") ? root : `${root}/`;
  const relative = (path: string): string =>
    path.startsWith(prefix) ? path.slice(prefix.length) : path;
  const activePath = app.chapterPath;
  const others = chapters.map((chapter) => chapter.path).filter((path) => path !== activePath);
  return (others.length === 0 ? Promise.resolve({ reads: [], failures: [] }) : readChapters(others))
    .then((batch) => {
      const byPath = new Map(batch.reads.map((read) => [read.path, read.text]));
      return Promise.all([readDocumentMetadata(), readBibliography()]).then(
        ([metadata, bibliography]) => ({
          title: metadata.title ?? chapters[0]?.title ?? "Untitled",
          variant: metadata.default_variant ?? metadata.variants[0] ?? "",
          bibliography,
          chapters: chapters.map((chapter) => ({
            path: relative(chapter.path),
            text:
              chapter.path === activePath
                ? documentText(app.view)
                : (byPath.get(chapter.path) ?? ""),
          })),
        }),
      );
    });
}

// Preview, `C-c C-v`: a second window, in the manner of Present, rendering
// the whole document from the buffers the shell holds so an unsaved edit
// previews.
app.registerCommand("preview", () => {
  void loadForPreview()
    .then((source) => previewDocument(source))
    .catch((error: unknown) => {
      app.announce(String(error));
    });
});

// The drop gesture's own branch of the one drop router. The shell has already
// classified, converted, stripped and copied the files; this decides only
// where the reference goes in the text.
const dropTarget = createDropTarget({
  view: app.view,
  chapterPath: () => app.chapterPath,
  services: { dropOnChapter, pasteReference },
  announce: (message) => {
    app.announce(message);
  },
});
app.onDropTarget("text", (payload) => {
  dropTarget.onText(payload);
});

/**
 * The document as the publish build sees it.
 *
 * The rule is `documentForPublish`'s, which is where the refusals are tested;
 * this only says where the application keeps each thing it asks for.
 */
function loadForPublish(): Promise<DocumentForPublish> {
  return documentForPublish(
    {
      documentRoot: app.documentRoot,
      dirty: app.dirty,
      chapters: app.chapters,
    },
    { readChapters, readDocumentMetadata, readBibliography },
  );
}

// Publish, `C-c C-l`, and settings, `C-c C-,`: two overlays mounted through
// the application's panel host, each reached by the binding table's row.
const publishPanel = createPublishPanel(createPublishServices(loadForPublish));
mountPublishPanel(app, publishPanel);

const settingsPanel = createSettingsPanel(createSettingsServices());
mountSettingsPanel(app, settingsPanel);

// Export, `C-c C-e`: the third overlay through the same two extension points.
// It builds through the publish path's own builder, so the folder Alice
// carries and the version the site serves are one build.
const exportPanel = createExportPanel(
  createExportServices(loadForPublish, () => app.documentRoot),
  {
    announce: (message) => {
      app.announce(message);
    },
  },
);
mountExportPanel(app, exportPanel);

/**
 * New document, `C-x C-n`: the fourth overlay through the same two extension
 * points. Creating writes the folder; showing it is map #1's own route
 * (`itd-2609051335399446`) — `app.openFolder` walks the folder the shell just
 * wrote, exactly as it would walk one Alice opened by hand.
 */
async function afterDocumentCreated(outcome: NewDocumentOutcome): Promise<void> {
  await app.openFolder(outcome.root);
  const chapter = app.chapters.find((candidate) => candidate.path === outcome.chapter);
  if (chapter) {
    await app.openChapter(chapter);
    // The chapter is nothing but its heading and the blank line beneath it;
    // line two is that blank line, and it is where a fresh document opens.
    revealLine(app.view, 2);
  }
  app.focus.toEditor();
}

const newDocumentPanel = createNewDocumentPanel(
  { chooseFolder: chooseNewDocumentFolder, createDocument: createNewDocument },
  { onCreated: afterDocumentCreated },
);
mountNewDocumentPanel(app, newDocumentPanel);

if (inShell()) {
  void listen(OPEN_FOLDER_EVENT, () => {
    void app.promptForFolder();
  });

  // The folder changed underneath us. The page re-walks rather than trusting a
  // diff: the walk is the only thing that decides order.
  void listen(CHANGED_EVENT, () => {
    void app.reload();
  });

  // The shell stops the close and hands it here, because only the page knows
  // whether the buffer differs from the file. Answering yes clears the flag
  // the shell is holding on, then closes for real.
  void listen(CLOSE_REQUESTED_EVENT, () => {
    void (async () => {
      if (!(await app.confirmClose())) return;
      await quitWindow();
    })();
  });

  // The development harness. Both of its switches are environment variables,
  // so an ordinary launch reaches this line and does nothing.
  void startDevHarness(app);
}
