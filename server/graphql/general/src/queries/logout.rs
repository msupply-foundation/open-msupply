use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use service::auth::{validate_auth, AuthError};
use service::settings::is_develop;
use service::token::TokenService;

use super::set_refresh_token_cookie;

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

#[derive(Union)]
pub enum LogoutResponse {
    Response(Logout),
}

pub fn logout(ctx: &Context<'_>) -> Result<LogoutResponse> {
    let auth_data = ctx.get_auth_data();
    let cookie_suffix = ctx.get_settings().server.cookie_suffix.as_deref();
    // invalid the refresh token cookie first (just in case an error happens before we do so)
    set_refresh_token_cookie(ctx, "logged out", 0, auth_data.no_ssl, cookie_suffix);

    let user_auth = match validate_auth(auth_data, &ctx.get_auth_token()) {
        Ok(value) => value,
        Err(err) => {
            let formatted_error = format!("{err:#?}");
            let graphql_error = match err {
                AuthError::Denied(_) => StandardGraphqlError::Forbidden(formatted_error),
                AuthError::InternalError(_) => StandardGraphqlError::InternalError(formatted_error),
            };
            return Err(graphql_error.extend());
        }
    };

    // invalided all tokens of the user on the server
    let user_id = user_auth.claims.sub;
    let mut service = TokenService::new(
        &auth_data.token_bucket,
        auth_data.auth_token_secret.as_bytes(),
        !is_develop(),
    );
    match service.logout(&user_id) {
        Ok(_) => {}
        Err(e) => {
            let formatted_error = format!("{e:#?}");
            let graphql_error = match e {
                service::token::JWTLogoutError::ConcurrencyLockError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };

    Ok(LogoutResponse::Response(Logout { user_id }))
}
