use std::{
    collections::HashMap,
    fmt::{Display, Formatter, Result},
};

use repository::database_settings::DatabaseSettings;
use serde::{Deserialize, Serialize};

use crate::sync::settings::SyncSettings;

#[derive(Deserialize, Serialize, Clone)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
    pub sync: Option<SyncSettings>,
    pub logging: Option<LoggingSettings>,
    pub backup: Option<BackupSettings>,
    pub mail: Option<MailSettings>,
    pub features: Option<HashMap<String, bool>>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct ServerSettings {
    pub port: u16,
    /// Allow to run the server in http mode
    #[serde(default)]
    pub danger_allow_http: bool,
    /// Only used in development mode
    #[serde(default)]
    pub debug_no_access_control: bool,

    #[serde(default)]
    pub discovery: DiscoveryMode,
    /// Sets the allowed origin for cors requests
    pub cors_origins: Vec<String>,
    /// Directory where the server stores its data, e.g. sqlite DB file or certs
    #[serde(default = "default_base_dir")]
    pub base_dir: String,
    /// Option to set the machine id of the device for an OS that isn't supported by machine_uid
    pub machine_uid: Option<String>,
    // Option to set server mode as central server, should only be used in testing, demo and development
    #[serde(default)]
    pub override_is_central_server: bool,
    /// Number of Actix HTTP worker threads. Defaults to `2 * num_cpus`.
    /// Each worker runs its own async runtime; tuning higher than `num_cpus`
    /// is appropriate because resolver bodies are dispatched to the blocking
    /// pool, so workers spend most of their time waiting on I/O rather than
    /// burning CPU.
    pub http_workers: Option<usize>,
    /// TCP backlog passed to `HttpServer::backlog`. Defaults to 2048.
    pub http_backlog: Option<u32>,
    /// Max concurrent connections per worker. Defaults to 25_000.
    pub http_max_connections: Option<usize>,
    /// Per-request keep-alive in seconds. Defaults to 75.
    pub http_keep_alive_seconds: Option<u64>,
    /// Request header read timeout in seconds. Defaults to 30.
    pub http_client_request_timeout_seconds: Option<u64>,
}

fn default_base_dir() -> String {
    "app_data".to_string()
}

impl ServerSettings {
    pub fn address(&self) -> String {
        format!("0.0.0.0:{}", self.port)
    }

    /// Http server port for graphql used in discovery, defaults to port + 1
    pub fn discovery_address(&self) -> String {
        format!("0.0.0.0:{}", self.port + 1)
    }
}

/// See backup cli for more details
#[derive(Deserialize, Serialize, Clone)]
pub struct BackupSettings {
    // Root folder for backup
    pub backup_dir: String,
    // Directory containing postgres binaries (in case pg_dump and pg_restore are not in PATH)
    pub pg_bin_dir: Option<String>,
    // Number of backups to keep
    pub max_number_of_backups: Option<u32>,
}

pub fn is_develop() -> bool {
    // debug_assertions is the recommended way to check if we are in 'dev' mode
    cfg!(debug_assertions)
}

#[derive(Deserialize, Serialize, Clone)]
pub enum LogMode {
    All,
    Console,
    File,
}

#[derive(Deserialize, Serialize, Clone, Default)]
pub enum DiscoveryMode {
    #[default]
    Auto,
    Enabled,
    Disabled,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub enum Level {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

impl Display for Level {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result {
        let level = match self {
            Level::Error => "error",
            Level::Warn => "warn",
            Level::Info => "info",
            Level::Debug => "debug",
            Level::Trace => "trace",
        };
        write!(f, "{level}")
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct LoggingSettings {
    /// Console (default) | File
    pub mode: LogMode,
    ///  Off | Error | Warn | Info (default) | Debug | Trace
    pub level: Level,
    /// Max number of temp logfiles to retain
    pub directory: Option<String>,
    pub filename: Option<String>,
    pub max_file_count: Option<i64>,
    /// Max logfile size in MB
    pub max_file_size: Option<usize>,
}

impl LoggingSettings {
    pub fn new(mode: LogMode, level: Level) -> Self {
        LoggingSettings {
            mode,
            level,
            directory: None,
            filename: None,
            max_file_count: None,
            max_file_size: None,
        }
    }

    pub fn with_directory(mut self, directory: String) -> Self {
        self.directory = Some(directory);
        self
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct DisplaySettingNode {
    pub value: String,
    pub hash: String,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct DisplaySettingsNode {
    pub custom_logo: Option<DisplaySettingNode>,
    pub custom_theme: Option<DisplaySettingNode>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct DisplaySettingsInput {
    pub custom_logo: Option<String>,
    pub custom_theme: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct LabelPrinterSettingNode {
    pub address: String,
    pub label_height: i32,
    pub label_width: i32,
    pub port: u16,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct MailSettings {
    pub port: u16,
    pub host: String,
    pub starttls: bool, //SmtpTransport::starttls_relay(host) vs SmtpTransport::builder_dangerous(host).port(port)
    pub username: String,
    pub password: String,
    pub from: String,
    pub interval: u64,
}
