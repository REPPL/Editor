---
id: spc-2609051353438810
slug: publish-and-get-a-link-i-can-open-from-the-lectern
intent: itd-2609051335468596
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Publish and get a link I can open from the lectern

## Summary

This spec delivers the publish action for itd-2609051335468596: one command that renders the
open document's deck and article into a versioned output folder, mints the document's stable id
and its variant token, names the version by a hash of its own bytes, and commits and pushes into
the production repository with the author's own git. It also delivers the presenter shell that
makes the link resolve — an empty page routing by id and token on the client, listing nothing —
the publish panel where Alice chooses unlisted or gated, and the site scaffold and pipeline
workflow the production repository carries. It is the first half of the Publish bundle; the
record of what was published belongs to spc-2609051353457083, written against this design. Every
step short of the two that leave the machine — the push and the deploy poll — runs under a
dry-run flag, which the tests exercise.

## Scope

**In.** `src/publish/build.ts` (a version's built output from the tree, and the envelopes the
site serves it in); `src/publish/links.ts` (the grammar and the link forms);
`src/publish/services.ts` (what the application hands the panel, and what a publish refuses
before it builds); `src/publish-panel.ts`; `site/` — `index.html` and `404.html` (the presenter
shell), `presenter/presenter.js`, `presenter/presenter.css`, `presenter/article.css`,
`presenter/deck.js`, `_headers`, `robots.txt` — hand-written and included into the shell by
`src-tauri/src/publish/stage.rs`, with `tools/verify-site.mjs` and
`.github/workflows/publish.yml` beside them; `src-tauri/src/publish/` — `mod.rs` (the commands,
the run, the identity lines, the deploy poll), `identity.rs` (minting, base32, the listing hash),
`stage.rs` (staging, install, scaffold), `git.rs` (git), `log.rs` (the sibling spec's entries);
`src-tauri/src/settings.rs`; six commands registered in `src-tauri/src/lib.rs`. Tests:
`src/publish/build.test.ts`, `src/publish/services.test.ts`, `src/publish-panel.test.ts`,
`src/site/presenter.test.ts`, and the Rust tests named below.

There is no `vite.site.config.ts` and no `dist-site/`: the site's files are written by hand
under `site/` and compiled into the shell binary by `include_str!`, so what a publish lays down
is what is in the tree and no second build step can disagree with it. There is no `hash.rs`,
`metadata.rs`, `repo.rs` or `net.rs` either: the hash lives in `identity.rs` beside the names it
is a grammar with, git lives in `git.rs`, the one outbound call lives in `mod.rs` next to the
command that may make it, and `src-tauri/src/metadata.rs` is the whole application's one reader
of `document.yaml` rather than this spec's.

**Out.** The publish log, its rendering and version immutability — map #8, spc-2609051353457083.
Per-variant links beyond the default variant's token — #19. The gate, the access file and the
allow-list — #20: the choice is shown and the flag recorded, only `unlisted` is writable here.
The PDF — #21. Unpublishing — #28. Referenced assets, threshold and ceiling —
#15 and #27; phase 1 publishes copied assets only. The slide mapping and the authored deck
constructs — #5 and #6: this spec consumes `render/slides`, it does not define it.

**Disciplines inherited.**

| Discipline | Proven here by |
|---|---|
| Network only on publish (`itd-2609051336158553`) | every outbound call lives in `publish/mod.rs`, reached only from a command Alice's press invoked, and gated on `PublishInProgress`: `no_network_outside_publish` scans the crate for a call site elsewhere, `check_deploy_is_refused_outside_a_publish` holds the gate, and `an_editing_session_makes_no_request` drives a session against a socket that reports every connection made to it |
| No machine in the document (`itd-2609051336080960`) | the only bytes written into the document folder are `id:` and `variant_tokens:` in `document.yaml`, plus the sibling spec's log entry; the repository path, remote and branch live in the app's settings outside it — `document_yaml_gains_only_the_identity_lines` |
| One source, always (`itd-2609051336090390`) | presenter, stylesheets and deck engine are written once under `site/` and `src/vendor/reveal/` and copied to the site root, never into a version folder; `document.yaml` is read in one place |
| Legible on three device classes (`itd-2609051336128348`) | `built_pages_declare_the_viewport_and_no_fixed_width`, and check M4 at 390, 820 and 1280 CSS px on both engines |
| Variant fidelity (`itd-2609051336107315`), from phase 3 | no version folder, page or `latest.json` names a variant; the token alone selects one — `latest_json_names_no_variant` |

## Design

### 1. Identity: byte lengths and encoding

Three names, one grammar: each is **16 bytes** encoded **RFC 4648 base32, lower-cased, unpadded
— 26 characters** over `[a-z2-7]`, validated by `^[a-z2-7]{26}$` in `src/publish/links.ts` and
`publish/identity.rs`.

- **Stable id** — 16 bytes from the system random source (`getrandom::fill`, `getentropy` on
  macOS). 128 bits, because it is the whole protection of an unlisted document. Minted once into
  `document.yaml`, never regenerated.
- **Variant token** — 16 bytes the same way, one per declared variant, minted with the id. Phase
  1 mints the default variant's; #19 mints the rest.
- **Version hash** — the first 16 bytes of §4's digest, same encoding, so one validator serves
  every segment.

Base32 not hex, because the production repository is checked out on a case-insensitive file
system where two names differing only in case collide; base32 not base64url, because the
alphabet omits `0`, `1`, `8` and `9`, so no character has a look-alike.

### 2. `document.yaml`, read once and written by line

Rust owns the file because Rust owns the file system. `read_document_metadata` returns `{ title,
variants, default_variant, id, variant_tokens }`, so there is one reader and not two; it handles
the scalar keys, a flow sequence (`variants: [full, talk]`) and one nested map, and refuses a
form it does not know rather than misreading it. Minting writes by line, never by
re-serialising: an existing `^id:` line is replaced in place, an absent one appended at column
zero, which closes any block scalar (`abstract: |`) correctly. Every other byte is untouched,
and the write is atomic through `src-tauri/src/document.rs`'s temporary-file pattern.

### 3. The build step

`buildVersion(tree, variant, context)` in `src/publish/build.ts` returns `{ files: BuiltFile[];
copies: AssetCopy[] }` — `{ path, text }` and `{ from, to }` — and writes nothing. The files are
`index.html`, the article from `render/article`, and `slides/index.html`, the deck from
`render/slides`. Each copy names an asset by its path relative to the document root and its path
in the version folder, so asset bytes go disk to disk through Rust and never through the web
view. References are rewritten once, here: a chapter's
`![The lantern at dusk](assets/lantern.jpg "Photograph by Carol"){.full-bleed}` resolves against
the Part holding it and lands at `assets/<part-folder>/lantern.jpg`, one folder per Part as on
disk, so two Parts may each hold a `lantern.jpg`; a `.video` block's `- site: keynote.mp4`
resolves the same way, with a unit test alone until #16.

`buildVersion` is a pure function of its arguments: no clock, no random value, no path from the
machine, and no built file embedding the id, the token, the hash or the timestamp. That is what
makes the hash reproducible and the dry run faithful — `build_is_deterministic` renders one
fixture twice and compares bytes. When phase 7 puts the id in the page to key a reader's own
marks, the id becomes an input to the hash and this narrows to the hash and the stamp.

Renderers, pinned exact: `markdown-it` `14.3.1` with `markdown-it-attrs` `4.5.0` (`{...}` on
headings, images and spans), `markdown-it-footnote` `4.0.0` and `markdown-it-bracketed-spans`
`1.0.3`. `markdown-it-container` is *not* a dependency: it closes the outer div at the first
bare `:::`, which turns the canon's own columns example into three sibling divs and swallows the
paragraph after it, so `src/core/markdown.ts` carries a hand-written block rule that counts
opening and closing fences instead. The deck runs
`reveal.js` `5.2.1`, self-hosted at the site root rather than from a CDN, which would tell a
third party who opened an unlisted link. The citation plugin and its BibTeX reader arrive with
#11.

### 4. The content hash

Over the staged version folder, in `publish/identity.rs`: for each file `sha256(bytes)` as
lower-case hex; one line per file, `<hex> + "  " + <path> + "\n"`, the path relative to the
version folder with `/` separators; lines sorted ascending by the path's UTF-8 bytes and
concatenated; `version_hash = base32(sha256(listing)[0..16])`. No mode, no size, no timestamp:
content and layout only, and 128 bits leaves a birthday bound of 2^64 versions. `sha2` `0.10.9`.

### 5. The site layout in the production repository

```
publish-site.json                   { schema_version, base_url, site_dir }
tools/verify-site.mjs   .github/workflows/publish.yml
site/                               the Pages output directory
  index.html  404.html              the shell; 404 byte-identical to index
  robots.txt  _headers              Disallow: / ; the headers below
  presenter/                        shell, article script, reveal.js 5.2.1
  <id>/<token>/index.html           the shell again: the stable link
  <id>/<token>/slides/index.html    the shell again: the stable deck link
  <id>/<token>/latest.json          { "schema_version": 1, "hash": "…" }
  <id>/<token>/v/<hash>/index.html  the article
  <id>/<token>/v/<hash>/slides/     the deck
  <id>/<token>/v/<hash>/assets/     copied assets
```

No root name can collide with an id — an id is twenty-six characters over `[a-z2-7]` and none of
the reserved names is, while `v` and `slides` are too short to be a token — so the shell routes
on segment shape alone. `site/index.html`, `site/404.html` and every `<id>/<token>/index.html`
are byte-identical copies of one shell file, so the root, a wrong id, a bare id and an
unpublished hash render the same page: a claim about the page, not about what the host answers
(02-constraints.md; decision log, 2026-09-05). `_headers` sets for `/*` a `Referrer-Policy:
no-referrer`, so a click out of a published page carries no unguessable link in a header;
`X-Robots-Tag: noindex, nofollow`; and a `Content-Security-Policy` of `default-src 'none'` with
`'self'` for the page's own script, style, image, media, font and connect. The chrome is copied
in only where bytes differ, outside every version folder, so a version is frozen in its content
rather than its chrome (05-internals.md §8).

### 6. The presenter page

`src/site/presenter.ts` runs on every shell copy and does one thing. Split the path on `/`, drop
empties; `[id, token]` resolves and replaces with `v/<hash>/`; `[id, token, "slides"]` resolves
and replaces with `v/<hash>/slides/`; anything else stops and the shell stands. A segment
failing the grammar is never fetched, so a mistyped address makes no request. Resolving fetches
`latest.json` relative to the stable path and returns its `hash` on a 200 whose body parses and
matches the grammar; any other status or body stops, and nothing is written to the page on
failure — no message, no code, no console line. The title is the site's own name, constant on
every path; the body is one centred mark with no list, no index and no link, which is what a
crawl from the root finds. The stable deck link is an addition to §9's layout, which neither
names nor forbids a sibling: without it Alice lands on the article, not the talk.

### 7. Git, in Rust

Editor **shells out to the author's `git`** through `std::process::Command` in
`publish/git.rs`; it links neither `git2` nor `gix`. The reason is the intent's promise that
Editor holds no credential: the author's push works because their configuration works — the
keychain credential helper, an `ssh` agent and its config, `includeIf`, `commit.gpgsign`,
`url.*.insteadOf`, a proxy — and `libgit2` reimplements a subset of that without running the
author's credential helpers, `gix` less still. The costs accepted are that `git` must be on the
path (the Xcode tools `AGENTS.md` already requires) and that a failure arrives as stderr text,
so the reason Alice reads is git's own sentence. Arguments pass as a vector, never a shell
string, with `GIT_TERMINAL_PROMPT=0` and `GIT_OPTIONAL_LOCKS=0` so a missing credential fails
rather than prompting, and a remote or branch beginning with `-` is refused.

```
git -C <repo> rev-parse --git-dir            is it a repository
git -C <repo> symbolic-ref --quiet HEAD      refuse a detached HEAD
git -C <repo> add -- <written paths>
git -C <repo> status --porcelain -- <paths>  unchanged -> skip the commit
git -C <repo> commit -m "publish <id> <hash>" -- <written paths>
git -C <repo> push <remote> HEAD:<branch>
```

The commit names only the paths this publish wrote, so unrelated work is neither staged nor
swept in and the author's hooks are left alone. On a push failure the commit stays — `git reset`
could destroy work that is not Editor's — and Alice is told the push failed, that the commit is
local, and that the site still serves what it did before; the next publish pushes it.

### 8. The commands

Five in `publish/mod.rs`, each a thin wrapper over a plain function taking explicit paths, so
tests reach the logic directly, and each confining every path it is given as
`document::confine_chapter` does. Errors are `Err(String)`.

| Command | Arguments | Returns | Refuses |
|---|---|---|---|
| `read_document_metadata` | — | `DocumentMetadata` | no folder open; unreadable YAML |
| `publish_preflight` | `variant` | `Preflight { has_id, repo_ready, git_available, remote, branch, base_url, refusals }` | nothing; it reports |
| `publish` | `PublishRequest { variant, flag, dry_run, files, copies }` | `PublishOutcome` | any preflight refusal; a path escaping its root; `flag: "gated"` |
| `check_deploy` | `url`, `expected_hash` | `DeployCheck { answered, hash }` | a URL not under the configured base |
| `read_publish_log` | — | `PublishEntry[]` | owned by spc-2609051353457083 |

`PublishOutcome` carries `{ id, token, hash, created_version, pushed, stable_link, deck_link,
version_link, dry_run, steps }`, each step `{ name, state, detail }`. `publish` runs: preflight;
mint; scaffold the production repository where it is not yet scaffolded; stage the built files
and copied assets in the app's own cache directory, outside every tracked folder; hash the
staging tree; compare against `site/<id>/<token>/v/<hash>/`. Where it exists and its listing
matches, nothing is written into it — an existing version folder is never rewritten — and
`created_version` is false; otherwise the staging tree is copied in. Then `latest.json` and the
shell copies where bytes differ, then git, then the sibling spec's log entry.

**Dry run** does all of that but the production repository, git and the network: it builds,
stages, hashes, computes the links, and writes its step list to `dry-run.json` beside the
staging tree. It mints the id and token on disk as a real publish does, which the intent's
failure criterion allows, and appends no log entry, an entry meaning a deployed version.

**Following the publish.** Editor reports done when the link answers, not when the push lands:
that is the question Alice has at a lectern. After the push the panel invokes `check_deploy`
every three seconds for at most five minutes, each one request with a ten-second timeout through
`ureq` `3.4.0`, stopping on the expected hash, on Stop, or on the bound — after which Alice
holds the link and a line saying the site has not answered yet.

### 9. The publish panel

An overlay in `src/publish-panel.ts`, opened by the binding-table action `publish-open` (`C-c
C-p`) and by one File menu item with no accelerator, so the menu claims no chord. It takes the
keyboard while open; `C-g` and Escape close it. It shows the title and the variant published; a
two-way choice, **Unlisted** and **Gated**, Gated present and disabled with a line saying it
arrives with #20; and, beside the choice and behind no disclosure,

> Unlisted is not private: anyone holding the link can read it, and a link once sent cannot be
> recalled.

The panel builds its contents fresh on each open, so the sentence is stated at every publish and
cannot be turned off. Then Publish and Dry run; the steps with their states and a Stop watching
button while the poll runs; and, on success, the stable link and the stable deck link, each with
a copy action. On failure, the failing step with git's reason and the line that the site still
serves what it served before.

### 10. Cloudflare Pages and the workflow

The Pages project is connected to the private repository, production branch `main`, no build
command, output directory `site`, committed already built because the app is the only thing that
writes it. `.github/workflows/publish.yml` runs on a push to `main` touching `site/**`, with
`permissions: contents: read`, a concurrency group per ref, and actions pinned by commit SHA.
Its one live job runs `node tools/verify-site.mjs site`, which asserts `404.html` byte-identical
to `index.html`, every root entry one of the reserved names or a well-formed id, every
`latest.json` naming a hash whose version folder exists, and no file over the host's 25 MiB
per-file ceiling. Three stubbed jobs follow, each a comment naming its owner: above-ceiling
assets verified against the manifest (#15), the journal PDF rendered by Typst (#21), and the
Cloudflare Access policy applied from the committed access file (#20). No credential, token,
secret name or `secrets.*` reference appears in any file this spec writes. In phase 1 the
workflow reports and does not gate the deploy, because gating means deploying from the workflow
with a token.

## Acceptance Mapping

| Criterion (itd-2609051335468596) | Proven by |
|---|---|
| Never published: mints an id, writes it into the metadata, commits under it, pushes | `first_publish_mints_an_id_and_token`, `document_yaml_gains_only_the_identity_lines`, `publish_commits_under_the_document_id`, `publish_pushes_to_the_configured_remote` (a fake `git` records its arguments) |
| Reported done: one stable link with a copy action; opening it serves the document | `src/publish-panel.test.ts` `"shows_the_stable_link_with_a_copy_action, the deck first"`; `src/site/presenter.test.ts` `a_stable_link_resolves_to_the_latest_version`; check M1 |
| Edit one line, publish again: the same stable link serves the new content | `republish_moves_latest_and_leaves_the_old_version`; `presenter.test.ts` `a_stable_link_follows_latest_json` |
| Root, unpublished id and bare id render the same empty shell | `presenter.test.ts` `the_shell_is_identical_at_the_root_a_wrong_id_and_a_bare_id`; `shell_copies_are_byte_identical` |
| Crawled from the root, nothing links to, lists or enumerates the document | `presenter.test.ts` `the_shell_carries_no_link_and_no_list`; `verify-site.mjs` `no_root_entry_outside_the_reserved_names`; check M2 |
| The panel states that unlisted is not private, every publish | `publish-panel.test.ts` `states_that_unlisted_is_not_private`, `states_it_again_on_the_second_open` |
| Push fails: the reason is reported, the site is unchanged, the folder is byte for byte but for what was recorded | `a_failed_push_leaves_the_deployed_paths_untouched`, `a_failed_push_names_the_step_and_the_reason`, `a_failed_push_leaves_the_document_folder_but_for_the_id`, `a_retry_after_a_failed_push_pushes_the_held_commit` (the next publish sends the commit the failed one left, rather than recording a link the site never received); `src/publish-panel.test.ts` `names_the_failing_step` |
| A full editing session with no publish makes no request | `an_editing_session_makes_no_request` (against a socket that reports every connection made to it), `check_deploy_is_refused_outside_a_publish`, `no_network_outside_publish`; check M3 |
| Legible at 390, 820 and 1280 CSS px | `src/publish/build.test.ts` `built_pages_declare_the_viewport_and_no_fixed_width`; check M4 |
| A reference the build will not resolve stops the publish and is named | `src/publish-panel.test.ts` `"fails the build step on a refusal and names every one, publishing nothing"`; `src/publish/build.test.ts` `"refuses a reference to a file a published version does not carry"` |
| A publish over a dirty buffer, an unreadable chapter or a nameless variant is refused before anything is built | `src/publish/services.test.ts` `"refuses while the buffer differs from the file"`, `"refuses when a chapter would not read, and names it"`, `"refuses a document that declares no variant"` |
| No built page carries an inline style, which the site's policy would drop | `src/publish/build.test.ts` `"carries no style attribute on any element of a built page"`; `src/core/render/legibility.test.ts` `"carries no inline style at all on a real chapter's deck"` |
| Inherits five disciplines | the Scope table, one named test each |

Manual checks, logged under `.abcd/.work.local/logs/`: **M1** open the link on a second machine;
**M2** crawl the deployed site and list every reachable path; **M3** watch the network through
an editing session; **M4** the three widths on Safari and Chromium.

## Tasks

1. `identity.rs` (base32, the grammar, minting), `metadata.rs` (the reader and the line-oriented identity write) and `hash.rs` (the canonical listing and the version hash). — `cargo test --manifest-path src-tauri/Cargo.toml identity metadata hash`
2. `src/publish/build.ts` and `links.ts`, with the asset rewrite. — `npx vitest run src/publish.test.ts`
3. `src/site/`: shell, routing, `_headers`, `robots.txt`, `verify-site.mjs`, `workflow-publish.yml`, `vite.site.config.ts`, `build:site`. — `npm run build:site && npx vitest run src/site/presenter.test.ts && node src/site/verify-site.mjs <a fixture site folder>`
4. `stage.rs` and `repo.rs`: staging, the existing-version comparison, the scaffold, and the git sequence against a fake `git`. — `cargo test --manifest-path src-tauri/Cargo.toml stage repo`
5. `net.rs`, `check_deploy`, and the five commands with the dry run, registered in `lib.rs`. — `cargo test --manifest-path src-tauri/Cargo.toml publish`
6. `src/publish-panel.ts` and the `publish-open` binding. — `npx vitest run src/publish-panel.test.ts`
7. The whole run. — `npm run lint && npm test && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml`

## Risks and Open Questions

- **The lengths were open** (03-evidence.md, "Publish and pipeline"). The build assumes 16 bytes
  each, base32 lower-cased, 26 characters, which contradicts the brief's illustrative
  `id: 7f3a91c2e4d85b06` — 64 bits, reachable by a patient enumerator. Correct the example.
- **When "done" is reported was open**: "whether Editor reports a publish done when the push
  lands or when the link answers". The build assumes the link, by polling it, with a
  five-minute bound M1 must replace. That Editor pushes with the author's own setup is likewise
  a claim 03-evidence.md owes to the first publish.
- **New dependencies need sign-off** (`AGENTS.md`): `sha2` `0.10.9`, `getrandom` `0.3.4`,
  `serde_json` `1.0.151`, `time` `0.3.55`, `ureq` `3.4.0`; `markdown-it` `14.3.1` with its three
  plugins, and `reveal.js` `5.2.1`. Base32 and the RFC 3339 stamp are written here instead.
- **06-delivery.md excludes the article from phase 1**, while the intent says the link serves
  the document she published and 05-internals.md §9 makes `index.html` the article. The build
  assumes a plain legible article page whose internals #9 replaces, with the deck beside it.
- **The verify job does not gate the Pages deploy**, so a failing site is deployed and then
  reported; and concurrent publishing is out of scope (06-delivery.md), so a second machine
  pushing between this commit and its push fails the push as a non-fast-forward, reported like
  any other and not resolved.

