use crate::{
    database::{
        repository::{RepositoryError, StorageConnection, TransactionError, UserAccountRepository},
        schema::UserAccountRow,
    },
    util::uuid::uuid,
};

use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};
use chrono::Utc;
use jsonwebtoken::errors::{Error as JWTError, ErrorKind as JWTErrorKind};
use serde::{Deserialize, Serialize};

use super::token_bucket::TokenBucket;

#[derive(Debug, Serialize, Deserialize)]
enum Audience {
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
    exp: usize,

    /// Audience
    aud: Audience,
    /// Issued at (as UTC timestamp)
    iat: usize,
    /// Issuer
    iss: String,
    /// Subject (user id the token refers to)
    sub: String,
}

pub struct CreateUserAccount {
    pub username: String,
    pub password: String,
    pub email: Option<String>,
}

pub type UserAccount = UserAccountRow;

#[derive(Debug)]
pub enum CreateUserAccountError {
    UserNameExist,
    PasswordHashError(BcryptError),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for CreateUserAccountError {
    fn from(err: RepositoryError) -> Self {
        CreateUserAccountError::DatabaseError(err)
    }
}

/// Error for getting a JWT token
#[derive(Debug)]
pub enum JWTIssuingError {
    UserNameDoesNotExist,
    InvalidCredentials,
    /// Invalid account data on the backend
    InvalidCredentialsBackend(bcrypt::BcryptError),
    CanNotCreateToken(JWTError),
    DatabaseError(RepositoryError),
}

#[derive(Debug)]
pub enum JWTValidationError {
    ExpiredSignature,
    NotAnApiToken,
    InvalidToken(JWTError),
    /// Token has been invalidated on the backend
    TokenInvalided,
}

#[derive(Debug)]
pub enum JWTRefreshError {
    ExpiredSignature,
    NotARefreshToken,
    InvalidToken(JWTError),
    FailedToCreateNewToken(JWTError),
    /// Token has been invalidated on the backend
    TokenInvalided,
}

#[derive(Debug)]
pub struct TokenPair {
    /// The JWT token
    pub token: String,
    /// expiry date of the token
    pub expiry_date: usize,
    /// The JWT refresh token
    pub refresh: String,
    /// Expiry date of the refresh token
    pub refresh_expiry_date: usize,
}

pub struct UserAccountService<'a> {
    connection: &'a StorageConnection,
    token_bucket: &'a mut TokenBucket,
    jwt_token_secret: &'a [u8],
}

impl<'a> UserAccountService<'a> {
    pub fn new(
        connection: &'a StorageConnection,
        token_bucket: &'a mut TokenBucket,
        jwt_token_secret: &'a [u8],
    ) -> Self {
        UserAccountService {
            connection,
            token_bucket,
            jwt_token_secret,
        }
    }

    pub fn create_user(
        &self,
        user: CreateUserAccount,
    ) -> Result<UserAccount, CreateUserAccountError> {
        self.connection
            .transaction_sync(|con| {
                let repo = UserAccountRepository::new(con);
                if let Ok(_) = repo.find_one_by_user_name(&user.username) {
                    return Err(CreateUserAccountError::UserNameExist);
                }
                let hashed_password = match hash(user.password, DEFAULT_COST) {
                    Ok(pwd) => pwd,
                    Err(err) => return Err(CreateUserAccountError::PasswordHashError(err)),
                };
                let row = UserAccountRow {
                    id: uuid(),
                    username: user.username,
                    password: hashed_password,
                    email: user.email,
                };
                repo.insert_one(&row)?;
                Ok(row)
            })
            .map_err(
                |error: TransactionError<CreateUserAccountError>| match error {
                    TransactionError::Transaction { msg } => {
                        RepositoryError::as_db_error(&msg, "").into()
                    }
                    TransactionError::Inner(error) => error,
                },
            )
    }

    /// Creates new json web token for a given user
    ///
    /// # Arguments
    ///
    /// * `valid_for` - duration (sec) for how long the token will be valid
    /// * `refresh_token_valid_for` - duration (sec) for how long the refresh token will be valid
    pub fn jwt_token(
        &mut self,
        username: &str,
        password: &str,
        valid_for: usize,
        refresh_token_valid_for: usize,
    ) -> Result<TokenPair, JWTIssuingError> {
        let repo = UserAccountRepository::new(self.connection);
        let user = repo
            .find_one_by_user_name(username)
            .map_err(|err| match err {
                RepositoryError::NotFound => JWTIssuingError::UserNameDoesNotExist,
                _ => JWTIssuingError::DatabaseError(err),
            })?;
        // verify password
        if !verify(password, &user.password)
            .map_err(|err| JWTIssuingError::InvalidCredentialsBackend(err))?
        {
            return Err(JWTIssuingError::InvalidCredentials);
        }

        let pair = create_jwt_pair(
            &user.id,
            self.jwt_token_secret,
            valid_for,
            refresh_token_valid_for,
        )
        .map_err(|err| JWTIssuingError::CanNotCreateToken(err))?;

        // add tokens to bucket
        self.token_bucket
            .put(&user.id, &pair.token, pair.expiry_date);
        self.token_bucket
            .put(&user.id, &pair.refresh, pair.refresh_expiry_date);

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
    ) -> Result<TokenPair, JWTRefreshError> {
        let mut validation = jsonwebtoken::Validation::default();
        validation.set_audience(&vec![format!("{:?}", Audience::TokenRefresh)]);
        validation.iss = Some(ISSUER.to_string());
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
        .map_err(|err| JWTRefreshError::FailedToCreateNewToken(err))?;
        // Check token is still in the list of valid tokens
        if !self.token_bucket.contains(&user_id, refresh_token) {
            return Err(JWTRefreshError::TokenInvalided);
        }

        // add tokens to bucket
        self.token_bucket
            .put(&user_id, &pair.token, pair.expiry_date);
        self.token_bucket
            .put(&user_id, &pair.refresh, pair.refresh_expiry_date);
        // Shorten the expiry time of the old refresh token.
        //
        // Note, if the client goes offline before receiving the new refresh token the user might
        // need to login again. This might seem random to the user. Lets see if that becomes a real
        // issue.
        let reduced_expiry =
            std::cmp::min(Utc::now().timestamp() as usize + 5 * 60, decoded.claims.exp);
        self.token_bucket
            .put(&user_id, refresh_token, reduced_expiry);

        Ok(pair)
    }

    pub fn verify_token(&self, token: &str) -> Result<OmSupplyClaim, JWTValidationError> {
        let mut validation = jsonwebtoken::Validation::default();
        validation.set_audience(&vec![format!("{:?}", Audience::Api)]);
        validation.iss = Some(ISSUER.to_string());
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
            _ => JWTValidationError::InvalidToken(err),
        })?;

        // Check token is still in the list of valid tokens
        if !self.token_bucket.contains(&decoded.claims.sub, token) {
            return Err(JWTValidationError::TokenInvalided);
        }
        Ok(decoded.claims)
    }

    /// Log a user out of all sessions
    pub fn logout(&mut self, user_id: &str) {
        self.token_bucket.clear(user_id);
    }
}

/// Creates a token and refresh token pair
fn create_jwt_pair(
    user_id: &str,
    jwt_token_secret: &[u8],
    valid_for: usize,
    refresh_valid_for: usize,
) -> Result<TokenPair, JWTError> {
    let now = Utc::now().timestamp() as usize;
    let expiry_date = now + valid_for;
    let refresh_expiry_date = now + refresh_valid_for;

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
    use crate::{
        database::repository::{get_repositories, StorageConnectionManager},
        service::token_bucket::TokenBucket,
        util::test_db,
    };

    use super::*;

    #[actix_rt::test]
    async fn test_user_auth() {
        let settings = test_db::get_test_settings("omsupply-database-user-account-service");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        let mut bucket = TokenBucket::new();
        const JWT_TOKEN_SECRET: &[u8] = "some secret".as_bytes();
        let mut service = UserAccountService::new(&connection, &mut bucket, JWT_TOKEN_SECRET);

        // should be able to create a new user
        let password: &str = "passw0rd";
        let user = service
            .create_user(CreateUserAccount {
                username: "testuser".to_string(),
                password: password.to_string(),
                email: None,
            })
            .unwrap();
        let token_pair = service
            .jwt_token(&user.username, password, 60, 120)
            .unwrap();

        // should be able to verify token
        let claims = service.verify_token(&token_pair.token).unwrap();
        assert_eq!(user.id, claims.sub);

        // should fail to verify with refresh token
        let err = service.verify_token(&token_pair.refresh).unwrap_err();
        assert!(matches!(err, JWTValidationError::NotAnApiToken));

        // should fail to refresh token refresh with api token
        let err = service
            .refresh_token(&token_pair.token, 60, 120)
            .unwrap_err();
        assert!(matches!(err, JWTRefreshError::NotARefreshToken));

        // should succeed to refresh token
        let token_pair = service.refresh_token(&token_pair.refresh, 60, 120).unwrap();
        let claims = service.verify_token(&token_pair.token).unwrap();
        // important: sub must still match the user id:
        assert_eq!(user.id, claims.sub);

        // should fail to verify and refresh when logged out
        service.logout(&user.id);
        let err = service.verify_token(&token_pair.token).unwrap_err();
        assert!(matches!(err, JWTValidationError::TokenInvalided));
        let err = service
            .refresh_token(&token_pair.refresh, 60, 120)
            .unwrap_err();
        assert!(matches!(err, JWTRefreshError::TokenInvalided));
    }

    #[actix_rt::test]
    async fn test_user_auth_token_expiry() {
        let settings = test_db::get_test_settings("omsupply-database-user-account-token-expiry");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        let mut bucket = TokenBucket::new();
        const JWT_TOKEN_SECRET: &[u8] = "some secret".as_bytes();
        let mut service = UserAccountService::new(&connection, &mut bucket, JWT_TOKEN_SECRET);

        // should be able to create a new user
        let password: &str = "passw0rd";
        let user = service
            .create_user(CreateUserAccount {
                username: "testuser".to_string(),
                password: password.to_string(),
                email: None,
            })
            .unwrap();
        let token_pair = service.jwt_token(&user.username, password, 1, 1).unwrap();
        // should be able to verify token
        let claims = service.verify_token(&token_pair.token).unwrap();
        assert_eq!(user.id, claims.sub);

        // granularity is 1 sec so need to wait 2 sec
        std::thread::sleep(std::time::Duration::from_millis(2000));
        let err = service.verify_token(&token_pair.token).unwrap_err();
        assert!(matches!(err, JWTValidationError::ExpiredSignature));
        let err = service
            .refresh_token(&token_pair.refresh, 1, 1)
            .unwrap_err();
        assert!(matches!(err, JWTRefreshError::ExpiredSignature));
    }
}
