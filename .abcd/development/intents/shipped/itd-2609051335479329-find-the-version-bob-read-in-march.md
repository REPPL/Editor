---
id: itd-2609051335479329
slug: find-the-version-bob-read-in-march
spec_id: spc-2609051353457083
kind: standalone
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: publish
supersedes: [itd-2609051221553568, itd-2609051317492681]
---

# Find the version Bob read in March

## Press Release

In October Bob asks Alice about a figure she showed in March. The document
has moved on since: two sections are rewritten and the figure has a
different number. Alice opens the document in Editor and opens its publish
log — a list of every publish, newest first, each entry with its date, its
version hash, the variants it carried, the flag it went out under —
unlisted or gated — and its links. She finds the March entry by its date, copies its version link,
and sends it back. Bob opens the page he read in March.

Every publish writes its own version path and leaves every earlier one
alone. The stable link moves forward; the links beneath it do not move at
all. So the link Bob saved in March still shows March, the link Alice sent
last week still shows last week, and Alice never has to reconstruct an old
build from memory or from her git history.

The log lives in the document folder as a plain file beside the chapters,
so it is Alice's record rather than the app's. She can read it with any
tool, keep it in her own backups, and open or copy any entry from inside
Editor. A version is named by what it contains, not by when the button was
pressed: publishing again without changing anything lands on the hash that
is already there. The log still records that she published — every press
of the button leaves a line — but no second version path appears on the
site for content that has not changed.

## Why This Matters

A document that is republished is a document whose past is being
overwritten unless something keeps it. Without a record, "the version Bob
read in March" is a question Alice cannot answer: she has the current text
and a link that has moved on, and reconstructing what a reader saw means
guessing at a build. The publish log turns every past reading into a link
she can hand back in seconds, and turns republishing from something that
loses history into something that adds to it.

## Mechanism

- We expect a saved link to keep showing what it showed because publishing
  writes a new version folder and then rewrites only the stable paths and
  the pointer that names the latest hash; old version paths are never
  rewritten (05-internals.md, section 9). Falsifiable in one sitting:
  publish, save the version link, publish different content, fetch the
  saved link and compare it against what the first publish deployed.
- We expect the hash to be a dependable name for a version because it is
  computed from the built output, so identical content republished
  produces the identical hash and lands on the path that already holds it
  (05-internals.md, section 9). The log and the site therefore count
  different things: the log counts publishes, including one that changed
  nothing, and the site counts distinct versions. Falsifiable: publish the
  same document twice unchanged, compare the two hashes, and count the
  version paths.
- We expect Alice to find an old version months later because the log
  records the timestamp, the hash, the variants, the flag, and the links
  for every publish, and records them in the document folder rather than
  in application state — the same reasoning that keeps the document a
  folder of plain files the author owns (05-internals.md, section 10;
  01-product.md).
- We expect the record to stay true to the site because the log's entries
  are written by the publish action itself, not maintained beside it, so
  an entry exists exactly when a version was deployed. Falsifiable: an
  entry whose version path 404s, or a version path with no entry, is a
  failure of this intent.
- We expect this to matter in practice because the evidence is a document
  that already exists in three drifted copies, one of them some thirty
  lines out of step (03-evidence.md, the acceptance project). Versions
  that can be named and reopened are what stop a fourth copy being made
  simply to preserve what a reader saw.

## Scope Conditions

- Platform: the publish log is read in the desktop app on macOS; the <!-- cond: cond-2609051353457296 -->
  version links it holds open in current Safari and Chromium engines at
  desktop, iPad, and iPhone widths — 1280, 820, and 390 CSS px.
- Population: Alice reads the log — it is not published and no reader sees <!-- cond: cond-2609051353458175 -->
  it. Bob and Carol only ever hold a version link she sends them.
- Assumptions: the document has been published at least once, the log <!-- cond: cond-2609051353451554 -->
  lives in the document folder as a plain file the author owns, and the
  static host serves every published version path indefinitely.
- In scope: one entry per publish — including a republish that changed <!-- cond: cond-2609051353452131 -->
  nothing, which points at the hash already published and adds no version
  path — with its timestamp, hash, variants, flag, and links; open and
  copy for each entry; the stable link moving to the newest version while
  older version paths stay exactly as deployed. What an old version
  promises is its content: access follows the document, so a document
  gated later is gated at every version, and map #20,
  itd-2609051336005698, owns that. Taking versions off the site
  altogether belongs to map #28, itd-2609051402150739.
- Bundle: this intent is a member of the Publish bundle, whose other <!-- cond: cond-2609051353452105 -->
  member is map #7, itd-2609051335468596. They share one spec: #7 is the
  action that produces a link, this intent is the record of the links it
  has produced, and publishing without a version record is a link Alice
  cannot find again.
- Boundary with map #7 (itd-2609051335468596): #7 owns the publish action, <!-- cond: cond-2609051353450064 -->
  the minting of the stable id, the unlisted flag, and the empty
  presenter. This intent owns only the record of the entries #7 mints and
  the guarantee that an old entry still resolves to what it resolved to.
- Excluded as plumbing: the log's file format and the mechanism by which <!-- cond: cond-2609051353459277 -->
  the site records which version the stable link serves (05-internals.md,
  sections 9 and 10). What this intent owns of that mechanism is only its
  observable effect: the stable link serves the newest version and the
  older version links do not move.

## Acceptance Criteria

- Given a document published twice with different content, when Alice
  opens the publish log in the app, then it lists two entries, newest
  first, each showing its timestamp, its version hash, the variants
  published, the flag it went out under — `unlisted` or `gated` — and its
  links, with open and copy for each.
- Given the version link from the earlier entry, when it is opened after
  the later publish, then it serves that earlier publish's built output,
  content for content what it deployed. Access is the one thing that
  follows the document rather than the version: a document gated later is
  gated at every version, and what an old link promises is the same
  reading, not the same door.
- Given both publishes have completed, when the stable link is opened,
  then it serves the later version, and the earlier version link
  continues to serve the earlier one.
- Given a document whose content has not changed since its last publish,
  when Alice publishes again, then the log gains an entry recording that
  publish, that entry names the hash the previous entry already named, and
  no second version path is created on the site for the same content.
- Given a version hash that has never been published, when a link
  carrying it is requested, then the presenter renders the same empty
  shell it renders with no id at all — nothing named, nothing listed, and
  nothing that distinguishes an unpublished hash from a mistyped one.
  (Negative case.)
- Given the publish log opened outside Editor in a plain text editor, when
  Alice reads every entry in it, then each one is readable as it stands
  and none of them names her machine: no absolute local path, no local
  host or volume name, and no user name. Published links and the
  addresses of gated media are the document's own record and belong
  there.
- Given Bob's saved version link opened at iPad width (820 CSS px), and
  again at iPhone width (390 CSS px) and desktop width (1280 CSS px),
  then the version it names is legible at every one of the three widths
  with no horizontal scrolling and no pinch zoom.
- Inherits: no machine in the document (`itd-2609051336080960`); network
  only on publish (`itd-2609051336158553`); one source, always
  (`itd-2609051336090390`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; and, from phase
  3 where it binds, variant fidelity (`itd-2609051336107315`), since an
  entry lists the variants a version carried and no published page may
  reveal them to a reader.

## Open Questions

- Whether the publish log is a file of its own beside the chapters or part
  of the document's metadata file (03-evidence.md, "Document model and
  canon").
- The length of the version hash, which is the name every entry in the log
  is keyed on (03-evidence.md, "Publish and pipeline").
- What an entry records when a publish fails part way, and whether a
  failed publish leaves a line in the log at all.
- Confirmation that the presenter, the article script, and the slide
  engine are maintained once in the production repository and shared by
  every document, rather than copied into each published version
  (03-evidence.md, "Publish and pipeline"). This intent's promise is that
  an old link shows what it showed, so the answer decides whether an old
  version is frozen in full or only in its content.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-93afa043d254 -->
Fidelity review — receipt rcp-93afa043d254 (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:44f19418b0b8d56d7b17cbecbd5acd5d2cbed5abc4347428680ce46647f381d5 · prompt_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5
Input attestations: diff:e41596a^..HEAD (4228d9b61cc16d1f116a452bddd22f00096158a7..13277282fdd2c6a9e1a7dc66b019e323a1830376)@sha256:6343ab4e968dd2ce947b393ad874bb85af80f3bbb074f2d20e2e98bfd2353d7e; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609051353457083.md@-;

Acceptance rollup: MET 4 · MET_WITH_CONCERNS 3 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: read_publish_log returns entries newest first, the panel draws one row per entry with stamp, hash, variants, flag and per-variant links each carrying Open and Copy; the named vitest and cargo tests pass (53 and 162 green)
  evidence: src-tauri/src/publish/log.rs:128 — "pub fn entries_newest_first(path: &Path)"
  evidence: src-tauri/src/publish/log.rs:221 — "fn read_publish_log_returns_newest_first()"
  evidence: src/publish-panel.ts:375 — "entry.published, entry.hash, entry.variants.join(", "), entry.flag"
  evidence: src/publish-panel.ts:386 — "linkRow(`${name} deck`, ...), linkRow(`${name} version`, ...), linkRow(`${name} stable`, ...)"
  evidence: src/publish-panel.test.ts:299 — "it("lists_two_entries_newest_first""
  evidence: src/publish-panel.test.ts:323 — "it("each_row_offers_open_and_copy""
  evidence: src-tauri/src/lib.rs:292 — "publish::read_publish_log,"
  evidence: src/main.ts:124 — "createPublishPanel(createPublishServices(loadForPublish))"
- ac-2 — MET_WITH_CONCERNS: install_version writes nothing into an existing version folder and a second publish leaves the old folder's bytes and mtime unchanged (proven at stage and end-to-end level); concern: the access clause is not delivered — phase 1 records the gated flag and enforces no gate, so 'gated at every version' cannot be shown, and live serving of the old link (M5) is unticked
  evidence: src-tauri/src/publish/stage.rs:241 — "if target.exists() { ... return Ok(Installed::default()); }"
  evidence: src-tauri/src/publish/stage.rs:613 — "fn existing_version_folder_is_never_written()"
  evidence: src-tauri/src/publish/stage.rs:672 — "fn a_second_publish_touches_only_latest_json_and_the_new_version()"
  evidence: src-tauri/src/publish/tests.rs:274 — "assert_eq!(fs::read(&old).expect("read"), old_bytes);"
  evidence: src-tauri/src/publish/mod.rs:431 — "Phase 1 enforces neither gate: the access policy arrives with map #20"
  evidence: src/publish-panel.ts:24 — "Gated is recorded in the publish log and not enforced in phase 1"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353457083.md:3 — "Every row is unticked."
- ac-3 — MET: after two publishes latest.json names only the second hash while the first version folder is byte-identical, and the shipped presenter follows latest.json to /v/< hash>/ (a_stable_link_follows_latest_json)
  evidence: src-tauri/src/publish/tests.rs:274 — "assert!(latest.contains(&second.hash)); assert!(!latest.contains(&first.hash))"
  evidence: src-tauri/src/publish/stage.rs:265 — "pub fn write_latest("
  evidence: site/presenter/presenter.js:73 — "env.location.replace(plan.version(body.hash));"
  evidence: src/site/presenter.test.ts:101 — "it("a_stable_link_follows_latest_json""
- ac-4 — MET: an unchanged republish yields the same hash, created_version false, one version folder, a second log entry naming the same hash, and skipped commit and push
  evidence: src-tauri/src/publish/tests.rs:302 — "fn an_unchanged_republish_creates_no_version_path()"
  evidence: src-tauri/src/publish/tests.rs:315 — "assert_eq!(entries[0].hash, entries[1].hash); assert!(!entries[0].created_version);"
  evidence: src-tauri/src/publish/tests.rs:327 — "fn an_unchanged_republish_skips_the_commit()"
  evidence: src-tauri/src/publish/mod.rs:637 — "log::append_entry(&log::log_path(&context.document_root), entry)?;"
- ac-5 — MET_WITH_CONCERNS: the presenter never fetches for a version path and never writes to the page, and 404.html is byte-identical to the root shell that carries no link, list or heading, so an unpublished hash and a mistyped one both fall to the same shell; concerns: the spec-named test an_unpublished_hash_renders_the_shell actually exercises a stable link whose latest.json 404s, not a version link with an unknown hash, the equivalence relies on the host serving 404.html (untested here), and the manual row is unticked
  evidence: site/presenter/presenter.js:36 — "if (segments.length !== 2 && segments.length !== 3) { return null; }"
  evidence: src/site/presenter.test.ts:76 — "expect(presenter.target([ID, TOKEN, "v", HASH])).toBeNull();"
  evidence: src/site/presenter.test.ts:153 — "the_shell_is_identical_at_the_root_a_wrong_id_and_a_bare_id"
  evidence: src/site/presenter.test.ts:158 — "the_shell_carries_no_link_and_no_list"
  evidence: src-tauri/src/publish/stage.rs:93 — "("404.html", SHELL),"
  evidence: src-tauri/src/publish/stage.rs:721 — "fn shell_copies_are_byte_identical()"
  evidence: src/site/presenter.test.ts:125 — "an_unpublished_hash_renders_the_shell ... environment(`/${ID}/${TOKEN}/`, fetcher(null, 404))"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353457083.md:22 — "[ ] Take a version link and change one character of the hash."
- ac-6 — MET: the log is pretty-printed JSON with a UTC stamp, hash, variants, flag, created_version and public links and no other field; unit and end-to-end tests scan the written file for /Users/, /home/, /Volumes/, /var/folders, C:\, .local, @, file:// and the temp dir path
  evidence: src-tauri/src/publish/log.rs:111 — "serde_json::to_string_pretty(log)"
  evidence: src-tauri/src/publish/log.rs:34 — "pub struct PublishEntry { action, published, hash, variants, flag, created_version, links, seen_at_link }"
  evidence: src-tauri/src/publish/log.rs:232 — "fn log_is_pretty_printed_and_reparses()"
  evidence: src-tauri/src/publish/log.rs:248 — "fn log_entry_names_no_machine()"
  evidence: src-tauri/src/publish/tests.rs:602 — "fn the_log_entry_carries_the_links_and_no_machine()"
  evidence: src-tauri/src/publish/log.rs:83 — "at.replace_nanosecond(0)...format(&Rfc3339)"
- ac-7 — INCONCLUSIVE: the diff supplies only structural proxies — every built page declares the viewport and no fixed width, article.css uses max-width and overflow-x auto, slides.css collapses columns below 820px, and legibility.test.ts reports 'as far as jsdom can tell' — while the observable outcome (legible, no horizontal scroll, no pinch zoom at 390/820/1280 in Safari and Chromium) exists only as manual row M5, which is unticked
  evidence: src/publish/build.test.ts:80 — "built_pages_declare_the_viewport_and_no_fixed_width"
  evidence: src/publish/build.ts:459 — "< meta name="viewport" content="width=device-width, initial-scale=1">"
  evidence: site/presenter/article.css:60 — "overflow-x: auto;"
  evidence: src/core/render/slides.css:263 — "@media (max-width: 819px)"
  evidence: src/core/render/legibility.test.ts:119 — "reports no horizontal overflow, as far as jsdom can tell"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353457083.md:11 — "[ ] Open both links side by side at 390, 820 and 1280 CSS px, in Safari and in Chromium."
- ac-8 — MET_WITH_CONCERNS: no-machine (log_entry_names_no_machine), network-only-on-publish (socket-observed an_editing_session_makes_no_request plus the single-ureq-file test), one-source (latest.json the only rewrite) and variant fidelity (latest_json_names_no_variant; built pages carry no id, token, hash or stamp) each have a passing named test; concerns: the legibility inheritance rests on the same jsdom proxies as ac-7 with M5 unticked, and the spec's named test opening_an_entry_makes_no_request does not exist under that name
  evidence: src-tauri/src/publish/log.rs:248 — "fn log_entry_names_no_machine()"
  evidence: src-tauri/src/publish/tests.rs:641 — "fn an_editing_session_makes_no_request()"
  evidence: src-tauri/src/publish/tests.rs:687 — "fn no_network_outside_publish()"
  evidence: src/publish-panel.test.ts:421 — "it("an_editing_session_makes_no_request""
  evidence: src-tauri/src/publish/stage.rs:704 — "assert_eq!(latest.len(), 1, "latest.json is the one file rewritten");"
  evidence: src-tauri/src/publish/stage.rs:750 — "fn latest_json_names_no_variant()"
  evidence: src/publish/build.test.ts:68 — "expect(file.text).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaaaa")"
  evidence: .abcd/development/specs/closed/spc-2609051353457083-find-the-version-bob-read-in-march.md:45 — "opening_an_entry_makes_no_request"
  evidence: src/core/render/legibility.test.ts:119 — "as far as jsdom can tell"

Gap audit:
- honoured:
  - a publish log, newest first, with date, hash, variants, flag and links, open and copy for each
    evidence: src/publish-panel.ts:369 — "for (const entry of entries)"
    evidence: src/publish-panel.test.ts:299 — "lists_two_entries_newest_first"
  - every publish writes its own version path and leaves every earlier one alone; only latest.json moves
    evidence: src-tauri/src/publish/stage.rs:241 — "if target.exists()"
    evidence: src-tauri/src/publish/stage.rs:704 — "latest.json is the one file rewritten"
  - the log lives in the document folder as a plain file the author owns
    evidence: src-tauri/src/publish/log.rs:22 — "pub const LOG_FILE: &str = "publish-log.json";"
    evidence: src-tauri/src/publish/log.rs:73 — "document_root.join(LOG_FILE)"
  - a version is named by what it contains; republishing unchanged content lands on the existing hash yet still leaves a line
    evidence: src-tauri/src/publish/tests.rs:315 — "an_unchanged_republish_still_appends_an_entry"
    evidence: src-tauri/src/publish/tests.rs:302 — "an_unchanged_republish_creates_no_version_path"
  - entries are written by the publish action itself, after the push, so an entry exists exactly when a version reached the site
    evidence: src-tauri/src/publish/mod.rs:616 — "Only now: an entry means a version reached the site."
  - an unparsable log is never overwritten
    evidence: src-tauri/src/publish/log.rs:271 — "log_refuses_a_file_that_will_not_parse_and_leaves_it_alone"
    evidence: src-tauri/src/publish/tests.rs:528 — "publish_preflight_refuses_an_unparsable_log"
- diverged:
  - a document gated later is gated at every version
    evidence: src-tauri/src/publish/mod.rs:431 — "Phase 1 enforces neither gate"
    evidence: src-tauri/src/publish/tests.rs:561 — "the_flag_is_recorded_as_the_document_went_out"
  - Bob opens the page he read in March — the old version is frozen in content only, its chrome is shared from the site root and may change
    evidence: src-tauri/src/publish/stage.rs:14 — "The presenter, the stylesheets and the deck engine live once at the site root and are shared by every version"
  - the spec's deploy: unconfirmed|confirmed field and the tests it named
    evidence: src-tauri/src/publish/log.rs:53 — "pub seen_at_link: Option< String>,"
    evidence: .abcd/development/specs/closed/spc-2609051353457083-find-the-version-bob-read-in-march.md:68 — ""deploy": "confirmed","
    evidence: .abcd/development/specs/closed/spc-2609051353457083-find-the-version-bob-read-in-march.md:45 — "opening_an_entry_makes_no_request"
- missing:
  - the version link legible at 390, 820 and 1280 CSS px in Safari and Chromium with no horizontal scroll and no pinch zoom (M5)
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353457083.md:11 — "[ ] Open both links side by side at 390, 820 and 1280 CSS px"
  - the log read outside Editor and the unpublished-hash page checked against a live host (M6 and the unpublished-hash row)
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353457083.md:3 — "Every row is unticked."

Scope-condition dispositions:
- cond-2609051353457296 — untested: the delivery runs in jsdom and a Rust test harness; no Safari or Chromium rendering at 1280, 820 or 390 CSS px is exercised anywhere in the diff, and the manual row that would is unticked
- cond-2609051353458175 — survived: the log is written only under the document root and the site tree receives only the version folder, latest.json and the shells; built pages name no id, token, hash or stamp, so no reader can reach the record
  evidence: src-tauri/src/publish/log.rs:73 — "document_root.join(LOG_FILE)"
  evidence: src-tauri/src/publish/stage.rs:704 — "latest.json is the one file rewritten"
  evidence: src/publish/build.test.ts:68 — "expect(file.text).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaaaa")"
- cond-2609051353451554 — survived: the log is a plain pretty-printed sibling file in the document folder and the panel also handles the never-published case; the host's indefinite serving of version paths is consistent with the Cloudflare Pages setup the docs describe but is not exercised by the delivery
  evidence: src-tauri/src/publish/log.rs:22 — "pub const LOG_FILE: &str = "publish-log.json";"
  evidence: src/publish-panel.ts:365 — "This document has not been published yet."
  evidence: docs/how-to-connect-the-production-repository.md:25 — "the presenter shell, byte for byte the same file"
- cond-2609051353452131 — survived: one entry per publish including the unchanged republish, all five fields plus open and copy per row, latest.json moving while old folders stay, and access left to map #20 exactly as the condition drew the line
  evidence: src-tauri/src/publish/tests.rs:315 — "an_unchanged_republish_still_appends_an_entry"
  evidence: src/publish-panel.ts:386 — "linkRow(`${name} version`, entryLinks.version)"
  evidence: src-tauri/src/publish/mod.rs:431 — "the access policy arrives with map #20"
- cond-2609051353452105 — narrowed: the bundle relation holds in substance — #7 is the action, this intent the record — but the two members did not ship under one spec; each has its own closed spec that cross-references a shared design, and the intent is recorded kind: standalone
  narrowing: holds as one shared design split across two specs (spc-2609051353457083 and spc-2609051353438810), not as one shared spec
  evidence: .abcd/development/specs/closed/spc-2609051353457083-find-the-version-bob-read-in-march.md:32 — "**Out.** The publish action, the id and token minting, the content hash, the site layout"
  evidence: .abcd/development/intents/shipped/itd-2609051335479329-find-the-version-bob-read-in-march.md:5 — "kind: standalone"
- cond-2609051353450064 — survived: the delivered record half is log.rs, read_publish_log and the two never-rewrite rules in stage.rs; the action, minting, flag and empty presenter are used but owned by the sibling spec
  evidence: src-tauri/src/publish/log.rs:1 — "`publish-log.json`: one entry per publish, in the document folder."
  evidence: .abcd/development/specs/closed/spc-2609051353457083-find-the-version-bob-read-in-march.md:32 — "**Out.** The publish action, the id and token minting"
- cond-2609051353459277 — survived: the observable effect the intent kept — stable link newest, older version links unmoved — is what the end-to-end test asserts, and the file format and latest.json mechanism were fixed by the spec rather than by the intent
  evidence: src-tauri/src/publish/tests.rs:274 — "fn republish_moves_latest_and_leaves_the_old_version()"
  evidence: src-tauri/src/publish/stage.rs:265 — "Write `latest.json`, the one file a publish rewrites beneath a token."
## Grounds

- pursued: a stable id with content-hashed versions and a publish log lets old links keep old content; wrong if authors need to edit history or revoke a version
