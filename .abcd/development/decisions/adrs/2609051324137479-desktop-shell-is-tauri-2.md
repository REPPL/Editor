---
id: adr-2609051324137479
slug: desktop-shell-is-tauri-2
status: accepted
date: 2026-09-05
supersedes: null
superseded_by: null
related_intents: []
related_rfcs: []
related_adrs: []
---

# ADR-2609051324137479: The desktop shell is Tauri 2 around a web editing surface

## Context

The editing surface must be a web component, because the single self-contained HTML file has to carry an editor with Emacs bindings and nothing else runs inside a standalone HTML file. Maintaining a second, native editor would mean two editors and two binding tables drifting apart. So the native part of the app is the shell, and the choice is which shell hosts the web view. The maintainer wants a native app, wants to keep a Rust experiment alive, and targets macOS with iPad and iPhone as reading devices.

## Decision

The desktop app is a Tauri 2 shell. The system web view renders the editing surface (the Safari engine on macOS, the same engine as iPad and iPhone). Rust owns the file system, content hashing, git operations, the export build, and the publish action. One TypeScript rendering core is shared by the app, the single HTML file, the presenter site, and the pipeline. iOS is a possible later target for the tablet through the same shell.

## Alternatives Considered

1. Electron. Bundled Chromium gives the most control over keyboard interception and the most mature tooling, at the cost of a 150 MB binary and a Node backend, and it retires the Rust experiment. Rejected as the default; kept as the fallback if key interception in the system web view proves unworkable in the spike.
2. A Swift app with WKWebView. The most Mac-native shell, macOS only, no cross-platform path, no Rust. Rejected because it closes the iOS-through-the-same-shell route and drops Rust for no gain the web surface can feel.
3. A browser app with a local server. Rejected earlier by the maintainer: no server, no network except on publish.

## Consequences

The first engineering spike is CodeMirror with its Emacs keymap inside a Tauri window, checking every binding in the table against macOS and the web view. If Option and Control combinations cannot be claimed reliably, the fallback is Electron and this decision is superseded. Rust stays confined to what the shell does; product logic lives in TypeScript so the single file and the site share it.
