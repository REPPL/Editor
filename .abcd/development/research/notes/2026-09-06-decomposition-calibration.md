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
