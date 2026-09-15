# Decomposition calibration, 2026-09-06

The hand-run itd-84 decomposition of each proposal filed as an intent today:
how the proposal was routed before filing, and whether the routing survived
the maintainer's confirmation. This corpus is what gates the automated
pre-pass later.

## Show Markdown tables nicely formatted in the editing surface

Proposal, in the maintainer's words: "Show markdown tables nicely formatted
in editor — always aligned, cell text with line breaks — if possible."

| Part | Type | Home |
|---|---|---|
| Pipe tables shown aligned in the editing surface, with cell text wrapping to the column's width, without the author reformatting anything | intent | `itd-2609061653559060` |
| The alignment is visual only: the chapter's bytes are never rewritten to align a table, because the round-trip discipline forbids realigned tables | discipline, existing | `itd-2609051336074533` (round-trip byte-fidelity) — the intent *refines* its reading for tables |
| A CodeMirror view plugin that lays a table out as a grid over the source lines | plumbing | the brief, `05-internals.md` section 5, through the spec |

Typed links: refines `itd-2609051336074533`; touches map #2 (`itd-2609051335406422`,
the editing surface). No reversal flagged.

Proposed verdict: FILE-AS-IS, one intent, with the byte-fidelity reading
written into its scope conditions. Confirmation: pending the maintainer.

## Show and hide the sidebar with single keys from the sidebar

Proposal, in the maintainer's words: "when in the sidebar, s for show
sidebar (if hidden) and h for hide sidebar (if shown)."

| Part | Type | Home |
|---|---|---|
| While the sidebar holds the keyboard, `h` hides it and the keyboard returns to the editor; `s` shows it — meaningful only once a hidden sidebar can be reached, so the route to it is the open question | intent | `itd-2609071216221686` |
| Single unmodified letters answer only while the sidebar holds the keyboard, never in the editing surface, where they are text | existing rule, map #30 | `itd-2609051921482691` (the sidebar vocabulary is scoped by focus) — the intent *refines* it |

Typed links: refines `itd-2609051921482691`; touches `toggle-sidebar`
(`C-x C-b`, map #1). No reversal flagged.

Proposed verdict: FILE-AS-IS, one intent, with the route to a hidden sidebar
settled at the interview. Confirmation: the maintainer confirmed the routing
on 2026-09-08 and settled the route — `h` in the sidebar hides it and returns
the keyboard to the editor; moving to the other pane with `C-x o` reaches a
hidden sidebar and shows it; a bare `s` in the sidebar is not bound. The
initial routing survived unchanged.

## Follow Emacs's default bindings, with four additions

Proposal, in the maintainer's words: "implement all of the Emacs default
bindings, not what I proposed", with `h` hiding the sidebar from inside,
`F2` showing and hiding it from anywhere, and `F1` doing what `C-x C-h` does.

| Part | Type | Home |
|---|---|---|
| Editor's chords follow Emacs's defaults wherever Emacs has one | intent | `itd-2609081929528479` |
| A prefix shows its own commands, on `C-x C-h` and on `F1` | intent, same one | `itd-2609081929528479` |
| `F2` toggles the sidebar from anywhere, beside the `h` that shipped | intent, same one | refines `itd-2609071216221686` (map #36) |
| Which chord Emacs spends on what | research | `2026-09-08-emacs-default-divergences.md` |

Typed links: refines `itd-2609051335406422` (map #2, the binding table) and
`itd-2609071216221686` (map #36). Reversal flagged and confirmed: `C-x o` no
longer opens a hidden sidebar, which strikes map #36's third criterion.

Proposed verdict: FILE-AS-IS as one intent, gated on the divergence note.
Confirmation: the maintainer confirmed the routing on 2026-09-08 and settled
three questions inside it — bold and italic keep `C-c C-s`, `h` stays beside
`F2`, and `C-x o` only moves the keyboard. The initial routing survived; one
part of it, the sidebar's chord, was wrong twice before it was right, which
the ledger records rather than the note.

## Multiple windows, the same as Emacs

Proposal, in the maintainer's words: "build multiple windows in Editor, same
as Emacs".

| Part | Type | Home |
|---|---|---|
| The editing area splits, the splits are moved between and closed | intent | `itd-2609081931493520` |
| The chords `C-x 2`, `C-x 3`, `C-x 0`, `C-x 1`, and `C-x o` cycling | intent, the Emacs-defaults one | `itd-2609081929528479` |
| One editing surface becomes several views over the open chapters | plumbing, and likely architecture-shaping | the brief, `05-internals.md` section 5; an ADR if the focus model's one-pane rule gives way |

Typed links: refines `itd-2609051921482691` (map #30, moving between panes)
and `itd-2609051335406422` (map #2). No reversal flagged.

Proposed verdict: FILE-AS-IS, one intent, with the chords owned by the
Emacs-defaults intent and the focus model's change recorded as an ADR if the
build proves it architecture-shaping. Confirmation: the maintainer confirmed
the routing on 2026-09-08 and settled the ambiguity — splits inside the one
frame, in Emacs's sense of a window, not operating-system windows. The
initial routing survived unchanged.

## A cat on a rainbow in the footer

Proposal, in the maintainer's words: a cat in the Editor footer, as their own
Emacs configuration has. Recorded by form alone — an indicator the maintainer
runs in their own configuration — because the record is committed and public,
and the convention is that a reference the maintainer points at is described
by its shape, never by its address or its author.

| Part | Type | Home |
|---|---|---|
| Progress through the chapter shows in the footer as a cat drawing a rainbow behind it | intent | `itd-2609081938397758` |
| The artwork itself, and the licence it ships under in a public MIT repository | blocking open question, then plumbing | the intent's Open Questions until the maintainer answers |
| Decorative, so hidden from assistive technology and still when motion is reduced | existing rule | `itd-2609061324342715` — the intent *refines* it |
| Legible beside the other cells at 390 CSS pixels | existing rule | `itd-2609051336128348` |

Typed links: refines `itd-2609061324342715` and `itd-2609051336128348`;
touches map #2 (`itd-2609051335406422`), whose surface the footer belongs to.
No reversal flagged.

Proposed verdict: FILE-AS-IS, one intent, blocked on the artwork question —
the character is somebody's, and what ships in a public MIT repository is the
maintainer's call, not the build's. Confirmation: pending the maintainer.

## Bring an old single-file manuscript in

Draft `itd-2609051335529787`, decomposed on 2026-09-15 in the planning
interview, after two adversarial reviews (design and feasibility;
record discipline) whose surviving findings were applied to the draft
first.

| Part | Type | Home |
|---|---|---|
| The Import command and everything it writes | intent | `itd-2609051335529787` |
| Which Part name the record means: `01-chapters` (2026-09-06) or "named for the document" (2026-09-05, the glossary) | a disagreement inside the record | a DECISIONS line and a glossary fix, settled to `01-chapters` |
| The web view returns cut offsets, the shell slices its own bytes | a trust-boundary choice | the spec `spc-2609151652321002`; an ADR only if a later moment needs it |
| The how-to page on opening a file or a folder | docs | the build's definition of done |
| Whether the sidebar edits structure | an open question of the brief | stays in the brief; dropped from the draft |
| Which variants the minted metadata declares | intent, another moment | `itd-2609051335537470`, deferred |

Typed links: supersedes `itd-2609051221553568` and `itd-2609051317429272`;
refines map row 13; reuses the new-document defaults of map #29 without
reversal. No reversal flagged.

Proposed verdict: FILE-AS-IS. Confirmation: the maintainer adopted the
routing unchanged on 2026-09-15 and settled all three open questions in the
same sitting. The initial routing survived unchanged.

## Write one text for two audiences

Draft `itd-2609051335537470`, decomposed on 2026-09-15 in the planning
interview, after the same two reviews, which found the draft's central
mechanism claim false of the tree and three leaks across variants.

| Part | Type | Home |
|---|---|---|
| The variant chooser, the sidebar badge, and the four leaks closed | intent | `itd-2609051335537470` |
| The four leaks: reference list, contents list, nested span, no-variant disagreement | defects | `iss-2609151509287105`, `iss-2609151509281407`, `iss-2609151509281307`, `iss-2609151509280846`; resolved by the build, cited |
| The brief's `variant` module that does not exist, and four hand-copied filters | record-versus-tree gap | `iss-2609151509292287`; the build consolidates the filter into one module, per one-canonical-primitive |
| The undeclared-name rule and the span-collapse rule | already decided, 2026-09-05 | cited, not re-decided |
| A gesture in the app that declares the variant set | intent, another moment | a later draft; this one assumes hand-edited metadata |
| An egg marker in one variant matching a block in another | a hazard | the variant-fidelity discipline and map #12 |

Typed links: supersedes the same two drafts; refines map row 14; refines
`itd-2609051336107315` with the nested-span proof it lacks. No reversal
flagged.

Proposed verdict: FILE-AS-IS. Confirmation: the maintainer adopted the
routing unchanged on 2026-09-15, filter consolidation included.

## Edit one document together, across the network

Proposal, in the maintainer's words: make Editor a multi-user editing
experience across the network; optionally, detect a Tailscale network and
make multi-user editing possible there. Decomposed on 2026-09-15 before
filing.

| Part | Type | Home |
|---|---|---|
| Two people edit one document at once and each sees the other's changes as they type | intent | `itd-2609151837374137` |
| Reverse *network only on publish*, which forbids sync and a local-network server | a standing rule this reverses | `adr-2609151837453096`, proposed; the discipline is amended in the accepting change |
| How edits converge, who holds the file, what a save writes | architecture-shaping | the session intent's spec; its own ADR if the build proves it shaping |
| Detecting a peer on a Tailscale network and offering it | intent, optional and vendor-specific | `itd-2609151837370351`, `builds_on` the first |
| Who may offer and accept, and what leaves the machine | trust boundary | the ADR above; no node name or address ever committed |
| Presence, a second caret, a remote peer in the per-window model | plumbing | the brief, 05-internals section 5 |

Typed links: reverses `itd-2609051336158553` — flagged, and the maintainer
confirmed it as a reversal rather than a reading; refines
`adr-2609091832455881` (the window tree's lockstep echo); touches
`itd-2609051335586905` (the iPad draft, which exists because a network path
was declined) without superseding it; touches the brief's open question on
concurrent edits from two devices.

Proposed verdict: SPLIT — two drafts and an ADR. Confirmation: the
maintainer adopted the split on 2026-09-15 and confirmed the reversal. The
initial routing survived unchanged.
