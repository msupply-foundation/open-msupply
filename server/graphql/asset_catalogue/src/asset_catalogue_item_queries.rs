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
use repository::{EqualFilter, PaginationOption, StringFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::query_catalogue_item::{get_asset_catalogue_item, get_asset_catalogue_items},
};

use crate::types::asset_catalogue_item::{
    AssetCatalogueItemConnector, AssetCatalogueItemNode, AssetCatalogueItemResponse,
    AssetCatalogueItemsResponse,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::asset_catalogue_item::AssetCatalogueItemSortField")]
#[graphql(rename_items = "camelCase")]

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
    pub code_manufacturer_model_type: Option<StringFilterInput>,
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
            code_manufacturer_model_type: f.code_manufacturer_model_type.map(StringFilter::from),
            sub_catalogue: f.sub_catalogue.map(StringFilter::from),
        }
    }
}

pub fn asset_catalogue_items(
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
    let connection_manager = ctx.get_connection_manager().connection()?;
    let items = get_asset_catalogue_items(
        &connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(AssetCatalogueItemsResponse::Response(
        AssetCatalogueItemConnector::from_domain(items),
    ))
}

pub fn asset_catalogue_item(ctx: &Context<'_>, id: String) -> Result<AssetCatalogueItemResponse> {
    let connection_manager = ctx.get_connection_manager().connection()?;
    let item = get_asset_catalogue_item(&connection_manager, id)?;

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
            code_manufacturer_model_type,
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
            code_manufacturer_model_type: code_manufacturer_model_type.map(StringFilter::from),
            sub_catalogue: sub_catalogue.map(StringFilter::from),
        }
    }
}

impl AssetCatalogueItemSortInput {
    pub fn to_domain(self) -> AssetCatalogueItemSort {
        use AssetCatalogueItemSortField as to;
        use AssetCatalogueItemSortFieldInput as from;
        let key = match self.key {
            from::Catalogue => to::Catalogue,
            from::Code => to::Code,
            from::Manufacturer => to::Manufacturer,
            from::Model => to::Model,
        };

        AssetCatalogueItemSort {
            key,
            desc: self.desc,
        }
    }
}
