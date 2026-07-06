use async_graphql::*;
use chrono::Utc;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use http2::header::SET_COOKIE;
use service::{
    auth_data::AuthData,
    login::{
        LoginError, LoginFailure, LoginInput, LoginService, LoginSuccess,
        MIN_ERR_RESPONSE_TIME_SEC,
    },
    session_store::SESSION_LIFETIME,
    sync::CentralServerConfig,
};

pub struct AuthToken {
    /// Opaque session token (issued by `SessionStore::create`).
    pub token: String,
    /// Unix-timestamp [s] when the session expires if no further activity arrives.
    pub expiry_date: usize,
}

#[Object]
impl AuthToken {
    /// Bearer token. Web clients ignore this — the browser sends the HttpOnly `session_{port}`
    /// cookie automatically. Kept in the response for backwards-compatible API integrations
    /// (e.g. Sage) that pass it as `Authorization: Bearer`.
    pub async fn token(&self) -> &str {
        &self.token
    }

    /// When the session expires, as a unix timestamp [s].
    pub async fn expiry_date(&self) -> usize {
        self.expiry_date
    }

    /// **Deprecated** — there is no longer a separate refresh token. Returned as a duplicate of
    /// `token` purely so existing integrations that read this field don't break.
    pub async fn refresh(&self) -> &str {
        &self.token
    }

    /// **Deprecated** — there is no longer a separate refresh-token expiry. Returned as a
    /// duplicate of `expiry_date` purely so existing integrations that read this field don't
    /// break.
    pub async fn refresh_expiry_date(&self) -> usize {
        self.expiry_date
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

    let central_server_url = if CentralServerConfig::is_standalone_central() {
        String::new()
    } else {
        service_provider
            .settings
            .sync_settings(&service_context)?
            .ok_or(StandardGraphqlError::InternalError(
                "Sync settings not available".to_string(),
            ))?
            .url
    };

    let success = match LoginService::login(
        service_provider,
        auth_data,
        LoginInput {
            username: username.to_string(),
            password: password.to_string(),
            central_server_url,
        },
        MIN_ERR_RESPONSE_TIME_SEC,
    )
    .await
    {
        Ok(success) => success,
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
                LoginError::InternalError(_)
                | LoginError::DatabaseError(_)
                | LoginError::FetchUserError(_)
                | LoginError::UpdateUserError(_) => StandardGraphqlError::InternalError(formatted_error),
            };
            return Err(graphql_error.extend());
        }
    };

    let LoginSuccess { user_id } = success;
    let token = auth_data
        .session_store
        .write()
        .map_err(|e| {
            StandardGraphqlError::InternalError(format!("Session store lock poisoned: {e}"))
        })?
        .create(&user_id);

    let expiry_date = (Utc::now() + SESSION_LIFETIME).timestamp() as usize;
    set_session_cookie(ctx, &token, auth_data);

    Ok(AuthTokenResponse::Response(AuthToken { token, expiry_date }))
}

/// How long the browser is allowed to keep the session cookie. Intentionally **much longer** than
/// [`SESSION_LIFETIME`] — the server is sole source of truth for whether a session is still
/// valid, and we never re-emit `Set-Cookie` on individual authenticated responses. If we used the
/// session lifetime here, the browser would silently drop the cookie 60 minutes after login
/// regardless of activity (the server's sliding window only updates `SessionStore` in memory).
/// With a long cookie lifetime the worst case for an inactive user is one trailing
/// `Unauthenticated` response, which is the same as if the cookie had expired naturally.
const COOKIE_MAX_AGE_SECONDS: usize = 60 * 60 * 24 * 30; // 30 days

/// Stores the opaque session token in an HttpOnly cookie. The cookie name is suffixed with the
/// server port (via [`AuthData::cookie_suffix`]) so multiple instances on the same domain don't
/// overwrite each other's cookies.
pub fn set_session_cookie(ctx: &Context<'_>, token: &str, auth_data: &AuthData) {
    let secure = if auth_data.no_ssl { "" } else { "; Secure" };
    let name = session_cookie_name(&auth_data.cookie_suffix);
    ctx.insert_http_header(
        SET_COOKIE,
        format!(
            "{name}={token}; Max-Age={COOKIE_MAX_AGE_SECONDS}; Path=/{secure}; HttpOnly; SameSite=Strict"
        ),
    );
}

/// Clears the session cookie (used by logout).
pub fn clear_session_cookie(ctx: &Context<'_>, auth_data: &AuthData) {
    let secure = if auth_data.no_ssl { "" } else { "; Secure" };
    let name = session_cookie_name(&auth_data.cookie_suffix);
    ctx.insert_http_header(
        SET_COOKIE,
        format!("{name}=; Max-Age=0; Path=/{secure}; HttpOnly; SameSite=Strict"),
    );
}

pub fn session_cookie_name(suffix: &str) -> String {
    format!("session_{suffix}")
}
