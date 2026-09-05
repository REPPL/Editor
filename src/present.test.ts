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
import {
  createNotesView,
  deckFragment,
  headlineOf,
  mountDeck,
  notesOf,
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
  it("mounts the fragment where reveal.js looks for it", () => {
    document.body.innerHTML = '<div class="reveal"><div class="slides"></div></div>';
    const fragment = deckFragment("## Beginnings\n\nA.\n", pathResolver());
    // The engine is absent in a test, so the page is filled and nothing starts.
    expect(mountDeck(document, fragment, false)).toBe(false);
    const slides = document.querySelector(".reveal .slides");
    expect(slides?.innerHTML).toBe(fragment);
    expect(slides?.querySelectorAll("section")).toHaveLength(1);
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
    slideElements(document)[0]?.classList.add("present");
    view.draw(document);
    const body = view.element.querySelector<HTMLElement>(".present-notes-body");
    expect(body?.textContent).toContain("Say the thing about the first slide.");
    expect(view.element.querySelector(".present-notes-next")?.textContent).toBe("Next: Two");
  });

  it("says so plainly on a slide with no notes", () => {
    const host = stage();
    const view = createNotesView(host);
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
