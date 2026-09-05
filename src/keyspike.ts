/**
 * The key spike.
 *
 * The risk the delivery chapter names is not the keymap but the platform: a
 * chord may be taken by macOS, by the menu bar, or by the Safari engine before
 * any JavaScript runs. This module answers the only question a program can
 * answer about that — did the chord reach the page at all, and did the editing
 * surface act on it.
 *
 * A listener on the window in the capture phase is the earliest point the page
 * sees a key. Anything swallowed above it never appears in the log; that
 * absence is the finding. Whether the editor acted is read from
 * `defaultPrevented`, because CodeMirror calls `preventDefault` exactly when a
 * handler claims the event.
 */

import { BINDINGS, canonicalChord, chordFromEvent } from "./keys";

/** One key event as the page saw it. */
export interface KeyObservation {
  /** The chord in the binding table's notation. */
  readonly chord: string;
  /** The raw `KeyboardEvent.key`. */
  readonly key: string;
  /** The raw `KeyboardEvent.code`. */
  readonly code: string;
  /** Whether a binding in the table lists this chord. */
  readonly known: boolean;
  /** Whether the editing surface claimed the event. */
  readonly handled: boolean;
  /** The tag name of the element the event was aimed at. */
  readonly target: string;
}

/**
 * Every chord the table lists, single chords and prefix sequences alike.
 *
 * Each step is canonicalised, because the table writes modifiers in the order
 * an Emacs user says them and an event arrives in the order the browser's
 * flags are read. Without that the log would report a working chord as "not in
 * table", which is exactly the verdict the spike relies on.
 */
function chordVocabulary(): Set<string> {
  const chords = new Set<string>();
  for (const binding of BINDINGS) {
    for (const chord of binding.chords) {
      for (const step of canonicalChord(chord).split(" ")) {
        chords.add(step);
      }
    }
  }
  return chords;
}

/** How many observations the panel keeps. */
const LOG_LIMIT = 200;

/** The running key log. */
export interface KeyLog {
  /** The panel element, ready to be added to the page. */
  readonly element: HTMLElement;
  /** Everything observed so far, oldest first. */
  readonly observations: readonly KeyObservation[];
  /** Record one event. `handled` is read once the dispatch has finished. */
  record(event: KeyboardEvent, handled: boolean): void;
  /** Show or hide the panel. */
  toggle(): void;
  /** Stop listening and drop any verdict still waiting to be read. */
  dispose(): void;
}

/**
 * Build the key log and start listening.
 *
 * The listener is installed on `target` in the capture phase so that it runs
 * before anything on the page can stop propagation, and the verdict is read on
 * a later task because `preventDefault` is called by a handler further down
 * the dispatch.
 */
export function installKeyLog(target: EventTarget = window): KeyLog {
  const vocabulary = chordVocabulary();
  const observations: KeyObservation[] = [];

  const element = document.createElement("section");
  element.className = "keylog";
  element.hidden = true;

  const heading = document.createElement("header");
  heading.className = "keylog-heading";
  heading.textContent = "Key log — every chord that reached the page";
  const list = document.createElement("ol");
  list.className = "keylog-list";
  element.append(heading, list);

  function render(observation: KeyObservation): void {
    const item = document.createElement("li");
    item.className = "keylog-item";
    item.dataset["known"] = observation.known ? "yes" : "no";
    item.dataset["handled"] = observation.handled ? "yes" : "no";
    item.textContent = [
      observation.chord.padEnd(14, " "),
      observation.known ? "in table" : "not in table",
      observation.handled ? "handled" : "unhandled",
      `${observation.key}/${observation.code}`,
      `→ ${observation.target}`,
    ].join("  ");
    list.prepend(item);
    while (list.childElementCount > LOG_LIMIT) {
      list.lastElementChild?.remove();
    }
  }

  /** Verdicts still waiting for their task to run, so they can be cancelled. */
  const pending = new Set<ReturnType<typeof setTimeout>>();

  const log: KeyLog = {
    element,
    observations,
    dispose() {
      target.removeEventListener("keydown", listener, { capture: true });
      for (const handle of pending) clearTimeout(handle);
      pending.clear();
    },
    record(event, handled) {
      const chord = chordFromEvent(event);
      const targetElement = event.target;
      const observation: KeyObservation = {
        chord,
        key: event.key,
        code: event.code,
        known: vocabulary.has(chord),
        handled,
        target:
          targetElement instanceof Element
            ? targetElement.tagName.toLowerCase()
            : "window",
      };
      observations.push(observation);
      if (observations.length > LOG_LIMIT) observations.shift();
      render(observation);
    },
    toggle() {
      element.hidden = !element.hidden;
    },
  };

  const listener = ((event: KeyboardEvent): void => {
    // The verdict is only final once every handler has run, so it is read on
    // the next task rather than here.
    const handle = setTimeout(() => {
      pending.delete(handle);
      log.record(event, event.defaultPrevented);
    }, 0);
    pending.add(handle);
  }) as EventListener;

  target.addEventListener("keydown", listener, { capture: true });

  return log;
}
