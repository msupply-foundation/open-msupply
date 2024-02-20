use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{
    simple_generic_errors::ConnectionError,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    login::{FetchUserError, LoginError, LoginFailure},
    sync::sync_user::SyncUser,
};

pub struct UpdateUserNode {
    pub last_successful_sync: NaiveDateTime,
}

#[Object]
impl UpdateUserNode {
    pub async fn last_successful_sync(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.last_successful_sync, Utc)
    }
}

#[derive(Union)]
#[graphql(name = "UpdateUserResponse")]
pub enum UpdateResponse {
    Response(UpdateUserNode),
    ConnectionError(ConnectionError),
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

    let user = match SyncUser::update_user(&service_provider, auth_data, &user.user_id).await {
        Ok(user) => user,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = match error {
                LoginError::FetchUserError(FetchUserError::ConnectionError(_)) => {
                    return Ok(UpdateResponse::ConnectionError(ConnectionError))
                }
                LoginError::FetchUserError(_)
                | LoginError::UpdateUserError(_)
                | LoginError::LoginFailure(LoginFailure::InvalidCredentials)
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
