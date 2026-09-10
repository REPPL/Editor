---
id: spc-2609091733496272
slug: the-maintainer-settles-the-vocabulary-question-editor-follow
intent: itd-2609091722353594
origin: researcher-authored
production_mode: hand-written
---
# See what a prefix can do, without leaving the prefix

## Summary

This spec delivers `itd-2609091722353594` in two unequal halves.

The larger half is Emacs's `describe-prefix-bindings`, on demand: with a
prefix half-typed, `C-h` opens an overlay listing every chord that begins with
that prefix, each with the label of the row it reaches. Typing the rest of a
chord runs it and closes the overlay; a step that is itself a longer prefix
narrows the list and keeps reading; `C-g` and Escape close it having run
nothing. There is no timer, no debounce and no idle callback anywhere in this
design — the maintainer settled against which-key's idle popup
(cond-2609091733497194), and the on-demand form is the shape `C-h k`'s own
prompt already proves in `src/prose.ts`.

The smaller half is `F1` as a third chord on the `keys-panel` row, beside
`C-h b` and `C-x S-/`. `F1` is a leaf and never a prefix
(cond-2609091733498703), and it reaches the panel from the editing surface,
exactly where `C-h b` already reaches it and nowhere else. That is one line in
`src/keys.ts` and nothing more: `keys-panel` does **not** become a row the pane
readers answer. The maintainer settled that on 2026-09-10, and the intent's
seventh criterion is amended to say so; Design § `F1`, and only from the text
records what the wider reading would have cost.

One consequence of the two halves landing together needs stating where a reader
will look for it, because it reads as an inconsistency and is not: `C-h` is
live in `src/focus.ts`'s reader for `prefix-help` and not for `keys-panel`.
Design § `C-h` in the pane readers, and only mid-prefix says why the two are
different questions.

Three findings from reading the real source changed the design from what the
intent's Mechanism anticipated, and each is written up below rather than
glossed:

- **The two prefix readers keep their prefixes in two different notations.**
  `emacsStatus(view).prefix` returns the vendored package's own `keyChain`
  string; `focus.prefix` returns a chord in the binding table's notation. They
  agree on every prefix Editor ships today, and they are not the same format
  in general (`Digit5`, `Comma`, `Esc`, `CMD-`). The design never converts one
  into the other: it maps table chords *forward* through `toPackageChord` —
  the same call that bound them — and compares. Design § One prefix, two
  notations.
- **The `C-h` that follows a prefix has to be caught before the package's own
  reader sees it**, because `findCommand` resolves an unbound sequence by
  setting `data.keyChain = ""` and returning nothing: the chain is gone before
  anything downstream could read it. It is caught in the `handleKeyboard`
  wrapper in `src/emacs.ts`, one line above where `swallowedChord` already
  catches the same class of defect. Design § Hearing `C-h` in the editing
  surface.
- **A `prefix-help` row carrying the chord `C-h` breaks one shipped invariant
  test**, because `C-h` is also an entry in `SUPPRESSED` and
  `src/emacs-keys.test.ts` › "suppresses a chord instead of listing it, never
  both" sweeps the whole table. The invariant is amended, narrowly and with
  its exception asserted in both directions, and the docs sentence that states
  the same rule to a reader is corrected with it. Design § The one chord that
  is both suppressed and listed. This is the riskiest edit in the spec and it
  is named again under Risks.

Nothing here adds an index, a second binding list, or a second prefix state.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/prefix-help.ts` | absent | new: the filter over the binding table, the overlay that renders it, and the reader that completes a chord from inside it. One exported entry point, `openPrefixHelp`, and one exported predicate, `completionsUnder`, so the filter is testable without a DOM |
| `src/prefix-help.test.ts` | absent | new: the filter, the ordering, the multi-chord row, the narrowing step, the cancel, and the rows-come-from-the-table sweep |
| `src/keys.ts` | exists: 140 rows, `SUPPRESSED`, `chordIndexIn`, `canonicalChord`, `scopeOf` | one new `editor` row, `prefix-help`, on `C-h`; `F1` appended to the `keys-panel` row's chords; the `C-h` `SUPPRESSED` entry's `why` corrected to say it is now also a row |
| `src/emacs.ts` | exists: `trackHandlers`'s `handleKeyboard` wrapper, `swallowedChord`, `toPackageChord`, `run(id)`, `EditorCommands`, `runBinding` | one guard beside `swallowedChord` that catches `C-h` on a live chain, spends the chain and the count, and calls `run("prefix-help", prefix)`; one helper that spells a live chain in the table's notation by mapping table chords forward through `toPackageChord`; `EditorCommands` and `run` widened by one optional argument |
| `src/focus.ts` | exists: `answering()`, `run(id)`, `pending`, `chordsOf`, `FocusHooks` | one branch in `onKeydown` that catches the prefix-help row's chord on a live `pending`, clears it, and calls one new hook; `FocusHooks` gains `prefixHelp(request)`. `answering()`, `run(id)` and the rows every pane answers are **unchanged** |
| `src/keyspanel.ts` | exists: `render()`, the private `row(binding, rows)`, `OWNER_NOTES` | `row` is generalised to take the chords it should print and exported as `bindingLine`, so the overlay draws a binding line through the one function that already draws one; `render()` calls it with `binding.chords` and is otherwise unchanged |
| `src/app.ts` | exists: the `registerCommand` map, `overlayHost`, `announce`, `createFocusModel(...)` | one entry in the command map, `prefix-help`, which mounts the overlay in `overlayHost` and runs a chosen row through the existing `runBinding`; one more `FocusHooks` member doing the same for the other reader |
| `src/style.css` | exists: `.overlay` (already `max-height: 70vh; overflow-y: auto`), `.keys-panel-heading`, `.keys-list`, `.keys-row`, `.keys-chords`, `.keys-owner` | `.prefix-help-heading` and `.prefix-help-hint` added to the two existing selector lists. No new rule, no new geometry: the overlay's own scroll and width are already there |
| `src/emacs-keys.test.ts` | exists: the conformance sweeps, the per-scope uniqueness sweep, the suppression invariant, the `C-h b` test, the prefix tests | the suppression invariant amended with one named, asserted exception; the `C-h b` test widened by `F1`; five new tests for the overlay reached through a real editing surface. The `everywhere` map in the uniqueness sweep is **unchanged**: `keys-panel` is not a row every pane answers |
| `src/focus.test.ts` | exists: the cycle, the tree, the panel, the two sweeps that name every row this flow answers | new tests for the overlay from the tree and from a panel, and one negative test that `F1` is left unclaimed there; the two sweeps unchanged, since no row is added to what this flow answers |
| `src/keyspanel.test.ts` | exists: "shows each row's label and its live chords" | one new test that the panel lists `F1` on its own row and `C-h` on the `prefix-help` row |
| `src/prose.test.ts` | exists: the `C-h k` prompt's own tests | one new test pinning what `C-h k` then `C-h` now answers |
| `docs/how-to-find-and-change-the-keys.md` | exists: "See every chord", "Ask what one chord does", the suppression table and the sentence stating the never-both rule | a new "See what can follow a prefix" section; `F1` named in "See every chord"; the `C-h` suppression row's reason and the never-both sentence corrected |
| `.abcd/development/brief/07-intent-map.md` | exists: 38 rows, with #39 claimed by `spc-2609091733494078` | one row, at the next free number after the two specs drafted the same day (#41 as this spec is written) |
| `.abcd/development/intents/planned/itd-2609091722353594-…` | exists: nine Acceptance Criteria, seven Scope Conditions | **already done, 2026-09-10**: criteria 6 and 7 amended in place to the settled readings, each quoting what it said as drafted and why it changed |
| `.abcd/development/intents/shipped/itd-2609051934109483-…` | exists: the prose vocabulary, map #32, which added the `describe-key` row | **already done, 2026-09-10**: a dated amendment on the criterion naming `C-h k`, recording that its answer for `C-h` itself changes and that this criterion's own case is unaffected |
| `.abcd/development/specs/closed/spc-2609051938278499-…` | exists: map #32's closed spec, Design § Zap and describe, Acceptance Mapping AC7 and AC8 | **already done, 2026-09-10**: the Design sentence describing what `C-h k` answers, and the AC8 row's claim that the suppression sweep is "existing and unedited", both amended |

### Out

- **A which-key-style idle popup, and any timer, debounce or idle callback
  behind the overlay.** The maintainer settled deliberately against it
  (cond-2609091733497194) and the intent files it separately if it is wanted
  after living with this. Nothing in this design schedules anything: the
  overlay is opened by a keypress and closed by a keypress.
- **`F1` as an alias of the whole `C-h` prefix map.** `F1 b` and `F1 k` do
  nothing (cond-2609091733498703). `F1` is a leaf on an existing row, and
  because `EmacsHandler.bindKey` only makes a step a prefix when a longer
  chord names it, a leaf is what it stays without a line of code saying so.
- **The keys panel reached from the tree or from a panel, on `F1` or on any
  other chord.** Settled by the maintainer on 2026-09-10 and recorded in the
  intent's amended seventh criterion: `F1` reaches the panel from the editing
  surface, exactly where `C-h b` reaches it today, and does nothing in the
  panes the surface cannot hear. `keys-panel` is therefore not added to
  `answering()`, and `C-h b` and `C-x S-/` keep exactly the reach they have.
  Design § `F1`, and only from the text.
- **Inventing a row for a chord the vendored package answers and `BINDINGS`
  does not.** The overlay lists Editor's own table and nothing else
  (cond-2609091733492674). The conformance sweep in `src/emacs-keys.test.ts`
  ("answers no chord the table does not list") already fails the build on such
  a gap, so this spec adds no second guard; if one is found while building,
  it is captured to the issue ledger, not papered over here.
- **The keys panel's own grouping, ordering, movement and cancel.** It lists
  the whole table grouped and is unchanged but for one more chord on its row
  (cond-2609091733493528). The overlay sits beside it; it does not replace it,
  and `C-h b` still opens the panel.
- **Numeric arguments through the overlay.** `C-u 3 C-x C-h` spends the count
  when the overlay opens, exactly as `C-g` would; the chord completed from
  inside the overlay runs once. Carrying the count through is not asked for by
  any criterion and is left out rather than half-built. Named again under
  Risks.
- **The tablet and the published reading views.** There is no shell to claim
  `C-x` there and no pane cycle to read a prefix from — the same boundary
  every keyboard spec in this repository already draws. `READING_BINDING_IDS`
  is untouched, so no reading view gains a row.
- **Rebinding, or a user-editable keymap.** Out for the same reason it is out
  everywhere: the table is the one source and it is edited in the source.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| One source, always `itd-2609051336090390` | the overlay holds no list. `completionsUnder` is a filter over `chordIndexIn`/`bindingById`, evaluated when `C-h` is pressed, and a binding line is drawn by `keyspanel.ts`'s own `bindingLine` rather than by a second renderer. `src/prefix-help.test.ts` › "reads every row it lists out of the binding table, and writes no list of its own" sweeps the overlay's rendered chords back against `chordIndexIn` and fails on any chord the table does not carry |
| Legible on three device classes `itd-2609051336128348` | the overlay is an `.overlay`, which already carries `width: min(560px, 92vw)`, `max-height: 70vh` and `overflow-y: auto` in `src/style.css`; the longest list this design can produce is the twenty-five chords under `C-x`, which is what manual check **M-2** measures at 1280, 820 and 390 CSS pixels. jsdom proves the mechanism, not the width |
| Reachable by assistive technology `itd-2609061324342715` | the overlay is a `role="dialog"` with an `aria-label` naming the prefix it is showing, and its rows are the same `dl`/`dt`/`dd` the keys panel already uses, drawn by the same function — the mechanism the panel and every other overlay already announce through, with nothing bespoke added. Asserted structurally in `src/prefix-help.test.ts` › "names itself and its rows the way every other overlay does" |

## Design

### One prefix, two notations

This is the crux the intent's Mechanism left as an assumption, and it does not
survive contact with the source unqualified.

`emacsStatus(view).prefix` returns `handler.$data.keyChain` verbatim
(`src/emacs.ts`). That string is built by the vendored package's
`EmacsHandler.getKey`, which names a key by `KeyboardEvent.code` with `Key`
and `Numpad` stripped, single characters lower-cased, and a short `specialKey`
table applied — and writes modifiers `C-`, `CMD-`, `M-`, `S-` in that fixed
order. `focus.prefix` returns `canonicalChord(chordFromEvent(event))` steps
joined by spaces: the binding table's notation, whose modifier order is `C-`,
`M-`, `s-`, `S-` and whose key names come from `CODE_NAMES`/`KEY_NAMES`.

They agree on every prefix Editor ships today, because every one of them —
`C-x`, `C-c`, `C-h`, `M-s`, `C-x n`, `C-c C-s`, `C-S-x` — is a modified
letter, and both readers spell a modified letter the same way. They do not
agree in general. The package writes `Digit5` where the table writes `5`,
`Comma` where the table writes `,`, `Esc` where the table writes `Escape`, and
`CMD-` where the table writes `s-`. `src/emacs.ts` already carries the
translation in one direction — `PACKAGE_KEY_NAMES`, `PACKAGE_MODIFIERS` and
`toPackageChord` — and carries none in the other.

**The design does not add the missing direction.** Writing an inverse of
`toPackageChord` would be a second notation table that can drift from the
first. Instead the live chain is *identified* rather than translated: every
chord the Emacs layer answers was bound by `EmacsHandler.bindKey(toPackageChord(chord), …)`,
so mapping the table's own chords forward through the same call and looking
for the one whose prefix equals the chain gives the table's spelling of the
live prefix, by construction, with no possibility of disagreement.

```ts
/**
 * The table's spelling of a chain the package's key reader is holding.
 *
 * Forward, never backward: the chain was built by the package out of chords
 * this module bound with `toPackageChord`, so mapping the table through the
 * same call is the one comparison that cannot drift. An inverse would be a
 * second notation table, and two notation tables disagree.
 *
 * Null for a chain no row of the table opens, which is a chain the package
 * owns alone — nothing is intercepted there and the package resolves it
 * exactly as it does today.
 */
function tablePrefixFor(chain: string): string | null {
  for (const chord of chordIndexIn("editor").keys()) {
    const steps = chord.split(" ");
    for (let taken = 1; taken < steps.length; taken += 1) {
      const prefix = steps.slice(0, taken).join(" ");
      if (toPackageChord(prefix) === chain) return prefix;
    }
  }
  return null;
}
```

The reader in `src/focus.ts` needs none of this: its `pending` is already the
table's notation, because it is built by `chordFromEvent` and `canonicalChord`
from the same events the table is written against.

So: **the two readers never learn about each other, and neither learns the
other's notation.** Each opens the overlay with the prefix it is holding, in
the table's notation, and with the list of rows it can actually run. The
overlay's contract takes both as parameters. That is the same shape the
modeline already uses for its one prefix cell — "One prefix cell, two readers"
in `src/modeline.ts` — carried one step further, from displaying a prefix to
acting on one.

### Hearing `C-h` in the editing surface

The package's reader destroys the chain before anything downstream can see it.
In `findCommand` (`node_modules/@replit/codemirror-emacs/dist/index.js`), a
second step composes `key = data.keyChain += " " + key`, looks the composed
key up, and then does `data.keyChain = command == "null" ? key : ""`. `C-x C-h`
is bound to nothing, so the chain is cleared and `undefined` is returned: by
the time any listener further out could ask what prefix was in progress, there
is none.

There is exactly one place that runs with the chain still live and the event in
hand, and this repository already uses it for precisely this class of defect:
the `handleKeyboard` wrapper installed by `trackHandlers()` in `src/emacs.ts`.
`swallowedChord` sits there because `findCommand` reads Control-and-a-digit as
a numeric argument before consulting its own chain, making `C-x C-0`
unreachable. A `C-h` after a prefix is the same shape of problem — a chord the
package's reader makes unreachable — and it is answered in the same place
rather than with a second prefix state.

```ts
EmacsHandler.prototype.handleKeyboard = function (event) {
  handlerByView.set(this.view, this);

  const swallowed = swallowedChord(this, event);
  if (swallowed !== null) { /* unchanged */ }

  // `C-h` on a live chain: the general fallback Emacs applies to any prefix
  // whose map does not bind the help character itself. Caught here because
  // `findCommand` clears the chain on the way to returning nothing, so this
  // is the last moment the prefix still exists. Cannot collide with
  // `swallowedChord` above, which answers only Control-and-a-digit.
  const prefix = prefixHelpFor(this, event);
  if (prefix !== null) {
    const data = this.$data;
    data.keyChain = "";
    data.count = 0;
    run("prefix-help", prefix);
    return { command: "null" };
  }

  return inherited.call(this, event);
};
```

with

```ts
/** The prefix a `C-h` should describe, or null if this is not that. */
function prefixHelpFor(handler: EmacsHandler, event: KeyboardEvent): string | null {
  const chain = handler.$data.keyChain;
  if (!chain) return null;
  const chord = canonicalChord(chordFromEvent(event));
  if (!bindingById("prefix-help")?.chords.map(canonicalChord).includes(chord)) {
    return null;
  }
  return tablePrefixFor(chain);
}
```

Four properties of that guard, each load-bearing:

- **`if (!chain) return null` is what protects criterion 5.** A bare `C-h`
  never reaches the guard, so it goes to `inherited.call` and is resolved
  exactly as it is today: `commandKeyBinding["C-h"]` is `"null"` because
  `C-h b` and `C-h k` were bound through it, so `C-h` opens the prefix and
  `C-h b`/`C-h k` complete unchanged.
- **The chord comes from the table, not from a literal.** `prefixHelpFor`
  reads the `prefix-help` row's own chords, so the module names no key of its
  own — the rule `src/focus.ts` and `src/overlay.ts` both already state.
- **`{ command: "null" }` is how the key is claimed.** The package's own
  plugin returns `!!result` from its keydown handler, and CodeMirror
  `preventDefault`s a handler that returns true. That is the same route
  `swallowedChord` already claims its chord by, and it is what stops `C-h`
  reaching the browser or a lower keymap.
- **The chain and the count are both spent.** A count left behind would be the
  count the *next* key is read with — the defect `swallowedChord`'s own
  comment records — and a chain left behind would be a prefix the modeline
  keeps showing under an overlay that has taken over reading it. Spending both
  is what makes criterion 3 fall out for nothing: by the time `C-g` closes the
  overlay there is no prefix left to cancel.

`C-h C-h` is a free consequence and is Emacs's own behaviour: the first `C-h`
opens the `C-h` prefix, the second is caught by the guard, and the overlay
lists `C-h b` and `C-h k`.

### Hearing it in the pane readers

`src/focus.ts` keeps its own `pending` for the panes the editing surface
cannot hear, and today it drops it silently in exactly the same circumstance:
a step that completes no row and opens no longer chord falls through to

```ts
if (pending !== null) {
  // A sequence that reached no row. The prefix is over; the key itself is
  // left to whatever else is listening.
  pending = null;
  changed();
}
```

One branch is added above that fallthrough, after the `keyboard-quit` branch
and before the exact-match loop:

```ts
// `C-h` on a half-typed prefix describes it, exactly as it does in the text.
// Read out of the table's own row, so this reader still names no key.
if (pending !== null && chordsOf(HELP_ID).includes(step)) {
  const prefix = pending;
  pending = null;
  claim(event);
  changed();
  hooks.prefixHelp({ prefix, ids: answering(), run });
  return;
}
```

`claim(event)` is the module's existing `preventDefault` +
`stopImmediatePropagation`, which is what keeps the key off the overlay that is
about to open and off anything else listening on the document.

`pending !== null` is the whole of the guard, and it is also what keeps `C-h`
from becoming a prefix in these panes: with nothing half-typed the branch does
not fire, no other branch matches `C-h`, and the key falls through unclaimed
exactly as it does today. Design § `C-h` in the pane readers, and only
mid-prefix sets out why that is the right shape rather than an omission.

**The two mechanisms are different, and that is honest rather than a smell.**
They are different because the two readers are different: one is a wrapper
around a vendored key reader that owns its own chain and throws it away, the
other is this repository's own reader that owns its own `pending` and can be
edited where the decision belongs. What must not be two things is the
*answer* — the overlay, its filter, its completion and its cancel — and that
is one module with one entry point, called from both. This is the same
division the codebase already makes for `toggle-sidebar` and `other-window`:
two readers, two interception sites, one command.

### The filter

`completionsUnder(prefix, ids)` in `src/prefix-help.ts`:

```ts
/** One line of the overlay: a chord under the prefix, and what it reaches. */
export interface Completion {
  readonly binding: Binding;
  /** The whole chord, in the table's notation. */
  readonly chord: string;
  /** What is left to type: the chord with the prefix and its space removed. */
  readonly rest: string;
}

export function completionsUnder(
  prefix: string,
  ids: readonly string[],
): Completion[];
```

The rules, each answering a question the parent brief asked:

- **Candidates are the rows the pane holding the keyboard can actually run**,
  supplied by the caller. The editing surface passes every `editor`-scope row
  id; `src/focus.ts` passes `answering()` unchanged, which is
  `[other-window, toggle-sidebar]` in a panel and those two plus every
  `sidebar`-scope row in the tree. Listing a row the pane cannot run would
  promise a chord that does nothing, which is the dead end this repository's
  suppression rule exists to prevent. The maintainer settled this reading on
  2026-09-10 and the intent's sixth criterion is amended to state it: the
  overlay is the same overlay in every pane, and the rows are the pane's own.
- **A line is a chord, not a row.** The unit is the pair, which is what makes
  the multi-chord case right without a special case: `undo` carries
  `["C-/", "C-x u", "C-z", "C-S--", "s-z"]`, and under `C-x` it contributes
  exactly one line, `C-x u`, showing `u` as what is left to type. Its other
  four chords are not under this prefix and are not shown. A row that matched
  a prefix twice would contribute two lines; no row does today, and the rule
  is stated so that one added later needs no code.
- **Leaves, not prefix lines.** Under `C-x`, `C-x n n` and `C-x n w` are both
  listed in full; there is no `C-x n — Prefix Command` line. Real Emacs shows
  the prefix line, and the intent's own press release settles against it:
  "She reads `C-x n n`, types `n n`, and the section narrows." A flat list of
  everything reachable is what that sentence describes, and it is what
  criterion 4 then narrows.
- **Order is by what is left to type**, ascending, `localeCompare` with
  `{ sensitivity: "base" }` over `rest`, ties broken by the row's position in
  `BINDINGS` so the order is total and stable. Deliberately not the keys
  panel's group order: the panel is read to learn the vocabulary, where group
  headings earn their space, and this list is scanned for the next keystroke,
  where they do not. That is one ordering per job with a reason, not two
  answers to one question.
- **The predicate is `canonicalChord(chord).startsWith(`${prefix} `)`**, with
  `prefix` already canonical. The trailing space is what stops `C-x` matching
  `C-x` itself or a hypothetical `C-xy`.
- **No new index.** `chordIndexIn(scope)` is keyed by canonical chord and
  already carries the rows that claim each, which is exactly what the filter
  wants; where the caller supplies an id list instead of a scope, the chords
  come from `bindingById(id).chords`. The intent's second Mechanism
  expectation holds unchanged.

What each line shows: the row's label and its owner note, drawn by
`keyspanel.ts`'s `bindingLine`, and one `<kbd>` carrying `rest` — what is left
to type, not the whole chord, because the prefix is already stated once in the
overlay's heading. The heading reads `C-x-`, the same spelling the modeline's
prefix cell already uses for a prefix in progress.

The list under the largest prefix Editor ships is twenty-five lines
(`C-x`); `C-c` is nineteen, `C-h` two, `M-s` one, `C-x n` two, `C-c C-s` two.

### Completing the chord from inside the overlay

Criterion 2 says the chord runs and the overlay closes. The overlay swallows
the key and runs the row itself. It cannot do otherwise, and the alternative's
failure mode is worth naming because it is not obvious:

**Closing and letting the key through does not work.** `openOverlay` calls
`focusTarget(element).focus()`, so the moment the overlay opens, DOM focus is
out of CodeMirror's `contentDOM` and the editing surface no longer receives
keydowns at all. A key pressed at a closing overlay would land on the overlay
or on the body, never on the reader that used to hold the prefix; and
`close()` restores focus synchronously, after the event that triggered it is
already spent. The variant that keeps the package's chain alive instead of
spending it fails differently and worse: the package would resolve the next
key against a chain the overlay is also reading, so a step that completed
nothing would silently clear the chain and leave the overlay open over a
prefix that no longer exists — the modeline and the overlay disagreeing about
what is half-typed, which is the falsifier the intent's third Mechanism
expectation writes down.

So the overlay is a prompt that happens to have a body, and it is built on
`openOverlay`'s `onKey` hook — the hook whose own doc comment says it is "how
`C-h k` reads `C-x C-s` as one sequence". Three consequences follow from that
hook's contract, all of them wanted:

- `onKey` is consulted *after* the cancel chords and *before* movement, and
  the movement branches are unreachable once `onKey` is supplied. So the
  overlay has no highlight and `rowCount()` is `0`. That is correct rather
  than a limitation: with a prefix live, `C-n` means "complete `C-x C-n`", not
  "move down a row". A list with a highlight would have to steal two chords
  from the vocabulary it is describing.
- The overlay listens on `window` in the capture phase rather than on
  `document`, which is what stops a `C-x` typed into it being read as the
  first step of `C-x o` by the pane cycle's own reader. Already true of every
  `onKey` overlay; inherited, not added.
- Every key is claimed. Nothing types into the chapter while the overlay is
  open, which is the second half of criterion 1.

The reader:

```ts
const steps: string[] = [];
onKey: (event) => {
  if (isModifierOnly(event)) return true;              // as `describeKey` does
  steps.push(canonicalChord(chordFromEvent(event)));
  const chord = `${prefix} ${steps.join(" ")}`;
  const hit = completions.find((entry) => entry.chord === chord);
  if (hit) { chosenId = hit.binding.id; return false; }   // closes, chosen
  const deeper = completionsUnder(chord, ids);
  if (deeper.length > 0) { redraw(chord, deeper); return true; }
  refusal = `${chord} is not bound`;
  return false;
}
```

and the row is run in `onClose(chosen)`, after `openOverlay` has already put
the keyboard back where it came from — which is why the completed command
acts on a focused editing surface rather than on an overlay that is halfway
gone. `onClose` is also the one place a refusal or a cancellation is
announced, through the same `announce` the prompts in `src/prose.ts` use.

The `deeper` branch means the overlay narrows as she types: `C-x` then `n`
redraws to the two rows under `C-x n` and keeps reading. Criterion 4 asks for
that list to be reachable by pressing `C-h` after `C-x n`, which the guard in
`src/emacs.ts` gives directly; this branch is the same list arrived at the
other way, and both are covered in Acceptance Mapping.

Who runs the row is the caller's business, which is why `openPrefixHelp` takes
a `run(id)`. From the editing surface it is `runBinding(view, id)` — the same
call `M-x` already dispatches through, which resolves an id to Editor's own
command, or the package's, or one of CodeMirror's keymaps, and returns a
refusal string when nothing answered. From the pane readers it is
`src/focus.ts`'s own private `run(id)`, passed out through the hook. Two
dispatchers because there are already two, not because this spec made two.

### Cancelling

`C-g` and Escape are handled entirely by the existing contract:
`openOverlay`'s `onKeydown` tests `chordsOf("keyboard-quit").includes(chord)`
*before* it consults `onKey`, closes with `chosen === false`, and runs
nothing. `onClose(false)` announces the cancellation.

"The prefix is cancelled" needs no code at all, because the prefix was spent
when the overlay opened: `data.keyChain = ""` in the editing surface's guard,
`pending = null` in the reader's branch. After `C-g` the modeline's prefix
cell is empty and both readers are at rest — which is the state criterion 3
describes, reached by not keeping two copies of the prefix rather than by
reconciling them.

`src/focus.ts`'s own `keyboard-quit` handling is untouched: its branch fires
only while `pending !== null`, and `pending` is null for as long as the
overlay is open.

### The one chord that is both suppressed and listed

Criterion 8 requires a row for the overlay, listing `C-h`:

```ts
{
  id: "prefix-help",
  label: "What can follow this prefix",
  chords: ["C-h"],
  group: "control",
  owner: "editor",
}
```

`prefix-help` is deliberately **not** added to `APP_COMMAND_IDS`. That list
binds every chord of every id it names, and binding `C-h` in the package would
overwrite the prefix entry `C-h b` and `C-h k` depend on — criterion 5's exact
failure. The row is answered by the guard in the `handleKeyboard` wrapper,
which is Editor adding a behaviour on top of the keymaps: `owner: "editor"`,
the same owner `keys-panel` and `describe-key` carry.

Three shipped sweeps were checked against the new row and pass unchanged:

- "gives no two rows the same chord" — `C-h` is claimed by no other row in
  either scope.
- "claims every step of every modified chord the page owns" — it skips any
  chord not in `emacsAnsweredChords()`, which is built from the package's
  `emacsKeys`, `REBOUND` and `APP_COMMAND_IDS`. The vendored package carries
  no `C-h` binding at all, and `prefix-help` is not an app id, so `C-h` is not
  swept. It is not answered unconditionally and must not be swept as though it
  were.
- "answers no chord the table does not list" — it sweeps the four installed
  keymaps for chords the table lacks, and this change only adds to the table.

One does not:

> `src/emacs-keys.test.ts` › "suppresses a chord instead of listing it, never both"

It asserts, for every `SUPPRESSED` entry, that `chordIndex()` does not carry
the chord. `C-h` is a `SUPPRESSED` entry (`where: "codemirror"`, so that
CodeMirror's own `Ctrl-h` delete-backward cannot answer it) and is now also a
row. The invariant is amended, narrowly, with the exception asserted rather
than excused:

```ts
// `C-h` is the one chord that is both, and it is both for two different
// keymaps. It is taken out of CodeMirror's so that delete-backward cannot
// answer it, and it is a row because the Emacs layer answers it after a
// prefix (`itd-2609091722353594`). Every other entry here is a chord Editor
// hands back to the browser, and the sweep below still holds them to the
// rule — including the direction that would let a typo add a second name to
// this set unnoticed.
const ANSWERED_ELSEWHERE = new Set(["C-h"]);
for (const { chord, where, why } of SUPPRESSED) {
  expect(why.length).toBeGreaterThan(0);
  if (ANSWERED_ELSEWHERE.has(chord)) {
    expect(where).toBe("codemirror");
    expect(listed.has(canonicalChord(chord))).toBe(true);
    continue;
  }
  expect(listed.has(canonicalChord(chord))).toBe(false);
}
expect([...ANSWERED_ELSEWHERE].every((chord) => isSuppressed(chord))).toBe(true);
```

The `SUPPRESSED` entry's own `why` is corrected in the same change to say why
it is both, and `docs/how-to-find-and-change-the-keys.md` — which states the
same rule to a reader, in the sentence "A conformance check over the shipped
keymaps fails a chord that is in neither, and one that is in both" — is
corrected with it. The `M-s` entry is the precedent for the class: its own
comment already records that it is "not a chord Editor gives back to the
browser, the way every other entry here is". `C-h` is the second such entry
and the first that is also a row.

**One behaviour changes as a consequence, and it is Emacs's own.** `C-h k`
resolves a chord by looking it up as a row before asking whether it is a
prefix (`describeKey` in `src/prose.ts`), so `C-h k` then `C-h` now answers
"C-h is What can follow this prefix" and stops, where it previously waited for
a second step. That is what GNU Emacs answers for `C-h k C-h`, and `C-h` is
the only chord in the table that is both a leaf and a prefix, so the general
rule needs no exception. It is pinned by a test rather than left to be
discovered.

### `F1`, and only from the text

The intent's seventh criterion originally read *given any pane holds the
keyboard*. The maintainer settled it on 2026-09-10 the narrower way — the
editing surface only — and the criterion is amended in the intent to say so.
This section records what the wider reading would have cost, so that a reader
who wonders why `F1` does nothing in the tree finds the answer in the design
rather than in a diff.

`src/focus.ts`'s `answering()` offers `[other-window, toggle-sidebar]` in a
panel and those two plus the sidebar's own rows in the tree. Giving `F1` reach
into those panes means adding `keys-panel` to that list, and `chordsOf(id)`
returns *every* chord a row carries: there is no way to add the row for `F1`
alone, and `src/focus.ts`'s own header forbids the module naming a key of its
own, so no exception could be written honestly. So the wider reading was not
"one more chord" but "one more row every pane answers, and `C-h b` and
`C-x S-/` widened with it" — a change to two shipped chords' reach, made in
passing, for a criterion about a third. That is the cost the settlement
declined.

What lands instead is one line: `F1` appended to the `keys-panel` row's
chords. `keys-panel` is already in `APP_COMMAND_IDS`, so the registration loop
in `src/emacs.ts` binds `F1` to the same command with no second edit, and it is
answered where every other chord of that row is answered — through the Emacs
handler, while the cursor is in the text. From the tree or from a panel,
`src/focus.ts`'s reader finds `F1` in no row it answers, claims nothing, and
the key falls through exactly as it does today. `answering()`, `run(id)`,
`SIDEBAR_IDS` and the `everywhere` map in the uniqueness sweep are all
untouched.

### `C-h` in the pane readers, and only mid-prefix

This is the one place the two halves of the intent look inconsistent, and the
distinction is worth stating plainly because a reader will otherwise read it as
an oversight.

`C-h` **is** live in `src/focus.ts`'s reader, for `prefix-help`. `C-h` is
**not** live there for `keys-panel`. Both are true, and they are answers to two
different questions:

- `keys-panel`'s `C-h b` is a chord whose **first step** is `C-h`. For the
  reader to answer it, `C-h` would have to open a prefix in that pane — the
  reader would claim the key, set `pending = "C-h"`, and wait. That is what the
  settlement declined.
- `prefix-help`'s `C-h` is never a first step. The branch that catches it fires
  only while `pending !== null` — that is, only when the reader is already
  holding a prefix somebody else's chord opened. With nothing half-typed, `C-h`
  in the tree reaches no branch, claims nothing, and falls through, exactly as
  it does today.

So the rule in the pane readers is: **`C-h` opens nothing and describes
whatever is already open.** Only one prefix can be open there — `C-x`, from
`toggle-sidebar`'s own `C-x C-b` — so the only overlay reachable from the tree
or a panel is the one over `C-x`, listing the two rows those panes can run.
That is narrower than the editing surface, and it is narrower for the honest
reason: those panes answer fewer rows.

The same asymmetry holds in the editing surface for a different reason, and it
is worth naming beside this one so the two are not confused. There, `C-h` is
both a first step (of `C-h b` and `C-h k`, through the package's own prefix
machinery) and the help character (through the guard in the `handleKeyboard`
wrapper), and the guard's `if (!chain) return null` is exactly what keeps them
apart: with no chain, `C-h` is a prefix; with a chain, it is the help
character. One key, two jobs, told apart by whether a prefix is already in
progress — which is the rule GNU Emacs itself uses.

### `F1` is free

The `keys-panel` row's chords become `["C-h b", "C-x S-/", "F1"]`. `C-h b`
stays first because the table's convention is most idiomatic first and `C-h b`
is the chord the documentation quotes.

`F1` is free, checked in all three places the intent's own scope condition
implies:

- `BINDINGS` — no row carries `F1`. `F2` is `toggle-sidebar`'s
  (`itd-2609091722296239`) and `F3`/`S-F3` are the two search-repeat rows;
  neither is `F1`.
- `SUPPRESSED` — no entry.
- `node_modules/@replit/codemirror-emacs/dist/index.js` — the package's key
  table names no function key but `F11`, in a comment.

And `F1` names correctly from a real event, in both readers. `chordFromEvent`
falls through `/^Key[A-Z]$/`, `/^Digit[0-9]$/` and `CODE_NAMES` to
`KEY_NAMES[event.key] ?? event.key`, and a function key reports `key === "F1"`
with `code === "F1"`, so the chord is `F1`. The package's `getKey` strips only
`Numpad` and `Key` prefixes and applies `specialKey`, which has no `F1` entry,
so it produces `F1` too — which is what `toPackageChord("F1")` must equal for
the binding to fire, and does, since `PACKAGE_KEY_NAMES` has no `F1` entry
either. It is a leaf and stays one: `EmacsHandler.bindKey` only writes the
`"null"` prefix marker for a step that is followed by another, so nothing
makes `F1 b` a sequence.

The one thing outside this repository's reach is
cond-2609091733499576: `F1` must not be claimed by the Tauri shell or by macOS
before the web view sees it. macOS maps `F1` to a display-brightness media key
by default unless "Use F1, F2, etc. keys as standard function keys" is on.
Nothing in `src-tauri/` claims it — no accelerator names a function key — so
this is a system-settings question, not a code one. Manual check **M-4**.

### Reusing the keys panel's renderer

The repository's bias is one canonical primitive, so this decision is argued
rather than asserted.

`src/keyspanel.ts`'s private `row(binding, rows)` draws exactly what a binding
line is: a `dt.keys-row` carrying the label, the owner note from `OWNER_NOTES`
and `data-binding`, and a `dd.keys-chords` carrying one `<kbd>` per chord. The
overlay wants all of that, and differs in one respect only — *which* chords
the `dd` carries, and how much of each. It needs the matching chord's
remainder, where the panel needs every chord in full.

Writing a second renderer would put a second answer to "how a binding line is
drawn" in the codebase, and the two would drift the first time the owner note
or the `kbd` markup changed. Copying the eighteen lines is the same thing,
worse. So `row` is generalised by one parameter and exported:

```ts
/**
 * One binding line: the label, the owner note, and the chords given.
 *
 * The chords are a parameter rather than `binding.chords` because the prefix
 * overlay draws the same line for one chord of a row and not the others — the
 * `C-x u` of `undo`, with its four other chords out of scope. One function,
 * because a binding line drawn two ways is two things to keep in step.
 */
export function bindingLine(
  binding: Binding,
  chords: readonly string[],
): { term: HTMLElement; detail: HTMLElement };
```

`render()`'s loop becomes `bindingLine(binding, binding.chords)` and is
otherwise untouched — no change to the panel's grouping, ordering, movement,
`data-current` highlighting or its `rows` array. `OWNER_NOTES` stays private
to `keyspanel.ts`, which is the point: the overlay never sees it.

The one thing the overlay adds is `data-chord` on the `dt`, because its unit is
a chord and two lines of one overlay could in principle carry the same
`data-binding`. The panel does not set it and does not read it.

CSS follows the same decision: the overlay's element carries `keys-list`,
`keys-row`, `keys-chords` and `keys-owner`, so it inherits the panel's grid,
type scale and `kbd` styling; `.overlay` already supplies the width, the
`max-height: 70vh` and the `overflow-y: auto`. The only addition to
`src/style.css` is `.prefix-help-heading` and `.prefix-help-hint` appended to
the two selector lists `.keys-panel-heading` and `.keys-panel-hint,
.keys-group-heading` already head. No new rule is written.

### What the overlay is, in the DOM

```html
<section class="overlay prefix-help" role="dialog"
         aria-label="What can follow C-x" data-pane-label="Prefix">
  <h2 class="prefix-help-heading">C-x-</h2>
  <p class="prefix-help-hint">Close with C-g or Escape.</p>
  <dl class="keys-list">
    <dt class="keys-row" data-binding="save-chapter" data-chord="C-x C-s">Save the chapter</dt>
    <dd class="keys-chords"><kbd>C-s</kbd></dd>
    …
  </dl>
</section>
```

The hint's text is built from `bindingById("keyboard-quit")?.chords`, the way
the keys panel's own hint already is, so the cancel chords are never typed
into a string. `data-pane-label` is `Prefix` rather than `Keys`, so the
modeline can tell the two apart while either holds the keyboard.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| 1. `C-x` then `C-h` in the text opens an overlay listing every binding whose chord begins with `C-x`, each with its label, and nothing is inserted in the chapter | `src/emacs-keys.test.ts` › "opens the prefix overlay on C-h after C-x, listing every chord under it with its label" — presses the two chords against a real mounted surface, asserts a `.prefix-help` element, asserts the line for `C-x C-s` carries **Save the chapter** and a `kbd` reading `C-s`, asserts the line count equals `completionsUnder("C-x", …).length`, and asserts `documentText(view)` is byte-identical to what it was before the two presses |
| 2. Typing the rest of a chord the overlay lists runs it and closes the overlay | `src/emacs-keys.test.ts` › "runs the chord typed into the prefix overlay and closes it" — `C-x`, `C-h`, then `C-s`; the application's save is called once, `.prefix-help` is gone, and `emacsStatus(view).prefix` is empty. `src/prefix-help.test.ts` › "keeps reading while what is typed is still a prefix, and runs the row when it completes" — the two-step case, `C-x` `C-h` `n` `n`, over a stub `run`, asserting the list narrowed to two lines after `n` and that `outline-narrow` ran once after the second |
| 3. `C-g` closes the overlay, cancels the prefix, and runs nothing | `src/prefix-help.test.ts` › "closes on every chord of keyboard-quit having run nothing" — `C-g` and Escape, each asserting the stub `run` was never called. `src/emacs-keys.test.ts` › "leaves no prefix behind when C-g closes the prefix overlay" — asserts `emacsStatus(view).prefix` is `""` and the chapter is unchanged |
| 4. `C-h` after a two-step prefix such as `C-x n` lists only the rows under `C-x n` | `src/emacs-keys.test.ts` › "lists only the rows under C-x n when C-h follows the second step" — asserts exactly two lines, **Narrow to this section** and **Widen**, and that the line for `C-x C-s` is absent. `src/prefix-help.test.ts` › "lists only what is under a two-step prefix" — the same assertion over `completionsUnder` alone |
| 5. With no prefix half-typed, `C-h` behaves exactly as it does today | `src/emacs-keys.test.ts` › "leaves a bare C-h the prefix it already was" — `C-h` alone opens no overlay and leaves `emacsStatus(view).prefix` reading `C-h`; `C-h b` then opens the keys panel and `C-h k` then opens the describe-key prompt, in the same test. The existing `src/emacs-keys.test.ts` › "opens the keys panel on C-h b and on C-x ?" is widened rather than replaced, so the shipped route is proven unregressed by the test that already proved it |
| 6. With the keyboard in the sidebar and a prefix half-typed there, `C-h` lists that prefix's rows — amended 2026-09-10 to "that prefix's rows in that pane" | `src/focus.test.ts` › "opens the prefix overlay on C-h with the tree holding the keyboard" — `C-x o`, `C-x`, `C-h`; asserts `.prefix-help`, asserts the two lines the tree can run under `C-x` (`other-window` and `toggle-sidebar`), and asserts that `C-x C-s` and the rest of the text's twenty-five are absent. `src/focus.test.ts` › "runs the chord typed into the prefix overlay from the tree" — completing with `o` moves the keyboard on. `src/focus.test.ts` › "leaves a bare C-h unclaimed in the tree, opening nothing" — the negative case that keeps `C-h` from becoming a prefix there |
| 7. `F1` opens the keys panel from the editing surface, exactly as `C-h b` does — amended 2026-09-10 from "any pane" | `src/emacs-keys.test.ts` › "opens the keys panel on C-h b, on C-x ? and on F1" (the existing test, widened by one press). `src/focus.test.ts` › "leaves F1 unclaimed in the tree and in a panel" — the negative case: no `.keys-panel` appears, nothing is claimed, and the pane holding the keyboard is unchanged |
| 8. The keys panel's own row lists `F1` beside `C-h b`, and the overlay's row lists `C-h` as reached after a prefix | `src/keyspanel.test.ts` › "lists F1 on the keys-panel row and C-h on the prefix-help row" — asserts the `keys-panel` line carries all three chords and the `prefix-help` line carries `C-h` and the label naming it as what follows a prefix |
| 9. Inherited: one source, always | `src/prefix-help.test.ts` › "reads every row it lists out of the binding table, and writes no list of its own" — takes every `data-chord` the overlay rendered and asserts `chordIndexIn` carries it, over four different prefixes |
| 9. Inherited: legible on three device classes | jsdom proves the mechanism, not the width, exactly as every keyboard spec in this repository does: the overlay is an `.overlay` and inherits the width, height cap and scroll the class already carries. Manual check **M-2** at 1280, 820 and 390 CSS pixels, over the twenty-five-line `C-x` list |
| 9. Inherited: reachable by assistive technology | `src/prefix-help.test.ts` › "names itself and its rows the way every other overlay does" — asserts `role="dialog"`, an `aria-label` naming the live prefix, and that the rows are the same `dt`/`dd` pairs the keys panel renders, drawn by `bindingLine` |

Two things no jsdom test can reach, deferred to manual rows rather than
asserted weakly:

- **That `F1` arrives at the page at all.** jsdom dispatches a synthesised
  `KeyboardEvent` with whatever `code` and `key` the test supplies, so a test
  that presses `F1` proves the chord is wired and proves nothing about macOS
  or the shell letting the key through (cond-2609091733499576). **M-4**.
- **That the overlay is readable and dismissable at each width.** jsdom has no
  layout. **M-2**.

Manual checks, run with `npm run tauri dev` and recorded as an unticked list
in `.abcd/.work.local/logs/acceptance/spc-2609091733496272.md`.

## Tasks

1. Add the `prefix-help` row to `src/keys.ts` in the `control` group beside
   `keys-panel` and `describe-key`; append `F1` to the `keys-panel` row's
   chords; correct the `C-h` `SUPPRESSED` entry's `why` to say it is now also
   a row and why both are true.
   Verify: `npx vitest run src/emacs-keys.test.ts -t "gives no two rows the same chord"`.
2. Amend `src/emacs-keys.test.ts` › "suppresses a chord instead of listing it,
   never both" with the named `ANSWERED_ELSEWHERE` exception asserted in both
   directions. The `everywhere` map in the uniqueness sweep is left alone:
   `keys-panel` is not a row every pane answers.
   Verify: `npx vitest run src/emacs-keys.test.ts -t "suppresses a chord"` and
   `npx vitest run src/emacs-keys.test.ts -t "gives no two rows the same chord"`.
3. Generalise `row` in `src/keyspanel.ts` into the exported
   `bindingLine(binding, chords)` and call it from `render()` with
   `binding.chords`.
   Verify: `npx vitest run src/keyspanel.test.ts`.
4. Write `src/prefix-help.ts`: `completionsUnder`, the overlay over
   `openOverlay`'s `onKey` hook, the narrowing redraw, the chosen-row
   dispatch through the caller's `run`, and the refusal and cancellation
   announcements.
   Verify: `npx vitest run src/prefix-help.test.ts`.
5. Add the `prefixHelpFor` guard and `tablePrefixFor` to `src/emacs.ts`,
   beside `swallowedChord` in the `handleKeyboard` wrapper; widen
   `EditorCommands` and `run` by one optional argument.
   Verify: `npx vitest run src/emacs-keys.test.ts -t "prefix overlay"`.
6. Add the `prefix-help` entry to the command map in `src/app.ts`, mounting
   the overlay in `overlayHost` and running a chosen row through
   `runBinding`, announcing any refusal it returns.
   Verify: `npx vitest run src/emacs-keys.test.ts -t "runs the chord typed into the prefix overlay"`.
7. Add the `prefix-help` branch to `onKeydown` in `src/focus.ts` and the
   `prefixHelp(request)` member to `FocusHooks`; wire it from `src/app.ts`.
   `answering()`, `run(id)` and `SIDEBAR_IDS` are not touched.
   Verify: `npx vitest run src/focus.test.ts`.
8. Add `.prefix-help-heading` and `.prefix-help-hint` to the two existing
   selector lists in `src/style.css`.
   Verify: `npm run build` (the bundle check reads the stylesheet).
9. Write the new tests named in Acceptance Mapping across
   `src/prefix-help.test.ts`, `src/emacs-keys.test.ts`, `src/focus.test.ts`,
   `src/keyspanel.test.ts` and `src/prose.test.ts`, including the three
   negative tests: `F1` unclaimed in the tree and in a panel, and a bare `C-h`
   unclaimed in the tree.
   Verify: `npx vitest run src/prefix-help.test.ts src/emacs-keys.test.ts src/focus.test.ts src/keyspanel.test.ts src/prose.test.ts`.
10. Add the "See what can follow a prefix" section to
    `docs/how-to-find-and-change-the-keys.md`, name `F1` in "See every chord"
    and say there that it is the editing surface's chord, correct both the
    `C-h` row of the suppression table and the sentence stating the never-both
    rule, and correct the "Ask what one chord does" section's account of what
    `C-h k` answers for a chord that is both a row and a prefix. The same
    `C-h k` sentence in `docs/how-to-edit-prose-with-emacs-commands.md` is read
    for whether it needs the same correction.
    Verify: `npm run lint` (the docs-currency check reads both pages).
11. Add the intent-map row and its entry to
    `.abcd/development/brief/07-intent-map.md`.
    Verify: read-through; no automated check covers prose intent-map text.
12. Write the manual acceptance checklist and run the full gate list.
    Verify: `npm test && npm run lint && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo fmt --manifest-path src-tauri/Cargo.toml --check`.

## Risks and Open Questions

- **Settled 2026-09-10: criterion 6 lists the pane's own rows.** "Exactly as it
  does from the editing surface" means the same overlay, the same rendering and
  the same behaviour; the rows are the pane's own. From the tree, `answering()`
  offers two rows with a `C-x` chord — `C-x o` and `C-x C-b` — where the text
  offers twenty-five. Criteria 2 and 6 could not both hold on the wider
  reading: listing the text's twenty-five from the tree would put `C-x C-s` on
  the screen under a prefix that cannot reach it, and criterion 2 promises that
  a chord the overlay lists runs when it is typed. Criterion 2 governs;
  criterion 6 gave way and is amended in the intent. If the whole `C-x` map is
  ever wanted from the tree, that is a different design — rows marked
  unreachable, or the tree's reader learning to dispatch editor rows — and its
  own intent.
- **Settled 2026-09-10: criterion 7 is the editing surface, not any pane.** The
  literal reading would have made `keys-panel` a row every pane answers and
  widened `C-h b` and `C-x S-/` with it — two shipped chords' reach changed in
  passing, for a criterion about a third. The criterion is amended in the
  intent, and Design § `F1`, and only from the text records the reasoning so it
  is not re-derived. The residual sharp edge is that `C-h` is live in
  `src/focus.ts`'s reader for `prefix-help` and not for `keys-panel`; it is
  coherent — one is the help character on a prefix already open, the other
  would be a prefix's first step — and Design § `C-h` in the pane readers, and
  only mid-prefix states the distinction where a reader will meet it. It is
  still the thing in this spec most likely to be mistaken for a bug, and the
  two negative tests exist so that a later change cannot quietly erase either
  half.
- **Amending a shipped invariant test is the riskiest edit here.** "Suppresses
  a chord instead of listing it, never both" has held since the table was
  written, and this spec puts a named exception in it. The exception is
  asserted in both directions — the chord must be listed, and it must still be
  suppressed, and the exception set must contain only genuinely suppressed
  chords — so a typo cannot widen it silently. It is still an invariant with a
  hole in it, and the honest alternative was worse: removing the `C-h`
  suppression outright would hand `Ctrl-h` back to CodeMirror's
  delete-backward in the keymap layer, which is the defect the suppression
  exists to prevent.
- **`C-h k C-h` changes its answer, and that was an unrequested change to a
  shipped command.** It names `prefix-help` and stops, where it previously
  waited for a second step. No criterion of this intent asked for it; it falls
  out of `C-h` becoming a row, because `describeKey` in `src/prose.ts` looks a
  chord up as a row before asking whether it is a prefix. The maintainer
  accepted it deliberately on 2026-09-10, for two reasons: it is what GNU Emacs
  answers for `C-h k C-h`, and the corner is not reached by accident — a writer
  asking what a key does presses `C-h k` and then the key they are curious
  about, and `C-h b` and `C-h k` remain describable from the keys panel, which
  is where a reader looks for the whole table anyway. The shipped record is
  amended rather than left to be discovered: the criterion naming `C-h k` in
  `itd-2609051934109483` and the Design and Acceptance Mapping claims in
  `spc-2609051938278499` both carry a dated amendment citing
  `itd-2609091722353594`, and the two docs pages that state the same promise to
  a reader are corrected in task 10.
- **A long list can only be scrolled with a pointer.** Every key the overlay
  receives is a completion attempt, so `C-n`, `PageDown` and the arrows cannot
  scroll it. `.overlay` already scrolls with a trackpad. Twenty-five lines is
  the worst case Editor ships and it is expected to fit inside `70vh` at all
  three widths, which is what **M-2** measures. If it does not fit at 390, the
  answer is a smaller type scale for this overlay, not a movement key taken
  out of the vocabulary it is describing.
- **Opening the overlay closes an open list overlay.** `openOverlay`'s own
  contract is that opening a second closes the first, so pressing `C-x C-h`
  while the command palette holds the keyboard closes the palette. Registered
  panels — publish, settings, export, new document — are not overlays and stay
  open behind it. This is inherited behaviour, identical to every other
  overlay-opening chord, and is not changed here.
- **The numeric argument is spent, not carried.** `C-u 3 C-x C-h` opens the
  overlay and forgets the 3; the chord completed from inside it runs once.
  Carrying it would mean threading a count through `runBinding` and through
  `src/focus.ts`'s `run`, neither of which takes one today. No criterion asks
  for it. If it turns out to matter in use, it is an issue against this spec,
  not a gap in it.
- **`tablePrefixFor` is O(chords × steps) per `C-h` press.** Roughly a
  hundred and sixty chords with at most three steps, on one keystroke that
  opens a panel. It is not on any hot path and is not optimised. Named so
  that a reader does not mistake it for an oversight.
- **`F1` may never reach the page**, if macOS is set to send media keys and
  the maintainer has not turned on "Use F1, F2, etc. keys as standard function
  keys". Nothing in `src-tauri/` claims the key. **M-4** is the check, and a
  negative result there is a system-settings note for the documentation, not a
  defect in this spec.
