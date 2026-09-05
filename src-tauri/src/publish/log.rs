//! `publish-log.json`: one entry per publish, in the document folder.
//!
//! The log is Alice's record, not the app's: a plain file beside the chapters,
//! readable in any text editor, naming nothing about the machine it was
//! written on. It grows with every publish while `document.yaml` does not,
//! which is why it is a sibling file (05-internals.md §10).
//!
//! An entry means a version reached the site, so it is written after the push
//! has succeeded and never before. Entries are stored oldest first, so a
//! publish appends one object and the file's diff is that object; the reader
//! hands them back newest first.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

/// The file, in the document folder.
pub const LOG_FILE: &str = "publish-log.json";

/// The links one variant's entry carries.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntryLinks {
    pub stable: String,
    pub deck: String,
    pub version: String,
}

/// One publish.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PublishEntry {
    /// `publish` here; taking a document off the site adds `removal` later.
    pub action: String,
    /// RFC 3339, UTC, to the second. UTC rather than a local offset: an offset
    /// is a fact about where the author was.
    pub published: String,
    /// The version hash this publish landed on.
    pub hash: String,
    pub variants: Vec<String>,
    /// `unlisted` or `gated`, as the document went out at this publish.
    pub flag: String,
    /// False when this publish's content already had a version path.
    pub created_version: bool,
    /// The links, keyed by variant name.
    pub links: BTreeMap<String, EntryLinks>,
    /// When the app saw the link answering with this hash, during this
    /// publish. Written once and never rewritten; absent means the app was not
    /// watching, not that the version is missing.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seen_at_link: Option<String>,
}

/// The file's shape.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PublishLog {
    pub schema_version: u32,
    pub entries: Vec<PublishEntry>,
}

impl Default for PublishLog {
    fn default() -> Self {
        Self {
            schema_version: 1,
            entries: Vec::new(),
        }
    }
}

/// Where the log sits for one document root.
pub fn log_path(document_root: &Path) -> PathBuf {
    document_root.join(LOG_FILE)
}

/// Now, RFC 3339 in UTC, to the second.
pub fn now_stamp() -> Result<String, String> {
    stamp(OffsetDateTime::now_utc())
}

fn stamp(at: OffsetDateTime) -> Result<String, String> {
    at.replace_nanosecond(0)
        .map_err(|error| format!("cannot read the clock: {error}"))?
        .format(&Rfc3339)
        .map_err(|error| format!("cannot write the timestamp: {error}"))
}

/// Read the log.
///
/// A missing file is an empty log: a document that has never been published
/// has no record and that is not a failure. A file that will not parse is a
/// failure naming the file, and nothing overwrites it — the record is Alice's,
/// and a publish is not worth losing it for.
pub fn read_log(path: &Path) -> Result<PublishLog, String> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(PublishLog::default())
        }
        Err(error) => return Err(format!("cannot read {LOG_FILE}: {error}")),
    };
    if text.trim().is_empty() {
        return Ok(PublishLog::default());
    }
    serde_json::from_str(&text).map_err(|error| format!("cannot read {LOG_FILE}: {error}"))
}

/// Write the log whole, pretty-printed, through a temporary file beside it.
fn write_log(path: &Path, log: &PublishLog) -> Result<(), String> {
    let mut text = serde_json::to_string_pretty(log)
        .map_err(|error| format!("cannot write {LOG_FILE}: {error}"))?;
    text.push('\n');
    crate::document::write_chapter_text(path, &text)
}

/// Append one entry, oldest first.
///
/// Refuses on a log that will not parse rather than starting a new one.
pub fn append_entry(path: &Path, entry: PublishEntry) -> Result<PublishLog, String> {
    let mut log = read_log(path)?;
    log.entries.push(entry);
    write_log(path, &log)?;
    Ok(log)
}

/// The entries, newest first, as the panel and the command show them.
pub fn entries_newest_first(path: &Path) -> Result<Vec<PublishEntry>, String> {
    let mut entries = read_log(path)?.entries;
    entries.reverse();
    Ok(entries)
}

/// Record that the link answered with this hash, during this publish.
///
/// The newest entry naming the hash gains `seen_at_link`, once. An entry that
/// already carries one is left exactly as it was: it is the only value ever
/// added to an entry after it is written, and it is never rewritten.
pub fn record_seen_at_link(path: &Path, hash: &str, at: &str) -> Result<bool, String> {
    let mut log = read_log(path)?;
    let Some(entry) = log
        .entries
        .iter_mut()
        .rev()
        .find(|entry| entry.hash == hash)
    else {
        return Ok(false);
    };
    if entry.seen_at_link.is_some() {
        return Ok(false);
    }
    entry.seen_at_link = Some(at.to_string());
    write_log(path, &log)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn links() -> BTreeMap<String, EntryLinks> {
        let mut links = BTreeMap::new();
        links.insert(
            "talk".to_string(),
            EntryLinks {
                stable: "https://example.invalid/aaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbb/".to_string(),
                deck: "https://example.invalid/aaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbb/slides/".to_string(),
                version: "https://example.invalid/aaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbb/v/cccccccccccccccccccccccccc/".to_string(),
            },
        );
        links
    }

    fn entry(hash: &str, created: bool) -> PublishEntry {
        PublishEntry {
            action: "publish".to_string(),
            published: "2026-03-14T09:12:44Z".to_string(),
            hash: hash.to_string(),
            variants: vec!["talk".to_string()],
            flag: "unlisted".to_string(),
            created_version: created,
            links: links(),
            seen_at_link: None,
        }
    }

    #[test]
    fn log_starts_empty_and_a_missing_file_is_not_a_failure() {
        let dir = tempfile::tempdir().expect("temp dir");
        let log = read_log(&log_path(dir.path())).expect("no file is fine");
        assert_eq!(log, PublishLog::default());
    }

    #[test]
    fn log_is_append_only_and_oldest_first_on_disk() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = log_path(dir.path());
        append_entry(&path, entry("cccccccccccccccccccccccccc", true)).expect("first");
        let first = fs::read_to_string(&path).expect("read");
        append_entry(&path, entry("dddddddddddddddddddddddddd", true)).expect("second");
        let second = fs::read_to_string(&path).expect("read");
        // The first entry's own bytes are still there, unchanged, and the
        // second file is the first with one object added.
        let body = |text: &str| {
            let start = text.find("[\n").expect("entries") + 2;
            let end = text.rfind("\n  ]").expect("entries");
            text[start..end].to_string()
        };
        let first_body = body(&first);
        assert!(
            second.contains(&first_body),
            "the earlier entry was rewritten:\n{second}"
        );
        assert!(second.len() > first.len());
        let log = read_log(&path).expect("parses");
        assert_eq!(log.entries.len(), 2);
        assert_eq!(log.entries[0].hash, "cccccccccccccccccccccccccc");
    }

    #[test]
    fn read_publish_log_returns_newest_first() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = log_path(dir.path());
        append_entry(&path, entry("cccccccccccccccccccccccccc", true)).expect("first");
        append_entry(&path, entry("dddddddddddddddddddddddddd", true)).expect("second");
        let entries = entries_newest_first(&path).expect("read");
        assert_eq!(entries[0].hash, "dddddddddddddddddddddddddd");
        assert_eq!(entries[1].hash, "cccccccccccccccccccccccccc");
    }

    #[test]
    fn log_is_pretty_printed_and_reparses() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = log_path(dir.path());
        append_entry(&path, entry("cccccccccccccccccccccccccc", true)).expect("written");
        let text = fs::read_to_string(&path).expect("read");
        assert!(text.contains("\n  \"entries\": ["), "{text}");
        assert!(text.ends_with("\n"), "the file ends with a newline");
        assert!(
            text.contains("\"published\": \"2026-03-14T09:12:44Z\""),
            "{text}"
        );
        let reparsed: PublishLog = serde_json::from_str(&text).expect("reparses");
        assert_eq!(reparsed.entries.len(), 1);
    }

    #[test]
    fn log_entry_names_no_machine() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = log_path(dir.path());
        append_entry(&path, entry("cccccccccccccccccccccccccc", true)).expect("written");
        let text = fs::read_to_string(&path).expect("read");
        for forbidden in [
            "/Users/",
            "/home/",
            "/Volumes/",
            "C:\\",
            ".local",
            "@",
            "file://",
        ] {
            assert!(
                !text.contains(forbidden),
                "the log names the machine ({forbidden}):\n{text}"
            );
        }
        assert!(!text.contains(&dir.path().display().to_string()));
    }

    #[test]
    fn log_refuses_a_file_that_will_not_parse_and_leaves_it_alone() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = log_path(dir.path());
        fs::write(&path, "{ not json at all").expect("write");
        let message =
            append_entry(&path, entry("cccccccccccccccccccccccccc", true)).expect_err("refused");
        assert!(message.contains(LOG_FILE), "{message}");
        assert_eq!(
            fs::read_to_string(&path).expect("read"),
            "{ not json at all",
            "the author's file was overwritten"
        );
    }

    #[test]
    fn log_deploy_is_written_once_and_never_rewritten() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = log_path(dir.path());
        append_entry(&path, entry("cccccccccccccccccccccccccc", true)).expect("written");
        assert!(
            record_seen_at_link(&path, "cccccccccccccccccccccccccc", "2026-03-14T09:13:02Z")
                .expect("recorded")
        );
        assert!(
            !record_seen_at_link(&path, "cccccccccccccccccccccccccc", "2026-09-05T10:00:00Z")
                .expect("not recorded twice")
        );
        let entries = entries_newest_first(&path).expect("read");
        assert_eq!(
            entries[0].seen_at_link.as_deref(),
            Some("2026-03-14T09:13:02Z")
        );
    }

    #[test]
    fn log_deploy_touches_nothing_when_no_entry_names_the_hash() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = log_path(dir.path());
        append_entry(&path, entry("cccccccccccccccccccccccccc", true)).expect("written");
        let before = fs::read_to_string(&path).expect("read");
        assert!(
            !record_seen_at_link(&path, "eeeeeeeeeeeeeeeeeeeeeeeeee", "2026-03-14T09:13:02Z")
                .expect("nothing to record")
        );
        assert_eq!(fs::read_to_string(&path).expect("read"), before);
    }

    #[test]
    fn log_stamps_in_utc_to_the_second() {
        let now = now_stamp().expect("a stamp");
        assert!(now.ends_with('Z'), "{now}");
        assert_eq!(now.len(), 20, "{now}");
        assert!(!now.contains('+'), "{now}");
    }
}
