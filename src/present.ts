/**
 * The present window: one deck, and nothing else.
 *
 * A second window rather than a pane inside the editor, because
 * `tauri.conf.json` sets `script-src 'self'` and a `srcdoc` iframe inherits
 * it, so an inline-script deck could not run in the editing window. This page
 * loads from the same bundle, under the same policy, with no relaxation — and
 * it is the window Alice projects.
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
}

/** The engine, once the vendored script has run. Absent in a test. */
function engine(): RevealEngine | null {
  const global = globalThis as { Reveal?: RevealEngine };
  return global.Reveal ?? null;
}

/** The speaker-notes plugin, once the vendored script has run. */
function notesPlugin(): unknown {
  return (globalThis as { RevealNotes?: unknown }).RevealNotes ?? null;
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
  const plugin = notesPlugin();
  void reveal.initialize({
    ...DECK_CONFIG,
    ...(plugin === null ? {} : { plugins: [plugin] }),
  });
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
  const draw = async (): Promise<void> => {
    try {
      started = await show(await pendingDeck(), started);
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
