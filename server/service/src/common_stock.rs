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
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(id)),
            Some(store_id.to_string()),
        )?
        .pop()
        .ok_or(DatabaseError(RepositoryError::NotFound))?;

    if stock_line.stock_line_row.store_id != store_id {
        return Err(StockLineDoesNotBelongToStore);
    }

    Ok(stock_line)
}

impl From<RepositoryError> for CommonStockLineError {
    fn from(error: RepositoryError) -> Self {
        CommonStockLineError::DatabaseError(error)
    }
}
