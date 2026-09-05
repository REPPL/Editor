---
id: spc-2609051353425884
slug: shape-the-deck-in-the-same-text
intent: itd-2609051335458626
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Shape the deck in the same text

## Summary

This spec delivers the shaping half of the bundle *The deck* for
`itd-2609051335458626`: the five phase-1 slide constructs — the horizontal rule
split, the `{.divider}` heading attribute, the `.columns` div, the `.notes` div
and the `.credit` div — and the obligation, stated once here for the whole
bundle, that the article and the paper ignore them. `spc-2609051353412219` is
the other half and owns the parse, the intermediate tree, the default mapping,
the deck renderer, the Present command and the site build; this spec adds
`src/core/canon.ts`, the one table that says what each construct does in each
rendering, the override paths through `src/core/deck.ts` that read it, the
column and credit styling, and the palette's canonical forms. Nothing here
touches the source: every construct is already Pandoc-compatible Markdown, so
shaping a deck is typing into the chapter and the file stays byte for byte what
the author wrote.

## Scope

### In, by module

| Path | Change |
|---|---|
| `src/core/canon.ts` | new: the construct-to-placement table of `05-internals.md` section 3, one row per construct, one column per rendering |
| `src/core/deck.ts` | the rule split, the divider slide, authored notes, the credit foot, columns as face content, the ignored comment |
| `src/core/render/slides.ts` | the divider, columns and credit markup and their stylesheet rules |
| `src/core/render/article.ts` | the Article column of the same table: columns in flow, notes absent, divider an ordinary heading, credit a margin note |
| `src/core/palette.ts` | new: the canonical form of each phase-1 slide construct, as data |
| tests | `src/core/canon.test.ts`, `src/core/shaping.test.ts`, `src/core/degrade.test.ts`, and the shared `src/core/examples.test.ts` snapshots |

### Out

The palette surface itself — how it opens, how it is searched, and that the
form arrives at the cursor — which is map #3 (`itd-2609051335415528`); this
spec supplies only the forms it writes. The article as a rendering (map #9,
phase 2) and the printed paper (map #21, phase 6): what is in scope here is
their obligation to ignore, proved against the article skeleton
`spc-2609051353412219` emits. Citation-supplied credit lines, which are map #11
(`itd-2609051335502171`) in phase 2. The `.callout`, `.margin`, `.variant`,
`.video`, `.opening`, `.egg` and `{.refs}` constructs, none of which is seeded
in phase 1 by `06-delivery.md`.

### Boundaries respected

Map #5 (`itd-2609051335447894`) owns the default mapping — Section to
horizontal slide, Sub-section to vertical slide, image to its own slide, prose
to generated notes. This spec only overrides or subdivides it, and every
override is a row in `src/core/canon.ts` rather than a branch a renderer keeps
to itself: "The table, not each renderer, is where an ignore rule lives."

### Disciplines inherited, and how each is proven

| Discipline | Proven by |
|---|---|
| One source, always (`itd-2609051336090390`) | `src/core/shaping.test.ts`: deck and article skeleton come from one `parseChapter` result, and no construct is authored twice |
| Degrade gracefully in a plain tool (`itd-2609051336110536`) | `src/core/degrade.test.ts`, the shaped-versus-stripped comparison below |
| Round-trip byte-fidelity (`itd-2609051336074533`) | `src/core/degrade.test.ts`, "leaves every byte outside the inserted div alone"; no renderer holds a writable handle on the source |
| Legible on three device classes (`itd-2609051336128348`) | the manual column check at 390, 820 and 1280 CSS px, in the mapping below |
| No machine in the document (`itd-2609051336080960`) | every construct is text in the chapter; `src/core/palette.ts` writes no path |
| Network only on publish (`itd-2609051336158553`) | the constructs add no fetch; the stylesheet ships with the deck |
| The renderings agree (`itd-2609051336130664`), from phase 2 | `src/core/canon.test.ts` asserts each construct's row is complete and that both renderers read it rather than deciding for themselves |

## Design

### The canon table

`src/core/canon.ts` transcribes the mapping table of `05-internals.md` section
3 as data, one row per construct, one placement per rendering:

```ts
type Placement = "face" | "notes" | "foot" | "own-slide" | "flow"
  | "margin" | "split" | "ignored" | "absent";

interface CanonRow { construct: string; match: BlockMatch;
  slides: Placement; article: Placement; print: Placement }
```

The phase-1 rows, quoted from that table:

| Construct | Slides | Article | PDF |
|---|---|---|---|
| Horizontal rule | `split` — "splits the slide" | `flow` — "a rule in the text" | `flow` — "a rule" |
| `.divider` heading | `face`, headline alone — "a section-break slide" | `flow` — "an ordinary heading" | `flow` |
| `.columns` | `face` — "side-by-side columns" | `flow` — "ignored; content in flow" | `flow` |
| `.notes` | `notes`, authored — "speaker notes" | `absent` | `absent` |
| `.credit` | `foot` — "line at the foot of the slide" | `margin` — "margin note" | `margin` — "a note" |
| `<!-- pagebreak -->` | `ignored` | `ignored` | a page break, phase 6 |
| Footnote | `foot` — "line at the foot of the slide" | `margin` | phase 6 |

A construct with no row is unknown to this phase. An unrecognised fenced div is
not dropped: its children are placed by the default rule and its classes are
carried onto the wrapper element, so `.callout` in a chapter today reads as its
own text and becomes a callout box in phase 2 without the source changing.

### The five constructs

Each is one of the five permitted forms, so a plain tool reads past it.

**The rule.** `---` alone on a line, blank line either side. It closes the
current slide and opens a continuation slide, on the axis of the innermost
slide-bearing heading in force: horizontal beneath the chapter title or a
Section, vertical beneath a Sub-section. `04-surfaces.md` section 5 allows it
"anywhere below the chapter title: in a Section, in a Sub-section, or before
the first Section to split the opening slide", and the decision log of
2026-09-05 records the same. The continuation slide belongs to the Section it
was split from, carries no headline of its own, and takes the blocks after the
rule onto its **face** rather than into its notes — which is how prose reaches
an audience at all. A Sub-sub-section has no slide, so a rule inside its text
splits on its Sub-section's axis; the intent leaves that undecided and this is
the assumption the build takes.

**The divider.** `## Interlude {.divider}`, and on a chapter's own `#` heading
too. The slide's face is the headline alone; the prose beneath it becomes its
generated notes, per the decision log. The attribute is consumed by the parse,
so `.divider` reaches the slide as a class on the section element and never as
rendered text.

**Columns.** The canonical form, quoted whole:

```
::: {.columns}
::: {.column width="50%"}
Left.
:::
::: {.column width="50%"}
Right.
:::
:::
```

The div is face content wherever it sits, because the table says `face` and not
`notes`; the default prose rule does not reach it. `renderSlides` emits a grid
whose track sizes are the declared `width` values, and the deck's stylesheet
collapses it to one column below 820 CSS px, so the columns stack in source
order with nothing to scroll sideways. An image inside a column is column
content, never an image slide.

**Notes.** `::: {.notes}` replaces "the notes the slide mapping would generate
for the slide whose content the div follows" — that is, the slide in force when
the div is reached, which is why a notes div written after a rule attaches to
the second slide and leaves the first slide's generated notes alone. A second
notes div on one slide appends rather than replaces again.

**The credit.** `::: {.credit}` is placed `foot`: rendered as a single line
under the slide's face, in the deck's credit style rather than as body type. A
footnote definition referenced from a slide prints in the same place, per the
decision log of 2026-09-05 and the section 3 table. In the article skeleton it
is `<aside class="credit">` for the phase-2 margin.

**The page break.** `<!-- pagebreak -->` alone on a line is `ignored` in both
phase-1 renderings: no slide break, no blank slide, no output.

### The palette's forms

`src/core/palette.ts` holds one entry per construct — id, label, the canonical
text, and the offset at which the cursor lands — as data, in the pattern the
binding table already uses. Map #3 renders and inserts them; this spec is
answerable only for the text being exactly the form above, which
`src/core/canon.test.ts` checks by parsing each entry and asserting it yields
the construct it claims.

### Proving the plain tool

`src/core/degrade.test.ts` builds two chapters: one carrying a rule, a
`{.divider}` heading, a `.columns` div, a `.notes` div and a `.credit` div, and
one with every construct stripped and the prose otherwise identical. Both are
converted by a bare markdown-it instance with no Editor plugin registered —
the plain tool that "knows none of them" — and the test asserts that the two
conversions carry the same prose, in the same order, with no paragraph lost and
the last paragraph present in both. Pandoc is not a dependency of this
repository (`AGENTS.md`: "a development convenience... not part of the
pipeline"), so the same comparison against `pandoc` is a manual check recorded
with the phase's acceptance run.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| A `---` inside a Section makes two slides split at the rule, both in the main line, the text after the rule on the second slide rather than in the first's notes | `src/core/shaping.test.ts`, "splits a Section at a rule and puts the following text on the second slide" |
| `## Interlude {.divider}` gives a section-break slide showing the headline alone, with `.divider` nowhere in any slide's rendered text | `src/core/shaping.test.ts`, "makes a divider slide with its headline alone"; `src/core/render/slides.test.ts`, "carries a divider as a class and never as text" |
| A `.columns` div sits side by side in the declared proportions at 1280 and 820 CSS px and stacks in source order at 390 with no horizontal scrolling or pinch zoom | `src/core/render/slides.test.ts`, "sizes the column tracks from the declared widths"; manual: `npm run tauri dev`, Present `examples/presentation/01-slides/02-where-im-coming-from.md` and measure at each width |
| A `.notes` div's text is the speaker note, the Section's own paragraph is not the generated note, and neither appears on a slide | `src/core/shaping.test.ts`, "lets an authored notes div replace the generated note" |
| A notes div after the second slide's content attaches to that slide alone; the first keeps its generated notes | `src/core/shaping.test.ts`, "attaches a notes div to the slide whose content it follows" |
| A `.credit` div renders as a line at the foot of the slide, as a line and not as body text | `src/core/shaping.test.ts`, "puts a credit at the foot of its slide"; `src/core/render/slides.test.ts`, "renders a credit in the credit style" |
| A shaped chapter and a stripped copy convert to the same prose in the same order through a plain tool, nothing lost or swallowed, the end of the file reached | `src/core/degrade.test.ts`, "converts to the same prose with the constructs stripped"; the manual Pandoc run beside it |
| `<!-- pagebreak -->` alone on a line makes no slide break, no blank slide and no visible output | `src/core/shaping.test.ts`, "ignores a page-break comment" |
| Inserting a `.notes` div changes only the inserted div and its blank lines: nothing reflowed, re-escaped or realigned | `src/core/degrade.test.ts`, "leaves every byte outside the inserted div alone" |
| Inherits: seven disciplines | the table under Scope |
| The article ignores these constructs (bundle obligation, stated here) | `src/core/canon.test.ts`, "gives every phase-1 construct a placement in both renderings"; `src/core/render/article.test.ts`, "puts columns in the flow, omits notes, keeps a divider an ordinary heading" |
| The constructs on real documents | `src/core/examples.test.ts`, whose snapshots cover the rules, dividers, columns, notes and credits of `examples/talk` and `examples/presentation` |

## Tasks

1. Write `src/core/canon.ts` from the section 3 table, and the completeness
   test over it — `npx vitest run src/core/canon.test.ts`.
2. Add the rule split to `src/core/deck.ts`, with the axis rule and the face
   placement of what follows — `npx vitest run -t "splits a Section at a rule"`.
3. Add the divider slide and its notes — `npx vitest run -t "divider"`.
4. Add authored notes and their attachment to the slide in force —
   `npx vitest run -t "notes div"`.
5. Add the credit foot, and the footnote definitions that share it —
   `npx vitest run -t "credit"`.
6. Add columns to `src/core/render/slides.ts` with the declared track sizes and
   the 820 px collapse — `npx vitest run src/core/render/slides.test.ts`.
7. Add the ignore rules to `src/core/render/article.ts` —
   `npx vitest run src/core/render/article.test.ts`.
8. Write `src/core/palette.ts` and assert each form parses to its construct —
   `npx vitest run src/core/canon.test.ts`.
9. Write `src/core/degrade.test.ts`, both halves — `npx vitest run
   src/core/degrade.test.ts`.
10. Refresh the example snapshots and read them — `npx vitest run
    src/core/examples.test.ts`.
11. Run the manual column-width and Pandoc checks, then
    `npm test && npm run lint && npm run build`.

## Risks and Open Questions

- **Where a rule may split.** The intent records this as open: "what a rule
  does inside a Sub-sub-section's text, and what it does before the chapter's
  first Section, is not yet decided". `04-surfaces.md` settles the second — it
  splits the opening slide — and the build assumes the first, that a rule
  inside a Sub-sub-section's text splits on its Sub-section's axis. Both
  assumptions are one function in `src/core/deck.ts`.
- **Prose beneath a `{.divider}` heading.** The intent records this as open,
  and the decision log of 2026-09-05 answers it — "prose under a divider
  heading becomes its notes" — so the build follows the log. If the log is
  wrong the alternative is dropping that prose, which the intent's own wording
  ("or is dropped") allows and which no discipline forbids.
- **The slide theme.** Open in `03-evidence.md` under "Article and slides".
  Until it is settled, "dividers, columns and credit lines have no appearance
  of their own": this spec gives each a class and the minimum layout its
  criterion tests — proportions, stacking, a credit that is a line and not a
  paragraph — and no more.
- **The closed set.** The intent's mechanism says the closed set is wrong "if
  an author needs a sixth construct in the first real talk".
  `examples/presentation` already reaches for `{.refs}`, which
  `examples/CANON-CHECK.md` lists under "Beyond the canon" while
  `05-internals.md` section 3 defines it. Phase 1 does not seed it, so the
  build treats a `{.refs}` heading as an ordinary Section heading and carries
  the class through. That is the sixth construct arriving early, and it is
  reported rather than designed around.
- **The plain tool.** The criterion says "a plain Markdown tool that knows none
  of them". A bare markdown-it is the tool the test suite can run; Pandoc, the
  tool the canon is written against, is a manual check because it is not a
  dependency of this repository.
- **Two blank lines around an inserted div.** The byte-fidelity criterion
  allows "the inserted div and its surrounding blank lines" to differ. The
  build inserts exactly one blank line either side, and normalises nothing
  else, so the diff is bounded and predictable.
