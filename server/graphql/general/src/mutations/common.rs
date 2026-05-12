use async_graphql::InputObject;
use service::sync::settings::SyncSettings;
use util::hash::sha256;

#[derive(InputObject)]
pub struct SyncSettingsInput {
    pub url: String,
    pub username: String,
    /// Plain text password
    pub password: String,
    /// Sync interval
    pub interval_seconds: u64,
    /// Idle read timeout in seconds for sync HTTP requests. Leave unset to use
    /// the server default (300s). Lower values fail faster on stalled
    /// connections; higher values tolerate slow servers.
    pub read_idle_timeout_seconds: Option<u64>,
}

impl SyncSettingsInput {
    pub fn to_domain(&self) -> SyncSettings {
        SyncSettings {
            url: self.url.clone(),
            username: self.username.clone(),
            password_sha256: sha256(&self.password),
            interval_seconds: self.interval_seconds,
            read_idle_timeout_seconds: self.read_idle_timeout_seconds,
            batch_size: Default::default(),
            disable_integration_transaction: false,
        }
    }
}
