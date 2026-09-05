/**
 * The document tree, and the Rust commands that produce it.
 *
 * A document is a folder: a Part is a folder, a Chapter is a Markdown file,
 * and a numeric filename prefix gives the order. The shapes here mirror the
 * ones the shell serializes.
 */

import { invoke } from "@tauri-apps/api/core";

/** A Markdown file inside a Part. */
export interface Chapter {
  readonly name: string;
  readonly title: string;
  readonly path: string;
  readonly order: number | null;
}

/** A folder: the document root, or a Part inside it. */
export interface Part {
  readonly name: string;
  readonly title: string;
  readonly path: string;
  readonly order: number | null;
  readonly parts: readonly Part[];
  readonly chapters: readonly Chapter[];
  /** Whether the walk stopped here at its depth limit, leaving this unread. */
  readonly truncated: boolean;
}

/** One opened document. */
export interface DocumentTree {
  readonly root: Part;
  /**
   * Entries the walk could not read, one message each. A tree with failures
   * is a partial tree, not a failed one: the rest is usable and the count is
   * reported so nothing goes missing in silence.
   */
  readonly failures: readonly string[];
}

/** Whether the page is running inside the Tauri shell. */
export function inShell(): boolean {
  return "__TAURI_INTERNALS__" in globalThis;
}

function requireShell(action: string): void {
  if (!inShell()) {
    throw new Error(`${action} needs the desktop shell; run \`npm run tauri dev\``);
  }
}

/** Walk a document folder. */
export async function openFolder(path: string): Promise<DocumentTree> {
  requireShell("Opening a folder");
  return invoke<DocumentTree>("open_folder", { path });
}

/** Read one Chapter's Markdown. */
export async function readChapter(path: string): Promise<string> {
  requireShell("Reading a chapter");
  return invoke<string>("read_chapter", { path });
}

/** Write one Chapter's Markdown. */
export async function writeChapter(path: string, text: string): Promise<void> {
  requireShell("Saving a chapter");
  return invoke<void>("write_chapter", { path, text });
}

/**
 * Tell the shell whether the open chapter has unsaved edits.
 *
 * The shell holds a close request back while this is true, because the close
 * arrives in Rust before the page is consulted.
 */
export async function setDirty(dirty: boolean): Promise<void> {
  if (!inShell()) return;
  return invoke<void>("set_dirty", { dirty });
}
