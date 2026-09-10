---
id: spc-2609051353457083
slug: find-the-version-bob-read-in-march
intent: itd-2609051335479329
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Find the version Bob read in March

## Summary

This spec delivers the record half of the Publish bundle for itd-2609051335479329: the
`publish-log.json` the publish action writes into the document folder, one entry per publish; the
panel that renders it newest first with open and copy for every entry; and the two guarantees
that make an old entry worth keeping — an existing version folder is never written into again,
and the only file a later publish rewrites beneath a variant's token is `latest.json`. It shares
one design with spc-2609051353438810 (itd-2609051335468596), which owns the action, the minting,
the site layout and the presenter; this spec owns what that action records and what a recorded
link keeps promising months later. The log is a plain file the author owns, readable in any text
editor and free of anything naming her machine. Like its sibling, everything but the push and
the deploy poll runs under the dry-run flag the tests exercise.

## Scope

**In.** `src-tauri/src/publish/log.rs` (the entry shape, the append, the atomic write, the
reader) and the `read_publish_log` command registered in `src-tauri/src/lib.rs`; the
never-rewrite rule and the `latest.json` write in `src-tauri/src/publish/stage.rs`;
the versions list inside `src/publish-panel.ts`, reached by the same `publish-open`
binding; the timestamp helper. Tests: `src/publish-panel.test.ts` and the Rust tests named
in the mapping.

**Out.** The publish action, the id and token minting, the content hash, the site layout, the
presenter shell, the git sequence and the publish panel — all spc-2609051353438810, map #7. Who
may open a version: access follows the document, not the version, and belongs to #20. Ending a
version's life belongs to #28, which adds one entry kind to the same file. Per-variant entries
beyond the default variant's belong to #19; the `variants` and `links` fields are already shaped
for them.

**Disciplines inherited.**

| Discipline | Proven here by |
|---|---|
| No machine in the document (`itd-2609051336080960`) | an entry carries a UTC stamp, a hash, variant names, a flag and public links, and nothing else — `log_entry_names_no_machine` scans every written entry for an absolute path, a home directory, a volume or host name, a user name and an email address |
| One source, always (`itd-2609051336090390`) | the log is written only by the publish action that deployed the version, never maintained beside it, and the site's `latest.json` is the one record of which version a stable link serves — nothing counts versions twice |
| Network only on publish (`itd-2609051336158553`) | reading and rendering the log touches no network; the panel's Open hands the link to the system browser rather than fetching it — `opening_an_entry_makes_no_request` |
| Legible on three device classes (`itd-2609051336128348`) | an old version link renders through the same built page as a new one, so `built_pages_declare_the_viewport_and_no_fixed_width` covers it, with check M5 at 390, 820 and 1280 CSS px |
| Variant fidelity (`itd-2609051336107315`), from phase 3 | the log names a version's variants to Alice alone; no published page or JSON under a token names one — `latest_json_names_no_variant` |

## Design

### 1. The log file

`publish-log.json` sits in the document folder beside the chapters, a sibling of `document.yaml`
rather than part of it, because it grows with every publish while the metadata does not
(05-internals.md §10).

```json
{
  "schema_version": 1,
  "entries": [
    {
      "action": "publish",
      "published": "2026-03-14T09:12:44Z",
      "hash": "…26 characters…",
      "variants": ["talk"],
      "flag": "unlisted",
      "created_version": true,
      "deploy": "confirmed",
      "links": {
        "talk": {
          "stable":  "https://<site>/<id>/<token>/",
          "deck":    "https://<site>/<id>/<token>/slides/",
          "version": "https://<site>/<id>/<token>/v/<hash>/"
        }
      }
    }
  ]
}
```

- `action` is `publish` here; #28 adds `removal` to the same file without a schema change.
- `published` is RFC 3339 in UTC to the second, from `time` `0.3.55`. UTC rather than a local
  offset: an offset is a fact about where the author was, and the document says nothing about
  her machine or her whereabouts.
- `hash` is the version hash — 16 bytes, base32 lower-cased, 26 characters (sibling spec §1) —
  and it is the name every entry is keyed on.
- `created_version` is false when this publish's content already had a version path.
- `deploy` is `unconfirmed` when the entry is written and `confirmed` once the poll has seen the
  hash at the stable link; it is the one field a later write may change.
- `links` is keyed by variant name so #19 adds a key rather than a shape.

Entries are stored oldest first, so a publish appends one object and the file's diff is that
object; the panel and `read_publish_log` present them newest first. The file is written whole to
a temporary file beside itself and renamed, reusing `src-tauri/src/document.rs`'s pattern. A
file that will not parse is never overwritten: publish refuses with the parse error and names
the file, because the record is Alice's and a publish is not worth losing it for.

### 2. When an entry is written

An entry means a version reached the site, so it is written when the push has succeeded and not
before. That answers the intent's open question about a publish that fails part way: a publish
that fails at the build, the staging or the push leaves no line, because nothing was deployed —
the panel names the failing step instead — while a publish whose push landed leaves its line
even if the app is closed before the site answers. The poll's later success flips `deploy` to
`confirmed`; a timeout or Alice pressing Stop leaves it `unconfirmed`, and the panel says so
rather than implying a page that is not there yet.

Every press of Publish that pushes leaves a line, including a republish of content that has not
changed. That entry names the hash the previous entry already named, `created_version` is false,
and no second version path exists on the site — so the log counts publishes and the site counts
versions, which is what the intent asks for. Where the unchanged content also matches what
`latest.json` already names, the staging comparison finds every file identical, git finds
nothing to commit, and the publish still appends its line: the outcome's steps read
`skipped` for the commit and the push, and `pushed` is false.

### 3. What keeps an old link showing what it showed

Two rules in `stage.rs`, and no more than two:

1. **A version folder is written once.** Before copying the staging tree in, `stage.rs` tests
   whether `site/<id>/<token>/v/<hash>/` exists; where it does, it compares the listing and
   writes nothing at all, and where the listing disagrees it refuses the publish rather than
   reconciling — a hash that names two different trees is a bug in the hash, not a merge.
2. **`latest.json` is the only file a publish rewrites beneath a token**, besides the shell
   copies whose bytes are the same for every document. Old version paths are never opened for
   writing, and there is no index, manifest or pointer inside a version folder for a later
   publish to touch.

The presenter, the article script and the deck engine live at the site root and are shared by
every version (05-internals.md §8), so an old version is frozen in its content rather than in
its chrome. That is the answer to the intent's fourth open question, and it is what "content for
content what it deployed" means in its second acceptance criterion. A version hash that was
never published has no folder, so the host serves `404.html` — byte-identical to the shell — and
an unpublished hash is indistinguishable from a mistyped one.

Access is the one thing that follows the document rather than the version: a document gated in
October is gated for the link Bob saved in March, because the policy is written over the id
(adr-2609051324157479). This spec neither applies nor records that policy; the entry's `flag`
records what the document went out under at the moment of each publish, which is the history of
the choice rather than the current state of the gate.

### 4. Reading the log

`read_publish_log` takes no argument, reads `publish-log.json` from the open document root and
returns `PublishEntry[]` newest first; an absent file returns an empty list, an unparsable one
returns the parse error. It touches no network and no other file.

The versions list is a section of `src/publish-panel.ts`, drawn every time the panel opens
under the binding-table action `publish-open` (`C-c C-l`) and redrawn when a publish finishes.
It is not a second overlay: a log nobody can reach without a second chord is a log nobody
reads, and the panel is already where a publish is started and its links are handed over. The panel takes the keyboard while
open and `C-g` or Escape closes it, under the one cancel rule the reading views share. Each row
shows the date and time, the hash, the variants, the flag, and whether the entry created a
version or pointed at one already there; each row carries **Open** and **Copy** for the version
link and for the stable link, and Open hands the URL to the system browser rather than fetching
it. An `unconfirmed` entry is labelled as pushed but not yet seen at the link. The list is the
file's order reversed and nothing else: the panel computes no version count, no diff and no
"current" badge, because everything it shows is a field that was written when the version was
deployed.

## Acceptance Mapping

| Criterion (itd-2609051335479329) | Proven by |
|---|---|
| Two publishes of different content: the log lists two entries, newest first, each with its timestamp, hash, variants, flag and links, with open and copy | `src/publish-panel.test.ts` `lists_two_entries_newest_first`, `each_row_shows_the_stamp_hash_variants_flag_and_links`, `each_row_offers_open_and_copy`; `read_publish_log_returns_newest_first` |
| The earlier entry's version link, opened after the later publish, serves that earlier publish's built output content for content | `existing_version_folder_is_never_written`, `a_second_publish_touches_only_latest_json_and_the_new_version`; check M5 |
| Both publishes done: the stable link serves the later version and the earlier version link still serves the earlier one | `republish_moves_latest_and_leaves_the_old_version`; `src/site/presenter.test.ts` `a_stable_link_follows_latest_json`; check M5 |
| Unchanged content republished: the log gains an entry naming the hash the previous entry named, and no second version path is created | `an_unchanged_republish_creates_no_version_path`, `an_unchanged_republish_still_appends_an_entry`, `an_unchanged_republish_skips_the_commit` |
| A version hash never published renders the same empty shell as no id at all | `src/site/presenter.test.ts` `an_unpublished_hash_renders_the_shell`; `shell_copies_are_byte_identical` |
| The log read in a plain text editor: every entry readable as it stands, none naming her machine | `log_is_pretty_printed_and_reparses`, `log_entry_names_no_machine`; check M6 |
| A saved version link legible at 820, 390 and 1280 CSS px | `src/publish/build.test.ts` `built_pages_declare_the_viewport_and_no_fixed_width`; check M5 |
| Inherits five disciplines | the Scope table, one named test each |

Manual checks, logged under `.abcd/.work.local/logs/`: **M5** publish, save the version link,
publish different content, then open the saved link and the stable link side by side at the three
widths on Safari and Chromium; **M6** open `publish-log.json` in a plain text editor and read
every entry.

## Tasks

1. `log.rs`: the entry shape, the RFC 3339 UTC stamp, the oldest-first append, the atomic write, the refusal on an unparsable file, and the newest-first reader. — `cargo test --manifest-path src-tauri/Cargo.toml log`
2. The `deploy` field's later flip to `confirmed`, driven by the poll. — `cargo test --manifest-path src-tauri/Cargo.toml log_deploy`
3. `stage.rs`: the existing-version comparison, the refusal on a disagreeing listing, and the rule that only `latest.json` is rewritten beneath a token. — `cargo test --manifest-path src-tauri/Cargo.toml stage`
4. The unchanged-republish path end to end, under the dry-run flag and then with a fake `git`. — `cargo test --manifest-path src-tauri/Cargo.toml republish`
5. `read_publish_log`, registered in `lib.rs`. — `cargo test --manifest-path src-tauri/Cargo.toml read_publish_log`
6. The versions list inside `src/publish-panel.ts`, under the `publish-open` binding. — `npx vitest run src/publish-panel.test.ts`
7. The whole run. — `npm run lint && npm test && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml`

## Risks and Open Questions

- **Where the log lives was open** (03-evidence.md, "Document model and canon": "Whether the
  publish log is a file of its own beside the chapters or part of the document's metadata
  file"). 05-internals.md §10 settles it as a sibling file and this spec builds on that; strike
  the question.
- **What a failed publish records was open.** The build assumes an entry means a deployed
  version, so a publish that fails before the push leaves no line and the panel names the
  failing step. The consequence Alice should expect is that a push which lands while the site
  never answers leaves an entry marked `unconfirmed`, not a missing one.
- **Whether an old version is frozen in full or only in its content was open.** The build
  assumes content: the chrome is shared from the site root, so a presenter improvement reaches
  every version and a version's text, structure and assets never change. Anything that would
  make an old page render differently is therefore a change to the shared chrome, and the
  renderings-agree discipline is what holds it honest.
- **The hash length** is the sibling spec's assumption — 16 bytes, base32, 26 characters — and
  every entry is keyed on it. 03-evidence.md's question is struck there, not here.
- **`deploy` is a field the intent does not ask for.** It is added because the intent also
  demands that no entry's version path 404s, and an unconfirmed deploy is the one case where
  that could happen; a build that finds it noise may drop it, but then a publish is reported done
  on the push alone and the sibling spec's answer to "when is it done" changes with it.
