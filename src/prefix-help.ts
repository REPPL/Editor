/**
 * What can follow the prefix that is half-typed, on demand.
 *
 * Emacs's `describe-prefix-bindings`: press the help character after any
 * prefix and see that prefix's bindings (`itd-2609091722353594`). On demand
 * only — there is no timer, no debounce and no idle callback here, because the
 * maintainer settled against which-key's idle popup and the on-demand form is
 * the shape `C-h k`'s own prompt already proves.
 *
 * The overlay holds no list of its own. `completionsUnder` is a filter over the
 * binding table, evaluated when the key is pressed, and a line is drawn by
 * `keyspanel.ts`'s own `bindingLine` rather than by a second renderer. The
 * candidates are supplied by whichever reader is holding the prefix, because
 * the rows a pane can actually run are the only rows it may promise: listing a
 * chord the pane cannot reach would be the dead end the suppression rule
 * exists to prevent.
 *
 * It is a prompt that happens to have a body. The key that completes a chord
 * is read here rather than let through, because by the time the overlay is
 * open the keyboard has left the reader that held the prefix, and a key
 * pressed at a closing overlay would land on the overlay or on the body and
 * never on that reader.
 */

import {
  BINDINGS,
  bindingById,
  canonicalChord,
  chordFromEvent,
  type Binding,
} from "./keys";
import { bindingLine } from "./keyspanel";
import { openOverlay, type Overlay } from "./overlay";
import { CANCELLED } from "./prose";

/** One line of the overlay: a chord under the prefix, and what it reaches. */
export interface Completion {
  readonly binding: Binding;
  /** The whole chord, in the table's notation. */
  readonly chord: string;
  /** What is left to type: the chord with the prefix and its space removed. */
  readonly rest: string;
}

/**
 * Every chord under `prefix` that one of `ids` carries, in typing order.
 *
 * The unit is the chord and not the row, which is what makes the multi-chord
 * case right without a special case: `undo` carries five chords and
 * contributes exactly one line under `C-x`, showing `u` as what is left to
 * type — its other four are not under this prefix and are not shown. A row
 * that matches the prefix twice contributes two lines, which is what
 * `select-all` does under `C-x`: `C-x h` and `C-x C-p` are two ways to reach
 * it and both are worth reading.
 *
 * Leaves, not prefix lines: under `C-x`, `C-x n n` and `C-x n w` are both
 * listed in full and there is no `C-x n — prefix` line. A flat list of
 * everything reachable is what the intent's own press release describes.
 *
 * The order is by what is left to type, ascending, with ties broken by the
 * row's position in `BINDINGS` so that it is total and stable. Deliberately
 * not the keys panel's group order: the panel is read to learn the vocabulary,
 * where headings earn their space, and this list is scanned for the next
 * keystroke, where they do not.
 */
export function completionsUnder(
  prefix: string,
  ids: readonly string[],
): Completion[] {
  // The trailing space is what stops `C-x` matching `C-x` itself or a
  // hypothetical `C-xy`.
  const under = `${canonicalChord(prefix)} `;
  const found: Completion[] = [];
  for (const id of ids) {
    const binding = bindingById(id);
    if (!binding) continue;
    for (const chord of binding.chords) {
      const canonical = canonicalChord(chord);
      if (!canonical.startsWith(under)) continue;
      found.push({
        binding,
        chord: canonical,
        rest: canonical.slice(under.length),
      });
    }
  }
  return found.sort((a, b) => {
    const byRest = a.rest.localeCompare(b.rest, undefined, {
      sensitivity: "base",
    });
    if (byRest !== 0) return byRest;
    return BINDINGS.indexOf(a.binding) - BINDINGS.indexOf(b.binding);
  });
}

/** What a reader hands over when it asks for its prefix to be described. */
export interface PrefixHelpRequest {
  /** The prefix in progress, in the table's notation, such as `C-x`. */
  readonly prefix: string;
  /** The rows the pane holding the keyboard can actually run. */
  readonly ids: readonly string[];
  /** Run the row a completed chord reached, and report its own refusals. */
  run(id: string): void;
}

/** What the overlay needs beyond the request: where it sits and how it speaks. */
export interface PrefixHelpHooks extends PrefixHelpRequest {
  /** Where the overlay is mounted. */
  readonly host?: HTMLElement;
  /** Say something in the modeline. */
  announce(message: string): void;
}

/**
 * What the row says for itself when there is no prefix to describe.
 *
 * The one route that reaches it that way is the command palette, which is open
 * over the text with nothing half-typed. The chord is read off the row rather
 * than written into the string, for the reason every other chord in a message
 * is: a chord in a string is a second copy of the table that nothing checks.
 */
export function prefixHelpNeedsAPrefix(): string {
  const chord = bindingById("prefix-help")?.chords[0];
  return chord === undefined
    ? "Press a prefix first"
    : `Press a prefix first, then ${chord}`;
}

/** Whether a keydown is a modifier held on its own. */
function isModifierOnly(event: KeyboardEvent): boolean {
  return ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(event.key);
}

/**
 * Open the overlay over one prefix.
 *
 * Built on `openOverlay`'s `onKey` hook — the hook whose own contract is how
 * `C-h k` reads `C-x C-s` as one sequence. Three consequences follow, all of
 * them wanted: the movement branches are unreachable, so the overlay has no
 * highlight and no row count, which is right because with a prefix live `C-n`
 * means "complete `C-x C-n`" rather than "move down a row"; the overlay
 * listens on `window` in the capture phase, so a `C-x` typed into it is not
 * read as the first step of `C-x o` by the pane cycle's own reader; and every
 * key is claimed, so nothing types into the chapter while it is open.
 *
 * The chosen row is run in `onClose`, after the keyboard has already gone back
 * where it came from, so the completed command acts on a focused pane rather
 * than on an overlay that is halfway gone.
 */
export function openPrefixHelp(hooks: PrefixHelpHooks): Overlay {
  const completions = completionsUnder(hooks.prefix, hooks.ids);

  const element = document.createElement("section");
  element.className = "prefix-help";
  element.setAttribute("role", "dialog");
  // `Prefix` rather than `Keys`, so the modeline can tell this and the keys
  // panel apart while either holds the keyboard.
  element.dataset["paneLabel"] = "Prefix";

  const heading = document.createElement("h2");
  heading.className = "prefix-help-heading";

  const hint = document.createElement("p");
  hint.className = "prefix-help-hint";
  // Read off the row, the way the keys panel's own hint is, so the cancel
  // chords are never typed into a string.
  const quit = bindingById("keyboard-quit");
  hint.textContent = `Close with ${(quit?.chords ?? []).join(" or ")}.`;

  const list = document.createElement("dl");
  list.className = "keys-list";
  element.append(heading, hint, list);

  /** Draw the heading and the lines for one prefix, deeper or the first. */
  function draw(shown: string, entries: readonly Completion[]): void {
    // The same spelling the modeline's prefix cell uses for a prefix in
    // progress, so the two read as one thing.
    heading.textContent = `${shown}-`;
    element.setAttribute("aria-label", `What can follow ${shown}`);
    list.replaceChildren();
    for (const entry of entries) {
      // One `kbd` carrying what is left to type, not the whole chord: the
      // prefix is already stated once, in the heading above.
      const { term, detail } = bindingLine(entry.binding, [entry.rest]);
      // The overlay's unit is a chord, and two of its lines could in principle
      // carry the same row. The panel neither sets this nor reads it.
      term.dataset["chord"] = entry.chord;
      list.append(term, detail);
    }
  }

  draw(canonicalChord(hooks.prefix), completions);

  const steps: string[] = [];
  let chosenId: string | null = null;
  let refusal: string | null = null;

  return openOverlay({
    element,
    ...(hooks.host ? { host: hooks.host } : {}),
    rowCount: () => 0,
    onKey: (event) => {
      if (isModifierOnly(event)) return true;
      steps.push(canonicalChord(chordFromEvent(event)));
      const chord = `${canonicalChord(hooks.prefix)} ${steps.join(" ")}`;
      const hit = completions.find((entry) => entry.chord === chord);
      if (hit) {
        chosenId = hit.binding.id;
        return false;
      }
      // A step that is itself a longer prefix narrows the list and keeps
      // reading. This is the same list `C-h` after the second step reaches
      // directly, arrived at the other way.
      const deeper = completionsUnder(chord, hooks.ids);
      if (deeper.length > 0) {
        draw(chord, deeper);
        return true;
      }
      refusal = `${chord} is not bound`;
      return false;
    },
    onClose: (chosen) => {
      if (chosen && chosenId !== null) {
        hooks.run(chosenId);
        return;
      }
      hooks.announce(refusal ?? CANCELLED);
    },
  });
}
