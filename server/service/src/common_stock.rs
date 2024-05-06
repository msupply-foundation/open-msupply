use repository::{
    EqualFilter, RepositoryError, StockLine, StockLineFilter, StockLineRepository,
    StorageConnection,
};

#[derive(Debug, PartialEq)]
pub enum CommonStockLineError {
    DatabaseError(RepositoryError),
    StockLineDoesNotBelongToStore,
}

pub fn check_stock_line_exists(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<StockLine, CommonStockLineError> {
    use CommonStockLineError::*;

    let stock_line = StockLineRepository::new(connection)
        .query_by_filter(StockLineFilter::new().id(EqualFilter::equal_to(id)), None)?
        .pop()
        .ok_or(DatabaseError(RepositoryError::NotFound))?;

    // store_id refers to item store_id not stock_line store_id
    if stock_line.stock_line_row.store_id != store_id {
        return Err(StockLineDoesNotBelongToStore);
    }

    Ok(stock_line)
}

pub fn check_stock_line_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection)
        .query_by_filter(StockLineFilter::new().id(EqualFilter::equal_to(id)), None)?;

    Ok(stock_lines.is_empty())
}

impl From<RepositoryError> for CommonStockLineError {
    fn from(error: RepositoryError) -> Self {
        CommonStockLineError::DatabaseError(error)
    }
}
