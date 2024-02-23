use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{
    asset_catalogue_item::AssetCatalogueItemFilter, asset_category::AssetCategoryFilter,
    asset_class::AssetClassFilter, asset_type::AssetTypeFilter, EqualFilter, PaginationOption,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct AssetCatalogueQueries;

#[Object]
impl AssetCatalogueQueries {

    pub async fn asset_catalogue_items(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<TemperatureLogFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
    sort: Option<Vec<AssetCatalogueSortInput>>,    
)
}
