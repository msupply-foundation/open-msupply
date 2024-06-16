use repository::EqualFilter;
use repository::{
    RepositoryError, StocktakeLineFilter, StocktakeLineRepository, StocktakeRow,
    StocktakeRowRepository, StocktakeStatus, StorageConnection,
};

pub fn check_stocktake_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StocktakeRow>, RepositoryError> {
    StocktakeRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_stocktake_not_finalised(status: &StocktakeStatus) -> bool {
    *status != StocktakeStatus::Finalised
}

pub fn check_no_stocktake_lines_exist(
    connection: &StorageConnection,
    stocktake_line_id: &str,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    let result = StocktakeLineRepository::new(connection).count(
        Some(StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(stocktake_line_id))),
        Some(store_id.to_string()),
    )?;
    Ok(result == 0)
}

pub enum AdditionInvoiceCheckError {
    DoesNotExist,
    NotAnInboundInvoice,
}
