use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use repository::asset_category::{AssetCategoryFilter, AssetCategorySort, AssetCategorySortField};
use repository::{EqualFilter, PaginationOption, RepositoryError, StringFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::query_category::{get_asset_categories, get_asset_category},
    ListError,
};

use crate::types::asset_category::{
    AssetCategoriesResponse, AssetCategoryConnector, AssetCategoryNode, AssetCategoryResponse,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::asset_category::AssetCategorySortField")]
pub enum AssetCategorySortFieldInput {
    Name,
}

#[derive(InputObject)]
pub struct AssetCategorySortInput {
    key: AssetCategorySortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct AssetCategoryFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub class_id: Option<EqualFilterStringInput>,
}

impl From<AssetCategoryFilterInput> for AssetCategoryFilter {
    fn from(f: AssetCategoryFilterInput) -> Self {
        AssetCategoryFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
            class_id: f.class_id.map(EqualFilter::from),
        }
    }
}

pub async fn asset_categories(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<AssetCategoryFilterInput>,
    sort: Option<Vec<AssetCategorySortInput>>,
) -> Result<AssetCategoriesResponse> {
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

    let categories = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let connection = service_provider.connection()?;
        get_asset_categories(&connection, pagination, domain_filter, domain_sort)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetCategoriesResponse::Response(
        AssetCategoryConnector::from_domain(categories),
    ))
}

pub async fn asset_category(ctx: &Context<'_>, id: String) -> Result<AssetCategoryResponse> {
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
        get_asset_category(&connection, id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    let response = match category {
        Some(category) => AssetCategoryResponse::Response(AssetCategoryNode::from_domain(category)),
        None => AssetCategoryResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };
    Ok(response)
}

impl AssetCategoryFilterInput {
    pub fn to_domain(self) -> AssetCategoryFilter {
        let AssetCategoryFilterInput { id, name, class_id } = self;

        AssetCategoryFilter {
            id: id.map(EqualFilter::from),
            name: name.map(StringFilter::from),
            class_id: class_id.map(EqualFilter::from),
        }
    }
}

impl AssetCategorySortInput {
    pub fn to_domain(self) -> AssetCategorySort {
        AssetCategorySort {
            key: AssetCategorySortField::from(self.key),
            desc: self.desc,
        }
    }
}
