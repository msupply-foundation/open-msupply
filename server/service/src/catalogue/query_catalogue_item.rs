use repository::{
    asset_catalogue_item_row::AssetCatalogueItemRow,
    assets::asset_catalogue_item::{
        AssetCatalogueItemFilter, AssetCatalogueItemRepository, AssetCatalogueItemSort,
    },
    EqualFilter, PaginationOption, RepositoryError, StorageConnection,
};

use crate::{get_pagination_or_default, i64_to_u32, ListError, ListResult};

pub fn get_asset_catalogue_items(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AssetCatalogueItemFilter>,
    sort: Option<AssetCatalogueItemSort>,
) -> Result<ListResult<AssetCatalogueItemRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = AssetCatalogueItemRepository::new(connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_asset_catalogue_item(
    connection: &StorageConnection,
    id: String,
) -> Result<Option<AssetCatalogueItemRow>, RepositoryError> {
    let repository = AssetCatalogueItemRepository::new(connection);
    let mut result = repository.query_by_filter(
        AssetCatalogueItemFilter::new().id(EqualFilter::equal_to(id.to_string())),
    )?;
    Ok(result.pop())
}
