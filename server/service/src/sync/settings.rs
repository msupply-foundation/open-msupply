use serde::{Deserialize, Serialize};

// See README.md for description of when this API version needs to be updated
pub(crate) static SYNC_V5_VERSION: u32 = 15; // bumped for OMS v3.00.00 OG version 9.01.00
pub(crate) static SYNC_V6_VERSION: u32 = 5; // bumped for 2.9.02 (adding new types to system log)

#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Default)]
pub struct SyncSettings {
    pub url: String,
    pub username: String,
    pub password_sha256: String,
    /// Sync interval
    pub interval_seconds: u64,
    // Number of records to pull or push in one API call
    #[serde(default)]
    pub batch_size: BatchSize,
    /// Cursor window sizes for changelog queries (see `ChangelogRepository`).
    #[serde(default)]
    pub changelog_query_window: ChangelogQueryWindow,
    /// Disable the outer transaction wrapping integration. Set to true if PostgreSQL runs out of
    /// shared memory (max_locks_per_transaction) during large initial syncs.
    #[serde(default)]
    pub disable_integration_transaction: bool,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
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

/// Cursor window sizes (in cursor values) for changelog queries. The window
/// bounds each changelog sub-query so the planner can drive an index scan
/// rather than scanning the whole table; see `ChangelogRepository::query_with_window`.
/// Patient pulls use a larger window because patient records are sparse across
/// the cursor space, so a narrow window wastes iterations on empty sub-queries.
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub struct ChangelogQueryWindow {
    /// Window for normal (non-patient) changelog pulls.
    pub normal: i64,
    /// Window for patient data pulls.
    pub patient: i64,
}

impl Default for ChangelogQueryWindow {
    fn default() -> Self {
        Self {
            normal: 250_000,
            patient: 5_000_000,
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
