use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_user::SyncUser,
};

pub struct LastSuccessfulUserSyncNode {
    pub last_successful_sync: NaiveDateTime,
}

#[Object]
impl LastSuccessfulUserSyncNode {
    pub async fn last_successful_sync(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.last_successful_sync, Utc)
    }
}

#[derive(Union)]
pub enum LastSuccessfulUserSyncResponse {
    Response(LastSuccessfulUserSyncNode),
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
