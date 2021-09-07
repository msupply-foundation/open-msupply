use config::ConfigError;
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
}

#[derive(serde::Deserialize)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
}

#[derive(serde::Deserialize)]
pub struct SyncSettings {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub interval: u64,
}

impl ServerSettings {
    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

#[derive(serde::Deserialize)]
pub struct DatabaseSettings {
    pub username: String,
    pub password: String,
    pub port: u16,
    pub host: String,
    pub database_name: String,
}

#[cfg(not(feature = "sqlite"))]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.username, self.password, self.host, self.port, self.database_name
        )
    }

    pub fn connection_string_without_db(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}",
            self.username, self.password, self.host, self.port
        )
    }
}

#[cfg(feature = "sqlite")]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        format!("{}.db", self.database_name.to_string())
    }

    pub fn connection_string_without_db(&self) -> String {
        return self.connection_string();
    }
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
