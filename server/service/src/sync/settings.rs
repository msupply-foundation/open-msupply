use serde::Deserialize;

#[derive(Deserialize, Clone, Debug, PartialEq, Default)]
pub struct SyncSettings {
    pub url: String,
    pub username: String,
    pub password_sha256: String,
    /// sync interval in sec
    pub interval_sec: u64,
    // Number of records to pull or push in one API call
    #[serde(default)]
    pub batch_size: BatchSize,
}

#[derive(Clone, Debug, PartialEq, Deserialize)]
pub struct BatchSize {
    pub remote_pull: u32,
    pub remote_push: u32,
    pub central_pull: u32,
}

impl Default for BatchSize {
    fn default() -> Self {
        Self {
            remote_pull: 500,
            remote_push: 1024,
            central_pull: 500,
        }
    }
}
