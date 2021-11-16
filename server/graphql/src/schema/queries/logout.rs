use async_graphql::*;
use service::permission_validation::{
    validate_auth, validation_denied_kind_to_string, ValidationError,
};

use crate::schema::types::{AccessDenied, InternalError};
use crate::ContextExt;
use service::token::TokenService;

use super::{set_refresh_token_cookie, ErrorWrapper};

pub struct Logout {
    pub user_id: String,
}

#[Object]
impl Logout {
    /// User id of the logged out user
    pub async fn user_id(&self) -> &str {
        &self.user_id
    }
}

pub struct MissingAuthToken;
#[Object]
impl MissingAuthToken {
    pub async fn description(&self) -> &'static str {
        "Auth token was not provided"
    }
}

pub struct ExpiredSignature;
#[Object]
impl ExpiredSignature {
    pub async fn description(&self) -> &'static str {
        "Provided token is expired"
    }
}

pub struct InvalidToken;
#[Object]
impl InvalidToken {
    pub async fn description(&self) -> &'static str {
        "Provided token is invalid"
    }
}

pub struct TokenInvalided;
#[Object]
impl TokenInvalided {
    pub async fn description(&self) -> &'static str {
        "Token has been invalidated by the server"
    }
}

pub struct NotAnApiToken;
#[Object]
impl NotAnApiToken {
    pub async fn description(&self) -> &'static str {
        "Not an api token"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum LogoutErrorInterface {
    AccessDenied(AccessDenied),
    InternalError(InternalError),
}

pub type LogoutError = ErrorWrapper<LogoutErrorInterface>;

#[derive(Union)]
pub enum LogoutResponse {
    Error(LogoutError),
    Response(Logout),
}

pub fn logout(ctx: &Context<'_>) -> LogoutResponse {
    let auth_data = ctx.get_auth_data();
    // invalid the refresh token cookie first (just in case an error happens before we do so)
    set_refresh_token_cookie(ctx, "logged out", 0, auth_data.debug_no_ssl);

    let user_auth = match validate_auth(auth_data, &ctx.get_auth_token()) {
        Ok(value) => value,
        Err(err) => {
            let error = match err {
                ValidationError::Denied(denied) => LogoutErrorInterface::AccessDenied(
                    AccessDenied(validation_denied_kind_to_string(denied)),
                ),
                ValidationError::InternalError(err) => {
                    LogoutErrorInterface::InternalError(InternalError(err))
                }
            };
            return LogoutResponse::Error(ErrorWrapper { error });
        }
    };

    // invalided all tokens of the user on the server
    let user_id = user_auth.claims.sub;
    let mut service = TokenService::new(
        &auth_data.token_bucket,
        auth_data.auth_token_secret.as_bytes(),
    );
    match service.logout(&user_id) {
        Ok(_) => {}
        Err(e) => match e {
            service::token::JWTLogoutError::ConcurrencyLockError(_) => {
                return LogoutResponse::Error(ErrorWrapper {
                    error: LogoutErrorInterface::InternalError(InternalError(
                        "Lock error".to_string(),
                    )),
                });
            }
        },
    };

    LogoutResponse::Response(Logout { user_id })
}
