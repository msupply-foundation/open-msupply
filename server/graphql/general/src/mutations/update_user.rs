use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    login::LoginError,
    sync::sync_user::SyncUser,
};

use crate::queries::{
    FetchUserError, InvalidCredentials, LastSuccessfulUserSyncError,
    LastSuccessfulUserSyncErrorInterface, LastSuccessfulUserSyncNode,
    LastSuccessfulUserSyncResponse,
};

pub async fn update_user(ctx: &Context<'_>) -> Result<LastSuccessfulUserSyncResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ManualSync,
            store_id: None,
        },
    )?;
    let service_provider = ctx.service_provider();
    let auth_data = ctx.get_auth_data();

    let user = match SyncUser::update_user(&service_provider, auth_data, &user.user_id).await {
        Ok(user) => user,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = match error {
                LoginError::LoginFailure => {
                    return Ok(LastSuccessfulUserSyncResponse::Error(
                        LastSuccessfulUserSyncError {
                            error: LastSuccessfulUserSyncErrorInterface::InvalidCredentials(
                                InvalidCredentials {},
                            ),
                        },
                    ))
                }
                LoginError::FetchUserError(_) => {
                    return Ok(LastSuccessfulUserSyncResponse::Error(
                        LastSuccessfulUserSyncError {
                            error: LastSuccessfulUserSyncErrorInterface::FetchUserError(
                                FetchUserError {},
                            ),
                        },
                    ))
                }
                LoginError::UpdateUserError(_)
                | LoginError::InternalError(_)
                | LoginError::DatabaseError(_)
                | LoginError::FailedToGenerateToken(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };

    Ok(LastSuccessfulUserSyncResponse::Response(
        LastSuccessfulUserSyncNode {
            last_successful_sync: user.last_successful_sync,
        },
    ))
}
