use crate::{
    database::{
        repository::{RepositoryError, StorageConnection, TransactionError, UserAccountRepository},
        schema::UserAccountRow,
    },
    util::uuid::uuid,
};

use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
enum Audience {
    /// Token is for general api usage
    Api,
    /// Token can be used for a token refresh
    TokenRefresh,
}

// TODO: make the issuer configurable?
const ISSUER: &str = "om-supply-remote-server";
// TODO
const JWT_TOKEN_SECRET: &[u8] = "TODO: store me somewhere else!".as_bytes();

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
    CanNotCreateToken(jsonwebtoken::errors::Error),
    DatabaseError(RepositoryError),
}

#[derive(Debug)]
pub enum JWTValidationError {
    ExpiredSignature,
    NotAnApiToken,
    InvalidToken(jsonwebtoken::errors::Error),
}

#[derive(Debug)]
pub enum JWTRefreshError {
    ExpiredSignature,
    NotARefreshToken,
    InvalidToken(jsonwebtoken::errors::Error),
    FailedToCreateNewToken(jsonwebtoken::errors::Error),
}

#[derive(Debug)]
pub struct TokenPair {
    pub token: String,
    pub refresh: String,
}

pub struct UserAccountService<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserAccountService<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserAccountService { connection }
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
    /// * `valid_for` - duration [s] for how long the token will be valid
    pub fn jwt_token(
        &self,
        username: &str,
        password: &str,
        valid_for: usize,
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

        create_jwt_pair(&user.id, valid_for).map_err(|err| JWTIssuingError::CanNotCreateToken(err))
    }

    pub fn verify_token(&self, token: &str) -> Result<OmSupplyClaim, JWTValidationError> {
        let mut validation = jsonwebtoken::Validation::default();
        validation.set_audience(&vec![format!("{:?}", Audience::Api)]);
        validation.iss = Some(ISSUER.to_string());
        let decoded = jsonwebtoken::decode::<OmSupplyClaim>(
            token,
            &jsonwebtoken::DecodingKey::from_secret(JWT_TOKEN_SECRET),
            &validation,
        )
        .map_err(|err| match err.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
                JWTValidationError::ExpiredSignature
            }
            jsonwebtoken::errors::ErrorKind::InvalidAudience => JWTValidationError::NotAnApiToken,
            _ => JWTValidationError::InvalidToken(err),
        })?;

        Ok(decoded.claims)
    }

    pub fn refresh_token(
        &self,
        refresh_token: &str,
        valid_for: usize,
    ) -> Result<TokenPair, JWTRefreshError> {
        let mut validation = jsonwebtoken::Validation::default();
        validation.set_audience(&vec![format!("{:?}", Audience::TokenRefresh)]);
        validation.iss = Some(ISSUER.to_string());
        let decoded = jsonwebtoken::decode::<OmSupplyClaim>(
            refresh_token,
            &jsonwebtoken::DecodingKey::from_secret(JWT_TOKEN_SECRET),
            &validation,
        )
        .map_err(|err| match err.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => JWTRefreshError::ExpiredSignature,
            jsonwebtoken::errors::ErrorKind::InvalidAudience => JWTRefreshError::NotARefreshToken,
            _ => JWTRefreshError::InvalidToken(err),
        })?;

        let user_id = decoded.claims.sub;
        create_jwt_pair(&user_id, valid_for)
            .map_err(|err| JWTRefreshError::FailedToCreateNewToken(err))
    }
}

/// Creates a token and refresh token pair
fn create_jwt_pair(
    user_id: &str,
    valid_for: usize,
) -> Result<TokenPair, jsonwebtoken::errors::Error> {
    let now = Utc::now().timestamp() as usize;

    // api token
    let api_claims = OmSupplyClaim {
        exp: now + valid_for,
        aud: Audience::Api,
        iat: now,
        iss: ISSUER.to_string(),
        sub: user_id.to_owned(),
    };
    let api_token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &api_claims,
        &jsonwebtoken::EncodingKey::from_secret(JWT_TOKEN_SECRET),
    )?;

    // refresh token
    let refresh_claims = OmSupplyClaim {
        exp: now + valid_for,
        aud: Audience::TokenRefresh,
        iat: now,
        iss: ISSUER.to_string(),
        sub: user_id.to_owned(),
    };
    let refresh_token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &refresh_claims,
        &jsonwebtoken::EncodingKey::from_secret(JWT_TOKEN_SECRET),
    )?;

    Ok(TokenPair {
        token: api_token,
        refresh: refresh_token,
    })
}

#[cfg(test)]
mod user_account_test {
    use crate::{
        database::repository::{get_repositories, StorageConnectionManager},
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

        let service = UserAccountService::new(&connection);

        // should be able to create a new user
        let password: &str = "passw0rd";
        let user = service
            .create_user(CreateUserAccount {
                username: "testuser".to_string(),
                password: password.to_string(),
                email: None,
            })
            .unwrap();
        let token_pair = service.jwt_token(&user.username, password, 60).unwrap();

        // should be able to verify token
        let claims = service.verify_token(&token_pair.token).unwrap();
        assert_eq!(user.id, claims.sub);

        // should fail to verify with refresh token
        let err = service.verify_token(&token_pair.refresh).unwrap_err();
        assert!(matches!(err, JWTValidationError::NotAnApiToken));

        // should fail to refresh token refresh with api token
        let err = service.refresh_token(&token_pair.token, 60).unwrap_err();
        assert!(matches!(err, JWTRefreshError::NotARefreshToken));

        // should succeed to refresh token
        let token_pair = service.refresh_token(&token_pair.refresh, 60).unwrap();
        let claims = service.verify_token(&token_pair.token).unwrap();
        // important: sub must still match the user id:
        assert_eq!(user.id, claims.sub);
    }

    #[actix_rt::test]
    async fn test_user_auth_token_expiry() {
        let settings = test_db::get_test_settings("omsupply-database-user-account-token-expiry");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        let service = UserAccountService::new(&connection);

        // should be able to create a new user
        let password: &str = "passw0rd";
        let user = service
            .create_user(CreateUserAccount {
                username: "testuser".to_string(),
                password: password.to_string(),
                email: None,
            })
            .unwrap();
        let token_pair = service.jwt_token(&user.username, password, 1).unwrap();
        // should be able to verify token
        let claims = service.verify_token(&token_pair.token).unwrap();
        assert_eq!(user.id, claims.sub);

        // granularity is 1 sec so need to wait 2 sec
        std::thread::sleep(std::time::Duration::from_millis(2000));
        let err = service.verify_token(&token_pair.token).unwrap_err();
        assert!(matches!(err, JWTValidationError::ExpiredSignature));
        let err = service.refresh_token(&token_pair.refresh, 1).unwrap_err();
        assert!(matches!(err, JWTRefreshError::ExpiredSignature));
    }
}
