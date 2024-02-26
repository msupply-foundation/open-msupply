use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::{
    AssetClassConnector, AssetClassNode, AssetClassResponse, AssetClassesResponse,
};

use repository::asset_class::{AssetClassFilter, AssetClassSort, AssetClassSortField};
use repository::{EqualFilter, PaginationOption, StringFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::query_class::{get_asset_class, get_asset_classes},
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::asset_class::AssetClassSortField")]
#[graphql(rename_items = "camelCase")]

pub enum AssetClassSortFieldInput {
    Name,
}

#[derive(InputObject)]
pub struct AssetClassSortInput {
    key: AssetClassSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct AssetClassFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
}

impl From<AssetClassFilterInput> for AssetClassFilter {
    fn from(f: AssetClassFilterInput) -> Self {
        AssetClassFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
        }
    }
}

pub fn asset_classes(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<AssetClassFilterInput>,
    sort: Option<Vec<AssetClassSortInput>>,
) -> Result<AssetClassesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAssetCatalogueItem,
            store_id: None,
        },
    )?;
    let connection_manager = ctx.get_connection_manager().connection()?;
    let classes = get_asset_classes(
        &connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetClassesResponse::Response(
        AssetClassConnector::from_domain(classes),
    ))
}

pub fn asset_class(ctx: &Context<'_>, id: String) -> Result<AssetClassResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAssetCatalogueItem,
            store_id: None,
        },
    )?;
    let connection_manager = ctx.get_connection_manager().connection()?;
    let class = get_asset_class(&connection_manager, id)?;

    let response = match class {
        Some(class) => AssetClassResponse::Response(AssetClassNode::from_domain(class)),
        None => AssetClassResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };
    Ok(response)
}

impl AssetClassFilterInput {
    pub fn to_domain(self) -> AssetClassFilter {
        let AssetClassFilterInput { id, name } = self;

        AssetClassFilter {
            id: id.map(EqualFilter::from),
            name: name.map(StringFilter::from),
        }
    }
}

impl AssetClassSortInput {
    pub fn to_domain(self) -> AssetClassSort {
        use AssetClassSortField as to;
        use AssetClassSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
        };

        AssetClassSort {
            key,
            desc: self.desc,
        }
    }
}
