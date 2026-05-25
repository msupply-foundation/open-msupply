use async_graphql::InputObject;
use service::sync::settings::{BatchSize, SyncSettings};
use util::hash::sha256;

#[derive(InputObject)]
pub struct SyncSettingsInput {
    pub url: String,
    pub username: String,
    /// Plain text password
    pub password: String,
    /// Sync interval
    pub interval_seconds: u64,
    /// Optional override for the sync batch size. When set, the value is
    /// applied uniformly to remote_pull, remote_push and central_pull,
    /// letting low-bandwidth sites pick a smaller batch.
    pub batch_size: Option<u32>,
}

impl SyncSettingsInput {
    pub fn to_domain(&self) -> SyncSettings {
        SyncSettings {
            url: self.url.clone(),
            username: self.username.clone(),
            password_sha256: sha256(&self.password),
            interval_seconds: self.interval_seconds,
            batch_size: self
                .batch_size
                .map(|n| BatchSize {
                    remote_pull: n,
                    remote_push: n,
                    central_pull: n,
                })
                .unwrap_or_default(),
            disable_integration_transaction: false,
        }
    }
}
