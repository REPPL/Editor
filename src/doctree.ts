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
  /** The file's size in bytes, as the walk found it. */
  readonly bytes: number;
  /** Last modification in milliseconds, or null where none is recorded. */
  readonly modified: number | null;
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

/**
 * What `document.yaml` says about the document as a whole.
 *
 * `05-internals.md` section 1: everything belonging to the whole document
 * lives in that one file, so this is the one shape that carries it. The shell
 * reads it; nothing in the frontend parses YAML.
 */
export interface DocumentMetadata {
  readonly id: string | null;
  readonly title: string | null;
  readonly subtitle: string | null;
  readonly author: string | null;
  readonly affiliation: string | null;
  readonly abstract: string | null;
  readonly theme: string | null;
  readonly variants: readonly string[];
  readonly default_variant: string | null;
  readonly variant_tokens: Readonly<Record<string, string>>;
  readonly bibliography: string | null;
  readonly citation_style: string | null;
  readonly asset_threshold_bytes: number | null;
  /** Whether the document folder carries a `document.yaml` at all. */
  readonly present: boolean;
}

/** One chapter's text, from a batch read. */
export interface ChapterRead {
  readonly path: string;
  readonly text: string;
}

/**
 * What a batch read found, and what it could not.
 *
 * A reload draws the whole tree, so it reads every chapter in one round trip
 * rather than one per chapter. An unreadable chapter is a line in `failures`,
 * never a failed batch.
 */
export interface ChapterBatch {
  readonly reads: readonly ChapterRead[];
  readonly failures: readonly string[];
}

/**
 * A drop the shell observed, named by a nonce.
 *
 * The paths themselves never cross into the web view and are never accepted
 * from it: the shell keeps them under a nonce that expires, and a command that
 * acts on a drop names the nonce. A script running in the web view can
 * therefore ask Editor to act on a file the author actually dropped, and on
 * nothing else.
 */
export interface DropPayload {
  readonly nonce: string;
  /** Where the pointer was, in logical (CSS) pixels. */
  readonly x: number;
  readonly y: number;
  /** How many files the drop carried. */
  readonly count: number;
}

/** The event the shell emits when the author drops files on the window. */
export const DROPPED_EVENT = "document://dropped";

/** The event the shell emits when the open folder changed underneath us. */
export const CHANGED_EVENT = "document://changed";

/** What a dropped file turned out to be. */
export type AssetKind = "image" | "video" | "file";

/** Whether the bytes were copied in or left where they are. */
export type AssetMode = "copied" | "referenced";

/** One file the shell took into the document. */
export interface DropOutcome {
  readonly kind: AssetKind;
  /** Percent-encoded, relative to the chapter. Never an operating-system path. */
  readonly reference: string;
  readonly id: string;
  readonly bytes: number;
  readonly mode: AssetMode;
  readonly converted_from: string | null;
  readonly deduplicated: boolean;
}

/** One file the shell would not take, and why. */
export interface DropRefusal {
  readonly name: string;
  readonly reason: string;
}

/** What one drop produced. One bad file does not cost the author the others. */
export interface DropReport {
  readonly accepted: readonly DropOutcome[];
  readonly refused: readonly DropRefusal[];
}

/** What a pasted or dragged address turned out to be. */
export interface PasteOutcome {
  /** `video` for a direct media address, `other` for everything else. */
  readonly kind: string;
  /** The role a video block names it under: `remote`, or nothing. */
  readonly role: string | null;
  /** The address, verbatim. Nothing was fetched. */
  readonly reference: string;
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

/** Read the open document's `document.yaml`. */
export async function readDocumentMetadata(): Promise<DocumentMetadata> {
  requireShell("Reading the document metadata");
  return invoke<DocumentMetadata>("read_document_metadata");
}

/** Read many Chapters' Markdown in one round trip. */
export async function readChapters(
  paths: readonly string[],
): Promise<ChapterBatch> {
  requireShell("Reading the chapters");
  return invoke<ChapterBatch>("read_chapters", { paths: [...paths] });
}

/**
 * Add a dropped Markdown file to a Part as its next chapter.
 *
 * The source is named by the drop's nonce, not by a path: the web view never
 * hands the shell a path to copy from.
 */
export async function addChapter(
  part: string,
  nonce: string,
): Promise<readonly Chapter[]> {
  requireShell("Adding a chapter");
  return invoke<Chapter[]>("add_chapter", { part, nonce });
}

/**
 * Take the files of one drop into the chapter's Part.
 *
 * Named by the drop's nonce, never by a path: the shell holds what the author
 * dropped and refuses a nonce it did not mint, or one that has expired.
 */
export async function dropOnChapter(
  chapter: string,
  nonce: string,
): Promise<DropReport> {
  requireShell("Dropping a file");
  return invoke<DropReport>("drop_on_chapter", { chapter, nonce });
}

/**
 * What a pasted or dragged address should become. Nothing is written, and
 * nothing is fetched: the address is read, not probed.
 */
export async function pasteReference(
  chapter: string,
  text: string,
): Promise<PasteOutcome> {
  requireShell("Pasting an address");
  return invoke<PasteOutcome>("paste_reference", { chapter, text });
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

/**
 * The chapter waiting to be presented, as the buffer had it.
 *
 * The text, not the file: an unsaved edit presents.
 */
export interface DeckSource {
  readonly text: string;
  readonly chapterPath: string;
  readonly chapterTitle: string;
}

/** One image the shell read, as bytes rather than as a path. */
export interface AssetBytes {
  readonly mime: string;
  readonly base64: string;
}

/** The event the shell emits when a new deck is waiting to be collected. */
export const DECK_EVENT = "present://deck";

/**
 * Present a chapter: hold its text, and open or focus the present window.
 *
 * Nothing is written. The deck is built in the present window from this text
 * and exists only while that window is open.
 */
export async function presentChapter(
  text: string,
  chapterPath: string,
): Promise<void> {
  requireShell("Presenting a chapter");
  return invoke<void>("present_chapter", { text, chapterPath });
}

/** The deck the shell is holding, for the present window to build. */
export async function pendingDeck(): Promise<DeckSource> {
  requireShell("Reading the pending deck");
  return invoke<DeckSource>("pending_deck");
}

/**
 * Read one image a chapter refers to.
 *
 * The reference is the author's, relative to their chapter: the web view never
 * hands the shell a path of its own choosing.
 */
export async function readAsset(
  chapterPath: string,
  path: string,
): Promise<AssetBytes> {
  requireShell("Reading an image");
  return invoke<AssetBytes>("read_asset", { chapterPath, path });
}
