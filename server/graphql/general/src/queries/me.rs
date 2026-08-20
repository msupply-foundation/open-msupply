use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::UserNode;
use service::auth::{Resource, ResourceAccessRequest};
use service::user_account::UserAccountService;

#[derive(Union)]
pub enum UserResponse {
    Response(UserNode),
}

pub fn me(ctx: &Context<'_>) -> Result<UserResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::RouteMe,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context("".to_string(), user.user_id.clone())?;
    let user_service = UserAccountService::new(&service_ctx.connection);
    // Deliberately the password-agnostic lookup. By the time this runs the session already proves
    // the user authenticated — re-checking that they hold an mSupply password answers nothing, and
    // an SSO-only account may hold none at all (see `service::oidc`), which used to seat a valid
    // session whose very first `me` then failed with "Can't find user account data". The password
    // login is unaffected: it cannot produce a session for an account with an empty hash.
    let user = match user_service.find_user_on_this_site(&user.user_id) {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Err(StandardGraphqlError::InternalError(
                "Can't find user account data".to_string(),
            )
            .extend());
        }
        Err(err) => return Err(err.into()),
    };

    Ok(UserResponse::Response(UserNode::from_domain(user)))
}
