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
import { documentText } from "./editor";
import {
  CHANGED_EVENT,
  addChapter,
  dropOnChapter,
  inShell,
  openFolder,
  pasteReference,
  presentChapter,
  readChapter,
  readChapters,
  readDocumentMetadata,
  setDirty,
  writeChapter,
} from "./doctree";
import { createPublishPanel, mountPublishPanel } from "./publish-panel";
import {
  createPublishServices,
  documentForPublish,
  type DocumentForPublish,
} from "./publish/services";
import { createSettingsPanel, mountSettingsPanel } from "./settings-panel";
import { createSettingsServices } from "./settings";
import "./style.css";

/** The event the shell emits when the Open Folder menu item fires. */
const OPEN_FOLDER_EVENT = "menu://open-folder";

/** The event the shell emits when it holds a close back. */
const CLOSE_REQUESTED_EVENT = "window://close-requested";

const services: AppServices = {
  async chooseFolder() {
    const chosen = await open({ directory: true, multiple: false });
    return typeof chosen === "string" ? chosen : null;
  },
  openFolder,
  readChapter,
  readChapters,
  writeChapter,
  addChapter,
  readDocumentMetadata,
  confirmDiscard(question) {
    return confirm(question, { title: "Editor", kind: "warning" });
  },
  reportDirty(dirty) {
    void setDirty(dirty);
  },
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
    { readChapters, readDocumentMetadata },
  );
}

// Publish, `C-c C-l`, and settings, `C-c C-,`: two overlays mounted through
// the application's panel host, each reached by the binding table's row.
const publishPanel = createPublishPanel(createPublishServices(loadForPublish));
mountPublishPanel(app, publishPanel);

const settingsPanel = createSettingsPanel(createSettingsServices());
mountSettingsPanel(app, settingsPanel);

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
      await setDirty(false);
      await getCurrentWindow().destroy();
    })();
  });

  // The development harness. Both of its switches are environment variables,
  // so an ordinary launch reaches this line and does nothing.
  void startDevHarness(app);
}
