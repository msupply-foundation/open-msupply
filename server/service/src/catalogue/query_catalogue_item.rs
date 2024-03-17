use repository::{
    asset_catalogue_item_row::AssetCatalogueItemRow,
    assets::asset_catalogue_item::{
        AssetCatalogueItemFilter, AssetCatalogueItemRepository, AssetCatalogueItemSort,
    },
    EqualFilter, PaginationOption, RepositoryError, StorageConnection,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_asset_catalogue_items(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AssetCatalogueItemFilter>,
    sort: Option<AssetCatalogueItemSort>,
) -> Result<ListResult<AssetCatalogueItemRow>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = AssetCatalogueItemRepository::new(&connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_asset_catalogue_item(
    connection: &StorageConnection,
    id: String,
) -> Result<Option<AssetCatalogueItemRow>, RepositoryError> {
    let repository = AssetCatalogueItemRepository::new(&connection);
    let mut result = repository
        .query_by_filter(AssetCatalogueItemFilter::new().id(EqualFilter::equal_to(&id)))?;
    Ok(result.pop())
}
