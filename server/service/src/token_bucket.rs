use std::collections::{hash_map::Entry, HashMap};

use chrono::Utc;

use util::hash::sha256;

struct TokenInfo {
    token_hash: String,
    expiry_date: usize,
    // Temporarily store password in token info.
    // Will need to delete once server has implemented its own central server.
    password: String,
}

fn token_hash(token: &str) -> String {
    sha256(token)
}

/// Tracks if a token is still valid
///
/// There are two ways a token can expire prematurely:
/// 1) User logs out and token is removed from the bucket
/// 2) Token expiry time is reduce (server side), e.g. when an token has been renewed and the old
/// token should expiry sooner.
#[derive(Default)]
pub struct TokenBucket {
    users: HashMap<String, Vec<TokenInfo>>,
}

impl TokenBucket {
    pub fn new() -> Self {
        Self::default()
    }

    /// Checks if the token is known for the given user
    pub fn contains(&self, user_id: &str, token: &str) -> bool {
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

        // check that expiry date of the token hasn't been shorten on the server side:
        let now = Utc::now().timestamp() as usize;
        existing_token.expiry_date >= now
    }

    /// Adds a token for a given user.
    /// If token is already known the expiry_date is updated.
    /// This can be used to reduce the expiry date of a token on the server, e.g. to reduce the
    /// token expiry time of a token that just has been refreshed.
    pub fn put(&mut self, user_id: &str, password: &str, token: &str, expiry_date: usize) {
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

        // update existing or add new token
        let token_hash = token_hash(token);
        let existing_token = user_tokens
            .iter_mut()
            .find(|item| item.token_hash == token_hash);
        match existing_token {
            Some(existing) => existing.expiry_date = expiry_date,
            None => {
                user_tokens.push(TokenInfo {
                    token_hash,
                    expiry_date,
                    password: password.to_string(),
                });
            }
        }
    }

    pub fn get_password(&self, user_id: &str) -> String {
        let user_tokens = match self.users.get(user_id) {
            Some(value) => value,
            None => return String::new(),
        };

        let mut password = String::new();
        for token in user_tokens {
            password = token.password.clone();
        }
        password
    }

    /// Removes all known tokens for a given user
    pub fn clear(&mut self, user_id: &str) {
        self.users.remove(user_id);
    }
}
