/**
 * Present: the chapter becomes a deck, and the chapter is not touched.
 *
 * The two criteria this file is answerable for are both about what does *not*
 * happen. Presenting reads a string and returns a string, so the chapter's
 * bytes are what they were and no deck file is written anywhere; and a second
 * Present in the same session builds the new text rather than adding a second
 * copy of the old one.
 */

import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { pathResolver } from "./core/assets";
import { DECK_CONFIG, DECK_STYLESHEET } from "./core/render/slides";
import {
  createNotesView,
  createRecorder,
  deckFragment,
  engine,
  headlineOf,
  mountDeck,
  notesOf,
  observeDeck,
  slideElements,
  type RevealEngine,
} from "./present";

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Every file under a folder, with its size, in one sorted list. */
function listing(folder: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) found.push(...listing(path));
    else found.push(`${path} ${String(statSync(path).size)}`);
  }
  return found;
}

/**
 * A synthetic document folder on disk, holding one chapter — thrown away by
 * the OS's own temp-directory cleanup — so "no deck file is written" is
 * proved against a real folder listing rather than an in-memory string.
 */
function documentFolder(chapter: string): { document: string; chapter: string } {
  const document = mkdtempSync(join(tmpdir(), "present-"));
  const path = join(document, "chapter.md");
  writeFileSync(path, chapter);
  return { document, chapter: path };
}

describe("presenting a chapter", () => {
  it("leaves the chapter's bytes untouched", () => {
    const { chapter } = documentFolder("## The first reading\n\nAlice reads first.\n");
    const before = readFileSync(chapter);
    const text = before.toString("utf8");
    const fragment = deckFragment(text, pathResolver());
    expect(fragment.length).toBeGreaterThan(0);
    // The core took a string and returned a string.
    expect(text).toBe(before.toString("utf8"));
    expect(sha256(readFileSync(chapter))).toBe(sha256(before));
  });

  it("writes no deck file anywhere in the document folder", () => {
    const { document, chapter } = documentFolder(
      "## The first reading\n\nAlice reads first.\n",
    );
    const before = listing(document);
    deckFragment(readFileSync(chapter, "utf8"), pathResolver());
    expect(listing(document)).toEqual(before);
  });

  it("builds the deck from the buffer rather than from the file", () => {
    // The text presented is the buffer's; an unsaved edit presents.
    const { chapter } = documentFolder("## The first reading\n\nAlice reads first.\n");
    const edited = readFileSync(chapter, "utf8").replace(
      "## The first reading",
      "## The second reading",
    );
    const fragment = deckFragment(edited, pathResolver());
    expect(fragment).toContain("The second reading");
    expect(fragment).not.toContain("The first reading");
    expect(readFileSync(chapter, "utf8")).toContain("## The first reading");
  });

  it("builds the variant a publish would build", () => {
    // The shell hands the present window the document's default variant, so
    // the deck at the lectern is the deck at the link — blocks and spans alike.
    const source = [
      "# One",
      "",
      "## Beginnings",
      "",
      '::: {.variant variant="full"}',
      "Only in the paper.",
      ":::",
      "",
      'A [talk aside]{.variant variant="talk"} and a [paper aside]{.variant variant="paper"}.',
      "",
    ].join("\n");

    const talk = deckFragment(source, pathResolver(), "talk");
    expect(talk).not.toContain("Only in the paper");
    expect(talk).toContain("talk aside");
    expect(talk).not.toContain("paper aside");

    const full = deckFragment(source, pathResolver(), "full");
    expect(full).toContain("Only in the paper");

    // A document that declares no variant still presents everything.
    const every = deckFragment(source, pathResolver());
    expect(every).toContain("Only in the paper");
    expect(every).toContain("paper aside");
  });

  it("rebuilds the deck from the buffer on a second Present", () => {
    const first = deckFragment("# One\n\n## Beginnings\n\nA.\n", pathResolver());
    const second = deckFragment(
      "# One\n\n## Beginnings renamed\n\nA.\n\nAnd another paragraph.\n",
      pathResolver(),
    );
    expect(first).toContain("Beginnings");
    expect(second).toContain("Beginnings renamed");
    expect(second).toContain("And another paragraph.");
    // Nothing accumulated: the same text builds the same deck.
    expect(deckFragment("# One\n\n## Beginnings\n\nA.\n", pathResolver())).toBe(first);
  });
});

describe("the present window", () => {
  /**
   * The mounted markup with every mark the mount added taken back off.
   *
   * `present` is added with `classList`, so it arrives appended to a class
   * that was there — ` present"` — or as the whole attribute on an element
   * that had none. Both spellings, everywhere they occur: an assertion that
   * undid only the first mark would call a correct mount a regression the
   * moment a fixture grew a column.
   */
  function withoutPresent(html: string): string {
    return html.replaceAll(' class="present"', "").replaceAll(' present"', '"');
  }

  it("mounts the fragment where reveal.js looks for it", () => {
    document.body.innerHTML = '<div class="reveal"><div class="slides"></div></div>';
    const fragment = deckFragment("## Beginnings\n\nA.\n", pathResolver());
    // No engine is handed over, so the page is filled and nothing starts.
    expect(mountDeck(document, fragment, false, null)).toBe(false);
    const slides = document.querySelector(".reveal .slides");
    expect(slides?.querySelectorAll("section")).toHaveLength(1);
    // The markup is the fragment's, with the classes that say which slide the
    // deck opens on added to it — every one of them, since a column is marked
    // as well as the slide inside it.
    expect(withoutPresent(slides?.innerHTML ?? "")).toBe(fragment);
    expect(
      slides?.querySelector("section")?.classList.contains("present"),
    ).toBe(true);
  });

  it("mounts a column of slides as the fragment it was given, too", () => {
    // The columned case, where `present` is added twice: an assertion that
    // stripped only the first would fail here for the right markup.
    document.body.innerHTML = '<div class="reveal"><div class="slides"></div></div>';
    const fragment = deckFragment(
      "## One\n\n### Below\n\nA sub-section.\n",
      pathResolver(),
    );
    expect(fragment).not.toContain("present");
    mountDeck(document, fragment, false, null);
    const slides = document.querySelector(".reveal .slides");
    expect(withoutPresent(slides?.innerHTML ?? "")).toBe(fragment);
    // Both marks were made: the column and the first slide inside it.
    expect(slides?.querySelectorAll(".present")).toHaveLength(2);
  });

  it("replaces the deck rather than adding a second one", () => {
    document.body.innerHTML = '<div class="reveal"><div class="slides"></div></div>';
    mountDeck(document, deckFragment("## One\n", pathResolver()), false, null);
    mountDeck(document, deckFragment("## Two\n", pathResolver()), false, null);
    const slides = document.querySelector(".reveal .slides");
    expect(slides?.querySelectorAll("section")).toHaveLength(1);
    expect(slides?.textContent).toBe("Two");
  });

  it("does nothing at all when the page carries no deck container", () => {
    document.body.innerHTML = "<p>Not a deck.</p>";
    expect(mountDeck(document, "<section></section>", false, null)).toBe(false);
    expect(document.body.innerHTML).toBe("<p>Not a deck.</p>");
  });
});

/**
 * The deck opens on its first slide.
 *
 * reveal.js reads the sections once, when it starts, and keeps its own index
 * of where it is. Handed a deck that lands after that — or told to start
 * before the markup is in — it holds an index of nothing: no section is marked
 * `present`, so the deck's stylesheet shows none of them, and every control
 * stays disabled because the engine believes there is nowhere to go. That is a
 * window that opens empty with a grey back arrow, which is what
 * `iss-2609051915021301` reported. These are the two orderings, and what has
 * to happen in each.
 */
describe("starting the engine on a deck", () => {
  /** A stand-in engine that records the order it was called in. */
  function fakeEngine(calls: string[]): RevealEngine {
    return {
      initialize(config: Record<string, unknown>) {
        calls.push(`initialize:${String(config["disableLayout"])}`);
        return Promise.resolve();
      },
      sync() {
        calls.push(`sync:${String(document.querySelectorAll(".slides section").length)}`);
      },
      slide(horizontal: number, vertical?: number) {
        calls.push(`slide:${String(horizontal)},${String(vertical)}`);
      },
    };
  }

  const DECK = "## One\n\nThe first face.\n\n## Two\n\nThe second face.\n";

  function stage(): void {
    document.body.innerHTML =
      '<div class="present-stage"><div class="reveal"><div class="slides"></div></div></div>';
  }

  it("puts the fragment in before it starts the engine, and syncs after", async () => {
    const calls: string[] = [];
    stage();
    const reveal = fakeEngine(calls);
    expect(mountDeck(document, deckFragment(DECK, pathResolver()), false, reveal)).toBe(
      true,
    );
    // The engine is started on a deck that is already there, so `sync` sees
    // both slides; and the sync happens once `initialize` has resolved, which
    // is the first moment `sync` and `slide` exist to be called at all.
    expect(calls).toEqual(["initialize:true"]);
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toEqual(["initialize:true", "sync:2", "slide:0,0"]);
  });

  it("syncs a running engine the moment a second deck lands", () => {
    const calls: string[] = [];
    stage();
    expect(
      mountDeck(document, deckFragment(DECK, pathResolver()), true, fakeEngine(calls)),
    ).toBe(true);
    expect(calls).toEqual(["sync:2", "slide:0,0"]);
  });

  it("shows the first slide even with no engine at all", () => {
    stage();
    mountDeck(document, deckFragment(DECK, pathResolver()), false, null);
    const slides = slideElements(document);
    expect(slides.findIndex((slide) => slide.classList.contains("present"))).toBe(0);
    expect(headlineOf(slides[0] ?? null)).toBe("One");
    expect(slides[1]?.classList.contains("present")).toBe(false);
  });

  it("opens a column of several slides on the first of them", () => {
    // A column is a `<section>` holding the slides, and the column is not
    // itself a slide: both have to be shown for the first slide to be seen.
    stage();
    mountDeck(
      document,
      deckFragment("## One\n\n### Below\n\nA sub-section.\n", pathResolver()),
      false,
      null,
    );
    const column = document.querySelector(".reveal .slides > section");
    expect(column?.querySelectorAll("section").length).toBeGreaterThan(0);
    expect(column?.classList.contains("present")).toBe(true);
    expect(column?.querySelector("section")?.classList.contains("present")).toBe(true);
  });

  it("reports the empty window the maintainer saw, and the deck that follows", () => {
    stage();
    const empty = observeDeck(document, "before", null);
    expect(empty.slides).toBe(0);
    expect(empty.presentAt).toBe(-1);
    expect(empty.indexh).toBeNull();

    mountDeck(document, deckFragment(DECK, pathResolver()), false, null);
    const shown = observeDeck(document, "mount", null);
    expect(shown.phase).toBe("mount");
    expect(shown.slides).toBe(2);
    expect(shown.columns).toBe(2);
    // The one number that separates an empty window from a deck.
    expect(shown.presentAt).toBe(0);
    expect(shown.sections[0]?.classes).toContain("present");
    expect(shown.sections[1]?.classes).not.toContain("present");
    expect(shown.reveal.found).toBe(true);
    expect(shown.slidesBox.found).toBe(true);
    expect(typeof shown.bodyFontSize).toBe("string");
  });

  it("reads the page it was handed, not the one it is running in", async () => {
    // The observation describes the root it was given. A second document with
    // a deck in it is the cheapest way to see that: the running page has an
    // empty stage, and the answer is about the other one.
    stage();
    const other = document.implementation.createHTMLDocument("elsewhere");
    other.body.innerHTML =
      '<div class="reveal"><div class="slides"></div></div>';
    mountDeck(other, deckFragment(DECK, pathResolver()), false, null);

    const seen = observeDeck(other, "mount", null);
    expect(seen.slides).toBe(2);
    expect(seen.presentAt).toBe(0);
    expect(observeDeck(document, "mount", null).slides).toBe(0);
    await Promise.resolve();
  });

  it("stops asking the shell for a log once it has been told there is none", async () => {
    // Every ordinary launch has no log configured, and a dragged resize would
    // otherwise cross to the shell once a frame to be told so again.
    stage();
    const asked: string[] = [];
    const record = createRecorder(document, (observation) => {
      asked.push(observation.phase);
      return Promise.resolve(false);
    });

    record("mount");
    await Promise.resolve();
    record("resize");
    record("resize");
    await Promise.resolve();
    expect(asked).toEqual(["mount"]);

    // And a run that does have a log keeps writing.
    const written: string[] = [];
    const logging = createRecorder(document, (observation) => {
      written.push(observation.phase);
      return Promise.resolve(true);
    });
    logging("mount");
    await Promise.resolve();
    logging("resize");
    await Promise.resolve();
    expect(written).toEqual(["mount", "resize"]);
  });

  it("reports each control the engine drew and whether it is disabled", () => {
    stage();
    const controls = document.createElement("aside");
    controls.className = "controls";
    controls.innerHTML =
      '<button class="navigate-left" disabled></button><button class="navigate-right enabled"></button>';
    document.querySelector(".reveal")?.append(controls);
    mountDeck(document, deckFragment(DECK, pathResolver()), false, null);
    const seen = observeDeck(document, "mount", null);
    expect(seen.controls).toEqual({ "navigate-left": true, "navigate-right": false });
  });
});

/**
 * The speaker's notes.
 *
 * reveal.js's own speaker view opens `about:blank` and writes an inline-script
 * document into it. An `about:blank` popup inherits its opener's policy, and
 * the present window's is `script-src 'self'`, so that script never runs.
 * The notes are therefore a split view inside this window, and these are the
 * checks that it shows the right ones.
 */
describe("the speaker's notes", () => {
  const CHAPTER = [
    "## One",
    "",
    "The first face.",
    "",
    "::: {.notes}",
    "Say the thing about the first slide.",
    ":::",
    "",
    "## Two",
    "",
    "The second face.",
    "",
  ].join("\n");

  function stage(): HTMLElement {
    document.body.innerHTML =
      '<div class="present-stage"><div class="reveal"><div class="slides"></div></div></div>';
    const host = document.querySelector<HTMLElement>(".present-stage");
    if (!host) throw new Error("no stage");
    mountDeck(document, deckFragment(CHAPTER, pathResolver()), false, null);
    return host;
  }

  it("keeps the notes out of the slide itself", () => {
    stage();
    const slides = slideElements(document);
    expect(slides).toHaveLength(2);
    expect(notesOf(slides[0] ?? null)).toContain("Say the thing");
    expect(headlineOf(slides[1] ?? null)).toBe("Two");
  });

  it("shows the notes of the slide in force and names the next one", () => {
    const host = stage();
    const view = createNotesView(host);
    // The mount already opened on slide one; this says so out loud.
    slideElements(document)[0]?.classList.add("present");
    view.draw(document);
    const body = view.element.querySelector<HTMLElement>(".present-notes-body");
    expect(body?.textContent).toContain("Say the thing about the first slide.");
    expect(view.element.querySelector(".present-notes-next")?.textContent).toBe("Next: Two");
  });

  it("says so plainly on a slide with no notes", () => {
    const host = stage();
    const view = createNotesView(host);
    // Move off the slide the deck opened on, as the arrow key would.
    slideElements(document)[0]?.classList.remove("present");
    const second = slideElements(document)[1];
    second?.classList.add("present");
    second?.querySelector("aside.notes")?.remove();
    view.draw(document);
    const body = view.element.querySelector<HTMLElement>(".present-notes-body");
    expect(body?.dataset["empty"]).toBe("yes");
    expect(body?.textContent).toBe("No notes on this slide.");
    expect(view.element.querySelector(".present-notes-next")?.textContent).toBe("");
  });

  it("is closed until it is asked for, and opens beside the deck", () => {
    const host = stage();
    const view = createNotesView(host);
    expect(view.isOpen).toBe(false);
    expect(host.dataset["notes"]).toBe("closed");
    view.toggle();
    expect(view.isOpen).toBe(true);
    expect(host.dataset["notes"]).toBe("open");
    // A sibling of the deck, so the slides reflow rather than scale.
    expect(view.element.parentElement).toBe(host);
    expect(host.querySelector(".reveal")).not.toBeNull();
    view.toggle();
    expect(view.isOpen).toBe(false);
  });
});

/**
 * jsdom implements no media queries and reveal.js asks for one on start.
 *
 * Shared by both of the describes below, because both start the real engine.
 */
function stubMediaQueries(): void {
  const window_ = window as unknown as Record<string, unknown>;
  window_["matchMedia"] ??= (query: string) => ({
    matches: false,
    media: query,
    addListener() {
      /* jsdom implements no media queries. */
    },
    removeListener() {
      /* jsdom implements no media queries. */
    },
    addEventListener() {
      /* jsdom implements no media queries. */
    },
    removeEventListener() {
      /* jsdom implements no media queries. */
    },
    dispatchEvent: () => false,
  });
}

/** The stage `present.html` lays out, empty and ready for a deck. */
function stageDeck(): void {
  document.body.innerHTML =
    '<div class="present-stage"><div class="reveal"><div class="slides"></div></div></div>';
}

/**
 * The stage with the deck's own stylesheet over it, as the window has it.
 *
 * jsdom lays nothing out, so this buys no heights — but it does resolve the
 * cascade, and the cascade is exactly what `iss-2609061209123970` turned on:
 * the engine writes `display` inline, an inline style beats a stylesheet, and
 * the question is whether the property the stylesheet hides a slide with is
 * one the engine can overwrite.
 */
function stageStyledDeck(): void {
  stageDeck();
  const style = document.createElement("style");
  style.textContent = DECK_STYLESHEET;
  document.head.replaceChildren(style);
}

/** Let the engine finish starting; it dispatches `ready` on a timeout. */
function settledEngine(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

/**
 * The reported bug, reproduced against the real engine, and the repair.
 *
 * This is the automated half of the manual rows in
 * `spc-2609051353412219` and `spc-2609051353425884`. It loads the vendored
 * reveal.js — the same engine the app and the published deck load — into jsdom
 * and reads back the same fields the present window writes to
 * `EDITOR_PRESENT_LOG` in a scripted run: how many slides the deck has, where
 * the engine says it is, which section carries `present`, and whether each
 * control is disabled.
 *
 * jsdom lays nothing out, so the heights in the log are what the test harness
 * fakes and are not asserted here; the type scale, which is the other half of
 * `iss-2609051919515730`, is held in `core/render/legibility.test.ts` instead.
 * What this file can prove is the thing that went wrong: the engine's index,
 * the `present` class, and the controls.
 */
describe("the deck the real engine is holding", () => {
  /**
   * A chapter with several top-level Sections and one that holds two
   * Sub-sections, so the deck has more than one slide and one column of
   * vertical slides to navigate into. Invented content
   * (iss-2609061418065651).
   */
  const CHAPTER_TEXT = [
    "# The Lantern Papers",
    "",
    "## Where the light falls",
    "",
    "Alice writes the opening Section.",
    "",
    "## A closer look",
    "",
    "### First observation",
    "",
    "Bob observes something here.",
    "",
    "### Second observation",
    "",
    "Carol observes something else here.",
    "",
    "## Closing thought",
    "",
    "A short closing Section.",
    "",
  ].join("\n");

  /**
   * A fresh copy of the vendored engine, handed back rather than left global.
   *
   * The engine is a singleton: `initialize` copies a whole running deck onto
   * the object it was called on, so a test that started one and a test that
   * needs a pristine one cannot share it. The UMD build is evaluated here for
   * exactly that — a new copy per test — and the global it assigns on the way
   * past is taken off again immediately, so nothing under test can be reading
   * it. What the tests drive is the object, passed in.
   */
  function freshEngine(): RevealEngine {
    stubMediaQueries();
    const global = globalThis as { Reveal?: RevealEngine };
    new Function(readFileSync("src/vendor/reveal/reveal.js", "utf8"))();
    const loaded = global.Reveal;
    delete global.Reveal;
    if (loaded === undefined) throw new Error("the vendored engine did not load");
    return loaded;
  }

  it("opens on the first slide, with the controls saying where it can go", async () => {
    stageDeck();
    const reveal = freshEngine();
    mountDeck(document, deckFragment(CHAPTER_TEXT, pathResolver()), false, reveal);
    await settledEngine();
    const seen = observeDeck(document, "mount", reveal);
    expect(seen.slides).toBeGreaterThan(1);
    expect(seen.indexh).toBe(0);
    expect(seen.indexv).toBe(0);
    expect(seen.presentAt).toBe(0);
    expect(seen.sections[0]?.classes).toContain("present");
    expect(headlineOf(slideElements(document)[0] ?? null)).toBe(
      "The Lantern Papers",
    );
    // Nowhere to go back to from slide one, and somewhere to go forward.
    expect(seen.controls["navigate-left"]).toBe(true);
    expect(seen.controls["navigate-right"]).toBe(false);
  });

  it("repairs a deck that landed after the engine had already started", async () => {
    // The failure `iss-2609051915021301` reported, from the engine's own
    // point of view: started on an empty `.slides`, it holds an index of
    // nothing, marks no section `present`, and disables every control — an
    // empty window with a grey back arrow.
    stageDeck();
    const reveal = freshEngine();
    await reveal.initialize({ ...DECK_CONFIG });
    await settledEngine();
    const broken = observeDeck(document, "started-empty", reveal);
    expect(broken.slides).toBe(0);
    expect(broken.indexh).toBeNull();
    expect(broken.presentAt).toBe(-1);
    expect(Object.values(broken.controls).every((disabled) => disabled)).toBe(true);

    // Mounting a deck into that window is the second Present, and it has to
    // leave the window showing slide one with the controls tracking it.
    mountDeck(document, deckFragment(CHAPTER_TEXT, pathResolver()), true, reveal);
    await settledEngine();
    const repaired = observeDeck(document, "mount", reveal);
    expect(repaired.slides).toBeGreaterThan(1);
    expect(repaired.indexh).toBe(0);
    expect(repaired.presentAt).toBe(0);
    expect(repaired.controls["navigate-left"]).toBe(true);
    expect(repaired.controls["navigate-right"]).toBe(false);
  });

  /**
   * A fresh engine that has finished starting, with nothing left queued.
   *
   * `mountDeck` starts an engine by handing `initialize` a callback that puts
   * the deck on slide one, and that callback lands whenever the engine's own
   * `ready` does. A test that navigates cannot be sure it has: the callback
   * arriving late would send the deck back to slide one and the assertion
   * would be reading a race rather than the fix. So the engine is started
   * first and the deck mounted into it — the second-Present path, where
   * `mountDeck` settles the engine synchronously and queues nothing.
   */
  async function startedEngine(): Promise<RevealEngine> {
    const reveal = freshEngine();
    await reveal.initialize({ ...DECK_CONFIG });
    await settledEngine();
    return reveal;
  }

  /** One top-level section of the mounted deck, by position. */
  function sectionAt(index: number): HTMLElement {
    const found = document.querySelectorAll<HTMLElement>(
      ".reveal .slides > section",
    )[index];
    if (found === undefined) throw new Error(`no section at ${String(index)}`);
    return found;
  }

  /** What the cascade makes of one element, as the window would see it. */
  function visibilityOf(element: Element): string {
    return window.getComputedStyle(element).visibility;
  }

  it("takes the slide left behind off the screen when the deck moves on", async () => {
    // `iss-2609061209123970`: the engine's index moved and the window did
    // not. The slides were blocks of normal flow hidden with `display: none`,
    // and the engine writes `display: block` inline on every slide near the
    // one in view — an inline style beats a stylesheet, so all of them were
    // laid out, one under the next, and the window showed the title slide and
    // cropped the rest.
    stageStyledDeck();
    const reveal = await startedEngine();
    // The second-Present path, so that nothing is still queued: `mountDeck`
    // settles a running engine there and then, and the navigation below is
    // answered by a deck that has finished arriving rather than racing one
    // that is still being put on slide one.
    mountDeck(document, deckFragment(CHAPTER_TEXT, pathResolver()), true, reveal);
    await settledEngine();
    reveal.right?.();
    await settledEngine();

    const seen = observeDeck(document, "slidechanged", reveal);
    expect(seen.indexh).toBe(1);
    expect(seen.presentAt).toBe(1);

    const first = sectionAt(0);
    const second = sectionAt(1);
    // The engine did write `display` inline, on the slide it left as well as
    // on the slide it moved to. That is the fact the fix is built around.
    expect(first.style.display).toBe("block");
    expect(second.style.display).toBe("block");
    // It writes no `visibility` and no `position`, so the stylesheet keeps
    // both: slide two is on the screen, slide one is not, and neither is in
    // the flow to stack under the other.
    expect(first.style.visibility).toBe("");
    expect(visibilityOf(first)).toBe("hidden");
    expect(visibilityOf(second)).toBe("visible");
    expect(window.getComputedStyle(second).position).toBe("absolute");

    // And the log the scripted run reads back says the same thing.
    expect(seen.sections[0]?.visibility).toBe("hidden");
    expect(seen.sections[1]?.visibility).toBe("visible");
    // A face with words on it, not an empty slide that happens to be shown.
    expect(seen.sections[1]?.textLength).toBeGreaterThan(0);
  });

  it("shows one child of a column of vertical slides, and only one", async () => {
    stageStyledDeck();
    const reveal = await startedEngine();
    mountDeck(document, deckFragment(CHAPTER_TEXT, pathResolver()), true, reveal);
    await settledEngine();
    const columns = [
      ...document.querySelectorAll<HTMLElement>(".reveal .slides > section"),
    ];
    const at = columns.findIndex((column) => column.classList.contains("stack"));
    expect(at, "the chapter has a sub-section, so the deck has a stack").toBeGreaterThan(
      -1,
    );

    reveal.slide?.(at, 0);
    await settledEngine();
    const stack = sectionAt(at);
    const inside = [...stack.querySelectorAll<HTMLElement>(":scope > section")];
    expect(inside.length).toBeGreaterThan(1);
    expect(visibilityOf(stack)).toBe("visible");
    expect(visibilityOf(inside[0] ?? stack)).toBe("visible");
    expect(visibilityOf(inside[1] ?? stack)).toBe("hidden");
    // The stack is laid over the stage like any other section, and its
    // children over the stack.
    expect(window.getComputedStyle(stack).position).toBe("absolute");
    expect(window.getComputedStyle(inside[0] ?? stack).position).toBe("absolute");
  });

  it("spreads every slide into its own place for reveal.js's own overview", async () => {
    // `iss-2609061514457567`: Escape's overview lays every slide out with its
    // own `element.style.transform` (`Overview.layout`, set unconditionally —
    // `disableLayout` only gates the main engine's own scale-to-fit). The
    // fluid stylesheet's `transform: none !important` answered every slide
    // alike regardless, which is the stacked box the bug report saw: one
    // slide's face, repeated over an otherwise-empty grid. This drives the
    // real engine's own `toggleOverview`/`isOverview` rather than simulating
    // an Escape keydown, so what is proved is the stylesheet's answer to the
    // class the engine puts on `.reveal`, not the keyboard plugin.
    stageStyledDeck();
    const reveal = await startedEngine();
    mountDeck(document, deckFragment(CHAPTER_TEXT, pathResolver()), true, reveal);
    await settledEngine();

    const engineApi = reveal as unknown as {
      toggleOverview?: () => void;
      isOverview?: () => boolean;
    };
    if (!engineApi.toggleOverview || !engineApi.isOverview) {
      throw new Error("the engine exposes no overview API");
    }

    engineApi.toggleOverview();
    await settledEngine();
    expect(engineApi.isOverview()).toBe(true);

    const sections = [
      ...document.querySelectorAll<HTMLElement>(".reveal .slides > section"),
    ].filter((section) => !section.classList.contains("stack"));
    expect(sections.length).toBeGreaterThan(1);
    // Each top-level slide's own placement, not the same stacked box: the
    // engine gave each a different `translate3d`, and every one of them is
    // back on the screen rather than only the one that was `present`.
    const transforms = sections.map((section) => section.style.transform);
    expect(new Set(transforms).size).toBe(transforms.length);
    expect(transforms.every((value) => value !== "")).toBe(true);
    expect(sections.every((section) => visibilityOf(section) === "visible")).toBe(
      true,
    );

    engineApi.toggleOverview();
    await settledEngine();
    expect(engineApi.isOverview()).toBe(false);
    // Reveal.js clears the transform it wrote, and only the present slide is
    // back on the screen — the ordinary, one-slide-at-a-time behaviour this
    // spread from.
    expect(sections.every((section) => section.style.transform === "")).toBe(true);
    expect(visibilityOf(sections[0]!)).toBe("visible");
    expect(visibilityOf(sections[1]!)).toBe("hidden");
  });
});

/**
 * The engine the window actually gets, with no global anywhere.
 *
 * `iss-2609061132369973`: the present window used to read `globalThis.Reveal`,
 * which the vendored UMD build assigns only when it is *executed as a script*.
 * The dev server serves that file raw, so the global was there; this suite
 * used to evaluate the same file into jsdom's global, so it was there too. The
 * release build bundles it instead, takes the UMD's CommonJS branch, and
 * assigns no global at all — and the shipped window showed one slide with dead
 * controls while both green checks went on saying it was fine.
 *
 * So this describe deletes the global first and never puts one back. Nothing
 * below can be answered by an engine some other file left lying around: what
 * `engine()` returns is what `src/present.ts` imported, and if the import ever
 * stops resolving to the engine these fail rather than the release does.
 *
 * This runs last in the file on purpose. `initialize` mutates the imported
 * singleton — that is what gives it `sync` and `slide` — so a test after it
 * would no longer be looking at a pristine engine.
 */
describe("the engine present.ts imports", () => {
  beforeEach(() => {
    delete (globalThis as { Reveal?: unknown }).Reveal;
  });

  it("is there before the deck starts, with no global set", () => {
    expect((globalThis as { Reveal?: unknown }).Reveal).toBeUndefined();
    const reveal = engine();
    expect(reveal).not.toBeNull();
    expect(typeof reveal?.initialize).toBe("function");
    expect(typeof reveal?.on).toBe("function");
    // The stub is not the running deck: `sync` and `slide` arrive with it.
    expect(reveal?.sync).toBeUndefined();
    expect(reveal?.slide).toBeUndefined();
  });

  it("carries initialize, sync, slide and on once the deck has started", async () => {
    stageDeck();
    stubMediaQueries();
    // Nothing sets a global: `mountDeck` is given no engine and has to find
    // the one it imported.
    expect((globalThis as { Reveal?: unknown }).Reveal).toBeUndefined();
    expect(mountDeck(document, deckFragment("## One\n\nA.\n\n## Two\n\nB.\n", pathResolver()), false)).toBe(
      true,
    );
    await settledEngine();

    const reveal = engine();
    expect(reveal).not.toBeNull();
    for (const method of ["initialize", "sync", "slide", "on"] as const) {
      expect(typeof reveal?.[method]).toBe("function");
    }
    // Still no global, before or after: the window never needed one.
    expect((globalThis as { Reveal?: unknown }).Reveal).toBeUndefined();

    // And it is a live engine, not a shape that merely type-checks: it is
    // holding this deck, on slide one, with the controls saying so.
    const seen = observeDeck(document, "mount");
    expect(seen.engine).toContain("sync");
    expect(seen.engine).toContain("slide");
    expect(seen.slides).toBe(2);
    expect(seen.indexh).toBe(0);
    expect(seen.presentAt).toBe(0);
    expect(seen.controls["navigate-left"]).toBe(true);
    expect(seen.controls["navigate-right"]).toBe(false);
  });
});

/**
 * The build gate, over the emitted file the suite above never sees.
 *
 * Everything else in this file runs against source. The bug did not live in
 * the source: `src/present.ts` read `globalThis.Reveal`, which was the right
 * thing to read everywhere except in the one artefact that ships. So the gate
 * `npm run build` runs is exercised here the way `tools/check-bundle.mjs` is
 * exercised for the keymap in `emacs-keys.test.ts` — over folders shaped like
 * `dist`, one healthy and the rest broken in the ways that matter.
 */
describe("the deck engine the build gate looks for", () => {
  /** The emitted shape of a working present chunk, minified as it ships. */
  const ENGINE = [
    "class P{}var F=P;",
    'F.initialize=e=>(Object.assign(F,new P(document.querySelector(".reveal"),e)),F.initialize());',
    'function V(){return typeof F?.initialize==="function"?F:null}',
    "function Me(e,t,n,r=V()){return r===null?n:(r.initialize({}),!0)}",
    "console.log(Me);",
  ].join("\n");

  /** A main chunk with the keymap whole, so only the engine gate can speak. */
  const KEYMAP = [
    "const Ww={a:1};class Q{static bindKey(){}static addCommands(){}}",
    "for(let e in Ww)Q.bindKey(e,Ww[e]);",
    "Q.addCommands({unsetTransientMark:function(){},killLine:function(){}});",
  ].join("\n");

  async function runOver(
    chunks: Readonly<Record<string, string>>,
  ): Promise<{ code: number; output: string }> {
    const { execFileSync } = await import("node:child_process");
    const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const dist = mkdtempSync(join(tmpdir(), "check-bundle-present-"));
    mkdirSync(join(dist, "assets"));
    for (const [name, source] of Object.entries({
      "main-abc123.js": KEYMAP,
      ...chunks,
    })) {
      writeFileSync(join(dist, "assets", name), source);
    }
    try {
      return {
        code: 0,
        output: execFileSync(
          process.execPath,
          [join(process.cwd(), "tools/check-bundle.mjs"), dist],
          { encoding: "utf8", stdio: "pipe" },
        ),
      };
    } catch (error) {
      const failure = error as { status?: number; stderr?: string };
      return { code: failure.status ?? 1, output: failure.stderr ?? "" };
    }
  }

  it("passes a chunk that carries the engine and holds on to it", async () => {
    const whole = await runOver({ "present-abc123.js": ENGINE });
    expect(whole.code, whole.output).toBe(0);
    expect(whole.output).toContain("the deck engine is installed");
  });

  it("fails the build that shipped: the engine bundled, the app on the global", async () => {
    // `iss-2609061132369973` exactly. reveal.js is in the chunk — the bundler
    // put it there — and the application asks a global that the module build
    // never assigns. Every source-level check passes on this bundle.
    const broken = ENGINE.replace(
      'function V(){return typeof F?.initialize==="function"?F:null}',
      "function V(){return globalThis.Reveal??null}",
    );
    expect(broken).not.toBe(ENGINE);
    const seen = await runOver({ "present-abc123.js": broken });
    expect(seen.code).not.toBe(0);
    expect(seen.output).toContain("the engine accessor in src/present.ts");
    expect(seen.output).toContain("reads the deck engine off a global");
  });

  it("fails a chunk with no engine in it at all", async () => {
    const seen = await runOver({ "present-abc123.js": "console.log(1);" });
    expect(seen.code).not.toBe(0);
    expect(seen.output).toContain("initialize implementation");
  });

  it("fails a build whose present entry loads nothing with the engine in it", async () => {
    // The wiring failure rather than the dropped one: the engine is whole in
    // a chunk, and the window does not load that chunk.
    const seen = await runOver({
      "present-abc123.js": "console.log(1);",
      "engine-def456.js": ENGINE,
    });
    expect(seen.code).not.toBe(0);
    expect(seen.output).toContain("engine-def456.js");
    expect(seen.output).toContain("does not load");
  });

  it("takes a chunk split for what it is, and passes it", async () => {
    const seen = await runOver({
      "present-abc123.js": 'import"./engine-def456.js";\nconsole.log(1);',
      "engine-def456.js": ENGINE,
    });
    expect(seen.code, seen.output).toBe(0);
    expect(seen.output).toContain("engine-def456.js");
  });

  it("fails a build that emitted no present entry at all", async () => {
    const seen = await runOver({});
    expect(seen.code).not.toBe(0);
    expect(seen.output).toContain("present");
  });
});
