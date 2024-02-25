use repository::{
    assets::asset_class::{AssetClass, AssetClassFilter, AssetClassRepository, AssetClassSort},
    EqualFilter, PaginationOption, StorageConnection,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_asset_classes(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AssetClassFilter>,
    sort: Option<AssetClassSort>,
) -> Result<ListResult<AssetClass>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = AssetClassRepository::new(&connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_asset_class(
    connection: &StorageConnection,
    id: String,
) -> Result<Option<AssetClass>, SingleRecordError> {
    let repository = AssetClassRepository::new(&connection);
    let mut result =
        repository.query_by_filter(AssetClassFilter::new().id(EqualFilter::equal_to(&id)))?;
    Ok(result.pop())
}
