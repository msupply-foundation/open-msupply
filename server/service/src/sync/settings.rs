use serde::{Deserialize, Serialize};
use std::convert::TryFrom;

// See README.md for description of when this API version needs to be updated
pub(crate) static SYNC_V5_VERSION: u32 = 15; // bumped for OMS v3.00.00 OG version 9.01.00
pub(crate) static SYNC_V6_VERSION: u32 = 5; // bumped for 2.9.02 (adding new types to system log)

#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Default)]
#[serde(try_from = "SyncSettingsRaw")]
pub struct SyncSettings {
    // The core upstream-sync credentials are all-or-nothing: a `sync:` block must set all of
    // url/username/password_sha256/interval_seconds together (upstream sync configured), or omit
    // them all (a flags-only block, e.g. just `disable_remote_site_auth`). A partial set is a
    // configuration error — see the `TryFrom` impl below. Use `has_core_sync_settings()` to tell a
    // configured block from a flags-only one.
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
    /// When true, the central server skips v7 remote-site auth checks: the hardware-id match
    /// (on every pull/push/status) and, during token issuance, the hardware-id match and the
    /// "token already allocated" guard (a fresh token is minted, overwriting any existing one).
    /// Site name + password are still required. Defaults to false. Only affects v7; intended for
    /// recovery/migration, not normal operation.
    pub disable_remote_site_auth: bool,
}

/// Raw deserialization shape for [`SyncSettings`]. The four upstream-sync credential fields are
/// optional here so they can be validated as a group (all set, or all omitted) in `TryFrom`,
/// while the standalone flags (`batch_size`, `disable_*`) can appear on their own.
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
    disable_remote_site_auth: bool,
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
            disable_remote_site_auth,
        } = raw;

        // url/username/password_sha256/interval_seconds are all-or-nothing: either upstream sync is
        // fully configured, or the block carries only flags. A partial set is rejected so a typo or
        // a half-filled `sync:` block fails loudly at startup instead of silently dropping fields.
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
            disable_remote_site_auth,
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

    /// Whether the core sync settings (url, username, password) are set. A `sync:` yaml block may
    /// legitimately contain only flags (e.g. `disable_remote_site_auth`) without configuring
    /// upstream sync — for that case this returns false and callers should treat the block as
    /// "sync not configured" for credential / seeding / auth purposes.
    pub fn has_core_sync_settings(&self) -> bool {
        !self.url.is_empty() && !self.username.is_empty() && !self.password_sha256.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // The credential fields are all-or-nothing. This guards the TryFrom validation: a half-filled
    // `sync:` block must be rejected, not silently completed with blanks.
    #[test]
    fn partial_credentials_are_rejected() {
        // url + username, but no password/interval — a partial credential set.
        let err = serde_yaml::from_str::<SyncSettings>("url: http://x\nusername: y\n")
            .unwrap_err()
            .to_string();
        assert!(err.contains("all together"), "unexpected error: {err}");

        // Flags-only block (no credentials at all) is allowed.
        let flags_only =
            serde_yaml::from_str::<SyncSettings>("disable_remote_site_auth: true\n").unwrap();
        assert!(flags_only.disable_remote_site_auth);
        assert!(!flags_only.has_core_sync_settings());

        // All four credentials present is allowed.
        let full = serde_yaml::from_str::<SyncSettings>(
            "url: http://x\nusername: y\npassword_sha256: z\ninterval_seconds: 300\n",
        )
        .unwrap();
        assert!(full.has_core_sync_settings());
    }
}
