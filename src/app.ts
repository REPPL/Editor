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

import {
  EMPTY_BIBLIOGRAPHY,
  parseBibliography,
  unresolvedCitationKeysIn,
  type Bibliography,
} from "./core/bibliography";
import { unresolvedEggsIn } from "./core/eggs";
import { outlineOf, type Outline, type OutlineNode } from "./core/outline";
import { parseChapter } from "./core/parse";
import { setBibliography } from "./citations";
import { createDropRouter, type DropRouter, type DropTargets } from "./drop";
import {
  createEditor,
  documentText,
  placeCursor,
  refreshSelection,
  revealLine,
  setDocument,
} from "./editor";
import { createFocusModel, type FocusModel, type PanelFocus } from "./focus";
import {
  changeCaseRegion,
  clearPending,
  queryReplaceRegex,
  releaseEditorCommands,
  runBinding,
  setEditorCommands,
  type EditorCommands,
} from "./emacs";
import {
  RESIZE_STEP,
  closeOtherWindows,
  closeWindow,
  floorShare,
  hasLeaf,
  heirOf,
  leafIds,
  mayDivide,
  resize,
  resizeTarget,
  splitAt,
  splitWindow,
  stepShares,
  type ResizeTarget,
  type WindowId,
  type WindowTree,
} from "./windows";
import { drawWindowGrid, measureSplit } from "./window-grid";
import { BINDINGS, scopeOf } from "./keys";
import { openPrefixHelp, prefixHelpNeedsAPrefix } from "./prefix-help";
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
import {
  backwardSameLevelHeading,
  boldRegion,
  cycleOutline,
  demoteHeading,
  forwardSameLevelHeading,
  insertImage,
  insertLink,
  italicRegion,
  moveHeadingDown,
  moveHeadingUp,
  narrowToSection,
  nextHeading,
  openOccur,
  openSwitchChapter,
  previousHeading,
  promoteHeading,
  toggleHeadingFold,
  upHeading,
  widenSection,
} from "./outline-commands";
import { createSidebar, type ChapterFacts, type Sidebar } from "./sidebar";
import { setTableAlignment, tableAlignmentOn } from "./tables";
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
  /**
   * The bibliography file the document names, or null where it names none.
   *
   * Read once per redraw, beside every chapter's own text, so the sidebar
   * can list a chapter's unresolved citation keys (itd-2609051335502171).
   * Absent outside the shell, where there is no bibliography to read.
   */
  readBibliography?(): Promise<string | null>;
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
  /**
   * Ask the shell's own dialog for a document folder to open, under a
   * nonce; `null` when the author cancels (`itd-2609061509393380`, map
   * #35). Absent outside the shell.
   */
  pickDocumentFolder?(): Promise<{ nonce: string; name: string } | null>;
  /** Ask the shell's own dialog for a single file to open, the same way. */
  pickDocumentFile?(): Promise<{ nonce: string; name: string } | null>;
  /**
   * Claim a pick's nonce and open what it named: a folder's whole tree, or a
   * single file as a one-chapter document, unless it already lives inside a
   * document folder, in which case the whole document opens with that
   * chapter selected.
   */
  openDocumentSource?(
    nonce: string,
  ): Promise<{ tree: DocumentTree; selectedChapter: string | null }>;
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
  /**
   * The editing area: the host the tree of windows is drawn into.
   *
   * One element for the whole area, whatever it is divided into, so a gesture
   * over the text is caught in one place and the window it belongs to is
   * resolved from the event rather than by registering a listener per window.
   */
  readonly editorHost: HTMLElement;
  /**
   * The editing window under a point in CSS pixels, and the chapter it shows.
   *
   * The pair, not the view alone: a gesture aimed at a window is about that
   * window's chapter, and asking the focused window's instead is what would
   * write one chapter's reference into another.
   */
  windowAt(
    x: number,
    y: number,
  ): { readonly view: EditorView; readonly chapter: string | null } | null;
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

/** `C-x C-k`'s confirmation, on the same terms `QUIT_CHOICES` sets. */
const CLOSE_CHOICES: readonly ListEntry[] = [
  { id: "keep", label: "Keep editing" },
  { id: "close", label: "Close without saving" },
];

/**
 * `C-x C-o`'s first question (`itd-2609061509393380`, map #35).
 *
 * A native dialog offers files or folders, never both, so this asks which
 * kind of thing before either dialog opens.
 */
const OPEN_SOURCE_CHOICES: readonly ListEntry[] = [
  { id: "folder", label: "A document folder" },
  { id: "file", label: "A single file" },
];

/** Every chapter in a tree, in the order the sidebar draws them. */
function chaptersOf(part: Part): Chapter[] {
  const found = [...part.chapters];
  for (const child of part.parts) found.push(...chaptersOf(child));
  return found;
}

/**
 * One open chapter: its text's home, and every window looking at it.
 *
 * A chapter stops being "what the editing surface shows" and becomes a buffer
 * the application holds, with zero or more windows looking at it
 * (`adr-2609091832455881`). That is what makes a window closeable without
 * losing the edits in it, and it is the property most easily lost in a later
 * refactor: `C-x 0` removes a leaf, destroys a view and drops that window's
 * remembered positions, and touches no buffer's text or `savedText` at all.
 */
interface ChapterBuffer {
  /** The chapter's path, or null for the welcome text. */
  readonly path: string | null;
  title: string | null;
  /** The text as last read from, or written to, disk. */
  savedText: string;
  detached: boolean;
  /** Which windows show it. */
  readonly windows: Set<WindowId>;
  /** The buffer-point: where the last window to leave it left the caret. */
  lastPoint: number;
  /** The text, held here only while no window shows it. */
  restingText: string | null;
  /**
   * Which window last carried a change into it, while that window still shows
   * it.
   *
   * The echo in `src/editor.ts` is synchronous but not instantaneous: the
   * originating view is updated, and only then are its peers. So for the length
   * of the originating window's own update listener every other window on the
   * buffer still holds the text as it was, and "any window's text" stops being
   * well defined for exactly that long. This names the window whose text is the
   * buffer's (`iss-2609120527453087`).
   */
  lastChanged: WindowId | null;
}

/** One editing window: what it is drawn in, what it shows, where it has been. */
interface EditorWindow {
  readonly id: WindowId;
  /** The region the view is mounted in; the element `windowOf` matches. */
  readonly element: HTMLElement;
  readonly view: EditorView;
  /** The buffer it shows: a chapter path, or null for the welcome text. */
  buffer: string | null;
  /** The window-point: where the caret sat in each chapter it has shown. */
  readonly points: Map<string | null, number>;
}

/** Mount the application into `root`. */
export function createApp(root: HTMLElement, services: AppServices): App {
  // ---------------------------------------------------------- session state
  let tree: DocumentTree | null = null;
  let outlines = new Map<string, Outline>();
  let openNodeId: string | null = null;
  /** Which buffer the heading `openNodeId` names belongs to. */
  let openNodeBuffer: string | null = null;
  let message = "";
  /**
   * How many times the application has said something.
   *
   * The modeline's message cell is a live region, and a live region has no way
   * of its own to tell a redraw carrying the standing message from a second
   * saying of the same words — a refusal the author has just earned for the
   * second time running. This counter is the difference: `announce` moves it
   * and `refresh` alone does not, so the cell is written when the author is
   * told something and left alone on every other redraw
   * (`iss-2609100647545513`).
   */
  let announcements = 0;
  /**
   * The bibliography's own read failure, set by the most recent
   * `readSidebarData` and read by whichever caller announces next.
   *
   * A named `.bib` that cannot be read is not the same fact as a document
   * with no bibliography at all: the first is an error to say, the second
   * is ordinary (`itd-2609051335502171`, review round one Fable F10). Kept
   * separate from every citation key's own unresolved state, which stays
   * unbadged while this is set, rather than badging every key in every
   * chapter as unresolved for a cause that is the file, not the key.
   */
  let bibliographyError: string | null = null;
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
  /**
   * Every open chapter, by path, with the welcome text under the null key.
   *
   * The null key is not a special case anywhere: every window is always on
   * exactly one buffer, and a window with no chapter open is on the welcome
   * one. That also keeps today's behaviour to the letter for a single window,
   * including the small existing oddity that editing the welcome text makes
   * `reportDirty` true while the modeline still says `-- no chapter`.
   */
  const buffers = new Map<string | null, ChapterBuffer>();
  /** Every editing window, by id. The tree below holds only the ids. */
  const windows = new Map<WindowId, EditorWindow>();
  /** The editing area's shape. Always at least one leaf. */
  let windowTree: WindowTree;
  /** How many windows have ever been made, so each id is its own. */
  let minted = 0;
  /** Whether the application has been torn down, so late work can stop. */
  let destroyed = false;
  /** The last dirty state handed to the shell, so it hears only changes. */
  let reportedDirty: boolean | null = null;
  /** The timer clearing a message that says itself once, if one is running. */
  let transient: ReturnType<typeof setTimeout> | null = null;
  /** Whether a type-scale write is in flight, and the step waiting behind it. */
  let scaleWriting = false;
  let pendingScale: number | null = null;

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

  /** The grid's host: the editing area, whatever it is divided into. */
  const editorPane = document.createElement("main");
  editorPane.className = "editor-pane";

  /** One buffer, making it where the application has not met it before. */
  function bufferFor(path: string | null): ChapterBuffer {
    const known = buffers.get(path);
    if (known) return known;
    const made: ChapterBuffer = {
      path,
      title: null,
      savedText: path === null ? WELCOME : "",
      detached: false,
      windows: new Set<WindowId>(),
      lastPoint: 0,
      restingText: null,
      lastChanged: null,
    };
    buffers.set(path, made);
    return made;
  }

  /**
   * Every other window showing one window's buffer.
   *
   * A getter, handed to each view at construction, because the set changes
   * every time a chapter is opened in a window and a view's dispatch hook can
   * only be given once.
   */
  function peersOf(id: WindowId): readonly EditorView[] {
    const held = windows.get(id);
    if (!held) return [];
    const found: EditorView[] = [];
    for (const other of windows.values()) {
      if (other.id !== id && other.buffer === held.buffer) found.push(other.view);
    }
    return found;
  }

  /** A fresh window id. */
  function mintWindow(): WindowId {
    minted += 1;
    return `w${String(minted)}` as WindowId;
  }

  /**
   * Build one editing window on a buffer, showing `doc`.
   *
   * The element is a labelled region, because moving the keyboard into a window
   * has to announce the window and the chapter it shows. `aria-current` was
   * declined: focus is the semantics, exactly one window has it, and
   * `document.activeElement` already says which.
   */
  function makeWindow(
    id: WindowId,
    buffer: string | null,
    doc: string,
  ): EditorWindow {
    const element = document.createElement("section");
    element.className = "editor-window";
    element.dataset["windowId"] = id;
    element.setAttribute("role", "region");
    const made: EditorWindow = {
      id,
      element,
      buffer,
      points: new Map<string | null, number>(),
      view: createEditor(
        element,
        doc,
        {
          onChange: () => {
            // Before the refresh, because the refresh asks what the buffer's
            // text is and this is the answer to "whose text"
            // (`iss-2609120527453087`).
            noteChange(id);
            refresh();
          },
        },
        () => peersOf(id),
      ),
    };
    windows.set(id, made);
    bufferFor(buffer).windows.add(id);
    return made;
  }

  const firstWindow = makeWindow(mintWindow(), null, WELCOME);
  windowTree = { kind: "leaf", id: firstWindow.id };

  /** The window holding the keyboard. Never null: a tree always has a leaf. */
  function here(): EditorWindow {
    const held = windows.get(focus.window);
    if (held) return held;
    // Unreachable: the focus model resolves to a leaf and every leaf has a
    // record. Falling back keeps the one question every command asks total.
    const first = leafIds(windowTree)[0];
    const fallback = first === undefined ? undefined : windows.get(first);
    if (fallback) return fallback;
    throw new Error("the editing area has no window");
  }

  /** The view the keyboard is in. The one question every command asks. */
  function view(): EditorView {
    return here().view;
  }

  /** The buffer the keyboard is in. */
  function bufferHere(): ChapterBuffer {
    return bufferFor(here().buffer);
  }

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
    // Each window's element holds that window's whole surface: the content the
    // keyboard lands in when Alice clicks a paragraph, and CodeMirror's own
    // panels — the search field `C-s` opens — around it. One question, asked of
    // the windows in turn, answers for both.
    editorWindowOf: (node) => {
      for (const held of windows.values()) {
        if (held.element.contains(node)) return held.id;
      }
      return null;
    },
    editorWindows: () => leafIds(windowTree),
    hasWindow: (id) => windows.has(id) && hasLeaf(windowTree, id),
    focusWindow: (id) => {
      const held = windows.get(id);
      if (!held) return;
      held.view.focus();
      // The tree highlights the chapter the keyboard is in, which is the only
      // sensible answer once several windows show several chapters.
      sidebar.select(
        held.buffer,
        held.buffer === openNodeBuffer ? openNodeId : null,
      );
    },
    releaseWindow: (id) => {
      const held = windows.get(id);
      if (held) clearPending(held.view);
    },
    // The one toggle, reached from a pane the editing surface cannot hear.
    // The row's other route, from the text, runs the same call below.
    toggleSidebar: () => {
      toggleSidebar();
    },
    announce: (text) => {
      announce(text);
    },
    // The same overlay the editing surface opens, over the rows this pane
    // answers and dispatched through this reader's own `run`. The application
    // adds only what neither reader owns: where it mounts, and how it speaks.
    prefixHelp: (request) => {
      openPrefixHelp({ ...request, host: overlayHost, announce });
    },
    onChange: () => {
      refresh();
    },
  });

  /**
   * Show or hide the sidebar.
   *
   * One command behind both of the row's chords and both of the readers that
   * answer them (`itd-2609091722296239`): the drawer's shown-or-hidden state
   * is written in the one place it already lives.
   */
  function toggleSidebar(): void {
    sidebar.toggle();
  }

  const layout = document.createElement("div");
  layout.className = "layout";
  layout.append(sidebar.element, editorPane);
  root.replaceChildren(layout, overlayHost, keyLog.element, modeline.element);

  // --------------------------------------------------------- editing session

  /**
   * Note which window last carried a change into its buffer.
   *
   * Run from that window's own update listener, which is the one moment the
   * question has a sharp answer: the peers are updated after the originating
   * view, so until they are, the window whose listener is running is the only
   * one holding the change (`iss-2609120527453087`).
   */
  function noteChange(id: WindowId): void {
    const held = windows.get(id);
    if (!held) return;
    bufferFor(held.buffer).lastChanged = id;
  }

  /**
   * One buffer's text.
   *
   * Every window on a buffer agrees by construction — the lockstep echo in
   * `src/editor.ts` is what makes that true — except inside the update listener
   * of the window that has just changed, where the echo has not reached the
   * peers yet. So the window that carried the change is asked first and any
   * window on the buffer after that: both are the same text at rest, and only
   * the first is the text at that moment (`iss-2609120527453087`). With no
   * window on it the text is resting in the buffer, which is how a chapter's
   * unsaved edits outlive the window that showed them.
   */
  function bufferText(buffer: ChapterBuffer): string {
    const last = buffer.lastChanged;
    const changed = last === null || !buffer.windows.has(last)
      ? undefined
      : windows.get(last);
    if (changed) return documentText(changed.view);
    for (const id of buffer.windows) {
      const held = windows.get(id);
      if (held) return documentText(held.view);
    }
    return buffer.restingText ?? buffer.savedText;
  }

  /**
   * Whether one buffer differs from its file.
   *
   * The comparison runs on the text as it would be written — the document's
   * own line separator included — so a chapter with CRLF endings is not dirty
   * the moment it is opened.
   */
  function isDirty(buffer: ChapterBuffer): boolean {
    return bufferText(buffer) !== buffer.savedText;
  }

  /**
   * Whether there is unsaved work anywhere.
   *
   * A genuine widening, and one the governing record does not mention: with
   * buffers outliving windows, "is there unsaved work" stops being a question
   * about one chapter. This is what the shell is told, and what quitting and
   * closing ask.
   */
  function anyDirty(): boolean {
    for (const buffer of buffers.values()) {
      if (isDirty(buffer)) return true;
    }
    return false;
  }

  /**
   * Every dirty buffer's title, for a question that has to name them.
   *
   * A title of null is the welcome buffer, which has no name; what a question
   * calls it is the question's own business, because the quit prompt and the
   * close prompt have always called it different things.
   */
  function dirtyTitles(): (string | null)[] {
    const found: (string | null)[] = [];
    for (const buffer of buffers.values()) {
      if (isDirty(buffer)) found.push(buffer.title);
    }
    return found;
  }

  /**
   * The question a gesture that discards unsaved work asks.
   *
   * One dirty buffer is named and several are counted, so the question can
   * never name one chapter while three are about to go. The tail is the
   * gesture's own — closing asks whether to close anyway, opening another
   * document whether to discard — and the count is not, which is why it is
   * written here rather than at each gesture (`iss-2609120527458643`).
   */
  function discardQuestion(tail: string): string {
    const titles = dirtyTitles();
    return titles.length === 1
      ? `${titles[0] ?? "The document"} has unsaved edits. ${tail}`
      : `${String(titles.length)} chapters have unsaved edits. ${tail}`;
  }

  /**
   * What the windows say about themselves, redrawn on every refresh.
   *
   * The focused window's border and each window's region label are both facts
   * that change without the tree changing — `C-x o` moves the keyboard, opening
   * a chapter renames a region — so they are written here rather than only in a
   * reshape.
   */
  function dressWindows(): void {
    const at = focus.window;
    for (const held of windows.values()) {
      // Written only when it changed. This runs on every transaction, and each
      // window's element is the parent of a CodeMirror view that watches its
      // own subtree for mutations; an attribute rewritten to the value it
      // already holds is still a mutation.
      const focused = held.id === at ? "yes" : "no";
      if (held.element.dataset["focused"] !== focused) {
        held.element.dataset["focused"] = focused;
      }
      const label = buffers.get(held.buffer)?.title ?? "Editor";
      if (held.element.getAttribute("aria-label") !== label) {
        held.element.setAttribute("aria-label", label);
      }
    }
  }

  function refresh(): void {
    const dirty = anyDirty();
    const held = here();
    const buffer = bufferFor(held.buffer);
    const leaves = leafIds(windowTree);
    dressWindows();
    modeline.update(held.view, {
      pane: focus.label,
      prefix: focus.prefix,
      window: { at: leaves.indexOf(held.id) + 1, of: leaves.length },
      chapter: buffer.title,
      dirty: isDirty(buffer),
      detached: buffer.detached,
      message,
      announcement: announcements,
    });
    if (dirty !== reportedDirty) {
      reportedDirty = dirty;
      services.reportDirty?.(dirty);
    }
  }

  function announce(text: string): void {
    message = text;
    announcements += 1;
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

  // -------------------------------------------------------- the window layout

  /**
   * Draw the tree, and put the keyboard back where the chord promised.
   *
   * Leaf elements are moved rather than rebuilt, so no reshape destroys a view.
   * Two things follow from that and are done here rather than discovered: a
   * re-parented CodeMirror view has to be told to measure again, and
   * re-parenting the element that holds DOM focus blurs it in WebKit, so the
   * focused window is focused last. jsdom shows neither, which is why both are
   * in the manual checklist.
   */
  function drawGrid(): void {
    drawWindowGrid(editorPane, windowTree, {
      elementFor: (id) => windows.get(id)?.element ?? null,
      commit: (split, shares) => {
        windowTree = resize(windowTree, split, shares);
      },
      // The tree, read at the moment a drag begins rather than captured when
      // the divider was drawn: a release writes shares and draws nothing, so a
      // divider holding the node it was drawn from would start its next drag
      // from the division as it was two drags ago (`iss-2609120527457904`).
      sharesAt: (split) => splitAt(windowTree, split)?.shares ?? null,
    });
    for (const held of windows.values()) held.view.requestMeasure();
    // The focused window last, because re-parenting the element that holds DOM
    // focus blurs it. Its caret is written back into the DOM straight after:
    // the move collapsed the DOM selection, and CodeMirror reads the DOM on its
    // next flush, so without this the window Alice was typing in jumps to the
    // top of the chapter one frame after the split.
    const focused = windows.get(focus.window);
    if (focused) {
      focused.view.focus();
      refreshSelection(focused.view);
    }
  }

  /**
   * Record where a window leaves the buffer it is showing.
   *
   * Both the window-point and the buffer-point, which is Emacs's pair: the
   * window remembers where *it* was in this chapter, and the chapter remembers
   * where the last window to leave it left the caret. Where that was the last
   * window on the buffer, the text moves from the view into the buffer rather
   * than dying with the view — which is the whole of how `C-x 0` loses no
   * unsaved edit, and why it never asks whether anything may be discarded.
   */
  function leaveBuffer(held: EditorWindow): void {
    const buffer = bufferFor(held.buffer);
    const head = held.view.state.selection.main.head;
    held.points.set(held.buffer, head);
    buffer.lastPoint = head;
    buffer.windows.delete(held.id);
    // It no longer speaks for this buffer: the text it is about to be given is
    // another buffer's.
    if (buffer.lastChanged === held.id) buffer.lastChanged = null;
    if (buffer.windows.size === 0) buffer.restingText = documentText(held.view);
  }

  /**
   * Show one buffer in one window, leaving the buffer it was showing.
   *
   * `text` is the caller's, because where it comes from is the caller's
   * question: a chapter never seen is read from disk, a chapter another window
   * already shows is taken from that window, and a chapter whose last window
   * closed with unsaved edits in it is taken from where those edits rested. It
   * is read *before* the window joins, so a window can never read its own
   * outgoing text as its incoming buffer's.
   */
  function showBuffer(
    held: EditorWindow,
    path: string | null,
    text: string,
  ): void {
    leaveBuffer(held);
    held.buffer = path;
    const buffer = bufferFor(path);
    buffer.windows.add(held.id);
    // The text lives in a view again, so the buffer stops holding a copy.
    buffer.restingText = null;
    setDocument(held.view, text);
  }

  /** Close one window for good: its view, its element, its own memory. */
  function tearDown(id: WindowId): void {
    const held = windows.get(id);
    if (!held) return;
    leaveBuffer(held);
    windows.delete(id);
    held.view.destroy();
    held.element.remove();
  }

  /** `C-x 2` and `C-x 3`. */
  function divideHere(direction: "rows" | "columns"): void {
    const held = here();
    const rect = held.element.getBoundingClientRect();
    const extent = direction === "columns" ? rect.width : rect.height;
    if (!mayDivide(extent, direction)) {
      announce(
        direction === "columns" ? "Too narrow to divide" : "Too short to divide",
      );
      return;
    }
    const change = splitWindow(windowTree, held.id, direction, mintWindow);
    if (change.refusal !== null || change.opened === null) {
      if (change.refusal !== null) announce(change.refusal);
      return;
    }
    windowTree = change.tree;
    // The sibling shows the same chapter, taken from the buffer rather than
    // from disk, so the two windows agree from the first frame and the echo
    // has nothing to reconcile. Its caret starts where hers is, and the type
    // scale is Alice's eyes rather than the chapter's, so it carries across.
    const buffer = bufferFor(held.buffer);
    const made = makeWindow(change.opened, held.buffer, bufferText(buffer));
    setTextScale(made.view, textScaleStep(held.view));
    const head = held.view.state.selection.main.head;
    placeCursor(made.view, head);
    made.points.set(held.buffer, head);
    drawGrid();
    refresh();
  }

  /** `C-x 0`. */
  function closeHere(): void {
    const leaving = here().id;
    // Where the keyboard goes is read before the shape changes, because the
    // answer is a fact about the division being taken apart: the keyboard
    // follows the space, into the window that receives it. That is Emacs's own
    // rule and the neighbour the how-to page promises; the first leaf of the
    // whole tree is neither (`iss-2609120527458704`).
    const heir = heirOf(windowTree, leaving);
    const wasHere = focus.window === leaving;
    const change = closeWindow(windowTree, leaving);
    if (change.refusal !== null) {
      announce(change.refusal);
      return;
    }
    windowTree = change.tree;
    for (const id of change.closed) tearDown(id);
    // The keyboard was in the window that has gone, so the focus model has to
    // notice before the grid is drawn round it. `reconcile` is what answers for
    // a window closed while another pane holds the keyboard: nothing followed
    // the space, because the keyboard was not in the window that went.
    const landed = wasHere && heir !== null && focus.toWindow(heir);
    if (!landed) focus.reconcile();
    drawGrid();
    refresh();
  }

  /** `C-x 1`. */
  function closeOthersHere(): void {
    const change = closeOtherWindows(windowTree, here().id);
    if (change.refusal !== null) {
      announce(change.refusal);
      return;
    }
    windowTree = change.tree;
    for (const id of change.closed) tearDown(id);
    focus.reconcile();
    drawGrid();
    refresh();
  }

  /** What a resize chord says when there is no room left to take. */
  function atTheFloor(axis: "rows" | "columns", widen: boolean): string {
    if (axis === "rows") return "This window cannot get any taller";
    return widen
      ? "This window cannot get any wider"
      : "This window cannot get any narrower";
  }

  /**
   * `C-x {`, `C-x }` and `C-x ^`.
   *
   * The only rows in the table whose *success* says something. Every other row
   * is silent when it works and speaks when it refuses; a resize has no textual
   * consequence, so a reader working without sight would otherwise be unable to
   * tell a chord that landed from one that did not. `announceBriefly` is the
   * existing mechanism, and the type-scale rows already use it for exactly this
   * reason.
   */
  function resizeHere(axis: "rows" | "columns", widen: boolean): void {
    const held = here();
    const target: ResizeTarget | null = resizeTarget(
      windowTree,
      held.id,
      axis,
      widen,
    );
    if (target === null) {
      announce(
        axis === "columns"
          ? "No window beside this one"
          : "No window above or below this one",
      );
      return;
    }
    const split = splitAt(windowTree, target.split);
    if (split === null) return;
    // The one split the chord chose is measured, and its floor becomes a share.
    // An unmeasured extent means no clamp, for the reason `mayDivide` allows an
    // unmeasured division: nought is jsdom and the first frame, not a sliver.
    const floor = floorShare(measureSplit(editorPane, target.split, axis), axis);
    const next = stepShares(split.shares, target, RESIZE_STEP, floor);
    if (next === null) {
      announce(atTheFloor(axis, widen));
      return;
    }
    windowTree = resize(windowTree, target.split, next);
    drawGrid();
    const branch = widen ? target.grows : target.yields;
    const leaves = leafIds(windowTree);
    announceBriefly(
      `Window ${String(leaves.indexOf(held.id) + 1)} of ${String(leaves.length)}: ` +
        `${String(Math.round((next[branch] ?? 0) * 100))}%`,
    );
  }

  /**
   * Take a step of type scale, or say why the surface did not move.
   *
   * The new step is remembered for this machine only once it has been taken,
   * so a chord pressed at a bound writes nothing.
   */
  function scaleText(to: (step: number) => number): void {
    const step = to(textScaleStep(view()));
    const moved = setTextScale(view(), step);
    const now = textScaleStep(view());
    announceBriefly(textScaleMessage(now, moved));
    if (!moved) return;
    rememberScale(now);
  }

  /**
   * Remember the step this machine was left at, one write at a time.
   *
   * A chord is pressed faster than a file is written, and the write is a
   * read-modify-write of the whole settings file at the other end: two of them
   * in flight together can persist a step the surface has already left, and
   * can drop a change made beside them. So one write is in flight at a time
   * and the steps that arrive while it is are collapsed to the last of them —
   * which is the one the surface is actually showing. Nothing intermediate is
   * worth a file: the scale is a single number about a single surface.
   */
  function rememberScale(step: number): void {
    const write = services.writeTextScale;
    if (!write) return;
    pendingScale = step;
    if (scaleWriting) return;
    scaleWriting = true;
    void (async () => {
      try {
        while (pendingScale !== null) {
          const next = pendingScale;
          pendingScale = null;
          try {
            await write(next);
          } catch (error: unknown) {
            announce(String(error));
          }
        }
      } finally {
        scaleWriting = false;
      }
    })();
  }

  /**
   * A suffix for the announcement a document open or reload ends with, when
   * the bibliography `readSidebarData` just read could not be read at all —
   * empty otherwise, in the same shape `openFolder`'s own "entries
   * unreadable" suffix already takes.
   */
  function bibliographySuffix(): string {
    return bibliographyError === null ? "" : ` — bibliography unreadable: ${bibliographyError}`;
  }

  /**
   * Ask before another document throws every buffer away. True means carry on.
   *
   * `forgetDocument` clears every buffer, so the question is about every dirty
   * buffer and not only the focused window's: a chapter edited in a window that
   * does not hold the keyboard, and a chapter whose window closed with `C-x 0`
   * while its edits rested in its buffer, both go with the same gesture and
   * both have to be asked about (`iss-2609120527458643`). This is the widening
   * `quit` and `confirmClose` took when buffers started outliving windows, in
   * the one shape all three now share.
   */
  async function mayReplaceDocument(): Promise<boolean> {
    if (!anyDirty()) return true;
    return services.confirmDiscard(discardQuestion("Discard them?"));
  }

  /**
   * A different document is opening: every buffer goes, every window with it.
   *
   * The tree is deliberately *not* collapsed. The layout is Alice's, and a new
   * document is not a reason to rearrange her screen.
   */
  function forgetDocument(): void {
    loadToken += 1;
    openNodeId = null;
    openNodeBuffer = null;
    buffers.clear();
    const welcome = bufferFor(null);
    for (const held of windows.values()) {
      held.points.clear();
      held.buffer = null;
      welcome.windows.add(held.id);
      setDocument(held.view, WELCOME);
    }
    sidebar.select(null);
  }

  // -------------------------------------------------------- document session

  /** Every chapter's own outline, and the facts the sidebar reports beside it. */
  async function readSidebarData(next: DocumentTree): Promise<{
    outlines: Map<string, Outline>;
    facts: Map<string, ChapterFacts>;
    bibliography: Bibliography;
  }> {
    const chapters = chaptersOf(next.root);
    const outlines = new Map<string, Outline>();
    const facts = new Map<string, ChapterFacts>();
    bibliographyError = null;
    if (chapters.length === 0) return { outlines, facts, bibliography: EMPTY_BIBLIOGRAPHY };

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
    // A document with no bibliography at all is ordinary: every citation key
    // still resolves to nothing, which is exactly what an empty bibliography
    // reads back as, so a chapter that cites one is reported the same way a
    // chapter with a typo'd key against a real bibliography would be. A named
    // bibliography that exists but cannot be read is a different fact, and
    // stays a different one: it is the file's own error, not a fact about any
    // citation key, so `bibliographyError` carries it for a caller to
    // announce, and no key is badged unresolved on its account below.
    const bibliographyText = services.readBibliography
      ? await services.readBibliography().catch((error: unknown) => {
          bibliographyError = String(error);
          console.warn(`bibliography: ${bibliographyError}`);
          return null;
        })
      : null;
    const bibliography = parseBibliography(bibliographyText ?? "");
    // The once-only opening belongs to the document's own first chapter alone
    // (itd-2609051335518134, map #12); `chapters` is the same reading order
    // `publish/build.ts`'s own `tree.chapters` walks, so "first" agrees here.
    const firstChapterPath = chapters[0]?.path;
    for (const read of batch.reads) {
      const chapter = parseChapter(read.text);
      outlines.set(read.path, outlineOf(chapter));
      const unresolvedCitations =
        bibliographyError === null ? unresolvedCitationKeysIn(chapter, bibliography) : [];
      const unresolvedEggs = unresolvedEggsIn(chapter, read.path === firstChapterPath);
      if (unresolvedCitations.length > 0 || unresolvedEggs.length > 0) {
        facts.set(read.path, { unresolvedCitations, unresolvedEggs });
      }
    }
    for (const failure of batch.failures) {
      console.warn(`outline: ${failure}`);
    }
    return { outlines, facts, bibliography };
  }

  /** Draw a tree, with the outlines and the citation facts the sidebar needs. */
  async function showTree(next: DocumentTree): Promise<void> {
    tree = next;
    const data = await readSidebarData(next);
    if (destroyed) return;
    outlines = data.outlines;
    // The same bibliography the sidebar's facts were read against, so the
    // editor completes and hovers a citation against what the sidebar
    // reports about it (itd-2609051335502171).
    // Every window, because each one completes and hovers citations in its own
    // state and the sidebar's facts were read against this one bibliography.
    for (const held of windows.values()) setBibliography(held.view, data.bibliography);
    sidebar.show(tree, outlines, data.facts);
    sidebar.select(here().buffer, openNodeId);
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

  /**
   * The text a window opening a known buffer takes, or null to read from disk.
   *
   * A buffer some window already shows must be taken from that window, or the
   * two windows would start on different texts and the echo would have nothing
   * to reconcile them from. A buffer whose last window closed with unsaved
   * edits in it must be taken from where those edits rest, which is criterion
   * 14: the chapter's state outlives the window that showed it. Anything else
   * is read again, so a chapter changed on disk since arrives.
   */
  function restingTextOf(buffer: ChapterBuffer | undefined): string | null {
    if (!buffer) return null;
    for (const id of buffer.windows) {
      const held = windows.get(id);
      if (held) return documentText(held.view);
    }
    if (buffer.restingText !== null && buffer.restingText !== buffer.savedText) {
      return buffer.restingText;
    }
    return null;
  }

  /**
   * Reconcile one buffer with its file, and say what happened, or nothing.
   *
   * The three cases the reload has always had, applied per buffer: unchanged on
   * disk, left alone and silent; changed with a clean buffer, taken and said;
   * changed with a dirty buffer, the author asked and neither text written
   * until she answers.
   */
  async function reloadBuffer(buffer: ChapterBuffer): Promise<string> {
    const path = buffer.path;
    if (path === null) return "";
    const what = buffer.title ?? "The chapter";
    if (!chapterAt(path)) {
      buffer.detached = true;
      return `${what} is no longer on disk`;
    }
    buffer.detached = false;
    let onDisk: string;
    try {
      onDisk = await services.readChapter(path);
    } catch (error) {
      return String(error);
    }
    if (onDisk === buffer.savedText) return "";
    const take = (): void => {
      buffer.savedText = onDisk;
      buffer.restingText = null;
      for (const id of buffer.windows) {
        const held = windows.get(id);
        if (held) setDocument(held.view, onDisk);
      }
      if (buffer.windows.size === 0) buffer.restingText = onDisk;
    };
    if (!isDirty(buffer)) {
      take();
      return `${what} changed on disk`;
    }
    const takeDisk = await services.confirmDiscard(
      `${what} changed on disk and has unsaved edits. Take the version on disk?`,
    );
    if (takeDisk) {
      take();
      return "Took the version on disk";
    }
    // Neither text is written: the buffer keeps the author's edits and
    // `savedText` keeps what she last read, so the buffer stays dirty and the
    // next save is hers to make deliberately.
    return "Kept your edits; nothing was written";
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

  /**
   * What the quit and close questions say about unsaved work.
   *
   * The chapter by name when one buffer is dirty, and how many when more than
   * one is — because with buffers outliving windows there can be several, and
   * naming one of them would be the question telling half the truth.
   */
  function unsavedQuestion(): string {
    const titles = dirtyTitles();
    if (titles.length === 1) {
      return `${titles[0] ?? "The chapter"} has unsaved edits.`;
    }
    return `${String(titles.length)} chapters have unsaved edits.`;
  }

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
    if (!anyDirty()) {
      leave();
      return;
    }
    const keep = (): void => {
      view().focus();
      announce("Kept your edits");
    };
    openListOverlay<ListEntry>({
      host: overlayHost,
      className: "confirm",
      label: "Quit Editor",
      paneLabel: "Quit",
      rowKey: "choice",
      question: unsavedQuestion(),
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

  /**
   * `C-x C-k`: close the chapter, Emacs's `kill-buffer` for this book model.
   *
   * The same shape `quit` above takes: with nothing unsaved it returns
   * straight to the welcome text; with unsaved edits it asks in the overlay
   * host, and `C-g` or Escape put Alice back in the text with her edits
   * intact. Unlike `quit`, closing never leaves the application — the
   * sidebar and the folder are exactly where they were.
   *
   * It is `kill-buffer` and not "close this window", so the buffer itself goes
   * and every window showing it goes back to the welcome text. That is the one
   * gesture in the application that genuinely discards a chapter's unsaved
   * edits, which is why it is the one that asks.
   */
  function closeChapter(): void {
    const buffer = bufferHere();
    if (buffer.path === null) {
      announce("No chapter is open");
      return;
    }
    const path = buffer.path;
    const title = buffer.title ?? "The chapter";
    const doClose = (): void => {
      loadToken += 1;
      openNodeId = null;
      openNodeBuffer = null;
      // Read before any window joins, so no window reads its own outgoing
      // text as the welcome buffer's.
      const welcome = bufferText(bufferFor(null));
      for (const id of [...buffer.windows]) {
        const other = windows.get(id);
        if (other) showBuffer(other, null, welcome);
      }
      buffers.delete(path);
      for (const other of windows.values()) other.points.delete(path);
      sidebar.select(null);
      announce(`Closed ${title}`);
    };
    if (!isDirty(buffer)) {
      doClose();
      return;
    }
    const keep = (): void => {
      view().focus();
      announce("Kept your edits");
    };
    openListOverlay<ListEntry>({
      host: overlayHost,
      className: "confirm",
      label: "Close the chapter",
      paneLabel: "Close",
      rowKey: "choice",
      question: `${title} has unsaved edits.`,
      entries: () => CLOSE_CHOICES,
      onChoose: (choice) => {
        if (choice.id === "close") doClose();
        else keep();
      },
      onClose: (chosen) => {
        if (!chosen) keep();
      },
    });
  }

  /**
   * `C-x b`: switch chapter by name, with completion.
   *
   * Reaches the same `app.chapters`/`app.openChapter` the sidebar already
   * uses (`itd-2609051335399446`), through the one filterable-list overlay
   * `outline-commands.ts` shares with the command palette.
   */
  function switchChapter(): void {
    if (tree === null) {
      announce("No document is open");
      return;
    }
    openSwitchChapter(
      app.chapters,
      (path) => {
        const chapter = app.chapters.find((candidate) => candidate.path === path);
        if (chapter) void app.openChapter(chapter);
      },
      { host: overlayHost },
    );
  }

  /**
   * `C-x C-o`: open a file or a folder Alice picks through the shell's own
   * dialog (itd-2609061509393380, map #35). A native panel offers files or
   * folders, never both, so this asks which kind of thing first, on the
   * same list-overlay the quit and close prompts already use.
   */
  function openSource(): void {
    if (
      !services.pickDocumentFolder ||
      !services.pickDocumentFile ||
      !services.openDocumentSource
    ) {
      announce("Opening a file or a folder needs the desktop shell");
      return;
    }
    openListOverlay<ListEntry>({
      host: overlayHost,
      className: "confirm",
      label: "Open",
      paneLabel: "Open",
      rowKey: "choice",
      question: "Open a folder or a single file?",
      entries: () => OPEN_SOURCE_CHOICES,
      onChoose: (choice) => {
        void pickAndOpenSource(choice.id === "file");
      },
    });
  }

  /**
   * The dialog `openSource` chose, then the result `services.openDocumentSource`
   * hands back — shown the same way `openFolder` already shows a walked
   * tree, with the discard guard run after the dialog closes and before the
   * tree replaces what is on screen, the order `promptForFolder` already
   * keeps.
   */
  async function pickAndOpenSource(asFile: boolean): Promise<void> {
    try {
      const picked = asFile
        ? await services.pickDocumentFile?.()
        : await services.pickDocumentFolder?.();
      if (!picked) return; // the author cancelled the dialog
      // The discard guard runs before the nonce is claimed: declining leaves
      // the shell's document root and watcher untouched, rather than
      // swapping them out from under the chapter still on screen
      // (`iss-2609070642208293`). The nonce stays valid for its own
      // lifetime regardless of how long the confirm dialog takes.
      if (!(await mayReplaceDocument())) {
        announce("Kept the open chapter");
        return;
      }
      const outcome = await services.openDocumentSource?.(picked.nonce);
      if (!outcome) return;
      forgetDocument();
      await showTree(outcome.tree);
      for (const failure of outcome.tree.failures) {
        console.warn(`open ${picked.name}: ${failure}`);
      }
      const title = await documentTitle(outcome.tree.root.title);
      const chapters = chaptersOf(outcome.tree.root);
      if (chapters.length === 0) {
        announce(`${title} holds no Markdown chapters`);
        return;
      }
      const selected =
        outcome.selectedChapter === null
          ? undefined
          : chapters.find((chapter) => chapter.path === outcome.selectedChapter);
      if (selected) {
        await app.openChapter(selected);
        announce(`Opened ${selected.title}${bibliographySuffix()}`);
      } else {
        announce(`Opened ${title}${bibliographySuffix()}`);
      }
    } catch (error) {
      announce(String(error));
    }
  }

  const commands: EditorCommands = {
    "save-chapter": () => {
      void app.save();
    },
    "open-folder": () => {
      void app.promptForFolder();
    },
    "open-file-or-folder": () => {
      openSource();
    },
    "toggle-key-log": () => {
      keyLog.toggle();
    },
    "keys-panel": () => {
      openKeysPanel(overlayHost);
    },
    "insert-palette": () => {
      openPalette(view(), { host: overlayHost, announce });
    },
    // From the text. A pane the editing surface cannot hear reads the same
    // row for itself, in `src/focus.ts`, and both reach this one command.
    "toggle-sidebar": () => {
      toggleSidebar();
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

    // The window vocabulary (`itd-2609081931493520`). Four rows divide and
    // undivide the editing area; three resize the window holding the keyboard.
    // Each acts on `here()`, which is the one question the whole registry asks.
    "split-window-below": () => {
      divideHere("rows");
    },
    "split-window-right": () => {
      divideHere("columns");
    },
    "delete-window": () => {
      closeHere();
    },
    "delete-other-windows": () => {
      closeOthersHere();
    },
    "shrink-window-horizontally": () => {
      resizeHere("columns", false);
    },
    "enlarge-window-horizontally": () => {
      resizeHere("columns", true);
    },
    "enlarge-window": () => {
      resizeHere("rows", true);
    },

    // The prose vocabulary. Each is a function of the view in `src/prose.ts`;
    // what the application adds is the document's fill column, the modeline
    // the refusals are announced in, and the host the two prompts mount in.
    "fill-paragraph": () => {
      prose(() => fillParagraph(view(), proseOptions()));
    },
    "transpose-words": () => {
      prose(() => transposeWords(view()));
    },
    "transpose-lines": () => {
      prose(() => transposeLines(view()));
    },
    "capitalize-word": () => {
      prose(() => capitalizeWord(view()));
    },
    "backward-sentence": () => {
      prose(() => backwardSentence(view(), proseOptions()));
    },
    "forward-sentence": () => {
      prose(() => forwardSentence(view(), proseOptions()));
    },
    "backward-paragraph": () => {
      prose(() => backwardParagraph(view()));
    },
    "forward-paragraph": () => {
      prose(() => forwardParagraph(view()));
    },
    "delete-indentation": () => {
      prose(() => deleteIndentation(view()));
    },
    "just-one-space": () => {
      prose(() => justOneSpace(view()));
    },
    "delete-horizontal-space": () => {
      prose(() => deleteHorizontalSpace(view()));
    },
    "move-to-window-line": () => {
      prose(() => moveToWindowLine(view()));
    },
    "dabbrev-expand": () => {
      prose(() => dabbrevExpand(view()));
    },

    // The region case changes. The mechanism is the Emacs layer's, in
    // `src/emacs.ts`; what the application adds is the one thing the keymap
    // cannot say for itself — that there was no region to change
    // (`iss-2609091920011632`) — announced through the same `prose` wrapper
    // every other refusal over the text goes out on. One helper, both
    // directions, so the refusal is written once.
    "upcase-region": () => {
      prose(() => changeCaseRegion(view(), 1));
    },
    "downcase-region": () => {
      prose(() => changeCaseRegion(view(), -1));
    },

    // The table-alignment mode switch (`itd-2609061653559060`). It writes a
    // boolean and says which mode Alice is now in; it dispatches nothing
    // against the document, so turning alignment back on leaves every table
    // exactly as it is until the next edit inside one. Nothing persists it:
    // the app starts with alignment on, every time (cond-2609091900422614).
    "toggle-table-alignment": () => {
      announce(
        setTableAlignment(!tableAlignmentOn())
          ? "Table alignment on"
          : "Table alignment off",
      );
    },

    "zap-to-char": () => {
      zapToChar(view(), { host: overlayHost, announce });
    },
    "describe-key": () => {
      describeKey({ host: overlayHost, announce });
    },
    // The prefix overlay (`itd-2609091722353594`). The prefix is handed over
    // by whichever reader caught the `C-h`: the editing surface's guard in
    // `src/emacs.ts` gives the chain it was holding, and the pane reader in
    // `src/focus.ts` reaches this same module through its own hook, with its
    // own rows and its own dispatch. Two readers, one answer.
    //
    // With no prefix — the palette is the one route that reaches the row that
    // way, over a text with nothing half-typed — the row says so rather than
    // opening an overlay over nothing.
    "prefix-help": (prefix) => {
      if (prefix === undefined || prefix === "") {
        announce(prefixHelpNeedsAPrefix());
        return;
      }
      openPrefixHelp({
        prefix,
        // The rows the text can actually run. Listing one it cannot would
        // promise a chord that does nothing.
        ids: BINDINGS.filter((binding) => scopeOf(binding) === "editor").map(
          (binding) => binding.id,
        ),
        host: overlayHost,
        announce,
        run: (id) => {
          // An application row announces its own refusal and then returns
          // null, so announcing the empty string here would wipe what the row
          // just said (`iss-2609100543005984`). `src/command-palette.ts`
          // guards the same call the same way, and for the same reason.
          const said = runBinding(view(), id);
          if (said !== null && said !== "") announce(said);
        },
      });
    },
    "command-palette": () => {
      openCommandPalette(view(), { host: overlayHost, announce });
    },
    quit: () => {
      quit();
    },

    // The outline vocabulary. Each is a function of the view in
    // `src/outline-commands.ts`; switch-chapter, close-chapter and occur are
    // wired here directly, the same reason `quit` is: they need the
    // application's chapter list, its dirty state, or the overlay host.
    "outline-next-heading": () => {
      prose(() => nextHeading(view()));
    },
    "outline-previous-heading": () => {
      prose(() => previousHeading(view()));
    },
    "outline-forward-same-level": () => {
      prose(() => forwardSameLevelHeading(view()));
    },
    "outline-backward-same-level": () => {
      prose(() => backwardSameLevelHeading(view()));
    },
    "outline-up-heading": () => {
      prose(() => upHeading(view()));
    },
    "outline-toggle-fold": () => {
      prose(() => toggleHeadingFold(view()));
    },
    "outline-cycle": () => {
      prose(() => cycleOutline(view()));
    },
    "outline-promote": () => {
      prose(() => promoteHeading(view()));
    },
    "outline-demote": () => {
      prose(() => demoteHeading(view()));
    },
    "outline-move-up": () => {
      prose(() => moveHeadingUp(view()));
    },
    "outline-move-down": () => {
      prose(() => moveHeadingDown(view()));
    },
    "outline-bold-region": () => {
      prose(() => boldRegion(view()));
    },
    "outline-italic-region": () => {
      prose(() => italicRegion(view()));
    },
    "outline-insert-link": () => {
      prose(() => insertLink(view()));
    },
    "outline-insert-image": () => {
      prose(() => insertImage(view()));
    },
    "outline-switch-chapter": () => {
      switchChapter();
    },
    "outline-close-chapter": () => {
      closeChapter();
    },
    "outline-narrow": () => {
      prose(() => narrowToSection(view()));
    },
    "outline-widen": () => {
      prose(() => widenSection(view()));
    },
    "outline-occur": () => {
      openOccur(view(), { host: overlayHost });
    },
    "query-replace-regex": () => {
      queryReplaceRegex(view());
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
    sidebar,
    modeline,
    keyLog,
    drop,
    focus,

    // A getter, and read at the moment it is needed rather than held: the
    // editing surface is several views now, and which one the application
    // means is always the one holding the keyboard.
    get view(): EditorView {
      return view();
    },

    get dirty(): boolean {
      return anyDirty();
    },

    get detached(): boolean {
      return bufferHere().detached;
    },

    get chapterPath(): string | null {
      return here().buffer;
    },

    editorHost: editorPane,

    windowAt(x: number, y: number) {
      const pair = (held: EditorWindow): {
        readonly view: EditorView;
        readonly chapter: string | null;
      } => ({ view: held.view, chapter: held.buffer });
      let unmeasured: EditorWindow | null = null;
      for (const id of leafIds(windowTree)) {
        const held = windows.get(id);
        if (!held) continue;
        const rect = held.element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          unmeasured ??= held;
          continue;
        }
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return pair(held);
        }
      }
      // Nothing measured at all: jsdom, and the frame before layout runs. The
      // window holding the keyboard is the honest answer, and with one window
      // it is the answer one window always gave.
      return unmeasured === null ? null : pair(here());
    },

    get documentRoot(): string | null {
      return tree === null ? null : tree.root.path;
    },

    get chapters(): readonly Chapter[] {
      return tree === null ? [] : chaptersOf(tree.root);
    },

    announce,

    async openFolder(path: string): Promise<void> {
      if (!(await mayReplaceDocument())) {
        announce("Kept the open chapter");
        return;
      }
      try {
        const next = await services.openFolder(path);
        // Every chapter that was open belongs to the document being replaced.
        // Holding on to a path would aim the next save at a file nothing on
        // screen shows any more, and a remembered position at a path that
        // happens to recur in the new document. The layout survives: it is
        // Alice's, and a new document is not a reason to rearrange her screen.
        forgetDocument();
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
          announce(`${title} holds no Markdown chapters${unreadable}${bibliographySuffix()}`);
          return;
        }
        announce(`Opened ${title}${unreadable}${bibliographySuffix()}`);
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
     *
     * The three cases apply once per open buffer rather than once for one open
     * chapter, because several windows can be on several chapters. The
     * announcement stays the focused window's buffer's, with a count when more
     * than one changed.
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
      if (destroyed) return;
      sidebar.setExpansion(expansion);
      sidebar.select(here().buffer, openNodeId);
      // The document's own settings are read again, because a reload is what
      // an edit to `document.yaml` arrives as.
      await documentTitle(next.root.title);
      // Said now, because the reload's own chapter-comparison branches below
      // may have nothing else to say — a clean, unchanged chapter reloads
      // silently otherwise — and a bibliography that stopped reading is worth
      // more than silence.
      if (bibliographyError !== null) {
        announce(`Bibliography unreadable: ${bibliographyError}`);
      }

      const focusedPath = here().buffer;
      let changedCount = 0;
      let focusedSaid = "";
      for (const buffer of [...buffers.values()]) {
        if (buffer.path === null) continue;
        const said = await reloadBuffer(buffer);
        if (said !== "") changedCount += 1;
        if (buffer.path === focusedPath) focusedSaid = said;
      }
      if (changedCount === 0) {
        refresh();
        return;
      }
      const others = changedCount - (focusedSaid === "" ? 0 : 1);
      const count = others > 0 ? ` — and ${String(others)} more` : "";
      announce(
        focusedSaid !== ""
          ? `${focusedSaid}${count}`
          : `${String(changedCount)} chapters changed on disk`,
      );
    },

    async openChapter(chapter: Chapter, node?: OutlineNode): Promise<void> {
      /**
       * Whether this window is still the one it was.
       *
       * A chapter is opened into the window that asked for it, and two things
       * can happen while the read is in flight: the application can be torn
       * down, and the window itself can be closed by `C-x 0` or `C-x 1`. A
       * window whose record has gone must not be given a buffer — adding its id
       * to `buffer.windows` would leave a phantom there that `leaveBuffer` never
       * takes out, so the buffer would believe a window still held its text and
       * would never rest it: the edits in it would stop counting as unsaved and
       * quitting would not warn about them.
       */
      const alive = (window: EditorWindow): boolean =>
        !destroyed && windows.get(window.id) === window;

      const held = here();
      const sameChapter = chapter.path === held.buffer;
      // Switching this window to another chapter asks nothing: the chapter it
      // leaves keeps its buffer, edits and all, and the modeline keeps marking
      // it unsaved, so there is no loss to ask about. The gestures that do
      // discard — quitting, replacing the document, `C-x C-k` — each ask for
      // themselves (`iss-2609111123510084`, settled 2026-09-15).
      if (sameChapter && node) {
        // Already open: moving to one of its headings is not a load, and
        // reloading would throw the author's edits away.
        openNodeId = node.id;
        openNodeBuffer = chapter.path;
        sidebar.select(chapter.path, node.id);
        revealLine(held.view, node.line);
        held.view.focus();
        refresh();
        return;
      }
      loadToken += 1;
      const token = loadToken;
      try {
        // A chapter another window already shows, or one whose last window
        // closed with unsaved edits in it, is taken from its buffer; anything
        // else is read from disk, so a chapter changed elsewhere arrives.
        const resting = restingTextOf(buffers.get(chapter.path));
        const text = resting ?? (await services.readChapter(chapter.path));
        if (token !== loadToken || !alive(held)) return;
        const buffer = bufferFor(chapter.path);
        if (resting === null) buffer.savedText = text;
        buffer.title = chapter.title;
        buffer.detached = false;
        openNodeId = node?.id ?? null;
        openNodeBuffer = node ? chapter.path : null;
        showBuffer(held, chapter.path, text);
        sidebar.select(chapter.path, openNodeId);
        // A heading, where one was named, outranks everything. Otherwise this
        // window's own remembered place in this chapter, then the chapter's own
        // last-known place, then the start: Emacs's window-point against
        // buffer-point (`cond-2609111105374579`).
        if (node) {
          revealLine(held.view, node.line);
        } else {
          const point = held.points.get(chapter.path) ?? buffer.lastPoint;
          if (point > 0) placeCursor(held.view, point);
        }
        announce("");
      } catch (error) {
        if (token !== loadToken) return;
        announce(String(error));
      }
    },

    /**
     * Write the focused window's chapter, to that chapter's own path, and
     * nothing else.
     *
     * Three lines, and the criterion the intent calls falsifiable in the worst
     * way a text editor can be: with three windows on three chapters, `C-x C-s`
     * writes one file and it is the one the keyboard is in.
     */
    async save(): Promise<void> {
      const buffer = bufferHere();
      if (buffer.path === null) {
        announce("No chapter to save");
        return;
      }
      if (buffer.detached) {
        announce(`${buffer.path} is no longer on disk; nothing was written`);
        return;
      }
      const path = buffer.path;
      const text = bufferText(buffer);
      try {
        await services.writeChapter(path, text);
        if (destroyed) return;
        buffer.savedText = text;
        announce(`Wrote ${buffer.title ?? path}`);
      } catch (error) {
        announce(String(error));
      }
    },

    async confirmClose(): Promise<boolean> {
      if (!anyDirty()) return true;
      return services.confirmDiscard(discardQuestion("Close anyway?"));
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
      destroyed = true;
      for (const held of windows.values()) held.view.destroy();
      // The records are kept rather than cleared: a read or a walk still in
      // flight resolves after this and asks which window holds the keyboard,
      // and a torn-down application has to have an answer for it.
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
        for (const held of windows.values()) setTextScale(held.view, step);
      })
      .catch((error: unknown) => {
        console.warn(`text scale: ${String(error)}`);
      });
  }

  sidebar.show(null);
  drawGrid();
  refresh();
  view().focus();
  return app;
}
