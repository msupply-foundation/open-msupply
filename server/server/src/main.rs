#![allow(where_clauses_object_safety)]

use fast_log::{
    consts::LogSize,
    plugin::{file_split::RollingType, packer::LogPacker},
    Config,
};
use log::LevelFilter;
use server::{configuration, start_server};
use service::settings::{LogMode, LoggingSettings, Settings};
use std::{env, fs::create_dir_all};
use tokio::sync::oneshot;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");
    logging_init(settings.logging.clone());

    let (off_switch, off_switch_receiver) = oneshot::channel();
    let result = start_server(settings, off_switch_receiver).await;
    // off_switch is not needed but we need to keep it alive to prevent it from firing
    let _ = off_switch;
    result
}

fn logging_init(settings: Option<LoggingSettings>) {
    let settings = settings.unwrap_or(LoggingSettings {
        mode: LogMode::Console,
        level: service::settings::Level::Info,
        directory: None,
        filename: None,
        max_file_count: None,
        max_file_size: None,
    });
    let config = match settings.mode {
        LogMode::File => file_logger(&settings),
        LogMode::Console => Config::new().console(),
        LogMode::All => file_logger(&settings).console(),
    };
    fast_log::init(config.level(LevelFilter::from(settings.level.clone())))
        .expect("Unable to initialise logger");
}

fn file_logger(settings: &LoggingSettings) -> fast_log::Config {
    let default_log_file = "remote_server.log".to_string();
    let default_log_dir = "log".to_string();
    let default_max_file_count = 5;
    let default_max_file_size = 10;

    // Note: the file_split will panic if the path separator isn't appended
    let log_dir = &format!(
        "{}{}",
        settings.directory.clone().unwrap_or(default_log_dir),
        std::path::MAIN_SEPARATOR
    );
    let log_path = &env::current_dir().unwrap_or_default().join(log_dir);
    let log_file = settings
        .filename
        .clone()
        .unwrap_or_else(|| default_log_file);
    let log_file = match create_dir_all(log_path) {
        Ok(_) => log_path.join(log_file).to_string_lossy().to_string(),
        Err(_) => log_file.to_string(),
    };
    let max_file_count = settings.max_file_count.unwrap_or(default_max_file_count);
    let max_file_size = settings.max_file_size.unwrap_or(default_max_file_size);

    // file_loop will append to the specified log file until the max size is reached,
    // then create a new log file with the same name, with date and time appended
    // file_split will split the temp file when the max file size is reached
    // and retain the max number of files while the server is running
    // Note: when the server is started, the temp files are removed. The main log file is
    // appended to, but only to the max size limit. Only one additional main log is created
    Config::new()
        .file_loop(&log_file, LogSize::MB(max_file_size))
        .file_split(
            &log_dir,
            LogSize::MB(max_file_size),
            RollingType::KeepNum(max_file_count),
            LogPacker {},
        )
}
