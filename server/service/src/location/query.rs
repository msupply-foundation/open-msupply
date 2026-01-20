use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};
use repository::{
    location::{Location, LocationFilter, LocationRepository, LocationSort},
    EqualFilter, LocationRow, PaginationOption, RepositoryError, StockLineFilter,
    StockLineRepository, StorageConnection,
};

pub fn get_locations(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<LocationFilter>,
    sort: Option<LocationSort>,
) -> Result<ListResult<Location>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = LocationRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_location(ctx: &ServiceContext, id: String) -> Result<Location, SingleRecordError> {
    let repository = LocationRepository::new(&ctx.connection);

    let mut result = repository
        .query_by_filter(LocationFilter::new().id(EqualFilter::equal_to(id.to_string())))?;

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
        StockLineFilter::new()
            .location_id(EqualFilter::equal_to(location.id.to_string()))
            .has_packs_in_store(true),
        Some(location.store_id.clone()),
    )?;

    if lines.is_empty() {
        return Ok(0.0);
    }

    // Sum their total volumes
    Ok(lines
        .iter()
        .map(|line| line.stock_line_row.total_volume)
        .sum())
}

pub fn get_available_volume_by_location_type(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
) -> Result<f64, RepositoryError> {
    let stock_line_repo = StockLineRepository::new(connection);
    let lines = stock_line_repo.query_by_filter(
        StockLineFilter::new()
            .item_id(EqualFilter::equal_to(item_id.to_string()))
            .has_packs_in_store(true),
        Some(store_id.to_string()),
    )?;

    let restricted_location_type_ids: Vec<String> = lines
        .iter()
        .filter_map(|line| line.item_row.restricted_location_type_id.clone())
        .collect();

    let location_repo = LocationRepository::new(connection);
    let locations = location_repo.query_by_filter(
        LocationFilter::new()
            .location_type_id(EqualFilter::equal_any(restricted_location_type_ids)),
    )?;

    if lines.is_empty() {
        return Ok(0.0);
    }

    let used_volume: f64 = lines
        .iter()
        .map(|line| line.stock_line_row.total_volume)
        .sum();

    let total_volume: f64 = locations.iter().map(|loc| loc.location_row.volume).sum();

    Ok(total_volume - used_volume)
}
