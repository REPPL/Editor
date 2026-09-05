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
---

The changelog and launch ship verbs read .claude-plugin/plugin.json unconditionally and refuse in an application repository, so the release cut had to be composed by the release agent and written by hand; the launch dry run's lockstep, retention, and installability gates are plugin-shaped and read as failures here
