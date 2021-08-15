use crate::util::auth;
use std::fmt::{self, Debug, Display};

#[derive(Debug)]
pub struct SyncCredentials {
    pub username: String,
    pub password: String,
}

impl SyncCredentials {
    pub fn new(username: String, password: String) -> SyncCredentials {
        SyncCredentials {
            username,
            password: auth::sha256(password),
        }
    }
}

impl Display for SyncCredentials {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.username, self.password)
    }
}
