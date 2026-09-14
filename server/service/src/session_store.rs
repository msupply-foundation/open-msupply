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
    /// What each user's live sessions were issued against, as last seen by
    /// `revoke_if_credentials_changed` / `revoke_for_credentials_changed_at_central`.
    /// Kept here rather than read from the database because it is only meaningful for as
    /// long as the sessions are: a restart clears the sessions, so it must clear this
    /// too. Keyed by user, so it is bounded by the number of users who have logged in
    /// since the process started, not by logins.
    issued_against: HashMap<String, IssuedAgainst>,
}

/// The credentials a user's live sessions were issued against.
#[derive(Debug, PartialEq)]
enum IssuedAgainst {
    /// The `hashed_password` on the user row at the time. A login that finds a different
    /// one there is a login after a password change.
    StoredHash(String),
    /// A password central accepted while the local row still held a hash it did not
    /// verify against, so there was no hash to name these credentials by. Only the v7
    /// login flow reaches this - see `revoke_for_credentials_changed_at_central`.
    PasswordAcceptedByCentral,
}

impl SessionStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Issue a new session token for the user. The returned token is the only handle —
    /// it is not stored anywhere else server-side.
    pub fn create(&mut self, user_id: &str) -> SessionToken {
        let token = generate_token();
        let now = Utc::now();
        // Logins are rare next to authenticated requests, and the sweep is cheap beside
        // the bcrypt verify that precedes it, so this is the natural place to collect
        // the sessions nobody came back to.
        self.purge_expired(now);
        self.sessions.insert(
            token.clone(),
            SessionEntry {
                user_id: user_id.to_string(),
                expires_at: now + SESSION_LIFETIME,
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

    /// Records the password hash this user's sessions are being issued against, and
    /// revokes every session issued against a different one. Returns whether anything
    /// was revoked.
    ///
    /// Call this on login, before the new session is created, so the login's own session
    /// survives.
    ///
    /// Comparing against what the store remembers - rather than against the row as it
    /// looked earlier in the same login call - is what makes this catch a *central*
    /// password reset. The hash can reach the local row without a login at all: the
    /// `user` sync translation writes `password_hash` whenever central sends the row, and
    /// the v7 login flow never writes the row itself. Once sync has landed the new hash,
    /// a before/after comparison inside the login sees no change, while this still sees
    /// that the live sessions belong to the old one.
    ///
    /// The first call for a user records the hash and revokes nothing: with no earlier
    /// call there are no sessions this store issued to that user, so there is nothing a
    /// changed password should evict.
    pub fn revoke_if_credentials_changed(&mut self, user_id: &str, hashed_password: &str) -> bool {
        let previous = self.issued_against.insert(
            user_id.to_string(),
            IssuedAgainst::StoredHash(hashed_password.to_string()),
        );

        let changed = match previous {
            Some(IssuedAgainst::StoredHash(previous)) => previous != hashed_password,
            // The live sessions were issued against a password central vouched for, with
            // no hash to name it by. A usable hash exists now, and nothing here can say
            // whether it is that same change or a later one, so revoke rather than guess.
            Some(IssuedAgainst::PasswordAcceptedByCentral) => true,
            None => false,
        };

        if changed {
            self.revoke_all_for_user(user_id);
        }
        changed
    }

    /// The same eviction for a login that learned the password changed without ever
    /// seeing the new hash. Returns whether anything was revoked.
    ///
    /// A v7 remote can be in exactly that position: central accepts the password, that
    /// flow never writes the user row, and until the `user` sync translation lands the
    /// reset the row still holds the old hash. `revoke_if_credentials_changed` is blind
    /// to it - the hash it would compare is the same old one the sessions were issued
    /// against - so the login flow reports the mismatch it saw instead.
    ///
    /// The sessions this login is about to be issued belong to the new password, and
    /// there is no hash for it to record, so the state is recorded as such. A second
    /// login before sync catches up then finds the same state and leaves the first
    /// alone; the first login that does find a usable hash revokes once, which is the
    /// safe direction - it is also what covers a *second* reset inside the same window.
    pub fn revoke_for_credentials_changed_at_central(&mut self, user_id: &str) -> bool {
        let previous = self.issued_against.insert(
            user_id.to_string(),
            IssuedAgainst::PasswordAcceptedByCentral,
        );

        match previous {
            Some(IssuedAgainst::StoredHash(_)) => {
                self.revoke_all_for_user(user_id);
                true
            }
            // Already in this state: the sessions are the ones a previous login in this
            // same window issued, against the password central has just accepted again.
            Some(IssuedAgainst::PasswordAcceptedByCentral) => false,
            None => false,
        }
    }

    /// Drop every entry that can no longer be validated.
    ///
    /// `validate_and_slide` only removes an expired entry when that same token is
    /// presented again, so a session nobody returns to — the common case, since users
    /// close the tab rather than log out — would otherwise sit in the map for the life
    /// of the process. Every authenticated request takes a write lock on this map, so
    /// the leak costs contention as well as memory.
    fn purge_expired(&mut self, now: DateTime<Utc>) {
        self.sessions.retain(|_, entry| entry.expires_at >= now);
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

    /// Security audit DS-6: entries were only dropped when their own token came back,
    /// so sessions nobody returns to accumulated for the life of the process.
    #[test]
    fn expired_sessions_are_purged_without_being_presented() {
        let mut store = SessionStore::new();

        let abandoned: Vec<_> = (0..5).map(|_| store.create("u")).collect();
        // One that stays live
        let live = store.create("u");
        for token in &abandoned {
            store.sessions.get_mut(token).unwrap().expires_at = Utc::now() - Duration::seconds(1);
        }

        assert_eq!(store.sessions.len(), 6);

        // A login by anyone sweeps them — none of the abandoned tokens is presented
        store.create("someone-else");

        assert_eq!(store.sessions.len(), 2, "expired sessions should be purged");
        assert!(store.validate_and_slide(&live).is_some());
    }

    /// Security audit DS-4: the store remembers which password hash a user's live
    /// sessions were issued against, so a login under a different hash evicts them
    /// however that hash got there — including a sync that landed it with no login.
    #[test]
    fn revoke_if_credentials_changed_evicts_sessions_issued_under_the_old_hash() {
        let mut store = SessionStore::new();

        // First login for this user: nothing was issued before, so nothing to evict
        assert!(!store.revoke_if_credentials_changed("u", "hash-1"));
        let first = store.create("u");
        let other_user = store.create("other");

        // Same credentials again — the user's other devices stay logged in
        assert!(!store.revoke_if_credentials_changed("u", "hash-1"));
        assert!(store.validate_and_slide(&first).is_some());

        // Changed credentials — every session for that user goes, and only that user's
        assert!(store.revoke_if_credentials_changed("u", "hash-2"));
        assert!(store.validate_and_slide(&first).is_none());
        assert!(store.validate_and_slide(&other_user).is_some());

        // The new hash is now the one on record, so the next login under it is quiet
        assert!(!store.revoke_if_credentials_changed("u", "hash-2"));
    }

    /// The v7 case: the login knows the password changed but has no hash for it, so the
    /// change is recorded as such. A second login before sync catches up finds the same
    /// state and is quiet; the first one to find a hash again revokes, because it cannot
    /// tell that hash arriving from a further change since.
    #[test]
    fn revoke_for_credentials_changed_at_central_evicts_without_a_hash_to_compare() {
        let mut store = SessionStore::new();

        assert!(!store.revoke_if_credentials_changed("u", "hash-1"));
        let issued_under_the_old_password = store.create("u");
        let other_user = store.create("other");

        // Central accepts a password the stored hash does not verify against
        assert!(store.revoke_for_credentials_changed_at_central("u"));
        assert!(store
            .validate_and_slide(&issued_under_the_old_password)
            .is_none());
        assert!(store.validate_and_slide(&other_user).is_some());

        // Sync still hasn't landed the new hash, and a second device logs in with the
        // same new password: the first device stays logged in
        let first_device = store.create("u");
        assert!(!store.revoke_for_credentials_changed_at_central("u"));
        assert!(store.validate_and_slide(&first_device).is_some());

        // A hash lands. It may be this reset or a later one, so the sessions go.
        assert!(store.revoke_if_credentials_changed("u", "hash-2"));
        assert!(store.validate_and_slide(&first_device).is_none());

        // ...and from there the ordinary comparison is back in charge
        assert!(!store.revoke_if_credentials_changed("u", "hash-2"));
    }

    /// The first call for a user records the state and evicts nothing: with no earlier
    /// call there are no sessions this store issued them.
    #[test]
    fn revoke_for_credentials_changed_at_central_is_quiet_on_a_first_login() {
        let mut store = SessionStore::new();
        assert!(!store.revoke_for_credentials_changed_at_central("u"));
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
