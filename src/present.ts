/**
 * The present window: one deck, its speaker notes, and nothing else.
 *
 * A second window rather than a pane inside the editor, because
 * `tauri.conf.json` sets `script-src 'self'` and a `srcdoc` iframe inherits
 * it, so an inline-script deck could not run in the editing window. This page
 * loads from the same bundle, under the same policy, with no relaxation — and
 * it is the window Alice projects.
 *
 * The notes are a split view inside this window rather than reveal.js's own
 * speaker popup. That popup calls `window.open("about:blank")` and writes an
 * inline-script document into it; an `about:blank` popup inherits its
 * opener's policy, and this window's is `script-src 'self'`, so the script
 * never runs and the popup stays blank. Relaxing the policy to make a popup
 * work would relax it for the deck too, which is the one window that renders
 * the author's own Markdown, so the notes come here instead: `s` opens them,
 * `s` closes them, and the deck keeps the rest of the window.
 *
 * The deck is built here, from the text of the buffer the shell is holding.
 * Nothing is written: the deck is a string, the pictures are bytes the shell
 * read, and closing the window loses nothing because the deck was never where
 * the work lived.
 */

import { dataResolver, referencesOf, type Resolver } from "./core/assets";
import { buildDeck } from "./core/deck";
import { parseChapter } from "./core/parse";
import { DECK_CONFIG, renderSlides } from "./core/render/slides";
import { inShell, pendingDeck, readAsset, type DeckSource } from "./doctree";

/** The shape reveal.js exposes on the global, which is how it is vendored. */
interface RevealEngine {
  initialize(config: Record<string, unknown>): Promise<void> | void;
  sync(): void;
  slide(horizontal: number, vertical?: number): void;
  on?(type: string, listener: () => void): void;
}

/** The engine, once the vendored script has run. Absent in a test. */
function engine(): RevealEngine | null {
  const global = globalThis as { Reveal?: RevealEngine };
  return global.Reveal ?? null;
}

/**
 * Every slide of a deck in reading order, stacks excluded.
 *
 * A stack is the parent of a column of vertical slides, not a slide, so it
 * carries no notes and is never what the speaker is looking at.
 */
export function slideElements(root: ParentNode): Element[] {
  return [...root.querySelectorAll(".reveal .slides section")].filter(
    (section) => !section.classList.contains("stack"),
  );
}

/** The notes one slide carries, as markup, or the empty string. */
export function notesOf(slide: Element | null): string {
  return slide?.querySelector("aside.notes")?.innerHTML ?? "";
}

/** The headline one slide carries, for the speaker's "next" line. */
export function headlineOf(slide: Element | null): string {
  return slide?.querySelector(".headline")?.textContent?.trim() ?? "";
}

/** The speaker's notes, in a split view beside the deck. */
export interface NotesView {
  readonly element: HTMLElement;
  readonly isOpen: boolean;
  /** Open the notes, or close them. */
  toggle(): void;
  /** Draw the notes of the slide in force, and what follows it. */
  draw(root: ParentNode): void;
}

/**
 * Build the split view.
 *
 * It is a sibling of the deck, not a child: the deck's own stylesheet sizes
 * every slide to the space it is given, so taking a third of the window for
 * the notes reflows the slides rather than scaling them.
 */
export function createNotesView(host: HTMLElement): NotesView {
  const element = document.createElement("aside");
  element.className = "present-notes";
  element.hidden = true;

  const heading = document.createElement("h1");
  heading.className = "present-notes-heading";
  heading.textContent = "Speaker notes";

  const body = document.createElement("div");
  body.className = "present-notes-body";

  const next = document.createElement("p");
  next.className = "present-notes-next";

  element.append(heading, body, next);
  host.append(element);

  const view: NotesView = {
    element,
    get isOpen(): boolean {
      return !element.hidden;
    },
    toggle(): void {
      element.hidden = !element.hidden;
      host.dataset["notes"] = element.hidden ? "closed" : "open";
    },
    draw(root: ParentNode): void {
      const slides = slideElements(root);
      const at = slides.findIndex((slide) => slide.classList.contains("present"));
      const current = (at === -1 ? slides[0] : slides[at]) ?? null;
      const following = at === -1 ? (slides[1] ?? null) : (slides[at + 1] ?? null);
      const notes = notesOf(current);
      body.innerHTML = notes;
      body.dataset["empty"] = notes === "" ? "yes" : "no";
      if (notes === "") body.textContent = "No notes on this slide.";
      const headline = headlineOf(following);
      next.textContent = headline === "" ? "" : `Next: ${headline}`;
    },
  };
  host.dataset["notes"] = "closed";
  return view;
}

/**
 * The deck's markup for one chapter's text.
 *
 * Pure: text in, markup out. It reads no file, writes none, and holds nothing
 * between calls, so presenting the same chapter twice gives the same deck and
 * presenting new text gives the new talk.
 */
export function deckFragment(text: string, resolve: Resolver): string {
  return renderSlides(buildDeck(parseChapter(text)), resolve);
}

/**
 * Read every picture a chapter refers to, through the shell.
 *
 * One round trip per reference, and a reference the shell refuses — outside
 * the document, not an image this phase carries, or above the copied-asset
 * threshold — is simply absent from the map, which the resolver reports on the
 * slide rather than failing the whole deck over.
 */
export async function readAssets(
  text: string,
  chapterPath: string,
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const reference of referencesOf(parseChapter(text))) {
    try {
      const asset = await readAsset(chapterPath, reference);
      found.set(reference, `data:${asset.mime};base64,${asset.base64}`);
    } catch (error) {
      console.warn(`${reference}: ${String(error)}`);
    }
  }
  return found;
}

/** Put a deck on the page and set the engine going, or resync a running one. */
export function mountDeck(root: ParentNode, fragment: string, started: boolean): boolean {
  const slides = root.querySelector(".reveal .slides");
  if (slides === null) return started;
  slides.innerHTML = fragment;
  const reveal = engine();
  if (reveal === null) return started;
  if (started) {
    // A second Present replaces the deck in the window that is already open.
    reveal.sync();
    reveal.slide(0, 0);
    return true;
  }
  void reveal.initialize({ ...DECK_CONFIG });
  return true;
}

/** Build and show the deck the shell is holding. */
export async function show(source: DeckSource, started: boolean): Promise<boolean> {
  const assets = await readAssets(source.text, source.chapterPath);
  document.title = source.chapterTitle;
  return mountDeck(document, deckFragment(source.text, dataResolver(assets)), started);
}

/** Say why there is nothing to show, on the page rather than in a console. */
function reportEmpty(message: string): void {
  const slides = document.querySelector(".reveal .slides");
  if (slides === null) return;
  slides.innerHTML = `<section class="slide slide-section present"><p>${message.replace(
    /[<&]/g,
    (character) => (character === "<" ? "&lt;" : "&amp;"),
  )}</p></section>`;
}

/**
 * Ask the shell for the deck, and ask again whenever it says there is a new
 * one.
 *
 * The window outlives one Present: a second Present emits the event rather
 * than opening a second window, so there is never a second copy of the deck or
 * of its text.
 */
async function start(): Promise<void> {
  let started = false;
  const stage = document.querySelector<HTMLElement>(".present-stage") ?? document.body;
  const notes = createNotesView(stage);

  // `s` is the key reveal.js uses for the speaker view, so it is the key that
  // opens the notes here. It is ignored while the author is typing into
  // something, and while a modifier is held, so it never eats a real chord.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "s" || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, [contenteditable]")) return;
    event.preventDefault();
    notes.toggle();
    notes.draw(document);
  });

  const reveal = engine();
  if (reveal?.on) {
    for (const type of ["ready", "slidechanged"]) {
      reveal.on(type, () => {
        notes.draw(document);
      });
    }
  }

  const draw = async (): Promise<void> => {
    try {
      started = await show(await pendingDeck(), started);
      notes.draw(document);
    } catch (error) {
      reportEmpty(String(error));
    }
  };
  const { listen } = await import("@tauri-apps/api/event");
  await listen("present://deck", () => {
    void draw();
  });
  await draw();
}

if (inShell()) {
  void start();
}
