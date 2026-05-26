use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use service::auth::{validate_auth, AuthError};

use super::clear_session_cookie;

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
    // Clear the session cookie up-front — even if something below fails the browser-side cookie
    // shouldn't linger.
    clear_session_cookie(ctx, auth_data);

    let token = ctx.get_auth_token();
    let user_auth = match validate_auth(auth_data, &token) {
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

    if let Some(token) = token {
        auth_data
            .session_store
            .write()
            .map_err(|e| {
                StandardGraphqlError::InternalError(format!("Session store lock poisoned: {e}"))
                    .extend()
            })?
            .revoke(&token);
    }

    Ok(LogoutResponse::Response(Logout {
        user_id: user_auth.user_id,
    }))
}
