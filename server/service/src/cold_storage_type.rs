use repository::{
    ColdStorageType, ColdStorageTypeFilter, ColdStorageTypeRepository, ColdStorageTypeSort,
    PaginationOption, StorageConnectionManager,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 5000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_cold_storage_types(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<ColdStorageTypeFilter>,
    sort: Option<ColdStorageTypeSort>,
) -> Result<ListResult<ColdStorageType>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let connection = connection_manager.connection()?;
    let repository = ColdStorageTypeRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
