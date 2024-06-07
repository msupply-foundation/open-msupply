use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::{PaginationOption, ProgramFilter};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::program::{
    ProgramConnector, ProgramFilterInput, ProgramSortInput, ProgramsResponse,
};

pub fn programs(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ProgramFilterInput>,
    sort: Option<ProgramSortInput>,
) -> Result<ProgramsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.context(store_id, user.user_id)?;

    let list_result = service_provider
        .program_service
        .get_programs(
            &context.connection,
            page.map(PaginationOption::from),
            filter.map(ProgramFilter::from),
            sort.map(ProgramSortInput::to_domain),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ProgramsResponse::Response(ProgramConnector::from_domain(
        list_result,
    )))
}
