use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_pause::{set_sync_paused as set_sync_paused_service, SetSyncPausedError},
};

#[derive(SimpleObject)]
pub struct SyncPausedNode {
    pub is_paused: bool,
}

/// Pause or resume sync from Admin > Sync settings (server admin only). While paused the
/// synchroniser skips scheduled runs and `manualSync` refuses; on a central server this covers
/// its outbound sync to legacy central but not the sync API it serves to remotes (paused
/// separately with `setSyncApiPaused`). The
/// state persists across restarts and each change is written to the system log with the user.
/// Resuming is refused while maintenance mode is on.
pub fn set_sync_paused(ctx: &Context<'_>, paused: bool) -> Result<SyncPausedNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let is_paused =
        set_sync_paused_service(service_provider, &service_context, &user.user_id, paused)
            .map_err(|error| {
                let graphql_error = match error {
                    SetSyncPausedError::HeldByMaintenanceMode => {
                        StandardGraphqlError::BadUserInput("Held by maintenance mode".to_string())
                    }
                    SetSyncPausedError::DatabaseError(error) => {
                        StandardGraphqlError::InternalError(format!("{error:?}"))
                    }
                };
                graphql_error.extend()
            })?;

    Ok(SyncPausedNode { is_paused })
}

#[cfg(test)]
mod test {
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

    use crate::{GeneralMutations, GeneralQueries};

    #[actix_rt::test]
    async fn test_graphql_set_sync_paused_round_trip() {
        let (_, _, _, settings) = setup_graphql_test(
            GeneralQueries,
            GeneralMutations,
            "test_graphql_set_sync_paused_round_trip",
            MockDataInserts::none(),
        )
        .await;
        let variables: Option<serde_json::Value> = None;

        let is_paused = r#"query { isSyncPaused }"#;
        let pause = r#"mutation { setSyncPaused(paused: true) { isPaused } }"#;
        let resume = r#"mutation { setSyncPaused(paused: false) { isPaused } }"#;

        assert_graphql_query!(
            &settings,
            is_paused,
            &variables,
            &json!({ "isSyncPaused": false }),
            None
        );
        assert_graphql_query!(
            &settings,
            pause,
            &variables,
            &json!({ "setSyncPaused": { "isPaused": true } }),
            None
        );
        assert_graphql_query!(
            &settings,
            is_paused,
            &variables,
            &json!({ "isSyncPaused": true }),
            None
        );
        assert_graphql_query!(
            &settings,
            resume,
            &variables,
            &json!({ "setSyncPaused": { "isPaused": false } }),
            None
        );
        assert_graphql_query!(
            &settings,
            is_paused,
            &variables,
            &json!({ "isSyncPaused": false }),
            None
        );
    }
}
