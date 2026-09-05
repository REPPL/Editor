/**
 * The one drop router.
 *
 * The web view's own drag-and-drop events carry no paths — a browser will not
 * give a page a file's location — so the shell listens to the window's native
 * drop, keeps what was dropped under a nonce that expires, and tells the page
 * only the nonce and where the pointer was. This module turns "where the
 * pointer was" into "what is under it" and routes to the one thing that
 * target accepts. It is the only subscriber: a second one would be a second
 * rule about what a Part accepts, and the rule is written once.
 *
 * The editing surface's own branch is a hook, filled by the drop spec. Until
 * it is, a drop on the text says what it would take rather than doing nothing.
 */

import { DROPPED_EVENT, type DropPayload } from "./doctree";

/** What the router does with a drop, by target. */
export interface DropTargets {
  /** A Part row in the sidebar: a Markdown file becomes a chapter there. */
  onPart(partPath: string, payload: DropPayload): void;
  /**
   * The editing surface: an image, a video, or a file becomes a reference.
   *
   * Left unset until the drop spec fills it, which is why the refusal below
   * names what the surface will take rather than pretending nothing happened.
   */
  onText?(payload: DropPayload): void;
  /** Nothing under the pointer accepts a drop. */
  onRefused(message: string): void;
}

/** A live subscription to the shell's drop event. */
export interface DropRouter {
  /** Route one drop. Exposed so a test can drive it without a shell. */
  route(payload: DropPayload): void;
  /** Stop listening. */
  dispose(): void;
}

/** What each target accepts, for the refusal message. */
const WHAT_TARGETS_ACCEPT =
  "A Part in the sidebar takes a Markdown chapter; the editing surface takes an image, a video, or a file.";

/** What the surface will take once map #4 lands. */
const TEXT_NOT_YET =
  "The editing surface does not take a dropped file yet; drop a Markdown chapter on a Part.";

/**
 * The element under a drop.
 *
 * The window event carries the pointer in physical device pixels; the shell
 * divides by the window's scale factor before it emits, so what arrives here
 * is already the CSS pixels the page measures in. The conversion happens once,
 * where the scale factor is known.
 */
function elementUnder(payload: DropPayload): Element | null {
  return document.elementFromPoint(payload.x, payload.y);
}

/** Build the router. `subscribe` is absent outside the shell. */
export function createDropRouter(
  targets: DropTargets,
  subscribe?: (
    event: string,
    handler: (payload: DropPayload) => void,
  ) => Promise<() => void>,
): DropRouter {
  let unlisten: (() => void) | null = null;
  let disposed = false;

  const router: DropRouter = {
    route(payload: DropPayload): void {
      const element = elementUnder(payload);
      const part = element?.closest<HTMLElement>("[data-part-path]");
      if (part) {
        const path = part.dataset["partPath"];
        if (path !== undefined && path !== "") {
          targets.onPart(path, payload);
          return;
        }
      }
      if (element?.closest(".cm-editor")) {
        if (targets.onText) {
          targets.onText(payload);
        } else {
          targets.onRefused(TEXT_NOT_YET);
        }
        return;
      }
      targets.onRefused(WHAT_TARGETS_ACCEPT);
    },
    dispose(): void {
      disposed = true;
      unlisten?.();
      unlisten = null;
    },
  };

  if (subscribe) {
    void subscribe(DROPPED_EVENT, (payload) => {
      router.route(payload);
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });
  }

  return router;
}
