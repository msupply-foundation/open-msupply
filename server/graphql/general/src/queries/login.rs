use async_graphql::*;
use chrono::Utc;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use http2::header::SET_COOKIE;
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
    /// Bearer token. The web client uses the HttpOnly cookie instead, but
    /// the token is still returned here for backward compatibility and
    /// external integrations that use the Authorization header directly.
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

pub struct CentralSyncRequired;
#[Object]
impl CentralSyncRequired {
    pub async fn description(&self) -> &str {
        "Could not reach mSupply central server"
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
#[graphql(field(name = "description", ty = "&str"))]
pub enum AuthTokenErrorInterface {
    InvalidCredentials(InvalidCredentials),
    AccountBlocked(AccountBlocked),
    NoSiteAccess(NoSiteAccess),
    CentralSyncRequired(CentralSyncRequired),
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
            let formatted_error = format!("{error:#?}");
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
                LoginError::MSupplyCentralNotReached => {
                    return Ok(AuthTokenResponse::Error(AuthTokenError {
                        error: AuthTokenErrorInterface::CentralSyncRequired(CentralSyncRequired),
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
    let suffix = &auth_data.cookie_suffix;

    set_refresh_token_cookie(ctx, &pair.refresh, pair.refresh_expiry_date - now, auth_data.no_ssl, suffix);
    set_auth_token_cookie(ctx, &pair.token, pair.expiry_date - now, auth_data.no_ssl, suffix);

    Ok(AuthTokenResponse::Response(AuthToken { pair }))
}

fn set_cookie(ctx: &Context<'_>, name: &str, value: &str, max_age: usize, no_ssl: bool) {
    let secure = if no_ssl { "" } else { "; Secure" };
    // Use append so multiple Set-Cookie headers are sent (one per cookie)
    ctx.append_http_header(
        SET_COOKIE,
        format!("{name}={value}; Max-Age={max_age}{secure}; HttpOnly; SameSite=Strict; Path=/"),
    );
}

pub fn set_refresh_token_cookie(
    ctx: &Context<'_>,
    refresh_token: &str,
    max_age: usize,
    no_ssl: bool,
    suffix: &str,
) {
    set_cookie(ctx, &format!("refresh_token_{suffix}"), refresh_token, max_age, no_ssl);
}

pub fn set_auth_token_cookie(
    ctx: &Context<'_>,
    token: &str,
    max_age: usize,
    no_ssl: bool,
    suffix: &str,
) {
    set_cookie(ctx, &format!("auth_{suffix}"), token, max_age, no_ssl);
}
