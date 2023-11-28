use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::program_enrolment::{
    ProgramEnrolmentConnector, ProgramEnrolmentFilterInput, ProgramEnrolmentNode,
    ProgramEnrolmentResponse, ProgramEnrolmentSortInput,
};
use repository::{Pagination, ProgramEnrolmentFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    usize_to_u32,
};

pub fn program_enrolments(
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
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let nodes: Vec<ProgramEnrolmentNode> = service_provider
        .program_enrolment_service
        .program_enrolments(
            &context,
            Pagination::all(),
            sort.map(ProgramEnrolmentSortInput::to_domain),
            filter.map(ProgramEnrolmentFilter::from),
            allowed_ctx.clone(),
        )?
        .into_iter()
        .map(|program_row| ProgramEnrolmentNode {
            store_id: store_id.clone(),
            program_enrolment: program_row,
            allowed_ctx: allowed_ctx.clone(),
        })
        .collect();

    Ok(ProgramEnrolmentResponse::Response(
        ProgramEnrolmentConnector {
            total_count: usize_to_u32(nodes.len()),
            nodes,
        },
    ))
}
