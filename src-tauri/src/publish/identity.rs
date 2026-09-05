//! The three names, and the one grammar they share.
//!
//! A stable id, a variant token and a version hash are each sixteen bytes
//! written as RFC 4648 base32, lower-cased and unpadded: twenty-six characters
//! over `[a-z2-7]`. `src/core/identity.ts` is the page's copy of this; the
//! vectors in both test modules are the same, so the two cannot drift.
//!
//! Base32 and not hex, because the production repository is checked out on a
//! case-insensitive file system where two names differing only in case would
//! collide. Base32 and not base64url, because the alphabet omits `0`, `1`, `8`
//! and `9`, so no character has a look-alike to mistype from a lectern.

use std::fmt::Write as _;
use std::path::Path;

use sha2::{Digest, Sha256};

/// How many bytes an id, a token and a version hash each carry.
pub const IDENTIFIER_BYTES: usize = 16;

/// How many characters those sixteen bytes encode to.
pub const IDENTIFIER_LENGTH: usize = 26;

/// RFC 4648 base32, lower-cased.
const ALPHABET: &[u8; 32] = b"abcdefghijklmnopqrstuvwxyz234567";

/// Encode bytes as lower-case unpadded base32.
pub fn encode_base32(bytes: &[u8]) -> String {
    let mut out = String::new();
    let mut buffer: u16 = 0;
    let mut bits: u8 = 0;
    for byte in bytes {
        buffer = (buffer << 8) | u16::from(*byte);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            let index = ((buffer >> bits) & 0b1_1111) as usize;
            out.push(ALPHABET[index] as char);
        }
    }
    if bits > 0 {
        let index = ((buffer << (5 - bits)) & 0b1_1111) as usize;
        out.push(ALPHABET[index] as char);
    }
    out
}

/// Whether a path segment is a well-formed id, token or version hash.
pub fn is_identifier(value: &str) -> bool {
    value.len() == IDENTIFIER_LENGTH
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || (b'2'..=b'7').contains(&byte))
}

/// Mint one identifier from the system random source.
///
/// A hundred and twenty-eight bits, because for an unlisted document the id is
/// the whole of the protection.
pub fn mint() -> Result<String, String> {
    let mut bytes = [0u8; IDENTIFIER_BYTES];
    getrandom::fill(&mut bytes).map_err(|error| format!("cannot mint a name: {error}"))?;
    Ok(encode_base32(&bytes))
}

/// SHA-256 of some bytes, as lower-case hex.
pub fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut out = String::with_capacity(64);
    for byte in digest {
        let _ = write!(out, "{byte:02x}");
    }
    out
}

/// One file of a version folder, named by its content.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListingEntry {
    /// The path relative to the version folder, with `/` separators.
    pub path: String,
    /// The file's SHA-256 as lower-case hex.
    pub sha256: String,
}

/// The canonical listing a version hash is taken over.
///
/// One line per file, `<hex> + "  " + <path> + "\n"`, sorted ascending by the
/// path's UTF-8 bytes. Content and layout only: no mode, no size, no
/// timestamp, so the same built output hashes the same on any machine.
pub fn canonical_listing(entries: &[ListingEntry]) -> String {
    let mut sorted = entries.to_vec();
    sorted.sort_by(|left, right| left.path.as_bytes().cmp(right.path.as_bytes()));
    let mut out = String::new();
    for entry in sorted {
        out.push_str(&entry.sha256);
        out.push_str("  ");
        out.push_str(&entry.path);
        out.push('\n');
    }
    out
}

/// The version hash: the first sixteen bytes of the listing's digest.
pub fn version_hash(entries: &[ListingEntry]) -> String {
    let listing = canonical_listing(entries);
    let digest = Sha256::digest(listing.as_bytes());
    encode_base32(&digest[..IDENTIFIER_BYTES])
}

/// List a folder's files, each with its digest, relative to the folder.
///
/// Directories carry no line of their own: an empty folder is not content, and
/// git would not carry one anyway.
pub fn listing_of(root: &Path) -> Result<Vec<ListingEntry>, String> {
    let mut entries = Vec::new();
    walk(root, root, &mut entries)?;
    entries.sort_by(|left, right| left.path.as_bytes().cmp(right.path.as_bytes()));
    Ok(entries)
}

fn walk(root: &Path, folder: &Path, entries: &mut Vec<ListingEntry>) -> Result<(), String> {
    let read = std::fs::read_dir(folder)
        .map_err(|error| format!("cannot read {}: {error}", folder.display()))?;
    for entry in read {
        let entry = entry.map_err(|error| format!("cannot read {}: {error}", folder.display()))?;
        let path = entry.path();
        let kind = entry
            .file_type()
            .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
        if kind.is_dir() {
            walk(root, &path, entries)?;
            continue;
        }
        let bytes = std::fs::read(&path)
            .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
        let relative = path
            .strip_prefix(root)
            .map_err(|_| format!("{} is outside the staged version", path.display()))?;
        let mut name = String::new();
        for part in relative.components() {
            if !name.is_empty() {
                name.push('/');
            }
            name.push_str(&part.as_os_str().to_string_lossy());
        }
        entries.push(ListingEntry {
            path: name,
            sha256: sha256_hex(&bytes),
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The vectors below are the same in `src/core/identity.test.ts`.

    #[test]
    fn identity_writes_sixteen_bytes_as_twenty_six_characters() {
        assert_eq!(encode_base32(&[0u8; 16]).len(), IDENTIFIER_LENGTH);
        assert_eq!(encode_base32(&[0u8; 16]), "a".repeat(26));
        assert_eq!(encode_base32(&[0xffu8; 16]), "77777777777777777777777774");
    }

    #[test]
    fn identity_agrees_with_rfc_4648_lower_cased_and_unpadded() {
        assert_eq!(encode_base32(b"f"), "my");
        assert_eq!(encode_base32(b"fo"), "mzxq");
        assert_eq!(encode_base32(b"foo"), "mzxw6");
        assert_eq!(encode_base32(b"foob"), "mzxw6yq");
        assert_eq!(encode_base32(b"fooba"), "mzxw6ytb");
        assert_eq!(encode_base32(b"foobar"), "mzxw6ytboi");
    }

    #[test]
    fn identity_grammar_refuses_the_look_alikes_and_the_old_example() {
        assert!(is_identifier(&"a".repeat(26)));
        assert!(!is_identifier(&"0".repeat(26)));
        assert!(!is_identifier(&"1".repeat(26)));
        assert!(!is_identifier(&"8".repeat(26)));
        assert!(!is_identifier(&"9".repeat(26)));
        assert!(!is_identifier(&"A".repeat(26)));
        assert!(!is_identifier(&"a".repeat(25)));
        assert!(!is_identifier(&"a".repeat(27)));
        // The brief's illustrative sixty-four-bit id is not a name.
        assert!(!is_identifier("7f3a91c2e4d85b06"));
        assert!(!is_identifier("v"));
        assert!(!is_identifier("slides"));
    }

    #[test]
    fn identity_mints_a_well_formed_name_each_time() {
        let mut seen = std::collections::BTreeSet::new();
        for _ in 0..64 {
            let minted = mint().expect("minted");
            assert!(is_identifier(&minted), "{minted}");
            assert!(seen.insert(minted), "a name was minted twice");
        }
    }

    #[test]
    fn hash_of_a_known_tree_is_a_known_name() {
        let entries = vec![
            ListingEntry {
                path: "index.html".to_string(),
                sha256: sha256_hex(b"<h1>The Lantern Papers</h1>\n"),
            },
            ListingEntry {
                path: "slides/index.html".to_string(),
                sha256: sha256_hex(b"<section>The Lantern Papers</section>\n"),
            },
        ];
        assert_eq!(version_hash(&entries), "fsirhjtwyqgsgh2gvayaqgtmwy");
    }

    #[test]
    fn hash_is_the_same_whatever_order_the_files_arrive_in() {
        let mut entries = vec![
            ListingEntry {
                path: "index.html".to_string(),
                sha256: "aa".to_string(),
            },
            ListingEntry {
                path: "slides/index.html".to_string(),
                sha256: "bb".to_string(),
            },
        ];
        let first = version_hash(&entries);
        entries.reverse();
        assert_eq!(first, version_hash(&entries));
        assert!(is_identifier(&first));
    }

    #[test]
    fn hash_changes_when_a_byte_changes_or_a_file_moves() {
        let one = vec![ListingEntry {
            path: "index.html".to_string(),
            sha256: sha256_hex(b"a"),
        }];
        let other = vec![ListingEntry {
            path: "index.html".to_string(),
            sha256: sha256_hex(b"b"),
        }];
        let moved = vec![ListingEntry {
            path: "slides/index.html".to_string(),
            sha256: sha256_hex(b"a"),
        }];
        assert_ne!(version_hash(&one), version_hash(&other));
        assert_ne!(version_hash(&one), version_hash(&moved));
    }

    #[test]
    fn hash_of_a_staged_folder_is_the_hash_of_its_listing() {
        let dir = tempfile::tempdir().expect("temp dir");
        std::fs::create_dir_all(dir.path().join("slides")).expect("folder");
        std::fs::write(
            dir.path().join("index.html"),
            b"<h1>The Lantern Papers</h1>\n",
        )
        .expect("write");
        std::fs::write(
            dir.path().join("slides/index.html"),
            b"<section>The Lantern Papers</section>\n",
        )
        .expect("write");
        let listing = listing_of(dir.path()).expect("listed");
        assert_eq!(
            listing.iter().map(|e| e.path.as_str()).collect::<Vec<_>>(),
            vec!["index.html", "slides/index.html"]
        );
        assert_eq!(version_hash(&listing), "fsirhjtwyqgsgh2gvayaqgtmwy");
    }

    #[test]
    fn sha256_agrees_with_the_published_vectors() {
        assert_eq!(
            sha256_hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            sha256_hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
