use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_status::status::InitialisationStatus,
};

pub async fn manual_sync(
    ctx: &Context<'_>,
    with_auth: bool,
    fetch_patient_id: Option<String>,
) -> Result<String> {
    if with_auth {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::ManualSync,
                store_id: None,
            },
        )?;
    }

    let service_provider = ctx.service_provider_data();

    // Only the DB-touching status check is wrapped; the actual sync trigger is
    // a non-DB signal call.
    let service_provider_for_status = service_provider.clone();
    let initialisation_status =
        tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
            let service_context = service_provider_for_status.basic_context()?;
            service_provider_for_status
                .sync_status_service
                .get_initialisation_status(&service_context)
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_repository_error)?;

    if initialisation_status == InitialisationStatus::PreInitialisation {
        return Err(StandardGraphqlError::BadUserInput(
            "Cannot trigger sync in pre initialisation state".to_string(),
        )
        .extend());
    };

    service_provider.sync_trigger.trigger(fetch_patient_id);

    Ok("Sync triggered".to_string())
}
