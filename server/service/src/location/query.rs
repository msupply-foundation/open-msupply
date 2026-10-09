use std::collections::{HashMap, HashSet};

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

#[derive(Debug, PartialEq, Default, Clone)]
pub struct AvailableVolumeByType {
    pub restricted_location_type_id: Option<String>,
    pub available_volume: Option<f64>,
}

pub fn get_available_volume_by_location_type(
    connection: &StorageConnection,
    store_id: &str,
    item_ids: &[String],
) -> Result<HashMap<String, AvailableVolumeByType>, RepositoryError> {
    // TODO: Use item_store_join location restrictions if/when they are implemented
    let restricted_location_type_by_item: HashMap<String, String> =
        ItemRowRepository::new(connection)
            .find_many_by_id(&item_ids.to_vec())?
            .into_iter()
            .filter_map(|item| {
                let location_type_id = item
                    .restricted_location_type_id
                    .filter(|id| !id.is_empty())?;
                Some((item.id, location_type_id))
            })
            .collect();

    if restricted_location_type_by_item.is_empty() {
        return Ok(HashMap::new());
    }

    // Volume is per location type, and a master list's items share a handful of
    // types, so look up each type once rather than once per item
    let location_type_ids: Vec<String> = restricted_location_type_by_item
        .values()
        .cloned()
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();

    let mut total_volume_by_type = HashMap::<String, f64>::new();
    for location in LocationRepository::new(connection).query_by_filter(
        LocationFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .location_type_id(EqualFilter::equal_any(location_type_ids.clone())),
    )? {
        if let Some(location_type_id) = location.location_row.location_type_id {
            *total_volume_by_type.entry(location_type_id).or_default() +=
                location.location_row.volume;
        }
    }

    let used_volume_by_type = StockLineRepository::new(connection)
        .total_volume_by_location_type(store_id, &location_type_ids)?;

    Ok(restricted_location_type_by_item
        .into_iter()
        .filter_map(|(item_id, location_type_id)| {
            // No locations of this type in the store, so no volume to report
            let total_volume = *total_volume_by_type.get(&location_type_id)?;
            let used_volume = used_volume_by_type
                .get(&location_type_id)
                .copied()
                .unwrap_or_default();

            Some((
                item_id,
                AvailableVolumeByType {
                    restricted_location_type_id: Some(location_type_id),
                    available_volume: Some(total_volume - used_volume),
                },
            ))
        })
        .collect())
}
