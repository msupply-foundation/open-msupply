use actix_multipart::form::tempfile::TempFile;
use anyhow::Context;
use repository::sync_file_reference_row::SyncFileReferenceRow;
use reqwest::Response;
use std::io::Error;
use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::time::{Duration, SystemTime};
use tokio::fs::File;
use util::uuid::uuid;
use util::{move_file, sanitize_filename};
#[derive(Debug, PartialEq)]
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
    pub fn new(base_dir: &Option<String>) -> anyhow::Result<Self> {
        let file_dir = match base_dir {
            Some(file_dir) => PathBuf::from_str(file_dir)?.join(STATIC_FILE_DIR),
            None => std::env::current_dir()?.join(STATIC_FILE_DIR),
        };
        Ok(StaticFileService {
            dir: file_dir,
            max_lifetime_millis: 60 * 60 * 1000, // 1 hours
        })
    }

    // Temp file in this case refers to system 'TempFile' not our own definition of Temporary file
    // at the time of method creation TempFile only comes from web multipart
    pub fn move_temp_file(
        &self,
        temp_file: TempFile,
        category: &StaticFileCategory,
        file_id: Option<String>,
    ) -> anyhow::Result<StaticFile> {
        let file_name = temp_file.file_name.context("Filename not provided")?;
        let sanitized_filename = sanitize_filename(file_name);

        let static_file = self.reserve_file(&sanitized_filename, &category, file_id)?;
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
    /// let static_file_service = StaticFileService::new(&Some("/tmp/".to_string())).unwrap();
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
        let file_path = dir.join(format!("{}_{}", id, file_name));
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
        let file_path = dir.join(format!("{}_{}", id, file_name));
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
        match category {
            StaticFileCategory::Temporary => {
                delete_temporary_files(&dir, self.max_lifetime_millis)?;
            }
            _ => {}
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

    pub async fn download_file_in_chunks(
        &self,
        sync_file: &SyncFileReferenceRow,
        mut download_response: Response,
    ) -> anyhow::Result<StaticFile> {
        let category =
            StaticFileCategory::SyncFile(sync_file.table_name.clone(), sync_file.record_id.clone());

        let file =
            self.reserve_file(&sync_file.file_name, &category, Some(sync_file.id.clone()))?;
        let mut file_handle = File::create(&file.path).await?;

        loop {
            log::info!("Downloading chunk");
            let Some(bytes) = download_response.chunk().await? else {
                break;
            };

            tokio::io::copy(&mut bytes.deref(), &mut file_handle).await?;
        }

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
    let starts_with = format!("{}_", id);
    let paths = std::fs::read_dir(file_dir)?;
    for path in paths {
        let entry = path?;
        let entry_path = entry.path();
        let metadata = entry.metadata()?;
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
        let metadata = entry.metadata()?;
        if !metadata.is_file() {
            continue;
        }
        // creation time is not available on some file systems...
        let file_time = metadata.modified()?;
        if SystemTime::now()
            .duration_since(file_time)
            .unwrap_or(Duration::from_secs(0))
            > Duration::from_millis(max_life_time_millis)
        {
            log::info!("Delete old static file: {:?}", entry_path);
            std::fs::remove_file(entry_path).unwrap_or_else(|err| {
                log::error!("Failed to delete old static file: {}", err);
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
        let mut service = StaticFileService::new(&None).unwrap();
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
}
