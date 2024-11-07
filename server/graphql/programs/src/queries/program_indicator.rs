use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::program_indicator::{
    ProgramIndicatorConnector, ProgramIndicatorFilterInput, ProgramIndicatorNode,
    ProgramIndicatorResponse, ProgramIndicatorSortInput,
};
use repository::{EqualFilter, Pagination, ProgramIndicatorFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    usize_to_u32,
};

pub fn program_indicators(
    ctx: &Context<'_>,
    store_id: String,
    sort: Option<ProgramIndicatorSortInput>,
    filter: Option<ProgramIndicatorFilterInput>,
) -> Result<ProgramIndicatorResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context(store_id.clone(), user.user_id)?;

    let nodes: Vec<ProgramIndicatorNode> = service_provider
        .program_indicator_service
        .program_indicators(
            &context.connection,
            Pagination::all(),
            sort.map(ProgramIndicatorSortInput::to_domain),
            filter.map(ProgramIndicatorFilterInput::to_domain),
        )?
        .into_iter()
        .map(|program_indicator| ProgramIndicatorNode { program_indicator })
        .collect();

    Ok(ProgramIndicatorResponse::Response(
        ProgramIndicatorConnector {
            total_count: usize_to_u32(nodes.len()),
            nodes,
        },
    ))
}

pub fn program_indicator(
    ctx: &Context<'_>,
    store_id: String,
    program_indicator_id: String,
) -> Result<Option<ProgramIndicatorNode>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context(store_id.clone(), user.user_id)?;

    let node = service_provider
        .program_indicator_service
        .program_indicator(
            &context.connection,
            ProgramIndicatorFilter::new().id(EqualFilter::equal_to(&program_indicator_id)),
        )?
        .map(|program_indicator| ProgramIndicatorNode { program_indicator });

    Ok(node)
}
