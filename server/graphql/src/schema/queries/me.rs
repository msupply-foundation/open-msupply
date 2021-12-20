use async_graphql::*;
use service::permission_validation::{Resource, ResourceAccessRequest};
use service::user_account::{UserAccount, UserAccountService};

use crate::standard_graphql_error::StandardGraphqlError;
use crate::ContextExt;

pub struct User {
    pub user: UserAccount,
}

#[Object]
impl User {
    /// Internal user id
    pub async fn user_id(&self) -> &str {
        &self.user.id
    }

    /// The user's email address
    pub async fn email(&self) -> &Option<String> {
        &self.user.email
    }
}

#[derive(Union)]
pub enum UserResponse {
    Response(User),
}

pub fn me(ctx: &Context<'_>) -> Result<UserResponse, StandardGraphqlError> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    let user = service_provider.validation_service.validate(
        &service_ctx,
        ctx.get_auth_data(),
        &ctx.get_auth_token(),
        &ResourceAccessRequest {
            resource: Resource::RouteMe,
            store_id: None,
        },
    )?;

    let user_service = UserAccountService::new(&service_ctx.connection);
    let user = match user_service.find_user(&user.user_id) {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Err(StandardGraphqlError::InternalError(
                "Can't find user account data".to_string(),
            ));
        }
        Err(err) => return Err(err.into()),
    };

    Ok(UserResponse::Response(User { user }))
}
