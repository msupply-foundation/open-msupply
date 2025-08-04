use repository::location::{Location, LocationFilter, LocationRepository, LocationSort};
use repository::{
    EqualFilter, LocationRow, PaginationOption, RepositoryError, StockLineFilter,
    StockLineRepository, StorageConnection,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_locations(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<LocationFilter>,
    sort: Option<LocationSort>,
) -> Result<ListResult<Location>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = LocationRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_location(ctx: &ServiceContext, id: String) -> Result<Location, SingleRecordError> {
    let repository = LocationRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(LocationFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_volume_used(
    connection: &StorageConnection,
    location: &LocationRow,
) -> Result<f64, RepositoryError> {
    let stock_line_repo = StockLineRepository::new(connection);

    let lines = stock_line_repo.query_by_filter(
        StockLineFilter::new().location_id(EqualFilter::equal_to(&location.id)),
        Some(location.store_id.clone()),
    )?;

    // Sum their total volumes
    Ok(lines
        .iter()
        .map(|line| line.stock_line_row.total_volume)
        .sum())
}
