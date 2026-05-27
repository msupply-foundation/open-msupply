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
/// Also caches the user's plaintext password keyed by user_id — required by
/// `sync::sync_user::SyncUser::update_user`, which re-authenticates against the central server
/// to refresh user permissions. This carries over the TODO from the old `TokenBucket`: once the
/// remote server handles its own permission sync, the password cache can go.
///
/// **Concurrency note**: every authenticated request takes `RwLock::write` here because
/// `validate_and_slide` mutates `expires_at`. For low-concurrency deployments this is fine
/// (each lock hold is a single `HashMap::get_mut` + arithmetic). If contention shows up under
/// load, options include sharding by token prefix or storing `expires_at` as `AtomicI64` inside
/// `SessionEntry` so the slide path can become a read-lock + atomic update.
#[derive(Default, Debug)]
pub struct SessionStore {
    sessions: HashMap<SessionToken, SessionEntry>,
    /// user_id -> last known plaintext password. Cleared when the user has no remaining sessions.
    user_passwords: HashMap<String, String>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Issue a new session token for the user. The returned token is the only handle —
    /// it is not stored anywhere else server-side.
    pub fn create(&mut self, user_id: &str, password: &str) -> SessionToken {
        let token = generate_token();
        let expires_at = Utc::now() + SESSION_LIFETIME;
        self.sessions.insert(
            token.clone(),
            SessionEntry {
                user_id: user_id.to_string(),
                expires_at,
            },
        );
        self.user_passwords
            .insert(user_id.to_string(), password.to_string());
        token
    }

    /// Look up a session token; if present and not expired, slide its expiry forward and return
    /// the validated session. Otherwise return `None` (and drop the entry if it was expired).
    pub fn validate_and_slide(&mut self, token: &str) -> Option<ValidatedSession> {
        let now = Utc::now();
        let entry = self.sessions.get_mut(token)?;
        if entry.expires_at < now {
            // Expired — drop it. Note: password cache for this user is left until the user
            // explicitly logs out or all their sessions are gone (see `prune_password_if_idle`).
            let user_id = entry.user_id.clone();
            self.sessions.remove(token);
            self.prune_password_if_idle(&user_id);
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
        if let Some(entry) = self.sessions.remove(token) {
            self.prune_password_if_idle(&entry.user_id);
        }
    }

    /// Remove all sessions for a user (e.g. password change, admin force-logout).
    pub fn revoke_all_for_user(&mut self, user_id: &str) {
        self.sessions.retain(|_, entry| entry.user_id != user_id);
        self.user_passwords.remove(user_id);
    }

    /// Cached plaintext password for a user. Used by sync to re-auth against the central server.
    /// Returns `None` if the user has no active sessions (or never logged in this run).
    pub fn get_password(&self, user_id: &str) -> Option<String> {
        self.user_passwords.get(user_id).cloned()
    }

    fn prune_password_if_idle(&mut self, user_id: &str) {
        let still_active = self.sessions.values().any(|e| e.user_id == user_id);
        if !still_active {
            self.user_passwords.remove(user_id);
        }
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
        let token = store.create("user-1", "hunter2");
        let session = store.validate_and_slide(&token).expect("session valid");
        assert_eq!(session.user_id, "user-1");
        assert_eq!(store.get_password("user-1").as_deref(), Some("hunter2"));
    }

    #[test]
    fn unknown_token_returns_none() {
        let mut store = SessionStore::new();
        assert!(store.validate_and_slide("not-a-token").is_none());
    }

    #[test]
    fn sliding_bumps_expiry() {
        let mut store = SessionStore::new();
        let token = store.create("u", "p");
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
        let token = store.create("u", "p");
        // Manually expire the entry instead of sleeping for SESSION_LIFETIME.
        store.sessions.get_mut(&token).unwrap().expires_at = Utc::now() - Duration::seconds(1);
        assert!(store.validate_and_slide(&token).is_none());
        assert!(
            !store.sessions.contains_key(&token),
            "expired session should be removed"
        );
        assert!(
            store.get_password("u").is_none(),
            "password should be pruned when user has no sessions left"
        );
    }

    #[test]
    fn revoke_removes_single_session() {
        let mut store = SessionStore::new();
        let a = store.create("u", "p");
        let b = store.create("u", "p");
        store.revoke(&a);
        assert!(store.validate_and_slide(&a).is_none());
        assert!(store.validate_and_slide(&b).is_some());
        assert!(
            store.get_password("u").is_some(),
            "password kept while another session is active"
        );
    }

    #[test]
    fn revoke_last_session_prunes_password() {
        let mut store = SessionStore::new();
        let token = store.create("u", "p");
        store.revoke(&token);
        assert!(store.get_password("u").is_none());
    }

    #[test]
    fn revoke_all_for_user_drops_password() {
        let mut store = SessionStore::new();
        store.create("u", "p");
        store.create("u", "p");
        store.create("other", "p2");
        store.revoke_all_for_user("u");
        assert!(store.get_password("u").is_none());
        assert!(
            store.get_password("other").is_some(),
            "unrelated user's password preserved"
        );
    }

    #[test]
    fn tokens_are_distinct() {
        let mut store = SessionStore::new();
        let a = store.create("u", "p");
        let b = store.create("u", "p");
        assert_ne!(a, b, "successive tokens must differ");
        assert!(a.len() > 20, "token should be reasonably long: {}", a);
    }
}
