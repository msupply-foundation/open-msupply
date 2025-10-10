use repository::{
    EqualFilter, ProgramRow, ProgramRowRepository, RepositoryError, StockLine, StockLineFilter,
    StockLineRepository, StorageConnection,
};

use crate::preference::{DaysInMonth, Preference, UseDaysInMonth};

use util::constants::AVG_NUMBER_OF_DAYS_IN_A_MONTH;

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

pub fn check_program_exists(
    connection: &StorageConnection,
    program_id: &str,
) -> Result<Option<ProgramRow>, RepositoryError> {
    ProgramRowRepository::new(connection).find_one_by_id(program_id)
}

impl From<RepositoryError> for CommonStockLineError {
    fn from(error: RepositoryError) -> Self {
        CommonStockLineError::DatabaseError(error)
    }
}

pub fn days_in_a_month(connection: &StorageConnection) -> f64 {
    let custom_days_result = DaysInMonth.load(connection, None);
    let use_custom_days_result = UseDaysInMonth.load(connection, None);

    match (custom_days_result, use_custom_days_result) {
        (Ok(custom_days), Ok(true)) => custom_days,
        _ => AVG_NUMBER_OF_DAYS_IN_A_MONTH,
    }
}
