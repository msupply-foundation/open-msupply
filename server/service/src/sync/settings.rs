use serde::{Deserialize, Serialize};
use std::convert::TryFrom;

// See README.md for description of when this API version needs to be updated
pub(crate) static SYNC_V5_VERSION: u32 = 16; // bumped for 2.21.0 OG v9.01.X: client handles the non-blocking (202) initialise + /sync/v5/site polling
pub(crate) static SYNC_V6_VERSION: u32 = 5; // bumped for 2.9.02 (adding new types to system log)

#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Default)]
#[serde(try_from = "SyncSettingsRaw")]
pub struct SyncSettings {
    // url/username/password_sha256/interval_seconds are all-or-nothing (validated in `TryFrom`);
    // `has_core_sync_settings()` reports whether they're set.
    pub url: String,
    pub username: String,
    pub password_sha256: String,
    /// Sync interval
    pub interval_seconds: u64,
    // Number of records to pull or push in one API call
    pub batch_size: BatchSize,
    /// Disable the outer transaction wrapping integration. Set to true if PostgreSQL runs out of
    /// shared memory (max_locks_per_transaction) during large initial syncs.
    pub disable_integration_transaction: bool,
    /// On a central server, relax the v7 hardware-id and token guards so a site can re-pair from a
    /// new machine without an admin reset: skips the hardware-id match and the "token already
    /// allocated" check. Site name, password and token are still verified. For recovery/migration.
    pub relax_hardware_id_token_checks: bool,
}

/// Deserialization shape for [`SyncSettings`]: credential fields are optional so `TryFrom` can
/// validate them as a group (all set, or all omitted).
#[derive(Deserialize)]
struct SyncSettingsRaw {
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    username: Option<String>,
    #[serde(default)]
    password_sha256: Option<String>,
    #[serde(default)]
    interval_seconds: Option<u64>,
    #[serde(default)]
    batch_size: BatchSize,
    #[serde(default)]
    disable_integration_transaction: bool,
    #[serde(default)]
    relax_hardware_id_token_checks: bool,
}

impl TryFrom<SyncSettingsRaw> for SyncSettings {
    type Error = String;

    fn try_from(raw: SyncSettingsRaw) -> Result<Self, Self::Error> {
        let SyncSettingsRaw {
            url,
            username,
            password_sha256,
            interval_seconds,
            batch_size,
            disable_integration_transaction,
            relax_hardware_id_token_checks,
        } = raw;

        // Credentials are all-or-nothing: reject a partial set so a half-filled `sync:` block fails
        // loudly at startup instead of silently dropping fields.
        let (url, username, password_sha256, interval_seconds) =
            match (url, username, password_sha256, interval_seconds) {
                (Some(url), Some(username), Some(password_sha256), Some(interval_seconds)) => {
                    (url, username, password_sha256, interval_seconds)
                }
                (None, None, None, None) => (String::new(), String::new(), String::new(), 0),
                _ => {
                    return Err("sync settings must set url, username, password_sha256 and \
                                interval_seconds all together, or omit them all (a flags-only sync \
                                block)"
                        .to_string())
                }
            };

        Ok(SyncSettings {
            url,
            username,
            password_sha256,
            interval_seconds,
            batch_size,
            disable_integration_transaction,
            relax_hardware_id_token_checks,
        })
    }
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

    /// Whether the core sync credentials (url, username, password) are set; a `sync:` block may
    /// instead carry only flags, which callers treat as "sync not configured".
    pub fn has_core_sync_settings(&self) -> bool {
        !self.url.is_empty() && !self.username.is_empty() && !self.password_sha256.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn partial_credentials_are_rejected() {
        // Partial credential set (no password/interval) is rejected.
        let err = serde_yaml::from_str::<SyncSettings>("url: http://x\nusername: y\n")
            .unwrap_err()
            .to_string();
        assert!(err.contains("all together"), "unexpected error: {err}");

        // A flags-only block is allowed.
        let flags_only =
            serde_yaml::from_str::<SyncSettings>("relax_hardware_id_token_checks: true\n").unwrap();
        assert!(flags_only.relax_hardware_id_token_checks);
        assert!(!flags_only.has_core_sync_settings());

        // All four credentials present is allowed.
        let full = serde_yaml::from_str::<SyncSettings>(
            "url: http://x\nusername: y\npassword_sha256: z\ninterval_seconds: 300\n",
        )
        .unwrap();
        assert!(full.has_core_sync_settings());
    }
}
