use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::{assets::asset_log::AssetLogFilter, PaginationOption};
use service::{
    auth::{Resource, ResourceAccessRequest},
    ListError,
};

use crate::types::{AssetLogConnector, AssetLogFilterInput, AssetLogSortInput, AssetLogsResponse};

pub async fn asset_logs(
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

    let service_provider = ctx.service_provider_data();
    let pagination = page.map(PaginationOption::from);
    let domain_filter = filter.map(AssetLogFilter::from);
    // Currently only one sort option is supported, use the first from the list.
    let domain_sort = sort
        .and_then(|mut sort_list| sort_list.pop())
        .map(|sort| sort.to_domain());

    let assets = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;
        service_provider.asset_service.get_asset_logs(
            &service_context.connection,
            pagination,
            domain_filter,
            domain_sort,
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetLogsResponse::Response(AssetLogConnector::from_domain(
        assets,
    )))
}
