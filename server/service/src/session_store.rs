use std::collections::HashMap;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Duration, Utc};
use rand::RngExt;

const TOKEN_BYTES: usize = 32;

pub fn lifetime_from_minutes(minutes: i32) -> Duration {
    Duration::minutes(minutes.max(5) as i64) // leeway so users don't get locked out immediately if they set a very short timeout by mistake
}

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
    lifetime: Duration,
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
    pub fn create(
        &mut self,
        user_id: &str,
        password: &str,
        lifetime: Duration,
    ) -> (SessionToken, DateTime<Utc>) {
        self.prune_expired();

        let token = generate_token();
        let expires_at = Utc::now() + lifetime;
        self.sessions.insert(
            token.clone(),
            SessionEntry {
                user_id: user_id.to_string(),
                expires_at,
                lifetime,
            },
        );
        self.user_passwords
            .insert(user_id.to_string(), password.to_string());
        (token, expires_at)
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
        entry.expires_at = now + entry.lifetime;
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

    pub fn set_lifetime_for_all(&mut self, lifetime: Duration) {
        let now = Utc::now();
        for entry in self.sessions.values_mut() {
            entry.lifetime = lifetime;
            entry.expires_at = now + lifetime;
        }
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

    /// Drop every expired session and any password cache left with no remaining active sessions.
    /// Safe to call at any time (e.g. from a scheduled sweep); `create` calls it on each login.
    pub fn prune_expired(&mut self) {
        let now = Utc::now();
        self.sessions.retain(|_, entry| entry.expires_at >= now);
        let active_users: std::collections::HashSet<&String> =
            self.sessions.values().map(|e| &e.user_id).collect();
        self.user_passwords
            .retain(|user_id, _| active_users.contains(user_id));
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
        let (token, _) = store.create("user-1", "hunter2", Duration::hours(1));
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
        let (token, _) = store.create("u", "p", Duration::hours(1));
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
        let (token, _) = store.create("u", "p", Duration::hours(1));
        // Manually expire the entry instead of sleeping for the session lifetime.
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
    fn create_sweeps_expired_sessions() {
        let mut store = SessionStore::new();
        let (abandoned, _) = store.create("idle-user", "pw", Duration::hours(1));
        store.sessions.get_mut(&abandoned).unwrap().expires_at = Utc::now() - Duration::seconds(1);

        // A fresh login should sweep the abandoned entry as a side effect.
        store.create("new-user", "pw2", Duration::hours(1));

        assert!(
            !store.sessions.contains_key(&abandoned),
            "create should sweep expired sessions"
        );
        assert!(store.get_password("idle-user").is_none());
    }

    #[test]
    fn revoke_removes_single_session() {
        let mut store = SessionStore::new();
        let (a, _) = store.create("u", "p", Duration::hours(1));
        let (b, _) = store.create("u", "p", Duration::hours(1));
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
        let (token, _) = store.create("u", "p", Duration::hours(1));
        store.revoke(&token);
        assert!(store.get_password("u").is_none());
    }

    #[test]
    fn revoke_all_for_user_drops_password() {
        let mut store = SessionStore::new();
        store.create("u", "p", Duration::hours(1));
        store.create("u", "p", Duration::hours(1));
        store.create("other", "p2", Duration::hours(1));
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
        let (a, _) = store.create("u", "p", Duration::hours(1));
        let (b, _) = store.create("u", "p", Duration::hours(1));
        assert_ne!(a, b, "successive tokens must differ");
        assert!(a.len() > 20, "token should be reasonably long: {}", a);
    }

    #[test]
    fn slides_by_per_session_lifetime() {
        let mut store = SessionStore::new();
        let (token, created_expiry) = store.create("u", "p", Duration::minutes(5));
        assert!(created_expiry < Utc::now() + Duration::hours(1));

        let slid = store
            .validate_and_slide(&token)
            .expect("session valid")
            .expires_at;
        assert!(
            slid < Utc::now() + Duration::hours(1),
            "slide should use the per-session lifetime, not the default"
        );
    }

    #[test]
    fn set_lifetime_for_all_reslides_live_sessions() {
        let mut store = SessionStore::new();
        let (long, _) = store.create("u", "p", Duration::hours(1));

        // Admin shortens the inactivity timeout to 5 minutes.
        store.set_lifetime_for_all(Duration::minutes(5));
        let slid = store
            .validate_and_slide(&long)
            .expect("session still valid")
            .expires_at;
        assert!(
            slid < Utc::now() + Duration::minutes(10),
            "live session should pick up the new 5-minute lifetime, not its original 1h"
        );
    }
}
