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
    /// Suffix for cookie names, derived from the server port.
    /// Cookies are named `auth_{port}` / `refresh_token_{port}` to prevent
    /// collisions between instances on the same domain.
    pub cookie_suffix: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::RwLock;

    #[actix_rt::test]
    async fn token_created_with_correct_durations() {
        use crate::token::TokenService;

        let bucket = RwLock::new(crate::token_bucket::TokenBucket::new());
        let secret = b"test_secret";
        let mut service = TokenService::new(&bucket, secret, true);

        let pair = service
            .jwt_token(
                "user1",
                "pass",
                TOKEN_LIFETIME_SEC,
                REFRESH_TOKEN_LIFETIME_SEC,
            )
            .unwrap();

        // Auth token should be valid
        let claims = service.verify_token(&pair.token, Some(0)).unwrap();
        assert_eq!(claims.sub, "user1");

        // Token expiry should be TOKEN_LIFETIME_SEC from now
        let now = chrono::Utc::now().timestamp() as usize;
        let token_lifetime: usize = claims.exp - now;

        assert!(token_lifetime <= TOKEN_LIFETIME_SEC);

        let refreshed = service
            .refresh_token(
                &pair.refresh,
                TOKEN_LIFETIME_SEC,
                REFRESH_TOKEN_LIFETIME_SEC,
                Some(0),
            )
            .unwrap();
        let refreshed_claims = service.verify_token(&refreshed.token, Some(0)).unwrap();
        assert_eq!(refreshed_claims.sub, "user1");
    }
}
