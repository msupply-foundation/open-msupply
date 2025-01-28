use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::encounter::{
    EncounterConnector, EncounterFilterInput, EncounterNode, EncounterSortInput,
};
use repository::{EncounterFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum EncounterResponse {
    Response(EncounterConnector),
}

/// Returns a list of encounters.
///
/// Deleted encounters are excluded from the returned list.
pub fn encounters(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<EncounterFilterInput>,
    sort: Option<EncounterSortInput>,
) -> Result<EncounterResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryEncounter,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    // Filter out deleted encounters
    // Note, in the future we could has an include_deleted filter flag, which skips the following
    // code block.
    let filter = if !filter
        .as_ref()
        .and_then(|f| f.include_deleted)
        .unwrap_or(false)
    {
        let mut filter = filter.map(EncounterFilter::from).unwrap_or_default();
        let mut status_filter = filter.status.unwrap_or_default();
        status_filter.not_equal_to = Some(repository::EncounterStatus::Deleted);
        filter.status = Some(status_filter);
        Some(filter)
    } else {
        filter.map(EncounterFilter::from)
    };

    let result = service_provider
        .encounter_service
        .encounters(
            &context,
            page.map(PaginationOption::from),
            filter,
            sort.map(EncounterSortInput::to_domain),
            allowed_ctx.clone(),
        )
        .map_err(StandardGraphqlError::from_list_error)?;
    let nodes = result
        .rows
        .into_iter()
        .map(|encounter| EncounterNode {
            store_id: store_id.clone(),
            encounter,
            allowed_ctx: allowed_ctx.clone(),
        })
        .collect();

    Ok(EncounterResponse::Response(EncounterConnector {
        total_count: result.count,
        nodes,
    }))
}
