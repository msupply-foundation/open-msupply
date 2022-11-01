use std::fmt::{self, Debug, Display};

#[derive(Debug, Clone)]
pub struct SyncCredentials {
    pub username: String,
    pub password_sha256: String,
}

impl Display for SyncCredentials {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.username, self.password_sha256)
    }
}
