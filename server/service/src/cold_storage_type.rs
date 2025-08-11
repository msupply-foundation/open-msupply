use repository::{
    ColdStorageType, ColdStorageTypeFilter, ColdStorageTypeRepository, ColdStorageTypeSort,
    PaginationOption, StorageConnectionManager,
};

use crate::{get_pagination_or_default, i64_to_u32, ListError, ListResult};

pub fn get_cold_storage_types(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<ColdStorageTypeFilter>,
    sort: Option<ColdStorageTypeSort>,
) -> Result<ListResult<ColdStorageType>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let connection = connection_manager.connection()?;
    let repository = ColdStorageTypeRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
