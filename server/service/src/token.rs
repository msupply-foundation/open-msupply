use std::sync::RwLock;

use anyhow::anyhow;
use chrono::Utc;
use jsonwebtoken::errors::{Error as JWTError, ErrorKind as JWTErrorKind};
use log::error;
use serde::{Deserialize, Serialize};

use super::token_bucket::TokenBucket;

#[derive(Debug, Serialize, Deserialize)]
pub enum Audience {
    /// Token is for general api usage
    Api,
    /// Token can be used for a token refresh
    TokenRefresh,
}

// TODO: make the issuer configurable?
const ISSUER: &str = "om-supply-remote-server";

#[derive(Debug, Serialize, Deserialize)]
pub struct OmSupplyClaim {
    /// Required (validate_exp defaults to true in validation). Expiration time (as UTC timestamp)
    pub exp: usize,

    /// Audience
    pub aud: Audience,
    /// Issued at (as UTC timestamp)
    pub iat: usize,
    /// Issuer
    pub iss: String,
    /// Subject (user id the token refers to)
    pub sub: String,
}

/// Error for getting a JWT token
#[derive(Debug)]
pub enum JWTIssuingError {
    CanNotCreateToken(JWTError),
    ConcurrencyLockError(anyhow::Error),
}

#[derive(Debug)]
pub enum JWTValidationError {
    ExpiredSignature,
    NotAnApiToken,
    InvalidToken(JWTError),
    /// Token has been invalidated on the backend
    TokenInvalidated,
    ConcurrencyLockError(anyhow::Error),
}

#[derive(Debug)]
pub enum JWTRefreshError {
    ExpiredSignature,
    NotARefreshToken,
    InvalidToken(JWTError),
    FailedToCreateNewToken(JWTError),
    /// Token has been invalidated on the backend
    TokenInvalided,
    ConcurrencyLockError(anyhow::Error),
}

#[derive(Debug)]
pub enum JWTLogoutError {
    ConcurrencyLockError(anyhow::Error),
}

#[derive(Debug)]
pub struct TokenPair {
    /// The JWT token
    pub token: String,
    /// expiry date of the token (unix timestamp [s])
    pub expiry_date: usize,
    /// The JWT refresh token
    pub refresh: String,
    /// Expiry date of the refresh token (unix timestamp [s])
    pub refresh_expiry_date: usize,
}

/// This service issues new jwt tokens that can be used by a user to authenticate, e.g. by passing
/// the token in the HTTP request header as a "Authorization: Bearer {token}" bearer token.
///
/// There are two types of tokens:
/// 1) An auth token which must be passed in every service request. This token has a short living
/// expiry time (~1h) and must be refreshed (replaced by a new token) regularly.
/// 2) A refresh token that is required to refresh an auth token. This token has a longer expiry
/// time, e.g. to allow a user to stay logged in on a website while the computer or the browser is
/// shut down. The refresh token is implicitly passed to the client in a session cookie.
/// The refresh token is itself refreshed in every refresh call, i.e. the refresh token always
/// expires after a fix time duration after the last login or token refresh.
///
/// FAQ:
/// Q: Why a session cookie?
/// A: JS code can't access/steal session cookies which limits the time for how long a successful
/// attack can be active.
///
/// Q: Why an auth token? and why not just having one long lived session cookie?
/// A: Having short lived auth tokens makes it possible to issue these tokens to a 3rd party to act
/// on behave of a user, e.g. a plugin or an external service could use an auth token to gain
/// temporary access to an API but is not able to refresh the token indefinitely.
///
/// Q: Still why an auth token? the long lived refresh token could be invalidated on the server
/// site to revoke access.
/// A: This requires a reliable mechanism to do the token invalidation. This can be hard to do. With
/// the current solution the auth token simply expires when we stop issuing tokens to the 3rd party
/// (which doesn't has the refresh token), e.g. by deactivated a plugin.
pub struct TokenService<'a> {
    token_bucket: &'a RwLock<TokenBucket>,
    jwt_token_secret: &'a [u8],
    validate_token_bucket: bool,
}

impl<'a> TokenService<'a> {
    pub fn new(
        token_bucket: &'a RwLock<TokenBucket>,
        jwt_token_secret: &'a [u8],
        validate_token_bucket: bool,
    ) -> Self {
        TokenService {
            token_bucket,
            jwt_token_secret,
            validate_token_bucket,
        }
    }
    /// Creates new json web token for a given user
    ///
    /// # Arguments
    ///
    /// * `valid_for` - duration (sec) for how long the token will be valid
    /// * `refresh_token_valid_for` - duration (sec) for how long the refresh token will be valid
    pub fn jwt_token(
        &mut self,
        user_id: &str,
        password: &str,
        valid_for_sec: usize,
        refresh_token_valid_for_sec: usize,
    ) -> Result<TokenPair, JWTIssuingError> {
        let pair = create_jwt_pair(
            user_id,
            self.jwt_token_secret,
            valid_for_sec,
            refresh_token_valid_for_sec,
        )
        .map_err(|err| {
            error!("jwt_token: {}", err);
            JWTIssuingError::CanNotCreateToken(err)
        })?;

        // add tokens to bucket
        let mut token_bucket = self.token_bucket.write().map_err(|e| {
            error!("{}", e);
            JWTIssuingError::ConcurrencyLockError(anyhow!("jwt_token: {}", e))
        })?;
        token_bucket.put(user_id, password, &pair.token, pair.expiry_date);
        token_bucket.put(user_id, password, &pair.refresh, pair.refresh_expiry_date);

        Ok(pair)
    }

    /// Get a new token and also update the refresh token
    ///
    /// # Arguments
    /// * `valid_for` - duration (sec) for how long the token will be valid
    /// * `refresh_token_valid_for` - duration (sec) for how long the refresh token will be valid
    pub fn refresh_token(
        &mut self,
        refresh_token: &str,
        valid_for: usize,
        refresh_token_valid_for: usize,
        leeway_sec: Option<u64>,
    ) -> Result<TokenPair, JWTRefreshError> {
        let mut validation = jsonwebtoken::Validation::default();
        validation.leeway = leeway_sec.unwrap_or(validation.leeway);
        validation.set_audience(&[format!("{:?}", Audience::TokenRefresh)]);
        validation.set_issuer(&[ISSUER]);
        let decoded = jsonwebtoken::decode::<OmSupplyClaim>(
            refresh_token,
            &jsonwebtoken::DecodingKey::from_secret(self.jwt_token_secret),
            &validation,
        )
        .map_err(|err| match err.kind() {
            JWTErrorKind::ExpiredSignature => JWTRefreshError::ExpiredSignature,
            JWTErrorKind::InvalidAudience => JWTRefreshError::NotARefreshToken,
            _ => JWTRefreshError::InvalidToken(err),
        })?;

        let user_id = decoded.claims.sub;
        let pair = create_jwt_pair(
            &user_id,
            self.jwt_token_secret,
            valid_for,
            refresh_token_valid_for,
        )
        .map_err(|err| {
            error!("{}", err);
            JWTRefreshError::FailedToCreateNewToken(err)
        })?;

        // Check token is still in the list of valid tokens
        let mut token_bucket = self.token_bucket.write().map_err(|e| {
            error!("{}", e);
            JWTRefreshError::ConcurrencyLockError(anyhow!("refresh_token: {}", e))
        })?;
        if self.validate_token_bucket && !token_bucket.contains(&user_id, refresh_token) {
            return Err(JWTRefreshError::TokenInvalided);
        }
        let password: String = token_bucket.get_password(&user_id);

        // add new tokens to bucket
        token_bucket.put(&user_id, &password, &pair.token, pair.expiry_date);
        token_bucket.put(&user_id, &password, &pair.refresh, pair.refresh_expiry_date);
        // Shorten the expiry time of the old refresh token.
        //
        // Note, if the client goes offline before receiving the new refresh token the user might
        // need to login again. This might seem random to the user. Lets see if that becomes a real
        // issue.
        let reduced_expiry =
            std::cmp::min(Utc::now().timestamp() as usize + 5 * 60, decoded.claims.exp);
        token_bucket.put(&user_id, &password, refresh_token, reduced_expiry);

        Ok(pair)
    }

    /// # Arguments
    /// * `leeway_sec` - leeway duration [s] for the expiry validation
    pub fn verify_token(
        &self,
        token: &str,
        leeway_sec: Option<u64>,
    ) -> Result<OmSupplyClaim, JWTValidationError> {
        let mut validation = jsonwebtoken::Validation::default();
        validation.leeway = leeway_sec.unwrap_or(validation.leeway);
        validation.set_audience(&[format!("{:?}", Audience::Api)]);
        validation.set_issuer(&[ISSUER]);
        let decoded = jsonwebtoken::decode::<OmSupplyClaim>(
            token,
            &jsonwebtoken::DecodingKey::from_secret(self.jwt_token_secret),
            &validation,
        )
        .map_err(|err| match err.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
                JWTValidationError::ExpiredSignature
            }
            jsonwebtoken::errors::ErrorKind::InvalidAudience => JWTValidationError::NotAnApiToken,
            _ => {
                error!("verify_token: {}", err);
                JWTValidationError::InvalidToken(err)
            }
        })?;

        // Check token is still in the list of valid tokens
        let token_bucket = self.token_bucket.read().map_err(|e| {
            error!("verify_token: {}", e);
            JWTValidationError::ConcurrencyLockError(anyhow!("verify_token: {}", e))
        })?;
        if self.validate_token_bucket && !token_bucket.contains(&decoded.claims.sub, token) {
            return Err(JWTValidationError::TokenInvalidated);
        }
        Ok(decoded.claims)
    }

    /// Log a user out of all sessions
    pub fn logout(&mut self, user_id: &str) -> Result<(), JWTLogoutError> {
        let mut token_bucket = self.token_bucket.write().map_err(|e| {
            error!("logout: {}", e);
            JWTLogoutError::ConcurrencyLockError(anyhow!("logout: {}", e))
        })?;
        token_bucket.clear(user_id);
        Ok(())
    }
}

/// Creates a token and refresh token pair
fn create_jwt_pair(
    user_id: &str,
    jwt_token_secret: &[u8],
    valid_for_sec: usize,
    refresh_valid_for_sec: usize,
) -> Result<TokenPair, JWTError> {
    let now = Utc::now().timestamp() as usize;
    let expiry_date = now + valid_for_sec;
    let refresh_expiry_date = now + refresh_valid_for_sec;

    // api token
    let api_claims = OmSupplyClaim {
        exp: expiry_date,
        aud: Audience::Api,
        iat: now,
        iss: ISSUER.to_string(),
        sub: user_id.to_owned(),
    };
    let api_token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &api_claims,
        &jsonwebtoken::EncodingKey::from_secret(jwt_token_secret),
    )?;

    // refresh token
    let refresh_claims = OmSupplyClaim {
        exp: refresh_expiry_date,
        aud: Audience::TokenRefresh,
        iat: now,
        iss: ISSUER.to_string(),
        sub: user_id.to_owned(),
    };
    let refresh_token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &refresh_claims,
        &jsonwebtoken::EncodingKey::from_secret(jwt_token_secret),
    )?;

    Ok(TokenPair {
        token: api_token,
        expiry_date,
        refresh: refresh_token,
        refresh_expiry_date,
    })
}

#[cfg(test)]
mod user_account_test {
    use util::assert_matches;

    use super::*;

    #[actix_rt::test]
    async fn test_user_auth() {
        let bucket = RwLock::new(TokenBucket::new());
        const JWT_TOKEN_SECRET: &[u8] = "some secret".as_bytes();
        let user_id = "test_user_id";
        let password = "pass";
        let mut bucket_validating_service = TokenService::new(&bucket, JWT_TOKEN_SECRET, true);
        let bucket_not_validating_service = TokenService::new(&bucket, JWT_TOKEN_SECRET, false);

        // should be able to create a new token
        let token_pair = bucket_validating_service
            .jwt_token(user_id, password, 60, 120)
            .unwrap();

        // should be able to verify token
        let claims = bucket_validating_service
            .verify_token(&token_pair.token, Some(0))
            .unwrap();
        assert_eq!(user_id, claims.sub);

        // should fail to verify with refresh token
        let err = bucket_validating_service
            .verify_token(&token_pair.refresh, Some(0))
            .unwrap_err();
        assert_matches!(err, JWTValidationError::NotAnApiToken);

        // should fail to refresh token refresh with api token
        let err = bucket_validating_service
            .refresh_token(&token_pair.token, 60, 120, Some(0))
            .unwrap_err();
        assert_matches!(err, JWTRefreshError::NotARefreshToken);

        // should succeed to refresh token
        let token_pair = bucket_validating_service
            .refresh_token(&token_pair.refresh, 60, 120, Some(0))
            .unwrap();
        let claims = bucket_validating_service
            .verify_token(&token_pair.token, Some(0))
            .unwrap();
        // important: sub must still match the user id:
        assert_eq!(user_id, claims.sub);

        // should fail to verify and refresh when logged out
        bucket_validating_service.logout(user_id).unwrap();
        let err = bucket_validating_service
            .verify_token(&token_pair.token, Some(0))
            .unwrap_err();
        assert_matches!(err, JWTValidationError::TokenInvalidated);
        let err = bucket_validating_service
            .refresh_token(&token_pair.refresh, 60, 120, Some(0))
            .unwrap_err();
        assert_matches!(err, JWTRefreshError::TokenInvalided);

        //Check that tokens are still considered valid without them being in the bucket when validate_token_bucket=false
        let claims = bucket_not_validating_service
            .verify_token(&token_pair.token, Some(0))
            .unwrap();
        assert_eq!(user_id, claims.sub);
    }

    #[actix_rt::test]
    async fn test_user_auth_token_expiry() {
        let bucket = RwLock::new(TokenBucket::new());
        const JWT_TOKEN_SECRET: &[u8] = "some secret".as_bytes();
        let user_id = "test_user_id";
        let password = "pass";
        let mut bucket_validating_service = TokenService::new(&bucket, JWT_TOKEN_SECRET, true);

        // should be able to create a new token
        let token_pair = bucket_validating_service
            .jwt_token(user_id, password, 1, 1)
            .unwrap();
        // should be able to verify token
        let claims = bucket_validating_service
            .verify_token(&token_pair.token, Some(2))
            .unwrap();
        assert_eq!(user_id, claims.sub);

        // granularity is 1 sec so need to wait 2 sec
        std::thread::sleep(std::time::Duration::from_millis(2000));
        let err = bucket_validating_service
            .verify_token(&token_pair.token, Some(0))
            .unwrap_err();
        assert_matches!(err, JWTValidationError::ExpiredSignature);
        let err = bucket_validating_service
            .refresh_token(&token_pair.refresh, 1, 1, Some(0))
            .unwrap_err();
        assert_matches!(err, JWTRefreshError::ExpiredSignature);
    }
}
