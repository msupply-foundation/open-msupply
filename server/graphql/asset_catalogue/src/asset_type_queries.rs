use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::{
    asset_type::{AssetTypeFilter, AssetTypeSort, AssetTypeSortField},
    RepositoryError, StringFilter,
};
use repository::{EqualFilter, PaginationOption};
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::query_type::{get_asset_type, get_asset_types},
    ListError,
};

use crate::types::asset_type::{
    AssetTypeConnector, AssetTypeNode, AssetTypeResponse, AssetTypesResponse,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::asset_type::AssetTypeSortField")]
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

pub async fn asset_types(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<AssetTypeFilterInput>,
    sort: Option<Vec<AssetTypeSortInput>>,
) -> Result<AssetTypesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAsset,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let pagination = page.map(PaginationOption::from);
    let domain_filter = filter.map(|filter| filter.to_domain());
    let domain_sort = sort
        .and_then(|mut sort_list| sort_list.pop())
        .map(|sort| sort.to_domain());

    let types = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let connection = service_provider.connection()?;
        get_asset_types(&connection, pagination, domain_filter, domain_sort)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetTypesResponse::Response(
        AssetTypeConnector::from_domain(types),
    ))
}

pub async fn asset_type(ctx: &Context<'_>, id: String) -> Result<AssetTypeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAsset,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let category = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let connection = service_provider.connection()?;
        get_asset_type(&connection, id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

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
        AssetTypeSort {
            key: AssetTypeSortField::from(self.key),
            desc: self.desc,
        }
    }
}
