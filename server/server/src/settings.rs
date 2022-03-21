use config::ConfigError;
use repository::database_settings::DatabaseSettings;
use std::{
    env::VarError,
    fmt::{Debug, Display, Formatter, Result as FmtResult},
    io::Error as IoError,
};

#[derive(serde::Deserialize)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
    pub sync: SyncSettings,
    pub auth: AuthSettings,
}

#[derive(serde::Deserialize)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
    #[serde(default)]
    pub debug_no_access_control: bool,
}

#[derive(serde::Deserialize, Clone)]
pub struct SyncSettings {
    pub url: String,
    pub username: String,
    pub password: String,
    /// sync interval in sec
    pub interval: u64,
    pub central_server_site_id: u32,
    pub site_id: u32,
    pub site_hardware_id: String,
}

impl ServerSettings {
    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

#[derive(serde::Deserialize)]
pub struct AuthSettings {
    pub token_secret: String,
}

pub enum SettingsError {
    Config(ConfigError),
    Environment(VarError),
    File(IoError),
}

impl Debug for SettingsError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            SettingsError::Config(err) => write!(f, "{:?}", err),
            SettingsError::Environment(err) => write!(f, "{:?}", err),
            SettingsError::File(err) => write!(f, "{:?}", err),
        }
    }
}

impl Display for SettingsError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            SettingsError::Config(err) => write!(f, "{}", err),
            SettingsError::Environment(err) => write!(f, "{}", err),
            SettingsError::File(err) => write!(f, "{}", err),
        }
    }
}

impl From<ConfigError> for SettingsError {
    fn from(err: ConfigError) -> SettingsError {
        SettingsError::Config(err)
    }
}

impl From<IoError> for SettingsError {
    fn from(err: IoError) -> SettingsError {
        SettingsError::File(err)
    }
}

impl From<VarError> for SettingsError {
    fn from(err: VarError) -> SettingsError {
        SettingsError::Environment(err)
    }
}
