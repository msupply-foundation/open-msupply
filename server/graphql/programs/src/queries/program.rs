use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::{PeriodConnector, PeriodFilterInput, PeriodsResponse};
use repository::{PaginationOption, ProgramFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    program::query::get_periods,
    ListError,
};

use crate::types::program::{
    ProgramConnector, ProgramFilterInput, ProgramSortInput, ProgramsResponse,
};

pub async fn programs(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ProgramFilterInput>,
    sort: Option<ProgramSortInput>,
) -> Result<ProgramsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryMasterList,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider_data();

    let list_result = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let context = service_provider.context(store_id, user.user_id)?;
        service_provider.program_service.get_programs(
            &context.connection,
            page.map(PaginationOption::from),
            filter.map(ProgramFilter::from),
            sort.map(ProgramSortInput::to_domain),
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ProgramsResponse::Response(ProgramConnector::from_domain(
        list_result,
    )))
}

pub async fn periods(
    ctx: &Context<'_>,
    store_id: String,
    program_id: Option<String>,
    page: Option<PaginationInput>,
    filter: Option<PeriodFilterInput>,
) -> Result<PeriodsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryMasterList,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider_data();

    let result = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let context = service_provider.basic_context()?;
        get_periods(
            &context.connection,
            store_id,
            program_id,
            page.map(PaginationOption::from),
            filter.map(|f| f.to_domain()),
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(PeriodsResponse::Response(PeriodConnector::from_domain(
        result,
    )))
}
