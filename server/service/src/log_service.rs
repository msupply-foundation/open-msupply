use anyhow::Error;
use async_trait::async_trait;
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use repository::{KeyType, KeyValueStoreRepository, RepositoryError};
use std::{
    fs::{self, File},
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
};

use crate::{service_provider::ServiceContext, settings::Level};

/// Content of a log file as returned by [`LogServiceTrait::get_log_content`].
pub struct LogFileContent {
    /// The resolved log file name.
    pub file_name: String,
    /// The (possibly tailed) file content as text.
    pub content: String,
    /// The total (decompressed) size of the file in bytes, regardless of tailing.
    pub total_size: u64,
    /// Whether `content` is only the tail of a larger file.
    pub truncated: bool,
}

#[async_trait]
pub trait LogServiceTrait: Send + Sync {
    fn get_log_file_names(&self, ctx: &ServiceContext) -> Result<Vec<String>, Error> {
        let log_dir = self.get_log_directory(ctx)?;
        let log_dir_path = Path::new(&log_dir);
        let mut log_file_names = Vec::new();

        for entry in fs::read_dir(log_dir_path)? {
            let path = entry?.path();
            log_file_names.push(path.file_name().unwrap().to_string_lossy().to_string());
        }

        Ok(log_file_names)
    }

    /// Reads the content of a log file, decompressing it on the fly if it is a rotated
    /// `.gz` file. When `tail_bytes` is set and the file is larger, only the trailing
    /// bytes are returned (used by the viewer to avoid loading very large logs in full);
    /// the partial first line is dropped so the result starts on a line boundary.
    ///
    /// The caller is responsible for ensuring `file_name` refers to an actual log file
    /// (e.g. by checking against `get_log_file_names`) to avoid path traversal.
    ///
    /// The disk read / decompression is run on a blocking thread pool so it doesn't
    /// stall the async runtime.
    async fn get_log_content(
        &self,
        ctx: &ServiceContext,
        file_name: Option<String>,
        tail_bytes: Option<usize>,
    ) -> Result<LogFileContent, Error> {
        let log_dir = self.get_log_directory(ctx)?;
        let default_filename = self.get_log_file_name(ctx)?;
        let file_name = file_name.unwrap_or(default_filename);
        let log_file_path = Path::new(&log_dir).join(&file_name);
        let is_gz = file_name.ends_with(".gz");

        let (content, total_size, truncated) = tokio::task::spawn_blocking(move || {
            read_log_content(&log_file_path, is_gz, tail_bytes)
        })
        .await??;

        Ok(LogFileContent {
            file_name,
            content,
            total_size,
            truncated,
        })
    }

    /// Returns a log file ready for download as a gzip archive: rotated `.gz` files are
    /// returned untouched, while plain files are compressed on the fly to keep the
    /// download small. Returns the download file name (always ending in `.gz`) and the
    /// gzip bytes.
    ///
    /// As with `get_log_content`, the caller must ensure `file_name` refers to an actual
    /// log file (e.g. by checking against `get_log_file_names`) to avoid path traversal.
    /// The disk read / compression is run on a blocking thread pool.
    async fn get_log_file_download(
        &self,
        ctx: &ServiceContext,
        file_name: Option<String>,
    ) -> Result<(String, Vec<u8>), Error> {
        let log_dir = self.get_log_directory(ctx)?;
        let default_filename = self.get_log_file_name(ctx)?;
        let file_name = file_name.unwrap_or(default_filename);
        let log_file_path = Path::new(&log_dir).join(&file_name);

        Ok(
            tokio::task::spawn_blocking(move || {
                compress_log_for_download(log_file_path, file_name)
            })
            .await??,
        )
    }

    fn get_log_level(&self, ctx: &ServiceContext) -> Result<Option<Level>, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let log_level = key_value_store.get_string(KeyType::LogLevel)?;

        let level = match log_level {
            Some(log_level) => match log_level.as_str() {
                "error" => Some(Level::Error),
                "warn" => Some(Level::Warn),
                "info" => Some(Level::Info),
                "debug" => Some(Level::Debug),
                "trace" => Some(Level::Trace),
                _ => None,
            },
            None => None,
        };

        Ok(level)
    }

    fn update_log_level(&self, ctx: &ServiceContext, log_level: Level) {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let log_level = match log_level {
            Level::Error => "error",
            Level::Warn => "warn",
            Level::Info => "info",
            Level::Debug => "debug",
            Level::Trace => "trace",
        };

        if let Err(e) = key_value_store.set_string(KeyType::LogLevel, Some(log_level.to_string())) {
            log::warn!(
                "Failed to persist log level setting — storing in-memory — will be persisted on next run: {e:?}"
            );
        }
        simple_log::update_log_level(log_level).expect("Couldn't update log level");
    }

    fn get_log_directory(&self, ctx: &ServiceContext) -> Result<String, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let log_directory = key_value_store.get_string(KeyType::LogDirectory)?;

        Ok(log_directory.unwrap_or(Default::default()))
    }

    fn set_log_directory(&self, ctx: &ServiceContext, log_directory: Option<String>) {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        if let Err(e) = key_value_store.set_string(KeyType::LogDirectory, log_directory) {
            log::warn!(
                "Failed to persist log directory setting — storing in-memory — will be persisted on next run: {e:?}"
            );
        }
    }

    fn get_log_file_name(&self, ctx: &ServiceContext) -> Result<String, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let log_file_name = key_value_store.get_string(KeyType::LogFileName)?;

        Ok(log_file_name.unwrap_or(Default::default()))
    }

    fn set_log_file_name(&self, ctx: &ServiceContext, log_file_name: Option<String>) {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        if let Err(e) = key_value_store.set_string(KeyType::LogFileName, log_file_name) {
            log::warn!(
                "Failed to persist log file name setting — storing in-memory — will be persisted on next run: {e:?}"
            );
        }
    }
}

pub struct LogService {}

impl LogServiceTrait for LogService {}

/// Blocking read of a log file's content (decompressing `.gz`), optionally returning
/// only the trailing `tail_bytes`. Returns the text, the total (decompressed) size and
/// whether the result was truncated. Intended to be run via `spawn_blocking`.
fn read_log_content(
    log_file_path: &Path,
    is_gz: bool,
    tail_bytes: Option<usize>,
) -> Result<(String, u64, bool), Error> {
    let (bytes, total_size, truncated) = if is_gz {
        // Compressed files have to be decompressed in full before we can tail them.
        let mut decompressed: Vec<u8> = Default::default();
        GzDecoder::new(File::open(log_file_path)?).read_to_end(&mut decompressed)?;
        let total_size = decompressed.len() as u64;
        match tail_bytes {
            Some(n) if decompressed.len() > n => {
                let tail = decompressed.split_off(decompressed.len() - n);
                (tail, total_size, true)
            }
            _ => (decompressed, total_size, false),
        }
    } else {
        let mut file = File::open(log_file_path)?;
        let total_size = file.metadata()?.len();
        match tail_bytes {
            // Seek to the tail rather than reading the whole (potentially huge) file.
            Some(n) if total_size > n as u64 => {
                file.seek(SeekFrom::Start(total_size - n as u64))?;
                let mut buf = Vec::with_capacity(n);
                file.read_to_end(&mut buf)?;
                (buf, total_size, true)
            }
            _ => {
                let mut buf = Vec::new();
                file.read_to_end(&mut buf)?;
                (buf, total_size, false)
            }
        }
    };

    let mut content = String::from_utf8_lossy(&bytes).into_owned();
    // A tail almost always starts mid-line; drop that partial first line.
    if truncated {
        if let Some(newline) = content.find('\n') {
            content = content[newline + 1..].to_string();
        }
    }

    Ok((content, total_size, truncated))
}

/// Blocking read of a log file as a gzip archive for download: rotated `.gz` files are
/// returned as-is, plain files are compressed on the fly (streamed, so the whole file is
/// never held in memory uncompressed). Returns the download file name and gzip bytes.
/// Intended to be run via `spawn_blocking`.
fn compress_log_for_download(
    log_file_path: PathBuf,
    file_name: String,
) -> Result<(String, Vec<u8>), Error> {
    if file_name.ends_with(".gz") {
        // Already compressed — return the file as-is.
        Ok((file_name, fs::read(log_file_path)?))
    } else {
        let mut input = File::open(log_file_path)?;
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        std::io::copy(&mut input, &mut encoder)?;
        Ok((format!("{file_name}.gz"), encoder.finish()?))
    }
}
