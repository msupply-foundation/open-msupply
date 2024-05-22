use asset_catalogue_property_queries::{
    asset_catalogue_properties, AssetCataloguePropertyFilterInput,
};
use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use mutations::{
    delete_asset_catalogue_item, insert_asset_catalogue_item, DeleteAssetCatalogueItemResponse,
    InsertAssetCatalogueItemInput, InsertAssetCatalogueItemResponse,
};
use types::{
    asset_catalogue_item::{AssetCatalogueItemResponse, AssetCatalogueItemsResponse},
    asset_catalogue_property::AssetCataloguePropertyResponse,
    asset_category::{AssetCategoriesResponse, AssetCategoryResponse},
    asset_class::{AssetClassResponse, AssetClassesResponse},
    asset_type::{AssetTypeResponse, AssetTypesResponse},
};

pub mod asset_catalogue_item_queries;
mod asset_catalogue_property_queries;
use crate::asset_catalogue_item_queries::*;
pub mod asset_category_queries;
use crate::asset_category_queries::*;
pub mod asset_class_queries;
use crate::asset_class_queries::*;
pub mod asset_type_queries;
use crate::asset_type_queries::*;
pub mod mutations;
pub mod types;

#[derive(Default, Clone)]
pub struct AssetCatalogueQueries;
#[Object]
impl AssetCatalogueQueries {
    // asset catalogue item queries
    pub async fn asset_catalogue_items(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<AssetCatalogueItemFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<AssetCatalogueItemSortInput>>,
    ) -> Result<AssetCatalogueItemsResponse> {
        asset_catalogue_items(ctx, page, filter, sort)
    }

    pub async fn asset_catalogue_item(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> Result<AssetCatalogueItemResponse> {
        asset_catalogue_item(ctx, id)
    }

    // asset class queries
    pub async fn asset_classes(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<AssetClassFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<AssetClassSortInput>>,
    ) -> Result<AssetClassesResponse> {
        asset_classes(ctx, page, filter, sort)
    }

    pub async fn asset_class(&self, ctx: &Context<'_>, id: String) -> Result<AssetClassResponse> {
        asset_class(ctx, id)
    }

    // asset category queries
    pub async fn asset_categories(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<AssetCategoryFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<AssetCategorySortInput>>,
    ) -> Result<AssetCategoriesResponse> {
        asset_categories(ctx, page, filter, sort)
    }

    pub async fn asset_category(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> Result<AssetCategoryResponse> {
        asset_category(ctx, id)
    }

    // asset type queries
    pub async fn asset_types(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<AssetTypeFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<AssetTypeSortInput>>,
    ) -> Result<AssetTypesResponse> {
        asset_types(ctx, page, filter, sort)
    }

    pub async fn asset_type(&self, ctx: &Context<'_>, id: String) -> Result<AssetTypeResponse> {
        asset_type(ctx, id)
    }

    pub async fn asset_catalogue_properties(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Filter option")] filter: Option<AssetCataloguePropertyFilterInput>,
    ) -> Result<AssetCataloguePropertyResponse> {
        asset_catalogue_properties(ctx, filter)
    }
}

#[derive(Default, Clone)]
pub struct AssetCatalogueMutations;

#[Object]
impl AssetCatalogueMutations {
    async fn insert_asset_catalogue_item(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertAssetCatalogueItemInput,
    ) -> Result<InsertAssetCatalogueItemResponse> {
        insert_asset_catalogue_item(ctx, &store_id, input)
    }

    async fn delete_asset_catalogue_item(
        &self,
        ctx: &Context<'_>,
        asset_catalogue_item_id: String,
    ) -> Result<DeleteAssetCatalogueItemResponse> {
        delete_asset_catalogue_item(ctx, &asset_catalogue_item_id)
    }
}
