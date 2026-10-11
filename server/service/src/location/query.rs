use std::collections::HashMap;

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};
use repository::{
    location::{Location, LocationFilter, LocationRepository, LocationSort},
    EqualFilter, ItemRow, LocationRow, PaginationOption, RepositoryError, StockLineFilter,
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

/// The location type an item must be stored in, if it is restricted to one. An
/// empty id means unrestricted.
// TODO: Use item_store_join location restrictions if/when they are implemented
pub fn restricted_location_type_id(item: &ItemRow) -> Option<&str> {
    item.restricted_location_type_id
        .as_deref()
        .filter(|id| !id.is_empty())
}

/// Volume still free in the store's locations of each given location type: their
/// total volume less the volume of the stock on hand in them. A type with no
/// locations in the store has no entry.
pub fn get_available_volume_by_location_type(
    connection: &StorageConnection,
    store_id: &str,
    location_type_ids: &[String],
) -> Result<HashMap<String, f64>, RepositoryError> {
    if location_type_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let location_repo = LocationRepository::new(connection);
    let locations = location_repo.query_by_filter(
        LocationFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .location_type_id(EqualFilter::equal_any(location_type_ids.to_vec())),
    )?;
    let location_ids: Vec<String> = locations
        .iter()
        .map(|location| location.location_row.id.clone())
        .collect();
    let volume_used_by_location = location_repo.volume_used_by_location(&location_ids)?;

    let mut available_volume_by_type = HashMap::<String, f64>::new();
    for location in locations {
        let LocationRow {
            id,
            location_type_id,
            volume,
            ..
        } = location.location_row;
        let Some(location_type_id) = location_type_id else {
            continue;
        };
        let volume_used = volume_used_by_location
            .get(&id)
            .copied()
            .unwrap_or_default();
        *available_volume_by_type
            .entry(location_type_id)
            .or_default() += volume - volume_used;
    }

    Ok(available_volume_by_type)
}
