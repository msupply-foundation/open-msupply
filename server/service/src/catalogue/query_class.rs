use repository::{
    asset_class_row::AssetClassRow,
    assets::asset_class::{AssetClassFilter, AssetClassRepository, AssetClassSort},
    EqualFilter, PaginationOption, RepositoryError, StorageConnection,
};

use crate::{get_pagination_or_default, i64_to_u32, ListError, ListResult};

pub fn get_asset_classes(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AssetClassFilter>,
    sort: Option<AssetClassSort>,
) -> Result<ListResult<AssetClassRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = AssetClassRepository::new(connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_asset_class(
    connection: &StorageConnection,
    id: String,
) -> Result<Option<AssetClassRow>, RepositoryError> {
    let repository = AssetClassRepository::new(connection);
    let mut result = repository
        .query_by_filter(AssetClassFilter::new().id(EqualFilter::equal_to(id.to_string())))?;
    Ok(result.pop())
}
