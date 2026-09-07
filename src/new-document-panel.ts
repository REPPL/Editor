/**
 * The New document panel (`itd-2609051402191319`, map #29).
 *
 * A title, a folder chosen through the shell's own dialog, and a
 * confirmation — nothing else. The panel writes nothing on its own: it asks
 * `services.chooseFolder` for the nonce the shell minted for the folder Alice
 * picked, holds it until she presses Create, and then hands the title and the
 * nonce to `services.createDocument`, which is the one call that writes
 * anything. Cancelling the dialog, or `C-g` and Escape on the panel itself,
 * leaves the disk exactly as it was.
 */

import { focusFirstControl, type PanelFocus } from "./focus";

/** The chord that opens the panel. */
export const NEW_DOCUMENT_OPEN_CHORD = "C-x C-n";

/** The binding-table action id. */
export const NEW_DOCUMENT_OPEN_ACTION = "new-document-open";

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

/** What the panel needs from the world outside the page. */
export interface NewDocumentServices {
  /** Ask the user for a folder; null when they cancel the dialog. */
  chooseFolder(defaultPath: string | null): Promise<ChosenNewDocumentFolder | null>;
  /** Write the document. The one call in this module that writes anything. */
  createDocument(title: string, destinationNonce: string): Promise<NewDocumentOutcome>;
}

/** What the panel does once a document has actually been created. */
export interface NewDocumentPanelOptions {
  /** Show the folder Editor just wrote, and open its one chapter. */
  onCreated?(outcome: NewDocumentOutcome): void | Promise<void>;
}

/** The mounted panel. */
export interface NewDocumentPanel {
  readonly element: HTMLElement;
  readonly isOpen: boolean;
  open(): Promise<void>;
  close(): void;
  destroy(): void;
}

/** What a panel needs from the application to be reachable. */
export interface NewDocumentHost {
  registerPanel(name: string, element: HTMLElement, focus?: PanelFocus): void;
  registerCommand(bindingId: string, run: () => void): void;
}

function field(label: string, name: string): { row: HTMLElement; input: HTMLInputElement } {
  const row = document.createElement("label");
  row.className = "new-document-field";
  const caption = document.createElement("span");
  caption.className = "new-document-label";
  caption.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.name = name;
  input.className = `new-document-input new-document-${name}`;
  row.append(caption, input);
  return { row, input };
}

function button(label: string, action: () => void, className: string): HTMLButtonElement {
  const control = document.createElement("button");
  control.type = "button";
  control.textContent = label;
  control.className = className;
  control.addEventListener("click", action);
  return control;
}

/**
 * Build the panel.
 *
 * It is not in the page until it is opened, and it takes the keyboard while
 * it is: `C-g` and Escape close it, under the one cancel rule every overlay
 * in Editor shares.
 */
export function createNewDocumentPanel(
  services: NewDocumentServices,
  options: NewDocumentPanelOptions = {},
): NewDocumentPanel {
  const element = document.createElement("div");
  element.className = "panel new-document-panel";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");
  element.setAttribute("aria-label", "New document");
  element.hidden = true;

  let open = false;
  // The nonce the shell minted for the folder Alice chose, spent the moment
  // Create is pressed — whether or not the write that follows succeeds — the
  // same one-shot rule `export.rs`'s own destination nonce keeps.
  let nonce: string | null = null;
  let folderName: string | null = null;
  let status: HTMLElement;
  let folderLine: HTMLElement;
  let createButton: HTMLButtonElement;
  let titleInput: HTMLInputElement;

  function say(message: string, failed: boolean): void {
    status.textContent = message;
    status.dataset["state"] = failed ? "failed" : "ok";
  }

  function updateFolderLine(): void {
    folderLine.textContent =
      folderName === null ? "No folder chosen yet." : `Folder chosen: ${folderName}`;
  }

  function updateCreateEnabled(): void {
    createButton.disabled = titleInput.value.trim() === "" || nonce === null;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!open) return;
    if (event.key === "Escape" || (event.ctrlKey && event.key === "g")) {
      event.preventDefault();
      event.stopPropagation();
      panel.close();
    }
  }

  /** Build the panel's contents, fresh, every time it opens. */
  function draw(): void {
    const heading = document.createElement("h2");
    heading.textContent = "New document";

    const note = document.createElement("p");
    note.className = "new-document-note";
    note.textContent =
      "Editor writes the smallest thing that is already a book: your title, " +
      "one Part, one chapter. Nothing else is seeded.";

    const titleField = field("Title", "title");
    titleInput = titleField.input;
    titleInput.addEventListener("input", updateCreateEnabled);

    folderLine = document.createElement("p");
    folderLine.className = "new-document-folder";
    updateFolderLine();

    const chooseButton = button(
      "Choose folder…",
      () => {
        void services
          .chooseFolder(null)
          .then((chosen) => {
            if (chosen === null) return; // the author cancelled the dialog
            nonce = chosen.nonce;
            folderName = chosen.name;
            updateFolderLine();
            updateCreateEnabled();
            say("", false);
          })
          .catch((error: unknown) => {
            say(String(error), true);
          });
      },
      "new-document-choose-folder",
    );

    status = document.createElement("p");
    status.className = "new-document-status";
    // The refusal is the only route a screen reader has to what went wrong —
    // there is no separate error surface — so it must speak on its own the
    // way the modeline's announcements do elsewhere (`itd-2609061324342715`).
    status.setAttribute("aria-live", "polite");

    createButton = button(
      "Create",
      () => {
        const spent = nonce;
        if (spent === null) return;
        const title = titleInput.value;
        if (title.trim() === "") return;
        // The nonce is spent here, win or lose: a refusal from the shell
        // means the folder is no longer on offer either, exactly as an
        // export's own destination nonce behaves.
        nonce = null;
        folderName = null;
        updateFolderLine();
        updateCreateEnabled();
        void services
          .createDocument(title, spent)
          .then((outcome) => {
            panel.close();
            return options.onCreated?.(outcome);
          })
          .catch((error: unknown) => {
            say(String(error), true);
          });
      },
      "new-document-create",
    );
    createButton.disabled = true;

    const cancelButton = button("Cancel", () => panel.close(), "new-document-cancel");

    element.replaceChildren(
      heading,
      note,
      titleField.row,
      folderLine,
      chooseButton,
      status,
      createButton,
      cancelButton,
    );
  }

  const panel: NewDocumentPanel = {
    element,
    get isOpen(): boolean {
      return open;
    },
    async open(): Promise<void> {
      open = true;
      nonce = null;
      folderName = null;
      element.hidden = false;
      draw();
      focusFirstControl(element);
    },
    close(): void {
      open = false;
      element.hidden = true;
      element.replaceChildren();
    },
    destroy(): void {
      panel.close();
      document.removeEventListener("keydown", onKeyDown, true);
      element.remove();
    },
  };

  document.addEventListener("keydown", onKeyDown, true);
  return panel;
}

/** Mount the panel into the application and give it its chord. */
export function mountNewDocumentPanel(host: NewDocumentHost, panel: NewDocumentPanel): void {
  // The focus contract puts the panel in the pane cycle; see `src/focus.ts`.
  host.registerPanel("new-document", panel.element, {
    label: "New document",
    element: panel.element,
    isOpen: () => panel.isOpen,
    focus: () => {
      focusFirstControl(panel.element);
    },
  });
  host.registerCommand(NEW_DOCUMENT_OPEN_ACTION, () => {
    void panel.open();
  });
}
