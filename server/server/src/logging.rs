#[cfg(not(target_os = "android"))]
use std::env;

use service::settings::{Level, LogMode, LoggingSettings};
use simple_log::LogConfigBuilder;

// Postgres is used for busier and more important servers (e.g. central servers), where more log
// history is worth the disk space. Sqlite (including Android) keeps smaller files, as the log
// viewers read a whole logfile into memory (see open-msupply-internal#1012)
#[cfg(feature = "postgres")]
const DEFAULT_MAX_FILE_SIZE_MB: usize = 100;
#[cfg(not(feature = "postgres"))]
const DEFAULT_MAX_FILE_SIZE_MB: usize = 20;
const DEFAULT_MAX_FILE_COUNT: i64 = 50;

// Can use log4rs to extend logging functionality beyond what is available in current
// log crate since simple-log is based on log4rs.
pub fn logging_init(settings: Option<LoggingSettings>, level: Option<Level>) {
    let settings = settings.unwrap_or(LoggingSettings::new(
        LogMode::Console,
        service::settings::Level::Info,
    ));

    let log_level = level.unwrap_or(settings.level.clone());
    let config = match settings.mode {
        LogMode::File => file_logger(&settings)
            .level(log_level.to_string())
            .expect("Cannot determine log level")
            .output_file()
            .build(),
        LogMode::Console => LogConfigBuilder::builder()
            .level(log_level.to_string())
            .expect("Cannot determine log level")
            .output_console()
            .build(),
        LogMode::All => file_logger(&settings)
            .level(log_level.to_string())
            .expect("Cannot determine log level")
            .build(),
    };

    simple_log::new(config).expect("Unable to initialise logger");
}

fn file_logger(settings: &LoggingSettings) -> LogConfigBuilder {
    let default_log_file = "remote_server.log".to_string();
    let default_log_dir = "log".to_string();

    // Note: the file_split will panic if the path separator isn't appended
    // and the path separator has to be unix-style, even on windows
    let log_dir = format!("{}/", settings.directory.clone().unwrap_or(default_log_dir),);
    #[cfg(not(target_os = "android"))]
    let log_path = env::current_dir().unwrap_or_default().join(log_dir);
    // We are given the full path when running on android
    #[cfg(target_os = "android")]
    let log_path = std::path::PathBuf::from(&log_dir);
    let log_file = settings.filename.clone().unwrap_or(default_log_file);
    let log_file = log_path.join(log_file).to_string_lossy().to_string();
    let max_file_count = settings.max_file_count.unwrap_or(DEFAULT_MAX_FILE_COUNT);
    let max_file_size = settings.max_file_size.unwrap_or(DEFAULT_MAX_FILE_SIZE_MB);

    LogConfigBuilder::builder()
        .path(log_file)
        .size(max_file_size as u64)
        .roll_count(max_file_count as u32)
}
