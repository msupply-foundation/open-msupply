use domain::{location::LocationFilter, stock_line::StockLineFilter, EqualFilter};
use repository::{
    schema::StockTakeLineRow, LocationRepository, RepositoryError, StockLineRepository,
    StockTakeLineRowRepository, StorageConnection,
};

pub fn check_stock_line_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StockLineRepository::new(connection)
        .count(Some(StockLineFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 1)
}

pub fn check_stock_take_line_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StockTakeLineRow>, RepositoryError> {
    StockTakeLineRowRepository::new(&connection).find_one_by_id(id)
}

pub fn check_location_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = LocationRepository::new(connection)
        .count(Some(LocationFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 1)
}
