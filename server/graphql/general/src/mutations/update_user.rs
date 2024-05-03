use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{
    simple_generic_errors::ConnectionError,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    login::{FetchUserError, LoginError, LoginFailure, UpdateUserError as LoginUpdateUserError},
    sync::sync_user::SyncUser,
};

use crate::{InvalidCredentials, MissingCredentials};

pub struct UpdateUserNode {
    pub last_successful_sync: Option<NaiveDateTime>,
}

#[Object]
impl UpdateUserNode {
    pub async fn last_successful_sync(&self) -> Option<DateTime<Utc>> {
        self.last_successful_sync
            .map(|time| DateTime::<Utc>::from_naive_utc_and_offset(time, Utc))
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateUserErrorInterface {
    ConnectionError(ConnectionError),
    InvalidCredentials(InvalidCredentials),
    MissingCredentials(MissingCredentials),
}

#[derive(SimpleObject)]
pub struct UpdateUserError {
    pub error: UpdateUserErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateUserResponse")]
pub enum UpdateResponse {
    Response(UpdateUserNode),
    Error(UpdateUserError),
}

pub async fn update_user(ctx: &Context<'_>) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ManualSync,
            store_id: None,
        },
    )?;
    let service_provider = ctx.service_provider();
    let auth_data = ctx.get_auth_data();

    let user = match SyncUser::update_user(service_provider, auth_data, &user.user_id).await {
        Ok(user) => user,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = match error {
                LoginError::FetchUserError(FetchUserError::ConnectionError(_)) => {
                    return Ok(UpdateResponse::Error(UpdateUserError {
                        error: UpdateUserErrorInterface::ConnectionError(ConnectionError),
                    }))
                }
                LoginError::LoginFailure(LoginFailure::InvalidCredentials) => {
                    return Ok(UpdateResponse::Error(UpdateUserError {
                        error: UpdateUserErrorInterface::InvalidCredentials(InvalidCredentials),
                    }))
                }
                LoginError::UpdateUserError(LoginUpdateUserError::MissingCredentials) => {
                    return Ok(UpdateResponse::Error(UpdateUserError {
                        error: UpdateUserErrorInterface::MissingCredentials(MissingCredentials),
                    }));
                }
                LoginError::FetchUserError(_)
                | LoginError::UpdateUserError(_)
                | LoginError::LoginFailure(LoginFailure::AccountBlocked(_))
                | LoginError::InternalError(_)
                | LoginError::DatabaseError(_)
                | LoginError::FailedToGenerateToken(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };

    Ok(UpdateResponse::Response(UpdateUserNode {
        last_successful_sync: user.last_successful_sync,
    }))
}
