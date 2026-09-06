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

import { invoke } from "@tauri-apps/api/core";

import { dataResolver, referencesOf, type Resolver } from "./core/assets";
import { buildDeck } from "./core/deck";
import { parseChapter } from "./core/parse";
import { DECK_CONFIG, renderSlides } from "./core/render/slides";
import { inShell, pendingDeck, readAsset, type DeckSource } from "./doctree";
import Reveal, { type RevealEngine } from "./vendor/reveal/reveal.esm.js";

export type { RevealEngine };

/**
 * The deck engine, as a module rather than as a global.
 *
 * This is the seam `iss-2609061132369973` was about. The window used to load
 * the vendored UMD build from its own `<script>` tag and read the `Reveal` the
 * file assigns to `globalThis`. That global exists only when the file is
 * *executed* as a script: served raw by the dev server it is, and evaluated
 * into a jsdom global by a test it is, so both of those passed — but a
 * production build hands the same file to the bundler, which reads the UMD's
 * first branch, decides it is CommonJS, and turns `module.exports = factory()`
 * into a module export. No global is ever assigned, `globalThis.Reveal` is
 * `undefined`, and the release window showed one slide with dead controls.
 *
 * So the engine is imported, from the ES-module build that has one meaning in
 * every toolchain: the dev server serves it as the module it is, the bundler
 * bundles it as the module it is, and a test imports it as the module it is.
 * Nothing here reads a global, and `engine_is_the_imported_module` in
 * `present.test.ts` holds it to that with no global set at all.
 *
 * The `null` is not dead: it is the runtime half of the same guard. If a
 * future toolchain hands this import something that is not the engine, the
 * window says `absent` in its log rather than quietly showing one slide.
 */
export function engine(): RevealEngine | null {
  return typeof Reveal?.initialize === "function" ? Reveal : null;
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

/**
 * What one box looks like to the layout engine, as the log records it.
 *
 * A slide that is not shown and a slide that is shown but has no height look
 * the same from the outside, and the difference is the whole of the bug this
 * shape was written for, so both the `display` and the measured height are
 * here.
 */
export interface BoxReport {
  /** Whether the element was on the page at all. */
  readonly found: boolean;
  readonly classes: string;
  readonly display: string;
  readonly position: string;
  readonly width: number;
  readonly height: number;
  readonly fontSize: string;
}

/** One reading of the present window's state, one JSON object per line. */
export interface DeckObservation {
  readonly at: number;
  /** What had just happened: `mount`, `ready`, `slidechanged`, `resize`. */
  readonly phase: string;
  /** Slides in the deck, stacks excluded. */
  readonly slides: number;
  /** Top-level `<section>`s, which is what reveal.js counts along. */
  readonly columns: number;
  /** Where reveal.js says it is, or `null` before it has run. */
  readonly indexh: number | null;
  readonly indexv: number | null;
  /** Whether the engine's own methods exist yet. */
  readonly engine: string;
  /** The position of the slide carrying `present`, or −1 when none does. */
  readonly presentAt: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly bodyFontSize: string;
  /** The size the deck's own type scale resolves to at this viewport. */
  readonly headlineFontSize: string;
  readonly reveal: BoxReport;
  readonly slidesBox: BoxReport;
  /** The first three top-level sections, in order. */
  readonly sections: readonly BoxReport[];
  /** Each control the engine drew, and whether it is disabled. */
  readonly controls: Readonly<Record<string, boolean>>;
}

/** How one box measures, or a plain "not there" when it is absent. */
function boxReport(element: Element | null): BoxReport {
  if (element === null) {
    return {
      found: false,
      classes: "",
      display: "",
      position: "",
      width: 0,
      height: 0,
      fontSize: "",
    };
  }
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return {
    found: true,
    classes: element.className,
    display: style.display,
    position: style.position,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    fontSize: style.fontSize,
  };
}

/**
 * Read the present window's state, without changing any of it.
 *
 * Pure in the sense that matters: it asks the page questions and answers them.
 * The same function serves the log a scripted run reads back and the jsdom
 * test that holds the shape of that log to what the bug needed to see.
 */
export function observeDeck(
  root: ParentNode,
  phase: string,
  reveal: RevealEngine | null = engine(),
): DeckObservation {
  // The root's own document, not the global one: the observation describes the
  // page it was handed, and a caller that hands over a fragment or a second
  // document should not be answered with facts about this one.
  const owner: Document =
    root instanceof Document ? root : (root.ownerDocument ?? document);
  const view: Window = owner.defaultView ?? window;
  const indices = reveal?.getIndices?.() ?? null;
  const columns = [...root.querySelectorAll(".reveal .slides > section")];
  const slides = slideElements(root);
  const controls: Record<string, boolean> = {};
  for (const button of root.querySelectorAll(".reveal .controls button")) {
    const name = [...button.classList].find((one) => one.startsWith("navigate-")) ?? "?";
    controls[name] = (button as HTMLButtonElement).disabled;
  }
  const headline = root.querySelector(".reveal .slides section.present .headline");
  return {
    at: Date.now(),
    phase,
    slides: slides.length,
    columns: columns.length,
    indexh: indices?.h ?? null,
    indexv: indices?.v ?? null,
    engine:
      reveal === null
        ? "absent"
        : [
            "initialize",
            typeof reveal.sync === "function" ? "sync" : "",
            typeof reveal.slide === "function" ? "slide" : "",
            reveal.isReady?.() === true ? "ready" : "",
          ]
            .filter((one) => one !== "")
            .join("+"),
    presentAt: slides.findIndex((slide) => slide.classList.contains("present")),
    viewportWidth: view.innerWidth,
    viewportHeight: view.innerHeight,
    bodyFontSize: view.getComputedStyle(owner.body).fontSize,
    headlineFontSize:
      headline === null ? "" : view.getComputedStyle(headline).fontSize,
    reveal: boxReport(root.querySelector(".reveal")),
    slidesBox: boxReport(root.querySelector(".reveal .slides")),
    sections: columns.slice(0, 3).map((section) => boxReport(section)),
    controls,
  };
}

/**
 * Append one observation to the run's log, when a run asked for one.
 *
 * `EDITOR_PRESENT_LOG` names the file, the shell resolves it and refuses
 * anything outside its own scratch directories, and with the variable unset
 * the command writes nothing and answers `false`. Nothing here is on the path
 * of an ordinary launch.
 */
export async function logObservation(observation: DeckObservation): Promise<boolean> {
  if (!inShell()) return false;
  try {
    return await invoke<boolean>("present_log", {
      line: JSON.stringify(observation),
    });
  } catch (error) {
    console.warn(`present log: ${String(error)}`);
    return false;
  }
}

/**
 * The recorder one window logs through.
 *
 * The first `false` answer latches it off for the rest of the window's life:
 * with no log configured — which is every ordinary launch — a dragged resize
 * would otherwise cross to the shell once a frame to be told the same thing
 * again. The writer is a parameter so a test can answer for the shell.
 */
export function createRecorder(
  root: ParentNode,
  write: (observation: DeckObservation) => Promise<boolean> = logObservation,
): (phase: string) => void {
  let logging = true;
  return (phase: string): void => {
    if (!logging) return;
    void write(observeDeck(root, phase)).then((written) => {
      logging = written;
    });
  };
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
export function deckFragment(
  text: string,
  resolve: Resolver,
  variant: string | null = null,
): string {
  return renderSlides(buildDeck(parseChapter(text), { variant }), resolve, variant);
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

/**
 * The first slide of a deck, which is the one a deck opens on.
 *
 * A column of several slides is a `<section>` holding them, so the slide is
 * the innermost one; the column itself is not a slide and carries no face.
 */
export function firstSlide(slides: Element): Element[] {
  const found: Element[] = [];
  let section = slides.querySelector(":scope > section");
  while (section !== null) {
    found.push(section);
    section = section.querySelector(":scope > section");
  }
  return found;
}

/**
 * Tell a running engine which deck it has, and put it on the first slide.
 *
 * reveal.js reads the sections once, at the moment it starts, and keeps its
 * own index of where it is. A fragment that lands after that leaves it holding
 * an index of nothing: no section is marked `present`, so this stylesheet
 * shows none of them, and the controls stay disabled because the engine
 * believes there is nowhere to go. `sync()` makes it read the deck again and
 * `slide(0, 0)` gives it somewhere to be — after which the first slide is up
 * and the controls say what the deck can do.
 */
function settle(reveal: RevealEngine | null): void {
  reveal?.sync?.();
  reveal?.slide?.(0, 0);
}

/**
 * Put a deck on the page and set the engine going, or resync a running one.
 *
 * The engine is settled after the fragment lands in both directions: on the
 * first deck once `initialize` has resolved — it resolves on the engine's own
 * `ready`, which is the first moment `sync` and `slide` exist to be called —
 * and on every deck after that as soon as the markup is in. Whichever order
 * the two arrive in, the window ends up showing slide one.
 *
 * The engine is a parameter, defaulting to the imported one, so that a test
 * can drive a stand-in — or a second, freshly loaded copy of the real engine —
 * without any of it going through a global.
 */
export function mountDeck(
  root: ParentNode,
  fragment: string,
  started: boolean,
  reveal: RevealEngine | null = engine(),
): boolean {
  const slides = root.querySelector(".reveal .slides");
  if (slides === null) return started;
  slides.innerHTML = fragment;
  // A deck opens on its first slide, and says so in the markup rather than
  // waiting to be told. The engine sets the same class a moment later; until
  // it does, this is the difference between a deck and a blank window.
  for (const section of firstSlide(slides)) section.classList.add("present");
  if (reveal === null) return started;
  if (started) {
    // A second Present replaces the deck in the window that is already open.
    settle(reveal);
    return true;
  }
  Promise.resolve(reveal.initialize({ ...DECK_CONFIG })).then(
    () => {
      settle(reveal);
    },
    (error: unknown) => {
      console.warn(`the deck engine: ${String(error)}`);
    },
  );
  return true;
}

/** Build and show the deck the shell is holding. */
export async function show(source: DeckSource, started: boolean): Promise<boolean> {
  const assets = await readAssets(source.text, source.chapterPath);
  document.title = source.chapterTitle;
  // The document's default variant, which is the one a publish builds: the
  // deck at the lectern is the deck at the link, blocks and all.
  const variant = source.variant === "" ? null : source.variant;
  return mountDeck(
    document,
    deckFragment(source.text, dataResolver(assets), variant),
    started,
  );
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

  // Off unless the run named a file; see `present_log` in `present.rs` for
  // what it accepts and where it refuses to write.
  const record = createRecorder(document);
  window.addEventListener("resize", () => {
    record("resize");
  });

  const reveal = engine();
  if (reveal?.on) {
    for (const type of ["ready", "slidechanged"]) {
      reveal.on(type, () => {
        notes.draw(document);
        record(type);
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
    record("mount");
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
