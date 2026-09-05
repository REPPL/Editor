/**
 * The application: sidebar, editing surface, modeline, key log.
 *
 * Kept separate from `main.ts` so that a test can build the whole surface
 * against a detached element without a shell underneath it.
 */

import type { EditorView } from "@codemirror/view";

import { createEditor, documentText, setDocument } from "./editor";
import { releaseEditorCommands, setEditorCommands } from "./emacs";
import type { Chapter, DocumentTree } from "./doctree";
import { installKeyLog, type KeyLog } from "./keyspike";
import { createModeline, type Modeline } from "./modeline";
import { createSidebar, type Sidebar } from "./sidebar";

/** What the application needs from the world outside the page. */
export interface AppServices {
  /** Ask the user for a folder; null when they cancel. */
  chooseFolder(): Promise<string | null>;
  /** Walk a document folder. */
  openFolder(path: string): Promise<DocumentTree>;
  /** Read one chapter. */
  readChapter(path: string): Promise<string>;
  /** Write one chapter. */
  writeChapter(path: string, text: string): Promise<void>;
  /** Ask whether unsaved edits may be thrown away; false keeps them. */
  confirmDiscard(question: string): Promise<boolean>;
  /**
   * Tell the shell whether the open chapter has unsaved edits.
   *
   * The shell needs its own copy: a close request arrives in Rust, before the
   * page has any say in it. Absent outside the shell.
   */
  reportDirty?(dirty: boolean): void;
}

/** The mounted application. */
export interface App {
  readonly view: EditorView;
  readonly sidebar: Sidebar;
  readonly modeline: Modeline;
  readonly keyLog: KeyLog;
  /** Whether the open chapter has edits that are not on disk. */
  readonly dirty: boolean;
  /** Show a document folder in the sidebar. */
  openFolder(path: string): Promise<void>;
  /** Ask for a folder and show it. */
  promptForFolder(): Promise<void>;
  /** Load a chapter into the editing surface. */
  openChapter(chapter: Chapter): Promise<void>;
  /** Write the open chapter back to disk. */
  save(): Promise<void>;
  /** Answer a close the shell held back; true when it is safe to close. */
  confirmClose(): Promise<boolean>;
  /** Stop listening and let go of the page. */
  destroy(): void;
}

/** The placeholder text a fresh window shows. */
const WELCOME = [
  "# Editor",
  "",
  "Open a document folder with `C-x C-f`, or the Open folder button.",
  "Save the chapter you are editing with `C-x C-s`.",
  "Show the key log with `C-x k`.",
  "",
].join("\n");

/** Mount the application into `root`. */
export function createApp(root: HTMLElement, services: AppServices): App {
  let openChapterPath: string | null = null;
  let openChapterTitle: string | null = null;
  let savedText = WELCOME;
  let message = "";
  /**
   * Which read the buffer is waiting for.
   *
   * Two clicks in a row start two reads, and nothing says the first finishes
   * first. Every load takes a token; a load whose token has moved on has been
   * overtaken and drops its result rather than overwriting the buffer, the
   * save target, and the selection with the chapter the author left behind.
   */
  let loadToken = 0;
  /** The last dirty state handed to the shell, so it hears only changes. */
  let reportedDirty: boolean | null = null;

  const sidebar = createSidebar({
    onOpenChapter: (chapter) => {
      void app.openChapter(chapter);
    },
    onOpenFolder: () => {
      void app.promptForFolder();
    },
  });
  const modeline = createModeline();
  const keyLog = installKeyLog();

  const editorPane = document.createElement("main");
  editorPane.className = "editor-pane";

  const view = createEditor(editorPane, WELCOME, {
    onChange: () => {
      refresh();
    },
  });

  const layout = document.createElement("div");
  layout.className = "layout";
  layout.append(sidebar.element, editorPane);
  root.replaceChildren(layout, keyLog.element, modeline.element);

  /**
   * Whether the buffer differs from the file.
   *
   * The comparison runs on the text as it would be written — the document's
   * own line separator included — so a chapter with CRLF endings is not dirty
   * the moment it is opened.
   */
  function isDirty(): boolean {
    return documentText(view) !== savedText;
  }

  function refresh(): void {
    const dirty = isDirty();
    modeline.update(view, {
      chapter: openChapterTitle,
      dirty,
      message,
    });
    if (dirty !== reportedDirty) {
      reportedDirty = dirty;
      services.reportDirty?.(dirty);
    }
  }

  function announce(text: string): void {
    message = text;
    refresh();
  }

  /** Ask before edits are thrown away. True means carry on. */
  async function mayDiscard(): Promise<boolean> {
    if (!isDirty()) return true;
    const what = openChapterTitle ?? "The document";
    return services.confirmDiscard(
      `${what} has unsaved edits. Discard them?`,
    );
  }

  /** Put the buffer back to the welcome text and forget the open chapter. */
  function forgetChapter(): void {
    loadToken += 1;
    openChapterPath = null;
    openChapterTitle = null;
    savedText = WELCOME;
    setDocument(view, WELCOME);
    sidebar.select(null);
  }

  const commands = {
    saveChapter: (): void => {
      void app.save();
    },
    openFolder: (): void => {
      void app.promptForFolder();
    },
    toggleKeyLog: (): void => {
      keyLog.toggle();
    },
  };

  const app: App = {
    view,
    sidebar,
    modeline,
    keyLog,

    get dirty(): boolean {
      return isDirty();
    },

    async openFolder(path: string): Promise<void> {
      if (!(await mayDiscard())) {
        announce("Kept the open chapter");
        return;
      }
      try {
        const tree = await services.openFolder(path);
        // The chapter that was open belongs to the document being replaced.
        // Holding on to its path would aim the next save at a file nothing on
        // screen shows any more.
        forgetChapter();
        sidebar.show(tree);
        for (const failure of tree.failures) {
          console.warn(`open ${path}: ${failure}`);
        }
        const unreadable =
          tree.failures.length > 0
            ? ` — ${String(tree.failures.length)} entries unreadable`
            : "";
        announce(`Opened ${tree.root.title}${unreadable}`);
      } catch (error) {
        announce(String(error));
      }
    },

    async promptForFolder(): Promise<void> {
      try {
        const path = await services.chooseFolder();
        if (path === null) return;
        await app.openFolder(path);
      } catch (error) {
        announce(String(error));
      }
    },

    async openChapter(chapter: Chapter): Promise<void> {
      if (!(await mayDiscard())) {
        announce("Kept the open chapter");
        return;
      }
      loadToken += 1;
      const token = loadToken;
      try {
        const text = await services.readChapter(chapter.path);
        if (token !== loadToken) return;
        savedText = text;
        openChapterPath = chapter.path;
        openChapterTitle = chapter.title;
        setDocument(view, text);
        sidebar.select(chapter.path);
        announce("");
      } catch (error) {
        if (token !== loadToken) return;
        announce(String(error));
      }
    },

    async save(): Promise<void> {
      if (openChapterPath === null) {
        announce("No chapter to save");
        return;
      }
      const path = openChapterPath;
      const text = documentText(view);
      try {
        await services.writeChapter(path, text);
        // A chapter switch during the write would have moved the target, so
        // only record the text as saved if it is still this chapter's.
        if (openChapterPath === path) {
          savedText = text;
        }
        announce(`Wrote ${openChapterTitle ?? path}`);
      } catch (error) {
        announce(String(error));
      }
    },

    async confirmClose(): Promise<boolean> {
      if (!isDirty()) return true;
      return services.confirmDiscard(
        `${openChapterTitle ?? "The document"} has unsaved edits. Close anyway?`,
      );
    },

    destroy(): void {
      releaseEditorCommands(commands);
      keyLog.dispose();
      view.destroy();
      root.replaceChildren();
    },
  };

  setEditorCommands(commands);

  sidebar.show(null);
  refresh();
  view.focus();
  return app;
}
