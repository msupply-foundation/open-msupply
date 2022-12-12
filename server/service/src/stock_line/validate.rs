use repository::{
    EqualFilter, LocationFilter, LocationRepository, RepositoryError, StockLineRow,
    StockLineRowRepository, StorageConnection,
};

pub fn check_stock_line_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StockLineRow>, RepositoryError> {
    let result = StockLineRowRepository::new(connection).find_one_by_id(id);

    match result {
        Ok(stock_line_row) => Ok(Some(stock_line_row)),
        Err(RepositoryError::NotFound) => Ok(None),
        Err(error) => Err(error),
    }
}

pub fn check_store(stock: &StockLineRow, store_id: &str) -> bool {
    if stock.store_id != store_id {
        return false;
    }
    return true;
}

pub fn check_location_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = LocationRepository::new(connection)
        .count(Some(LocationFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 1)
}
