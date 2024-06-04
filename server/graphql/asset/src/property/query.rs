use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use repository::assets::asset_property::AssetPropertyFilter;

use crate::types::{AssetPropertiesResponse, AssetPropertyConnector, AssetPropertyFilterInput};

pub fn asset_properties(
    ctx: &Context<'_>,
    filter: Option<AssetPropertyFilterInput>,
) -> Result<AssetPropertiesResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let assets = service_provider
        .asset_service
        .get_asset_properties(
            &service_context.connection,
            filter.map(AssetPropertyFilter::from),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetPropertiesResponse::Response(
        AssetPropertyConnector::from_domain(assets),
    ))
}
