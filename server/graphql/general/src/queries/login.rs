use async_graphql::*;
use chrono::Utc;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use actix_web::http::header::SET_COOKIE;
use service::{
    login::{LoginError, LoginFailure, LoginInput, LoginService},
    token::TokenPair,
};

// Fixed login response time in case of an error (see service)
const MIN_ERR_RESPONSE_TIME_SEC: u64 = 6;

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

pub struct NoSiteAccess;
#[Object]
impl NoSiteAccess {
    pub async fn description(&self) -> &str {
        "User account does not have access to any stores on this site"
    }
}

pub struct InvalidCredentials;
#[Object]
impl InvalidCredentials {
    pub async fn description(&self) -> &str {
        "Invalid credentials"
    }
}

pub struct MissingCredentials;
#[Object]
impl MissingCredentials {
    pub async fn description(&self) -> &str {
        "Missing credentials"
    }
}

pub struct AccountBlocked {
    pub timeout_remaining: u64,
}

#[Object]
impl AccountBlocked {
    pub async fn timeout_remaining(&self) -> u64 {
        self.timeout_remaining
    }

    pub async fn description(&self) -> &str {
        "Account is blocked until the lockout period has expired"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum AuthTokenErrorInterface {
    InvalidCredentials(InvalidCredentials),
    AccountBlocked(AccountBlocked),
    NoSiteAccess(NoSiteAccess),
}

#[derive(SimpleObject)]
pub struct AuthTokenError {
    pub error: AuthTokenErrorInterface,
}

#[derive(Union)]
pub enum AuthTokenResponse {
    Response(AuthToken),
    Error(AuthTokenError),
}

pub async fn login(ctx: &Context<'_>, username: &str, password: &str) -> Result<AuthTokenResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let auth_data = ctx.get_auth_data();
    let sync_settings = service_provider
        .settings
        .sync_settings(&service_context)?
        .ok_or(StandardGraphqlError::InternalError(
            "Sync settings not available".to_string(),
        ))?;

    let pair = match LoginService::login(
        service_provider,
        auth_data,
        LoginInput {
            username: username.to_string(),
            password: password.to_string(),
            central_server_url: sync_settings.url.clone(),
        },
        MIN_ERR_RESPONSE_TIME_SEC,
    )
    .await
    {
        Ok(pair) => pair,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = match error {
                LoginError::LoginFailure(LoginFailure::InvalidCredentials) => {
                    return Ok(AuthTokenResponse::Error(AuthTokenError {
                        error: AuthTokenErrorInterface::InvalidCredentials(InvalidCredentials),
                    }))
                }
                LoginError::LoginFailure(LoginFailure::AccountBlocked(timeout_remaining)) => {
                    return Ok(AuthTokenResponse::Error(AuthTokenError {
                        error: AuthTokenErrorInterface::AccountBlocked(AccountBlocked {
                            timeout_remaining,
                        }),
                    }))
                }
                LoginError::LoginFailure(LoginFailure::NoSiteAccess) => {
                    return Ok(AuthTokenResponse::Error(AuthTokenError {
                        error: AuthTokenErrorInterface::NoSiteAccess(NoSiteAccess),
                    }))
                }
                LoginError::FailedToGenerateToken(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                LoginError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                LoginError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                LoginError::FetchUserError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                LoginError::UpdateUserError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };

    let now = Utc::now().timestamp() as usize;
    set_refresh_token_cookie(
        ctx,
        &pair.refresh,
        pair.refresh_expiry_date - now,
        auth_data.no_ssl,
    );

    Ok(AuthTokenResponse::Response(AuthToken { pair }))
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
