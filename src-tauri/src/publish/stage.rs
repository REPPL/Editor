//! Staging, and the two rules that keep an old link showing what it showed.
//!
//! A publish is built into a staging tree in the application's own cache
//! directory, outside every tracked folder, and hashed there. Only then is it
//! compared with the version folder that hash names:
//!
//! 1. **A version folder is written once.** Where the folder exists and its
//!    listing matches, nothing at all is written into it; where the listing
//!    disagrees, the publish is refused rather than reconciled — a hash naming
//!    two different trees is a bug in the hash, not a merge.
//! 2. **`latest.json` is the only file a publish rewrites beneath a token**,
//!    besides the shell copies whose bytes are the same for every document.
//!
//! The presenter, the stylesheets and the deck engine live once at the site
//! root and are shared by every version, so an old version is frozen in its
//! content rather than in its chrome.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::assets::decode_reference;
use crate::document::{confine_asset, confine_path, ASSET_EXTENSIONS};
use crate::publish::identity::{is_identifier, listing_of, version_hash};

/// Whether a path inside the version folder is one a publish may write bytes to.
///
/// The same list the shell reads an image by, so what the site carries and what
/// the app will open are one answer rather than two.
fn is_publishable_asset(path: &str) -> bool {
    Path::new(path)
        .extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
        .map(|extension| ASSET_EXTENSIONS.contains(&extension.as_str()))
        .unwrap_or(false)
}

/// A text file the build produced, named relative to the version folder.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuiltFile {
    pub path: String,
    pub text: String,
}

/// An asset to copy, from the document folder into the version folder.
///
/// `from` is the author's reference, percent escapes and all, relative to the
/// document root; `to` is a name inside the version folder that needs no
/// escaping, which is what the built page points at.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetCopy {
    pub from: String,
    pub to: String,
}

/// The production repository and the directory inside it the host deploys.
#[derive(Debug, Clone)]
pub struct SiteLayout {
    pub repo: PathBuf,
    pub site_dir: String,
}

impl SiteLayout {
    pub fn new(repo: impl Into<PathBuf>, site_dir: &str) -> Self {
        Self {
            repo: repo.into(),
            site_dir: site_dir.to_string(),
        }
    }

    /// The deployed directory.
    pub fn site(&self) -> PathBuf {
        self.repo.join(&self.site_dir)
    }

    /// One variant's stable folder.
    pub fn stable(&self, id: &str, token: &str) -> PathBuf {
        self.site().join(id).join(token)
    }

    /// One version folder.
    pub fn version(&self, id: &str, token: &str, hash: &str) -> PathBuf {
        self.stable(id, token).join("v").join(hash)
    }
}

/// The shell, byte for byte, wherever it is copied to.
pub const SHELL: &str = include_str!("../../../site/index.html");

/// Everything the site carries once, at its root, for every version.
///
/// Each entry is a path inside the deployed directory and the bytes that
/// belong there. The reveal.js files are the vendored copy, so the site and
/// the app run the same engine and neither reaches a content network.
pub const CHROME: [(&str, &str); 13] = [
    ("index.html", SHELL),
    ("404.html", SHELL),
    ("robots.txt", include_str!("../../../site/robots.txt")),
    ("_headers", include_str!("../../../site/_headers")),
    (
        "presenter/presenter.js",
        include_str!("../../../site/presenter/presenter.js"),
    ),
    (
        "presenter/presenter.css",
        include_str!("../../../site/presenter/presenter.css"),
    ),
    // The article's appearance and its script are the rendering core's own
    // files, the same way the deck's stylesheet is below: `article.ts`
    // reads `article.css` through the same `?inline` import a jsdom test
    // reads, the app's preview page links both directly, and this is the
    // one place their bytes reach the site (spc-2609061318090042).
    (
        "presenter/article.css",
        include_str!("../../../src/core/render/article.css"),
    ),
    (
        "presenter/article-video.js",
        include_str!("../../../src/core/render/article-video.js"),
    ),
    // The reader-controls toolbar (map #10, spc-2609061318154502): the same
    // one-source arrangement as the two files above, so a fix reaches the
    // app's preview, the site build and the folder export at once.
    (
        "presenter/article-controls.js",
        include_str!("../../../src/core/render/article-controls.js"),
    ),
    // The once-only opening and the easter eggs (map #12, spc-2609061318159422):
    // the same one-source arrangement as the two files above.
    (
        "presenter/article-eggs.js",
        include_str!("../../../src/core/render/article-eggs.js"),
    ),
    // Keyboard movement, the contents list, search, cancel and the keys
    // panel (map #26, spc-2609061318158216): the same one-source
    // arrangement as the three files above.
    (
        "presenter/article-keys.js",
        include_str!("../../../src/core/render/article-keys.js"),
    ),
    (
        "presenter/deck.js",
        include_str!("../../../site/presenter/deck.js"),
    ),
    // The deck's appearance is the rendering core's own stylesheet, so the
    // deck on the site is the deck the app rehearsed.
    (
        "presenter/slides.css",
        include_str!("../../../src/core/render/slides.css"),
    ),
];

/// The deck engine, vendored once and copied to the site root.
///
/// Exactly the files `DECK_ENGINE_FILES` names in `src/core/render/slides.ts`:
/// no theme, because the theme fixes a font size and the deck's own stylesheet
/// is what makes a slide reflow to the reader's width.
pub const ENGINE: [(&str, &str); 5] = [
    (
        "presenter/reveal/reveal.js",
        include_str!("../../../src/vendor/reveal/reveal.js"),
    ),
    (
        "presenter/reveal/reveal.css",
        include_str!("../../../src/vendor/reveal/reveal.css"),
    ),
    (
        "presenter/reveal/reset.css",
        include_str!("../../../src/vendor/reveal/reset.css"),
    ),
    (
        "presenter/reveal/plugin/notes/notes.js",
        include_str!("../../../src/vendor/reveal/plugin/notes/notes.js"),
    ),
    (
        "presenter/reveal/LICENSE",
        include_str!("../../../src/vendor/reveal/LICENSE"),
    ),
];

/// What the production repository carries beside the deployed directory.
pub const TOOLING: [(&str, &str); 2] = [
    (
        "tools/verify-site.mjs",
        include_str!("../../../tools/verify-site.mjs"),
    ),
    (
        ".github/workflows/publish.yml",
        include_str!("../../../.github/workflows/publish.yml"),
    ),
];

/// The chrome an exported folder carries, for one kind of rendering.
///
/// The bytes are the site's own — the constants `scaffold` writes at the site
/// root — so the deck a folder runs is the deck the site serves. The site's
/// own root files are not among them: the shell's `index.html` would collide
/// with the article's, and none of the rest means anything in a folder.
pub fn chrome_for_folder(kind: &str) -> Result<Vec<(&'static str, &'static str)>, String> {
    let named: &[&str] = match kind {
        "deck" => &["presenter/slides.css", "presenter/deck.js"],
        "article" => &[
            "presenter/article.css",
            "presenter/article-video.js",
            "presenter/article-controls.js",
            "presenter/article-eggs.js",
            "presenter/article-keys.js",
        ],
        other => return Err(format!("{other} is not a rendering an export writes")),
    };
    let mut chrome: Vec<(&'static str, &'static str)> = Vec::new();
    if kind == "deck" {
        chrome.extend(ENGINE.iter().copied());
    }
    for name in named {
        let found = CHROME
            .iter()
            .find(|(path, _)| path == name)
            .ok_or_else(|| format!("the site carries no {name}"))?;
        chrome.push(*found);
    }
    Ok(chrome)
}

/// What a stage produced.
#[derive(Debug, Clone)]
pub struct Staged {
    /// The staging tree, in the application's cache.
    pub path: PathBuf,
    /// The version hash of what is in it.
    pub hash: String,
}

/// What installing a version did.
#[derive(Debug, Clone, Default)]
pub struct Installed {
    /// False when this content already had a version folder.
    pub created: bool,
    /// Every path written, relative to the repository root.
    pub written: Vec<String>,
}

/// Build the staging tree and hash it.
///
/// Every written path is confined to the staging tree and every asset read is
/// confined to the document folder, so a built path from the web view cannot
/// name anything else. The tree is cleared first: a staging folder left behind
/// by an earlier publish would otherwise hash into this one.
pub fn stage_version(
    staging: &Path,
    document_root: &Path,
    files: &[BuiltFile],
    copies: &[AssetCopy],
) -> Result<Staged, String> {
    if staging.exists() {
        fs::remove_dir_all(staging)
            .map_err(|error| format!("cannot clear {}: {error}", staging.display()))?;
    }
    fs::create_dir_all(staging)
        .map_err(|error| format!("cannot create {}: {error}", staging.display()))?;
    // Confinement compares resolved paths, so both roots are resolved first:
    // a temporary folder reached through a symlink is the same folder.
    let root = fs::canonicalize(staging)
        .map_err(|error| format!("cannot resolve {}: {error}", staging.display()))?;
    let document_root = fs::canonicalize(document_root)
        .map_err(|error| format!("cannot resolve {}: {error}", document_root.display()))?;

    for file in files {
        let target = confined_target(&root, &file.path)?;
        write_file(&target, file.text.as_bytes())?;
    }
    for copy in copies {
        // The build names what to copy, and the build runs in the web view. So
        // the extension is held to the ones a published version carries at both
        // ends: a sidecar, a key or a configuration file beside a picture is
        // not something a publish may put on a public site.
        // The build names a source the way the author's text does, escapes and
        // all, and this is where they are read back: one decode, at the moment
        // the file is opened, shared with the deck's image reader.
        let source = confine_asset(&document_root, &decode_reference(&copy.from)?)?;
        if !is_publishable_asset(&copy.to) {
            return Err(format!(
                "{} is not a file a published version carries",
                copy.to
            ));
        }
        let target = confined_target(&root, &copy.to)?;
        let bytes = fs::read(&source)
            .map_err(|error| format!("cannot read {}: {error}", source.display()))?;
        write_file(&target, &bytes)?;
    }

    let hash = version_hash(&listing_of(&root)?);
    Ok(Staged {
        path: staging.to_path_buf(),
        hash,
    })
}

/// Install the staged tree as one version, or leave the one that is there.
pub fn install_version(
    layout: &SiteLayout,
    id: &str,
    token: &str,
    staged: &Staged,
) -> Result<Installed, String> {
    check_names(id, token, &staged.hash)?;
    let target = layout.version(id, token, &staged.hash);
    if target.exists() {
        let there = version_hash(&listing_of(&target)?);
        if there == staged.hash {
            // The version is already published, byte for byte. Nothing is
            // written into it, today or ever again.
            return Ok(Installed::default());
        }
        return Err(format!(
            "the version folder for {} holds a different tree; a hash naming two trees is a bug in the hash, not a merge",
            staged.hash
        ));
    }
    let mut written = Vec::new();
    copy_tree(&staged.path, &target, &mut |path| {
        written.push(relative_to_repo(layout, path));
    })?;
    written.sort();
    Ok(Installed {
        created: true,
        written,
    })
}

/// Write `latest.json`, the one file a publish rewrites beneath a token.
pub fn write_latest(
    layout: &SiteLayout,
    id: &str,
    token: &str,
    hash: &str,
) -> Result<Vec<String>, String> {
    check_names(id, token, hash)?;
    let path = layout.stable(id, token).join("latest.json");
    let text = format!("{{\n  \"schema_version\": 1,\n  \"hash\": \"{hash}\"\n}}\n");
    Ok(write_where_bytes_differ(layout, &path, text.as_bytes())?
        .into_iter()
        .collect())
}

/// Copy the shell to the stable link and the stable deck link.
///
/// Both are byte-identical to the root shell, so the routing script is the
/// only thing that tells any page of this site from another.
pub fn write_stable_shells(
    layout: &SiteLayout,
    id: &str,
    token: &str,
) -> Result<Vec<String>, String> {
    check_names(id, token, id)?;
    let stable = layout.stable(id, token);
    let mut written = Vec::new();
    for path in [stable.join("index.html"), stable.join("slides/index.html")] {
        written.extend(write_where_bytes_differ(layout, &path, SHELL.as_bytes())?);
    }
    Ok(written)
}

/// Lay the site's shared files down where they are missing or out of date.
///
/// The chrome is written outside every version folder, so a presenter
/// improvement reaches every version and no version's content changes.
pub fn scaffold(layout: &SiteLayout, base_url: &str) -> Result<Vec<String>, String> {
    let mut written = Vec::new();
    let site = layout.site();
    for (name, text) in CHROME.iter().chain(ENGINE.iter()) {
        written.extend(write_where_bytes_differ(
            layout,
            &site.join(name),
            text.as_bytes(),
        )?);
    }
    for (name, text) in TOOLING.iter() {
        written.extend(write_where_bytes_differ(
            layout,
            &layout.repo.join(name),
            text.as_bytes(),
        )?);
    }
    let config = format!(
        "{{\n  \"schema_version\": 1,\n  \"base_url\": \"{base_url}\",\n  \"site_dir\": \"{}\"\n}}\n",
        layout.site_dir
    );
    written.extend(write_where_bytes_differ(
        layout,
        &layout.repo.join("publish-site.json"),
        config.as_bytes(),
    )?);
    Ok(written)
}

/// Refuse anything that is not a published name before it becomes a path.
fn check_names(id: &str, token: &str, hash: &str) -> Result<(), String> {
    for (what, value) in [("id", id), ("token", token), ("hash", hash)] {
        if !is_identifier(value) {
            return Err(format!("the {what} is not a published name: {value}"));
        }
    }
    Ok(())
}

/// Resolve a built path inside the staging tree, refusing a climb out of it.
///
/// A climb is a `..` segment, not the two characters anywhere in the name: a
/// file the author called `lantern..jpg` is a file, not an escape.
fn confined_target(root: &Path, relative: &str) -> Result<PathBuf, String> {
    if relative.starts_with('/') || relative.split('/').any(|segment| segment == "..") {
        return Err(format!("{relative} is not a path inside the version"));
    }
    let target = root.join(relative);
    let parent = target
        .parent()
        .ok_or_else(|| format!("{relative} has no folder"))?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("cannot create {}: {error}", parent.display()))?;
    confine_path(root, relative)
}

fn write_file(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("cannot create {}: {error}", parent.display()))?;
    }
    fs::write(path, bytes).map_err(|error| format!("cannot write {}: {error}", path.display()))
}

/// Write a file only where its bytes would change, and say what was written.
fn write_where_bytes_differ(
    layout: &SiteLayout,
    path: &Path,
    bytes: &[u8],
) -> Result<Option<String>, String> {
    if let Ok(there) = fs::read(path) {
        if there == bytes {
            return Ok(None);
        }
    }
    write_file(path, bytes)?;
    Ok(Some(relative_to_repo(layout, path)))
}

/// A written path as git wants it: relative to the repository, with `/`.
fn relative_to_repo(layout: &SiteLayout, path: &Path) -> String {
    let relative = path.strip_prefix(&layout.repo).unwrap_or(path);
    let mut out = String::new();
    for part in relative.components() {
        if !out.is_empty() {
            out.push('/');
        }
        out.push_str(&part.as_os_str().to_string_lossy());
    }
    out
}

/// Copy one tree into another, reporting every file written.
///
/// `pub(crate)` because an export copies its staged tree into the folder Alice
/// chose with the same walk a publish installs a version with.
pub(crate) fn copy_tree(
    from: &Path,
    to: &Path,
    written: &mut impl FnMut(&Path),
) -> Result<(), String> {
    fs::create_dir_all(to).map_err(|error| format!("cannot create {}: {error}", to.display()))?;
    let read =
        fs::read_dir(from).map_err(|error| format!("cannot read {}: {error}", from.display()))?;
    for entry in read {
        let entry = entry.map_err(|error| format!("cannot read {}: {error}", from.display()))?;
        let source = entry.path();
        let target = to.join(entry.file_name());
        let kind = entry
            .file_type()
            .map_err(|error| format!("cannot read {}: {error}", source.display()))?;
        if kind.is_dir() {
            copy_tree(&source, &target, written)?;
            continue;
        }
        fs::copy(&source, &target)
            .map_err(|error| format!("cannot copy {}: {error}", source.display()))?;
        written(&target);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const ID: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaa";
    const TOKEN: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbb";

    fn files(body: &str) -> Vec<BuiltFile> {
        vec![
            BuiltFile {
                path: "index.html".to_string(),
                text: format!("<h1>{body}</h1>\n"),
            },
            BuiltFile {
                path: "slides/index.html".to_string(),
                text: format!("<section>{body}</section>\n"),
            },
        ]
    }

    struct Fixture {
        _cache: tempfile::TempDir,
        _repo: tempfile::TempDir,
        document: tempfile::TempDir,
        staging: PathBuf,
        layout: SiteLayout,
    }

    fn fixture() -> Fixture {
        let cache = tempfile::tempdir().expect("temp dir");
        let repo = tempfile::tempdir().expect("temp dir");
        let document = tempfile::tempdir().expect("temp dir");
        let staging = cache.path().join("publish-staging");
        let layout = SiteLayout::new(repo.path(), "site");
        Fixture {
            _cache: cache,
            _repo: repo,
            document,
            staging,
            layout,
        }
    }

    #[test]
    fn stage_hashes_what_it_wrote() {
        let fixture = fixture();
        let staged = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("The Lantern Papers"),
            &[],
        )
        .expect("staged");
        assert_eq!(staged.hash, "fsirhjtwyqgsgh2gvayaqgtmwy");
        assert!(fixture.staging.join("slides/index.html").exists());
    }

    #[test]
    fn stage_copies_an_asset_disk_to_disk() {
        let fixture = fixture();
        fs::create_dir_all(fixture.document.path().join("01-part/assets")).expect("folders");
        fs::write(
            fixture.document.path().join("01-part/assets/lantern.jpg"),
            b"not really a jpeg",
        )
        .expect("write");
        let staged = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[AssetCopy {
                from: "01-part/assets/lantern.jpg".to_string(),
                to: "assets/01-part/lantern.jpg".to_string(),
            }],
        )
        .expect("staged");
        assert_eq!(
            fs::read(fixture.staging.join("assets/01-part/lantern.jpg")).expect("read"),
            b"not really a jpeg"
        );
        assert!(is_identifier(&staged.hash));
    }

    #[test]
    fn stage_copies_an_asset_whose_name_carries_a_space() {
        // The build names the source the way the text does — escaped — and the
        // version folder carries it under a name that needs no escaping.
        let fixture = fixture();
        fs::create_dir_all(fixture.document.path().join("01-part/assets")).expect("folders");
        fs::write(
            fixture.document.path().join("01-part/assets/a lantern.jpg"),
            b"not really a jpeg",
        )
        .expect("write");
        let staged = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[AssetCopy {
                from: "01-part/assets/a%20lantern.jpg".to_string(),
                to: "assets/01-part/a-lantern.jpg".to_string(),
            }],
        )
        .expect("staged");
        assert_eq!(
            fs::read(fixture.staging.join("assets/01-part/a-lantern.jpg")).expect("read"),
            b"not really a jpeg"
        );
        assert!(is_identifier(&staged.hash));
    }

    #[test]
    fn stage_refuses_a_source_whose_escapes_decode_to_a_climb() {
        let fixture = fixture();
        let outside = tempfile::tempdir().expect("temp dir");
        fs::write(outside.path().join("secret.png"), b"secret").expect("write");
        let message = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[AssetCopy {
                from: "01-part/%2e%2e/%2e%2e/secret.png".to_string(),
                to: "assets/01-part/secret.png".to_string(),
            }],
        )
        .expect_err("refused");
        assert!(message.contains("outside the open document"), "{message}");
    }

    #[test]
    fn stage_refuses_a_built_path_that_climbs_out_of_the_version() {
        let fixture = fixture();
        let message = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &[BuiltFile {
                path: "../escaped.html".to_string(),
                text: "no".to_string(),
            }],
            &[],
        )
        .expect_err("refused");
        assert!(
            message.contains("not a path inside the version"),
            "{message}"
        );
    }

    #[test]
    fn stage_refuses_an_asset_outside_the_document_folder() {
        let fixture = fixture();
        let outside = tempfile::tempdir().expect("temp dir");
        fs::write(outside.path().join("secret.png"), b"secret").expect("write");
        let from = outside
            .path()
            .join("secret.png")
            .to_string_lossy()
            .into_owned();
        let message = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[AssetCopy {
                from,
                to: "assets/secret.png".to_string(),
            }],
        )
        .expect_err("refused");
        assert!(message.contains("outside the open document"), "{message}");
    }

    #[test]
    fn stage_refuses_an_asset_that_is_not_one_a_version_carries() {
        // The build names what to copy and the build runs in the web view, so a
        // sidecar beside a picture must not be able to reach a public site.
        let fixture = fixture();
        fs::create_dir_all(fixture.document.path().join("01-part/assets")).expect("folders");
        fs::write(
            fixture.document.path().join("01-part/assets/deploy.key"),
            b"a private key",
        )
        .expect("write");
        let message = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[AssetCopy {
                from: "01-part/assets/deploy.key".to_string(),
                to: "assets/01-part/deploy.key".to_string(),
            }],
        )
        .expect_err("refused");
        assert!(
            message.contains("not an image this phase carries"),
            "{message}"
        );

        // And the target name is held to the same list, so a picture cannot be
        // renamed into something else on its way into the version.
        fs::write(
            fixture.document.path().join("01-part/assets/lantern.png"),
            b"not really a png",
        )
        .expect("write");
        let renamed = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[AssetCopy {
                from: "01-part/assets/lantern.png".to_string(),
                to: "assets/01-part/lantern.key".to_string(),
            }],
        )
        .expect_err("refused");
        assert!(
            renamed.contains("not a file a published version carries"),
            "{renamed}"
        );
    }

    #[test]
    fn stage_takes_a_file_whose_name_merely_carries_two_dots() {
        let fixture = fixture();
        fs::create_dir_all(fixture.document.path().join("01-part/assets")).expect("folders");
        fs::write(
            fixture.document.path().join("01-part/assets/lantern..png"),
            b"not really a png",
        )
        .expect("write");
        let staged = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[AssetCopy {
                from: "01-part/assets/lantern..png".to_string(),
                to: "assets/01-part/lantern..png".to_string(),
            }],
        )
        .expect("staged");
        assert!(fixture.staging.join("assets/01-part/lantern..png").exists());
        assert!(is_identifier(&staged.hash));
    }

    #[test]
    fn existing_version_folder_is_never_written() {
        let fixture = fixture();
        let staged = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[],
        )
        .expect("staged");
        let first = install_version(&fixture.layout, ID, TOKEN, &staged).expect("installed");
        assert!(first.created);

        let version = fixture.layout.version(ID, TOKEN, &staged.hash);
        let before = fs::metadata(version.join("index.html"))
            .and_then(|meta| meta.modified())
            .expect("a timestamp");

        let again = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[],
        )
        .expect("staged");
        assert_eq!(again.hash, staged.hash);
        let second = install_version(&fixture.layout, ID, TOKEN, &again).expect("installed");
        assert!(!second.created);
        assert!(second.written.is_empty(), "nothing was written into it");
        let after = fs::metadata(version.join("index.html"))
            .and_then(|meta| meta.modified())
            .expect("a timestamp");
        assert_eq!(before, after, "the version folder was touched");
    }

    #[test]
    fn stage_refuses_a_hash_that_names_a_different_tree() {
        let fixture = fixture();
        let staged = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[],
        )
        .expect("staged");
        install_version(&fixture.layout, ID, TOKEN, &staged).expect("installed");
        // Something else wrote a different tree under this hash.
        fs::write(
            fixture
                .layout
                .version(ID, TOKEN, &staged.hash)
                .join("index.html"),
            b"tampered\n",
        )
        .expect("write");
        let message = install_version(&fixture.layout, ID, TOKEN, &staged).expect_err("refused");
        assert!(message.contains("different tree"), "{message}");
    }

    #[test]
    fn a_second_publish_touches_only_latest_json_and_the_new_version() {
        let fixture = fixture();
        let first = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("one"),
            &[],
        )
        .expect("staged");
        install_version(&fixture.layout, ID, TOKEN, &first).expect("installed");
        write_latest(&fixture.layout, ID, TOKEN, &first.hash).expect("latest");
        write_stable_shells(&fixture.layout, ID, TOKEN).expect("shells");

        let old_version = fixture.layout.version(ID, TOKEN, &first.hash);
        let old_bytes = fs::read(old_version.join("index.html")).expect("read");
        let old_modified = fs::metadata(old_version.join("index.html"))
            .and_then(|meta| meta.modified())
            .expect("a timestamp");

        let second = stage_version(
            &fixture.staging,
            fixture.document.path(),
            &files("two"),
            &[],
        )
        .expect("staged");
        assert_ne!(second.hash, first.hash);
        let installed = install_version(&fixture.layout, ID, TOKEN, &second).expect("installed");
        let latest = write_latest(&fixture.layout, ID, TOKEN, &second.hash).expect("latest");
        let shells = write_stable_shells(&fixture.layout, ID, TOKEN).expect("shells");

        assert!(installed.created);
        assert_eq!(latest.len(), 1, "latest.json is the one file rewritten");
        assert!(latest[0].ends_with("latest.json"));
        assert!(shells.is_empty(), "the shell copies did not change");
        assert_eq!(
            fs::read(old_version.join("index.html")).expect("read"),
            old_bytes,
            "the earlier version's bytes changed"
        );
        assert_eq!(
            fs::metadata(old_version.join("index.html"))
                .and_then(|meta| meta.modified())
                .expect("a timestamp"),
            old_modified
        );
    }

    #[test]
    fn shell_copies_are_byte_identical() {
        let fixture = fixture();
        scaffold(&fixture.layout, "https://example.invalid").expect("scaffolded");
        write_stable_shells(&fixture.layout, ID, TOKEN).expect("shells");
        let site = fixture.layout.site();
        let root = fs::read(site.join("index.html")).expect("read");
        for path in [
            site.join("404.html"),
            site.join(ID).join(TOKEN).join("index.html"),
            site.join(ID).join(TOKEN).join("slides/index.html"),
        ] {
            assert_eq!(fs::read(&path).expect("read"), root, "{}", path.display());
        }
    }

    #[test]
    fn scaffold_writes_the_chrome_once_and_then_nothing() {
        let fixture = fixture();
        let first = scaffold(&fixture.layout, "https://example.invalid").expect("scaffolded");
        assert!(first.iter().any(|path| path.ends_with("presenter.js")));
        assert!(first
            .iter()
            .any(|path| path == ".github/workflows/publish.yml"));
        assert!(first.iter().any(|path| path == "tools/verify-site.mjs"));
        let again = scaffold(&fixture.layout, "https://example.invalid").expect("scaffolded");
        assert!(again.is_empty(), "the chrome was rewritten: {again:?}");
    }

    #[test]
    fn latest_json_names_no_variant() {
        let fixture = fixture();
        write_latest(&fixture.layout, ID, TOKEN, "cccccccccccccccccccccccccc").expect("latest");
        let text =
            fs::read_to_string(fixture.layout.stable(ID, TOKEN).join("latest.json")).expect("read");
        assert!(
            text.contains("\"hash\": \"cccccccccccccccccccccccccc\""),
            "{text}"
        );
        for word in ["variant", "talk", "full"] {
            assert!(!text.contains(word), "latest.json names a variant: {text}");
        }
    }

    #[test]
    fn stage_refuses_a_name_that_is_not_an_identifier() {
        let fixture = fixture();
        assert!(write_latest(&fixture.layout, "v", TOKEN, "cccccccccccccccccccccccccc").is_err());
        assert!(write_latest(&fixture.layout, ID, TOKEN, "7f3a91c2e4d85b06").is_err());
    }
}
