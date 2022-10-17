use std::env;

pub enum LogLevel {
    Info,
    Warn,
}
pub fn init_logger(level: LogLevel) {
    if env::var("RUST_LOG").is_err() {
        //Default rust log level to info
        env::set_var(
            "RUST_LOG",
            match level {
                LogLevel::Info => "info",
                LogLevel::Warn => "warn",
            },
        );
    }
    env_logger::init();
}
