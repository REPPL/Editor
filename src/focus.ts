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
  /**
   * The editing surface's content root.
   *
   * The one element the keyboard can land in and mean "the text": a click in
   * a paragraph, a `contentDOM.focus()` after a chapter loads, a browser
   * restoring focus. Without it the model can only hear the panes it drives
   * itself, and a pointer route leaves it naming a pane that does not have
   * the keys.
   */
  readonly editorContent: HTMLElement;
  /**
   * The editing surface's whole element, content and furniture alike.
   *
   * CodeMirror's own panels live here and not in the content: the search
   * panel's input, and whatever else the surface mounts around the text. They
   * are the editor for the purpose of naming a pane — they are not a fourth
   * place in the cycle, and the keyboard being in one of them is not the
   * keyboard being nowhere. Without this the model read a click into the
   * search field as focus lost, and took it back into the text mid-search.
   */
  readonly editorSurface: HTMLElement;
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
  /**
   * The sources that were open the last time they were looked at.
   *
   * The transition is what a stamp records, so a source has to be forgotten
   * when it closes: a panel registered once at mount is the same object every
   * time it opens, and stamping it only the first time would freeze a panel
   * reopened after another one behind that other one for ever.
   */
  const seenOpen = new WeakSet<object>();
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
    if (overlay && !overlay.open) seenOpen.delete(overlay);
    for (const panel of panels) {
      if (panel.isOpen()) found.push({ key: panel, focus: panel });
      // Closed now: the next time it is open it has just opened.
      else seenOpen.delete(panel);
    }
    for (const entry of found) {
      if (seenOpen.has(entry.key)) continue;
      seenOpen.add(entry.key);
      stamps.set(entry.key, ++stamp);
    }
    return found.sort(
      (a, b) => (stamps.get(b.key) ?? 0) - (stamps.get(a.key) ?? 0),
    );
  }

  /** What holds the third place, if anything does: its key and its contract. */
  function heldPlace(): { key: object; focus: PanelFocus } | null {
    return openPanels()[0] ?? null;
  }

  /** The panel that holds the third place, if anything does. */
  function activePanel(): PanelFocus | null {
    return heldPlace()?.focus ?? null;
  }

  /**
   * The overlay in the third place, or null when a registered panel is there.
   *
   * The two fill the same place and are left differently, and this is the one
   * question that tells them apart — see `panelTarget.release`.
   */
  function heldOverlay(): { close(chosen?: boolean): void } | null {
    const overlay = currentOverlay();
    if (!overlay?.open) return null;
    return heldPlace()?.key === overlay ? overlay : null;
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
      // A *registered* panel cycled away from stays open: leaving a pane is
      // not cancelling it, it hears only the keys that reach the element the
      // keyboard is in, and cancelling is the one cancel contract's business.
      //
      // An overlay is not like that. "Holding the keyboard" is implemented as
      // a document-level listener in the capture phase, and that listener does
      // not stop when the keyboard goes elsewhere. An overlay left open behind
      // the text goes on claiming `Return`: `C-x o` out of the quit question
      // and one ordinary Return in the buffer answered the invisible question
      // instead of typing a newline, and the answer threw away every unsaved
      // edit (iss-2609052115254279). `M-x`, the insert palette, the prompts
      // and the export panel all sat on the same listener.
      //
      // So an overlay is closed, cancelled, the moment the keyboard leaves it.
      // Cancelled is the right answer everywhere: it is what `C-g` does, it
      // writes nothing, and for the quit question it means keep editing.
      heldOverlay()?.close(false);
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
   *
   * The pane being left is still released: it is losing the keyboard whether
   * or not it was asked to, so a tree that keeps its cursor mark — or a
   * drawer the cycle opened — would outlive the pane it belongs to.
   */
  function adopt(next: Pane): void {
    if (next === pane) {
      // The pane is the same; which panel fills the third place may not be,
      // and the modeline names the panel rather than the place.
      if (pane === "panel") changed();
      return;
    }
    targetFor(pane).release();
    pane = next;
    pending = null;
    if (next === "sidebar") sidebar.adoptFocus();
    changed();
  }

  /**
   * Which pane an element belongs to, or null for anything else.
   *
   * The three panes are asked in the cycle's own order of precedence: a panel
   * sits over the surface, so an element inside an open panel is the panel's
   * even when the panel is drawn inside another pane's subtree.
   */
  function paneOf(landed: Node | null): Pane | null {
    if (landed === null) return null;
    if (openPanels().some((entry) => entry.focus.element.contains(landed))) {
      return "panel";
    }
    // The whole surface, not only the content: a caret in a paragraph and a
    // cursor in CodeMirror's own search field are both "the keyboard is in
    // the editor", and only one of them is inside `contentDOM`.
    if (hooks.editorSurface.contains(landed)) return "editor";
    if (hooks.editorContent.contains(landed)) return "editor";
    // A tree with no rows cannot hold a cursor, and its one button is the
    // page's own: leaving it out keeps the reader off that button's keys.
    if (sidebar.element.contains(landed) && sidebarTarget.available()) {
      return "sidebar";
    }
    return null;
  }

  function onFocusIn(event: FocusEvent): void {
    const landed = event.target;
    if (!(landed instanceof Node)) return;
    const arrived = paneOf(landed);
    if (arrived !== null) {
      adopt(arrived);
      return;
    }
    // The keyboard left the panel: it closed, or she clicked past it.
    if (pane === "panel") adopt(sidebar.focused ? "sidebar" : "editor");
  }

  /**
   * The keyboard left the tree.
   *
   * Where it went is `focusin`'s business and it is heard first, so this only
   * has to answer the case where it went nowhere — a click on the page's
   * chrome, a blur — in which the model would otherwise keep the reader
   * claiming `C-n` and Return for a tree nothing is pointing at.
   *
   * Nowhere is the whole condition, and it has to be read narrowly. Taking
   * the keyboard back is a real move: `toEditor` puts the caret in the text,
   * and anything that had the focus loses it. So the keyboard is only taken
   * where nothing is holding it — the body, or nothing at all. Something
   * focusable that is not a pane is holding it for a reason, and the model
   * records that the tree no longer answers without moving it.
   */
  function onFocusOut(event: FocusEvent): void {
    const left = event.target;
    if (!(left instanceof Node) || !sidebar.element.contains(left)) return;
    const next = event.relatedTarget;
    // Focus moving on within the tree has not left it.
    if (next instanceof Node && sidebar.element.contains(next)) return;
    queueMicrotask(() => {
      if (pane !== "sidebar") return;
      const active = document.activeElement;
      if (active !== null && sidebar.element.contains(active)) return;
      const now = paneOf(active);
      if (now !== null) {
        adopt(now);
        return;
      }
      if (active === null || active === document.body) toEditor();
      else adopt("editor");
    });
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
      case "sidebar-hide":
        // Unlike `sidebar-quit`, this closes the drawer even when it was
        // already open before the keyboard arrived — `h` is a hide, not
        // only a leave, so `releaseFocus`'s own "close only what I opened"
        // rule (itd-2609051921482691) is not enough here on its own.
        sidebar.setOpen(false);
        toEditor();
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
    // A pane can go away under the keyboard: a tree redrawn with no rows in
    // it, a panel closed by its own key. Nothing reports a row count changing,
    // so the question is asked where it matters — before a chord is answered
    // by a pane that cannot answer it. `showTree` asks it too, so the modeline
    // is right without waiting for a keystroke; this is the guard that does
    // not depend on a caller remembering.
    if (pane !== "editor") reconcile();
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
  document.addEventListener("focusout", onFocusOut, true);
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
      document.removeEventListener("focusout", onFocusOut, true);
      stopWatchingOverlays();
    },
  };
}
