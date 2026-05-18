use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::asset_class::{AssetClassFilter, AssetClassSort, AssetClassSortField};
use repository::{EqualFilter, PaginationOption, RepositoryError, StringFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::query_class::{get_asset_class, get_asset_classes},
    ListError,
};

use crate::types::asset_class::{
    AssetClassConnector, AssetClassNode, AssetClassResponse, AssetClassesResponse,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::asset_class::AssetClassSortField")]
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

pub async fn asset_classes(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<AssetClassFilterInput>,
    sort: Option<Vec<AssetClassSortInput>>,
) -> Result<AssetClassesResponse> {
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

    let classes = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let connection = service_provider.connection()?;
        get_asset_classes(&connection, pagination, domain_filter, domain_sort)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetClassesResponse::Response(
        AssetClassConnector::from_domain(classes),
    ))
}

pub async fn asset_class(ctx: &Context<'_>, id: String) -> Result<AssetClassResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAsset,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let class = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let connection = service_provider.connection()?;
        get_asset_class(&connection, id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

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
        AssetClassSort {
            key: AssetClassSortField::from(self.key),
            desc: self.desc,
        }
    }
}
