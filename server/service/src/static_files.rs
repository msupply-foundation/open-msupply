use actix_multipart::form::tempfile::TempFile;
use anyhow::Context;
use repository::sync_file_reference_row::SyncFileReferenceRow;
use reqwest::Response;
use serde::Serialize;
use std::io::Error;
use std::ops::Deref;
use std::path::{Component, Path, PathBuf};
use std::str::FromStr;
use std::time::{Duration, SystemTime};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use util::uuid::uuid;
use util::{move_file, sanitize_filename};

#[derive(Debug, PartialEq, Serialize)]
pub struct StaticFile {
    pub id: String,
    pub name: String,
    pub path: String,
}

const STATIC_FILE_DIR: &str = "static_files";

#[derive(Clone)]
pub enum StaticFileCategory {
    Temporary,
    SyncFile(String, String), // Files to be synced (Table Name, Record Id)
}

/// One component of a sync file's directory, which must be a plain path segment.
///
/// `table_name` and `record_id` reach this module as URL path segments (and, for
/// resumable uploads, from client-supplied TUS metadata). Actix percent-decodes a
/// segment *after* routing, so `%2F` arrives here as a real separator and `..` would
/// climb out of the base directory once joined.
fn validate_path_segment(segment: &str) -> anyhow::Result<()> {
    let mut components = Path::new(segment).components();

    match (components.next(), components.next()) {
        // Exactly one component, and the path didn't normalise anything away
        (Some(Component::Normal(name)), None) if name.to_str() == Some(segment) => Ok(()),
        _ => Err(anyhow::anyhow!(
            "Invalid sync file path segment: {segment:?}"
        )),
    }
}

impl StaticFileCategory {
    pub fn to_path_buf(&self) -> PathBuf {
        match self {
            StaticFileCategory::Temporary => PathBuf::from("tmp"),
            StaticFileCategory::SyncFile(table_name, record_id) => {
                PathBuf::from("sync_files").join(table_name).join(record_id)
            }
        }
    }
}

impl StaticFile {
    pub fn to_path_buf(&self) -> PathBuf {
        PathBuf::from(&self.path)
    }
}

/// Stores files in a temp storage and associate an id with each file.
/// This can, for example, be used to deposition a file for a user and the user can pick up the file
/// by id within a certain time frame.
///
/// Old files are deleted automatically.

#[derive(Debug, Clone)]
pub struct StaticFileService {
    pub dir: PathBuf,
    /// Time [s] for how long static files are kept before they are discarded
    pub max_lifetime_millis: u64,
}
impl StaticFileService {
    pub fn new(base_dir: &str) -> anyhow::Result<Self> {
        let file_dir = PathBuf::from_str(base_dir)?.join(STATIC_FILE_DIR);
        Ok(StaticFileService {
            dir: file_dir,
            max_lifetime_millis: 60 * 60 * 1000, // 1 hours
        })
    }

    /// The on-disk directory for a category, created if missing, guaranteed to be
    /// inside the service's base directory.
    ///
    /// Every path built from a `StaticFileCategory` goes through here, so upload,
    /// download, delete and both sync transports are covered by the one check.
    fn ensure_category_dir(&self, category: &StaticFileCategory) -> anyhow::Result<PathBuf> {
        if let StaticFileCategory::SyncFile(table_name, record_id) = category {
            validate_path_segment(table_name)?;
            validate_path_segment(record_id)?;
        }

        let dir = self.dir.join(category.to_path_buf());
        std::fs::create_dir_all(&dir)?;

        // Second line of defence, the same shape as the guard in
        // `server/src/serve_frontend.rs`: whatever the components were, what they
        // resolve to on disk must still sit under the base directory.
        let canonical_dir = dir.canonicalize()?;
        let canonical_base = self.dir.canonicalize()?;
        if !canonical_dir.starts_with(&canonical_base) {
            return Err(anyhow::anyhow!(
                "Static file directory {canonical_dir:?} is outside {canonical_base:?}"
            ));
        }

        Ok(dir)
    }

    // Temp file in this case refers to system 'TempFile' not our own definition of Temporary file
    // at the time of method creation TempFile only comes from web multipart
    pub fn move_temp_file(
        &self,
        temp_file: &TempFile,
        category: &StaticFileCategory,
        file_id: Option<String>,
    ) -> anyhow::Result<StaticFile> {
        let file_name = temp_file
            .file_name
            .clone()
            .context("Filename not provided")?;
        let sanitized_filename = sanitize_filename(file_name);

        let static_file = self.reserve_file(&sanitized_filename, category, file_id)?;
        let destination = Path::new(&static_file.path);
        // Is this blocking ? If it is it a problem ?
        move_file(temp_file.file.path(), destination).context("Problem moving file")?;

        Ok(static_file)
    }

    /// Checks filepath and creates uuid for a file without creating the file itself
    ///
    /// # Example
    ///
    /// ```
    /// use service::static_files::StaticFileService;
    /// use std::io::Write;
    /// use std::fs::File;
    ///
    /// let static_file_service = StaticFileService::new("/tmp/").unwrap();
    ///
    /// let static_file = static_file_service.reserve_file("test.txt", StaticFileCategory::Temporary).unwrap();
    /// let mut file = File::create(static_file.path).unwrap();
    /// write!(file, "Good thing this filename was reserved, and path created!");
    ///
    /// ```
    pub fn reserve_file(
        &self,
        file_name: &str,
        category: &StaticFileCategory,
        file_id: Option<String>,
    ) -> anyhow::Result<StaticFile> {
        let id = match file_id {
            Some(file_id) => file_id,
            None => uuid(),
        };

        let dir = self.ensure_category_dir(category)?;

        let file_path = dir.join(format!("{id}_{file_name}"));
        Ok(StaticFile {
            id,
            name: file_name.to_string(),
            path: file_path.to_string_lossy().to_string(),
        })
    }

    pub fn store_file(
        &self,
        file_name: &str,
        category: StaticFileCategory,
        bytes: &[u8],
    ) -> anyhow::Result<StaticFile> {
        let id = uuid();

        let dir = self.ensure_category_dir(&category)?;

        let file_path = dir.join(format!("{id}_{file_name}"));
        let file = StaticFile {
            id,
            name: file_name.to_string(),
            path: file_path.to_string_lossy().to_string(),
        };
        std::fs::write(&file.path, bytes)?;
        Ok(file)
    }

    pub fn find_file(
        &self,
        id: &str,
        category: StaticFileCategory,
    ) -> anyhow::Result<Option<StaticFile>> {
        let dir = self.ensure_category_dir(&category)?;

        // clean up the static file directory
        if let StaticFileCategory::Temporary = category {
            delete_temporary_files(&dir, self.max_lifetime_millis)?;
        }

        let file_path = match find_file_in_dir(id, &dir)? {
            Some(path) => path,
            None => return Ok(None),
        };
        let original_file_name = parse_original_file_name(id, &file_path)
            .ok_or_else(|| anyhow::Error::msg("Internal error: can't parse file name"))?;

        Ok(Some(StaticFile {
            id: id.to_string(),
            name: original_file_name,
            path: file_path.to_string_lossy().to_string(),
        }))
    }

    /// Look up a synced file on disk and open it for serving over HTTP. Shared by the
    /// v6 and v7 central `download_file` endpoints (auth differs per transport; the
    /// file lookup does not). `None` = no file with this id on disk.
    pub fn open_sync_file(
        &self,
        table_name: String,
        record_id: String,
        id: &str,
    ) -> anyhow::Result<Option<(actix_files::NamedFile, StaticFile)>> {
        let category = StaticFileCategory::SyncFile(table_name, record_id);
        let Some(file) = self.find_file(id, category)? else {
            return Ok(None);
        };
        let named_file = actix_files::NamedFile::open(&file.path)?;
        Ok(Some((named_file, file)))
    }

    pub async fn download_file_in_chunks(
        &self,
        sync_file: &SyncFileReferenceRow,
        mut download_response: Response,
    ) -> anyhow::Result<StaticFile> {
        let category =
            StaticFileCategory::SyncFile(sync_file.table_name.clone(), sync_file.record_id.clone());

        let file =
            self.reserve_file(&sync_file.file_name, &category, Some(sync_file.id.clone()))?;

        // Stream into a `partial_`-prefixed name that find_file's `{id}_` prefix match can
        // never surface, then rename into place once the stream completes — so an aborted
        // download (dropped request, connection failure) is never served as a complete file.
        // A stale partial file (e.g. this future dropped mid-await) is invisible to lookups
        // and gets truncated by File::create on the next attempt.
        let final_path = PathBuf::from(&file.path);
        let partial_path = final_path.with_file_name(format!(
            "partial_{}",
            final_path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default()
        ));

        let download = async {
            let mut file_handle = File::create(&partial_path).await?;
            loop {
                let Some(bytes) = download_response.chunk().await? else {
                    break;
                };

                tokio::io::copy(&mut bytes.deref(), &mut file_handle).await?;
            }
            file_handle.flush().await?;
            Ok::<_, anyhow::Error>(())
        };

        if let Err(error) = download.await {
            let _ = std::fs::remove_file(&partial_path);
            return Err(error);
        }

        // Same directory, so the rename is atomic.
        std::fs::rename(&partial_path, &final_path)?;

        Ok(StaticFile {
            id: sync_file.id.clone(),
            name: sync_file.file_name.clone(),
            path: file.path.to_string(),
        })
    }
}

/// Returns the file name part of the path like:
/// `./static_file_path/{uuid}_{file_name};
fn parse_original_file_name(id: &str, file_path: &Path) -> Option<String> {
    let file_name = file_path.file_name()?.to_string_lossy();
    let name = &file_name[id.len() + 1..];
    if name.is_empty() {
        // something is wrong...
        return None;
    }
    Some(name.to_string())
}

/// Finds file starting with the provided id
fn find_file_in_dir(id: &str, file_dir: &PathBuf) -> Result<Option<PathBuf>, Error> {
    let starts_with = format!("{id}_");
    let paths = std::fs::read_dir(file_dir)?;
    for path in paths {
        let entry = path?;
        let entry_path = entry.path();
        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => continue,
            Err(err) => return Err(err),
        };
        if !metadata.is_file() {
            continue;
        }

        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(&starts_with) {
            return Ok(Some(entry_path));
        }
    }

    Ok(None)
}

fn delete_temporary_files(file_dir: &PathBuf, max_life_time_millis: u64) -> Result<(), Error> {
    let paths = std::fs::read_dir(file_dir)?;
    for path in paths {
        let entry = path?;
        let entry_path = entry.path();
        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => continue,
            Err(err) => return Err(err),
        };
        if !metadata.is_file() {
            continue;
        }
        let Ok(file_time) = metadata.modified() else {
            continue;
        };
        if SystemTime::now()
            .duration_since(file_time)
            .unwrap_or(Duration::from_secs(0))
            > Duration::from_millis(max_life_time_millis)
        {
            log::info!("Delete old static file: {entry_path:?}");
            std::fs::remove_file(entry_path).unwrap_or_else(|err| {
                log::error!("Failed to delete old static file: {err}");
            });
        }
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use std::{fs, path::PathBuf, str::FromStr, time::Duration};

    use crate::static_files::StaticFileCategory;

    use super::StaticFileService;

    const TEST_DIR: &str = "test_static_files";

    #[test]
    fn test_static_file_storage() {
        let mut service = StaticFileService::new(".").unwrap();
        service.dir = PathBuf::from_str(TEST_DIR).unwrap();
        service.max_lifetime_millis = 100;
        let test_dir = std::env::current_dir().unwrap().join(TEST_DIR);
        if fs::metadata(&test_dir).is_ok() {
            fs::remove_dir_all(&test_dir).unwrap();
        }

        // Temporary file
        let file_in = service
            .store_file(
                "test_file",
                StaticFileCategory::Temporary,
                "data".as_bytes(),
            )
            .unwrap();
        let file_out = service
            .find_file(&file_in.id, StaticFileCategory::Temporary)
            .unwrap()
            .unwrap();
        assert_eq!(file_in, file_out);

        // sync file upload
        let sync_file_in = service
            .store_file(
                "test_sync_file",
                StaticFileCategory::SyncFile("asset".to_string(), "asset_id".to_string()),
                "data".as_bytes(),
            )
            .unwrap();

        let sync_file_out = service
            .find_file(
                &sync_file_in.id,
                StaticFileCategory::SyncFile("asset".to_string(), "asset_id".to_string()),
            )
            .unwrap()
            .unwrap();
        assert_eq!(sync_file_in, sync_file_out);

        std::thread::sleep(Duration::from_millis(service.max_lifetime_millis + 1));

        // Check that the temporary file is deleted after expected lifespan
        assert!(service
            .find_file(&file_in.id, StaticFileCategory::Temporary)
            .unwrap()
            .is_none());

        // Check that the sync file is not deleted
        assert!(service
            .find_file(
                &sync_file_in.id,
                StaticFileCategory::SyncFile("asset".to_string(), "asset_id".to_string())
            )
            .unwrap()
            .is_some());

        // Clean up
        fs::remove_dir_all(&test_dir).unwrap();
    }

    /// Security audit DS-2: `table_name`/`record_id` are URL path segments, and actix
    /// percent-decodes them after routing, so `..%2F..%2F..` reaches this layer as real
    /// traversal. Nothing may be created, found or served outside the base directory.
    #[test]
    fn sync_file_path_segments_cannot_escape_the_base_dir() {
        let temp_dir = tempfile::tempdir().unwrap();
        let mut service = StaticFileService::new(".").unwrap();
        service.dir = temp_dir.path().to_path_buf();

        let traversals = [
            "../../../../escaped",
            "..",
            "a/b",
            "/etc",
            ".",
            "",
            "asset/../../escaped",
        ];

        for traversal in traversals {
            // As the table name…
            let category =
                StaticFileCategory::SyncFile(traversal.to_string(), "rec".to_string());
            assert!(
                service.reserve_file("payload.js", &category, None).is_err(),
                "reserve_file accepted table_name {traversal:?}"
            );
            assert!(
                service.find_file("some_id", category.clone()).is_err(),
                "find_file accepted table_name {traversal:?}"
            );
            assert!(
                service
                    .store_file("payload.js", category, "data".as_bytes())
                    .is_err(),
                "store_file accepted table_name {traversal:?}"
            );

            // …and as the record id
            let category =
                StaticFileCategory::SyncFile("asset".to_string(), traversal.to_string());
            assert!(
                service.reserve_file("payload.js", &category, None).is_err(),
                "reserve_file accepted record_id {traversal:?}"
            );
        }

        // Nothing was created outside the base directory by any of the above
        let escaped = temp_dir.path().parent().unwrap().join("escaped");
        assert!(!escaped.exists(), "traversal created {escaped:?}");
    }

    /// The other direction: ordinary ids must still work.
    #[test]
    fn ordinary_sync_file_paths_are_accepted() {
        let temp_dir = tempfile::tempdir().unwrap();
        let mut service = StaticFileService::new(".").unwrap();
        service.dir = temp_dir.path().to_path_buf();

        let category = StaticFileCategory::SyncFile(
            "asset".to_string(),
            "01a04f2e-8a9c-7a1e-9d3b-1f2e3d4c5b6a".to_string(),
        );
        let file = service
            .store_file("report.pdf", category.clone(), "data".as_bytes())
            .unwrap();

        assert!(service.find_file(&file.id, category).unwrap().is_some());
        assert!(PathBuf::from(&file.path).starts_with(temp_dir.path()));
    }

    #[actix_rt::test]
    async fn download_file_in_chunks_only_exposes_completed_files() {
        use httpmock::{Method::GET, MockServer};
        use repository::sync_file_reference_row::SyncFileReferenceRow;

        let mock_server = MockServer::start();
        mock_server.mock(|when, then| {
            when.method(GET).path("/file");
            then.status(200).body("hello file bytes");
        });

        let temp_dir = tempfile::tempdir().unwrap();
        let mut service = StaticFileService::new(".").unwrap();
        service.dir = temp_dir.path().to_path_buf();

        let sync_file = SyncFileReferenceRow {
            id: "file1".to_string(),
            table_name: "asset".to_string(),
            record_id: "rec1".to_string(),
            file_name: "hello.txt".to_string(),
            ..Default::default()
        };
        let category = StaticFileCategory::SyncFile("asset".to_string(), "rec1".to_string());

        let response = reqwest::get(format!("{}/file", mock_server.base_url()))
            .await
            .unwrap();

        let file = service
            .download_file_in_chunks(&sync_file, response)
            .await
            .unwrap();

        assert_eq!(fs::read_to_string(&file.path).unwrap(), "hello file bytes");

        // The completed file is served under its final name…
        assert!(service.find_file("file1", category.clone()).unwrap().is_some());

        // …and no partial_ working file remains in the directory.
        let dir = temp_dir.path().join(category.to_path_buf());
        let leftovers: Vec<_> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .filter(|name| name.starts_with("partial_"))
            .collect();
        assert!(
            leftovers.is_empty(),
            "partial files left behind: {:?}",
            leftovers
        );
    }
}
