use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::encounter::{
    EncounterConnector, EncounterFilterInput, EncounterNode, EncounterSortInput,
};
use repository::PaginationOption;
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum EncounterResponse {
    Response(EncounterConnector),
}

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
    let allowed_ctx = user.capabilities(CapabilityTag::ContextType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let result = service_provider
        .encounter_service
        .encounters(
            &context,
            page.map(PaginationOption::from),
            filter.map(|f| f.to_domain_filter()),
            sort.map(EncounterSortInput::to_domain),
            allowed_ctx.clone(),
        )
        .map_err(StandardGraphqlError::from_list_error)?;
    let nodes = result
        .rows
        .into_iter()
        .map(|encounter_row| EncounterNode {
            store_id: store_id.clone(),
            encounter_row,
            allowed_ctx: allowed_ctx.clone(),
        })
        .collect();

    Ok(EncounterResponse::Response(EncounterConnector {
        total_count: result.count,
        nodes,
    }))
}
