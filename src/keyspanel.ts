/**
 * The keys panel: the binding table, rendered.
 *
 * It reads `BINDINGS` at open time rather than copying it, which is the whole
 * of the promise that an entry changed in one place changes the panel, the
 * tooltips, and the tests together. It is an overlay, so it moves and cancels
 * like every other one.
 */

import {
  BINDINGS,
  BINDING_GROUPS,
  GROUP_LABELS,
  bindingById,
  type Binding,
} from "./keys";
import { openOverlay, type Overlay } from "./overlay";

/** What the owner column says about a row, where it says anything. */
const OWNER_NOTES: Readonly<Record<string, string>> = {
  shell: "menu",
  codemirror: "editor",
  app: "not yet wired",
};

/** Build the panel's element and the list of rows it can move between. */
function render(): { element: HTMLElement; rows: HTMLElement[] } {
  const element = document.createElement("section");
  element.className = "keys-panel";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-label", "Keys");

  const heading = document.createElement("h2");
  heading.className = "keys-panel-heading";
  heading.textContent = "Keys";

  const hint = document.createElement("p");
  hint.className = "keys-panel-hint";
  const quit = bindingById("keyboard-quit");
  hint.textContent = `Close with ${(quit?.chords ?? []).join(" or ")}.`;

  element.append(heading, hint);

  const rows: HTMLElement[] = [];
  for (const group of BINDING_GROUPS) {
    const inGroup = BINDINGS.filter((binding) => binding.group === group);
    if (inGroup.length === 0) continue;

    const section = document.createElement("div");
    section.className = "keys-group";
    const title = document.createElement("h3");
    title.className = "keys-group-heading";
    title.textContent = GROUP_LABELS[group];
    section.append(title);

    const list = document.createElement("dl");
    list.className = "keys-list";
    for (const binding of inGroup) {
      list.append(...row(binding, rows));
    }
    section.append(list);
    element.append(section);
  }

  return { element, rows };
}

/** One row: the label, the chords, and where it is answered. */
function row(binding: Binding, rows: HTMLElement[]): HTMLElement[] {
  const term = document.createElement("dt");
  term.className = "keys-row";
  term.dataset["binding"] = binding.id;
  term.textContent = binding.label;

  const note = OWNER_NOTES[binding.owner];
  if (note !== undefined) {
    const owner = document.createElement("span");
    owner.className = "keys-owner";
    owner.textContent = note;
    term.append(" ", owner);
  }

  const detail = document.createElement("dd");
  detail.className = "keys-chords";
  for (const chord of binding.chords) {
    const key = document.createElement("kbd");
    key.textContent = chord;
    detail.append(key);
  }

  rows.push(term);
  return [term, detail];
}

/** Open the keys panel over `host`. */
export function openKeysPanel(host?: HTMLElement): Overlay {
  const { element, rows } = render();
  const overlay = openOverlay({
    element,
    ...(host ? { host } : {}),
    rowCount: () => rows.length,
    onMove: (index) => {
      rows.forEach((entry, at) => {
        entry.dataset["current"] = at === index ? "yes" : "no";
      });
      rows[index]?.scrollIntoView({ block: "nearest" });
    },
  });
  return overlay;
}

/**
 * Give a control the chord that reaches the same action.
 *
 * Tooltips are generated, never typed: a chord written into a `title` string
 * is a second copy of the table that nothing checks.
 */
export function describeChord(id: string, prose: string): string {
  const binding = bindingById(id);
  if (!binding || binding.chords.length === 0) return prose;
  return `${prose} (${binding.chords[0]})`;
}
