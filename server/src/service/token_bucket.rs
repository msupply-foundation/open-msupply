use std::collections::{hash_map::Entry, HashMap};

use chrono::Utc;

use crate::util::auth::sha256;

/// Tracks if a token is valid or if a user has been logged out
pub trait TokenBucket {
    /// Checks if the token is known for the given user
    fn contains(&self, user_id: &str, token: &str) -> bool;
    /// Adds a token for a given user.
    /// If token is already known the expiry_date is updated.
    /// This can be used to reduce the expiry date of a token on the server
    fn put(&mut self, user_id: &str, token: &str, expiry_date: usize);
    /// Removes all known tokens for a given user
    fn clear(&mut self, user_id: &str);
}

struct TokenInfo {
    token_hash: String,
    expiry_date: usize,
}

pub struct InMemoryTokenBucket {
    users: HashMap<String, Vec<TokenInfo>>,
}

impl InMemoryTokenBucket {
    pub fn new() -> Self {
        InMemoryTokenBucket {
            users: HashMap::new(),
        }
    }
}

fn token_hash(token: &str) -> String {
    sha256(token)
}

impl TokenBucket for InMemoryTokenBucket {
    fn contains(&self, user_id: &str, token: &str) -> bool {
        let user_tokens = match self.users.get(user_id) {
            Some(value) => value,
            None => return false,
        };

        let token_hash = token_hash(token);
        let existing_token = match user_tokens
            .iter()
            .find(|item| item.token_hash == token_hash)
        {
            Some(value) => value,
            None => return false,
        };

        let now = Utc::now().timestamp() as usize;
        existing_token.expiry_date >= now
    }

    fn put(&mut self, user_id: &str, token: &str, expiry_date: usize) {
        let now = Utc::now().timestamp() as usize;
        if expiry_date < now {
            return;
        }
        let user_tokens = match self.users.entry(user_id.to_string()) {
            Entry::Occupied(o) => o.into_mut(),
            Entry::Vacant(v) => v.insert(Vec::new()),
        };

        // clean up expired tokens
        user_tokens.retain(|item| item.expiry_date > now);

        // update existing
        let token_hash = token_hash(token);
        if let Some(value) = user_tokens
            .iter_mut()
            .find(|item| item.token_hash == token_hash)
        {
            value.expiry_date = expiry_date;
            return;
        }

        user_tokens.push(TokenInfo {
            token_hash,
            expiry_date,
        });
    }

    fn clear(&mut self, user_id: &str) {
        self.users.remove(user_id);
    }
}
