use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::program_enrolment::{
    ProgramEnrolmentConnector, ProgramEnrolmentFilterInput, ProgramEnrolmentNode,
    ProgramEnrolmentResponse, ProgramEnrolmentSortInput,
};
use repository::{Pagination, ProgramEnrolmentFilter, RepositoryError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    usize_to_u32,
};

pub async fn program_enrolments(
    ctx: &Context<'_>,
    store_id: String,
    sort: Option<ProgramEnrolmentSortInput>,
    filter: Option<ProgramEnrolmentFilterInput>,
) -> Result<ProgramEnrolmentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();

    let nodes = tokio::task::spawn_blocking(
        move || -> Result<Vec<ProgramEnrolmentNode>, RepositoryError> {
            let context = service_provider.basic_context()?;
            let rows = service_provider
                .program_enrolment_service
                .program_enrolments(
                    &context,
                    Pagination::all(),
                    sort.map(ProgramEnrolmentSortInput::to_domain),
                    filter.map(ProgramEnrolmentFilter::from),
                    allowed_ctx.clone(),
                )?;
            Ok(rows
                .into_iter()
                .map(|program_row| ProgramEnrolmentNode {
                    store_id: store_id.clone(),
                    program_enrolment: program_row,
                    allowed_ctx: allowed_ctx.clone(),
                })
                .collect())
        },
    )
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(ProgramEnrolmentResponse::Response(
        ProgramEnrolmentConnector {
            total_count: usize_to_u32(nodes.len()),
            nodes,
        },
    ))
}
