use config::ConfigError;
use repository::database_settings::DatabaseSettings;
use service::sync_settings::SyncSettings;
use std::{
    env::VarError,
    fmt::{Debug, Display, Formatter, Result as FmtResult},
    io::Error as IoError,
};

#[derive(serde::Deserialize, Clone)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
    pub sync: Option<SyncSettings>,
    pub auth: AuthSettings,
}

#[derive(serde::Deserialize, Clone)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
    /// Indicates if the server runs in development mode
    #[serde(default)]
    pub develop: bool,
    /// Only used in development mode
    #[serde(default)]
    pub debug_no_access_control: bool,
    #[serde(default)]
    // allow any origin in development mode
    pub debug_cors_permissive: bool,
    //  Sets the allowed origin for cors requests
    pub cors_origin: String,
}

impl ServerSettings {
    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

#[derive(serde::Deserialize, Clone)]
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
