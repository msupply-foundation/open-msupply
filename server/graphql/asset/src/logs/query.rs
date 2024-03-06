use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::{assets::asset_log::AssetLogFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::{AssetLogConnector, AssetLogFilterInput, AssetLogSortInput, AssetLogsResponse};

pub fn asset_logs(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<AssetLogFilterInput>,
    sort: Option<Vec<AssetLogSortInput>>,
) -> Result<AssetLogsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAsset,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let assets = service_provider
        .asset_service
        .get_asset_logs(
            &service_context.connection,
            page.map(PaginationOption::from),
            filter.map(AssetLogFilter::from),
            // Currently only one sort option is supported, use the first from the list.
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetLogsResponse::Response(AssetLogConnector::from_domain(
        assets,
    )))
}
