use repository::{
    LocationType, LocationTypeFilter, LocationTypeRepository, LocationTypeSort, PaginationOption,
    StorageConnectionManager,
};

use crate::{get_pagination_or_default, i64_to_u32, ListError, ListResult};

pub fn get_location_types(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<LocationTypeFilter>,
    sort: Option<LocationTypeSort>,
) -> Result<ListResult<LocationType>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let connection = connection_manager.connection()?;
    let repository = LocationTypeRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
