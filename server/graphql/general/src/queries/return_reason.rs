use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::ReturnReasonConnector;
use service::auth::{Resource, ResourceAccessRequest};

use service::return_reason::get_return_reasons;

pub fn return_reasons(
    ctx: &Context<'_>,
    // TODO
    // page: Option<PaginationInput>,
    // filter: Option<ReturnReasonFilterInput>,
    // sort: Option<Vec<ReturnReasonSortInput>>,
) -> Result<ReturnReasonResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            // resource: Resource::QueryReturnReasons,
            resource: Resource::QueryInventoryAdjustmentReasons,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let items = get_return_reasons(
        &connection_manager,
        None,
        None,
        None,
        // TODO
        // page.map(PaginationOption::from),
        // filter.map(|filter| filter.to_domain()),
        // // Currently only one sort option is supported, use the first from the list.
        // sort.and_then(|mut sort_list| sort_list.pop())
        //     .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ReturnReasonResponse::Response(
        ReturnReasonConnector::from_domain(items),
    ))
}

#[derive(Union)]
pub enum ReturnReasonResponse {
    Response(ReturnReasonConnector),
}
