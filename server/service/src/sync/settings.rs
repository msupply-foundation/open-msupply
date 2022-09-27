#[derive(serde::Deserialize, Clone, Debug, PartialEq, Default)]
pub struct SyncSettings {
    pub url: String,
    pub username: String,
    pub password_sha256: String,
    /// sync interval in sec
    pub interval_sec: u64,
}
