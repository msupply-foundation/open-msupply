use repository::{
    schema::StockTakeRow, RepositoryError, StockTakeRowRepository, StorageConnection,
};

pub fn check_stock_take_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StockTakeRow>, RepositoryError> {
    Ok(StockTakeRowRepository::new(connection).find_one_by_id(id)?)
}

pub enum AdditionInvoiceCheckError {
    DoesNotExist,
    NotAnInboundInvoice,
}
