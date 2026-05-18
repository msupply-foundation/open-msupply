use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use repository::assets::asset_property::AssetPropertyFilter;
use service::ListError;

use crate::types::{AssetPropertiesResponse, AssetPropertyConnector, AssetPropertyFilterInput};

pub async fn asset_properties(
    ctx: &Context<'_>,
    filter: Option<AssetPropertyFilterInput>,
) -> Result<AssetPropertiesResponse> {
    let service_provider = ctx.service_provider_data();
    let domain_filter = filter.map(AssetPropertyFilter::from);

    let assets = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let service_context = service_provider.basic_context()?;
        service_provider
            .asset_service
            .get_asset_properties(&service_context.connection, domain_filter)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetPropertiesResponse::Response(
        AssetPropertyConnector::from_domain(assets),
    ))
}
