use async_graphql::*;
use service::permission_validation::{
    has_api_role, validate, validation_denied_kind_to_string, ValidationError,
};
use service::user_account::{UserAccount, UserAccountService};

use crate::schema::types::{AccessDenied, DatabaseError, InternalError};
use crate::ContextExt;

use super::ErrorWrapper;

pub struct Me {
    pub user: UserAccount,
}

#[Object]
impl Me {
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
pub enum MeErrorInterface {
    AccessDenied(AccessDenied),
    DatabaseError(DatabaseError),
    InternalError(InternalError),
}

pub type MeError = ErrorWrapper<MeErrorInterface>;

#[derive(Union)]
pub enum MeResponse {
    Error(MeError),
    Response(Me),
}

pub fn me(ctx: &Context<'_>) -> MeResponse {
    let user = match validate(
        ctx.get_connection_manager(),
        ctx.get_auth_data(),
        &ctx.get_auth_token(),
        vec![has_api_role(service::permissions::ApiRole::User)],
    ) {
        Ok(value) => value,
        Err(err) => {
            let error = match err {
                ValidationError::Denied(denied) => MeErrorInterface::AccessDenied(AccessDenied(
                    validation_denied_kind_to_string(denied),
                )),
                ValidationError::InternalError(err) => {
                    MeErrorInterface::InternalError(InternalError(err))
                }
            };
            return MeResponse::Error(ErrorWrapper { error });
        }
    };

    let user_service = UserAccountService::new(&user.connection);
    let user = match user_service.find_user(&user.user_id) {
        Ok(Some(user)) => user,
        Ok(None) => {
            return MeResponse::Error(ErrorWrapper {
                error: MeErrorInterface::InternalError(InternalError(
                    "Can't find user account data".to_string(),
                )),
            })
        }
        Err(err) => {
            return MeResponse::Error(ErrorWrapper {
                error: MeErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };

    MeResponse::Response(Me { user })
}
