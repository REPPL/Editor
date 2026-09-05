---
id: spc-2609051353398011
slug: insert-a-construct-i-cannot-remember
intent: itd-2609051335415528
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Insert a construct I cannot remember

## Summary

This spec delivers map #3, `itd-2609051335415528`: one chord opens a filterable
palette, Alice types three letters, and the canonical form of the construct she
meant lands at her cursor with the cursor where the content goes. Nothing of it
exists yet. What it adds is `src/core/canon.ts` — the canon of
`05-internals.md` section 3 written once as data, sixteen rows carrying the
exact form, its cursor position, and the node it must parse to — and
`src/palette.ts`, an overlay over that data using the contract
spc-2609051353381023 provides. Phase 1 offers six of the rows; the other ten are
present as data and covered by the tests, so a later phase adds a line rather
than a form. It is the third of the three specs in the Editing surface bundle.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/core/canon.ts` | absent | new: sixteen `Construct` rows — id, label, keywords, form, cursor, expected node, the phase it becomes visible in |
| `src/core/parse.ts` | created by spc-2609051353137620 | extended: the container names and the attribute rules the canon needs, in one instance |
| `src/palette.ts` | absent | new: the overlay, its filter, and the insertion |
| `src/keys.ts` | owned by spc-2609051353381023 | one row added: `insert-palette` on `C-c i` |
| `src/app.ts` | shared | the palette command only |
| `src/canon.test.ts` | absent | new: every row's form against section 3, its parse, and its plain-tool reading |
| `src/palette.test.ts` | absent | new: filtering, insertion, the cursor, and cancel |

### Out

- What any construct *means* in a rendering. Each belongs to the intent that
  renders it: map #6 the slide constructs, map #9 the callout and the margin
  aside, map #11 citations, map #12 the eggs and the opening quotation, map #14
  the variant marks, map #16 the video sources, map #21 the page break
  (cond-2609051353398378). This spec owns only that the canonical form appears
  at the cursor, correct and complete.
- The canon itself, which is `05-internals.md` section 3 and is quoted here, not
  invented (cond-2609051353396144).
- The palette in any host but the desktop app (cond-2609051353399760). The code
  is frontend, so the single file inherits it with map #17; nothing is claimed
  for it here.
- The overlay contract, the cancel rule, and the binding table:
  spc-2609051353381023. The sidebar, the outline, and `parse.ts` itself:
  spc-2609051353137620.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| Round-trip byte-fidelity `itd-2609051336074533` | "inserts every construct and writes the buffer byte for byte": the buffer is the file's text, an insertion is a single edit, and nothing re-serialises |
| No machine in the document `itd-2609051336080960` | no row's form carries a path, a name, or a machine-local value; the video row writes an empty `local:` for Alice to fill |
| One source, always `itd-2609051336090390` | the palette is the only writer of these forms in the app, so each construct's spelling has one implementation (ADR `adr-2609051324147479`) |
| Degrade gracefully in a plain tool `itd-2609051336110536` | "every form is one of the five permitted shapes" and "a plain reader reaches the end of the file" |
| Legible on three device classes `itd-2609051336128348` | manual check M6 at 390, 820, and 1280 |
| Network only on publish `itd-2609051336158553` | the palette is data and DOM; the offline sweep of spc-2609051353137620 covers the window it runs in |

## Design

Layers and bundle ownership are as spc-2609051353137620 sets them out. This spec
owns `src/core/canon.ts` and `src/palette.ts`, extends `parse.ts` rather than
forking it, and adds one row to the binding table.

### The canon as data

```
Construct {
  id, label, keywords[],           what the filter matches
  form: string,                    the exact text, cursor marked
  shape: "block" | "inline" | "heading-attribute",
  expects: { type, attrs },        the node the mapping table names
  visibleFrom: 1 | 2 | 3 | 4       the phase it becomes an offered entry
}
```

`form` carries one cursor marker, `▮`, stripped on insertion. One marker and one
rule: it sits where the content goes, which is the press release's promise. Where
a form also has an attribute value to fill — a variant name, an egg id — the
label says so and Alice types it after the content; a second stop would need a
tabbing convention the brief does not describe.

Three shapes, because inserting is not the only gesture. A `block` is inserted
at the cursor, preceded and followed by a blank line where the surrounding text
needs one. An `inline` is inserted at the cursor with no surrounding blank
lines. A `heading-attribute` appends its attribute to the heading on the cursor's
line and inserts nothing, which is what the intent's third criterion requires of
Divider.

### The sixteen forms, quoted from `05-internals.md` section 3

Phase 1 offers the first six; `visibleFrom` holds the rest back. The press
release names fourteen; the count here is sixteen because the horizontal-rule
split — which cond-2609051353392265 and `06-delivery.md` both put in the
seeded set — is an entry of its own, and because the easter egg, like the
variant, is written in two places and the canon spells both.

```
slide-split      block             ---                        [blank line either side]
divider          heading-attribute ## Interlude {.divider}     [appends {.divider}]
columns          block             ::: {.columns}
                                   ::: {.column width="50%"}
                                   ▮
                                   :::
                                   ::: {.column width="50%"}

                                   :::
                                   :::
speaker-notes    block             ::: {.notes}
                                   ▮
                                   :::
credit           block             ::: {.credit}
                                   ▮
                                   :::
page-break       block             <!-- pagebreak -->▮

callout          block             ::: {.callout kind="warning"}
                                   ▮
                                   :::
margin-aside     inline            [▮]{.margin}
variant-block    block             ::: {.variant variant=""}
                                   ▮
                                   :::
variant-span     inline            [▮]{.variant variant=""}
video            block             ::: {.video}
                                   - local: ▮
                                   :::
citation         inline            [@▮]
footnote         inline            ^[▮]
egg-marker       inline            [✦]{.egg egg="▮"}
egg-block        block             ::: {.egg #▮ label="✦"}

                                   :::
opening          block             ::: {.opening once="per-browser"}
                                   > ▮
                                   :::
```

Three of these are deliberate reductions of a form section 3 writes fuller, and
each is recorded in Risks: the video block omits `poster` and `caption` and
names one source; the citation writes the plain key form, leaving the locator
and the in-prose form to Alice; the footnote writes the inline form, leaving the
reference-and-definition pair to map #11. Section 3's `.refs` heading, image
width, cross-reference target, and table caption are canon but are not palette
entries: the palette need not cover every form, and the seventh criterion only
forbids offering one that is *not* in the canon.

### The palette

`src/palette.ts` opens through `openOverlay` from spc-2609051353381023, so it
takes the keyboard, moves on the table's own chords, chooses on `Return`, and
closes on `C-g` and on `Escape` without touching the document. Typing filters on
label and keywords by prefix and then by substring, so "col" reaches Columns
before Callout. Choosing dispatches exactly one CodeMirror transaction: the form
with the marker stripped, and a selection at the marker's offset. One
transaction matters twice — undo takes an insertion back in one press, and the
buffer's text after the insertion is what a save writes, byte for byte.

Rows whose `visibleFrom` is above the current phase are not listed. Nothing else
distinguishes them: they carry their form, their parse expectation, and their
tests from the day this spec lands, so map #9, #11, #12, #14, #16 and #21 each
flip one number.

### Proving a form is the canon's form

Two assertions, over every row and not only the offered six.

The **parse** assertion runs `parse.ts` over the inserted form and checks the
node against `expects`: a `.columns` container holding two `.column` containers
with `width="50%"`, a `.notes` container, a heading token carrying the class
`divider`, a bracketed span with `class="margin"`, an inline footnote token, an
HTML comment token whose content is `pagebreak`. `parse.ts` gains the container
names and nothing else; the citation plugin arrives with map #11, so the
citation row's expectation in this phase is that `[@key]` survives as text, which
is what a plain reader does with it too.

The **plain-tool** assertion runs a second markdown-it with no plugins at all —
CommonMark and nothing more — over a chapter holding one of every row, and
asserts that every paragraph of prose appears in the output in source order and
that the last paragraph is reached. That is the sixth criterion and the
graceful-degradation discipline in one check, and it costs no dependency because
the plain instance is the same package unconfigured.

Byte-fidelity needs no serialiser here and gets none. The buffer holds the
file's text (`04-surfaces.md`: "what the editing surface holds is the file's
text"), an insertion is one edit inside it, and `write_chapter` writes those
bytes. The test asserts the buffer after insertion equals the expected text
exactly and that a save writes it unchanged.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| Columns on a blank line inserts the exact form, cursor inside the first column's body | `src/palette.test.ts` › "inserts the columns form with the cursor in the first column" |
| Speaker notes inserts `::: {.notes}` with its fence, cursor on the body line, no other line changed | `src/palette.test.ts` › "inserts speaker notes and changes no other line" |
| On the line `## Interlude`, Divider makes it `## Interlude {.divider}` and inserts no block | `src/palette.test.ts` › "appends the divider attribute to the heading on the cursor's line" |
| Every construct inserted once, parsed and serialised without editing, returns byte for byte and parses to the node the mapping table names with its attributes as written | `src/canon.test.ts` › "parses every construct to the node the mapping table names" and `src/palette.test.ts` › "inserts every construct and writes the buffer byte for byte" |
| Cancel with "col" typed inserts nothing and leaves the chapter byte for byte; Escape the same | `src/palette.test.ts` › "cancels on C-g and on Escape without touching the chapter" |
| A plain Markdown tool renders every paragraph and reaches the end of the file | `src/canon.test.ts` › "a plain CommonMark reader reaches the end of a chapter using every construct" |
| Every entry's form matches a form written in section 3; the palette offers nothing outside the canon | `src/canon.test.ts` › "every form is one of the five permitted shapes" and "every offered entry has a form section 3 writes" |
| The palette and its labels stay legible at 390, 820, and 1280, and Return still inserts | manual check M6 |
| Round-trip byte-fidelity | `src/palette.test.ts` › "inserts every construct and writes the buffer byte for byte" |
| No machine in the document | `src/canon.test.ts` › "no form carries a path or a machine-local value" |
| One source, always | `src/canon.test.ts` › "the palette is the only writer of a canonical form" — a source sweep for the literal `:::` outside `canon.ts` |
| Degrade gracefully in a plain tool | the plain-CommonMark test above |
| Legible on three device classes | manual check M6 |
| Network only on publish | the offline sweep of spc-2609051353137620 |

Manual check, run with `npm run tauri dev`:

- **M6** — at 390, 820, and 1280 CSS pixels, open the palette, type to filter,
  and press Return; the list and its labels stay legible, nothing scrolls
  sideways, and the form lands at the cursor.

## Tasks

1. Add `src/core/canon.ts` with all sixteen rows and their `visibleFrom`.
   Verify: `npx vitest run src/canon.test.ts` once step 2 lands.
2. Add `src/canon.test.ts`: the five-shapes check, the section 3 check, the
   parse check, the plain-CommonMark check, and the machine-local sweep.
   Verify: `npx vitest run src/canon.test.ts`.
3. Extend `src/core/parse.ts` with the container names the canon uses.
   Verify: `npx vitest run src/canon.test.ts`.
4. Add `src/palette.ts` over `openOverlay`, with the filter and the single
   transaction. Verify: `npx vitest run src/palette.test.ts`.
5. Add the `heading-attribute` branch for Divider.
   Verify: `npx vitest run -t "appends the divider attribute"`.
6. Add the `insert-palette` row on `C-c i` to `src/keys.ts` and wire the command
   in `src/app.ts` and `src/emacs.ts`.
   Verify: `npx vitest run -t "insert-palette"` and `npm test`.
7. Add the cancel and byte-fidelity tests.
   Verify: `npx vitest run src/palette.test.ts`.
8. Run M6 and record the result against this spec. Verify:
   `npm run build && npm run lint && npm test`.

## Risks and Open Questions

- **The video block's poster** is open in `03-evidence.md`: "which poster frame
  a video block uses when the author supplies none", which the intent says
  decides whether the palette's video entry writes a `poster` attribute at all.
  The build assumes it does not, and writes `::: {.video}` with one empty
  `local:` source. Adding the attribute later changes one string.
- **Whether an easter egg's content may itself be variant-marked** is open in
  `03-evidence.md`, and decides whether one choice can produce nested divs. The
  build assumes not: `egg-block` writes one div, and Alice nests a variant block
  inside it by choosing twice if she wants one.
- **The variant name** has no source in phase 1, because `document.yaml`'s
  `variants` list is read by map #14. The build writes `variant=""` with the
  cursor at the content and the label saying the name is hers to fill. A name
  the document has not declared is already defined behaviour: section 3 leaves
  the block out of every rendering and lists it in the sidebar.
- **Sixteen rows against a press release that names fourteen.** The two extra
  are the horizontal-rule split, which `06-delivery.md` and
  cond-2609051353392265 both put in the seeded set, and the easter egg's second
  form. Neither is a construct outside the canon, which is what the seventh
  criterion actually forbids, but the count is a divergence from the intent's
  own list and is recorded as one.
- **`C-c i`** is unbound in the shipped keymap and Control-c is not copy on
  macOS, but no checklist row has yet pressed it in the real window. It is row
  14 of `docs/spike-emacs-keys.md` under spc-2609051353381023.
- **markdown-it is not the parse tree of `05-internals.md` section 2**, which
  carries source spans and variant sets. It is enough to prove a form parses to
  the right node with the right attributes, which is all this spec claims. The
  spanned tree arrives with the serialiser, and this spec's expectations are
  written as assertions about the construct rather than about markdown-it, so
  the harness can move under them.
