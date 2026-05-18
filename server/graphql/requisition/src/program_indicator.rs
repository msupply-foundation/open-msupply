use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::program_indicator::{
    ProgramIndicatorConnector, ProgramIndicatorFilterInput, ProgramIndicatorNode,
    ProgramIndicatorResponse, ProgramIndicatorSortInput,
};
use repository::{Pagination, RepositoryError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    usize_to_u32,
};

pub async fn program_indicators(
    ctx: &Context<'_>,
    store_id: String,
    sort: Option<ProgramIndicatorSortInput>,
    filter: Option<ProgramIndicatorFilterInput>,
) -> Result<ProgramIndicatorResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRequisition,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let domain_sort = sort.map(ProgramIndicatorSortInput::to_domain);
    let domain_filter = filter.map(ProgramIndicatorFilterInput::to_domain);

    let nodes = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let context = service_provider.context(store_id, user.user_id)?;
        let nodes: Vec<ProgramIndicatorNode> = service_provider
            .program_indicator_service
            .program_indicators(
                &context.connection,
                Pagination::all(),
                domain_sort,
                domain_filter,
                true,
            )?
            .into_iter()
            .map(|program_indicator| ProgramIndicatorNode { program_indicator })
            .collect();
        Ok(nodes)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(ProgramIndicatorResponse::Response(
        ProgramIndicatorConnector {
            total_count: usize_to_u32(nodes.len()),
            nodes,
        },
    ))
}
