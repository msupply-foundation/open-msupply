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
        let token = generate_token();
        let expires_at = Utc::now() + SESSION_LIFETIME;
        self.sessions.insert(
            token.clone(),
            SessionEntry {
                user_id: user_id.to_string(),
                expires_at,
            },
        );
        token
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
