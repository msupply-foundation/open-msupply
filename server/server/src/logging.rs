use std::env;

use fast_log::{
    consts::LogSize,
    plugin::{file_split::RollingType, packer::LogPacker},
    Config as LogConfig,
};
use log::LevelFilter;
use service::settings::{LogMode, LoggingSettings};

pub fn logging_init(settings: Option<LoggingSettings>) {
    let settings = settings.unwrap_or(LoggingSettings::new(
        LogMode::Console,
        service::settings::Level::Info,
    ));
    let config = match settings.mode {
        LogMode::File => file_logger(&settings),
        LogMode::Console => LogConfig::new().console(),
        LogMode::All => file_logger(&settings).console(),
    };
    fast_log::init(config.level(LevelFilter::from(settings.level.clone())))
        .expect("Unable to initialise logger");
}

fn file_logger(settings: &LoggingSettings) -> LogConfig {
    let default_log_file = "remote_server.log".to_string();
    let default_log_dir = "log".to_string();
    let default_max_file_count = 5;
    let default_max_file_size = 10;

    // Note: the file_split will panic if the path separator isn't appended
    // and the path separator has to be unix-style, even on windows
    let log_dir = format!("{}/", settings.directory.clone().unwrap_or(default_log_dir),);
    #[cfg(not(android))]
    let log_path = env::current_dir().unwrap_or_default().join(&log_dir);
    // We are given the full path when running on android
    #[cfg(android)]
    let log_path = std::path::PathBuf::from(&log_dir);
    let log_file = settings
        .filename
        .clone()
        .unwrap_or_else(|| default_log_file);
    let log_file = log_path.join(log_file).to_string_lossy().to_string();
    let max_file_count = settings.max_file_count.unwrap_or(default_max_file_count);
    let max_file_size = settings.max_file_size.unwrap_or(default_max_file_size);

    log::info!("Logging to {}", &log_file);

    // file_loop will append to the specified log file until the max size is reached,
    // then create a new log file with the same name, with date and time appended
    // file_split will split the temp file when the max file size is reached
    // and retain the max number of files while the server is running
    // Note: when the server is started, the temp files are removed. The main log file is
    // appended to, but only to the max size limit. Only one additional main log is created
    LogConfig::new()
        .file_split(
            &log_dir,
            LogSize::MB(max_file_size),
            RollingType::KeepNum(max_file_count),
            LogPacker {},
        )
        .file_loop(&log_file, LogSize::MB(max_file_size))
}
