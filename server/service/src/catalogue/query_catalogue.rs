use repository::{
    assets::asset_catalogue_item::{
        AssetCatalogueItem, AssetCatalogueItemFilter, AssetCatalogueItemRepository,
        AssetCatalogueItemSort,
    },
    EqualFilter, PaginationOption, StorageConnection,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_asset_catalogue_items(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AssetCatalogueItemFilter>,
    sort: Option<AssetCatalogueItemSort>,
) -> Result<ListResult<AssetCatalogueItem>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = AssetCatalogueItemRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_asset_catalogue_item(
    ctx: &ServiceContext,
    id: String,
) -> Result<AssetCatalogueItem, SingleRecordError> {
    let repository = AssetCatalogueItemRepository::new(&ctx.connection);
    let mut result = repository
        .query_by_filter(AssetCatalogueItemFilter::new().id(EqualFilter::equal_to(&id)))?;
    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
