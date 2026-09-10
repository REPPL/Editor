---
id: itd-2609081938397758
slug: show-progress-through-the-chapter-as-a-cat-on-a-rainbow-trai
spec_id: spc-2609091733493366
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Show progress through the chapter as a cat on a rainbow trail

## Press Release

Alice is a third of the way down a long chapter. In the footer, beside the
things the modeline already tells her, a small cat sits at the head of a
rainbow trail that has grown out from the left edge. She presses `M-}` twice
and the trail lengthens; the cat moves with the caret. She scrolls back to
read something near the top without moving the point, and the cat stays where
it is — it marks where she is writing, not where she is looking. It is the
same cat that has sat in her own Emacs modeline for years, doing the same
small job: telling her how far in she is, without a number she has to read.

## Why This Matters

Editor's footer names the chapter and the pane and any prefix half-typed. What
it does not do is answer the question a writer asks constantly and idly: how
far into this am I? A line number answers it in a unit nobody thinks in, and
a scrollbar answers a different question — where the window is, not where the
work is. A trail that fills as the caret moves through the chapter answers it
at a glance, in the only unit that matters, and it costs a reading of nothing.

It is also, plainly, a small delight, and the maintainer has one in their own
Emacs. That is a sufficient reason on its own for a tool one person writes in
every day; it does not need a stronger one.

## Mechanism

We expect the caret's offset to be the right thing to measure, rather than the
scroll position nyan-mode itself uses, because Editor's chapter is the unit of
work and the caret is where the work is. Scrolling ahead to check a reference
is not progress and should not move the cat. This is falsifiable in use: if
the maintainer finds the cat sitting still while they read, and wants it to
follow their eye instead, the measure was wrong.

We expect this to need no new state, because the caret's offset and the
document's length are both already on the CodeMirror state the modeline is
already redrawn from, and the modeline already redraws on selection change.
The trail is a function of two numbers Editor already has, rendered where the
modeline already renders. Falsifiable if the redraw turns out to be too coarse
to track a moving caret smoothly, in which case the cat would jump rather than
walk and would need a subscription of its own.

## Scope Conditions

- Population: Alice, the maintainer, editing a chapter she has open. <!-- cond: cond-2609091733494944 -->
- Platform: the desktop app — the Tauri 2 shell with the system web view — on <!-- cond: cond-2609091733497190 -->
  macOS.
- The measure is the caret's offset within the open chapter, out of that <!-- cond: cond-2609091733491196 -->
  chapter's length. Not the scroll position, and not the position in the
  document as a whole — a chapter is the unit, and the sidebar already says
  which chapter of how many.
- The cat is drawn in the footer, beside what the modeline already shows, and <!-- cond: cond-2609091733496338 -->
  never in the editing surface itself.
- It is decoration and it must never take the keyboard, never be a pane in the <!-- cond: cond-2609091733494632 -->
  cycle, and never be the only carrier of information — the footer keeps
  whatever it already says.
- Motion is honest: the cat sits at a position and does not animate, wave, or <!-- cond: cond-2609091733490147 -->
  play. A moving decoration in the corner of a writing surface is a cost paid
  every second by someone trying to think.
- The trail must be legible without colour: a reader who cannot distinguish <!-- cond: cond-2609091733499104 -->
  the rainbow still sees a bar filled to a proportion.
- The cat is an optional pleasure on a large screen: it is present at 1280 CSS <!-- cond: cond-2609100513433908 -->
  pixels and above, and below that it is absent entirely — nothing drawn and
  nothing announced. The footer's own information wins the space at 820 and at
  390, and nothing stands in for the trail there. A progress decoration that
  crowds out a refusal message is a bad trade, and a decoration is a thing the
  app can do without.

## Acceptance Criteria

- Given a chapter open with the caret at its start, when the footer is read,
  then the cat sits at the left end of the trail and no trail is drawn behind
  it.
- Given a chapter open with the caret at its end, when the footer is read,
  then the cat sits at the right end and the trail spans the whole width.
- Given the caret at a known offset, when the footer is read, then the cat's
  position along the trail is that offset as a proportion of the chapter's
  length, to within one drawn step.
- Given the caret unmoved, when Alice scrolls the chapter, then the cat does
  not move.
- Given Alice moves the caret, when the modeline redraws, then the cat has
  moved with it in the same redraw — the footer never shows a stale position.
- Given a chapter of zero length, when the footer is read, then the cat is
  drawn at the start and nothing divides by zero.
- Given a switch to another chapter, when the footer is read, then the cat
  reflects the new chapter's caret and length, not the previous one's.
- Given the window at 1280 CSS pixels or wider, where the trail is drawn, when
  the footer is read by assistive technology, then the progress is announced as
  a proportion in words, and the cat itself is not announced as content.
  (Amended 2026-09-10, settled by the maintainer at the planning interview. As
  written this criterion read: "Given the footer is read by assistive
  technology, then the progress is announced as a proportion in words, and the
  cat itself is not announced as content" — an unconditional promise the build
  does not keep at 820 or 390, because the element is absent there entirely
  (cond-2609100513433908). It is scoped to the widths the element exists at
  rather than left to read as a promise and be audited as a failure. Nothing
  stands in for the announcement below 1280, by design: the maintainer's
  settlement is that the cat is an optional feature relevant to large screens.
  Recorded here rather than left to be inferred, following
  `iss-2609052143457583`.)
- Inherited: one source, always — the caret offset and chapter length are read
  from the one state the modeline already reads; legible on three device
  classes — **not met for this element, and dropped**: the trail and its
  accessible label are present at 1280 CSS pixels and above and together absent
  below, so there is nothing at 820 or 390 to be legible, to shorten, or to
  announce; reachable by assistive technology at the widths the element exists
  at, as above.
  (Amended 2026-09-10, settled by the maintainer at the planning interview. As
  written this criterion read: "legible on three device classes — the trail is
  drawn and readable at 1280, 820 and 390 CSS pixels, shortening rather than
  overflowing".
  Why the line falls at 1280 is the footer's width budget, recorded as
  `iss-2609100445317801`: `MODELINE_BUDGET` is fifty-two characters, and at 820
  CSS pixels the message cell already gets only about fifty of them before
  anything is added beside it. Both ways of making room for the trail there
  were declined — shrinking the trail, and moving the message's own-line
  breakpoint from 520 to 820 — so the footer keeps exactly the layout it has
  today at 820 and at 390.
  Why a drop is acceptable at all is that this is a decoration and not
  information the application depends on. The chapter, the pane, the position,
  the prefix, the mark and the message all still say what they say at every
  width; what is missing below 1280 is a pleasure, not a fact. That is why
  nothing stands in for the trail there and nothing should be added later to do
  so — not a shorter bar, not a number, not an announcement. A compensating
  mechanism would be answering a question nobody asked.
  This is a deliberate drop of a discipline, not a shortfall to be closed
  later, and it is stated as a drop rather than restated as met. Recorded here
  rather than left to be inferred, following `iss-2609052143457583`.)

## Open Questions

_None recorded yet._

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-d08bfcc4ceb8 -->
Fidelity review — receipt rcp-d08bfcc4ceb8 (verifier abcd:intent-auditor claude-sonnet-5).

Provenance: abcd:intent-auditor@claude-sonnet-5 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:b03624e739067c5bef7e96a51e9b4c9ed1130c0011b1a703b66f4d57db7180c9
Input attestations: diff:HEAD..working-tree@-;

Acceptance rollup: MET 7 · MET_WITH_CONCERNS 2 · NOT_MET 0 · INCONCLUSIVE 0

Per-criterion verdicts:
- ac-1 — MET: chapterProgress returns 0 at the document start and the cell writes --at:0 with data-step 0, verified by a passing unit test
  evidence: src/editor.ts:473-477 — "export function chapterProgress(view: EditorView): number"
  evidence: src/modeline.test.ts:101-107 — "draws the cat at the left end and no trail behind it with the caret at the start"
- ac-2 — MET: at the caret's end, step reaches TRAIL_STEPS and --at is 1, verified by a passing unit test
  evidence: src/modeline.test.ts:109-113 — "fills the trail and puts the cat at the right end with the caret at the end"
- ac-3 — MET: a sweep across ten offsets asserts the drawn step is within 1/TRAIL_STEPS of the true proportion
  evidence: src/modeline.test.ts:115-121 — "puts the cat within one drawn step of the caret's proportion"
- ac-4 — MET: a scroll-only transaction carries no selection, so onChange is never invoked and a forced redraw lands on the same step
  evidence: src/modeline.test.ts:123-149 — "keeps the cat where it is when the view scrolls and the caret does not"
- ac-5 — MET: a real App is driven by a keydown event with no timer advance and no microtask flush, and the cell reads the new step synchronously
  evidence: src/modeline.test.ts:330-353 — "moves the cat in the same redraw as the caret, with no timer advanced"
- ac-6 — MET: chapterProgress guards doc.length === 0 and returns a finite 0, and the cell draws step 0 with the 'Start of the chapter' label
  evidence: src/editor.ts:474-476 — "if (doc.length === 0) return 0;"
  evidence: src/modeline.test.ts:151-160 — "draws the cat at the start of an empty chapter and divides by nothing"
- ac-7 — MET: a document.test.ts case opens a long chapter, moves to its end, opens a much shorter chapter, and confirms the cell reads the new chapter's caret and length rather than the previous one's
  evidence: src/document.test.ts:300-343 — "shows the newly opened chapter's progress, not the one before it"
- ac-8 — MET_WITH_CONCERNS: the jsdom-provable half of this criterion is met: role="img", an aria-label stating the proportion in words at three offsets, and aria-hidden="true" on both the track and the cat are all asserted and pass. The width half (that this is scoped to real windows >=1280) is not resolvable in jsdom, which applies no media queries; it rests on the still-unticked manual check M40-4
  evidence: src/modeline.ts:162-168 — "element.setAttribute("role", "img"); ... element.setAttribute("aria-label", trailLabel(0));"
  evidence: src/modeline.test.ts:169-191 — "labels the trail as a proportion in words"
  evidence: src/modeline.test.ts:193-204 — "hides the cat and the trail from assistive technology"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609091733493366.md:113-126 — "## M40-4 — the screen reader, at 1280"
- ac-9 — MET_WITH_CONCERNS: per the amendment, this criterion's own text already records the three-device-class discipline as not met and dropped for this element; judging the narrowed promise: one-source is proven (the cell reads selection.main.head and doc.length, the same fields cursorPosition reads), and AT-reachability at the widths the element exists is proven by the same aria tests as ac-8. The absence below 1280 is proven only at the CSS-text level in jsdom; a real narrow-window/screen-reader confirmation is the still-unticked manual check M40-9, and M40-9 itself now tests a false premise — see cond-2609100513433908 and gap_audit for the adjacent footer-layout reversal
  evidence: src/modeline.test.ts:78-100 — "reads the caret from the same field the line-and-column cell reads"
  evidence: src/modeline.test.ts:240-255 — "hides the cell below 1280 and nowhere else"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609091733493366.md:129-158 — "## M40-9 — the footer below 1280 is the footer it ships today, and silent"

Gap audit:
- honoured:
  - the measure is the caret's offset within the chapter, not scroll position, with the division and zero-length guard in one place
    evidence: src/editor.ts:473-477 — "Math.max(0, Math.min(1, selection.main.head / doc.length))"
  - no new subscription — the cat rides the existing selectionSet updateListener through app.ts's refresh(), so the cat and the caret redraw in the same turn
    evidence: src/modeline.test.ts:330-353 — "no timer advanced"
  - the cell writes nothing on the overwhelming majority of caret moves (the cost gate)
    evidence: src/modeline.test.ts:257-279 — "writes nothing to the cell when the caret moves inside one drawn step"
  - motion is honest — no transition, animation or requestAnimationFrame anywhere on the cell
    evidence: src/style.css:565-622 — ".modeline-progress / .modeline-track / .modeline-trail / .modeline-cat rules carry no transition or animation property"
  - the cell is decoration only: no title/tooltip, not part of the pane cycle, and the rest of the footer's cells and their order survive unchanged
    evidence: src/modeline.test.ts:193-204 — "expect(cell.getAttribute("title")).toBeNull();"
    evidence: src/modeline.test.ts:210-236 — "keeps every cell the footer already carries, in order"
  - docs and the intent-map were updated in the same change
    evidence: docs/tutorial-your-first-talk.md:19-24 — "In a window 1280 pixels wide or wider it also carries a short trail with a cat at its head"
    evidence: .abcd/development/brief/07-intent-map.md:56 — "40 | Show progress through the chapter as a cat on a rainbow trail"
- diverged:
  - the closed spec's own Design section lists 'any change to the footer's existing layout at any width' as out of scope under cond-2609100513433908, names 'raising the message's own-line breakpoint from 520 to 820' specifically as a proposal that 'was put to the maintainer and declined', and states the pre-existing message-budget issue iss-2609100445317801 is 'out of scope here in both directions: this design neither closes it nor worsens it' — yet the delivered CSS in this very diff does exactly that declined move
    evidence: .abcd/development/specs/closed/spc-2609091733493366-show-progress-through-the-chapter-as-a-cat-on-a-rainbow-trai.md:144-153 — "Any change to the footer's existing layout at any width ... raising the message's own-line breakpoint from 520 to 820 ... were put to the maintainer and declined."
    evidence: .abcd/development/specs/closed/spc-2609091733493366-show-progress-through-the-chapter-as-a-cat-on-a-rainbow-trai.md:153 — "Fixing `iss-2609100445317801` ... Out of scope here in both directions: this design neither closes it nor worsens it"
    evidence: src/style.css:651 — "@media (max-width: 820px) {"
    evidence: src/style.css:644-649 — "The breakpoint is the sidebar's, 820, and not the 520 it began as"
  - the issue this reversal is justified against (iss-2609100445317801) records itself as resolved by this same spec, with a fix description that matches the delivered CSS exactly, but nothing in the shipped intent or the closed spec's own body was amended to record that the earlier 'declined' decision was later reversed — the closed spec still reads as declining it
    evidence: .abcd/work/issues/resolved/iss-2609100445317801-the-modeline-s-message-budget-is-already-marginal-at-820-css.md — "resolved_by: spec: "spc-2609091733493366" --- The modeline's message budget is already marginal at 820 CSS pixels"
    evidence: .abcd/work/issues/resolved/iss-2609100445317801-the-modeline-s-message-budget-is-already-marginal-at-820-css.md — "the own-line breakpoint moves from 520 to 820, the sidebar's own width so one number answers for both"
  - the manual check M40-9 that this spec's Acceptance Mapping relies on to prove the footer at 820/390 is unchanged ('the footer as it ships today') now tests against a footer whose own-line wrap point has moved, so even if a human ticked it today they would be comparing against the wrong baseline unless they knew to re-read the spec's amendment history first
    evidence: .abcd/.work.local/logs/acceptance/spc-2609091733493366.md:129-158 — "## M40-9 — the footer below 1280 is the footer it ships today, and silent"
- missing:
  - the full manual acceptance run promised by the spec's own task list
    evidence: .abcd/.work.local/logs/acceptance/spc-2609091733493366.md:19-158 — "- [ ] At 1280: the trail is drawn in the footer"

Scope-condition dispositions:
- cond-2609091733494944 — untested: the population (Alice/the maintainer editing an open chapter) is a framing assumption the delivered code neither gates on nor contradicts; nothing in the diff exercises or falsifies it
- cond-2609091733497190 — untested: the code carries no platform branch (it runs identically in web and shell), so the desktop-Tauri-on-macOS assumption is neither exercised nor contradicted by anything automatable; real confirmation is the unticked manual checks run under `npm run tauri dev`
- cond-2609091733491196 — survived: chapterProgress reads selection.main.head over doc.length (the open chapter's own length), not a scroll position or whole-document length, and the scroll test confirms a scroll-only transaction never touches the step
  evidence: src/editor.ts:473-477 — "selection.main.head / doc.length"
  evidence: src/modeline.test.ts:123-149 — "keeps the cat where it is when the view scrolls and the caret does not"
- cond-2609091733496338 — survived: the progress cell is built and appended inside createModeline alongside the other footer cells, never inside the editing surface, confirmed by the footer's own cell-order test
  evidence: src/modeline.ts:198-227 — "const progressCell = progressDrawing();"
  evidence: src/modeline.test.ts:210-215 — ""modeline-progress","
- cond-2609091733494632 — survived: the cell carries no title attribute (unlike every action-bearing cell), is not referenced anywhere in the pane-cycle code, and the footer's other cells keep their existing content, order and meaning
  evidence: src/modeline.test.ts:200-201 — "expect(cell.getAttribute("title")).toBeNull();"
  evidence: src/modeline.test.ts:210-232 — "keeps every cell the footer already carries, in order"
- cond-2609091733490147 — survived: no transition, animation, requestAnimationFrame or timer appears anywhere in the delivered CSS or TS for the cell; the drawing updates only inside the existing synchronous redraw
  evidence: src/style.css:565-622 — ".modeline-progress / .modeline-trail / .modeline-cat rules"
  evidence: src/modeline.ts:285-291 — "if (step !== drawnStep) { drawnStep = step; ... }"
- cond-2609091733499104 — survived: the track carries a visible border independent of fill, and the cat is drawn as a high-contrast ink-on-shell disc rather than depending on the rainbow being distinguishable; exact contrast ratios are asserted only in prose, and full confirmation is the unticked manual check M40-3
  evidence: src/style.css:583-589 — ".modeline-track { ... border: 1px solid var(--rule);"
  evidence: src/style.css:607-622 — ".modeline-cat { ... color: var(--ink); background: var(--shell);"
- cond-2609100513433908 — narrowed: the part of this condition that governs the progress cell itself holds: the trail and its cell are drawn and announced together only at >=1280 CSS pixels (one display:none rule at max-width:1279px), and nothing substitutes for the trail below it. But the same condition's own text also covers 'any change to the footer's existing layout at any width' and names the exact move — raising the message's own-line breakpoint from 520 to 820 — as a proposal 'put to the maintainer and declined'; the delivered diff makes exactly that move (src/style.css, @media max-width: 520px -> 820px), justified in a new comment citing iss-2609100445317801, whose own resolution record names this spec as the fix. That half of the condition did not hold as written in the closed spec
  narrowing: holds for the progress cell's own presence/absence and the absence of any compensating mechanism below 1280; does not hold for the adjacent, explicitly-declined promise that no other part of the footer's layout would change at any width — the message-wrap breakpoint moved from 520 to 820 in the same delivery, with no amendment recorded against the intent or the closed spec text to reconcile it
  evidence: src/style.css:628-631 — "@media (max-width: 1279px) { .modeline-progress { display: none; } }"
  evidence: src/modeline.test.ts:240-255 — "hides the cell below 1280 and nowhere else"
  evidence: .abcd/development/specs/closed/spc-2609091733493366-show-progress-through-the-chapter-as-a-cat-on-a-rainbow-trai.md:144-153 — "raising the message's own-line breakpoint from 520 to 820 ... were put to the maintainer and declined"
  evidence: src/style.css:651 — "@media (max-width: 820px) {"
## Grounds

- pursued: the caret's offset within the open chapter is the measure a writer actually wants, and it is a function of two numbers the modeline already redraws from; wrong if the maintainer finds the cat sitting still while they read and wants it to follow their eye, or if the redraw is too coarse to track a moving caret
