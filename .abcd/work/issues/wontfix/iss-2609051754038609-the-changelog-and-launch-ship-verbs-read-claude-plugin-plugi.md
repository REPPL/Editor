---
schema_version: 1
id: "iss-2609051754038609"
slug: "the-changelog-and-launch-ship-verbs-read-claude-plugin-plugi"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "release-cut"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "CHANGELOG.md"
wontfix_reason: "Not this repository's code: the finding is about the abcd binary and its bundled plugin skills, which this application repository consumes and does not contain. It is recorded here because this repository is where it was met, and the working practice it names — hand-laying decision records in the documented id shape, one spec per bundle member, composing a release cut by hand where the plugin-shaped gates refuse in an application repo, and stamping a rubric and prompt hash on an audit request — is what this repository actually does in its place. Carrying it further belongs to the tool, not here"
---

The changelog and launch ship verbs read .claude-plugin/plugin.json unconditionally and refuse in an application repository, so the release cut had to be composed by the release agent and written by hand; the launch dry run's lockstep, retention, and installability gates are plugin-shaped and read as failures here

## Grounds

- declined: an observation about a dependency's behaviour cannot be fixed in the repository that met it, and the workaround it describes is already this repository's practice; wrong if a later abcd release changes one of these behaviours and this repository's hand-laid records then diverge from what the binary expects, which is a fresh finding rather than this one reopened
