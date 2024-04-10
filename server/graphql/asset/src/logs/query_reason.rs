use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::{assets::asset_log_reason::AssetLogReasonFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::{
    AssetLogReasonConnector, AssetLogReasonFilterInput, AssetLogReasonSortInput,
    AssetLogReasonsResponse,
};

pub fn asset_log_reasons(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<AssetLogReasonFilterInput>,
    sort: Option<Vec<AssetLogReasonSortInput>>,
) -> Result<AssetLogReasonsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAsset,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let asset_reasons = service_provider
        .asset_service
        .get_asset_log_reasons(
            &service_context.connection,
            page.map(PaginationOption::from),
            filter.map(AssetLogReasonFilter::from),
            // Currently only one sort option is supported, use the first from the list.
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetLogReasonsResponse::Response(
        AssetLogReasonConnector::from_domain(asset_reasons),
    ))
}
