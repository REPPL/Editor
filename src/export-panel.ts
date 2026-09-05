/**
 * The export panel: every file Editor is willing to write, in one place.
 *
 * Five rows. Three write something now — the deck as a folder, the article as
 * a folder, and a dry run of a publish — and each states its destination and
 * every file it puts there before Alice confirms. Two say they are not
 * available yet and name the phase they arrive in, and neither can be
 * confirmed.
 *
 * The panel is an overlay, not a form: it opens through `openOverlay`, so
 * `C-n` and `C-p` move, `Return` confirms the highlighted row, and `C-g` and
 * Escape close it under the one cancel contract every overlay obeys. The row's
 * statement of what it writes is read off the built plan, so it stays true
 * when the build changes.
 */

import {
  dryRunFiles,
  filesFor,
  folderNameFor,
  requestFor,
  type ExportKind,
  type ExportPlan,
  type ExportServices,
} from "./export/services";
import { openOverlay, type Overlay } from "./overlay";
import type { PanelHost } from "./publish-panel";

/** The chord that opens the panel. */
export const EXPORT_OPEN_CHORD = "C-c C-e";

/** The binding-table action id, for the row that reaches this panel. */
export const EXPORT_OPEN_ACTION = "export-open";

/** What one row of the panel offers. */
export interface ExportRow {
  /** `deck`, `article`, `dry-run`, `single-file`, `pdf`. */
  readonly id: string;
  readonly label: string;
  /** Where it writes, in words Alice can check before confirming. */
  readonly destination: string;
  /** Every file it writes, in the order the folder holds them. */
  readonly writes: readonly string[];
  /** Whether `Return` on this row does anything at all. */
  readonly available: boolean;
  /** Why not, where it is not: the phase it arrives in, or the refusals. */
  readonly why: string | null;
}

/** The phase each rendering this app cannot make yet arrives in. */
export const SINGLE_FILE_PHASE = "Not yet available: phase 5.";
export const PDF_PHASE =
  "Not yet available: phase 6, and rendered in the publish pipeline, never in the app.";

/**
 * The five rows, described from the plan.
 *
 * Exported because it is the whole of what the panel promises, and a test
 * reads it rather than the markup it becomes.
 */
export function rowsFor(plan: ExportPlan): ExportRow[] {
  const refused =
    plan.refusals.length > 0
      ? `${String(plan.refusals.length)} reference${
          plan.refusals.length === 1 ? "" : "s"
        } in this document resolved to nothing, so nothing can be written.`
      : null;
  const writable = (kind: ExportKind): ExportRow => ({
    id: kind,
    label: kind === "deck" ? "The deck as a folder" : "The article as a folder",
    destination: `A new folder, ${folderNameFor(kind, plan.slug)}, inside the folder you choose.`,
    writes: filesFor(kind, plan),
    available: refused === null,
    why: refused,
  });
  return [
    writable("deck"),
    writable("article"),
    {
      id: "dry-run",
      label: "A dry run of a publish",
      destination:
        "The application's own cache folder, outside every document. It opens in the Finder.",
      writes: [...dryRunFiles(plan), "the step list the dry run wrote"],
      available: refused === null,
      why: refused,
    },
    {
      id: "single-file",
      label: "One HTML file that reads anywhere",
      destination: "—",
      writes: [],
      available: false,
      why: SINGLE_FILE_PHASE,
    },
    {
      id: "pdf",
      label: "The journal PDF",
      destination: "—",
      writes: [],
      available: false,
      why: PDF_PHASE,
    },
  ];
}

/** The mounted panel. */
export interface ExportPanel {
  readonly element: HTMLElement;
  readonly isOpen: boolean;
  /** Where the overlay is mounted; the application's overlay host. */
  setOverlayHost(host: HTMLElement | null): void;
  open(): Promise<void>;
  close(): void;
  destroy(): void;
}

/** What the panel says besides its rows. */
export interface ExportPanelOptions {
  /** Say something in the modeline: an overlay is closed before a row runs. */
  announce?(message: string): void;
}

/** Build the panel. */
export function createExportPanel(
  services: ExportServices,
  options: ExportPanelOptions = {},
): ExportPanel {
  const element = document.createElement("section");
  element.className = "panel export-panel";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-label", "Export");
  element.hidden = true;

  const announce = (message: string): void => {
    options.announce?.(message);
  };

  let host: HTMLElement | null = null;
  let overlay: Overlay | null = null;
  let rows: ExportRow[] = [];
  let elements: HTMLElement[] = [];
  let plan: ExportPlan | null = null;

  /** Draw the rows, and the refusals where the build carries any. */
  function draw(built: ExportPlan): void {
    rows = rowsFor(built);
    elements = [];

    const heading = document.createElement("h2");
    heading.textContent = "Export";

    const line = document.createElement("p");
    line.className = "export-document";
    line.textContent = `${built.title} — ${built.variant}`;

    const list = document.createElement("ul");
    list.className = "export-rows";
    for (const row of rows) {
      const item = document.createElement("li");
      item.className = "export-row";
      item.dataset["row"] = row.id;
      item.dataset["available"] = row.available ? "yes" : "no";

      const label = document.createElement("p");
      label.className = "export-label";
      label.textContent = row.label;

      const destination = document.createElement("p");
      destination.className = "export-destination";
      destination.textContent = row.destination;

      item.append(label, destination);

      if (row.why !== null) {
        const why = document.createElement("p");
        why.className = "export-unavailable";
        why.textContent = row.why;
        item.append(why);
      }

      if (row.writes.length > 0) {
        const writes = document.createElement("ul");
        writes.className = "export-writes";
        for (const name of row.writes) {
          const wrote = document.createElement("li");
          wrote.textContent = name;
          writes.append(wrote);
        }
        item.append(writes);
      }

      elements.push(item);
      list.append(item);
    }

    const parts: HTMLElement[] = [heading, line, list];

    if (built.refusals.length > 0) {
      const refusals = document.createElement("ul");
      refusals.className = "export-refusals";
      for (const refusal of built.refusals) {
        const item = document.createElement("li");
        item.className = "export-refusal";
        item.dataset["reference"] = refusal.reference;
        item.textContent = `${refusal.chapter}: ${refusal.reference} — ${refusal.reason}`;
        refusals.append(item);
      }
      parts.push(refusals);
    }

    const hint = document.createElement("p");
    hint.className = "export-hint";
    hint.textContent =
      "Move with C-n and C-p, write the highlighted row with Return, close with C-g. Nothing is written until you confirm.";
    parts.push(hint);

    element.replaceChildren(...parts);
  }

  /** Write one folder, or open the folder the dry run staged. */
  async function run(row: ExportRow): Promise<void> {
    const built = plan;
    if (built === null) {
      return;
    }
    if (!row.available) {
      // No dialog is opened and no command is invoked.
      announce(`${row.label}: ${row.why ?? "not yet available"}`);
      return;
    }
    if (row.id === "dry-run") {
      const outcome = await services.dryRun();
      await services.revealStagedVersion();
      announce(
        `The dry run staged version ${outcome.hash}. Nothing left this machine.`,
      );
      return;
    }
    const kind = row.id as ExportKind;
    const destination = await services.chooseFolder(built.beside);
    if (destination === null) {
      announce("Nothing was exported.");
      return;
    }
    const outcome = await services.exportRendering(
      requestFor(kind, built, destination),
    );
    announce(
      `Wrote ${outcome.folder}: ${String(outcome.files)} file${
        outcome.files === 1 ? "" : "s"
      }.`,
    );
  }

  const panel: ExportPanel = {
    element,
    get isOpen(): boolean {
      return overlay?.open ?? false;
    },
    setOverlayHost(next): void {
      host = next;
    },
    async open(): Promise<void> {
      let built: ExportPlan;
      try {
        built = await services.plan();
      } catch (error) {
        // No document, unsaved edits, a chapter that will not read: the panel
        // does not open at all, and says why.
        announce(String(error));
        return;
      }
      plan = built;
      draw(built);
      element.hidden = false;
      overlay = openOverlay({
        element,
        ...(host === null ? {} : { host }),
        rowCount: () => elements.length,
        onMove: (index) => {
          elements.forEach((entry, at) => {
            entry.dataset["current"] = at === index ? "yes" : "no";
          });
          elements[index]?.scrollIntoView({ block: "nearest" });
        },
        onChoose: (index) => {
          const row = rows[index];
          if (row === undefined) return;
          void run(row).catch((error: unknown) => {
            announce(String(error));
          });
        },
        onClose: () => {
          element.hidden = true;
          overlay = null;
        },
      });
    },
    close(): void {
      overlay?.close(false);
    },
    destroy(): void {
      panel.close();
      element.remove();
    },
  };

  return panel;
}

/** Mount the panel into the application and give it its chord. */
export function mountExportPanel(host: PanelHost, panel: ExportPanel): void {
  host.registerPanel("export", panel.element);
  // The application mounted the element in its overlay host; that is where the
  // overlay opens, and it is where the element goes back to on every open.
  panel.setOverlayHost(panel.element.parentElement);
  panel.element.remove();
  host.registerCommand(EXPORT_OPEN_ACTION, () => {
    void panel.open();
  });
}
