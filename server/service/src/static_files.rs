use actix_multipart::form::tempfile::TempFile;
use anyhow::Context;
use repository::sync_file_reference_row::SyncFileReferenceRow;
use reqwest::{Response, StatusCode};
use serde::Serialize;
use std::io::Error;
use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::time::{Duration, SystemTime};
use tokio::fs::{File, OpenOptions};
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

        let dir = self.dir.join(category.to_path_buf());

        std::fs::create_dir_all(&dir)?;
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

        let dir = self.dir.join(category.to_path_buf());

        std::fs::create_dir_all(&dir)?;
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
        let dir = self.dir.join(category.to_path_buf());
        std::fs::create_dir_all(&dir)?;

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

    /// Where the on-disk partial download for this file has got to, in bytes. `0` when
    /// there is nothing part-downloaded.
    ///
    /// Disk is the source of truth here, not `sync_file_reference.downloaded_bytes` —
    /// the counter is best-effort bookkeeping written between attempts, while the
    /// partial file's length is what a resumed request must actually continue from.
    pub fn partial_download_offset(&self, sync_file: &SyncFileReferenceRow) -> u64 {
        let Ok(path) = self.partial_path(sync_file) else {
            return 0;
        };
        std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
    }

    fn partial_path(&self, sync_file: &SyncFileReferenceRow) -> anyhow::Result<PathBuf> {
        let category =
            StaticFileCategory::SyncFile(sync_file.table_name.clone(), sync_file.record_id.clone());
        let file =
            self.reserve_file(&sync_file.file_name, &category, Some(sync_file.id.clone()))?;
        let final_path = PathBuf::from(&file.path);

        // A `partial_`-prefixed name that find_file's `{id}_` prefix match can never
        // surface, so a part-downloaded file is invisible to lookups and can never be
        // served as if it were complete.
        Ok(final_path.with_file_name(format!(
            "partial_{}",
            final_path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default()
        )))
    }

    /// Stream a download response into local static-file storage, renaming into place
    /// only once the stream completes — so an aborted download is never served as a
    /// complete file.
    ///
    /// `resume_from` is the offset the caller asked central to resume at (via a `Range`
    /// header). A `206 Partial Content` response is appended to the existing partial
    /// file; any other success status is treated as a whole-file response and truncates
    /// it. Resuming is only sound because a synced file's bytes never change once
    /// uploaded — replacing a file means a new id (see the file sync KDD) — so a partial
    /// file and a later range of the same id always belong to the same bytes.
    ///
    /// On failure the partial file is deliberately **kept**, so the next attempt
    /// continues rather than starting over. Returns the total size of the assembled
    /// file.
    pub async fn download_file_in_chunks(
        &self,
        sync_file: &SyncFileReferenceRow,
        mut download_response: Response,
        resume_from: u64,
    ) -> anyhow::Result<(StaticFile, u64)> {
        let category =
            StaticFileCategory::SyncFile(sync_file.table_name.clone(), sync_file.record_id.clone());

        let file =
            self.reserve_file(&sync_file.file_name, &category, Some(sync_file.id.clone()))?;
        let final_path = PathBuf::from(&file.path);
        let partial_path = self.partial_path(sync_file)?;

        // Central honours `Range` (its handler serves the file through actix's
        // NamedFile), but a 200 means it sent the whole file anyway — so trust the
        // status, not our own request, when deciding whether to append.
        let is_partial_content = download_response.status() == StatusCode::PARTIAL_CONTENT;
        let appending = is_partial_content && resume_from > 0;

        let download = async {
            let mut file_handle = if appending {
                OpenOptions::new()
                    .append(true)
                    .create(true)
                    .open(&partial_path)
                    .await?
            } else {
                File::create(&partial_path).await?
            };

            loop {
                let Some(bytes) = download_response.chunk().await? else {
                    break;
                };

                tokio::io::copy(&mut bytes.deref(), &mut file_handle).await?;
            }
            file_handle.flush().await?;
            Ok::<_, anyhow::Error>(())
        };

        // Keep the partial file on error: continuing from where a bad link cut out is
        // the whole point, and a stale partial is invisible to lookups.
        download.await?;

        let total_bytes = std::fs::metadata(&partial_path)
            .map(|m| m.len())
            .unwrap_or(0);

        // Same directory, so the rename is atomic.
        std::fs::rename(&partial_path, &final_path)?;

        Ok((
            StaticFile {
                id: sync_file.id.clone(),
                name: sync_file.file_name.clone(),
                path: file.path.to_string(),
            },
            total_bytes,
        ))
    }

    /// Discard a part-downloaded file so the next attempt starts from zero. For when a
    /// resumed download cannot be trusted — e.g. the assembled bytes failed their
    /// checksum, so the partial was corrupt and resuming would fail forever.
    pub fn discard_partial_download(&self, sync_file: &SyncFileReferenceRow) {
        if let Ok(path) = self.partial_path(sync_file) {
            let _ = std::fs::remove_file(path);
        }
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

        let (file, bytes) = service
            .download_file_in_chunks(&sync_file, response, 0)
            .await
            .unwrap();

        assert_eq!(fs::read_to_string(&file.path).unwrap(), "hello file bytes");
        assert_eq!(bytes, "hello file bytes".len() as u64);

        // The completed file is served under its final name…
        assert!(service
            .find_file("file1", category.clone())
            .unwrap()
            .is_some());

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

    /// A download cut off partway is resumed from where it stopped, not restarted.
    ///
    /// Restarting from zero is how a large file over a bad link never finishes, so this
    /// asserts the whole cycle: interrupted attempt keeps its bytes, the retry asks for
    /// the right range, and the assembled file is byte-correct.
    #[actix_rt::test]
    async fn interrupted_download_resumes_from_its_partial_file() {
        use httpmock::{Method::GET, MockServer};
        use repository::sync_file_reference_row::SyncFileReferenceRow;

        const WHOLE: &str = "hello file bytes";
        let split_at = 6; // "hello " / "file bytes"

        // First attempt: a one-shot TCP server that promises the whole file in
        // Content-Length, sends only part of it, then closes. A mock HTTP server won't
        // do this (hyper rejects a body that contradicts its own header), but it is
        // exactly what a dropped connection looks like to the client.
        let truncated = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let truncated_url = format!("http://{}/file", truncated.local_addr().unwrap());
        let truncating_server = std::thread::spawn(move || {
            use std::io::{Read, Write};
            let (mut stream, _) = truncated.accept().unwrap();
            // Read the request so the client isn't blocked writing it.
            let mut buffer = [0u8; 1024];
            let _ = stream.read(&mut buffer);
            let head = format!("HTTP/1.1 200 OK\r\ncontent-length: {}\r\n\r\n", WHOLE.len());
            stream.write_all(head.as_bytes()).unwrap();
            stream.write_all(&WHOLE.as_bytes()[..split_at]).unwrap();
            stream.flush().unwrap();
            // Drop the stream: body ends early, client sees an incomplete message.
        });

        let mock_server = MockServer::start();
        // Second attempt: the remainder, as central's NamedFile would answer a Range.
        let second = mock_server.mock(|when, then| {
            when.method(GET)
                .path("/file")
                .header("Range", format!("bytes={split_at}-"));
            then.status(206)
                .header(
                    "content-range",
                    format!("bytes {}-{}/{}", split_at, WHOLE.len() - 1, WHOLE.len()),
                )
                .body(&WHOLE[split_at..]);
        });

        let temp_dir = tempfile::tempdir().unwrap();
        let mut service = StaticFileService::new(".").unwrap();
        service.dir = temp_dir.path().to_path_buf();

        let sync_file = SyncFileReferenceRow {
            id: "resumable".to_string(),
            table_name: "frontend_bundle".to_string(),
            record_id: "bundle1".to_string(),
            file_name: "frontend-dist.zip".to_string(),
            total_bytes: WHOLE.len() as i32,
            ..Default::default()
        };
        let category =
            StaticFileCategory::SyncFile("frontend_bundle".to_string(), "bundle1".to_string());

        // Nothing downloaded yet.
        assert_eq!(service.partial_download_offset(&sync_file), 0);

        // First attempt fails mid-stream.
        let response = reqwest::get(&truncated_url).await.unwrap();
        let result = service
            .download_file_in_chunks(&sync_file, response, 0)
            .await;
        assert!(result.is_err(), "truncated body should not succeed");
        truncating_server.join().unwrap();

        // The bytes received so far are kept — that is what makes the retry cheap.
        assert_eq!(service.partial_download_offset(&sync_file), split_at as u64);
        // And the incomplete file is not discoverable as a finished one.
        assert!(service
            .find_file("resumable", category.clone())
            .unwrap()
            .is_none());

        // Second attempt resumes: send the Range the offset implies.
        let offset = service.partial_download_offset(&sync_file);
        let response = reqwest::Client::new()
            .get(format!("{}/file", mock_server.base_url()))
            .header(reqwest::header::RANGE, format!("bytes={offset}-"))
            .send()
            .await
            .unwrap();
        let (file, bytes) = service
            .download_file_in_chunks(&sync_file, response, offset)
            .await
            .unwrap();
        second.assert();

        // Appended, not overwritten — the whole file is intact.
        assert_eq!(fs::read_to_string(&file.path).unwrap(), WHOLE);
        assert_eq!(bytes, WHOLE.len() as u64);
        assert!(service.find_file("resumable", category).unwrap().is_some());
        assert_eq!(service.partial_download_offset(&sync_file), 0);
    }

    /// If central answers 200 rather than 206 (it ignored the Range), the partial must be
    /// truncated rather than appended to — appending a whole file onto a partial one is
    /// how you silently corrupt a download.
    #[actix_rt::test]
    async fn whole_file_response_replaces_a_partial_rather_than_appending() {
        use httpmock::{Method::GET, MockServer};
        use repository::sync_file_reference_row::SyncFileReferenceRow;

        const WHOLE: &str = "hello file bytes";

        let mock_server = MockServer::start();
        mock_server.mock(|when, then| {
            when.method(GET).path("/file");
            then.status(200).body(WHOLE);
        });

        let temp_dir = tempfile::tempdir().unwrap();
        let mut service = StaticFileService::new(".").unwrap();
        service.dir = temp_dir.path().to_path_buf();

        let sync_file = SyncFileReferenceRow {
            id: "ignored-range".to_string(),
            table_name: "frontend_bundle".to_string(),
            record_id: "bundle2".to_string(),
            file_name: "frontend-dist.zip".to_string(),
            ..Default::default()
        };

        // Pre-seed a partial file, as an earlier interrupted attempt would have left.
        let partial_path = service.partial_path(&sync_file).unwrap();
        fs::create_dir_all(partial_path.parent().unwrap()).unwrap();
        fs::write(&partial_path, "hello ").unwrap();
        assert_eq!(service.partial_download_offset(&sync_file), 6);

        let response = reqwest::get(format!("{}/file", mock_server.base_url()))
            .await
            .unwrap();
        let (file, bytes) = service
            .download_file_in_chunks(&sync_file, response, 6)
            .await
            .unwrap();

        // Exactly the whole file, not "hello " + the whole file.
        assert_eq!(fs::read_to_string(&file.path).unwrap(), WHOLE);
        assert_eq!(bytes, WHOLE.len() as u64);
    }

    #[actix_rt::test]
    async fn discard_partial_download_forces_a_fresh_start() {
        use repository::sync_file_reference_row::SyncFileReferenceRow;

        let temp_dir = tempfile::tempdir().unwrap();
        let mut service = StaticFileService::new(".").unwrap();
        service.dir = temp_dir.path().to_path_buf();

        let sync_file = SyncFileReferenceRow {
            id: "discardable".to_string(),
            table_name: "frontend_bundle".to_string(),
            record_id: "bundle3".to_string(),
            file_name: "frontend-dist.zip".to_string(),
            ..Default::default()
        };

        let partial_path = service.partial_path(&sync_file).unwrap();
        fs::create_dir_all(partial_path.parent().unwrap()).unwrap();
        fs::write(&partial_path, "corrupt").unwrap();
        assert_eq!(service.partial_download_offset(&sync_file), 7);

        // Used when the assembled bytes fail their checksum: resuming from a corrupt
        // partial would fail forever.
        service.discard_partial_download(&sync_file);
        assert_eq!(service.partial_download_offset(&sync_file), 0);
    }
}
