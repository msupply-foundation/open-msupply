use std::collections::HashMap;

use chrono::{DateTime, Duration, Utc};

/// How long the browser has to come back from the identity provider with an authorization code
/// before the login attempt is forgotten. Keycloak's own code lifespan is a minute by default, so
/// this only needs to cover the user typing their password and any MFA step.
pub const PENDING_AUTH_LIFETIME: Duration = Duration::minutes(10);

/// Ceiling on in-flight login attempts. Anyone can start a login, and an attempt that is never
/// completed is only dropped by expiry, so without a cap a bot hitting `/auth/oidc/login` in a
/// loop would grow the map unbounded. At the cap the oldest attempts are evicted first.
const MAX_PENDING: usize = 512;

/// One in-flight authorization-code login. Everything here is secret-ish: the verifier proves to
/// the token endpoint that this server started the flow, and the nonce ties the ID token back to
/// it, so neither is ever sent to the browser — only the opaque `state` key is.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PendingAuth {
    /// PKCE code verifier, replayed to the token endpoint with the code.
    pub code_verifier: String,
    /// Expected `nonce` claim in the returned ID token.
    pub nonce: String,
    /// Where to send the browser once the session exists. Always a path on this server — the
    /// handler validates it before storing, so it can't be used as an open redirect.
    pub redirect_after: Option<String>,
    pub expires_at: DateTime<Utc>,
}

/// In-memory map of `state` -> [`PendingAuth`].
///
/// Deliberately not persisted: a restart mid-login costs the user one retry, and there is nothing
/// here worth keeping across restarts. Mirrors [`crate::session_store::SessionStore`] in shape —
/// entries expire, and reads are destructive.
#[derive(Default, Debug)]
pub struct PendingAuthStore {
    entries: HashMap<String, PendingAuth>,
}

impl PendingAuthStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(&mut self, state: String, pending: PendingAuth) {
        self.prune();
        self.entries.insert(state, pending);
    }

    /// Consume the attempt for `state`. Single use: a code can only be exchanged once, so
    /// returning the entry always removes it, which also makes a replayed callback fail closed.
    pub fn take(&mut self, state: &str) -> Option<PendingAuth> {
        let pending = self.entries.remove(state)?;
        if pending.expires_at < Utc::now() {
            return None;
        }
        Some(pending)
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Drop expired attempts, then oldest-first while over [`MAX_PENDING`].
    fn prune(&mut self) {
        let now = Utc::now();
        self.entries.retain(|_, pending| pending.expires_at >= now);

        if self.entries.len() < MAX_PENDING {
            return;
        }

        let mut by_age: Vec<(String, DateTime<Utc>)> = self
            .entries
            .iter()
            .map(|(state, pending)| (state.clone(), pending.expires_at))
            .collect();
        by_age.sort_by_key(|(_, expires_at)| *expires_at);

        let excess = self.entries.len() + 1 - MAX_PENDING;
        for (state, _) in by_age.into_iter().take(excess) {
            self.entries.remove(&state);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pending(expires_at: DateTime<Utc>) -> PendingAuth {
        PendingAuth {
            code_verifier: "verifier".to_string(),
            nonce: "nonce".to_string(),
            redirect_after: None,
            expires_at,
        }
    }

    fn valid() -> PendingAuth {
        pending(Utc::now() + PENDING_AUTH_LIFETIME)
    }

    #[test]
    fn take_returns_the_entry_once() {
        let mut store = PendingAuthStore::new();
        let entry = valid();
        store.insert("state-1".to_string(), entry.clone());

        assert_eq!(store.take("state-1"), Some(entry));
        assert_eq!(
            store.take("state-1"),
            None,
            "a state must not be usable twice"
        );
    }

    #[test]
    fn unknown_state_is_rejected() {
        let mut store = PendingAuthStore::new();
        assert_eq!(store.take("never-issued"), None);
    }

    #[test]
    fn expired_state_is_rejected_and_dropped() {
        let mut store = PendingAuthStore::new();
        store.insert(
            "stale".to_string(),
            pending(Utc::now() - Duration::seconds(1)),
        );

        assert_eq!(store.take("stale"), None);
        assert!(store.is_empty(), "expired entry should not be retained");
    }

    #[test]
    fn insert_prunes_expired_entries() {
        let mut store = PendingAuthStore::new();
        store.insert(
            "stale".to_string(),
            pending(Utc::now() - Duration::seconds(1)),
        );
        store.insert("fresh".to_string(), valid());

        assert_eq!(store.len(), 1);
        assert!(store.take("fresh").is_some());
    }

    #[test]
    fn insert_evicts_oldest_when_at_capacity() {
        let mut store = PendingAuthStore::new();
        let base = Utc::now() + PENDING_AUTH_LIFETIME;
        for i in 0..MAX_PENDING {
            store.insert(
                format!("state-{i}"),
                pending(base + Duration::seconds(i as i64)),
            );
        }
        assert_eq!(store.len(), MAX_PENDING);

        store.insert("newest".to_string(), pending(base + Duration::hours(1)));

        assert_eq!(store.len(), MAX_PENDING);
        assert_eq!(
            store.take("state-0"),
            None,
            "oldest attempt should be evicted first"
        );
        assert!(store.take("newest").is_some());
    }
}
