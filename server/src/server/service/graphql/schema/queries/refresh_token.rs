use async_graphql::*;
use log::error;

use crate::server::service::graphql::schema::types::InternalError;
use crate::server::service::graphql::{ContextExt, RequestUserData};
use crate::service::token::{JWTRefreshError, TokenPair, TokenService};

use super::{set_refresh_token_cookie, DatabaseError, ErrorWrapper};

pub struct RefreshToken {
    pub pair: TokenPair,
}

#[Object]
impl RefreshToken {
    /// New Bearer token
    pub async fn token(&self) -> &str {
        &self.pair.token
    }
}

pub struct NoRefreshTokenProvided;
#[Object]
impl NoRefreshTokenProvided {
    pub async fn description(&self) -> &'static str {
        "No refresh token provided"
    }
}

pub struct TokenExpired;
#[Object]
impl TokenExpired {
    pub async fn description(&self) -> &'static str {
        "Token is expired"
    }
}

pub struct NotARefreshToken;
#[Object]
impl NotARefreshToken {
    pub async fn description(&self) -> &'static str {
        "Not a refresh token"
    }
}

pub struct InvalidToken;
#[Object]
impl InvalidToken {
    pub async fn description(&self) -> &'static str {
        "Invalid token"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum RefreshTokenErrorInterface {
    NoRefreshTokenProvided(NoRefreshTokenProvided),
    TokenExpired(TokenExpired),
    NotARefreshToken(NotARefreshToken),
    InvalidToken(InvalidToken),
    DatabaseError(DatabaseError),
    InternalError(InternalError),
}

pub type RefreshTokenError = ErrorWrapper<RefreshTokenErrorInterface>;

#[derive(Union)]
pub enum RefreshTokenResponse {
    Error(RefreshTokenError),
    Response(RefreshToken),
}

pub fn refresh_token(ctx: &Context<'_>) -> RefreshTokenResponse {
    let auth_data = ctx.get_auth_data();
    let mut service = TokenService::new(
        &auth_data.token_bucket,
        auth_data.auth_token_secret.as_bytes(),
    );

    let refresh_token = match ctx
        .data_opt::<RequestUserData>()
        .and_then(|d| d.refresh_token.to_owned())
    {
        Some(data) => data,
        None => {
            return RefreshTokenResponse::Error(ErrorWrapper {
                error: RefreshTokenErrorInterface::NoRefreshTokenProvided(NoRefreshTokenProvided),
            })
        }
    };
    let max_age_token = chrono::Duration::minutes(60).num_seconds() as usize;
    let max_age_refresh = chrono::Duration::hours(6).num_seconds() as usize;
    let pair = match service.refresh_token(&refresh_token, max_age_token, max_age_refresh) {
        Ok(pair) => pair,
        Err(err) => {
            return RefreshTokenResponse::Error(ErrorWrapper {
                error: match err {
                    JWTRefreshError::ExpiredSignature => {
                        RefreshTokenErrorInterface::TokenExpired(TokenExpired)
                    }
                    JWTRefreshError::TokenInvalided => {
                        RefreshTokenErrorInterface::TokenExpired(TokenExpired)
                    }
                    JWTRefreshError::NotARefreshToken => {
                        RefreshTokenErrorInterface::NotARefreshToken(NotARefreshToken)
                    }
                    JWTRefreshError::InvalidToken(_) => {
                        RefreshTokenErrorInterface::InvalidToken(InvalidToken)
                    }
                    JWTRefreshError::FailedToCreateNewToken(e) => {
                        error!("{}", e);
                        RefreshTokenErrorInterface::InternalError(InternalError(
                            "Failed to create new token".to_string(),
                        ))
                    }
                    JWTRefreshError::ConcurrencyLockError(e) => {
                        error!("{}", e);
                        RefreshTokenErrorInterface::InternalError(InternalError(
                            "Lock error".to_string(),
                        ))
                    }
                },
            })
        }
    };

    set_refresh_token_cookie(ctx, &pair.refresh, max_age_refresh, auth_data.debug_no_ssl);

    RefreshTokenResponse::Response(RefreshToken { pair })
}
