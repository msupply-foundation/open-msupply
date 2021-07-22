use config::ConfigError;
use std::{env::VarError, fmt::{Debug, Display, Formatter, Result as FmtResult}};

#[derive(serde::Deserialize)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
}

#[derive(serde::Deserialize)]
pub struct ServerSettings {
    pub port: u16,
    pub host: String,
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

pub enum SettingsError {
    Config(ConfigError),
    Environment(VarError),
    Path(String),
}

impl Debug for SettingsError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            SettingsError::Config(err) => write!(f, "{:?}", err),
            SettingsError::Environment(err) => write!(f, "{:?}", err),
            SettingsError::Path(s) => write!(f, "{:?}", s),
        }
    }
}

impl Display for SettingsError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            SettingsError::Config(err) => write!(f, "{}", err),
            SettingsError::Environment(err) => write!(f, "{}", err),
            SettingsError::Path(s) => write!(f, "{}", s),
        }
    }
}

impl From<VarError> for SettingsError {
    fn from(err: VarError) -> SettingsError {
        SettingsError::Environment(err)
    }
}

impl From<ConfigError> for SettingsError {
    fn from(err: ConfigError) -> SettingsError {
        SettingsError::Config(err)
    }
}
