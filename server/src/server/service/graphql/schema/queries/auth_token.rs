use async_graphql::*;
use reqwest::header::SET_COOKIE;

use crate::server::service::graphql::schema::types::InternalError;
use crate::server::service::graphql::ContextExt;
use crate::service::token::TokenService;
use crate::{
    database::repository::StorageConnectionManager,
    service::{
        token::{JWTIssuingError, TokenPair},
        user_account::UserAccountService,
    },
};

use super::{DatabaseError, ErrorWrapper};

pub struct AuthToken {
    pub pair: TokenPair,
}

#[Object]
impl AuthToken {
    /// Bearer token
    pub async fn token(&self) -> &str {
        &self.pair.token
    }
}

pub struct UserNameDoesNotExist;
#[Object]
impl UserNameDoesNotExist {
    pub async fn description(&self) -> &'static str {
        "User does not exist"
    }
}

pub struct InvalidCredentials;
#[Object]
impl InvalidCredentials {
    pub async fn description(&self) -> &'static str {
        "Invalid credentials"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum AuthTokenErrorInterface {
    DatabaseError(DatabaseError),
    UserNameDoesNotExist(UserNameDoesNotExist),
    InvalidCredentials(InvalidCredentials),
    InternalError(InternalError),
}

pub type AuthTokenError = ErrorWrapper<AuthTokenErrorInterface>;

#[derive(Union)]
pub enum AuthTokenResponse {
    Error(AuthTokenError),
    Response(AuthToken),
}

pub fn auth_token(ctx: &Context<'_>, username: &str, password: &str) -> AuthTokenResponse {
    let connection_manager = ctx.get_repository::<StorageConnectionManager>();
    let con = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return AuthTokenResponse::Error(ErrorWrapper {
                error: AuthTokenErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    let user_service = UserAccountService::new(&con);
    let user_account = match user_service.verify_password(username, password) {
        Ok(user) => user,
        Err(err) => return AuthTokenResponse::Error(ErrorWrapper {
            error: match err {
                crate::service::user_account::VerifyPasswordError::UsernameDoesNotExist => {
                    AuthTokenErrorInterface::UserNameDoesNotExist(UserNameDoesNotExist)
                }
                crate::service::user_account::VerifyPasswordError::InvalidCredentials => {
                    AuthTokenErrorInterface::InvalidCredentials(InvalidCredentials)
                }
                crate::service::user_account::VerifyPasswordError::InvalidCredentialsBackend(_) => {
                    AuthTokenErrorInterface::InternalError(InternalError(
                        "Failed to read credentials".to_string(),
                    ))
                }
                crate::service::user_account::VerifyPasswordError::DatabaseError(e) => {
                    AuthTokenErrorInterface::DatabaseError(DatabaseError(e))
                }
            },
        }),
    };

    let auth_data = ctx.get_auth_data();
    let mut token_service = TokenService::new(
        &auth_data.token_bucket,
        auth_data.auth_token_secret.as_bytes(),
    );
    let max_age_token = chrono::Duration::minutes(60).num_seconds() as usize;
    let max_age_refresh = chrono::Duration::hours(6).num_seconds() as usize;
    let pair = match token_service.jwt_token(&user_account.id, max_age_token, max_age_refresh) {
        Ok(pair) => pair,
        Err(err) => {
            return AuthTokenResponse::Error(ErrorWrapper {
                error: match err {
                    JWTIssuingError::CanNotCreateToken(_) => {
                        AuthTokenErrorInterface::InternalError(InternalError(
                            "Can not create token".to_string(),
                        ))
                    }
                    JWTIssuingError::ConcurrencyLockError(_) => {
                        AuthTokenErrorInterface::InternalError(InternalError(
                            "Lock error".to_string(),
                        ))
                    }
                },
            })
        }
    };

    set_refresh_token_cookie(ctx, &pair.refresh, max_age_refresh, auth_data.debug_no_ssl);

    AuthTokenResponse::Response(AuthToken { pair })
}

/// Store refresh token in a cookie:
/// - HttpOnly cookie (not readable from js).
/// - Secure (https only)
/// - SameSite (only attached to request originating from the same site)
/// Also see:
/// https://hasura.io/blog/best-practices-of-using-jwt-with-graphql/
pub fn set_refresh_token_cookie(
    ctx: &Context<'_>,
    refresh_token: &str,
    max_age: usize,
    no_ssl: bool,
) {
    let secure = if no_ssl { "" } else { "; Secure" };
    ctx.insert_http_header(
        SET_COOKIE,
        format!(
            "refresh_token={}; Max-Age={}{}; HttpOnly; SameSite=Strict",
            refresh_token, max_age, secure
        ),
    );
}
