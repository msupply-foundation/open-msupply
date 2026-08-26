use async_graphql::*;
use chrono::Utc;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError},
    ContextExt,
};
use service::session_store::SESSION_LIFETIME;

use crate::set_session_cookie;

pub struct RefreshToken {
    /// Opaque session token. Same value the caller already has — the server doesn't rotate it on
    /// refresh, it just slides the session's expiry forward.
    pub token: String,
    pub expiry_date: usize,
}

#[Object]
impl RefreshToken {
    pub async fn token(&self) -> &str {
        &self.token
    }

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

pub struct NoRefreshTokenProvided;
#[Object]
impl NoRefreshTokenProvided {
    pub async fn description(&self) -> &str {
        "No session token provided"
    }
}

pub struct TokenExpired;
#[Object]
impl TokenExpired {
    pub async fn description(&self) -> &str {
        "Session expired"
    }
}

pub struct NotARefreshToken;
#[Object]
impl NotARefreshToken {
    pub async fn description(&self) -> &str {
        "Not a session token"
    }
}

pub struct InvalidToken;
#[Object]
impl InvalidToken {
    pub async fn description(&self) -> &str {
        "Invalid token"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "&str"))]
pub enum RefreshTokenErrorInterface {
    NoRefreshTokenProvided(NoRefreshTokenProvided),
    TokenExpired(TokenExpired),
    NotARefreshToken(NotARefreshToken),
    InvalidToken(InvalidToken),
    DatabaseError(DatabaseError),
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct RefreshTokenError {
    pub error: RefreshTokenErrorInterface,
}

#[derive(Union)]
pub enum RefreshTokenResponse {
    Error(RefreshTokenError),
    Response(RefreshToken),
}

/// Sliding-window refresh. The session token doesn't change — the server just bumps `expires_at`
/// forward. Kept for backwards compatibility with token-based clients, and doubles as the
/// keep-alive "ping" for cookie-session front ends: calling it with a valid session cookie slides
/// the server-side session and re-emits `Set-Cookie` with a fresh `Max-Age`. (Any authenticated
/// request slides the session too — this operation just does nothing else.)
pub fn refresh_token(ctx: &Context<'_>) -> RefreshTokenResponse {
    let auth_data = ctx.get_auth_data();

    let token = match ctx.get_auth_token() {
        Some(t) => t,
        None => {
            return RefreshTokenResponse::Error(RefreshTokenError {
                error: RefreshTokenErrorInterface::NoRefreshTokenProvided(NoRefreshTokenProvided),
            })
        }
    };

    {
        let mut store = match auth_data.session_store.write() {
            Ok(s) => s,
            Err(e) => {
                return RefreshTokenResponse::Error(RefreshTokenError {
                    error: RefreshTokenErrorInterface::InternalError(InternalError(format!(
                        "Session store lock poisoned: {e}"
                    ))),
                })
            }
        };
        if store.validate_and_slide(&token).is_none() {
            return RefreshTokenResponse::Error(RefreshTokenError {
                error: RefreshTokenErrorInterface::TokenExpired(TokenExpired),
            });
        }
    }

    // Re-emit the cookie so legacy clients still see a Set-Cookie response. Browser-side this is
    // a no-op for active users (Max-Age is server-fixed and far exceeds the session lifetime).
    set_session_cookie(ctx, &token, auth_data);

    let expiry_date = (Utc::now() + SESSION_LIFETIME).timestamp() as usize;
    RefreshTokenResponse::Response(RefreshToken { token, expiry_date })
}
