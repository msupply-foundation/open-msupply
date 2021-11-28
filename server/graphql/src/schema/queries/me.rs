use async_graphql::*;
use service::permission_validation::{
    Resource, ResourceAccessRequest, ValidationError, ValidationService,
};
use service::user_account::{UserAccount, UserAccountService};

use crate::schema::types::{AccessDenied, DatabaseError, InternalError};
use crate::schema::validation_denied_kind_to_string;
use crate::ContextExt;

use super::ErrorWrapper;

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

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UserErrorInterface {
    AccessDenied(AccessDenied),
    DatabaseError(DatabaseError),
    InternalError(InternalError),
}

pub type UserError = ErrorWrapper<UserErrorInterface>;

#[derive(Union)]
pub enum UserResponse {
    Error(UserError),
    Response(User),
}

pub fn me(ctx: &Context<'_>) -> UserResponse {
    let connection_manager = ctx.get_connection_manager();
    let con = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return UserResponse::Error(ErrorWrapper {
                error: UserErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    let service = ValidationService::new(&con);
    let resource_req = ResourceAccessRequest {
        resource: Resource::RouteMe,
        store_id: None,
    };
    let user = match service.validate(ctx.get_auth_data(), &ctx.get_auth_token(), &resource_req) {
        Ok(value) => value,
        Err(err) => {
            let error = match err {
                ValidationError::Denied(denied) => UserErrorInterface::AccessDenied(AccessDenied(
                    validation_denied_kind_to_string(denied),
                )),
                ValidationError::InternalError(err) => {
                    UserErrorInterface::InternalError(InternalError(err))
                }
            };
            return UserResponse::Error(ErrorWrapper { error });
        }
    };

    let user_service = UserAccountService::new(&con);
    let user = match user_service.find_user(&user.user_id) {
        Ok(Some(user)) => user,
        Ok(None) => {
            return UserResponse::Error(ErrorWrapper {
                error: UserErrorInterface::InternalError(InternalError(
                    "Can't find user account data".to_string(),
                )),
            })
        }
        Err(err) => {
            return UserResponse::Error(ErrorWrapper {
                error: UserErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };

    UserResponse::Response(User { user })
}
