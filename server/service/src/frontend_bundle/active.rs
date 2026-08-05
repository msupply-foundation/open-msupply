//! Turning a downloaded bundle into the front end the server actually serves.
//!
//! Three steps, kept separate because they fail differently: verify the bytes against
//! the sha256 the record carries, unpack them somewhere safe, and point serving at the
//! result. See `server/spec/sync/frontend-sync.md` § Selection and serving.

use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use repository::{
    sync_file_reference_row::{SyncFileReferenceRowRepository, SyncFileStatus},
    FrontendBundleRow, RepositoryError, StorageConnection,
};
use thiserror::Error;

use crate::static_files::{StaticFileCategory, StaticFileService};

use super::{dist, FRONTEND_BUNDLE_TABLE};

/// Where unpacked bundles live, relative to `base_dir`.
///
/// Deliberately **not** inside `frontend_dir`: on Android the app shell deletes and
/// re-copies `<filesDir>/frontend` from the APK whenever the app version changes, so a
/// synced bundle stored there would be destroyed by every upgrade. `frontend_dir` stays
/// the installer-shipped baseline and the fallback.
const BUNDLES_DIR: &str = "frontend_bundles";

/// How many unpacked bundles to keep. The active one plus one more: a browser tab that
/// loaded the previous bundle holds `immutable, max-age=1y` content-hashed asset URLs,
/// and those files must still exist for it to keep working until the user reloads.
const RETAINED_BUNDLES: usize = 2;

/// The bundle currently being served, if any.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ActiveBundle {
    pub version: String,
    /// Directory to serve assets from — the unpacked bundle's root.
    pub root: PathBuf,
}

/// Shared handle to the active bundle, read on every asset request.
///
/// Lives on `ServiceProvider` and is cloned into the HTTP app data, so serving resolves
/// its root from memory and never touches the database or its connection pool.
#[derive(Clone, Default)]
pub struct ActiveFrontendBundle(Arc<RwLock<Option<ActiveBundle>>>);

impl ActiveFrontendBundle {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(&self) -> Option<ActiveBundle> {
        self.0.read().ok().and_then(|guard| guard.clone())
    }

    /// Only `reconcile_active_bundle` should call this — activation has to run the
    /// selection rule, not just set a pointer.
    pub(super) fn set(&self, bundle: Option<ActiveBundle>) {
        if let Ok(mut guard) = self.0.write() {
            *guard = bundle;
        }
    }

    /// Set the active bundle directly, for tests in crates that only need to exercise
    /// *serving* (the server crate's `serve_frontend`) without running a real activation.
    pub fn set_for_test(&self, bundle: ActiveBundle) {
        self.set(Some(bundle));
    }
}

#[derive(Error, Debug)]
pub enum ActivateBundleError {
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("Bundle {0} has no file reference")]
    NoFileReference(String),
    #[error("Bundle {version} bytes are not downloaded yet")]
    NotDownloaded { version: String },
    #[error("Bundle {version} failed its checksum (expected {expected}, got {actual})")]
    ChecksumMismatch {
        version: String,
        expected: String,
        actual: String,
    },
    #[error("Bundle version {0} is not usable as a directory name")]
    UnsafeVersion(String),
    #[error("Could not unpack the bundle")]
    UnpackError(#[source] anyhow::Error),
}

pub fn bundles_dir(base_dir: &str) -> PathBuf {
    PathBuf::from(base_dir).join(BUNDLES_DIR)
}

/// Directory name for a bundle. The version is used rather than the id so an
/// administrator poking around on disk can see what is there.
///
/// Versions come from `VERSION.txt` inside a bundle, i.e. ultimately from outside this
/// process, so anything that isn't plainly safe as a single path component is rejected
/// rather than sanitised — quietly rewriting it could collapse two versions onto one
/// directory. Real versions (`v1.2.3`) pass.
fn dir_name_for(version: &str) -> Result<String, ActivateBundleError> {
    let safe = !version.is_empty()
        && version.len() <= 64
        && version
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
        // `.` and `..` are path components, not names.
        && version.chars().any(|c| c != '.');

    if safe {
        Ok(version.to_string())
    } else {
        Err(ActivateBundleError::UnsafeVersion(version.to_string()))
    }
}

/// Is this bundle already unpacked and servable?
///
/// The path is canonicalised, because serving resolves each asset path and checks it is
/// still inside the root — a root containing a symlink (a symlinked data directory, or
/// `/tmp` on macOS) would fail that check for every asset and serve nothing.
pub fn unpacked_root(base_dir: &str, version: &str) -> Option<PathBuf> {
    let dir = bundles_dir(base_dir).join(dir_name_for(version).ok()?);
    if !dir.join("index.html").is_file() {
        return None;
    }
    dir.canonicalize().ok()
}

/// Verify a downloaded bundle's bytes and unpack them, returning the servable root.
///
/// Stage-then-swap, the same shape as `fetch-frontend.js` and the Android app shell's
/// asset copy: an interrupted unpack can never leave a half-populated directory being
/// served. A checksum failure also discards the partial download, because a resumed
/// download of corrupt bytes would fail forever.
pub fn verify_and_unpack(
    connection: &StorageConnection,
    static_file_service: &StaticFileService,
    base_dir: &str,
    bundle: &FrontendBundleRow,
) -> Result<PathBuf, ActivateBundleError> {
    let references =
        SyncFileReferenceRowRepository::new(connection).find_all_by_record_id(&bundle.id)?;
    let reference = references
        .into_iter()
        .find(|r| r.table_name == FRONTEND_BUNDLE_TABLE)
        .ok_or_else(|| ActivateBundleError::NoFileReference(bundle.id.clone()))?;

    if reference.status != SyncFileStatus::Done {
        return Err(ActivateBundleError::NotDownloaded {
            version: bundle.version.clone(),
        });
    }

    let category =
        StaticFileCategory::SyncFile(FRONTEND_BUNDLE_TABLE.to_string(), bundle.id.clone());
    let file = static_file_service
        .find_file(&reference.id, category)
        .map_err(ActivateBundleError::UnpackError)?
        .ok_or_else(|| ActivateBundleError::NotDownloaded {
            version: bundle.version.clone(),
        })?;

    let zip_path = PathBuf::from(&file.path);
    let actual = dist::sha256_of_file(&zip_path).map_err(ActivateBundleError::UnpackError)?;
    if actual != bundle.sha256 {
        // The bytes we hold are not the bytes central published. Throw away both the
        // assembled file and any partial, so the next attempt starts clean.
        let _ = std::fs::remove_file(&zip_path);
        static_file_service.discard_partial_download(&reference);
        return Err(ActivateBundleError::ChecksumMismatch {
            version: bundle.version.clone(),
            expected: bundle.sha256.clone(),
            actual,
        });
    }

    let target = bundles_dir(base_dir).join(dir_name_for(&bundle.version)?);
    let staging = target.with_extension("tmp");

    let unpack = || -> anyhow::Result<()> {
        let _ = std::fs::remove_dir_all(&staging);
        std::fs::create_dir_all(&staging)?;
        unzip_into(&zip_path, &staging)?;

        if !staging.join("index.html").is_file() {
            return Err(anyhow::anyhow!("unpacked bundle has no index.html at root"));
        }

        let _ = std::fs::remove_dir_all(&target);
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::rename(&staging, &target)?;
        Ok(())
    };

    if let Err(error) = unpack() {
        let _ = std::fs::remove_dir_all(&staging);
        return Err(ActivateBundleError::UnpackError(error));
    }

    log::info!(
        "Unpacked front-end bundle {} to {:?}",
        bundle.version,
        target
    );
    // Canonical, for the same reason as `unpacked_root`.
    Ok(target.canonicalize().unwrap_or(target))
}

/// Extract a zip into `target`, refusing entries that would escape it.
///
/// `enclosed_name` is the zip crate's guard against zip-slip (`../` traversal, absolute
/// paths, Windows drive prefixes). A bundle arrives over authenticated sync, but it is
/// still archive data from off-box and gets unpacked with server privileges.
fn unzip_into(zip_path: &Path, target: &Path) -> anyhow::Result<()> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index)?;
        let Some(relative) = entry.enclosed_name() else {
            return Err(anyhow::anyhow!(
                "zip entry '{}' would escape the target directory",
                entry.name()
            ));
        };
        let out_path = target.join(relative);

        if entry.is_dir() {
            std::fs::create_dir_all(&out_path)?;
            continue;
        }
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut buffer = Vec::with_capacity(entry.size() as usize);
        entry.read_to_end(&mut buffer)?;
        std::fs::write(&out_path, buffer)?;
    }

    Ok(())
}

/// Delete unpacked bundles we no longer need, keeping [`RETAINED_BUNDLES`].
///
/// `keep_first` is the active bundle's directory name; the rest are ranked by the version
/// ordering of `known` (newest first), so what survives is stable across restarts rather
/// than depending on what happened to be active last time.
pub fn prune_unpacked(base_dir: &str, keep_first: Option<&str>, known: &[FrontendBundleRow]) {
    let dir = bundles_dir(base_dir);
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return;
    };

    let mut present: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        // Leave staging directories to their own cleanup.
        .filter(|name| !name.ends_with(".tmp"))
        .collect();

    // Newest first, by version order rather than name order ("1.10.0" > "1.2.0").
    let rank = |name: &String| {
        known
            .iter()
            .find(|b| dir_name_for(&b.version).ok().as_deref() == Some(name.as_str()))
            .map(|b| repository::migrations::Version::from_str(&b.version))
    };
    present.sort_by(|a, b| rank(b).cmp(&rank(a)));

    let mut keep: Vec<String> = Vec::new();
    if let Some(first) = keep_first {
        if present.iter().any(|n| n == first) {
            keep.push(first.to_string());
        }
    }
    for name in &present {
        if keep.len() >= RETAINED_BUNDLES {
            break;
        }
        if !keep.contains(name) {
            keep.push(name.clone());
        }
    }

    for name in present {
        if keep.contains(&name) {
            continue;
        }
        let path = dir.join(&name);
        match std::fs::remove_dir_all(&path) {
            Ok(()) => log::info!("Removed superseded front-end bundle {:?}", path),
            Err(error) => log::warn!("Could not remove {:?}: {}", path, error),
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use std::io::Write;

    fn write_zip(path: &Path, entries: &[(&str, &str)]) -> String {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        let file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(true)
            .open(path)
            .unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default();
        for (name, contents) in entries {
            zip.start_file(*name, options).unwrap();
            zip.write_all(contents.as_bytes()).unwrap();
        }
        zip.finish().unwrap();
        dist::sha256_of_file(path).unwrap()
    }

    #[test]
    fn unzip_rejects_entries_that_escape_the_target() {
        let temp = tempfile::tempdir().unwrap();
        let zip_path = temp.path().join("evil.zip");
        write_zip(&zip_path, &[("../escaped.txt", "pwned")]);

        let target = temp.path().join("unpacked");
        std::fs::create_dir_all(&target).unwrap();

        // A bundle arrives over authenticated sync, but it is still archive data from
        // off-box unpacked with server privileges — zip-slip must be refused.
        assert!(unzip_into(&zip_path, &target).is_err());
        assert!(!temp.path().join("escaped.txt").exists());
    }

    #[test]
    fn unzip_writes_nested_entries() {
        let temp = tempfile::tempdir().unwrap();
        let zip_path = temp.path().join("bundle.zip");
        write_zip(
            &zip_path,
            &[
                ("index.html", "<html>app</html>"),
                ("assets/app-abc.js", "console.log(1)"),
                ("VERSION.txt", "version: v1.0.0\n"),
            ],
        );

        let target = temp.path().join("unpacked");
        unzip_into(&zip_path, &target).unwrap();

        assert_eq!(
            std::fs::read_to_string(target.join("index.html")).unwrap(),
            "<html>app</html>"
        );
        assert_eq!(
            std::fs::read_to_string(target.join("assets/app-abc.js")).unwrap(),
            "console.log(1)"
        );
    }

    #[test]
    fn version_must_be_safe_as_a_directory_name() {
        // Real versions.
        assert_eq!(dir_name_for("v1.2.3").unwrap(), "v1.2.3");
        assert_eq!(dir_name_for("1.2.3-rc1").unwrap(), "1.2.3-rc1");

        // A version comes from VERSION.txt inside a bundle, i.e. from outside this
        // process. Anything that isn't plainly a safe single path component is rejected
        // rather than sanitised.
        for bad in [
            "../etc",
            "a/b",
            "a\\b",
            "..",
            ".",
            "",
            "with space",
            "semi;colon",
        ] {
            assert!(dir_name_for(bad).is_err(), "should reject {bad:?}");
        }
    }

    #[test]
    fn unpacked_root_requires_an_index_html() {
        let temp = tempfile::tempdir().unwrap();
        let base = temp.path().to_string_lossy().to_string();

        assert_eq!(unpacked_root(&base, "v1.0.0"), None);

        // A directory alone isn't enough — a half-populated one must not be served.
        let dir = bundles_dir(&base).join("v1.0.0");
        std::fs::create_dir_all(&dir).unwrap();
        assert_eq!(unpacked_root(&base, "v1.0.0"), None);

        std::fs::write(dir.join("index.html"), "<html></html>").unwrap();
        // Canonical, so serving's path-traversal check compares like with like.
        assert_eq!(
            unpacked_root(&base, "v1.0.0"),
            Some(dir.canonicalize().unwrap())
        );
    }

    fn row(version: &str) -> FrontendBundleRow {
        FrontendBundleRow {
            id: version.to_string(),
            version: version.to_string(),
            server_version: "3.0.0".to_string(),
            sha256: "hash".to_string(),
            is_active: true,
            description: None,
            created_datetime: chrono::NaiveDate::from_ymd_opt(2026, 8, 4)
                .unwrap()
                .and_hms_opt(9, 0, 0)
                .unwrap(),
        }
    }

    fn unpack_fake(base: &str, version: &str) {
        let dir = bundles_dir(base).join(version);
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("index.html"), version).unwrap();
    }

    fn dirs_present(base: &str) -> Vec<String> {
        let mut names: Vec<String> = std::fs::read_dir(bundles_dir(base))
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .map(|e| e.file_name().to_string_lossy().into_owned())
                    .collect()
            })
            .unwrap_or_default();
        names.sort();
        names
    }

    #[test]
    fn prune_keeps_the_active_bundle_and_one_more() {
        let temp = tempfile::tempdir().unwrap();
        let base = temp.path().to_string_lossy().to_string();

        for version in ["1.0.0", "1.2.0", "1.10.0"] {
            unpack_fake(&base, version);
        }
        let known = vec![row("1.0.0"), row("1.2.0"), row("1.10.0")];

        prune_unpacked(&base, Some("1.10.0"), &known);

        // Active plus the next newest survive; a tab still holding 1.2.0's hashed asset
        // URLs keeps working until it reloads. Ranking is by version order, so 1.10.0
        // beats 1.2.0 (string order would get this backwards).
        assert_eq!(dirs_present(&base), vec!["1.10.0", "1.2.0"]);
    }

    #[test]
    fn prune_leaves_staging_directories_alone() {
        let temp = tempfile::tempdir().unwrap();
        let base = temp.path().to_string_lossy().to_string();

        unpack_fake(&base, "1.0.0");
        std::fs::create_dir_all(bundles_dir(&base).join("1.1.0.tmp")).unwrap();

        prune_unpacked(&base, Some("1.0.0"), &[row("1.0.0")]);

        // An in-flight unpack is not ours to delete; verify_and_unpack owns its staging
        // directory and clears it itself.
        assert_eq!(dirs_present(&base), vec!["1.0.0", "1.1.0.tmp"]);
    }

    /// A directory whose bundle record is gone (deleted on central) ranks *below* every
    /// known bundle, so it loses the retained slot to a real one — but it is not deleted
    /// just for having no record. Retention protects open tabs, and a tab that loaded that
    /// bundle still needs its content-hashed assets regardless of what central has since
    /// deleted.
    #[test]
    fn prune_ranks_unknown_directories_last() {
        let temp = tempfile::tempdir().unwrap();
        let base = temp.path().to_string_lossy().to_string();

        unpack_fake(&base, "1.0.0");
        unpack_fake(&base, "0.9.0-deleted");
        unpack_fake(&base, "1.1.0");

        // Two known bundles fill both slots; the recordless one is reclaimed.
        prune_unpacked(&base, Some("1.1.0"), &[row("1.0.0"), row("1.1.0")]);
        assert_eq!(dirs_present(&base), vec!["1.0.0", "1.1.0"]);
    }

    #[test]
    fn prune_keeps_a_recordless_directory_when_a_slot_is_free() {
        let temp = tempfile::tempdir().unwrap();
        let base = temp.path().to_string_lossy().to_string();

        unpack_fake(&base, "1.0.0");
        unpack_fake(&base, "0.9.0-deleted");

        // Only one known bundle, so the spare slot keeps the previous directory around
        // for tabs that are still on it.
        prune_unpacked(&base, Some("1.0.0"), &[row("1.0.0")]);
        assert_eq!(dirs_present(&base), vec!["0.9.0-deleted", "1.0.0"]);
    }
}
