use std::fmt::{self, Debug, Display};
use util::hash;

#[derive(Debug)]
pub struct SyncCredentials {
    pub username: String,
    pub password: String,
}

impl SyncCredentials {
    pub fn new(username: &str, password: &str) -> SyncCredentials {
        let username = username.to_owned();
        let password = hash::sha256(password);

        SyncCredentials { username, password }
    }
}

impl Display for SyncCredentials {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.username, self.password)
    }
}
