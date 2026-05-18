use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::asset_catalogue_item::{
    AssetCatalogueItemFilter, AssetCatalogueItemSort, AssetCatalogueItemSortField,
};
use repository::{EqualFilter, PaginationOption, RepositoryError, StringFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::query_catalogue_item::{get_asset_catalogue_item, get_asset_catalogue_items},
    ListError,
};

use crate::types::asset_catalogue_item::{
    AssetCatalogueItemConnector, AssetCatalogueItemNode, AssetCatalogueItemResponse,
    AssetCatalogueItemsResponse,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::asset_catalogue_item::AssetCatalogueItemSortField")]
pub enum AssetCatalogueItemSortFieldInput {
    Catalogue,
    Code,
    Manufacturer,
    Model,
}

#[derive(InputObject)]

pub struct AssetCatalogueItemSortInput {
    key: AssetCatalogueItemSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]

pub struct AssetCatalogueItemFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub category: Option<StringFilterInput>,
    pub category_id: Option<EqualFilterStringInput>,
    pub class: Option<StringFilterInput>,
    pub class_id: Option<EqualFilterStringInput>,
    pub code: Option<StringFilterInput>,
    pub manufacturer: Option<StringFilterInput>,
    pub model: Option<StringFilterInput>,
    pub r#type: Option<StringFilterInput>,
    pub type_id: Option<EqualFilterStringInput>,
    pub search: Option<StringFilterInput>,
    pub sub_catalogue: Option<StringFilterInput>,
}

impl From<AssetCatalogueItemFilterInput> for AssetCatalogueItemFilter {
    fn from(f: AssetCatalogueItemFilterInput) -> Self {
        AssetCatalogueItemFilter {
            id: f.id.map(EqualFilter::from),
            category_id: f.category_id.map(EqualFilter::from),
            category: f.category.map(StringFilter::from),
            class: f.class.map(StringFilter::from),
            class_id: f.class_id.map(EqualFilter::from),
            code: f.code.map(StringFilter::from),
            manufacturer: f.manufacturer.map(StringFilter::from),
            model: f.model.map(StringFilter::from),
            r#type: f.r#type.map(StringFilter::from),
            type_id: f.type_id.map(EqualFilter::from),
            search: f.search.map(StringFilter::from),
            sub_catalogue: f.sub_catalogue.map(StringFilter::from),
        }
    }
}

pub async fn asset_catalogue_items(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<AssetCatalogueItemFilterInput>,
    sort: Option<Vec<AssetCatalogueItemSortInput>>,
) -> Result<AssetCatalogueItemsResponse> {
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

    let items = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let connection = service_provider.connection()?;
        get_asset_catalogue_items(&connection, pagination, domain_filter, domain_sort)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetCatalogueItemsResponse::Response(
        AssetCatalogueItemConnector::from_domain(items),
    ))
}

pub async fn asset_catalogue_item(
    ctx: &Context<'_>,
    id: String,
) -> Result<AssetCatalogueItemResponse> {
    let service_provider = ctx.service_provider_data();

    let item = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let connection = service_provider.connection()?;
        get_asset_catalogue_item(&connection, id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    let response = match item {
        Some(item) => {
            AssetCatalogueItemResponse::Response(AssetCatalogueItemNode::from_domain(item))
        }
        None => AssetCatalogueItemResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };
    Ok(response)
}

impl AssetCatalogueItemFilterInput {
    pub fn to_domain(self) -> AssetCatalogueItemFilter {
        let AssetCatalogueItemFilterInput {
            id,
            category,
            category_id,
            class,
            class_id,
            code,
            manufacturer,
            model,
            r#type,
            type_id,
            search,
            sub_catalogue,
        } = self;

        AssetCatalogueItemFilter {
            id: id.map(EqualFilter::from),
            category: category.map(StringFilter::from),
            category_id: category_id.map(EqualFilter::from),
            class: class.map(StringFilter::from),
            class_id: class_id.map(EqualFilter::from),
            code: code.map(StringFilter::from),
            manufacturer: manufacturer.map(StringFilter::from),
            model: model.map(StringFilter::from),
            r#type: r#type.map(StringFilter::from),
            type_id: type_id.map(EqualFilter::from),
            search: search.map(StringFilter::from),
            sub_catalogue: sub_catalogue.map(StringFilter::from),
        }
    }
}

impl AssetCatalogueItemSortInput {
    pub fn to_domain(self) -> AssetCatalogueItemSort {
        AssetCatalogueItemSort {
            key: AssetCatalogueItemSortField::from(self.key),
            desc: self.desc,
        }
    }
}
