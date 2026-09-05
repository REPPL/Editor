/**
 * The one overlay contract: how anything that takes the keyboard behaves.
 *
 * Written once, because a cancel rule copied into three panels is three rules
 * that will disagree. While an overlay is open it holds the keyboard; it moves
 * on the chords the binding table already names, chooses on `Return`, and
 * closes on every chord of `keyboard-quit`. Movement is resolved through
 * `chordFromEvent` and `bindingById`, never against hard-coded keys, so an
 * overlay cannot drift from the table.
 *
 * Nothing gets its own escape hatch. An overlay that needs one is a defect.
 */

import { bindingById, chordFromEvent } from "./keys";

/** What an overlay's owner supplies. */
export interface OverlayHooks {
  /** The overlay's own element. It is mounted and unmounted for you. */
  readonly element: HTMLElement;
  /** Where the overlay is mounted. Defaults to the document body. */
  readonly host?: HTMLElement;
  /** How many rows the highlight can move between. Zero disables movement. */
  rowCount(): number;
  /** The highlight moved to `index`. */
  onMove?(index: number): void;
  /** `Return` on the row at `index`. */
  onChoose?(index: number): void;
  /** The overlay closed. `chosen` is false when it was cancelled. */
  onClose?(chosen: boolean): void;
}

/** An open overlay. */
export interface Overlay {
  readonly element: HTMLElement;
  /** The highlighted row. */
  readonly index: number;
  /** Move the highlight, clamped to the row count. */
  move(to: number): void;
  /** Close it. `chosen` says whether a row was taken. */
  close(chosen?: boolean): void;
  /** Whether it is still open. */
  readonly open: boolean;
}

/** The overlay that currently holds the keyboard, if any. */
let current: Overlay | null = null;

/** The overlay that currently holds the keyboard, if any. */
export function currentOverlay(): Overlay | null {
  return current;
}

/** Close whatever overlay is open. Safe when none is. */
export function closeOverlay(): void {
  current?.close(false);
}

/**
 * The element an overlay puts the keyboard into.
 *
 * An overlay with a text field marks it; one without takes the focus itself,
 * which is what stops the editing surface seeing the keys.
 */
function focusTarget(element: HTMLElement): HTMLElement {
  return (
    element.querySelector<HTMLElement>("[data-overlay-focus]") ?? element
  );
}

/**
 * Open an overlay.
 *
 * Opening a second one closes the first: two things holding the keyboard is
 * the state this contract exists to prevent.
 */
export function openOverlay(hooks: OverlayHooks): Overlay {
  closeOverlay();

  const host = hooks.host ?? document.body;
  const returnFocusTo =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  hooks.element.classList.add("overlay");
  if (!hooks.element.hasAttribute("tabindex")) {
    hooks.element.tabIndex = -1;
  }
  host.append(hooks.element);

  let index = 0;
  let open = true;

  const clamp = (to: number): number => {
    const count = hooks.rowCount();
    if (count <= 0) return 0;
    // Wrapping, because a list that stops dead at its ends makes the author
    // look at the screen to find out why the key did nothing.
    return ((to % count) + count) % count;
  };

  const overlay: Overlay = {
    element: hooks.element,
    get index(): number {
      return index;
    },
    get open(): boolean {
      return open;
    },
    move(to: number): void {
      index = clamp(to);
      hooks.onMove?.(index);
    },
    close(chosen = false): void {
      if (!open) return;
      open = false;
      document.removeEventListener("keydown", onKeydown, true);
      hooks.element.remove();
      if (current === overlay) current = null;
      // The surface gets the keyboard back, and with it the selection it had:
      // nothing here dispatched a transaction, so there is nothing to restore.
      returnFocusTo?.focus();
      hooks.onClose?.(chosen);
    },
  };

  function chordsOf(id: string): readonly string[] {
    return bindingById(id)?.chords ?? [];
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!open) return;
    const chord = chordFromEvent(event);
    if (chordsOf("keyboard-quit").includes(chord)) {
      event.preventDefault();
      event.stopPropagation();
      overlay.close(false);
      return;
    }
    if (chordsOf("next-line").includes(chord)) {
      event.preventDefault();
      event.stopPropagation();
      overlay.move(index + 1);
      return;
    }
    if (chordsOf("previous-line").includes(chord)) {
      event.preventDefault();
      event.stopPropagation();
      overlay.move(index - 1);
      return;
    }
    if (chord === "Return") {
      event.preventDefault();
      event.stopPropagation();
      const chosen = index;
      overlay.close(true);
      hooks.onChoose?.(chosen);
      return;
    }
    // Everything else belongs to the overlay's own field, if it has one. It
    // must not reach the editing surface, which is what holding the keyboard
    // means, and the focus is already inside the overlay so it does not.
  }

  document.addEventListener("keydown", onKeydown, true);
  current = overlay;
  focusTarget(hooks.element).focus();
  hooks.onMove?.(0);
  return overlay;
}
