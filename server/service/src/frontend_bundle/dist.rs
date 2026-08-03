use std::io::{Read, Seek, Write};
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};
use walkdir::WalkDir;

/// The version marker the front-end release workflow writes into every dist zip.
/// It is unpacked alongside `index.html`, so the server also serves it at
/// `/VERSION.txt` — deployed versions stay inspectable.
pub(crate) const VERSION_FILE: &str = "VERSION.txt";

/// The old UI lives in a subdirectory of the front-end dir by convention and is built
/// from *this* repo, not the front-end repo. It ships with the installer and is the
/// escape hatch when a synced bundle is broken, so it is never part of a published
/// bundle.
const OLD_UI_DIR: &str = "old-ui";

/// Read the bundle version out of a dist directory's `VERSION.txt`.
///
/// The file is `key: value` lines (`version`, `package`, `commit`); we want `version`.
/// A dist without a readable version cannot be published — we would have no way to
/// order it against other bundles, and ordering is how a site picks which to run.
pub(crate) fn read_version(dist_dir: &Path) -> anyhow::Result<String> {
    let path = dist_dir.join(VERSION_FILE);
    let contents = std::fs::read_to_string(&path)
        .map_err(|e| anyhow::anyhow!("cannot read {}: {e}", path.display()))?;

    parse_version(&contents)
        .ok_or_else(|| anyhow::anyhow!("no `version:` line in {}", path.display()))
}

fn parse_version(contents: &str) -> Option<String> {
    contents.lines().find_map(|line| {
        let (key, value) = line.split_once(':')?;
        (key.trim() == "version").then(|| value.trim().to_string())
    })
}

/// Files that make up a publishable bundle: everything under `dist_dir` except the
/// old UI, as (path-relative-to-root, absolute path) pairs sorted by relative path.
///
/// Sorting matters: it makes the zip — and therefore its sha256 — reproducible for
/// unchanged input, so republishing the same dist twice does not produce two bundles
/// that differ only by file ordering.
fn bundle_files(dist_dir: &Path) -> anyhow::Result<Vec<(String, PathBuf)>> {
    let mut files = Vec::new();

    for entry in WalkDir::new(dist_dir).sort_by_file_name() {
        let entry = entry?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = entry.path().strip_prefix(dist_dir)?;
        // `Path::starts_with` matches whole components, so this excludes the old-ui
        // directory without also excluding a file merely named `old-ui-something`.
        if relative.starts_with(OLD_UI_DIR) {
            continue;
        }
        // Zip entry names are '/'-separated regardless of the host platform, so a
        // bundle zipped on Windows unpacks correctly everywhere.
        let name = relative
            .components()
            .map(|c| c.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/");
        files.push((name, entry.path().to_path_buf()));
    }

    files.sort_by(|(a, _), (b, _)| a.cmp(b));
    Ok(files)
}

/// Zip a dist directory into `writer`, returning the hex sha256 of the bytes written.
///
/// The bundle sits at the zip's top level (`index.html` at the root), matching the
/// layout the front-end release workflow publishes and `build/fetch-frontend.js`
/// expects — so a bundle central produces here and one downloaded from the FE release
/// unpack identically.
///
/// `writer` must be readable as well as writable (a read-write `File`, or a `Cursor`):
/// the hash is taken over the finished archive, so we read back what we wrote rather
/// than hashing a running guess — zip seeks back to write its central directory, so
/// hashing during the write would not describe the final bytes.
pub(crate) fn zip_dist<W: Write + Seek + Read>(
    dist_dir: &Path,
    writer: W,
) -> anyhow::Result<String> {
    if !dist_dir.join("index.html").exists() {
        return Err(anyhow::anyhow!(
            "{} has no index.html — not a front-end dist",
            dist_dir.display()
        ));
    }

    let files = bundle_files(dist_dir)?;
    if files.is_empty() {
        return Err(anyhow::anyhow!("{} is empty", dist_dir.display()));
    }

    let mut zip = zip::ZipWriter::new(writer);
    let options: zip::write::FileOptions<'_, ()> =
        zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    let mut buffer = Vec::new();
    for (name, path) in files {
        zip.start_file(name, options)?;
        buffer.clear();
        std::fs::File::open(&path)?.read_to_end(&mut buffer)?;
        zip.write_all(&buffer)?;
    }

    let mut writer = zip.finish()?;
    writer.flush()?;

    Ok(sha256_of_reader(&mut writer)?)
}

fn sha256_of_reader<R: Read + Seek>(reader: &mut R) -> std::io::Result<String> {
    reader.rewind()?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 64 * 1024];
    loop {
        let read = reader.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hex::encode(hasher.finalize()))
}

/// Hex sha256 of a file on disk. Used to hash an uploaded zip, and (in the download
/// path) to verify received bytes against the sha256 the bundle record carries.
pub fn sha256_of_file(path: &Path) -> anyhow::Result<String> {
    let mut file = std::fs::File::open(path)?;
    Ok(sha256_of_reader(&mut file)?)
}

/// Read the version out of an already-built zip, without unpacking it. Used by the
/// manual-upload path, which has a zip rather than a directory.
pub(crate) fn read_version_from_zip(path: &Path) -> anyhow::Result<String> {
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    if archive.by_name("index.html").is_err() {
        return Err(anyhow::anyhow!(
            "zip has no index.html at its root — wrong layout?"
        ));
    }

    let mut version_file = archive
        .by_name(VERSION_FILE)
        .map_err(|_| anyhow::anyhow!("zip has no {VERSION_FILE}"))?;
    let mut contents = String::new();
    version_file.read_to_string(&mut contents)?;

    parse_version(&contents).ok_or_else(|| anyhow::anyhow!("no `version:` line in {VERSION_FILE}"))
}

#[cfg(test)]
mod test {
    use super::*;
    use std::io::Cursor;

    fn write(path: &Path, contents: &str) {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, contents).unwrap();
    }

    /// A minimal dist: index.html, a hashed asset, VERSION.txt, and an old UI that
    /// must not be included.
    fn dist(dir: &Path) {
        write(&dir.join("index.html"), "<html>app</html>");
        write(&dir.join("assets/app-abc123.js"), "console.log(1)");
        write(
            &dir.join(VERSION_FILE),
            "version: v1.2.3\npackage: 0.0.1\ncommit: deadbeef\n",
        );
        write(&dir.join("old-ui/index.html"), "<html>old</html>");
    }

    #[test]
    fn reads_version_from_version_file() {
        let temp = tempfile::tempdir().unwrap();
        dist(temp.path());
        assert_eq!(read_version(temp.path()).unwrap(), "v1.2.3");
    }

    #[test]
    fn missing_version_file_is_an_error_not_a_default() {
        let temp = tempfile::tempdir().unwrap();
        write(&temp.path().join("index.html"), "<html>app</html>");
        assert!(read_version(temp.path()).is_err());
    }

    #[test]
    fn zip_excludes_old_ui_and_keeps_bundle_at_root() {
        let temp = tempfile::tempdir().unwrap();
        dist(temp.path());

        let mut buffer = Cursor::new(Vec::new());
        zip_dist(temp.path(), &mut buffer).unwrap();

        let mut archive = zip::ZipArchive::new(buffer).unwrap();
        let names: Vec<String> = (0..archive.len())
            .map(|i| archive.by_index(i).unwrap().name().to_string())
            .collect();

        // index.html at the zip root is what fetch-frontend.js and our own unpack
        // both check for.
        assert!(names.contains(&"index.html".to_string()));
        assert!(names.contains(&"assets/app-abc123.js".to_string()));
        assert!(names.contains(&VERSION_FILE.to_string()));
        // The old UI ships with the installer and is the escape hatch — never synced.
        assert!(
            !names.iter().any(|n| n.starts_with("old-ui")),
            "old-ui was included: {names:?}"
        );
    }

    #[test]
    fn zip_of_unchanged_dist_is_reproducible() {
        let temp = tempfile::tempdir().unwrap();
        dist(temp.path());

        let mut first = Cursor::new(Vec::new());
        let hash_a = zip_dist(temp.path(), &mut first).unwrap();
        let mut second = Cursor::new(Vec::new());
        let hash_b = zip_dist(temp.path(), &mut second).unwrap();

        // Same input, same hash — so republishing the same dist can be detected
        // rather than producing a second bundle that differs only by file order.
        assert_eq!(hash_a, hash_b);
        assert_eq!(first.into_inner(), second.into_inner());
    }

    #[test]
    fn hash_changes_when_a_file_changes() {
        let temp = tempfile::tempdir().unwrap();
        dist(temp.path());
        let mut buffer = Cursor::new(Vec::new());
        let before = zip_dist(temp.path(), &mut buffer).unwrap();

        write(&temp.path().join("assets/app-abc123.js"), "console.log(2)");
        let mut buffer = Cursor::new(Vec::new());
        let after = zip_dist(temp.path(), &mut buffer).unwrap();

        assert_ne!(before, after);
    }

    #[test]
    fn refuses_a_directory_that_is_not_a_dist() {
        let temp = tempfile::tempdir().unwrap();
        write(&temp.path().join("readme.md"), "not a dist");
        let mut buffer = Cursor::new(Vec::new());
        assert!(zip_dist(temp.path(), &mut buffer).is_err());
    }

    #[test]
    fn round_trips_version_through_a_zip() {
        let temp = tempfile::tempdir().unwrap();
        dist(temp.path());

        // Zip to a path outside the dist, then read the version back out of the
        // archive — the manual-upload path only ever has the zip.
        let out = tempfile::tempdir().unwrap();
        let zip_path = out.path().join("bundle.zip");
        let file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(true)
            .open(&zip_path)
            .unwrap();
        let hash = zip_dist(temp.path(), file).unwrap();

        assert_eq!(read_version_from_zip(&zip_path).unwrap(), "v1.2.3");
        // The hash zip_dist reports is the hash of the bytes actually on disk.
        assert_eq!(sha256_of_file(&zip_path).unwrap(), hash);
    }

    #[test]
    fn rejects_a_zip_without_a_bundle_at_its_root() {
        let temp = tempfile::tempdir().unwrap();
        let zip_path = temp.path().join("not-a-bundle.zip");

        let file = std::fs::File::create(&zip_path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default();
        zip.start_file("some/nested/index.html", options).unwrap();
        zip.write_all(b"<html></html>").unwrap();
        zip.finish().unwrap();

        // index.html must be at the zip root — an uploaded zip with the bundle nested
        // one level down would unpack to a directory the server can't serve.
        assert!(read_version_from_zip(&zip_path).is_err());
    }
}
