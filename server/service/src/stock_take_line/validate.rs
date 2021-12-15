use domain::EqualFilter;
use repository::{
    RepositoryError, StockTakeLine, StockTakeLineFilter, StockTakeLineRepository, StorageConnection,
};

pub fn check_stock_take_line_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StockTakeLine>, RepositoryError> {
    let line = StockTakeLineRepository::new(&connection)
        .query_by_filter(StockTakeLineFilter::new().id(EqualFilter::equal_to(id)))?
        .pop();
    Ok(line)
}
