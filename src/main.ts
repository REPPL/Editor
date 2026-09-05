/**
 * The entry point inside the Tauri shell.
 */

import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { confirm, open } from "@tauri-apps/plugin-dialog";

import { createApp, type AppServices } from "./app";
import { documentText } from "./editor";
import {
  CHANGED_EVENT,
  addChapter,
  inShell,
  openFolder,
  presentChapter,
  readChapter,
  readChapters,
  readDocumentMetadata,
  setDirty,
  writeChapter,
} from "./doctree";
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
}
