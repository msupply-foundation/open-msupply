use std::collections::HashMap;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Duration, Utc};
use rand::RngExt;

/// How long a session stays valid after the last authenticated request.
/// Each successful `validate_and_slide` bumps the expiry to `now + SESSION_LIFETIME`.
pub const SESSION_LIFETIME: Duration = Duration::hours(1);

const TOKEN_BYTES: usize = 32;

pub type SessionToken = String;

#[derive(Debug, Clone)]
pub struct ValidatedSession {
    pub user_id: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug)]
struct SessionEntry {
    user_id: String,
    expires_at: DateTime<Utc>,
    /// True when an external identity provider authenticated this session (see
    /// [`crate::oidc`]) rather than a password. The only thing that reads it is logout: ending the
    /// provider's session too is meaningful for these and meaningless — or actively wrong — for a
    /// password session, whose owner may have no provider account at all.
    ///
    /// Deliberately a flag and not the provider's ID token. Using the token as an
    /// `id_token_hint` would let the provider skip its logout confirmation, but a front-channel
    /// hint travels in a URL the **browser** requests, so the token would land in browser history
    /// and the provider's access logs. Keeping no token at all is worth one confirmation click
    /// (see `oidc::OidcService::provider_logout_url`).
    from_provider: bool,
}

/// In-memory store of active sessions.
///
/// Replaces the JWT + `TokenBucket` pair: a session token is now an opaque random string that
/// only exists as a key into this map. The map owns expiry and sliding-window logic.
///
/// **Concurrency note**: every authenticated request takes `RwLock::write` here because
/// `validate_and_slide` mutates `expires_at`. For low-concurrency deployments this is fine
/// (each lock hold is a single `HashMap::get_mut` + arithmetic). If contention shows up under
/// load, options include sharding by token prefix or storing `expires_at` as `AtomicI64` inside
/// `SessionEntry` so the slide path can become a read-lock + atomic update.
#[derive(Default, Debug)]
pub struct SessionStore {
    sessions: HashMap<SessionToken, SessionEntry>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Issue a new session token for the user. The returned token is the only handle —
    /// it is not stored anywhere else server-side.
    pub fn create(&mut self, user_id: &str) -> SessionToken {
        self.create_entry(user_id, false)
    }

    /// As [`Self::create`], for a session an external identity provider authenticated. Recorded so
    /// logout can offer to end the provider's session too — see [`SessionEntry::from_provider`].
    pub fn create_from_provider(&mut self, user_id: &str) -> SessionToken {
        self.create_entry(user_id, true)
    }

    fn create_entry(&mut self, user_id: &str, from_provider: bool) -> SessionToken {
        let token = generate_token();
        let expires_at = Utc::now() + SESSION_LIFETIME;
        self.sessions.insert(
            token.clone(),
            SessionEntry {
                user_id: user_id.to_string(),
                expires_at,
                from_provider,
            },
        );
        token
    }

    /// Whether this session was authenticated by an external identity provider.
    ///
    /// Read-only and expiry-agnostic: the caller has just validated the session, and an expired
    /// one has nothing to log out of anyway.
    pub fn is_from_provider(&self, token: &str) -> bool {
        self.sessions
            .get(token)
            .is_some_and(|entry| entry.from_provider)
    }

    /// Look up a session token; if present and not expired, slide its expiry forward and return
    /// the validated session. Otherwise return `None` (and drop the entry if it was expired).
    pub fn validate_and_slide(&mut self, token: &str) -> Option<ValidatedSession> {
        let now = Utc::now();
        let entry = self.sessions.get_mut(token)?;
        if entry.expires_at < now {
            // Expired — drop it.
            self.sessions.remove(token);
            return None;
        }
        entry.expires_at = now + SESSION_LIFETIME;
        Some(ValidatedSession {
            user_id: entry.user_id.clone(),
            expires_at: entry.expires_at,
        })
    }

    /// Remove a single session (e.g. on logout from one device).
    pub fn revoke(&mut self, token: &str) {
        self.sessions.remove(token);
    }

    /// Remove all sessions for a user (e.g. password change, admin force-logout).
    pub fn revoke_all_for_user(&mut self, user_id: &str) {
        self.sessions.retain(|_, entry| entry.user_id != user_id);
    }
}

fn generate_token() -> SessionToken {
    let bytes: [u8; TOKEN_BYTES] = rand::rng().random();
    URL_SAFE_NO_PAD.encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_and_validate() {
        let mut store = SessionStore::new();
        let token = store.create("user-1");
        let session = store.validate_and_slide(&token).expect("session valid");
        assert_eq!(session.user_id, "user-1");
    }

    #[test]
    fn unknown_token_returns_none() {
        let mut store = SessionStore::new();
        assert!(store.validate_and_slide("not-a-token").is_none());
    }

    #[test]
    fn sliding_bumps_expiry() {
        let mut store = SessionStore::new();
        let token = store.create("u");
        let first = store
            .validate_and_slide(&token)
            .expect("session valid")
            .expires_at;
        std::thread::sleep(std::time::Duration::from_millis(1100));
        let second = store
            .validate_and_slide(&token)
            .expect("session still valid")
            .expires_at;
        assert!(
            second > first,
            "expiry should bump forward after a second slide ({} -> {})",
            first,
            second
        );
    }

    #[test]
    fn expired_session_is_dropped() {
        let mut store = SessionStore::new();
        let token = store.create("u");
        // Manually expire the entry instead of sleeping for SESSION_LIFETIME.
        store.sessions.get_mut(&token).unwrap().expires_at = Utc::now() - Duration::seconds(1);
        assert!(store.validate_and_slide(&token).is_none());
        assert!(
            !store.sessions.contains_key(&token),
            "expired session should be removed"
        );
    }

    #[test]
    fn only_provider_sessions_are_marked_as_such() {
        let mut store = SessionStore::new();
        let password = store.create("u");
        let provider = store.create_from_provider("u");

        assert!(!store.is_from_provider(&password));
        assert!(store.is_from_provider(&provider));
        // An unknown token is not a provider session — logout must not act on a guess.
        assert!(!store.is_from_provider("not-a-token"));

        // The mark is not what makes a session valid, and doesn't change its lifetime.
        assert_eq!(
            store.validate_and_slide(&provider).map(|s| s.user_id),
            Some("u".to_string())
        );
    }

    #[test]
    fn a_revoked_provider_session_is_no_longer_one() {
        let mut store = SessionStore::new();
        let token = store.create_from_provider("u");
        store.revoke(&token);

        // Logout revokes before redirecting, so this is the state the redirect is built from —
        // it must not resurrect a session's identity.
        assert!(!store.is_from_provider(&token));
    }

    #[test]
    fn revoke_removes_single_session() {
        let mut store = SessionStore::new();
        let a = store.create("u");
        let b = store.create("u");
        store.revoke(&a);
        assert!(store.validate_and_slide(&a).is_none());
        assert!(store.validate_and_slide(&b).is_some());
    }

    #[test]
    fn revoke_all_for_user_drops_all_sessions() {
        let mut store = SessionStore::new();
        let a = store.create("u");
        let b = store.create("u");
        let other = store.create("other");
        store.revoke_all_for_user("u");
        assert!(store.validate_and_slide(&a).is_none());
        assert!(store.validate_and_slide(&b).is_none());
        assert!(
            store.validate_and_slide(&other).is_some(),
            "unrelated user's session preserved"
        );
    }

    #[test]
    fn tokens_are_distinct() {
        let mut store = SessionStore::new();
        let a = store.create("u");
        let b = store.create("u");
        assert_ne!(a, b, "successive tokens must differ");
        assert!(a.len() > 20, "token should be reasonably long: {}", a);
    }
}
