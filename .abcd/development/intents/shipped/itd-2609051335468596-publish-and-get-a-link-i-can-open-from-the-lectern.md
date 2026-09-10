---
id: itd-2609051335468596
slug: publish-and-get-a-link-i-can-open-from-the-lectern
spec_id: spc-2609051353438810
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

# Publish and get a link I can open from the lectern

## Press Release

Alice finishes the chapter twenty minutes before the talk and presses
Publish. Editor builds the deck and its assets, commits them under the
document's own id, pushes to the production repository, and hands her one
link. She sends the link to herself, opens it on the machine at the
lectern, and the talk is on the screen. There is no export folder to
carry, no memory stick, and nothing to install on a machine she does not
own.

The link is the document's stable link, and it always shows the newest
version. When Alice spots a wrong date over coffee, she corrects the line,
presses Publish again, and the same link shows the correction: the link
she has already sent to the room does not go stale. Bob, following from
the back row on his phone, opens that same link and reads it at his own
size, with nothing sliding off the side of the screen.

Nothing else on the site leads there. Carol, who types the site's address
without an id, meets an empty page: no document, no index, no list of what
exists. The document is unlisted, and Editor says plainly what unlisted
means — anyone holding the link can read it, and a link once sent cannot
be recalled.

Until Alice presses Publish, the app has not touched the network at all.
The folder on her disk is the whole document; publishing is the one moment
it leaves the machine, and it leaves through her own git configuration.
Editor keeps no account and no token of its own.

## Why This Matters

A talk has a date and a room, and the machine in that room is rarely
Alice's. Carrying a build around as files means a folder one version
behind, an asset that did not travel with it, or a borrowed browser that
will not open a local page the way it opens a hosted one — discovered
with the audience already seated. One link, minted by the same action that
builds the document, closes the gap between the text Alice was editing and
the thing the room sees, and keeps it closed when she edits again.

## Mechanism

- We expect the published deck to match what Alice saw in the app because
  both run one rendering core over one tree: the app, the presenter site,
  and the publish pipeline are hosts of the same implementation, so a
  difference between them is a bug in the core rather than a setting to
  reconcile (05-internals.md, section 4). Falsifiable: render one chapter
  in the app and on the site and compare them.
- We expect one action to be enough because the whole of publishing is a
  commit and a push into a repository that a static host deploys. There is
  no service of Editor's to be running, and nothing to be down at the
  lectern beyond the host itself (02-constraints.md;
  adr-2609051324157479).
- We expect Alice's existing git configuration to carry the push because
  Editor holds no credential of its own, so there is nothing to store and
  nothing to leak (01-product.md). This is a claim and not yet a result:
  03-evidence.md carries it under "Publish and pipeline" as a confirmation
  owed to the first publish.
- We expect an unguessable id to be adequate protection for an unlisted
  document because the presenter lists nothing and enumerates nothing, and
  a wrong address renders the same empty shell as no address at all, so
  the link is the only route to the document and guessing it is the only
  attack (05-internals.md, section 9). The claim rests on a length
  03-evidence.md leaves open, which is what makes it falsifiable rather
  than assumed.
- We expect the failure path to be reportable rather than silent because
  publishing is a build, a commit, and a push, each of which either
  completes or does not: nothing is half-deployed, because the site is
  whatever the last successful push left in the repository. Falsifiable:
  pull the network mid-publish and compare the deployed site with what it
  served before.
- We expect a stable link with versions beneath it to serve a talk better
  than a fresh link each time because the alternative was considered and
  its cost measured: a new hash on every publish means the link sent last
  week goes stale, and the price of the choice is that the stable link is
  a standing secret (03-evidence.md, trade-offs taken).

## Scope Conditions

- Platform: the desktop app on macOS, Tauri 2 around the system web view. <!-- cond: cond-2609051353432330 -->
  Readers open the link in current Safari and Chromium engines at
  desktop, iPad, and iPhone widths — 1280, 820, and 390 CSS px.
- Population: Alice publishes; Bob and Carol only ever hold a link. One <!-- cond: cond-2609051353437737 -->
  author and one machine — concurrent publishing from two devices is out
  of scope for the product (06-delivery.md).
- Assumptions: git is configured on Alice's machine, the production <!-- cond: cond-2609051353437846 -->
  repository exists and is private, and the static host deploys it.
  Editor stores no token of its own.
- In scope: one document, one variant — the document's default — <!-- cond: cond-2609051353437094 -->
  published unlisted; the stable id minted at first publish; the version
  hash beneath it; the link handed back to Alice; and the guarantee that
  the presenter shows nothing without an id.
- Bundle: this intent is a member of the Publish bundle, whose other <!-- cond: cond-2609051353438316 -->
  member is map #8, itd-2609051335479329. They share one spec, because a
  link Alice cannot find again is not yet a link.
- Boundary with map #8 (itd-2609051335479329) and map #28, <!-- cond: cond-2609051353434718 -->
  itd-2609051402150739 (Take a document off the site): this intent mints a
  version and its links. The record of every version minted, and finding
  an old one months later, belong to #8; taking the whole document off the
  site again belongs to #28.
- Boundary with map #19 (itd-2609051335598083): this intent publishes one <!-- cond: cond-2609051353433511 -->
  variant — the document's default — and hands Alice the one stable link
  that serves it. The document's id alone is not that link and shows the
  empty shell. Every further per-variant link under the same id, the
  unguessable path token each variant is given, and the rule that no page
  reveals another variant exists, belong to #19.
- Boundary with map #20 (itd-2609051336005698): this intent owns unlisted <!-- cond: cond-2609051353434181 -->
  and the empty presenter. The access policy, the allow-list Alice edits,
  and the sign-in Bob meets belong to #20.
- Boundary with map #21 (itd-2609051336019782): this intent stops at <!-- cond: cond-2609051353435641 -->
  pushed and deployed. The PDF the pipeline renders on the same push, and
  its place beside the version, belong to #21.
- Excluded as plumbing: the pipeline, the site's path layout, and git <!-- cond: cond-2609051353431967 -->
  mechanics (05-internals.md, sections 8 and 9).

## Acceptance Criteria

- Given a document folder that has never been published, when Alice
  presses Publish and confirms unlisted, then Editor mints a stable id,
  writes it into the document's metadata, commits the built output under
  that id in the production repository, and pushes.
- Given that publish has completed, when Editor reports it done, then
  Alice is shown one stable link with a copy action, and opening it in a
  browser serves the document she just published.
- Given a document already published once, when Alice edits one line and
  publishes again, then the same stable link serves the new content, so
  the link she sent before the edit is the link that shows the
  correction.
- Given the presenter opened at its root with no id, at an id that has
  never been published, or at the document's id with nothing beneath it,
  then each of the three renders the same empty shell — no document, no
  title, no list — and the shell a wrong address reaches is the shell the
  presenter shows with no id at all. (Negative case.)
- Given an unlisted document that has been published, when the deployed
  site is crawled from its root, then no page links to, lists, or
  enumerates the document's path.
- Given Alice is choosing between unlisted and gated, when the publish
  panel shows the choice, then it states in words that an unlisted
  document is not a private one — that anyone holding the link can read
  it, and that a link once sent cannot be recalled — and it states this
  every publish rather than once.
- Given the push cannot complete — the network is unreachable, or the
  remote refuses it — when Alice presses Publish, then Editor reports the
  failure with its reason, the site still serves exactly what it served
  before, and the document folder is byte for byte what it was apart from
  anything the publish had already recorded. (Negative case.)
- Given the app open with a document loaded, when a full editing session
  is observed at the network layer and Publish is never pressed, then no
  request leaves the machine.
- Given Bob opens the stable link at iPhone width (390 CSS px), at iPad
  width (820 CSS px), and at desktop width (1280 CSS px), then the
  published document is legible at every one of the three widths with no
  horizontal scrolling and no pinch zoom.
- Inherits: network only on publish (`itd-2609051336158553`); no machine
  in the document (`itd-2609051336080960`); one source, always
  (`itd-2609051336090390`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; and, from phase
  3 where it binds, variant fidelity (`itd-2609051336107315`), which
  governs what a published path may reveal about the variants beside it.

## Open Questions

- The length of the stable id and of the version hash, which is the whole
  of an unlisted document's protection (03-evidence.md, "Publish and
  pipeline").
- Confirmation that Editor pushes with the author's existing git setup and
  holds no token of its own (03-evidence.md, "Publish and pipeline").
- Confirmation that the presenter and the renderers are maintained once in
  the production repository and shared by every document, rather than
  copied into each published version (03-evidence.md, "Publish and
  pipeline").
- How long the host takes to deploy a push, and therefore whether Editor
  reports a publish done when the push lands or when the link answers.
  The moment matters at a lectern twenty minutes before a talk.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-c553924fd8bc -->
Fidelity review — receipt rcp-c553924fd8bc (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:042723d58c101823dac65ffb0c428c54199190cd10ec185107d76cc6aeeb599c · prompt_hash sha256:2f0358b0bb575be96ec5f8726cd722c08e94abb80484debf967afba4fe9674d9
Input attestations: diff:e41596a^..HEAD (1327728)@sha256:6343ab4e968dd2ce947b393ad874bb85af80f3bbb074f2d20e2e98bfd2353d7e; checklist:.abcd/.work.local/logs/acceptance/spc-2609051353438810.md@-;

Acceptance rollup: MET 2 · MET_WITH_CONCERNS 7 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET_WITH_CONCERNS: run_publish mints a 26-char base32 id and token, appends only id:/variant_tokens: lines to document.yaml, commits 'publish < id> < hash>' over the written paths and runs 'push origin HEAD:main' - all proven against a fake git only; no real push has been made (M1 rows unticked)
  evidence: src-tauri/src/publish/mod.rs:284 — "pub fn mint_identity("
  evidence: src-tauri/src/publish/mod.rs:572 — "let message = format!("publish {} {}", names.id, staged.hash);"
  evidence: src-tauri/src/publish/git.rs:194 — "self.run(repo, &["push", remote, &refspec])"
  evidence: src-tauri/src/publish/tests.rs:177 — "fn document_yaml_gains_only_the_identity_lines()"
  evidence: src-tauri/src/publish/tests.rs:244 — "assert!(push.ends_with("push origin HEAD:main"), "{push}");"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:16 — "- [ ] Publish a document that has never been published."
- ac-2 — MET_WITH_CONCERNS: the panel shows the stable deck link, the stable article link and the version link, each with Copy and Open, and the shipped presenter.js resolves /< id>/< token>/ to v/< hash>/ - but the panel offers three links rather than 'one stable link', 'done' is reported when the push lands with a five-minute watch after, and that a browser actually serves the document rests on M1, unticked
  evidence: src/publish-panel.ts:251 — "linkRow("Deck", outcome.deck_link), linkRow("Article", outcome.stable_link), linkRow("This version", outcome.version_link)"
  evidence: src/publish-panel.test.ts:229 — "shows_the_stable_link_with_a_copy_action, the deck first"
  evidence: src/site/presenter.test.ts:89 — "a_stable_link_resolves_to_the_latest_version"
  evidence: src-tauri/src/publish/tests.rs:248 — "fn publish_writes_the_site_the_presenter_expects()"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:19 — "- [ ] Send the deck link to yourself; open it on a machine that is not this one"
- ac-3 — MET: a second publish reuses the minted id and token, writes a new version folder, rewrites only latest.json to the new hash and leaves the old version's bytes untouched; the shipped presenter follows whatever hash latest.json names, so the link sent before the edit resolves to the corrected version
  evidence: src-tauri/src/publish/tests.rs:274 — "fn republish_moves_latest_and_leaves_the_old_version()"
  evidence: src-tauri/src/publish/tests.rs:202 — "fn a_second_publish_reuses_the_names_it_minted()"
  evidence: src-tauri/src/publish/stage.rs:264 — "Write `latest.json`, the one file a publish rewrites beneath a token."
  evidence: src/site/presenter.test.ts:101 — "a_stable_link_follows_latest_json"
- ac-4 — MET_WITH_CONCERNS: site/index.html and site/404.html are byte-identical (cmp confirmed), the stable-link shells are copies of the same SHELL constant, the shell carries no link, list or heading, and presenter.js fetches nothing at the root, a bare id or a malformed segment - but an id never published has no file of its own, so it reaches the identical shell only through the host serving 404.html, which M2 leaves unticked
  evidence: site/index.html:12 — "< main class="shell">< span class="mark" aria-hidden="true">·< /span>< /main>"
  evidence: src/site/presenter.test.ts:153 — "the_shell_is_identical_at_the_root_a_wrong_id_and_a_bare_id"
  evidence: src-tauri/src/publish/stage.rs:721 — "fn shell_copies_are_byte_identical()"
  evidence: site/presenter/presenter.js:36 — "if (segments.length !== 2 && segments.length !== 3) { return null; }"
  evidence: src/site/presenter.test.ts:115 — "makes no request for an address outside the grammar"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:25 — "- [ ] Open the site's root with a wrong id, and again with the bare id. All three pages are identical."
- ac-5 — MET_WITH_CONCERNS: the shell has no < a>, < ul>/< ol>/< li> or < h1>, robots.txt disallows everything, _headers sets noindex/nofollow and no-referrer, verify-site.mjs refuses any root entry outside the reserved names, and built pages name no absolute URL - static proof only; the crawl of a deployed site (M2) is unticked and the Referrer-Policy/X-Robots-Tag headers have not been observed from a host
  evidence: src/site/presenter.test.ts:158 — "the_shell_carries_no_link_and_no_list"
  evidence: site/robots.txt:2 — "Disallow: /"
  evidence: site/_headers:2 — "Referrer-Policy: no-referrer"
  evidence: tools/verify-site.mjs:65 — "fail(`no_root_entry_outside_the_reserved_names: ${entry}`);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:26 — "- [ ] Crawl the deployed site from its root"
- ac-6 — MET: the panel places UNLISTED_SENTENCE beside the Unlisted/Gated radio group behind no disclosure, rebuilds its contents on every open, and tests hold that the sentence is present on the first open and again on the second
  evidence: src/publish-panel.ts:20 — ""Unlisted is not private: anyone holding the link can read it, and a link once sent cannot be recalled.""
  evidence: src/publish-panel.ts:461 — "// Beside the choice and behind no disclosure."
  evidence: src/publish-panel.ts:513 — "element.replaceChildren();"
  evidence: src/publish-panel.test.ts:104 — "states_that_unlisted_is_not_private"
  evidence: src/publish-panel.test.ts:114 — "states_it_again_on_the_second_open"
- ac-7 — MET_WITH_CONCERNS: a failed push returns outcome.failure with git's stderr sentence, the panel names the failing step and says the site still serves what it served before, no reset runs, the earlier version folder is unchanged, no log entry is appended and document.yaml gains only the identity lines - proven with a fake git that exits 128, not with the network off; the failure-path rows are unticked
  evidence: src-tauri/src/publish/mod.rs:604 — "return Ok(fail(outcome, "push", pushed.reason()));"
  evidence: src-tauri/src/publish/tests.rs:345 — "fn a_failed_push_names_the_step_and_the_reason()"
  evidence: src-tauri/src/publish/tests.rs:372 — "fn a_failed_push_leaves_the_deployed_paths_untouched()"
  evidence: src-tauri/src/publish/tests.rs:393 — "fn a_failed_push_leaves_the_document_folder_but_for_the_id()"
  evidence: src/publish-panel.ts:232 — "The commit is on this machine and the site still serves what it served before."
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:43 — "- [ ] Turn the network off and press Publish."
- ac-8 — MET_WITH_CONCERNS: the only HTTP client is ureq in publish/mod.rs, check_deploy is refused unless a publish opened the window on that hash, a Rust test drives preflight/publish/dry-run/log against a listening socket that hears nothing, the panel test opens and closes without fetch, the Tauri CSP limits connect-src to self and ipc, and no non-test frontend source names fetch or an http URL - but this is test-level and source-level evidence, not a network-layer capture of a real editing session (M3 unticked)
  evidence: src-tauri/src/publish/tests.rs:641 — "fn an_editing_session_makes_no_request()"
  evidence: src-tauri/src/publish/tests.rs:687 — "fn no_network_outside_publish()"
  evidence: src-tauri/src/publish/mod.rs:163 — "pub fn guard_deploy_check(watch: &PublishInProgress, expected_hash: &str)"
  evidence: src/publish-panel.test.ts:421 — "an_editing_session_makes_no_request"
  evidence: src-tauri/tauri.conf.json:26 — "connect-src 'self' ipc: http://ipc.localhost"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:31 — "- [ ] Start a network capture"
- ac-9 — INCONCLUSIVE: the only automated evidence is static - built pages declare the viewport, no fixed px width, the article column is 38em max with img max-width 100% and tables overflow-x auto, the deck font is a clamp - and the legibility test itself states jsdom performs no layout and the measurement is the manual check; every M4 row at 390, 820 and 1280 CSS px is unticked, so legibility without horizontal scroll or pinch zoom cannot be verified from the inputs
  evidence: src/publish/build.test.ts:80 — "built_pages_declare_the_viewport_and_no_fixed_width"
  evidence: site/presenter/article.css:20 — "max-width: 38em;"
  evidence: src/core/render/legibility.test.ts:4 — "jsdom performs no layout"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:37 — "- [ ] Open the published article at 390, 820 and 1280 CSS px in Safari."
- ac-10 — MET_WITH_CONCERNS: network only on publish, no machine in the document and one source are each held by a named test (socket test and ureq scan; document.yaml gains only identity lines and the log names no machine; chrome and engine copied once to the site root, document.yaml read through one reader); variant fidelity is held by latest_json_names_no_variant and is not yet binding; the legible-on-three-device-classes discipline rests on static checks and the unticked M4 rows, so it is inherited on paper only
  evidence: src-tauri/src/publish/tests.rs:196 — "for forbidden in ["/Users/", "/var/", "/tmp", "origin", "example.invalid"]"
  evidence: src-tauri/src/publish/tests.rs:602 — "fn the_log_entry_carries_the_links_and_no_machine()"
  evidence: src-tauri/src/publish/stage.rs:91 — "pub const CHROME: [(&str, &str); 9] = ["
  evidence: src-tauri/src/publish/stage.rs:750 — "fn latest_json_names_no_variant()"
  evidence: src-tauri/src/metadata.rs:64 — "pub fn read_metadata(path: &Path) -> Result< DocumentMetadata, String>"
  evidence: src/core/render/legibility.test.ts:11 — "The measurement itself is the manual check at 390, 820 and 1280 CSS px"

Gap audit:
- honoured:
  - one action builds, commits under the document's id, pushes, and hands back a link
    evidence: src-tauri/src/publish/mod.rs:427 — "pub fn run_publish("
    evidence: src-tauri/src/publish/tests.rs:161 — "fn first_publish_mints_an_id_and_token()"
  - the same link shows the correction after a republish
    evidence: src-tauri/src/publish/tests.rs:274 — "fn republish_moves_latest_and_leaves_the_old_version()"
  - Carol at the site's address without an id meets an empty page: no document, no index, no list
    evidence: src/site/presenter.test.ts:158 — "the_shell_carries_no_link_and_no_list"
    evidence: site/404.html:12 — "< main class="shell">"
  - Editor says plainly what unlisted means, every publish
    evidence: src/publish-panel.test.ts:114 — "states_it_again_on_the_second_open"
  - the app has not touched the network until Publish is pressed
    evidence: src-tauri/src/publish/tests.rs:641 — "fn an_editing_session_makes_no_request()"
  - publishing leaves through Alice's own git; Editor keeps no account and no token
    evidence: src-tauri/src/publish/git.rs:85 — "let mut command = Command::new(&self.program);"
    evidence: src-tauri/src/settings.rs:24 — "pub struct PublishTarget {"
    evidence: .github/workflows/publish.yml:6 — "No secret, no token and no `secrets.*` reference appears in this file."
  - the failure path is reported with its reason and nothing is half-deployed
    evidence: src-tauri/src/publish/tests.rs:372 — "fn a_failed_push_leaves_the_deployed_paths_untouched()"
- diverged:
  - Editor hands her one link
    evidence: src/publish-panel.ts:251 — "linkRow("Deck", outcome.deck_link), linkRow("Article", outcome.stable_link), linkRow("This version", outcome.version_link)"
  - gated is a choice shown but not writable in phase 1 (spec section 8 refuses flag gated, section 9 shows it disabled); delivered accepts and records gated and serves it as unlisted
    evidence: src-tauri/src/publish/mod.rs:433 — "if request.flag != "unlisted" && request.flag != "gated" {"
    evidence: src/publish-panel.ts:25 — "Gated is recorded in the publish log and not enforced in phase 1"
  - Editor reports done when the link answers (spec section 8); delivered reports the steps done at the push and then watches the link for five minutes with a Stop button
    evidence: src/publish-panel.ts:133 — "const DEFAULT_POLL: PollOptions = { intervalMs: 3000, limitMs: 5 * 60 * 1000 };"
    evidence: src/publish-panel.ts:284 — "The site has not answered yet. The link is yours to use as soon as it does."
  - the dry run mints the id and token on disk (spec section 8); delivered mints in memory and writes nothing
    evidence: src-tauri/src/publish/mod.rs:319 — "if minted && !dry_run {"
    evidence: src-tauri/src/publish/tests.rs:494 — "fn dry_run_leaves_no_trace()"
  - the panel opens on C-c C-p (spec section 9); delivered binds C-c C-l because C-c C-p is Present
    evidence: src/keys.ts:735 — "chords: ["C-c C-l"],"
    evidence: src/keys.ts:728 — "chords: ["C-c C-p"],"
- missing:
  - proof that the link opens on the machine at the lectern: a real push to a real host from this app
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:19 — "- [ ] Send the deck link to yourself; open it on a machine that is not this one; the talk is on the screen."
  - proof that Bob reads it at his own size with nothing sliding off the side at 390, 820 and 1280 CSS px
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:37 — "- [ ] Open the published article at 390, 820 and 1280 CSS px in Safari. No horizontal scrolling, no pinch zoom needed."
  - proof that a crawl of the deployed site from its root reaches no document
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:26 — "- [ ] Crawl the deployed site from its root"
  - a network-layer observation of an editing session
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:31 — "- [ ] Start a network capture (Little Snitch, `tcpdump`, or the shell's own log) and open the app."
  - verification that the pinned actions/checkout SHA matches v4.2.2
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:12 — "- [ ] The pinned SHA for `actions/checkout` in `.github/workflows/publish.yml` matches the tag named in the comment beside it"

Scope-condition dispositions:
- cond-2609051353432330 — narrowed: the desktop half holds - Tauri 2.11 around the system web view, minted with getrandom on this macOS build, window minimum 390 px - while the reader half, Safari and Chromium at 1280, 820 and 390 CSS px, was never exercised (every M4 row unticked)
  narrowing: holds for the macOS Tauri 2 desktop app; the reader-engine claim at the three widths is unexercised
  evidence: src-tauri/Cargo.toml:23 — "tauri = { version = "2.11.3", features = [] }"
  evidence: src-tauri/tauri.conf.json:18 — ""minWidth": 390,"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353438810.md:37 — "- [ ] Open the published article at 390, 820 and 1280 CSS px in Safari."
- cond-2609051353437737 — survived: one author on one machine is what the delivery builds for: the held-commit logic reads this machine's remote-tracking ref and a non-fast-forward from another device is reported as a push failure, not resolved
  evidence: src-tauri/src/publish/git.rs:172 — "pub fn is_ahead(&self, repo: &Path, remote: &str, branch: &str)"
  evidence: src-tauri/src/publish/mod.rs:587 — "A publish whose push failed left a commit behind; the retry writes nothing new"
- cond-2609051353437846 — survived: the delivery assumes the author's git and holds no token: git is shelled out with the author's own configuration, the settings carry repository, remote, branch, base URL and site dir and nothing else, preflight refuses a missing or detached repository, and the workflow names no secret
  evidence: src-tauri/src/publish/git.rs:71 — "pub fn new() -> Self { Self { program: OsString::from("git"), } }"
  evidence: src-tauri/src/settings.rs:24 — "pub struct PublishTarget {"
  evidence: src-tauri/src/publish/mod.rs:238 — "fn repository_check(context: &PublishContext) -> (bool, bool, Vec< String>)"
  evidence: .github/workflows/publish.yml:20 — "permissions: contents: read"
- cond-2609051353437094 — survived: the panel publishes the document's default variant only, the id and token are minted at first publish and reused after, the version hash sits beneath the token, the links are handed back, and the presenter shows the shell without an id
  evidence: src/publish/services.ts:103 — "const variant = metadata.default_variant ?? metadata.variants[0] ?? "";"
  evidence: src-tauri/src/publish/tests.rs:202 — "fn a_second_publish_reuses_the_names_it_minted()"
  evidence: src/site/presenter.test.ts:73 — "routes nothing at the root, at a bare id, or at a version path"
- cond-2609051353438316 — falsified: the condition assumed the two Publish bundle members share one spec; the delivery carries two closed specs, spc-2609051353438810 for this intent and spc-2609051353457083 for itd-2609051335479329, and the intent record is kind standalone
  evidence: .abcd/development/specs/closed/spc-2609051353438810-publish-and-get-a-link-i-can-open-from-the-lectern.md:19 — "the record of what was published belongs to spc-2609051353457083, written against this design"
  evidence: .abcd/development/specs/closed/spc-2609051353457083-find-the-version-bob-read-in-march.md:12 — "This spec delivers the record half of the Publish bundle for itd-2609051335479329"
  evidence: .abcd/development/intents/shipped/itd-2609051335468596-publish-and-get-a-link-i-can-open-from-the-lectern.md:5 — "kind: standalone"
- cond-2609051353434718 — survived: the version and its links are minted here; the publish log that records every version is attributed to the sibling spec in the same delivery, and nothing takes a document off the site
  evidence: src-tauri/src/publish/mod.rs:15 — "pub mod log;"
  evidence: .abcd/development/specs/closed/spc-2609051353438810-publish-and-get-a-link-i-can-open-from-the-lectern.md:19 — "the record of what was published belongs to spc-2609051353457083"
  evidence: src-tauri/src/lib.rs:288 — "publish::publish_preflight,"
- cond-2609051353433511 — survived: the panel publishes only the default variant and the bare id resolves to the shell; the Rust layer can already mint a token per declared variant, but no user-facing path or per-variant rule from #19 is surfaced
  evidence: src/publish/services.ts:103 — "const variant = metadata.default_variant ?? metadata.variants[0] ?? "";"
  evidence: site/presenter/presenter.js:36 — "if (segments.length !== 2 && segments.length !== 3) {"
  evidence: src-tauri/src/publish/tests.rs:460 — "fn a_flow_style_variant_tokens_gains_the_token_inside_its_braces()"
- cond-2609051353434181 — survived: no access policy, allow-list or sign-in is delivered; the workflow's access job is a stub owned by #20, and the gated choice is recorded without being enforced, which the panel says in words
  evidence: .github/workflows/publish.yml:72 — "access: name: apply the access policy (stub)"
  evidence: src/publish-panel.ts:25 — "Gated is recorded in the publish log and not enforced in phase 1"
- cond-2609051353435641 — survived: the delivery stops at the push and the deploy poll; the PDF job in the workflow is a stub naming #21 as its owner
  evidence: .github/workflows/publish.yml:58 — "pdf: name: render the journal PDF (stub)"
  evidence: src-tauri/src/publish/mod.rs:667 — "pub fn check_deploy_at("
- cond-2609051353431967 — untested: an exclusion from the press release is not something a diff can exercise or contradict; the pipeline, the path layout and the git mechanics are delivered (stage.rs, git.rs, publish.yml) and no acceptance criterion names them
## Grounds

- pursued: one publish action through a git push to a private repository deployed by Cloudflare Pages yields a link that works from a lectern; wrong if deploy latency or credentials make the first publish unreliable
