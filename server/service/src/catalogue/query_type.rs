use repository::{
    asset_type_row::AssetTypeRow,
    assets::asset_type::{AssetTypeFilter, AssetTypeRepository, AssetTypeSort},
    EqualFilter, PaginationOption, RepositoryError, StorageConnection,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_asset_types(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AssetTypeFilter>,
    sort: Option<AssetTypeSort>,
) -> Result<ListResult<AssetTypeRow>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = AssetTypeRepository::new(&connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_asset_type(
    connection: &StorageConnection,
    id: String,
) -> Result<Option<AssetTypeRow>, RepositoryError> {
    let repository = AssetTypeRepository::new(&connection);
    let mut result =
        repository.query_by_filter(AssetTypeFilter::new().id(EqualFilter::equal_to(&id)))?;
    Ok(result.pop())
}
