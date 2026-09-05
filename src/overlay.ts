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
  /**
   * Read one key before the overlay's own movement does.
   *
   * This is how an overlay that is a prompt rather than a list works: it holds
   * the keyboard under the one cancel contract, and the key it is waiting for
   * reaches it here. Consulted after the cancel chords and before movement, so
   * `C-g` and Escape still close it and nothing needs an escape hatch.
   *
   * Return true to keep the prompt open for another step — which is how
   * `C-h k` reads `C-x C-s` as one sequence — and false to close it, chosen.
   * The event is claimed either way: holding the keyboard means the editing
   * surface never sees it.
   */
  onKey?(event: KeyboardEvent): boolean;
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

/** Someone who needs to know which overlay holds the keyboard. */
export type OverlayObserver = (overlay: Overlay | null) => void;

const observers = new Set<OverlayObserver>();

/**
 * Watch the overlay that holds the keyboard.
 *
 * The focus model is one of the panes in the cycle, and an overlay opening or
 * closing is what makes that pane appear and disappear. Observing is all this
 * adds: the cancel contract above is unchanged, so "focus returns to the text
 * on cancel" stays one rule with one implementation.
 *
 * Returns the call that stops watching.
 */
export function onOverlayChange(observer: OverlayObserver): () => void {
  observers.add(observer);
  return () => {
    observers.delete(observer);
  };
}

function announceOverlay(): void {
  for (const observer of [...observers]) {
    try {
      observer(current);
    } catch (error) {
      console.warn(`overlay observer: ${String(error)}`);
    }
  }
}

/** The overlay that currently holds the keyboard, if any. */
export function currentOverlay(): Overlay | null {
  return current;
}

/** Close whatever overlay is open. Safe when none is. */
export function closeOverlay(): void {
  current?.close(false);
}

/**
 * Put the keyboard back into the open overlay.
 *
 * The same rule `openOverlay` uses, so a pane cycled back to lands where it
 * landed when it opened rather than in a second, disagreeing place.
 */
export function focusOverlay(overlay: Overlay): void {
  focusTarget(overlay.element).focus();
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
  /**
   * Where the overlay listens for keys.
   *
   * A list overlay listens on the document, so that the pane cycle's own
   * reader — which listens there too, and answers `C-x o` and nothing else —
   * can still take the keyboard out of it. A prompt is not a pane to cycle out
   * of: it is a modal read of one chord, and `C-g` is how it is left. It
   * therefore listens one node higher, where the capture phase reaches it
   * first, so a `C-x` typed into it is the first step of the chord it was
   * asked to read rather than the first step of `C-x o`.
   */
  const keyTarget: EventTarget = hooks.onKey ? window : document;
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
      keyTarget.removeEventListener("keydown", onKeydown as EventListener, true);
      hooks.element.remove();
      const wasCurrent = current === overlay;
      if (wasCurrent) current = null;
      // The surface gets the keyboard back, and with it the selection it had:
      // nothing here dispatched a transaction, so there is nothing to restore.
      returnFocusTo?.focus();
      hooks.onClose?.(chosen);
      // Last, so that an observer moving the keyboard has the final say over
      // where it lands.
      if (wasCurrent) announceOverlay();
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
    if (hooks.onKey) {
      event.preventDefault();
      event.stopPropagation();
      if (!hooks.onKey(event)) overlay.close(true);
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

  keyTarget.addEventListener("keydown", onKeydown as EventListener, true);
  current = overlay;
  announceOverlay();
  focusTarget(hooks.element).focus();
  hooks.onMove?.(0);
  return overlay;
}

/** A row of a list overlay: what is shown, and what it stands for. */
export interface ListEntry {
  readonly id: string;
  readonly label: string;
}

/** What a list overlay's owner supplies. */
export interface ListOverlayHooks<T extends ListEntry> {
  /** Where the overlay is mounted. */
  readonly host?: HTMLElement;
  /** The overlay's own class, beside `overlay`. */
  readonly className: string;
  /** What a screen reader calls the whole overlay. */
  readonly label: string;
  /** What the modeline calls this pane while it holds the keyboard. */
  readonly paneLabel: string;
  /** The dataset key each row carries its id under. */
  readonly rowKey: string;
  /** The filter field's placeholder. A list with no field omits it. */
  readonly placeholder?: string;
  /** What a screen reader calls the filter field. */
  readonly fieldLabel?: string;
  /** A line of prose above the rows, for a list that asks a question. */
  readonly question?: string;
  /** The rows a query matches, best first. The query is empty with no field. */
  entries(query: string): readonly T[];
  onChoose?(entry: T): void;
  onClose?(chosen: boolean): void;
}

/**
 * A filterable list over the one overlay contract.
 *
 * The insert palette, the command palette and the quit confirmation are the
 * same thing seen three times: rows, a highlight, `Return`, and `C-g`. Written
 * once so that the three cannot drift, and so that a fourth costs a call
 * rather than a copy.
 */
export function openListOverlay<T extends ListEntry>(
  hooks: ListOverlayHooks<T>,
): Overlay {
  let matches: readonly T[] = hooks.entries("");

  const element = document.createElement("section");
  element.className = hooks.className;
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-label", hooks.label);
  element.dataset["paneLabel"] = hooks.paneLabel;

  if (hooks.question !== undefined) {
    const question = document.createElement("p");
    question.className = "palette-question";
    question.textContent = hooks.question;
    element.append(question);
  }

  let field: HTMLInputElement | null = null;
  if (hooks.placeholder !== undefined) {
    field = document.createElement("input");
    field.type = "text";
    field.className = "palette-field";
    field.placeholder = hooks.placeholder;
    field.setAttribute("aria-label", hooks.fieldLabel ?? hooks.label);
    field.dataset["overlayFocus"] = "yes";
    element.append(field);
  }

  const list = document.createElement("ul");
  list.className = "palette-list";
  element.append(list);

  let overlay: Overlay | null = null;

  const highlight = (index: number): void => {
    const rows = list.querySelectorAll<HTMLElement>(".palette-row");
    rows.forEach((row, at) => {
      row.dataset["current"] = at === index ? "yes" : "no";
    });
    rows[index]?.scrollIntoView({ block: "nearest" });
  };

  const draw = (): void => {
    list.replaceChildren();
    for (const entry of matches) {
      const item = document.createElement("li");
      item.className = "palette-row";
      item.dataset[hooks.rowKey] = entry.id;
      item.textContent = entry.label;
      list.append(item);
    }
    highlight(overlay?.index ?? 0);
  };

  field?.addEventListener("input", () => {
    matches = hooks.entries(field?.value ?? "");
    overlay?.move(0);
    draw();
  });

  overlay = openOverlay({
    element,
    ...(hooks.host ? { host: hooks.host } : {}),
    rowCount: () => matches.length,
    onMove: (index) => {
      highlight(index);
    },
    onChoose: (index) => {
      const entry = matches[index];
      if (entry) hooks.onChoose?.(entry);
    },
    ...(hooks.onClose ? { onClose: hooks.onClose } : {}),
  });

  draw();
  return overlay;
}
