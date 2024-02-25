use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::*;
use repository::asset_class::AssetClass;

pub mod asset_catalogue_item_queries;
use self::asset_catalogue_item_queries::*;
pub mod asset_class_queries;
use self::asset_class_queries::*;

#[derive(Default, Clone)]
pub struct AssetCatalogueItemQueries;
#[Object]
impl AssetCatalogueItemQueries {
    // asset catalogue item queries
    pub async fn asset_catalogue_items(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<AssetCatalogueItemFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<AssetCatalogueItemSortInput>>,
    ) -> Result<AssetCatalogueItemsResponse> {
        asset_catalogue_items(ctx, store_id, page, filter, sort)
    }

    pub async fn asset_catalogue_item(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "id of the asset catalogue item")] id: String,
    ) -> Result<AssetCatalogueItemResponse> {
        asset_catalogue_item(ctx, store_id, id)
    }

    // asset class queries
    pub async fn asset_classes(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<AssetClassFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")] sort: Option<Vec<AssetClassSortInput>>
    ) -> Result<AssetClassesResponse {
        asset_classes(ctx, store_id, page, filter, sort)
    }

    pub async fn asset_class(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc "id of the class")] id: String,
    ) -> Result<AssetClassResponse> {
        asset_class(ctx, store_id, id)
    }
}
