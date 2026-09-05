# AGENTS.md

<!-- BEGIN ABCD -->
<!--
  Managed by abcd (Agent-Based Configuration for Development).
  Do NOT hand-edit content inside the abcd-managed fences — `/abcd:ahoy`
  silently overwrites this block on drift (per itd-3). Per-repo rule
  customisation goes in <repo>/.abcd/rules.json instead.
-->

## abcd rule loader

This repository uses the abcd modular rules loader. On `UserPromptSubmit`, a hook
recall-matches the prompt against keyword triggers declared in the plugin-bundled
default domains and `<repo>/.abcd/rules.json`, and injects only the matched
domain rules into context — instead of force-loading the full ruleset every turn.
A prompt that matches no domain injects nothing (zero added tokens).

- Inspect rules: `abcd rules` renders the active set; `abcd rules <DOMAIN>`
  (case-insensitive) scopes to one domain.
- Per-repo overrides: edit `<repo>/.abcd/rules.json`. It is
  `{"schema_version": 1, "disabled": false, "domains": {}}` — add a domain key to
  override a default per-field (e.g. `{"ROADMAP": {"state": "dormant"}}` silences
  it while keeping its rules) or to declare a custom domain
  (`{"recall": [...], "rules": [...]}`). A domain left with no rules at all
  (`{"rules": []}`, or a custom domain declared without any) is SKIPPED with a
  diagnostic on stderr naming it — it would otherwise inject a heading-only
  block, which reads as a domain that says nothing. The rest of the file still
  loads; `{"state": "dormant"}` is the way to silence a domain deliberately.
- Provenance: a domain the override names (rules replaced, state changed, or a
  custom domain) renders as `## NAME (repo override)` wherever it appears: the
  injected block, `abcd rules`, and the hook's diagnostic; `abcd rules --json`
  carries `"source": "repo"` for it and `"source": "bundled"` for an untouched
  default.
- Kill switch: set `"disabled": true` at the top of `.abcd/rules.json`.
- Explicit activation: start a prompt with `*<DOMAIN>` (e.g. `*COMMITTING`,
  `*PII`) to inject that domain unconditionally — overrides a `dormant` state,
  but never the kill switch.

### Default domains

`COMMITTING`, `DOCUMENTATION`, `ROADMAP`, `ISSUES`, `INTENTS`, `LIFEBOAT`, `PII`,
`OPINIONS`. Each carries recall keywords and its rules, bundled in the abcd
binary; a repo overrides them per-field via `.abcd/rules.json`. `OPINIONS`
points at the canonical conventions under `.abcd/development/principles/` rather
than copying them.

### Reset triggers

`SessionStart` and `PreCompact` clear the per-session dedup ledger, so a matched
domain re-injects on the next prompt (the event-driven refresh that recovers
after compaction). Within a session the hook does not re-inject unchanged rules.

For internals see `.abcd/development/brief/05-internals/03-configuration.md`.

<!-- END ABCD -->

A lightweight Markdown editor for notes and presentations.

This file says how to work in this repository. Host-specific files (`CLAUDE.md`) point here.

## What this is

Editor is a lightweight Markdown editor for notes and presentations. Public,
MIT-licensed, maintained by a single maintainer.

## Build, test, lint

Two toolchains: Node for the TypeScript frontend at the repository root, Cargo
for the Tauri shell under `src-tauri/`. Every command below is run from the
repository root.

### Toolchain

Rust is installed with rustup's minimal profile and is not on the default
`PATH`. Typst is a single binary from its GitHub releases, unpacked into
`$HOME/.local/bin`. Put both on the path before any Cargo or Typst command:

```sh
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
```

Provisioning a fresh machine:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --profile minimal -y
rustup component add rustfmt clippy
# Typst: download the aarch64-apple-darwin archive from
# https://github.com/typst/typst/releases and move the binary into $HOME/.local/bin
npm install
```

Xcode command line tools are also required. Typst is used by the publish
pipeline, not by the app; Pandoc is a development convenience for
converting source documents into examples and is not part of the pipeline.

### Frontend

```sh
npm install                      # install dependencies
npm run build                    # type-check, then bundle into dist/
npm test                         # the full test run (Vitest in jsdom)
npx vitest run -t "sets the mark" # one test, matched by name
npm run lint                     # eslint, then tsc --noEmit
npm run dev                      # Vite alone, without the shell
```

### Shell

```sh
cargo build   --manifest-path src-tauri/Cargo.toml
cargo test    --manifest-path src-tauri/Cargo.toml
cargo test    --manifest-path src-tauri/Cargo.toml walks_a_folder_of_chapters
cargo fmt     --manifest-path src-tauri/Cargo.toml --check
cargo clippy  --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

### The application

```sh
npm run tauri dev     # Vite plus the shell, with the window
npm run tauri build   # a release bundle
```

## Boundaries

- Orientation for the current state of work lives in `.abcd/work/CONTEXT.md`.
- Do not add dependencies, commit, or push without being asked.
- Keep generated and runtime output out of tracked directories.

## Definition of done

A change is done when it builds, its tests pass, the docs it affects are
updated in the same change, and `.abcd/work/DECISIONS.md` carries a line for
any decision it made.

<!-- working-conventions 2026-09-05 -->
## Working conventions

### Three-tier working state

- `.abcd/development/` — the durable record, committed. Architecture decisions
  as ADRs in `decisions/adrs/` (MADR format, sequential `NNNN-` prefix), plus
  dated plans and research notes.
- `.abcd/work/` — shared working state, committed. `CONTEXT.md` is the
  orientation page; `DECISIONS.md` is an append-only, one-line-per-decision log.
- `.abcd/.work.local/` — local and gitignored. `NEXT.md` for session handover,
  `scratch/` for working files, `logs/` for run output. Runtime artefacts go
  here, never into tracked directories.

### Decisions

Record each decision as one dated line in `.abcd/work/DECISIONS.md`. Promote
architecture-shaping decisions to an ADR.

### Documentation

`docs/` is user-facing only. Each page is exactly one Diátaxis type (tutorial,
how-to, reference, explanation) and is written in the present tense: no
"previously", "now", or change narration. Prose is British English; code,
identifiers, and commit messages are US English. No stray markdown at the repo
root beyond the standard set (README, LICENSE, CHANGELOG, CONTRIBUTING,
AGENTS.md).

### Privacy

Nothing committed may contain absolute local paths, hostnames, usernames,
email addresses, tokens, or private repository names. Use repo-relative paths.
The product's own public domain is allowed: it is identity, not infrastructure.

### Examples and people

Examples and user stories use the personas Alice, Bob, and Carol, and no other
names. Refer to the maintainer as they/them in every artefact.

### Git

Never commit or push unless asked. Substantive work goes on a branch and lands
by pull request. New dependencies need explicit sign-off before they are added.

### Attribution

This repository requires AI disclosure. A committed `prepare-commit-msg` hook
seeds a commented prompt into every commit message opened in an editor; answer
it by stating which tool assisted the commit and its version, or that none did.
The hook never fills in a value itself.
<!-- /working-conventions -->
