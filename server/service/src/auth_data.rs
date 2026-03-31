use crate::token_bucket::TokenBucket;
use std::sync::{Arc, RwLock};

pub const TOKEN_LIFETIME_SEC: usize = 60 * 60; // 60 minutes
pub const REFRESH_TOKEN_LIFETIME_SEC: usize = 2 * 60 * 60; // 120 minutes

#[derive(Debug)]
pub struct AuthData {
    /// Secret to sign and verify auth (JWT) tokens.
    pub auth_token_secret: String,
    pub token_bucket: Arc<RwLock<TokenBucket>>,
    /// Indicates if we run in debug mode without ssl certificate
    pub no_ssl: bool,
    /// Disable access control, i.e. no access token is required to do an API request (e.g. for
    /// testing).
    /// However, if a token is provided this token is fully evaluate.
    pub debug_no_access_control: bool,
}
