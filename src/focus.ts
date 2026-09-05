/**
 * Which pane holds the keyboard, and how it is handed on.
 *
 * Three panes in one fixed order — the editing surface, the sidebar, whatever
 * panel is open — and one chord, `other-window`, that walks it. Focus is
 * single and exclusive, which is the whole mechanism: `C-n` is next line in
 * the text and next node in the tree because exactly one pane is listening,
 * never both.
 *
 * The editing surface hears its chords through a CodeMirror extension, which
 * only sees a keydown while the content has DOM focus. So a pane that is not
 * the editor needs a reader of its own: one document listener, in the capture
 * phase, active only while the keyboard is elsewhere. It is a second *reader*,
 * not a second prefix state — a half-typed `C-x` goes to the modeline's own
 * prefix cell, so it looks the same wherever it was typed.
 *
 * Every chord is resolved through `bindingById` against the table's rows, so
 * this module names no key of its own.
 */

import {
  bindingById,
  canonicalChord,
  chordFromEvent,
  scopeOf,
  BINDINGS,
} from "./keys";
import { currentOverlay, focusOverlay, onOverlayChange } from "./overlay";
import type { Sidebar } from "./sidebar";

/** The panes that can hold the keyboard. */
export type Pane = "editor" | "sidebar" | "panel";

/**
 * The cycle, in the one order it is ever walked.
 *
 * Two panes with nothing open and three with something open, in the same
 * order every time: the panel is the third place, whichever panel it is.
 */
export const PANE_ORDER: readonly Pane[] = ["editor", "sidebar", "panel"];

/** How the modeline names each pane that is not a panel. */
const PANE_LABELS: Readonly<Record<"editor" | "sidebar", string>> = {
  editor: "Editor",
  sidebar: "Sidebar",
};

/** One pane, and what the cycle needs to know about it. */
export interface PaneTarget {
  readonly pane: Pane;
  /** What the modeline calls it. */
  label(): string;
  /** Whether it can hold the keyboard now. */
  available(): boolean;
  /** Take the keyboard. */
  take(): void;
  /** Give it up. */
  release(): void;
}

/**
 * What a panel tells the focus model about itself.
 *
 * A panel registers this alongside its element, so the third place in the
 * cycle is filled by whatever is open rather than by a list of panels written
 * down here.
 */
export interface PanelFocus {
  /** What the modeline calls it: `Keys`, `Publish`, `Settings`. */
  readonly label: string;
  /** The panel's own element, so the model can see the keyboard arrive in it. */
  readonly element: HTMLElement;
  /** Whether it is open, and so whether it can hold the keyboard. */
  isOpen(): boolean;
  /** Put the keyboard into it. */
  focus(): void;
}

/**
 * Put the keyboard into the first control a panel offers.
 *
 * Written once, because a panel that took the keyboard differently from the
 * next panel would be two rules for one promise. A panel with no control at
 * all takes the focus itself, which is what stops the editing surface seeing
 * the keys.
 */
export function focusFirstControl(element: HTMLElement): void {
  const control = element.querySelector<HTMLElement>(
    "input:not([type=hidden]), select, textarea, button, [tabindex]",
  );
  if (control) {
    control.focus();
    return;
  }
  element.tabIndex = -1;
  element.focus();
}

/** What the focus model needs from the application. */
export interface FocusHooks {
  /** Give the keyboard back to the editing surface. */
  focusEditor(): void;
  /** The sidebar, which is the second pane. */
  readonly sidebar: Sidebar;
  /** The pane or the prefix changed, and the modeline has to say so. */
  onChange?(): void;
}

/** The pane cycle, and the reader for the panes the surface cannot hear. */
export interface FocusModel {
  /** The pane holding the keyboard. */
  readonly pane: Pane;
  /** What the modeline calls that pane. */
  readonly label: string;
  /** A prefix chord half-typed outside the editing surface, or null. */
  readonly prefix: string | null;
  /** Add a panel to the third place in the cycle. */
  registerPanel(panel: PanelFocus): void;
  /** Move to the next available pane, wrapping. */
  cycle(): void;
  /** Hand the keyboard back to the text. */
  toEditor(): void;
  /** Give the keyboard to one pane. False when it cannot take it. */
  to(pane: Pane): boolean;
  /** Notice a pane that has gone away, such as a panel that closed. */
  reconcile(): void;
  /** Stop reading keys. */
  destroy(): void;
}

/** The chords a pane other than the editor answers, by binding id. */
const SIDEBAR_IDS: readonly string[] = BINDINGS.filter(
  (binding) => scopeOf(binding) === "sidebar",
).map((binding) => binding.id);

/** The one row every pane answers, because it is how a pane is left. */
const CYCLE_ID = "other-window";

/** Whether a chord step is a modifier held on its own. */
function isModifierOnly(step: string): boolean {
  return (
    step.endsWith("-") ||
    step === "Control" ||
    step === "Alt" ||
    step === "Meta" ||
    step === "Shift"
  );
}

/** Every chord one row carries, canonicalised. */
function chordsOf(id: string): readonly string[] {
  return (bindingById(id)?.chords ?? []).map(canonicalChord);
}

/** Build the focus model and install its key reader. */
export function createFocusModel(hooks: FocusHooks): FocusModel {
  const { sidebar } = hooks;
  let pane: Pane = "editor";
  /** The prefix step in progress in this reader, such as `C-x`. */
  let pending: string | null = null;

  const panels: PanelFocus[] = [];
  /**
   * When each open thing was first seen open.
   *
   * Where two panels could be open at once the most recently opened one takes
   * the third place, which is what the overlay contract already enforces for
   * the two overlays. Order is observed rather than reported: a source that
   * was not open the last time it was looked at and is open now has just
   * opened.
   */
  const stamps = new WeakMap<object, number>();
  let stamp = 0;

  function changed(): void {
    hooks.onChange?.();
  }

  /** Every panel-shaped thing that is open, most recently opened first. */
  function openPanels(): { key: object; focus: PanelFocus }[] {
    const found: { key: object; focus: PanelFocus }[] = [];
    const overlay = currentOverlay();
    if (overlay?.open) {
      found.push({
        key: overlay,
        focus: {
          // An overlay names itself for a screen reader already; a pane name
          // shorter than that sentence is the one the modeline wants.
          label:
            overlay.element.dataset["paneLabel"] ??
            overlay.element.getAttribute("aria-label") ??
            "Panel",
          element: overlay.element,
          isOpen: () => overlay.open,
          focus: () => {
            focusOverlay(overlay);
          },
        },
      });
    }
    for (const panel of panels) {
      if (panel.isOpen()) found.push({ key: panel, focus: panel });
    }
    for (const entry of found) {
      if (!stamps.has(entry.key)) stamps.set(entry.key, ++stamp);
    }
    return found.sort(
      (a, b) => (stamps.get(b.key) ?? 0) - (stamps.get(a.key) ?? 0),
    );
  }

  /** The panel that holds the third place, if anything does. */
  function activePanel(): PanelFocus | null {
    return openPanels()[0]?.focus ?? null;
  }

  const editorTarget: PaneTarget = {
    pane: "editor",
    label: () => PANE_LABELS.editor,
    // The editor is always available, which is what makes the walk terminate.
    available: () => true,
    take: () => {
      hooks.focusEditor();
    },
    release: () => {
      // Nothing to give up: the surface loses the keyboard when another pane
      // takes DOM focus, and nothing about the buffer changes.
    },
  };

  const sidebarTarget: PaneTarget = {
    pane: "sidebar",
    label: () => PANE_LABELS.sidebar,
    // A tree with no rows cannot hold a cursor, so it is not in the cycle.
    available: () => sidebar.rows().length > 0,
    take: () => {
      sidebar.takeFocus();
    },
    release: () => {
      sidebar.releaseFocus();
    },
  };

  const panelTarget: PaneTarget = {
    pane: "panel",
    label: () => activePanel()?.label ?? "Panel",
    available: () => activePanel() !== null,
    take: () => {
      activePanel()?.focus();
    },
    release: () => {
      // A panel cycled away from stays open: leaving a pane is not cancelling
      // it, and cancelling is the one cancel contract's business.
    },
  };

  function targetFor(which: Pane): PaneTarget {
    if (which === "sidebar") return sidebarTarget;
    if (which === "panel") return panelTarget;
    return editorTarget;
  }

  function to(next: Pane): boolean {
    const target = targetFor(next);
    if (!target.available()) return false;
    if (next !== pane) targetFor(pane).release();
    pane = next;
    pending = null;
    target.take();
    changed();
    return true;
  }

  function cycle(): void {
    const from = PANE_ORDER.indexOf(pane);
    for (let step = 1; step <= PANE_ORDER.length; step += 1) {
      const next = PANE_ORDER[(from + step) % PANE_ORDER.length];
      if (next !== undefined && targetFor(next).available()) {
        to(next);
        return;
      }
    }
  }

  function toEditor(): void {
    to("editor");
  }

  function reconcile(): void {
    if (pane !== "editor" && !targetFor(pane).available()) toEditor();
  }

  /**
   * Record where the keyboard actually is, without moving it.
   *
   * A panel opened by its own chord focuses itself, and a click lands
   * wherever it lands. The model would otherwise name a pane that does not
   * have the keys, which is the one thing the modeline must never do.
   */
  function adopt(next: Pane): void {
    if (next === pane) return;
    pane = next;
    pending = null;
    changed();
  }

  function onFocusIn(event: FocusEvent): void {
    const landed = event.target;
    if (!(landed instanceof Node)) return;
    if (openPanels().some((entry) => entry.focus.element.contains(landed))) {
      adopt("panel");
      return;
    }
    // The keyboard left the panel: it closed, or she clicked past it.
    if (pane === "panel") adopt(sidebar.focused ? "sidebar" : "editor");
  }

  /** The rows this pane answers. */
  function answering(): readonly string[] {
    if (pane === "sidebar") return [CYCLE_ID, ...SIDEBAR_IDS];
    // In a panel the reader answers the chord that leaves it and nothing
    // else, so the panel's own keys — and the one cancel contract — are
    // untouched.
    if (pane === "panel") return [CYCLE_ID];
    return [];
  }

  /** Run one row. Only rows `answering()` offered ever reach this. */
  function run(id: string): void {
    switch (id) {
      case CYCLE_ID:
        cycle();
        return;
      case "sidebar-next-node":
        sidebar.setCursor(sidebar.cursor + 1);
        return;
      case "sidebar-previous-node":
        // With the cursor nowhere, `-1 - 1` clamps to the first row, which is
        // where a cursor that is nowhere ought to arrive.
        sidebar.setCursor(sidebar.cursor - 1);
        return;
      case "sidebar-expand-node":
        sidebar.expandAtCursor();
        return;
      case "sidebar-collapse-node":
        sidebar.collapseAtCursor();
        return;
      case "sidebar-open-node":
        // The keyboard goes back to the text once the chapter has loaded,
        // which the application does through the same hook a click calls.
        sidebar.activateCursor();
        return;
      case "sidebar-quit":
        toEditor();
        return;
      default:
        return;
    }
  }

  function claim(event: KeyboardEvent): void {
    event.preventDefault();
    // Immediate, because an open overlay listens on this same node and would
    // otherwise move its own highlight on a chord the sidebar just answered.
    event.stopImmediatePropagation();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (pane === "editor") return;
    const step = canonicalChord(chordFromEvent(event));
    if (isModifierOnly(step)) return;

    const ids = answering();
    const chord = pending === null ? step : `${pending} ${step}`;

    // `C-g` on a half-typed prefix cancels the prefix, exactly as it does in
    // the text, rather than running the row it would otherwise reach.
    if (pending !== null && chordsOf("keyboard-quit").includes(step)) {
      pending = null;
      claim(event);
      changed();
      return;
    }

    for (const id of ids) {
      if (chordsOf(id).includes(chord)) {
        pending = null;
        claim(event);
        changed();
        run(id);
        return;
      }
    }

    const opens = ids.some((id) =>
      chordsOf(id).some((candidate) => candidate.startsWith(`${chord} `)),
    );
    if (opens) {
      pending = chord;
      claim(event);
      changed();
      return;
    }

    if (pending !== null) {
      // A sequence that reached no row. The prefix is over; the key itself is
      // left to whatever else is listening.
      pending = null;
      changed();
    }
    // A panel answers its own keys, and one of them may have closed it.
    if (pane === "panel") queueMicrotask(reconcile);
  }

  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("focusin", onFocusIn, true);
  const stopWatchingOverlays = onOverlayChange(() => {
    reconcile();
    changed();
  });

  return {
    get pane(): Pane {
      return pane;
    },

    get label(): string {
      return targetFor(pane).label();
    },

    get prefix(): string | null {
      return pending;
    },

    registerPanel(panel: PanelFocus): void {
      panels.push(panel);
    },

    cycle,
    toEditor,
    to,
    reconcile,

    destroy(): void {
      document.removeEventListener("keydown", onKeydown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      stopWatchingOverlays();
    },
  };
}
