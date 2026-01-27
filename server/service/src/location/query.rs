use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};
use repository::{
    location::{Location, LocationFilter, LocationRepository, LocationSort},
    EqualFilter, ItemRowRepository, LocationRow, PaginationOption, RepositoryError,
    StockLineFilter, StockLineRepository, StorageConnection,
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
) -> Result<(Option<String>, Option<f64>), RepositoryError> {
    let item = ItemRowRepository::new(connection)
        .find_one_by_id(item_id)?
        .ok_or(RepositoryError::NotFound)?;

    // TODO: Use store location restrictions when they are implemented
    let restricted_location_type_id = match item.restricted_location_type_id {
        Some(ref id) => id.clone(),
        None => String::new(),
    };

    let stock_line_repo = StockLineRepository::new(connection);
    let lines = stock_line_repo.query_by_filter(
        StockLineFilter::new()
            .location(
                LocationFilter::new()
                    .location_type_id(EqualFilter::equal_to(restricted_location_type_id.clone())),
            )
            .has_packs_in_store(true),
        Some(store_id.to_string()),
    )?;

    let location_repo = LocationRepository::new(connection);
    let locations = location_repo.query_by_filter(
        LocationFilter::new()
            .location_type_id(EqualFilter::equal_to(restricted_location_type_id.clone())),
    )?;

    let used_volume: f64 = lines
        .iter()
        .map(|line| line.stock_line_row.total_volume)
        .sum();

    let total_volume: f64 = locations.iter().map(|loc| loc.location_row.volume).sum();

    Ok((
        (!restricted_location_type_id.is_empty()).then_some(restricted_location_type_id),
        Some(total_volume - used_volume),
    ))
}
