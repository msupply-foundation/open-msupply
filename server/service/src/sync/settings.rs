use serde::Deserialize;

// See README.md for description of when this API version needs to be updated
pub(crate) static SYNC_V5_VERSION: u32 = 5;

#[derive(Deserialize, Clone, Debug, PartialEq, Default)]
pub struct SyncSettings {
    pub url: String,
    pub username: String,
    pub password_sha256: String,
    /// Sync interval
    pub interval_seconds: u64,
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

impl SyncSettings {
    /// Check to see if sync configuration difference would require confirmation that site is still the same
    /// for example if site username is was changed, we want to check that site username against the server
    /// and make sure it's still the same site
    pub fn core_site_details_changed(&self, other: &SyncSettings) -> bool {
        let equal = self.username == other.username
            && self.url == other.url
            && self.password_sha256 == other.password_sha256;
        !equal
    }
}
