/**
 * The editing surface's type size, and nothing else's.
 *
 * Emacs's own `text-scale-adjust`: a factor of 1.2 per step, five steps either
 * way, and a restore that lands on the size the app opened at to the pixel.
 * The scale is a property of the CodeMirror view — a theme extension held in a
 * compartment — so the sidebar, the modeline and every panel beside it keep the
 * size they had. Nothing here is written into a chapter or into
 * `document.yaml`: how large Alice likes her text is a fact about her eyes and
 * her screen (`itd-2609051336080960`, no machine in the document).
 *
 * The step lives in the editor state rather than in a variable of this module,
 * so a second view would carry its own and the modeline reads the one the view
 * it is drawing actually has.
 */

import {
  Compartment,
  Prec,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/** The size the editing surface opens at, in CSS pixels. */
export const BASE_FONT_SIZE_PX = 14;

/** The factor one step multiplies or divides by. Emacs's own. */
export const TEXT_SCALE_STEP = 1.2;

/** How many steps either way the scale is bounded at. */
export const TEXT_SCALE_LIMIT = 5;

/** How much larger than the default `step` steps are. */
export function factorFor(step: number): number {
  return TEXT_SCALE_STEP ** step;
}

/**
 * The font size `step` steps from the default, as a CSS length.
 *
 * Rounded to three decimals, which leaves step 0 at exactly the base size and
 * keeps each step exactly 1.2 times the one below it at the precision a
 * stylesheet can carry.
 */
export function fontSizeFor(step: number): string {
  const px = BASE_FONT_SIZE_PX * factorFor(step);
  return `${String(Number(px.toFixed(3)))}px`;
}

/** The scale as a whole percentage of the default, for the modeline. */
export function percentOf(step: number): number {
  return Math.round(factorFor(step) * 100);
}

/** A step brought inside the range, whatever it arrived as. */
export function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 0;
  return Math.max(-TEXT_SCALE_LIMIT, Math.min(TEXT_SCALE_LIMIT, Math.round(step)));
}

/** Move the surface to a given step. */
const setStep = StateEffect.define<number>();

/** The step the surface is at, in the state the surface carries. */
const textScaleField = StateField.define<number>({
  create: () => 0,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setStep)) return effect.value;
    }
    return value;
  },
});

/** The theme extension the compartment holds. */
const scaleCompartment = new Compartment();

/**
 * The type size, as a theme on the editor element.
 *
 * `&` is `.cm-editor`, so the content, the gutters and CodeMirror's own search
 * panel all scale and nothing outside the surface can. `Prec.highest` is not
 * decoration: the surface's base theme sets `fontSize` on the same selector,
 * themes are mounted in facet order, and without it the two rules tie and the
 * base one wins.
 */
function scaleTheme(step: number): Extension {
  return Prec.highest(
    EditorView.theme({ "&": { fontSize: fontSizeFor(step) } }),
  );
}

/**
 * The extensions a surface needs to carry a scale, seeded at `step`.
 *
 * Seeded rather than reconfigured, because opening a chapter builds a fresh
 * `EditorState` (see `setDocument`) and the scale must survive it.
 */
export function textScaleExtension(step = 0): Extension {
  const seed = clampStep(step);
  return [textScaleField.init(() => seed), scaleCompartment.of(scaleTheme(seed))];
}

/** The step a view is at. */
export function textScaleStep(view: EditorView): number {
  return view.state.field(textScaleField, false) ?? 0;
}

/**
 * Put a view at a step, clamped to the range.
 *
 * Returns whether the size moved, so a chord pressed at a bound can say the
 * limit is reached rather than doing nothing quietly.
 */
export function setTextScale(view: EditorView, step: number): boolean {
  const wanted = clampStep(step);
  if (wanted === textScaleStep(view)) return false;
  view.dispatch({
    effects: [setStep.of(wanted), scaleCompartment.reconfigure(scaleTheme(wanted))],
  });
  return true;
}

/** What the modeline says once the surface is at `step`. */
export function textScaleMessage(step: number, moved: boolean): string {
  const scale = `Text scale ${String(percentOf(step))}%`;
  if (moved) return scale;
  if (step >= TEXT_SCALE_LIMIT) return `${scale}, the largest step`;
  if (step <= -TEXT_SCALE_LIMIT) return `${scale}, the smallest step`;
  return scale;
}
