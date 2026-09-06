/**
 * The application: sidebar, editing surface, modeline, overlays, key log.
 *
 * Kept separate from `main.ts` so that a test can build the whole surface
 * against a detached element without a shell underneath it.
 *
 * Three concerns, in this order below: the document session (open, reload, the
 * conflict, the detached case), the editing session (save, dirty, close), and
 * the surfaces other specs extend. The extension points are named and few:
 * `registerCommand` binds a row of the binding table to an action,
 * `registerPanel` mounts an overlay host, and `onDropTarget` fills in a branch
 * of the one drop router.
 */

import type { EditorView } from "@codemirror/view";

import { outlineOf, type Outline, type OutlineNode } from "./core/outline";
import { parseChapter } from "./core/parse";
import { createDropRouter, type DropRouter, type DropTargets } from "./drop";
import { createEditor, documentText, revealLine, setDocument } from "./editor";
import { createFocusModel, type FocusModel, type PanelFocus } from "./focus";
import { releaseEditorCommands, setEditorCommands, type EditorCommands } from "./emacs";
import type {
  Chapter,
  ChapterBatch,
  DocumentMetadata,
  DocumentTree,
  DropPayload,
  Part,
} from "./doctree";
import { installKeyLog, type KeyLog } from "./keyspike";
import { describeChord, openKeysPanel } from "./keyspanel";
import { createModeline, type Modeline } from "./modeline";
import { closeOverlay, openListOverlay, type ListEntry } from "./overlay";
import { openPalette } from "./palette";
import { openCommandPalette } from "./command-palette";
import {
  DEFAULT_FILL_COLUMN,
  backwardParagraph,
  backwardSentence,
  capitalizeWord,
  dabbrevExpand,
  deleteHorizontalSpace,
  deleteIndentation,
  describeKey,
  fillParagraph,
  forwardParagraph,
  forwardSentence,
  justOneSpace,
  moveToWindowLine,
  transposeLines,
  transposeWords,
  zapToChar,
  type ProseOptions,
} from "./prose";
import { createSidebar, type Sidebar } from "./sidebar";
import {
  setTextScale,
  textScaleMessage,
  textScaleStep,
  TEXT_SCALE_LIMIT,
} from "./text-scale";

/** What the application needs from the world outside the page. */
export interface AppServices {
  /** Ask the user for a folder; null when they cancel. */
  chooseFolder(): Promise<string | null>;
  /** Walk a document folder. */
  openFolder(path: string): Promise<DocumentTree>;
  /** Read one chapter. */
  readChapter(path: string): Promise<string>;
  /** Read many chapters in one round trip, for a redraw. */
  readChapters?(paths: readonly string[]): Promise<ChapterBatch>;
  /** Write one chapter. */
  writeChapter(path: string, text: string): Promise<void>;
  /** Copy the Markdown files of a drop into a Part. */
  addChapter?(part: string, nonce: string): Promise<readonly Chapter[]>;
  /** Read the open document's `document.yaml`. */
  readDocumentMetadata?(): Promise<DocumentMetadata>;
  /** Ask whether unsaved edits may be thrown away; false keeps them. */
  confirmDiscard(question: string): Promise<boolean>;
  /**
   * Leave the application.
   *
   * `C-x C-c` asks in the page and then calls this; the shell's own held-back
   * close calls the same function, so there is one quit and not two. Absent
   * outside the shell, where there is no window to close.
   */
  quit?(): Promise<void>;
  /**
   * Tell the shell whether the open chapter has unsaved edits.
   *
   * The shell needs its own copy: a close request arrives in Rust, before the
   * page has any say in it. Absent outside the shell.
   */
  reportDirty?(dirty: boolean): void;
  /**
   * The type scale this machine last left the surface at, in steps.
   *
   * Machine state, kept in the application's own settings and never in a
   * document folder. Absent outside the shell, where there is nowhere to keep
   * it and the surface simply opens at its default.
   */
  readTextScale?(): Promise<number>;
  /** Remember the type scale for this machine. Absent outside the shell. */
  writeTextScale?(steps: number): Promise<void>;
  /** Subscribe to a shell event. Absent outside the shell. */
  subscribe?<T>(event: string, handler: (payload: T) => void): Promise<() => void>;
}

/** The mounted application. */
export interface App {
  readonly view: EditorView;
  readonly sidebar: Sidebar;
  readonly modeline: Modeline;
  readonly keyLog: KeyLog;
  /** Which pane holds the keyboard, and the chord that moves it. */
  readonly focus: FocusModel;
  readonly drop: DropRouter;
  /** Whether the open chapter has unsaved edits. */
  readonly dirty: boolean;
  /** Whether the open chapter's file has gone from disk. */
  readonly detached: boolean;
  /** The open chapter's path, or null when none is open. */
  readonly chapterPath: string | null;
  /** The open document's root folder, or null when none is open. */
  readonly documentRoot: string | null;
  /** Every chapter of the open document, in the order the sidebar draws them. */
  readonly chapters: readonly Chapter[];
  /** Show a document folder in the sidebar. */
  openFolder(path: string): Promise<void>;
  /** Ask for a folder and show it. */
  promptForFolder(): Promise<void>;
  /** Re-walk, re-read, and redraw, keeping expansion and selection. */
  reload(): Promise<void>;
  /** Load a chapter into the editing surface, optionally at a heading. */
  openChapter(chapter: Chapter, node?: OutlineNode): Promise<void>;
  /** Write the open chapter back to disk. */
  save(): Promise<void>;
  /** Answer a close the shell held back; true when it is safe to close. */
  confirmClose(): Promise<boolean>;
  /** Say something in the modeline. */
  announce(message: string): void;

  // Extension points. Other specs add to the application through these and
  // through nothing else.

  /** Bind a row of the binding table to an action. */
  registerCommand(bindingId: string, run: () => void): void;
  /**
   * Mount a surface of the application's own, such as an overlay host.
   *
   * A panel that hands over a focus contract joins the pane cycle, so
   * `other-window` reaches it and the modeline names it.
   */
  registerPanel(name: string, element: HTMLElement, focus?: PanelFocus): void;
  /** Fill in a branch of the one drop router. */
  onDropTarget(target: "text", handler: (payload: DropPayload) => void): void;

  /** Stop listening and let go of the page. */
  destroy(): void;
}

/** The placeholder text a fresh window shows. */
const WELCOME = [
  "# Editor",
  "",
  "Open a document folder with `C-x C-f`, or the Open folder button.",
  "Save the chapter you are editing with `C-x C-s`.",
  "Insert a construct with `C-c i`; show every chord with `C-h b`.",
  "",
].join("\n");

/**
 * The two answers the quit question takes, the safe one first.
 *
 * The overlay opens on its first row, and Return takes the row the cursor is
 * on. The destructive answer throws away everything Alice has not saved, so it
 * is never the one a reflex reaches: she has to move onto "Quit without
 * saving" before Return means it. Every other confirmation in the application
 * makes the same promise.
 */
/** How long a message that says itself once stays in the modeline. */
const TRANSIENT_MESSAGE_MS = 1500;

const QUIT_CHOICES: readonly ListEntry[] = [
  { id: "keep", label: "Keep editing" },
  { id: "quit", label: "Quit without saving" },
];

/** Every chapter in a tree, in the order the sidebar draws them. */
function chaptersOf(part: Part): Chapter[] {
  const found = [...part.chapters];
  for (const child of part.parts) found.push(...chaptersOf(child));
  return found;
}

/** Mount the application into `root`. */
export function createApp(root: HTMLElement, services: AppServices): App {
  // ---------------------------------------------------------- session state
  let tree: DocumentTree | null = null;
  let outlines = new Map<string, Outline>();
  let openChapterPath: string | null = null;
  let openChapterTitle: string | null = null;
  let openNodeId: string | null = null;
  let savedText = WELCOME;
  let detached = false;
  let message = "";
  /**
   * The column `M-q` fills at.
   *
   * The open document's own, from `document.yaml`, and 80 while the file is
   * absent, silent, or unreadable.
   */
  let fillColumn = DEFAULT_FILL_COLUMN;
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
  /** The timer clearing a message that says itself once, if one is running. */
  let transient: ReturnType<typeof setTimeout> | null = null;

  const sidebar = createSidebar({
    onOpenChapter: (chapter, node) => {
      // Return in the tree and a click on a row are the same hook. Where the
      // tree held the keyboard, opening hands it back to the text once the
      // chapter has loaded, with the cursor already on the heading.
      const handBack = focus.pane === "sidebar";
      void (async () => {
        await app.openChapter(chapter, node);
        if (handBack) focus.toEditor();
      })();
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

  /** Where overlays are mounted, so they sit over the surface and not the page. */
  const overlayHost = document.createElement("div");
  overlayHost.className = "overlay-host";

  /**
   * The pane cycle.
   *
   * Built after the surface it moves between and before anything registers a
   * panel, so every pane that can hold the keyboard is registered in one
   * place.
   */
  const focus: FocusModel = createFocusModel({
    sidebar,
    // The content, because it is the element the keyboard actually lands in
    // when Alice clicks in a paragraph.
    editorContent: view.contentDOM,
    // And the whole surface beside it, because CodeMirror's own panels — the
    // search field `C-s` opens — are in here and not in the content.
    editorSurface: view.dom,
    focusEditor: () => {
      view.focus();
    },
    onChange: () => {
      refresh();
    },
  });

  const layout = document.createElement("div");
  layout.className = "layout";
  layout.append(sidebar.element, editorPane);
  root.replaceChildren(layout, overlayHost, keyLog.element, modeline.element);

  // --------------------------------------------------------- editing session

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
      pane: focus.label,
      prefix: focus.prefix,
      chapter: openChapterTitle,
      dirty,
      detached,
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

  /**
   * Say something and then stop saying it.
   *
   * The scale is worth reading once; the cell it is read in is the one the
   * position and the mark sit beside, and they must come back. Anything else
   * said in the meantime wins, because it is newer.
   */
  function announceBriefly(text: string): void {
    announce(text);
    if (transient !== null) clearTimeout(transient);
    transient = setTimeout(() => {
      transient = null;
      if (message === text) announce("");
    }, TRANSIENT_MESSAGE_MS);
  }

  /**
   * Take a step of type scale, or say why the surface did not move.
   *
   * The new step is remembered for this machine only once it has been taken,
   * so a chord pressed at a bound writes nothing.
   */
  function scaleText(to: (step: number) => number): void {
    const step = to(textScaleStep(view));
    const moved = setTextScale(view, step);
    const now = textScaleStep(view);
    announceBriefly(textScaleMessage(now, moved));
    if (!moved) return;
    void services.writeTextScale?.(now).catch((error: unknown) => {
      announce(String(error));
    });
  }

  /** Ask before edits are thrown away. True means carry on. */
  async function mayDiscard(): Promise<boolean> {
    if (!isDirty()) return true;
    const what = openChapterTitle ?? "The document";
    return services.confirmDiscard(`${what} has unsaved edits. Discard them?`);
  }

  /** Put the buffer back to the welcome text and forget the open chapter. */
  function forgetChapter(): void {
    loadToken += 1;
    openChapterPath = null;
    openChapterTitle = null;
    openNodeId = null;
    detached = false;
    savedText = WELCOME;
    setDocument(view, WELCOME);
    sidebar.select(null);
  }

  // -------------------------------------------------------- document session

  /** Read every chapter of a tree and derive its outline. */
  async function readOutlines(
    next: DocumentTree,
  ): Promise<Map<string, Outline>> {
    const chapters = chaptersOf(next.root);
    const built = new Map<string, Outline>();
    if (chapters.length === 0) return built;

    const paths = chapters.map((chapter) => chapter.path);
    let batch: ChapterBatch;
    if (services.readChapters) {
      batch = await services.readChapters(paths);
    } else {
      // One round trip per chapter is the fallback for a host with no batch
      // read; the shell has one, so this is the test harness's path.
      const reads = [];
      const failures: string[] = [];
      for (const path of paths) {
        try {
          reads.push({ path, text: await services.readChapter(path) });
        } catch (error) {
          failures.push(String(error));
        }
      }
      batch = { reads, failures };
    }
    for (const read of batch.reads) {
      built.set(read.path, outlineOf(parseChapter(read.text)));
    }
    for (const failure of batch.failures) {
      console.warn(`outline: ${failure}`);
    }
    return built;
  }

  /** Draw a tree, with the outlines the sidebar needs for its lower levels. */
  async function showTree(next: DocumentTree): Promise<void> {
    tree = next;
    outlines = await readOutlines(next);
    sidebar.show(tree, outlines);
    sidebar.select(openChapterPath, openNodeId);
    // The tree is the second pane, and a tree with no rows is not a pane at
    // all. Redrawing it can empty it — a folder opened that holds no chapters
    // — and the keyboard must not be left in a pane that has gone away.
    focus.reconcile();
  }

  /** The chapter with a given path in the tree that is drawn, if any. */
  function chapterAt(path: string): Chapter | undefined {
    if (!tree) return undefined;
    return chaptersOf(tree.root).find((chapter) => chapter.path === path);
  }

  /**
   * The document's title, from `document.yaml` where there is one.
   *
   * The fill column is read in the same round trip, because it comes from the
   * same file and a second read would be a second answer to one question. A
   * file that is absent, silent, or unreadable leaves the default standing.
   */
  async function documentTitle(fallback: string): Promise<string> {
    fillColumn = DEFAULT_FILL_COLUMN;
    if (!services.readDocumentMetadata) return fallback;
    try {
      const metadata = await services.readDocumentMetadata();
      const stated = metadata.fill_column;
      if (typeof stated === "number" && stated > 0) fillColumn = stated;
      const title = metadata.title;
      return title !== null && title !== "" ? title : fallback;
    } catch (error) {
      console.warn(`document.yaml: ${String(error)}`);
      return fallback;
    }
  }

  /** What every prose command is told about the open document. */
  function proseOptions(): ProseOptions {
    return { fillColumn };
  }

  /** Run a prose command and announce its refusal, if it refused. */
  function prose(run: () => string | null): void {
    announce(run() ?? "");
  }

  // ------------------------------------------------------------- extensions

  /** Leave, or say why leaving is not possible here. */
  function leave(): void {
    if (!services.quit) {
      announce("Quitting needs the desktop application");
      return;
    }
    void services.quit().catch((error: unknown) => {
      announce(String(error));
    });
  }

  /**
   * `C-x C-c`.
   *
   * With nothing unsaved it quits. With unsaved edits it asks in the overlay
   * host rather than through a native dialog, so `C-g` and Escape put Alice
   * back in the text with her edits intact — which the platform's own dialog,
   * answering Return and Escape alone, cannot do.
   */
  function quit(): void {
    if (!isDirty()) {
      leave();
      return;
    }
    const keep = (): void => {
      view.focus();
      announce("Kept your edits");
    };
    openListOverlay<ListEntry>({
      host: overlayHost,
      className: "confirm",
      label: "Quit Editor",
      paneLabel: "Quit",
      rowKey: "choice",
      question: `${openChapterTitle ?? "The chapter"} has unsaved edits.`,
      entries: () => QUIT_CHOICES,
      onChoose: (choice) => {
        if (choice.id === "quit") leave();
        else keep();
      },
      onClose: (chosen) => {
        if (!chosen) keep();
      },
    });
  }

  const commands: EditorCommands = {
    "save-chapter": () => {
      void app.save();
    },
    "open-folder": () => {
      void app.promptForFolder();
    },
    "toggle-key-log": () => {
      keyLog.toggle();
    },
    "keys-panel": () => {
      openKeysPanel(overlayHost);
    },
    "insert-palette": () => {
      openPalette(view, { host: overlayHost, announce });
    },
    "toggle-sidebar": () => {
      sidebar.toggle();
    },
    "reload-document": () => {
      void app.reload();
    },

    // The type scale. Only the surface moves; the sidebar, the modeline and
    // every panel keep the size they had.
    "text-scale-increase": () => {
      scaleText((step) => step + 1);
    },
    "text-scale-decrease": () => {
      scaleText((step) => step - 1);
    },
    "text-scale-reset": () => {
      scaleText(() => 0);
    },
    // From the text. A pane the editing surface cannot hear reads the same
    // row for itself, in `src/focus.ts`, and both reach this one cycle.
    "other-window": () => {
      focus.cycle();
    },

    // The prose vocabulary. Each is a function of the view in `src/prose.ts`;
    // what the application adds is the document's fill column, the modeline
    // the refusals are announced in, and the host the two prompts mount in.
    "fill-paragraph": () => {
      prose(() => fillParagraph(view, proseOptions()));
    },
    "transpose-words": () => {
      prose(() => transposeWords(view));
    },
    "transpose-lines": () => {
      prose(() => transposeLines(view));
    },
    "capitalize-word": () => {
      prose(() => capitalizeWord(view));
    },
    "backward-sentence": () => {
      prose(() => backwardSentence(view, proseOptions()));
    },
    "forward-sentence": () => {
      prose(() => forwardSentence(view, proseOptions()));
    },
    "backward-paragraph": () => {
      prose(() => backwardParagraph(view));
    },
    "forward-paragraph": () => {
      prose(() => forwardParagraph(view));
    },
    "delete-indentation": () => {
      prose(() => deleteIndentation(view));
    },
    "just-one-space": () => {
      prose(() => justOneSpace(view));
    },
    "delete-horizontal-space": () => {
      prose(() => deleteHorizontalSpace(view));
    },
    "move-to-window-line": () => {
      prose(() => moveToWindowLine(view));
    },
    "dabbrev-expand": () => {
      prose(() => dabbrevExpand(view));
    },
    "zap-to-char": () => {
      zapToChar(view, { host: overlayHost, announce });
    },
    "describe-key": () => {
      describeKey({ host: overlayHost, announce });
    },
    "command-palette": () => {
      openCommandPalette(view, { host: overlayHost, announce });
    },
    quit: () => {
      quit();
    },
  };

  const dropTargets: DropTargets = {
    onPart: (partPath, payload) => {
      void addToPart(partPath, payload);
    },
    onRefused: (refusal) => {
      announce(refusal);
    },
  };
  const drop = createDropRouter(
    dropTargets,
    services.subscribe
      ? (event, handler) =>
          services.subscribe!<DropPayload>(event, handler)
      : undefined,
  );

  /** Copy a drop's Markdown files into a Part, then redraw. */
  async function addToPart(
    partPath: string,
    payload: DropPayload,
  ): Promise<void> {
    if (!services.addChapter) {
      announce("Adding a chapter needs the desktop shell");
      return;
    }
    try {
      const added = await services.addChapter(partPath, payload.nonce);
      await app.reload();
      const names = added.map((chapter) => chapter.title).join(", ");
      announce(added.length === 1 ? `Added ${names}` : `Added ${names || "nothing"}`);
    } catch (error) {
      announce(String(error));
    }
  }

  // ------------------------------------------------------------ the surface

  const app: App = {
    view,
    sidebar,
    modeline,
    keyLog,
    drop,
    focus,

    get dirty(): boolean {
      return isDirty();
    },

    get detached(): boolean {
      return detached;
    },

    get chapterPath(): string | null {
      return openChapterPath;
    },

    get documentRoot(): string | null {
      return tree === null ? null : tree.root.path;
    },

    get chapters(): readonly Chapter[] {
      return tree === null ? [] : chaptersOf(tree.root);
    },

    announce,

    async openFolder(path: string): Promise<void> {
      if (!(await mayDiscard())) {
        announce("Kept the open chapter");
        return;
      }
      try {
        const next = await services.openFolder(path);
        // The chapter that was open belongs to the document being replaced.
        // Holding on to its path would aim the next save at a file nothing on
        // screen shows any more.
        forgetChapter();
        await showTree(next);
        for (const failure of next.failures) {
          console.warn(`open ${path}: ${failure}`);
        }
        const unreadable =
          next.failures.length > 0
            ? ` — ${String(next.failures.length)} entries unreadable`
            : "";
        const title = await documentTitle(next.root.title);
        if (chaptersOf(next.root).length === 0) {
          announce(`${title} holds no Markdown chapters${unreadable}`);
          return;
        }
        announce(`Opened ${title}${unreadable}`);
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

    /**
     * Re-walk, re-read, redraw.
     *
     * The expansion set and the selected path survive, because the tree is the
     * same document however its files were renamed. What happens to the open
     * chapter depends on three cases and nothing else: unchanged on disk, left
     * alone; changed with a clean buffer, taken and said so; changed with a
     * dirty buffer, the author asked which text to keep and neither written
     * until she answers. A chapter whose path no longer resolves leaves the
     * buffer alone and is marked detached, and its next save is refused.
     */
    async reload(): Promise<void> {
      if (!tree) return;
      const rootPath = tree.root.path;
      const expansion = sidebar.expansion();
      let next: DocumentTree;
      try {
        next = await services.openFolder(rootPath);
      } catch (error) {
        announce(String(error));
        return;
      }
      await showTree(next);
      sidebar.setExpansion(expansion);
      sidebar.select(openChapterPath, openNodeId);
      // The document's own settings are read again, because a reload is what
      // an edit to `document.yaml` arrives as.
      await documentTitle(next.root.title);

      if (openChapterPath === null) return;
      const still = chapterAt(openChapterPath);
      if (!still) {
        detached = true;
        announce(`${openChapterTitle ?? "The chapter"} is no longer on disk`);
        return;
      }
      detached = false;

      let onDisk: string;
      try {
        onDisk = await services.readChapter(openChapterPath);
      } catch (error) {
        announce(String(error));
        return;
      }
      if (onDisk === savedText) {
        refresh();
        return;
      }
      if (!isDirty()) {
        savedText = onDisk;
        setDocument(view, onDisk);
        announce(`${openChapterTitle ?? "The chapter"} changed on disk`);
        return;
      }
      const takeDisk = await services.confirmDiscard(
        `${openChapterTitle ?? "The chapter"} changed on disk and has unsaved edits. Take the version on disk?`,
      );
      if (takeDisk) {
        savedText = onDisk;
        setDocument(view, onDisk);
        announce("Took the version on disk");
      } else {
        // Neither text is written: the buffer keeps the author's edits and
        // `savedText` keeps what she last read, so the buffer stays dirty and
        // the next save is hers to make deliberately.
        announce("Kept your edits; nothing was written");
      }
    },

    async openChapter(chapter: Chapter, node?: OutlineNode): Promise<void> {
      const sameChapter = chapter.path === openChapterPath;
      if (!sameChapter && !(await mayDiscard())) {
        announce("Kept the open chapter");
        return;
      }
      if (sameChapter && node) {
        // Already open: moving to one of its headings is not a load, and
        // reloading would throw the author's edits away.
        openNodeId = node.id;
        sidebar.select(chapter.path, node.id);
        revealLine(view, node.line);
        view.focus();
        refresh();
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
        openNodeId = node?.id ?? null;
        detached = false;
        setDocument(view, text);
        sidebar.select(chapter.path, openNodeId);
        if (node) revealLine(view, node.line);
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
      if (detached) {
        announce(`${openChapterPath} is no longer on disk; nothing was written`);
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

    registerCommand(bindingId: string, run: () => void): void {
      commands[bindingId] = run;
    },

    registerPanel(name: string, element: HTMLElement, panelFocus?: PanelFocus): void {
      element.dataset["panel"] = name;
      overlayHost.append(element);
      if (panelFocus) focus.registerPanel(panelFocus);
    },

    onDropTarget(target, handler): void {
      if (target === "text") dropTargets.onText = handler;
    },

    destroy(): void {
      if (transient !== null) clearTimeout(transient);
      transient = null;
      closeOverlay();
      focus.destroy();
      drop.dispose();
      releaseEditorCommands(commands);
      keyLog.dispose();
      view.destroy();
      root.replaceChildren();
    },
  };

  setEditorCommands(commands);

  // Every control that has a chord takes its tooltip from the table.
  const openButton = sidebar.element.querySelector<HTMLElement>(".sidebar-open");
  if (openButton) {
    openButton.title = describeChord("open-folder", "Open a document folder");
  }

  // The scale this machine was left at. Read once and applied without a word
  // in the modeline: Alice did not press anything, and a surface that opens at
  // the size she chose is not news. A machine that has never said is silent,
  // and the surface opens at its default.
  if (services.readTextScale) {
    void services
      .readTextScale()
      .then((step) => {
        if (Math.abs(step) > TEXT_SCALE_LIMIT) {
          console.warn(`text scale ${String(step)} is outside the range`);
        }
        setTextScale(view, step);
      })
      .catch((error: unknown) => {
        console.warn(`text scale: ${String(error)}`);
      });
  }

  sidebar.show(null);
  refresh();
  view.focus();
  return app;
}
