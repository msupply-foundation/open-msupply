use service::token_bucket::TokenBucket;
use std::sync::RwLock;

pub struct AuthData {
    /// Secret to sign and verify auth (JWT) tokens.
    pub auth_token_secret: String,
    pub token_bucket: RwLock<TokenBucket>,
    /// Indicates if we ran in debug mode without ssl certificate
    pub debug_no_ssl: bool,
}
