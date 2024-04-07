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
}

impl SyncSettingsInput {
    pub fn to_domain(&self) -> SyncSettings {
        SyncSettings {
            url: self.url.clone(),
            username: self.username.clone(),
            password_sha256: sha256(&self.password),
            interval_seconds: self.interval_seconds,
            batch_size: Default::default(),
        }
    }
}
