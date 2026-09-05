/**
 * The entry point inside the Tauri shell.
 */

import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { confirm, open } from "@tauri-apps/plugin-dialog";

import { createApp, type AppServices } from "./app";
import {
  inShell,
  openFolder,
  readChapter,
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
  writeChapter,
  confirmDiscard(question) {
    return confirm(question, { title: "Editor", kind: "warning" });
  },
  reportDirty(dirty) {
    void setDirty(dirty);
  },
};

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("missing #app element");

const app = createApp(root, services);

if (inShell()) {
  void listen(OPEN_FOLDER_EVENT, () => {
    void app.promptForFolder();
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
