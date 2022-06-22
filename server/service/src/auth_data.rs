use crate::token_bucket::TokenBucket;
use std::sync::{Arc, RwLock};

pub struct AuthData {
    /// Secret to sign and verify auth (JWT) tokens.
    pub auth_token_secret: String,
    pub token_bucket: Arc<RwLock<TokenBucket>>,
    /// Indicates if we run in debug mode without ssl certificate
    pub no_ssl: bool,
    /// Disable access control (e.g. for testing)
    pub debug_no_access_control: bool,
}
