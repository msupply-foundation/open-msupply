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
    // Clear the session cookie up-front — even if validation below fails the browser-side cookie
    // shouldn't linger.
    clear_session_cookie(ctx, auth_data);

    let token = ctx.get_auth_token();

    // "Logout of an already-dead session" isn't an auth failure — it's a no-op. Validate softly
    // and fall back to a synthetic user id rather than returning a Forbidden response. Only an
    // honest internal error (e.g. lock poisoned) should bubble up.
    let user_id = match validate_auth(auth_data, &token) {
        Ok(validated) => validated.user_id,
        Err(AuthError::Denied(_)) => String::new(),
        Err(err @ AuthError::InternalError(_)) => {
            return Err(StandardGraphqlError::InternalError(format!("{err:#?}")).extend());
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

    Ok(LogoutResponse::Response(Logout { user_id }))
}
