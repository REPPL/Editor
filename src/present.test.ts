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
import { readdirSync, readFileSync, statSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { pathResolver } from "./core/assets";
import { DECK_CONFIG } from "./core/render/slides";
import {
  createNotesView,
  createRecorder,
  deckFragment,
  headlineOf,
  mountDeck,
  notesOf,
  observeDeck,
  slideElements,
} from "./present";

/** The chapter the manual checks use, so every check looks at one deck. */
const CHAPTER = "examples/presentation/01-slides/01-technology-impact-assessment.md";

/** The document folder that chapter belongs to. */
const DOCUMENT = "examples/presentation";

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

describe("presenting a chapter", () => {
  it("leaves the chapter's bytes untouched", () => {
    const before = readFileSync(CHAPTER);
    const text = before.toString("utf8");
    const fragment = deckFragment(text, pathResolver());
    expect(fragment.length).toBeGreaterThan(0);
    // The core took a string and returned a string.
    expect(text).toBe(before.toString("utf8"));
    expect(sha256(readFileSync(CHAPTER))).toBe(sha256(before));
  });

  it("writes no deck file anywhere in the document folder", () => {
    const before = listing(DOCUMENT);
    deckFragment(readFileSync(CHAPTER, "utf8"), pathResolver());
    expect(listing(DOCUMENT)).toEqual(before);
  });

  it("builds the deck from the buffer rather than from the file", () => {
    // The text presented is the buffer's; an unsaved edit presents.
    const edited = readFileSync(CHAPTER, "utf8").replace(
      "## Denver, 1858",
      "## Denver, 1859",
    );
    const fragment = deckFragment(edited, pathResolver());
    expect(fragment).toContain("Denver, 1859");
    expect(fragment).not.toContain("Denver, 1858");
    expect(readFileSync(CHAPTER, "utf8")).toContain("## Denver, 1858");
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
    // The engine is absent in a test, so the page is filled and nothing starts.
    expect(mountDeck(document, fragment, false)).toBe(false);
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
    mountDeck(document, fragment, false);
    const slides = document.querySelector(".reveal .slides");
    expect(withoutPresent(slides?.innerHTML ?? "")).toBe(fragment);
    // Both marks were made: the column and the first slide inside it.
    expect(slides?.querySelectorAll(".present")).toHaveLength(2);
  });

  it("replaces the deck rather than adding a second one", () => {
    document.body.innerHTML = '<div class="reveal"><div class="slides"></div></div>';
    mountDeck(document, deckFragment("## One\n", pathResolver()), false);
    mountDeck(document, deckFragment("## Two\n", pathResolver()), false);
    const slides = document.querySelector(".reveal .slides");
    expect(slides?.querySelectorAll("section")).toHaveLength(1);
    expect(slides?.textContent).toBe("Two");
  });

  it("does nothing at all when the page carries no deck container", () => {
    document.body.innerHTML = "<p>Not a deck.</p>";
    expect(mountDeck(document, "<section></section>", false)).toBe(false);
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
  function fakeEngine(calls: string[]): Record<string, unknown> {
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

  async function withEngine(calls: string[], body: () => Promise<void> | void): Promise<void> {
    const global = globalThis as { Reveal?: unknown };
    const before = global.Reveal;
    global.Reveal = fakeEngine(calls);
    try {
      await body();
    } finally {
      if (before === undefined) delete global.Reveal;
      else global.Reveal = before;
    }
  }

  const DECK = "## One\n\nThe first face.\n\n## Two\n\nThe second face.\n";

  function stage(): void {
    document.body.innerHTML =
      '<div class="present-stage"><div class="reveal"><div class="slides"></div></div></div>';
  }

  it("puts the fragment in before it starts the engine, and syncs after", async () => {
    const calls: string[] = [];
    stage();
    await withEngine(calls, async () => {
      expect(mountDeck(document, deckFragment(DECK, pathResolver()), false)).toBe(true);
      // The engine is started on a deck that is already there, so `sync` sees
      // both slides; and the sync happens once `initialize` has resolved,
      // which is the first moment `sync` and `slide` exist to be called at
      // all.
      expect(calls).toEqual(["initialize:true"]);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(calls).toEqual(["initialize:true", "sync:2", "slide:0,0"]);
  });

  it("syncs a running engine the moment a second deck lands", async () => {
    const calls: string[] = [];
    stage();
    await withEngine(calls, () => {
      expect(mountDeck(document, deckFragment(DECK, pathResolver()), true)).toBe(true);
    });
    expect(calls).toEqual(["sync:2", "slide:0,0"]);
  });

  it("shows the first slide even with no engine at all", () => {
    stage();
    mountDeck(document, deckFragment(DECK, pathResolver()), false);
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
    );
    const column = document.querySelector(".reveal .slides > section");
    expect(column?.querySelectorAll("section").length).toBeGreaterThan(0);
    expect(column?.classList.contains("present")).toBe(true);
    expect(column?.querySelector("section")?.classList.contains("present")).toBe(true);
  });

  it("reports the empty window the maintainer saw, and the deck that follows", () => {
    stage();
    const empty = observeDeck(document, "before");
    expect(empty.slides).toBe(0);
    expect(empty.presentAt).toBe(-1);
    expect(empty.indexh).toBeNull();

    mountDeck(document, deckFragment(DECK, pathResolver()), false);
    const shown = observeDeck(document, "mount");
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
    mountDeck(other, deckFragment(DECK, pathResolver()), false);

    const seen = observeDeck(other, "mount");
    expect(seen.slides).toBe(2);
    expect(seen.presentAt).toBe(0);
    expect(observeDeck(document, "mount").slides).toBe(0);
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
    mountDeck(document, deckFragment(DECK, pathResolver()), false);
    const seen = observeDeck(document, "mount");
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
    mountDeck(document, deckFragment(CHAPTER, pathResolver()), false);
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
 * The reported bug, reproduced against the real engine, and the repair.
 *
 * This is the automated half of the manual rows in
 * `spc-2609051353412219` and `spc-2609051353425884`. It loads the vendored
 * reveal.js — the same file the app and the published deck load — into jsdom
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
  const CHAPTER_TEXT = readFileSync(CHAPTER, "utf8");

  /** Load the vendored engine onto the global, as `present.html` does. */
  function loadEngine(): void {
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
    new Function(readFileSync("src/vendor/reveal/reveal.js", "utf8"))();
  }

  function drop(): void {
    delete (globalThis as { Reveal?: unknown }).Reveal;
  }

  function stage(): void {
    document.body.innerHTML =
      '<div class="present-stage"><div class="reveal"><div class="slides"></div></div></div>';
  }

  /** Let the engine finish starting; it dispatches `ready` on a timeout. */
  function settled(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 20));
  }

  it("opens on the first slide, with the controls saying where it can go", async () => {
    stage();
    loadEngine();
    try {
      mountDeck(document, deckFragment(CHAPTER_TEXT, pathResolver()), false);
      await settled();
      const seen = observeDeck(document, "mount");
      expect(seen.slides).toBeGreaterThan(1);
      expect(seen.indexh).toBe(0);
      expect(seen.indexv).toBe(0);
      expect(seen.presentAt).toBe(0);
      expect(seen.sections[0]?.classes).toContain("present");
      expect(headlineOf(slideElements(document)[0] ?? null)).toBe(
        "Technology Impact Assessment",
      );
      // Nowhere to go back to from slide one, and somewhere to go forward.
      expect(seen.controls["navigate-left"]).toBe(true);
      expect(seen.controls["navigate-right"]).toBe(false);
    } finally {
      drop();
    }
  });

  it("repairs a deck that landed after the engine had already started", async () => {
    // The failure `iss-2609051915021301` reported, from the engine's own
    // point of view: started on an empty `.slides`, it holds an index of
    // nothing, marks no section `present`, and disables every control — an
    // empty window with a grey back arrow.
    stage();
    loadEngine();
    try {
      const reveal = globalThis as unknown as {
        Reveal: { initialize(config: Record<string, unknown>): Promise<void> };
      };
      await reveal.Reveal.initialize({ ...DECK_CONFIG });
      await settled();
      const broken = observeDeck(document, "started-empty");
      expect(broken.slides).toBe(0);
      expect(broken.indexh).toBeNull();
      expect(broken.presentAt).toBe(-1);
      expect(Object.values(broken.controls).every((disabled) => disabled)).toBe(true);

      // Mounting a deck into that window is the second Present, and it has to
      // leave the window showing slide one with the controls tracking it.
      mountDeck(document, deckFragment(CHAPTER_TEXT, pathResolver()), true);
      await settled();
      const repaired = observeDeck(document, "mount");
      expect(repaired.slides).toBeGreaterThan(1);
      expect(repaired.indexh).toBe(0);
      expect(repaired.presentAt).toBe(0);
      expect(repaired.controls["navigate-left"]).toBe(true);
      expect(repaired.controls["navigate-right"]).toBe(false);
    } finally {
      drop();
    }
  });
});
