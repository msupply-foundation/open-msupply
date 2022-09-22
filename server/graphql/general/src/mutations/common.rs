use async_graphql::InputObject;
use service::sync::settings::SyncSettings;
use util::hash::sha256;

#[derive(InputObject)]
pub struct SyncSettingsInput {
    pub url: String,
    pub username: String,
    /// Plain text password
    pub password: String,
    /// Sync interval in sec
    pub interval_sec: u64,
}

impl SyncSettingsInput {
    pub fn to_domain(self) -> SyncSettings {
        SyncSettings {
            url: self.url,
            username: self.username,
            password_sha256: sha256(&self.password),
            interval_sec: self.interval_sec,
            batch_size: Default::default(),
        }
    }
}
