use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::period_schedule::{PeriodSchedulesConnector, PeriodSchedulesResponse};
use graphql_types::types::PeriodFilterInput;
use service::auth::{Resource, ResourceAccessRequest};
use service::period_schedule::get_period_schedules;

pub fn period_schedules(
    ctx: &Context<'_>,
    store_id: String,
    period_filter: Option<PeriodFilterInput>,
) -> Result<PeriodSchedulesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryMasterList,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = get_period_schedules(
        &context,
        &store_id,
        period_filter.map(PeriodFilterInput::to_domain),
    )
    .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(PeriodSchedulesResponse::Response(
        PeriodSchedulesConnector::from_domain(result),
    ))
}
