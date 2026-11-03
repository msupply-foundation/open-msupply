use anyhow::{Error, anyhow};
use flate2::read::GzDecoder;
use repository::{KeyType, KeyValueStoreRepository, RepositoryError};
use std::{
    ffi::OsStr,
    fs::{self, File},
    io::{self, Read, Seek, SeekFrom},
    path::{Path, PathBuf},
};

use crate::{service_provider::ServiceContext, settings::Level};

/// The most of a log file the viewer is sent: its last 1 MiB, the old default rotation size.
/// Larger rotation limits mean a whole file can be 100 MB, too much to send to a text box in
/// one GraphQL response. The full file is downloaded over REST instead (`/support/log/...`).
pub const LOG_TAIL_BYTES: usize = 1024 * 1024;

pub struct LogTail {
    pub file_name: String,
    /// The log's text, as written: lines end in `\n`.
    pub content: String,
    /// The file is longer than `content`, which holds only its end.
    pub truncated: bool,
}

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

    /// Resolves a log file name (the current log when `None`) to its path in the log directory.
    /// Only a bare file name is accepted, so a caller can't read files outside the log directory.
    fn get_log_file_path(
        &self,
        ctx: &ServiceContext,
        file_name: Option<String>,
    ) -> Result<(String, PathBuf), Error> {
        let file_name = match file_name {
            Some(file_name) => file_name,
            None => self.get_log_file_name(ctx)?,
        };
        if !is_bare_file_name(&file_name) {
            return Err(anyhow!("Invalid log file name: {file_name}"));
        }
        let log_dir = self.get_log_directory(ctx)?;
        let log_file_path = Path::new(&log_dir).join(&file_name);

        Ok((file_name, log_file_path))
    }

    /// The whole of a log file, decompressed. Used by the support upload; the viewer reads
    /// `get_log_tail` instead.
    fn get_log_content(
        &self,
        ctx: &ServiceContext,
        file_name: Option<String>,
    ) -> Result<(String, String), Error> {
        let (file_name, log_file_path) = self.get_log_file_path(ctx, file_name)?;

        let log_file_content = if file_name.ends_with(".gz") {
            let mut decompressed: String = Default::default();
            let mut decoder = GzDecoder::new(File::open(log_file_path)?);
            decoder.read_to_string(&mut decompressed)?;

            decompressed
        } else {
            fs::read_to_string(log_file_path)?
        };

        Ok((file_name, log_file_content))
    }

    /// The last `LOG_TAIL_BYTES` of a log file, decompressed. Memory stays bounded whatever the
    /// file's size: a plain file is read from near its end, and a `.gz` file is decompressed
    /// through a buffer that keeps only the latest bytes.
    fn get_log_tail(
        &self,
        ctx: &ServiceContext,
        file_name: Option<String>,
    ) -> Result<LogTail, Error> {
        let (file_name, log_file_path) = self.get_log_file_path(ctx, file_name)?;
        let mut file = File::open(log_file_path)?;

        let (tail, truncated) = if file_name.ends_with(".gz") {
            read_tail(GzDecoder::new(file), LOG_TAIL_BYTES)?
        } else {
            let skipped = file.metadata()?.len().saturating_sub(LOG_TAIL_BYTES as u64);
            file.seek(SeekFrom::Start(skipped))?;
            // The file can grow while it's read, so the read is still bounded.
            let (tail, truncated) = read_tail(file, LOG_TAIL_BYTES)?;
            (tail, truncated || skipped > 0)
        };

        Ok(LogTail {
            file_name,
            content: tail_text(tail, truncated),
            truncated,
        })
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

/// A name with no directory part, so it can only resolve to a file inside the log directory.
fn is_bare_file_name(name: &str) -> bool {
    Path::new(name).file_name() == Some(OsStr::new(name))
}

/// Reads `reader` to its end, keeping only the last `max_bytes`. Returns whether anything was
/// dropped. Holds at most about twice `max_bytes` at once.
fn read_tail(mut reader: impl Read, max_bytes: usize) -> io::Result<(Vec<u8>, bool)> {
    let mut tail = Vec::new();
    let mut truncated = false;
    let mut chunk = vec![0u8; 64 * 1024];

    loop {
        let read = match reader.read(&mut chunk) {
            Ok(0) => break,
            Ok(read) => read,
            Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
            Err(e) => return Err(e),
        };
        tail.extend_from_slice(&chunk[..read]);
        // Trim only once the buffer is twice the limit, so bytes aren't shifted on every chunk.
        if tail.len() > max_bytes * 2 {
            tail.drain(..tail.len() - max_bytes);
            truncated = true;
        }
    }
    if tail.len() > max_bytes {
        tail.drain(..tail.len() - max_bytes);
        truncated = true;
    }

    Ok((tail, truncated))
}

/// A log's bytes as text. A truncated tail starts part-way through a line (and maybe part-way
/// through a UTF-8 character), so that first partial line is dropped.
fn tail_text(mut tail: Vec<u8>, truncated: bool) -> String {
    if truncated {
        let first_line_end = tail.iter().position(|byte| *byte == b'\n');
        tail.drain(..first_line_end.map_or(tail.len(), |end| end + 1));
    }

    match String::from_utf8(tail) {
        Ok(text) => text,
        Err(e) => String::from_utf8_lossy(e.as_bytes()).into_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::{Compression, write::GzEncoder};
    use std::io::Write;

    fn numbered_lines(count: usize) -> String {
        (0..count).map(|i| format!("line {i}\n")).collect()
    }

    #[test]
    fn only_bare_file_names_are_accepted() {
        assert!(is_bare_file_name("remote_server.log"));
        assert!(is_bare_file_name("remote_server.log.1.gz"));
        assert!(!is_bare_file_name(""));
        assert!(!is_bare_file_name(".."));
        assert!(!is_bare_file_name("../secrets.txt"));
        assert!(!is_bare_file_name("/etc/passwd"));
        assert!(!is_bare_file_name("logs/remote_server.log"));
    }

    #[test]
    fn read_tail_keeps_a_short_input_whole() {
        let (tail, truncated) = read_tail("abc\ndef".as_bytes(), 100).unwrap();
        assert_eq!(tail, b"abc\ndef");
        assert!(!truncated);
        assert_eq!(tail_text(tail, truncated), "abc\ndef");
    }

    #[test]
    fn read_tail_keeps_only_the_last_bytes() {
        // Several chunks' worth, so the in-loop trim runs as well as the final one.
        let input = numbered_lines(100_000);
        let (tail, truncated) = read_tail(input.as_bytes(), 1000).unwrap();
        assert!(truncated);
        assert_eq!(tail.len(), 1000);
        assert!(input.as_bytes().ends_with(&tail));
    }

    #[test]
    fn tail_text_drops_the_partial_first_line() {
        let text = tail_text(b"ne 7\nline 8\nline 9\n".to_vec(), true);
        assert_eq!(text, "line 8\nline 9\n");
    }

    #[test]
    fn read_tail_of_gzip_matches_the_plain_tail() {
        let input = numbered_lines(200_000);
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(input.as_bytes()).unwrap();
        let compressed = encoder.finish().unwrap();

        let (tail, truncated) = read_tail(GzDecoder::new(compressed.as_slice()), 4096).unwrap();
        assert!(truncated);
        let text = tail_text(tail, truncated);
        assert!(text.starts_with("line "));
        assert!(text.ends_with("\nline 199999\n"));
    }
}
