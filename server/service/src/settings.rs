use crate::sync_settings::SyncSettings;
use repository::database_settings::DatabaseSettings;

#[derive(serde::Deserialize, Clone)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
    pub sync: Option<SyncSettings>,
}

#[derive(serde::Deserialize, Clone)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
    /// Allow to run the server in http mode
    #[serde(default)]
    pub danger_allow_http: bool,

    /// Indicates if the server runs in development mode
    #[serde(default)]
    pub develop: bool,
    /// Only used in development mode
    #[serde(default)]
    pub debug_no_access_control: bool,
    #[serde(default)]
    /// Allow any origin in development mode
    pub debug_cors_permissive: bool,
    /// Sets the allowed origin for cors requests
    pub cors_origins: Vec<String>,

    /// Directory where the server stores its data, e.g. sqlite DB file or certs
    pub base_dir: Option<String>,
}

impl ServerSettings {
    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
