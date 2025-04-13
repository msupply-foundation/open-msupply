#[cfg(not(target_os = "android"))]
use std::env;
use tracing_subscriber::{
    filter::LevelFilter,
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

use service::settings::{is_develop, Level, LogMode, LoggingSettings};
use simple_log::LogConfigBuilder;

// Can use log4rs to extend logging functionality beyond what is available in current
// log crate since simple-log is based on log4rs.
pub fn logging_init(settings: Option<LoggingSettings>, level: Option<Level>) {
    let settings = settings.unwrap_or(LoggingSettings::new(
        LogMode::Console,
        service::settings::Level::Info,
    ));

    let crate_name = env!("CARGO_PKG_NAME").replace("-", "_");

    println!("crate_name: {}", crate_name);
    println!("is_develop: {}", is_develop());
    println!("log level: {:?}", level);

    let filter = if is_develop() {
        EnvFilter::builder()
            .with_default_directive(LevelFilter::WARN.into())
            .parse(&format!("{}=debug", crate_name))
            .unwrap()
    } else {
        EnvFilter::builder()
            .with_default_directive(LevelFilter::WARN.into())
            .parse("")
            .unwrap()
    };

    let filter = filter.add_directive(
        "RUST_LOG"
            .parse()
            .unwrap_or_else(|_| LevelFilter::WARN.into()),
    );

    println!("filter: {:?}", (filter).to_string());

    // let fmt_layer = fmt::layer()
    //     .with_target(true)
    //     .with_span_events(FmtSpan::CLOSE)
    //     .event_format(
    //         fmt::format()
    //             .with_level(true)
    //             .with_target(true)
    //             .with_thread_ids(cfg!(debug_assertions))
    //             .with_thread_names(cfg!(debug_assertions))
    //             .with_ansi(cfg!(debug_assertions)),
    //     );

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

    println!("here");

    let filter_directive = if is_develop() {
        format!("warn,{}=debug", crate_name)
    } else {
        "info".to_string()
    };

    let subscriber = tracing_subscriber::fmt()
        .with_env_filter(filter_directive)
        .with_target(true);

    // Add file output if configured
    if let Some(file_path) = &config.path {
        let file = std::fs::File::create(file_path).expect("Failed to create log file");
        subscriber.with_writer(std::sync::Mutex::new(file)).init();
    } else {
        subscriber.init();
    }

    // log_panics::Config::new()
    //     .backtrace_mode(log_panics::BacktraceMode::Unresolved)
    //     .install_panic_hook();

    // simple_log::new(config).expect("Unable to initialise logger");
}

fn file_logger(settings: &LoggingSettings) -> LogConfigBuilder {
    let default_log_file = "remote_server.log".to_string();
    let default_log_dir = "log".to_string();
    let default_max_file_count = 10;
    let default_max_file_size = 1;

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
    let max_file_count = settings.max_file_count.unwrap_or(default_max_file_count);
    let max_file_size = settings.max_file_size.unwrap_or(default_max_file_size);

    LogConfigBuilder::builder()
        .path(log_file)
        .size(max_file_size as u64)
        .roll_count(max_file_count as u32)
}
