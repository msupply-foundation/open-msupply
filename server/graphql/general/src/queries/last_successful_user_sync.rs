use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError},
    standard_graphql_error::validate_auth,
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_user::SyncUser,
};

use super::InvalidCredentials;

pub struct LastSuccessfulUserSyncNode {
    pub last_successful_sync: NaiveDateTime,
}

#[Object]
impl LastSuccessfulUserSyncNode {
    pub async fn last_successful_sync(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.last_successful_sync, Utc)
    }
}

pub struct FetchUserError;
#[Object]
impl FetchUserError {
    pub async fn description(&self) -> &'static str {
        "Failed to connect and fetch user from server."
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum LastSuccessfulUserSyncErrorInterface {
    InvalidCredentials(InvalidCredentials),
    FetchUserError(FetchUserError),
    DatabaseError(DatabaseError),
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct LastSuccessfulUserSyncError {
    pub error: LastSuccessfulUserSyncErrorInterface,
}

#[derive(Union)]
pub enum LastSuccessfulUserSyncResponse {
    Response(LastSuccessfulUserSyncNode),
    Error(LastSuccessfulUserSyncError),
}

pub fn last_successful_user_sync(ctx: &Context<'_>) -> Result<LastSuccessfulUserSyncResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::SyncInfo,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();

    let last_successful_sync =
        SyncUser::get_latest_successful_user_sync(service_provider, &user.user_id)?;

    Ok(LastSuccessfulUserSyncResponse::Response(
        LastSuccessfulUserSyncNode {
            last_successful_sync,
        },
    ))
}
