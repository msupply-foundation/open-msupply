use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_user::SyncUser,
};

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

pub fn last_successful_user_sync(ctx: &Context<'_>) -> Result<UpdateUserNode> {
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

    Ok(UpdateUserNode {
        last_successful_sync,
    })
}
