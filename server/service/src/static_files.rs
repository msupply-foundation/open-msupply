use std::io::Error;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

use util::prepare_file_dir;
use util::uuid::uuid;

#[derive(Debug, PartialEq)]
pub struct StaticFile {
    pub id: String,
    pub name: String,
    pub path: String,
}

const STATIC_FILE_DIR: &str = "static_files";

/// Stores files in a temp storage and associate an id with each file.
/// This can, for example, be used to deposition a file for a user and the user can pick up the file
/// by id within a certain time frame.
///
/// Old files are deleted automatically.
pub struct StaticFileService {
    pub dir: PathBuf,
    /// Time [s] for how long static files are kept before they are discarded
    pub max_lifetime_millis: u64,
}
impl StaticFileService {
    pub fn new(base_dir: &Option<String>) -> anyhow::Result<Self> {
        Ok(StaticFileService {
            dir: prepare_file_dir(STATIC_FILE_DIR, base_dir)?,
            max_lifetime_millis: 60 * 60 * 1000, // 1 hours
        })
    }

    pub fn store_file(&self, file_name: &str, bytes: &[u8]) -> anyhow::Result<StaticFile> {
        let id = uuid();
        std::fs::create_dir_all(&self.dir)?;
        let file_path = self.dir.join(format!("{}_{}", id, file_name));
        std::fs::write(&file_path, bytes).unwrap();
        Ok(StaticFile {
            id,
            name: file_name.to_string(),
            path: file_path.to_string_lossy().to_string(),
        })
    }

    pub fn find_file(&self, id: &str) -> anyhow::Result<Option<StaticFile>> {
        std::fs::create_dir_all(&self.dir).unwrap();
        // clean up the static file directory
        delete_old_files(&self.dir, self.max_lifetime_millis)?;

        let file_path = match find_file(id, &self.dir)? {
            Some(path) => path,
            None => return Ok(None),
        };
        let original_file_name = parse_original_file_name(id, &file_path)
            .ok_or(anyhow::Error::msg("Internal error: can't parse file name"))?;

        Ok(Some(StaticFile {
            id: id.to_string(),
            name: original_file_name,
            path: file_path.to_string_lossy().to_string(),
        }))
    }
}

/// Returns the file name part of the path like:
/// `./static_file_path/{ui}_{file_name};
fn parse_original_file_name(id: &str, file_path: &PathBuf) -> Option<String> {
    let file_name = file_path.file_name()?.to_string_lossy();
    let name = &file_name[id.len() + 1..];
    if name.len() == 0 {
        // something is wrong...
        return None;
    }
    Some(name.to_string())
}

/// Finds file starting with the provided id
fn find_file(id: &str, file_dir: &PathBuf) -> Result<Option<PathBuf>, Error> {
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

fn delete_old_files(file_dir: &PathBuf, max_life_time_millis: u64) -> Result<(), Error> {
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
                ()
            });
        }
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use std::{fs, path::PathBuf, str::FromStr, time::Duration};

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

        let file_in = service.store_file("test_file", "data".as_bytes()).unwrap();
        let file_out = service.find_file(&file_in.id).unwrap().unwrap();
        assert_eq!(file_in, file_out);

        std::thread::sleep(Duration::from_millis(101));

        assert!(service.find_file(&file_in.id).unwrap().is_none());
        fs::remove_dir_all(&test_dir).unwrap();
    }
}
