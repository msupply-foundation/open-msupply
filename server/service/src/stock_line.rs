use crate::Pagination;
use crate::SingleRecordError;
use repository::EqualFilter;
use repository::{StockLine, StockLineFilter, StockLineRepository, StorageConnectionManager};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_stock_line(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<StockLine, SingleRecordError> {
    let connection = connection_manager.connection()?;

    let mut result = StockLineRepository::new(&connection).query(
        Pagination::one(),
        Some(StockLineFilter::new().id(EqualFilter::equal_to(&id))),
        None,
    )?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
