use std::fmt::{self, Debug, Display};
use util::hash;

#[derive(Debug, Clone)]
pub struct SyncCredentials {
    pub username: String,
    pub password_sha256: String,
}

impl SyncCredentials {
    pub fn from_plain(username: &str, password: &str) -> SyncCredentials {
        let username = username.to_owned();
        let password = hash::sha256(password);

        SyncCredentials {
            username,
            password_sha256: password,
        }
    }
}

impl Display for SyncCredentials {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.username, self.password_sha256)
    }
}
