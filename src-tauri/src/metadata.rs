//! `document.yaml`: what belongs to the whole document.
//!
//! One reader, one struct. `05-internals.md` section 1 says everything
//! belonging to the whole document lives in `document.yaml` and nowhere else,
//! so every command that wants the title, the variants, or the asset threshold
//! reads it through [`read_metadata`] rather than parsing the file again.
//!
//! Unknown keys are kept out of the struct and left on disk untouched: a
//! document written by a later version of Editor, or by hand, still opens.
//! Every field is optional, because a folder is a document as soon as it holds
//! chapters and `document.yaml` is what the author has written down so far.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

/// The file, at the document root, that carries document-level metadata.
pub const METADATA_FILE: &str = "document.yaml";

/// Everything `document.yaml` may say about the document as a whole.
///
/// The field list is the brief's: `05-internals.md` section 1 for the file
/// itself, section 9 for the stable id and the per-variant path tokens.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct DocumentMetadata {
    /// The stable id, minted on first publish. Absent until then.
    pub id: Option<String>,
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub author: Option<String>,
    pub affiliation: Option<String>,
    /// Written `abstract` in the file, which is a Rust keyword here.
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,
    pub theme: Option<String>,
    /// The variant names the document declares. A name not in this list is not
    /// a variant, however a chapter spells it.
    pub variants: Vec<String>,
    pub default_variant: Option<String>,
    /// The unguessable path token for each variant, minted with the id. Empty
    /// until the document is published.
    pub variant_tokens: BTreeMap<String, String>,
    /// The bibliography file, named relative to the document root.
    pub bibliography: Option<String>,
    pub citation_style: Option<String>,
    /// The size above which a dropped asset is referenced rather than copied.
    pub asset_threshold_bytes: Option<u64>,
    /// The column `fill-paragraph` wraps prose at. Absent means the default 80.
    pub fill_column: Option<u32>,
    /// Whether the file exists at all. A folder with chapters and no
    /// `document.yaml` is still a document; saying so is not the same as
    /// claiming an empty title.
    #[serde(skip_deserializing)]
    pub present: bool,
}

/// Read `document.yaml` from a document root.
///
/// A missing file is not a failure: the metadata comes back empty with
/// `present` false. A file that exists and cannot be read or parsed is a
/// failure, named, because guessing would put a title on screen that the
/// author never wrote.
pub fn read_metadata(path: &Path) -> Result<DocumentMetadata, String> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(DocumentMetadata::default())
        }
        Err(error) => return Err(format!("cannot read {METADATA_FILE}: {error}")),
    };
    parse_metadata(&text)
}

/// Read the bibliography file `document.yaml` names, if it names one.
///
/// `Ok(None)` for a document that names no bibliography at all — an ordinary
/// document, not a failure (itd-2609051335502171's own Assumption). A file
/// the document *does* name but that cannot be read is a failure, named,
/// because a typo in that one line of metadata is a fact the author needs to
/// see rather than a silently empty reference list.
pub fn read_bibliography(root: &Path) -> Result<Option<String>, String> {
    let metadata = read_metadata(&root.join(METADATA_FILE))?;
    let Some(name) = metadata.bibliography else {
        return Ok(None);
    };
    let path = crate::document::confine_path(root, &name)?;
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|error| format!("cannot read {name}: {error}"))
}

/// Parse the text of a `document.yaml`.
///
/// An empty file parses to empty metadata: YAML reads it as null, which serde
/// refuses for a struct, and an author who has created the file but written
/// nothing in it has not made a mistake.
pub fn parse_metadata(text: &str) -> Result<DocumentMetadata, String> {
    if text.trim().is_empty() {
        return Ok(DocumentMetadata {
            present: true,
            ..DocumentMetadata::default()
        });
    }
    let mut metadata: DocumentMetadata = serde_yaml_ng::from_str(text)
        .map_err(|error| format!("cannot read {METADATA_FILE}: {error}"))?;
    metadata.present = true;
    Ok(metadata)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A synthetic `document.yaml`, close in shape to a talk deck: a title,
    /// an affiliation, a theme, and a single variant. Invented content, not a
    /// copy of any real document — see iss-2609061418065651.
    const TALK_METADATA: &str = "title: The Lantern Papers
subtitle: A Talk in One Sitting
author: Alice
affiliation: Royal Holloway Business School
theme: plenary
variants: [talk]
default_variant: talk
asset_threshold_bytes: 8388608
";

    /// A synthetic `document.yaml` for a paper, with a folded block-scalar
    /// abstract, a bibliography and a numeric citation style.
    ///
    /// Written with real embedded newlines rather than `\n\` continuations:
    /// a backslash-newline in a Rust string literal strips the following
    /// line's leading whitespace along with the newline, which would have
    /// flattened the block scalar's indentation and broken the YAML.
    const PAPER_METADATA: &str = "title: Notes from the Lantern
subtitle: On Reading Slowly
author: Alice
abstract: |
  Bob and Carol read the same chapter on different evenings and compare
  what they underlined. This paper asks what the difference says about
  attention, and it reports nothing in particular.
variants: [full]
default_variant: full
bibliography: references.bib
citation_style: numeric
";

    #[test]
    fn reads_talk_metadata() {
        let metadata = parse_metadata(TALK_METADATA).expect("parses");
        assert!(metadata.present);
        assert_eq!(metadata.title.as_deref(), Some("The Lantern Papers"));
        assert_eq!(metadata.subtitle.as_deref(), Some("A Talk in One Sitting"));
        assert_eq!(metadata.author.as_deref(), Some("Alice"));
        assert_eq!(
            metadata.affiliation.as_deref(),
            Some("Royal Holloway Business School")
        );
        assert_eq!(metadata.theme.as_deref(), Some("plenary"));
        assert_eq!(metadata.variants, vec!["talk".to_string()]);
        assert_eq!(metadata.default_variant.as_deref(), Some("talk"));
        assert_eq!(metadata.asset_threshold_bytes, Some(8_388_608));
        // Nothing has been published, so there is no id and no variant token.
        assert_eq!(metadata.id, None);
        assert!(metadata.variant_tokens.is_empty());
        assert_eq!(metadata.bibliography, None);
    }

    #[test]
    fn reads_a_block_scalar_abstract() {
        let metadata = parse_metadata(PAPER_METADATA).expect("parses");
        let abstract_text = metadata.abstract_text.expect("the paper carries one");
        assert!(
            abstract_text.starts_with("Bob and Carol read the same chapter"),
            "the block scalar is folded into one string: {abstract_text}"
        );
        assert!(abstract_text.ends_with("nothing in particular.\n"));
        assert!(
            !abstract_text.contains('|'),
            "the block scalar marker is not part of the value"
        );
        assert_eq!(metadata.bibliography.as_deref(), Some("references.bib"));
        assert_eq!(metadata.citation_style.as_deref(), Some("numeric"));
        assert_eq!(metadata.variants, vec!["full".to_string()]);
        assert_eq!(metadata.affiliation, None);
    }

    #[test]
    fn reads_a_second_documents_metadata() {
        let metadata = parse_metadata(
            "title: Reading Aloud\nsubtitle: A Shorter Sitting\ncitation_style: author-date\n",
        )
        .expect("parses");
        assert_eq!(metadata.title.as_deref(), Some("Reading Aloud"));
        assert_eq!(metadata.subtitle.as_deref(), Some("A Shorter Sitting"));
        assert_eq!(metadata.citation_style.as_deref(), Some("author-date"));
        assert_eq!(metadata.theme, None);
        assert_eq!(metadata.abstract_text, None);
    }

    #[test]
    fn reads_the_stable_id_and_the_variant_tokens() {
        let metadata = parse_metadata(
            "id: 7f3a91c2e4d85b06\nvariants: [full, talk]\nvariant_tokens:\n  full: abc\n  talk: def\n",
        )
        .expect("parses");
        assert_eq!(metadata.id.as_deref(), Some("7f3a91c2e4d85b06"));
        assert_eq!(
            metadata.variant_tokens.get("talk").map(String::as_str),
            Some("def")
        );
    }

    #[test]
    fn reads_the_fill_column_a_document_states() {
        let metadata =
            parse_metadata("title: The Lantern Papers\nfill_column: 72\n").expect("parses");
        assert_eq!(metadata.fill_column, Some(72));
    }

    #[test]
    fn leaves_the_fill_column_absent_when_the_document_says_nothing() {
        // Absent, not zero: the default belongs to the command that fills, so
        // a document that states nothing must be distinguishable from one that
        // states a column.
        let metadata = parse_metadata(PAPER_METADATA).expect("parses");
        assert_eq!(metadata.fill_column, None);
        assert_eq!(DocumentMetadata::default().fill_column, None);
    }

    #[test]
    fn keeps_a_key_it_does_not_know() {
        let metadata =
            parse_metadata("title: The Lantern Papers\nlantern_count: 3\n").expect("parses");
        assert_eq!(metadata.title.as_deref(), Some("The Lantern Papers"));
        assert!(metadata.present);
    }

    #[test]
    fn reports_a_missing_file_as_absent_rather_than_as_a_failure() {
        let root = tempfile::tempdir().expect("temp dir");
        let metadata = read_metadata(&root.path().join(METADATA_FILE)).expect("no file is fine");
        assert!(!metadata.present);
        assert_eq!(metadata, DocumentMetadata::default());
    }

    #[test]
    fn reads_an_empty_file_as_empty_metadata() {
        let metadata = parse_metadata("\n\n").expect("parses");
        assert!(metadata.present);
        assert_eq!(metadata.title, None);
    }

    #[test]
    fn refuses_a_file_that_is_not_yaml() {
        let message = parse_metadata("title: [unclosed\n").expect_err("a broken file is named");
        assert!(message.contains(METADATA_FILE), "{message}");
    }

    /// A synthetic `.bib` file, invented for this test alone.
    const BIB: &str = "@article{carroll1999, author = {Carroll, Carol}, year = {1999}}";

    /// A minimal `document.yaml` naming a bibliography, on one line so a test
    /// of [`read_bibliography`] does not also depend on the block-scalar
    /// abstract `PAPER_METADATA` carries (iss-2609061437127301).
    const NAMES_A_BIBLIOGRAPHY: &str = "title: A Paper\nbibliography: references.bib\n";

    #[test]
    fn reads_the_bibliography_a_document_names() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = crate::document::canonical_root(&root.path().to_string_lossy()).expect("root");
        fs::write(base.join(METADATA_FILE), NAMES_A_BIBLIOGRAPHY).expect("wrote document.yaml");
        fs::write(base.join("references.bib"), BIB).expect("wrote the bibliography");
        let text = read_bibliography(&base)
            .expect("reads")
            .expect("the document names one");
        assert_eq!(text, BIB);
    }

    #[test]
    fn reports_no_bibliography_for_a_document_that_names_none() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = crate::document::canonical_root(&root.path().to_string_lossy()).expect("root");
        fs::write(base.join(METADATA_FILE), TALK_METADATA).expect("wrote document.yaml");
        assert_eq!(read_bibliography(&base).expect("reads"), None);
    }

    #[test]
    fn reports_no_bibliography_for_a_folder_with_no_document_yaml_at_all() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = crate::document::canonical_root(&root.path().to_string_lossy()).expect("root");
        assert_eq!(read_bibliography(&base).expect("reads"), None);
    }

    #[test]
    fn refuses_a_bibliography_the_document_names_but_does_not_carry() {
        let root = tempfile::tempdir().expect("temp dir");
        let base = crate::document::canonical_root(&root.path().to_string_lossy()).expect("root");
        fs::write(base.join(METADATA_FILE), NAMES_A_BIBLIOGRAPHY).expect("wrote document.yaml");
        // No `references.bib` written: the metadata names a file that is not
        // there, which is a fact the author needs to see, not a silent gap.
        let message = read_bibliography(&base).expect_err("the file is missing");
        assert!(message.contains("references.bib"), "{message}");
    }
}
