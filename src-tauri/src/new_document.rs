//! Starting a document that has nothing written yet (`itd-2609051402191319`).
//!
//! Every other moment in the design begins with a document folder that
//! already exists; this is where the first one comes from. The shell writes
//! the smallest thing that is already a book — `document.yaml`, one numbered
//! Part, one numbered Chapter whose level-one heading is the title Alice
//! typed — and nothing else: no id, which is minted on first publish
//! (`05-internals.md` section 9), no declared variants, and no bibliography.
//!
//! The folder Alice writes into is chosen through the shell's own dialog, on
//! the same trust model `export.rs` uses for a chosen destination: the web
//! view never names a folder, it names the nonce [`NewDocumentDestinations`]
//! minted for the folder the author actually picked, and that nonce is good
//! for one creation. The two modules keep separate nonce stores because they
//! answer different questions — an export's destination holds a rendering
//! beside a document that already exists; this one's destination *becomes* a
//! document — and nothing here calls into `export.rs` or is called from it.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

use crate::document;
use crate::metadata::METADATA_FILE;

/// The size above which a dropped asset is referenced rather than copied.
///
/// `05-internals.md` section 6 leaves the default open but gives this figure
/// in its own `assets.json` example, and the maintainer's own documents used
/// for local testing carry it in `document.yaml`; `metadata::DocumentMetadata`
/// names no default of its own for the field to inherit. Recorded as a
/// decision in `.abcd/work/DECISIONS.md` rather than invented silently here.
pub const DEFAULT_ASSET_THRESHOLD_BYTES: u64 = 8_388_608;

/// The citation style a document opens with.
///
/// `numeric` is the value the maintainer's own local test documents use, and
/// map #11's bibliography builder (`itd-2609051335502171`) is written to
/// honour it. Recorded as a decision alongside the asset threshold.
pub const DEFAULT_CITATION_STYLE: &str = "numeric";

/// The name the first Part is given, deliberately not derived from the title.
///
/// The intent leaves this open and names the reason it matters: renaming a
/// Part is renaming a folder, and the first Part is the one an author is
/// least likely to ever rename. A name derived from the title would go stale
/// the moment the title changed and nobody would notice, because nothing
/// depends on the two staying in step — the title lives in `document.yaml`
/// and the chapter's own heading, not in the folder name. A neutral name
/// never goes stale. Recorded as a decision.
pub const FIRST_PART_NAME: &str = "chapters";

/// What `document.yaml` says the moment a document is created.
///
/// Not `metadata::DocumentMetadata`: that struct's fields are mostly
/// `Option`, and serialising one whole would write every absent field as an
/// explicit `null` — a metadata file with a dozen keys nobody set. This
/// writes only the three keys the intent gives Alice: her title and the two
/// defaults. There is no `id` field here at all, because a document that has
/// never been published has no site identity to write down
/// (`05-internals.md` section 9).
#[derive(Debug, Serialize)]
struct NewDocumentMetadata<'a> {
    title: &'a str,
    asset_threshold_bytes: u64,
    citation_style: &'a str,
}

/// The plain ASCII letter an accented Latin letter reads as.
///
/// Covers the Latin-1 Supplement and Latin Extended-A accented letters —
/// enough to answer every case `src/core/outline.ts`'s own `slugify` test
/// pins — as a direct table rather than through Unicode NFKD normalisation,
/// which needs a table Rust's standard library does not carry and this
/// change may not add a dependency for (`AGENTS.md`: "Do not add a
/// dependency of any kind."). A letter this table does not know about is
/// left to fall through to punctuation, as every non-alphanumeric character
/// already does.
fn fold_accent(ch: char) -> Option<char> {
    Some(match ch {
        'À' | 'Á' | 'Â' | 'Ã' | 'Ä' | 'Å' | 'Ā' | 'Ă' | 'Ą' | 'à' | 'á' | 'â' | 'ã' | 'ä' | 'å'
        | 'ā' | 'ă' | 'ą' => 'a',
        'Ç' | 'Ć' | 'Ĉ' | 'Ċ' | 'Č' | 'ç' | 'ć' | 'ĉ' | 'ċ' | 'č' => 'c',
        'Ð' | 'Ď' | 'Đ' | 'ð' | 'ď' | 'đ' => 'd',
        'È' | 'É' | 'Ê' | 'Ë' | 'Ē' | 'Ĕ' | 'Ė' | 'Ę' | 'Ě' | 'è' | 'é' | 'ê' | 'ë' | 'ē' | 'ĕ'
        | 'ė' | 'ę' | 'ě' => 'e',
        'Ĝ' | 'Ğ' | 'Ġ' | 'Ģ' | 'ĝ' | 'ğ' | 'ġ' | 'ģ' => 'g',
        'Ĥ' | 'Ħ' | 'ĥ' | 'ħ' => 'h',
        'Ì' | 'Í' | 'Î' | 'Ï' | 'Ĩ' | 'Ī' | 'Ĭ' | 'Į' | 'İ' | 'ì' | 'í' | 'î' | 'ï' | 'ĩ' | 'ī'
        | 'ĭ' | 'į' | 'ı' => 'i',
        'Ĵ' | 'ĵ' => 'j',
        'Ķ' | 'ķ' => 'k',
        'Ĺ' | 'Ļ' | 'Ľ' | 'Ŀ' | 'Ł' | 'ĺ' | 'ļ' | 'ľ' | 'ŀ' | 'ł' => 'l',
        'Ñ' | 'Ń' | 'Ņ' | 'Ň' | 'ñ' | 'ń' | 'ņ' | 'ň' => 'n',
        'Ò' | 'Ó' | 'Ô' | 'Õ' | 'Ö' | 'Ø' | 'Ō' | 'Ŏ' | 'Ő' | 'ò' | 'ó' | 'ô' | 'õ' | 'ö' | 'ø'
        | 'ō' | 'ŏ' | 'ő' => 'o',
        'Ŕ' | 'Ŗ' | 'Ř' | 'ŕ' | 'ŗ' | 'ř' => 'r',
        'Ś' | 'Ŝ' | 'Ş' | 'Š' | 'ś' | 'ŝ' | 'ş' | 'š' | 'ß' => 's',
        'Ţ' | 'Ť' | 'Ŧ' | 'ţ' | 'ť' | 'ŧ' => 't',
        'Ù' | 'Ú' | 'Û' | 'Ü' | 'Ũ' | 'Ū' | 'Ŭ' | 'Ů' | 'Ű' | 'Ų' | 'ù' | 'ú' | 'û' | 'ü' | 'ũ'
        | 'ū' | 'ŭ' | 'ů' | 'ű' | 'ų' => 'u',
        'Ŵ' | 'ŵ' => 'w',
        'Ý' | 'Ÿ' | 'Ŷ' | 'ý' | 'ÿ' | 'ŷ' => 'y',
        'Ź' | 'Ż' | 'Ž' | 'ź' | 'ż' | 'ž' => 'z',
        _ => return None,
    })
}

/// A title as one path segment: the slug rule the intent names — lowercase
/// ASCII, non-alphanumerics reduced to hyphens, collapsed — with an accented
/// Latin letter folded to the plain letter it resembles first, exactly as
/// `src/core/outline.ts`'s own `slugify` does for a heading. The two rules
/// used to depart here (review round one, Fable F16; the departure was
/// recorded at the time, and the record now names this fold as what closed
/// it) because Rust's standard library carries no Unicode normalisation
/// table; `fold_accent` above is the thirty-some-line table that answers the
/// cases that matter without adding one.
pub fn slugify(title: &str) -> String {
    let mut slug = String::with_capacity(title.len());
    // Seeded true so a leading run of punctuation is dropped rather than
    // opening the slug with a hyphen.
    let mut last_was_hyphen = true;
    for ch in title.chars() {
        let lower = ch.to_ascii_lowercase();
        if lower.is_ascii_lowercase() || lower.is_ascii_digit() {
            slug.push(lower);
            last_was_hyphen = false;
        } else if let Some(folded) = fold_accent(ch) {
            slug.push(folded);
            last_was_hyphen = false;
        } else if !last_was_hyphen {
            slug.push('-');
            last_was_hyphen = true;
        }
    }
    while slug.ends_with('-') {
        slug.pop();
    }
    if slug.is_empty() {
        // A title of nothing but punctuation, or of scripts this rule folds
        // away entirely, still needs a folder and a file name.
        "document".to_string()
    } else {
        slug
    }
}

/// The last segment of a path, as a name a message or a confirmation may
/// carry — never the machine path around it.
fn name_of(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// Every chapter anywhere under a Part, however deep.
fn chapters_of(part: &document::Part) -> Vec<&document::Chapter> {
    let mut found: Vec<&document::Chapter> = part.chapters.iter().collect();
    for child in &part.parts {
        found.extend(chapters_of(child));
    }
    found
}

/// What a folder already holds that makes it a document, if anything.
///
/// Named so the refusal can say what it found, as the intent asks: a
/// `document.yaml` file is one answer, a chapter already sitting under a Part
/// is another, and a folder holding neither is empty enough to write into,
/// whatever else happens to be in it.
fn what_it_already_holds(root: &Path) -> Option<&'static str> {
    if root.join(METADATA_FILE).is_file() {
        return Some("a document.yaml already there");
    }
    match document::read_tree(root) {
        Ok(tree) if !chapters_of(&tree.root).is_empty() => Some("a chapter already inside it"),
        _ => None,
    }
}

/// What one creation wrote: the document root and the chapter just made,
/// resolved paths the way `read_tree` would produce them, so the page can
/// hand the chapter straight to `open_chapter` once it has walked the folder
/// through the ordinary `open_folder` route (`itd-2609051335399446`, map #1).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewDocumentOutcome {
    pub root: String,
    pub chapter: String,
}

/// Write the smallest document a folder can hold.
///
/// In order: the title is not empty, the destination resolves to a real
/// folder, and that folder holds no document yet — every refusal happens
/// before anything is written, so a refusal leaves the folder exactly as it
/// was. From there: the Part folder, the chapter inside it (`document.rs`'s
/// own atomic writer, a temporary file beside the destination renamed into
/// place), and `document.yaml` beside them, the same way. A failure after the
/// Part folder was created takes the folder back down with it, so a create
/// that fails halfway never leaves a folder that looks like it worked.
pub fn create_document(destination: &Path, title: &str) -> Result<NewDocumentOutcome, String> {
    let title = title.trim();
    if title.is_empty() {
        return Err("a document needs a title before it can be created".to_string());
    }
    // `write_the_book` writes `title` verbatim as the chapter's own level-one
    // heading, and this command is reachable from any window regardless of
    // what the New document panel's `<input type="text">` would let through
    // (the app's own decision that Tauri capabilities do not gate commands
    // by window) — so the newline this trust boundary must refuse is the
    // Rust side's to catch, not the input field's (review round one, GLM
    // F6). A line break in the middle of a title would otherwise turn one
    // typed field into a second heading, or Setext-underline the next line
    // by accident.
    if title.contains('\n') || title.contains('\r') {
        return Err("a title cannot hold a line break".to_string());
    }

    let root = fs::canonicalize(destination)
        .map_err(|error| format!("cannot resolve the folder you chose: {error}"))?;
    if !root.is_dir() {
        return Err(format!("{} is not a folder", name_of(&root)));
    }
    if let Some(found) = what_it_already_holds(&root) {
        return Err(format!(
            "{} already holds a document: it has {found}. New document writes into an empty folder only.",
            name_of(&root)
        ));
    }

    let part_name = format!("01-{FIRST_PART_NAME}");
    let part = root.join(&part_name);
    // An empty `01-chapters` can already be sitting there — left by a folder
    // that was never quite a document, or by an aborted create — and
    // `what_it_already_holds` above has already decided that an empty Part
    // is not a document either. `fs::create_dir` refuses to create a folder
    // that exists, even an empty one, so this writes into it rather than
    // asking the filesystem to make it twice, which used to fail with the
    // OS's own "File exists" rather than the folder simply being written
    // into (review round one, Fable F15).
    let part_already_there = part.is_dir();
    if !part_already_there {
        fs::create_dir(&part).map_err(|error| format!("cannot create {part_name}: {error}"))?;
    }

    let outcome = write_the_book(&root, &part, title);
    if outcome.is_err() && !part_already_there {
        // The folder is one this call made a moment ago, so it is this call's
        // to take away again: a half-written document must not look like one
        // that succeeded, and the next attempt must not find a partial book
        // standing in the way of `is_folder_name`-style collision handling.
        // A Part this call found already there is left alone on failure —
        // it was not this call's to make, so it is not this call's to sweep.
        if let Err(swept) = fs::remove_dir_all(&part) {
            eprintln!("new_document: cannot remove {part_name} after a failed create: {swept}");
        }
    }
    outcome
}

/// Everything after the Part folder exists: the chapter and `document.yaml`.
///
/// Split out so `create_document` has one place to sweep the Part away on any
/// failure from here on, rather than one `if let Err` per step.
fn write_the_book(root: &Path, part: &Path, title: &str) -> Result<NewDocumentOutcome, String> {
    let chapter_name = format!("01-{}.md", slugify(title));
    let chapter_path = part.join(&chapter_name);
    // The heading is the title exactly as Alice typed it, character for
    // character — the intent's own falsifiable claim: a title typed once is
    // the chapter's own level-one heading, not a second thing to type. The
    // blank line beneath it is where the cursor is left once the frontend
    // opens the chapter, so a fresh document does not open on top of its own
    // heading.
    document::write_chapter_text(&chapter_path, &format!("# {title}\n\n"))?;

    let metadata = NewDocumentMetadata {
        title,
        asset_threshold_bytes: DEFAULT_ASSET_THRESHOLD_BYTES,
        citation_style: DEFAULT_CITATION_STYLE,
    };
    let yaml = serde_yaml_ng::to_string(&metadata)
        .map_err(|error| format!("cannot write {METADATA_FILE}: {error}"))?;
    document::write_chapter_text(&root.join(METADATA_FILE), &yaml)?;

    Ok(NewDocumentOutcome {
        root: root.to_string_lossy().into_owned(),
        chapter: chapter_path.to_string_lossy().into_owned(),
    })
}

/* ---------------------------------------------------------------------------
 * The folder dialog's answer, held under a nonce.
 *
 * The same shape as `export::ExportDestinations`, kept as a module of its own
 * rather than shared: the two answer different questions and neither is ever
 * the page's to spend on the other's behalf.
 * ------------------------------------------------------------------------- */

/// How long the folder the author chose stays claimable.
pub const DESTINATION_LIFETIME: Duration = Duration::from_secs(30);

/// One answer the author gave the folder dialog.
struct ChosenFolder {
    nonce: String,
    path: PathBuf,
    at: Instant,
}

/// The folders offered to New document, each under the nonce that claims it.
#[derive(Default)]
pub struct NewDocumentDestinations(Mutex<Vec<ChosenFolder>>);

impl NewDocumentDestinations {
    /// Hold the folder the author chose and mint the nonce that claims it.
    pub fn offer(&self, path: PathBuf) -> Result<String, String> {
        self.offer_at(path, Instant::now())
    }

    /// Take the folder a nonce names. An unknown or expired nonce is refused.
    pub fn claim(&self, nonce: &str) -> Result<PathBuf, String> {
        self.claim_at(nonce, Instant::now())
    }

    /// `offer`, told what time it is; see `export::ExportDestinations` for
    /// why the clock is an argument rather than a call inside the body.
    fn offer_at(&self, path: PathBuf, now: Instant) -> Result<String, String> {
        let nonce = crate::assets::mint_nonce()?;
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the chosen folder is unreadable".to_string())?;
        held.retain(|chosen| now.duration_since(chosen.at) < DESTINATION_LIFETIME);
        held.push(ChosenFolder {
            nonce: nonce.clone(),
            path,
            at: now,
        });
        Ok(nonce)
    }

    fn claim_at(&self, nonce: &str, now: Instant) -> Result<PathBuf, String> {
        let mut held = self
            .0
            .lock()
            .map_err(|_| "the chosen folder is unreadable".to_string())?;
        held.retain(|chosen| now.duration_since(chosen.at) < DESTINATION_LIFETIME);
        let index = held
            .iter()
            .position(|chosen| chosen.nonce == nonce)
            .ok_or_else(|| {
                "that folder is no longer on offer. Choose the folder again.".to_string()
            })?;
        Ok(held.remove(index).path)
    }
}

/// What the folder dialog hands back: the nonce that claims the folder the
/// author chose, and its own name — never the machine path around it.
#[derive(Debug, Clone, Serialize)]
pub struct ChosenNewDocumentFolder {
    pub nonce: String,
    pub name: String,
}

/* ---------------------------------------------------------------------------
 * The commands.
 * ------------------------------------------------------------------------- */

/// Ask the author where to create the new document, and hold the answer.
///
/// The dialog is the shell's, exactly as `export::choose_export_destination`
/// argues: what crosses back to the page is a nonce, never the path itself.
#[tauri::command]
pub async fn choose_new_document_folder(
    app: tauri::AppHandle,
    default_path: Option<String>,
    chosen: tauri::State<'_, NewDocumentDestinations>,
) -> Result<Option<ChosenNewDocumentFolder>, String> {
    use tauri_plugin_dialog::DialogExt;

    let opens_at = default_path.and_then(|path| fs::canonicalize(path).ok());
    let picked = tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = app.dialog().file();
        if let Some(folder) = opens_at {
            dialog = dialog.set_directory(folder);
        }
        dialog.blocking_pick_folder()
    })
    .await
    .map_err(|error| format!("cannot open the folder chooser: {error}"))?;

    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked
        .into_path()
        .map_err(|error| format!("cannot read the folder you chose: {error}"))?;
    let path = fs::canonicalize(&path)
        .map_err(|error| format!("cannot resolve the folder you chose: {error}"))?;
    let name = name_of(&path);
    let nonce = chosen.offer(path)?;
    Ok(Some(ChosenNewDocumentFolder { nonce, name }))
}

/// Write the new document into the folder a nonce claims.
#[tauri::command]
pub async fn create_new_document(
    title: String,
    destination_nonce: String,
    chosen: tauri::State<'_, NewDocumentDestinations>,
) -> Result<NewDocumentOutcome, String> {
    let destination = chosen.claim(&destination_nonce)?;
    tauri::async_runtime::spawn_blocking(move || create_document(&destination, &title))
        .await
        .map_err(|error| format!("cannot create the document: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::metadata;

    fn temp() -> tempfile::TempDir {
        tempfile::tempdir().expect("temp dir")
    }

    #[test]
    fn the_slug_rule_is_lowercase_ascii_with_the_rest_collapsed_to_hyphens() {
        assert_eq!(slugify("The Lantern Papers"), "the-lantern-papers");
        assert_eq!(
            slugify("Wait—what does *this* mean?!"),
            "wait-what-does-this-mean"
        );
        assert_eq!(
            slugify("Technikfolgenabschätzung"),
            "technikfolgenabschatzung"
        );
        assert_eq!(slugify("---"), "document");
        assert_eq!(slugify(""), "document");
        assert_eq!(slugify("  Café, 1999  "), "cafe-1999");
    }

    #[test]
    fn creates_the_smallest_book_a_document_can_be() {
        let dir = temp();
        let outcome = create_document(dir.path(), "The Lantern Papers").expect("created");

        let root = fs::canonicalize(dir.path()).expect("resolves");
        assert_eq!(outcome.root, root.to_string_lossy());

        let part = root.join("01-chapters");
        assert!(part.is_dir(), "one numbered Part folder");
        let chapter = part.join("01-the-lantern-papers.md");
        assert_eq!(outcome.chapter, chapter.to_string_lossy());
        let text = fs::read_to_string(&chapter).expect("the chapter exists");
        assert_eq!(text, "# The Lantern Papers\n\n");

        let metadata_text =
            fs::read_to_string(root.join(metadata::METADATA_FILE)).expect("document.yaml exists");
        assert_eq!(
            metadata_text,
            "title: The Lantern Papers\nasset_threshold_bytes: 8388608\ncitation_style: numeric\n"
        );

        // No other file was written: the Part holds exactly the one chapter,
        // and the root holds exactly the Part and the metadata file.
        let part_entries: Vec<_> = fs::read_dir(&part).expect("read the part").collect();
        assert_eq!(part_entries.len(), 1);
        let root_entries: Vec<_> = fs::read_dir(&root).expect("read the root").collect();
        assert_eq!(
            root_entries.len(),
            2,
            "only the Part folder and document.yaml sit at the root"
        );
    }

    #[test]
    fn reads_back_with_no_id_no_variants_and_no_bibliography() {
        let dir = temp();
        create_document(dir.path(), "The Lantern Papers").expect("created");
        let read = metadata::read_metadata(&dir.path().join(metadata::METADATA_FILE))
            .expect("document.yaml parses");
        assert_eq!(read.title.as_deref(), Some("The Lantern Papers"));
        assert_eq!(
            read.asset_threshold_bytes,
            Some(DEFAULT_ASSET_THRESHOLD_BYTES)
        );
        assert_eq!(read.citation_style.as_deref(), Some(DEFAULT_CITATION_STYLE));
        assert_eq!(read.id, None);
        assert!(read.variants.is_empty());
        assert_eq!(read.bibliography, None);
    }

    #[test]
    fn writes_the_heading_exactly_as_typed_while_the_slug_folds_it_down() {
        let dir = temp();
        let title = "Café Life: 1999–2001 (a memoir)";
        let outcome = create_document(dir.path(), title).expect("created");
        let text = fs::read_to_string(&outcome.chapter).expect("the chapter exists");
        assert_eq!(text, format!("# {title}\n\n"));
        assert!(
            outcome
                .chapter
                .contains("01-cafe-life-1999-2001-a-memoir.md"),
            "{}",
            outcome.chapter
        );
    }

    #[test]
    fn refuses_an_empty_title_and_writes_nothing() {
        let dir = temp();
        let error = create_document(dir.path(), "   ").expect_err("refused");
        assert!(error.contains("title"), "{error}");
        assert_eq!(fs::read_dir(dir.path()).expect("read").count(), 0);
    }

    #[test]
    fn refuses_a_title_with_a_line_break_and_writes_nothing() {
        // The command is reachable from any window regardless of what the
        // New document panel's own `<input type="text">` would let through,
        // so this trust boundary catches it independently — a line break
        // would otherwise turn one typed field into a second heading in the
        // chapter this call writes (review round one, GLM F6).
        let dir = temp();
        let error = create_document(dir.path(), "Line one\nLine two").expect_err("refused");
        assert!(error.contains("line break"), "{error}");
        assert_eq!(fs::read_dir(dir.path()).expect("read").count(), 0);
    }

    #[test]
    fn refuses_a_folder_that_already_holds_a_document_yaml_and_writes_nothing() {
        let dir = temp();
        fs::write(dir.path().join(metadata::METADATA_FILE), "title: Old\n").expect("seed");
        let error = create_document(dir.path(), "New Title").expect_err("refused");
        assert!(error.contains("already holds a document"), "{error}");
        assert!(!dir.path().join("01-chapters").exists());
    }

    #[test]
    fn refuses_a_folder_that_already_holds_a_chapter_and_writes_nothing() {
        let dir = temp();
        let part = dir.path().join("01-elsewhere");
        fs::create_dir(&part).expect("seed part");
        fs::write(part.join("01-something.md"), "# Something\n").expect("seed chapter");
        let error = create_document(dir.path(), "New Title").expect_err("refused");
        assert!(error.contains("already holds a document"), "{error}");
        assert!(!dir.path().join("01-chapters").exists());
    }

    #[test]
    fn a_second_document_is_still_creatable_beside_an_empty_part() {
        // An empty Part with no chapter in it is not yet a document: what
        // `what_it_already_holds` answers is what a document *is*, not what
        // a folder merely contains, so a create beside one succeeds rather
        // than being refused.
        let dir = temp();
        fs::create_dir(dir.path().join("01-empty")).expect("seed");
        create_document(dir.path(), "The Lantern Papers").expect("still creatable");
    }

    #[test]
    fn writes_into_an_already_present_empty_first_part_rather_than_refusing() {
        // The Part this call itself writes to (`01-chapters`) can already be
        // sitting there, empty — left by a folder that was never quite a
        // document, or by a create that failed after this one made it.
        // `fs::create_dir` refuses to make a folder that already exists,
        // even an empty one; this proves the create writes into it instead
        // of surfacing that refusal (review round one, Fable F15).
        let dir = temp();
        let part = dir.path().join("01-chapters");
        fs::create_dir(&part).expect("seed the empty part");

        let outcome = create_document(dir.path(), "The Lantern Papers").expect("still creatable");

        assert_eq!(fs::read_dir(&part).expect("read part").count(), 1);
        assert!(Path::new(&outcome.chapter).is_file());
    }

    #[test]
    fn writes_the_chapter_and_the_metadata_through_a_temporary_file_beside_them() {
        // `write_chapter_text` is document.rs's own atomic writer: a
        // temporary file beside the destination, flushed, then renamed into
        // place. This proves nothing is left behind once creation succeeds,
        // which is the half of atomicity a reader of the finished folder can
        // observe.
        let dir = temp();
        create_document(dir.path(), "The Lantern Papers").expect("created");
        for entry in fs::read_dir(dir.path()).expect("read root") {
            let name = entry.expect("entry").file_name();
            assert!(!name.to_string_lossy().contains(".tmp"), "{name:?}");
        }
        let part = dir.path().join("01-chapters");
        for entry in fs::read_dir(&part).expect("read part") {
            let name = entry.expect("entry").file_name();
            assert!(!name.to_string_lossy().contains(".tmp"), "{name:?}");
        }
    }

    #[test]
    fn a_folder_choice_is_the_dialog_s_answer_claimed_once() {
        let chosen = NewDocumentDestinations::default();
        let dir = temp();
        let nonce = chosen
            .offer_at(dir.path().to_path_buf(), Instant::now())
            .expect("offered");
        assert_ne!(nonce, "");
        assert_eq!(
            chosen
                .claim_at(&nonce, Instant::now())
                .expect("claimed")
                .as_path(),
            dir.path()
        );
        let again = chosen.claim_at(&nonce, Instant::now()).expect_err("spent");
        assert!(again.contains("no longer on offer"), "{again}");
    }

    #[test]
    fn a_folder_choice_expires_after_its_lifetime() {
        let chosen = NewDocumentDestinations::default();
        let dir = temp();
        let then = Instant::now();
        let nonce = chosen
            .offer_at(dir.path().to_path_buf(), then)
            .expect("offered");
        let later = then + DESTINATION_LIFETIME + Duration::from_millis(1);
        let error = chosen.claim_at(&nonce, later).expect_err("expired");
        assert!(error.contains("no longer on offer"), "{error}");
    }
}
