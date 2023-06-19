use std::env;

use service::settings::{Level, LogMode, LoggingSettings};
use simple_log::{LogConfig, LogConfigBuilder};

pub fn logging_init(
    settings: Option<LoggingSettings>,
    apply_config: Option<Box<dyn Fn(LogConfig) -> LogConfig>>,
    level: Option<Level>,
    update: bool,
) {
    let settings = settings.unwrap_or(LoggingSettings::new(
        LogMode::Console,
        service::settings::Level::Info,
    ));

    let log_level = level.unwrap_or(settings.level.clone());
    let mut config = match settings.mode {
        LogMode::File => file_logger(&settings)
            .level(log_level.to_string())
            .output_file()
            .build(),
        LogMode::Console => LogConfigBuilder::builder()
            .level(log_level.to_string())
            .output_console()
            .build(),
        LogMode::All => file_logger(&settings)
            .level(log_level.to_string())
            .output_console()
            .output_file()
            .build(),
    };

    if let Some(apply_config) = apply_config {
        config = apply_config(config);
    }

    if update {
        simple_log::update_log_conf(config).expect("Unable to update logger");
    } else {
        simple_log::new(config).expect("Unable to initialise logger");
    }
}

fn file_logger(settings: &LoggingSettings) -> LogConfigBuilder {
    let default_log_file = "remote_server.log".to_string();
    let default_log_dir = "log".to_string();
    let default_max_file_count = 10;
    let default_max_file_size = 1;

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

    LogConfigBuilder::builder()
        .path(&log_file)
        .size(max_file_size as u64)
        .roll_count(max_file_count as u32)
}
