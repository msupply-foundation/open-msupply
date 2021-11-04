use async_graphql::*;
use log::error;
use reqwest::header::SET_COOKIE;

use crate::server::service::graphql::schema::types::InternalError;
use crate::server::service::graphql::ContextExt;
use crate::{
    database::repository::StorageConnectionManager,
    service::user_account::{JWTIssuingError, TokenPair, UserAccountService},
};

use super::{DatabaseError, ErrorWrapper};

pub struct AuthToken {
    pub pair: TokenPair,
}

#[Object]
impl AuthToken {
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

pub struct CanNotCreateToken;
#[Object]
impl CanNotCreateToken {
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
    CanNotCreateToken(CanNotCreateToken),
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
    let auth_data = ctx.get_auth_data();
    let mut service = UserAccountService::new(
        &con,
        &auth_data.token_bucket,
        auth_data.auth_token_secret.as_bytes(),
    );
    let max_age_token = chrono::Duration::minutes(60).num_seconds() as usize;
    let max_age_refresh = chrono::Duration::hours(6).num_seconds() as usize;
    let pair = match service.jwt_token(username, &password, max_age_token, max_age_refresh) {
        Ok(pair) => pair,
        Err(err) => {
            return AuthTokenResponse::Error(ErrorWrapper {
                error: match err {
                    JWTIssuingError::UserNameDoesNotExist => {
                        AuthTokenErrorInterface::UserNameDoesNotExist(UserNameDoesNotExist)
                    }
                    JWTIssuingError::InvalidCredentials => {
                        AuthTokenErrorInterface::InvalidCredentials(InvalidCredentials)
                    }
                    JWTIssuingError::CanNotCreateToken(_) => {
                        AuthTokenErrorInterface::CanNotCreateToken(CanNotCreateToken)
                    }
                    JWTIssuingError::DatabaseError(err) => {
                        AuthTokenErrorInterface::DatabaseError(DatabaseError(err))
                    }
                    JWTIssuingError::InvalidCredentialsBackend(e) => {
                        error!("{}", e);
                        AuthTokenErrorInterface::InternalError(InternalError(
                            "Failed to read credentials".to_string(),
                        ))
                    }
                    JWTIssuingError::ConcurrencyLockError(e) => {
                        error!("{}", e);
                        AuthTokenErrorInterface::InternalError(InternalError(
                            "Lock error".to_string(),
                        ))
                    }
                },
            })
        }
    };

    // Store refresh token in a cookie:
    // - HttpOnly cookie (not readable from js).
    // - Secure (https only)
    // - SameSite (only attached to request originating from the same site)
    // Also see:
    // https://hasura.io/blog/best-practices-of-using-jwt-with-graphql/
    let secure = if auth_data.debug_no_ssl {
        " Secure;"
    } else {
        ""
    };
    ctx.insert_http_header(
        SET_COOKIE,
        format!(
            "refresh_token={}; Max-Age={};{} HttpOnly; SameSite=Strict",
            pair.refresh, max_age_refresh, secure
        ),
    );
    AuthTokenResponse::Response(AuthToken { pair })
}
