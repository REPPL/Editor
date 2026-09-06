/**
 * Starting a document that has nothing written yet (`itd-2609051402191319`).
 *
 * Two calls to the shell, on the trust model `src/export/services.ts` uses for
 * an export's destination: the folder dialog is opened by the shell, and what
 * crosses back into the page is a nonce it minted for the folder Alice
 * chose — never the path itself — plus the folder's own name for the panel to
 * show her. `createNewDocument` spends that nonce once. Nothing here parses or
 * writes a file directly; `src-tauri/src/new_document.rs` is the one writer.
 */

import { invoke } from "@tauri-apps/api/core";

import { inShell } from "./doctree";

/** The folder dialog's answer: a nonce, and the folder's own name. */
export interface ChosenNewDocumentFolder {
  readonly nonce: string;
  readonly name: string;
}

/** What one creation wrote: the document root and the chapter just made. */
export interface NewDocumentOutcome {
  readonly root: string;
  readonly chapter: string;
}

function requireShell(action: string): void {
  if (!inShell()) {
    throw new Error(`${action} needs the desktop shell; run \`npm run tauri dev\``);
  }
}

/**
 * Ask the author where to create the document.
 *
 * `null` when she cancels the dialog, which is not a refusal: the panel stays
 * open with whatever she had already typed.
 */
export async function chooseNewDocumentFolder(
  defaultPath: string | null,
): Promise<ChosenNewDocumentFolder | null> {
  requireShell("Choosing a folder");
  return invoke<ChosenNewDocumentFolder | null>("choose_new_document_folder", {
    defaultPath,
  });
}

/** Write the new document into the folder the nonce claims. */
export async function createNewDocument(
  title: string,
  destinationNonce: string,
): Promise<NewDocumentOutcome> {
  requireShell("Creating a document");
  return invoke<NewDocumentOutcome>("create_new_document", {
    title,
    destinationNonce,
  });
}
