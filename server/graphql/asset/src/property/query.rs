use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::assets::asset_property::AssetPropertyFilter;
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::{AssetPropertiesResponse, AssetPropertyConnector, AssetPropertyFilterInput};

pub fn asset_properties(
    ctx: &Context<'_>,
    store_id: String,
    filter: Option<AssetPropertyFilterInput>,
) -> Result<AssetPropertiesResponse> {
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
        .get_asset_properties(
            &service_context.connection,
            filter.map(AssetPropertyFilter::from),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetPropertiesResponse::Response(
        AssetPropertyConnector::from_domain(assets),
    ))
}
