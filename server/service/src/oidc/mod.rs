//! OpenID Connect single sign-on against Keycloak.
//!
//! The server runs the Authorization Code flow with PKCE itself, so no token ever reaches the
//! browser: the browser is redirected to Keycloak, comes back to `/auth/oidc/callback` with a
//! code, and the server exchanges it, verifies the ID token, and issues the same opaque session
//! token the password login issues ([`crate::session_store`]). From that point on the request
//! pipeline can't tell the two logins apart.
//!
//! Authentication and authorisation stay separate concerns, and which `user_account` the session
//! runs as is configurable ([`crate::settings::OidcAccountSource`]):
//!
//! * **Per person** (`account_source: username_claim`, the default) — the ID token's username claim
//!   must match an existing `user_account`. **What they may do** then comes from the roles claim,
//!   matched against mSupply accounts acting as permission groups whose permissions are granted to
//!   the user for the stores they already have access to. See [`role_grant`].
//! * **Per group** (`account_source: group`) — the user's group names the account, shared by
//!   everyone in it, and its own permissions are the whole story. See [`account`].
//!
//! Either way the account must already exist and be active on this site: users and store joins
//! remain owned by mSupply sync, and this never creates them.
//!
//! Disabled unless `oidc` is configured (see [`crate::settings::OidcSettings`]); the password
//! login is unaffected either way.

pub mod account;
pub mod claims;
pub mod discovery;
#[cfg(test)]
mod flow_tests;
pub mod login;
pub mod pending;
pub mod role_grant;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::Utc;
use jsonwebtoken::{
    jwk::{AlgorithmParameters, Jwk},
    Algorithm, DecodingKey, Validation,
};
use rand::RngExt;
use repository::RepositoryError;
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use tokio::sync::RwLock;
use url::Url;

use crate::settings::OidcSettings;
use discovery::{Cached, CachedJwks, CachedMetadata, ProviderMetadata};
use pending::{PendingAuth, PendingAuthStore, PENDING_AUTH_LIFETIME};

/// Bytes of entropy behind `state`, the PKCE verifier and the nonce.
const RANDOM_BYTES: usize = 32;

/// Signature algorithms accepted on an ID token.
///
/// Asymmetric only, and pinned here rather than taken from the token: an attacker who can pick the
/// algorithm can try to have a public key treated as an HMAC secret. Keycloak signs with RS256 by
/// default.
const ALLOWED_ALGORITHMS: [Algorithm; 9] = [
    Algorithm::RS256,
    Algorithm::RS384,
    Algorithm::RS512,
    Algorithm::PS256,
    Algorithm::PS384,
    Algorithm::PS512,
    Algorithm::ES256,
    Algorithm::ES384,
    Algorithm::EdDSA,
];

#[derive(Debug, thiserror::Error)]
pub enum OidcError {
    #[error("Single sign-on is not configured on this server")]
    NotConfigured,
    #[error("Single sign-on is misconfigured: {0}")]
    Configuration(String),
    #[error("Could not reach the identity provider: {0}")]
    ProviderUnreachable(String),
    #[error("The identity provider rejected the request: {0}")]
    ProviderRejected(String),
    /// The `state` didn't match an in-flight login: expired, already used, or forged. Also covers
    /// a callback arriving with no login having been started (a CSRF attempt).
    #[error("This sign-in attempt is unknown or has expired")]
    InvalidState,
    #[error("The identity token could not be verified: {0}")]
    InvalidIdToken(String),
    #[error("The identity token has no usable '{0}' claim")]
    MissingClaim(String),
    #[error("No mSupply user account matches '{0}'")]
    UnknownUser(String),
    /// No group the user belongs to names an mSupply account (`account_source: group`). Carries
    /// the groups that were tried, which is what an operator needs to see.
    #[error("None of the user's groups ({}) match an mSupply user account", .0.join(", "))]
    UnknownGroupAccount(Vec<String>),
    /// Two or more groups name *different* mSupply accounts, so which user this is has no answer.
    #[error("The user's groups match more than one mSupply user account ({})", .0.join(", "))]
    AmbiguousGroupAccount(Vec<String>),
    #[error("The mSupply user account '{0}' is not active")]
    AccountInactive(String),
    #[error("User account does not have access to any stores on this site")]
    NoSiteAccess,
    #[error("None of the user's roles ({}) match a permission group", .0.join(", "))]
    NoMatchingRole(Vec<String>),
    #[error("{0}")]
    InternalError(String),
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

impl OidcError {
    /// Stable, non-revealing slug for the browser. Passed to the login page as a query parameter,
    /// so it must not leak whether an account exists or why verification failed — details go to
    /// the server log instead.
    pub fn code(&self) -> &'static str {
        use OidcError::*;
        match self {
            NotConfigured => "not-configured",
            InvalidState => "expired",
            NoSiteAccess => "no-site-access",
            NoMatchingRole(_) => "no-permission-group",
            // Deliberately the same slug: "we could not find you" is all the browser is told
            // either way, and which lookup failed is a deployment detail for the log.
            UnknownUser(_) | UnknownGroupAccount(_) => "unknown-user",
            AccountInactive(_) => "account-inactive",
            // A misconfigured realm, not something the user can act on beyond telling an admin.
            AmbiguousGroupAccount(_) => "failed",
            Configuration(_)
            | ProviderUnreachable(_)
            | ProviderRejected(_)
            | InvalidIdToken(_)
            | MissingClaim(_)
            | InternalError(_)
            | DatabaseError(_) => "failed",
        }
    }
}

/// The token endpoint's success response. Only the ID token is used: it carries the identity and
/// the roles, and this server has no other API to call on the user's behalf.
#[derive(Deserialize)]
struct TokenResponse {
    id_token: Option<String>,
}

/// The token endpoint's error response (RFC 6749 §5.2).
#[derive(Deserialize)]
struct TokenErrorResponse {
    error: String,
    error_description: Option<String>,
}

pub struct OidcService {
    settings: OidcSettings,
    client: reqwest::Client,
    metadata: RwLock<Option<CachedMetadata>>,
    jwks: RwLock<Option<CachedJwks>>,
    pending: RwLock<PendingAuthStore>,
}

impl OidcSettings {
    /// Whether the provider's roles decide this deployment's permissions.
    ///
    /// Two independent choices collapse into one question here — which account the session runs as
    /// ([`crate::settings::OidcAccountSource`]) and where its permissions come from
    /// ([`crate::settings::OidcPermissionSource`]) — because `group` already answers both: the
    /// session *is* the group's account, so its own permissions apply and there is nothing for a
    /// role to add.
    pub fn maps_roles_to_permissions(&self) -> bool {
        use crate::settings::{OidcAccountSource::*, OidcPermissionSource::*};
        matches!(
            (self.account_source, self.permission_source),
            (UsernameClaim, Roles)
        )
    }
}

impl OidcService {
    /// Validates what can be validated without network access. The provider itself isn't contacted
    /// until the first sign-in, so a Keycloak that is down (or not yet up) doesn't stop the server
    /// from starting.
    pub fn new(settings: OidcSettings) -> Result<Self, OidcError> {
        Url::parse(&settings.issuer)
            .map_err(|err| OidcError::Configuration(format!("invalid oidc.issuer: {err}")))?;
        let redirect = Url::parse(&settings.redirect_url)
            .map_err(|err| OidcError::Configuration(format!("invalid oidc.redirect_url: {err}")))?;
        if !redirect.has_host() {
            return Err(OidcError::Configuration(
                "oidc.redirect_url must be an absolute URL, e.g. https://host/auth/oidc/callback"
                    .to_string(),
            ));
        }
        if settings.client_id.trim().is_empty() {
            return Err(OidcError::Configuration(
                "oidc.client_id must not be empty".to_string(),
            ));
        }
        if !settings.scopes.iter().any(|scope| scope == "openid") {
            return Err(OidcError::Configuration(
                "oidc.scopes must include 'openid', otherwise no identity token is issued"
                    .to_string(),
            ));
        }

        let client = util::https_client_builder().build().map_err(|err| {
            OidcError::Configuration(format!("could not build http client: {err}"))
        })?;

        Ok(OidcService {
            settings,
            client,
            metadata: RwLock::new(None),
            jwks: RwLock::new(None),
            pending: RwLock::new(PendingAuthStore::new()),
        })
    }

    pub fn settings(&self) -> &OidcSettings {
        &self.settings
    }

    /// Start a sign-in: mint `state`/PKCE/nonce, remember them, and return the provider URL to
    /// send the browser to.
    ///
    /// `redirect_after` must already have been checked to be a path on this server — it is handed
    /// straight back to the browser at the end of the flow.
    pub async fn begin_login(&self, redirect_after: Option<String>) -> Result<String, OidcError> {
        let metadata = self.metadata().await?;

        let state = random_token();
        let code_verifier = random_token();
        let nonce = random_token();

        let mut url = Url::parse(&metadata.authorization_endpoint).map_err(|err| {
            OidcError::Configuration(format!(
                "provider returned an invalid authorization_endpoint: {err}"
            ))
        })?;
        url.query_pairs_mut()
            .append_pair("response_type", "code")
            .append_pair("client_id", &self.settings.client_id)
            .append_pair("redirect_uri", &self.settings.redirect_url)
            .append_pair("scope", &self.settings.scopes.join(" "))
            .append_pair("state", &state)
            .append_pair("nonce", &nonce)
            .append_pair("code_challenge", &code_challenge(&code_verifier))
            .append_pair("code_challenge_method", "S256");

        let mut pending = self.pending.write().await;
        pending.insert(
            state,
            PendingAuth {
                code_verifier,
                nonce,
                redirect_after,
                expires_at: Utc::now() + PENDING_AUTH_LIFETIME,
            },
        );
        // The other half of the `expired` diagnosis: without a line here there is nothing to
        // correlate a failed callback against, so "did this flow ever start on this process?"
        // can't be answered from the log.
        log::info!(
            "OIDC sign-in started, redirecting to the provider ({} now in flight)",
            pending.len()
        );
        drop(pending);

        Ok(url.to_string())
    }

    /// Consume the in-flight login for `state`.
    pub async fn take_pending(&self, state: &str) -> Result<PendingAuth, OidcError> {
        self.pending
            .write()
            .await
            .take(state)
            .ok_or(OidcError::InvalidState)
    }

    /// How many sign-ins are waiting for the provider to come back.
    ///
    /// Only for diagnostics: an unknown `state` with **nothing** in flight almost always means the
    /// server restarted after the sign-in began (the store is in memory), which is otherwise
    /// indistinguishable from a stale tab or a replayed callback.
    pub async fn pending_count(&self) -> usize {
        self.pending.read().await.len()
    }

    /// Swap an authorization code for an ID token at the token endpoint.
    pub async fn exchange_code(
        &self,
        code: &str,
        code_verifier: &str,
    ) -> Result<String, OidcError> {
        let metadata = self.metadata().await?;

        let form = vec![
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", self.settings.redirect_url.as_str()),
            ("client_id", self.settings.client_id.as_str()),
            ("code_verifier", code_verifier),
        ];

        let mut request = self.client.post(&metadata.token_endpoint).form(&form);
        // Confidential clients authenticate with HTTP Basic (`client_secret_basic`), the spec
        // default and Keycloak's. Public clients are authenticated by PKCE alone.
        if let Some(secret) = &self.settings.client_secret {
            request = request.basic_auth(&self.settings.client_id, Some(secret));
        }

        let response = request
            .send()
            .await
            .map_err(|err| OidcError::ProviderUnreachable(format!("token endpoint: {err}")))?;

        let status = response.status();
        let body = response.text().await.map_err(|err| {
            OidcError::ProviderUnreachable(format!("could not read token response: {err}"))
        })?;

        if !status.is_success() {
            // The body is the provider's own error, not the user's data — safe to log, and it is
            // where misconfiguration (bad redirect_uri, wrong secret) actually shows up.
            let detail = match serde_json::from_str::<TokenErrorResponse>(&body) {
                Ok(error) => match error.error_description {
                    Some(description) => format!("{} ({description})", error.error),
                    None => error.error,
                },
                Err(_) => format!("HTTP {status}"),
            };
            return Err(OidcError::ProviderRejected(detail));
        }

        serde_json::from_str::<TokenResponse>(&body)
            .map_err(|err| {
                OidcError::ProviderRejected(format!("could not parse token response: {err}"))
            })?
            .id_token
            .ok_or_else(|| {
                OidcError::ProviderRejected(
                    "token response contained no id_token; check the 'openid' scope is granted"
                        .to_string(),
                )
            })
    }

    /// Verify an ID token's signature and claims, returning the claim set.
    ///
    /// Checks, in order: the algorithm is one we allow, the signature matches the provider's
    /// published key for the token's `kid`, `iss` is the provider we configured, `aud`/`azp` name
    /// our client, `exp`/`nbf` are current, and `nonce` matches the value minted when the flow
    /// started (which is what ties this token to this browser's sign-in).
    pub async fn verify_id_token(
        &self,
        id_token: &str,
        expected_nonce: &str,
    ) -> Result<Value, OidcError> {
        let header = jsonwebtoken::decode_header(id_token)
            .map_err(|err| OidcError::InvalidIdToken(format!("unreadable header: {err}")))?;

        let jwk = self.signing_jwk(header.kid.as_deref()).await?;
        // Prefer the algorithm the provider publishes with the key; fall back to the token's own
        // header, constrained to the asymmetric allow-list either way.
        let algorithm = jwk_algorithm(&jwk).unwrap_or(header.alg);
        if !ALLOWED_ALGORITHMS.contains(&algorithm) {
            return Err(OidcError::InvalidIdToken(format!(
                "unsupported signature algorithm {algorithm:?}"
            )));
        }

        let key = DecodingKey::from_jwk(&jwk)
            .map_err(|err| OidcError::InvalidIdToken(format!("unusable signing key: {err}")))?;

        let mut validation = Validation::new(algorithm);
        // The provider's own spelling of its issuer, rather than the configured one — `metadata()`
        // has already checked the two agree, and this is the string that will appear in `iss`.
        validation.set_issuer(&[self.metadata().await?.issuer]);
        validation.set_audience(&[&self.settings.client_id]);
        validation.set_required_spec_claims(&["exp", "iss", "aud", "sub"]);
        validation.validate_nbf = true;

        let claims = jsonwebtoken::decode::<Value>(id_token, &key, &validation)
            .map_err(|err| OidcError::InvalidIdToken(err.to_string()))?
            .claims;

        // With more than one audience the spec requires `azp` to identify the client the token was
        // issued to; reject a token minted for a different client of the same realm.
        if let Some(azp) = claims.get("azp").and_then(|azp| azp.as_str()) {
            if azp != self.settings.client_id {
                return Err(OidcError::InvalidIdToken(format!(
                    "token was issued to another client ({azp})"
                )));
            }
        }

        match claims.get("nonce").and_then(|nonce| nonce.as_str()) {
            Some(nonce) if nonce == expected_nonce => Ok(claims),
            Some(_) => Err(OidcError::InvalidIdToken(
                "nonce does not match this sign-in attempt".to_string(),
            )),
            None => Err(OidcError::InvalidIdToken("nonce claim missing".to_string())),
        }
    }

    /// The provider URL that ends its session, or `None` when that isn't on offer.
    ///
    /// `None` when the deployment hasn't asked for it (`logout_from_provider`) or when the provider
    /// advertises no `end_session_endpoint` — in both cases logout stays local, which is the
    /// behaviour without this feature.
    ///
    /// No `id_token_hint` is sent, so the provider will ask the user to confirm. That is the
    /// deliberate trade: a hint travels front-channel, in a URL the browser requests, so it would
    /// put the identity token into browser history and the provider's access logs. `client_id` is
    /// sent instead, which is what lets the provider honour `post_logout_redirect_uri`.
    ///
    /// `post_logout_redirect` must be registered on the provider (Keycloak: the client's **Valid
    /// post logout redirect URIs**) or the provider will refuse the redirect.
    pub async fn provider_logout_url(
        &self,
        post_logout_redirect: &str,
    ) -> Result<Option<String>, OidcError> {
        if !self.settings.logout_from_provider {
            return Ok(None);
        }
        let Some(end_session_endpoint) = self.metadata().await?.end_session_endpoint else {
            log::warn!(
                "oidc.logout_from_provider is set, but the provider advertises no \
                 end_session_endpoint — logging out of mSupply only"
            );
            return Ok(None);
        };

        let mut url = Url::parse(&end_session_endpoint).map_err(|err| {
            OidcError::Configuration(format!(
                "provider returned an invalid end_session_endpoint: {err}"
            ))
        })?;
        url.query_pairs_mut()
            .append_pair("client_id", &self.settings.client_id)
            .append_pair("post_logout_redirect_uri", post_logout_redirect);
        Ok(Some(url.to_string()))
    }

    /// Cached discovery document, re-fetched when stale.
    async fn metadata(&self) -> Result<ProviderMetadata, OidcError> {
        if let Some(cached) = self.metadata.read().await.as_ref() {
            if cached.is_fresh() {
                return Ok(cached.value.clone());
            }
        }

        let url = discovery::discovery_url(&self.settings.issuer);
        let metadata: ProviderMetadata = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|err| OidcError::ProviderUnreachable(format!("{url}: {err}")))?
            .error_for_status()
            .map_err(|err| OidcError::ProviderUnreachable(format!("{url}: {err}")))?
            .json()
            .await
            .map_err(|err| {
                OidcError::ProviderRejected(format!("invalid discovery document at {url}: {err}"))
            })?;

        // A mismatch here means tokens would fail `iss` validation anyway, and it catches the
        // common copy-paste error of pointing at the wrong realm.
        if metadata.issuer.trim_end_matches('/') != self.settings.issuer.trim_end_matches('/') {
            return Err(OidcError::Configuration(format!(
                "provider at {url} identifies as '{}', but oidc.issuer is '{}'",
                metadata.issuer, self.settings.issuer
            )));
        }

        *self.metadata.write().await = Some(Cached::new(metadata.clone()));
        Ok(metadata)
    }

    /// The provider's published key for `kid`, fetching or refreshing the key set as needed.
    ///
    /// An unknown `kid` normally means the realm keys rotated, so the key set is re-fetched once
    /// (rate limited by [`discovery::MIN_REFRESH_INTERVAL`]) before giving up.
    async fn signing_jwk(&self, kid: Option<&str>) -> Result<Jwk, OidcError> {
        let mut may_retry = true;
        if let Some(cached) = self.jwks.read().await.as_ref() {
            if cached.is_fresh() {
                if let Some(jwk) = pick_jwk(&cached.value, kid) {
                    return Ok(jwk);
                }
                may_retry = cached.may_refresh();
            }
        }

        if !may_retry {
            return Err(OidcError::InvalidIdToken(match kid {
                Some(kid) => format!("signing key '{kid}' is not published by the provider"),
                None => "provider publishes no usable signing key".to_string(),
            }));
        }

        let jwks = self.fetch_jwks().await?;
        pick_jwk(&jwks, kid).ok_or_else(|| {
            OidcError::InvalidIdToken(match kid {
                Some(kid) => format!("signing key '{kid}' is not published by the provider"),
                None => "provider publishes no usable signing key".to_string(),
            })
        })
    }

    async fn fetch_jwks(&self) -> Result<jsonwebtoken::jwk::JwkSet, OidcError> {
        let metadata = self.metadata().await?;
        let jwks: jsonwebtoken::jwk::JwkSet = self
            .client
            .get(&metadata.jwks_uri)
            .send()
            .await
            .map_err(|err| OidcError::ProviderUnreachable(format!("{}: {err}", metadata.jwks_uri)))?
            .error_for_status()
            .map_err(|err| OidcError::ProviderUnreachable(format!("{}: {err}", metadata.jwks_uri)))?
            .json()
            .await
            .map_err(|err| {
                OidcError::ProviderRejected(format!(
                    "invalid key set at {}: {err}",
                    metadata.jwks_uri
                ))
            })?;

        *self.jwks.write().await = Some(Cached::new(jwks.clone()));
        Ok(jwks)
    }
}

/// Pick the key for `kid`. A token with no `kid` is only accepted when the provider publishes
/// exactly one key, since otherwise there is no way to know which one signed it.
fn pick_jwk(jwks: &jsonwebtoken::jwk::JwkSet, kid: Option<&str>) -> Option<Jwk> {
    match kid {
        Some(kid) => jwks.find(kid).cloned(),
        None => match jwks.keys.as_slice() {
            [only] => Some(only.clone()),
            _ => None,
        },
    }
}

/// The algorithm a JWK declares, if any. Keycloak publishes `alg` on its keys; some providers
/// don't, hence the fallback to the token header.
fn jwk_algorithm(jwk: &Jwk) -> Option<Algorithm> {
    match &jwk.algorithm {
        AlgorithmParameters::RSA(_) | AlgorithmParameters::EllipticCurve(_) => jwk
            .common
            .key_algorithm
            .and_then(|algorithm| algorithm.to_string().parse().ok()),
        _ => None,
    }
}

/// URL-safe random token, used for `state`, the PKCE verifier and the nonce. 32 bytes encodes to
/// 43 characters, inside the PKCE verifier's 43..=128 range.
fn random_token() -> String {
    let bytes: [u8; RANDOM_BYTES] = rand::rng().random();
    URL_SAFE_NO_PAD.encode(bytes)
}

/// PKCE `S256` challenge for a verifier (RFC 7636 §4.2).
fn code_challenge(code_verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(code_verifier.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::{OidcAccountSource, OidcPermissionSource};

    fn settings() -> OidcSettings {
        OidcSettings {
            issuer: "https://keycloak.example.org/realms/msupply".to_string(),
            client_id: "open-msupply".to_string(),
            client_secret: None,
            redirect_url: "https://oms.example.org/auth/oidc/callback".to_string(),
            scopes: vec!["openid".to_string(), "profile".to_string()],
            account_source: OidcAccountSource::default(),
            username_claim: "preferred_username".to_string(),
            group_claim: "groups".to_string(),
            permission_source: OidcPermissionSource::default(),
            roles_claim: "realm_access.roles".to_string(),
            role_template_prefix: Some("role_".to_string()),
            logout_from_provider: false,
            button_label: "Sign in with Keycloak".to_string(),
        }
    }

    #[test]
    fn code_challenge_matches_the_rfc_7636_example() {
        // RFC 7636 Appendix B.
        assert_eq!(
            code_challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn random_tokens_are_distinct_and_pkce_sized() {
        let a = random_token();
        let b = random_token();
        assert_ne!(a, b);
        assert_eq!(a.len(), 43, "PKCE verifiers must be 43..=128 characters");
    }

    #[test]
    fn construction_rejects_unusable_configuration() {
        assert!(OidcService::new(settings()).is_ok());

        let missing_openid = OidcSettings {
            scopes: vec!["profile".to_string()],
            ..settings()
        };
        assert!(matches!(
            OidcService::new(missing_openid),
            Err(OidcError::Configuration(_))
        ));

        let relative_redirect = OidcSettings {
            redirect_url: "/auth/oidc/callback".to_string(),
            ..settings()
        };
        assert!(matches!(
            OidcService::new(relative_redirect),
            Err(OidcError::Configuration(_))
        ));

        let bad_issuer = OidcSettings {
            issuer: "not a url".to_string(),
            ..settings()
        };
        assert!(matches!(
            OidcService::new(bad_issuer),
            Err(OidcError::Configuration(_))
        ));

        let no_client = OidcSettings {
            client_id: "  ".to_string(),
            ..settings()
        };
        assert!(matches!(
            OidcService::new(no_client),
            Err(OidcError::Configuration(_))
        ));
    }

    #[test]
    fn only_the_per_person_roles_combination_maps_roles() {
        use crate::settings::{OidcAccountSource::*, OidcPermissionSource::*};
        let with = |account_source, permission_source| {
            OidcSettings {
                account_source,
                permission_source,
                ..settings()
            }
            .maps_roles_to_permissions()
        };

        // The only combination that reads roles at all.
        assert!(with(UsernameClaim, Roles));
        // The user asked to be validated as their Keycloak username and nothing more.
        assert!(!with(UsernameClaim, Account));
        // Group mode already answers both questions — a role has nothing left to add.
        assert!(!with(Group, Roles));
        assert!(!with(Group, Account));
    }

    #[test]
    fn error_codes_do_not_leak_detail() {
        assert_eq!(OidcError::InvalidState.code(), "expired");
        assert_eq!(
            OidcError::InvalidIdToken("signature mismatch on kid abc".to_string()).code(),
            "failed"
        );
        assert_eq!(
            OidcError::NoMatchingRole(vec!["offline_access".to_string()]).code(),
            "no-permission-group"
        );
        // Group mode's "we couldn't find you" is the same slug as the per-person one: which lookup
        // failed is a deployment detail, and the browser is told no more either way.
        assert_eq!(
            OidcError::UnknownGroupAccount(vec!["everyone".to_string()]).code(),
            "unknown-user"
        );
        assert_eq!(
            OidcError::UnknownUser("jane".to_string()).code(),
            OidcError::UnknownGroupAccount(vec![]).code()
        );
        // A realm mapping one person to two accounts is an admin's problem, not the user's.
        assert_eq!(
            OidcError::AmbiguousGroupAccount(vec![
                "role_dispensary".to_string(),
                "role_stock".to_string()
            ])
            .code(),
            "failed"
        );
    }
}
