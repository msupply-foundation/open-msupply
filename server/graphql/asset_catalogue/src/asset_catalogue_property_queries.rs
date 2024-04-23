use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::asset_catalogue_property::AssetCataloguePropertyFilter;
use repository::EqualFilter;
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::query_catalogue_property::get_asset_catalogue_properties,
};

use crate::types::asset_catalogue_property::{
    AssetCataloguePropertyConnector, AssetCataloguePropertyResponse,
};

#[derive(InputObject, Clone)]
pub struct AssetCataloguePropertyFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub category_id: Option<EqualFilterStringInput>,
}

impl From<AssetCataloguePropertyFilterInput> for AssetCataloguePropertyFilter {
    fn from(f: AssetCataloguePropertyFilterInput) -> Self {
        AssetCataloguePropertyFilter {
            id: f.id.map(EqualFilter::from),
            category_id: f.category_id.map(EqualFilter::from),
        }
    }
}

pub fn asset_catalogue_properties(
    ctx: &Context<'_>,
    filter: Option<AssetCataloguePropertyFilterInput>,
) -> Result<AssetCataloguePropertyResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAsset,
            store_id: None,
        },
    )?;
    let connection_manager = ctx.get_connection_manager().connection()?;
    let categories = get_asset_catalogue_properties(
        &connection_manager,
        filter.map(|filter| filter.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetCataloguePropertyResponse::Response(
        AssetCataloguePropertyConnector::from_domain(categories),
    ))
}

impl AssetCataloguePropertyFilterInput {
    pub fn to_domain(self) -> AssetCataloguePropertyFilter {
        let AssetCataloguePropertyFilterInput { id, category_id } = self;
        AssetCataloguePropertyFilter {
            id: id.map(EqualFilter::from),
            category_id: category_id.map(EqualFilter::from),
        }
    }
}
