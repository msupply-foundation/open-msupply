use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    AssetTypeConnector, AssetTypeNode, AssetTypeResponse, AssetTypesResponse,
};

use repository::{
    asset_type::{AssetTypeFilter, AssetTypeSort, AssetTypeSortField},
    StringFilter,
};
use repository::{EqualFilter, PaginationOption};
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::query_type::{get_asset_type, get_asset_types},
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::asset_type::AssetTypeSortField")]
#[graphql(rename_items = "camelCase")]

pub enum AssetTypeSortFieldInput {
    Name,
}

#[derive(InputObject)]
pub struct AssetTypeSortInput {
    key: AssetTypeSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct AssetTypeFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub category_id: Option<EqualFilterStringInput>,
}

impl From<AssetTypeFilterInput> for AssetTypeFilter {
    fn from(f: AssetTypeFilterInput) -> Self {
        AssetTypeFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
            category_id: f.category_id.map(EqualFilter::from),
        }
    }
}

pub fn asset_types(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<AssetTypeFilterInput>,
    sort: Option<Vec<AssetTypeSortInput>>,
) -> Result<AssetTypesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAssetCatalogueItem,
            store_id: None,
        },
    )?;
    let connection_manager = ctx.get_connection_manager().connection()?;
    let categories = get_asset_types(
        &connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetTypesResponse::Response(
        AssetTypeConnector::from_domain(categories),
    ))
}

pub fn asset_type(ctx: &Context<'_>, id: String) -> Result<AssetTypeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAssetCatalogueItem,
            store_id: None,
        },
    )?;
    let connection_manager = ctx.get_connection_manager().connection()?;
    let category = get_asset_type(&connection_manager, id)?;

    let response = match category {
        Some(category) => AssetTypeResponse::Response(AssetTypeNode::from_domain(category)),
        None => AssetTypeResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };
    Ok(response)
}

impl AssetTypeFilterInput {
    pub fn to_domain(self) -> AssetTypeFilter {
        let AssetTypeFilterInput {
            id,
            name,
            category_id,
        } = self;
        AssetTypeFilter {
            id: id.map(EqualFilter::from),
            name: name.map(StringFilter::from),
            category_id: category_id.map(EqualFilter::from),
        }
    }
}

impl AssetTypeSortInput {
    pub fn to_domain(self) -> AssetTypeSort {
        use AssetTypeSortField as to;
        use AssetTypeSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
        };

        AssetTypeSort {
            key,
            desc: self.desc,
        }
    }
}
