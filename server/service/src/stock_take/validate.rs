use domain::EqualFilter;
use repository::{
    schema::{StockTakeRow, StockTakeStatus},
    RepositoryError, StockTakeLineFilter, StockTakeLineRepository, StockTakeRowRepository,
    StorageConnection,
};

pub fn check_stock_take_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StockTakeRow>, RepositoryError> {
    Ok(StockTakeRowRepository::new(connection).find_one_by_id(id)?)
}

pub fn check_stock_take_not_finalised(status: &StockTakeStatus) -> bool {
    *status != StockTakeStatus::Finalised
}

pub fn check_no_stock_take_lines_exist(
    connection: &StorageConnection,
    stock_take_line_id: &str,
) -> Result<bool, RepositoryError> {
    let result = StockTakeLineRepository::new(connection).count(Some(
        StockTakeLineFilter::new().stock_take_id(EqualFilter::equal_to(stock_take_line_id)),
    ))?;
    Ok(result == 0)
}

pub enum AdditionInvoiceCheckError {
    DoesNotExist,
    NotAnInboundInvoice,
}
