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
    let mut metadata: DocumentMetadata = serde_yml::from_str(text)
        .map_err(|error| format!("cannot read {METADATA_FILE}: {error}"))?;
    metadata.present = true;
    Ok(metadata)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The three documents under `examples/`, which are the fixtures the specs
    /// name and the only real `document.yaml` files in the repository.
    fn example(document: &str) -> DocumentMetadata {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("examples")
            .join(document)
            .join(METADATA_FILE);
        read_metadata(&path).expect("the example parses")
    }

    #[test]
    fn reads_the_macro_talk_metadata() {
        let metadata = example("presentation");
        assert!(metadata.present);
        assert_eq!(metadata.title.as_deref(), Some("Macromarketing 2026"));
        assert_eq!(
            metadata.subtitle.as_deref(),
            Some("Technology Impact Assessment")
        );
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
        let metadata = example("manuscript");
        let abstract_text = metadata.abstract_text.expect("the paper carries one");
        assert!(
            abstract_text.starts_with("Vibe coding lets people without programming"),
            "the block scalar is folded into one string: {abstract_text}"
        );
        assert!(abstract_text.ends_with("professional developers.\n"));
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
    fn reads_the_vibe_coding_talk_metadata() {
        let metadata = example("talk");
        assert_eq!(metadata.title.as_deref(), Some("Example Document"));
        assert_eq!(
            metadata.subtitle.as_deref(),
            Some("An A Worked Example")
        );
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
}
