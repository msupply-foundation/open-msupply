use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::period_schedule::{
    PeriodScheduleFilterInput, PeriodScheduleConnector, PeriodScheduleResponse,
};
use service::auth::{Resource, ResourceAccessRequest};
use service::period_schedule::get_period_schedules;

pub fn period_schedules(
    ctx: &Context<'_>,
    store_id: String,
    filter: Option<PeriodScheduleFilterInput>,
) -> Result<PeriodScheduleResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryMasterList,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let result = get_period_schedules(
        &context.connection,
        filter.map(PeriodScheduleFilterInput::to_domain),
    )
    .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(PeriodScheduleResponse::Response(
        PeriodScheduleConnector::from_domain(result),
    ))
}
