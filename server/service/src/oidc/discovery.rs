//! Provider metadata and signing keys, fetched from the issuer and cached.

use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::jwk::JwkSet;
use serde::{Deserialize, Serialize};

/// How long a fetched discovery document or key set is reused before being re-fetched. Keycloak
/// realm keys are long lived; a rotation is picked up sooner than this because an unknown `kid`
/// forces a refresh (see [`super::OidcService::decoding_key`]).
pub const CACHE_LIFETIME: Duration = Duration::hours(1);

/// Shortest gap between two `kid`-triggered key-set refreshes. Without it, a token quoting a
/// `kid` the provider has never published (a stray token, or a probe) would make every request
/// hit `jwks_uri`.
pub const MIN_REFRESH_INTERVAL: Duration = Duration::minutes(1);

/// The subset of the OpenID Connect discovery document this server uses.
///
/// Endpoints are read from the provider rather than assembled from the issuer URL, because the
/// paths differ between providers (and between Keycloak versions).
#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
pub struct ProviderMetadata {
    pub issuer: String,
    pub authorization_endpoint: String,
    pub token_endpoint: String,
    pub jwks_uri: String,
    /// RP-initiated logout. Not used yet — logging out of mSupply intentionally leaves the
    /// Keycloak session alone, so the user isn't signed out of unrelated applications.
    #[serde(default)]
    pub end_session_endpoint: Option<String>,
}

/// A value with the time it goes stale.
#[derive(Debug, Clone)]
pub struct Cached<T> {
    pub value: T,
    pub fetched_at: DateTime<Utc>,
}

impl<T> Cached<T> {
    pub fn new(value: T) -> Self {
        Cached {
            value,
            fetched_at: Utc::now(),
        }
    }

    pub fn is_fresh(&self) -> bool {
        Utc::now() < self.fetched_at + CACHE_LIFETIME
    }

    /// Whether a forced refresh (unknown `kid`) is allowed yet.
    pub fn may_refresh(&self) -> bool {
        Utc::now() >= self.fetched_at + MIN_REFRESH_INTERVAL
    }
}

pub type CachedMetadata = Cached<ProviderMetadata>;
pub type CachedJwks = Cached<JwkSet>;

/// Discovery URL for an issuer. Per spec `.well-known/openid-configuration` is appended to the
/// issuer *including* any path component, e.g.
/// `https://host/realms/msupply` -> `https://host/realms/msupply/.well-known/openid-configuration`.
pub fn discovery_url(issuer: &str) -> String {
    format!(
        "{}/.well-known/openid-configuration",
        issuer.trim_end_matches('/')
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovery_url_preserves_the_realm_path() {
        assert_eq!(
            discovery_url("https://keycloak.example.org/realms/msupply"),
            "https://keycloak.example.org/realms/msupply/.well-known/openid-configuration"
        );
    }

    #[test]
    fn discovery_url_tolerates_a_trailing_slash() {
        assert_eq!(
            discovery_url("https://keycloak.example.org/realms/msupply/"),
            "https://keycloak.example.org/realms/msupply/.well-known/openid-configuration"
        );
    }

    #[test]
    fn cache_freshness_follows_fetch_time() {
        let fresh = Cached::new(());
        assert!(fresh.is_fresh());
        assert!(
            !fresh.may_refresh(),
            "a just-fetched key set should not be re-fetched"
        );

        let stale = Cached {
            value: (),
            fetched_at: Utc::now() - CACHE_LIFETIME - Duration::seconds(1),
        };
        assert!(!stale.is_fresh());
        assert!(stale.may_refresh());
    }

    #[test]
    fn metadata_ignores_unknown_fields() {
        // Real discovery documents carry dozens of fields we don't read.
        let document = serde_json::json!({
            "issuer": "https://keycloak.example.org/realms/msupply",
            "authorization_endpoint": "https://keycloak.example.org/realms/msupply/protocol/openid-connect/auth",
            "token_endpoint": "https://keycloak.example.org/realms/msupply/protocol/openid-connect/token",
            "jwks_uri": "https://keycloak.example.org/realms/msupply/protocol/openid-connect/certs",
            "grant_types_supported": ["authorization_code"],
        });

        let metadata: ProviderMetadata = serde_json::from_value(document).unwrap();
        assert_eq!(
            metadata.issuer,
            "https://keycloak.example.org/realms/msupply"
        );
        assert_eq!(metadata.end_session_endpoint, None);
    }
}
