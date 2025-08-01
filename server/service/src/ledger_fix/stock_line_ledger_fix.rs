use crate::ledger_fix::find_ledger_discrepancies::{
    find_stock_line_ledger_discrepancies, FindStockLineLedgerDiscrepanciesError,
};

use repository::{RepositoryError, StorageConnection};
use thiserror::Error;

#[derive(Error, Debug)]
enum StockLineLedgerFixError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    FindStockLineLedgerDiscrepanciesError(#[from] FindStockLineLedgerDiscrepanciesError),
}

pub(super) fn stock_line_ledger_fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result</* fixed fully */ bool, FindStockLineLedgerDiscrepanciesError> {
    fix_ledger_1(connection, operation_log, stock_line_id)?;

    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    fix_ledger_2(connection, operation_log, stock_line_id)?;

    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    fix_ledger_3(connection, operation_log, stock_line_id)?;

    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    Ok(false)
}

fn is_ledger_fixed(
    connection: &StorageConnection,
    stock_line_id: &str,
) -> Result<bool, FindStockLineLedgerDiscrepanciesError> {
    let discrepancies = find_stock_line_ledger_discrepancies(connection, Some(stock_line_id))?;
    Ok(discrepancies.is_empty())
}

fn fix_ledger_1(
    _connection: &StorageConnection,
    operation_log: &mut String,
    _stock_line_id: &str,
) -> Result<(), RepositoryError> {
    operation_log.push_str("Starting fix_ledger_1\n");
    Ok(())
}

fn fix_ledger_2(
    _connection: &StorageConnection,
    operation_log: &mut String,
    _stock_line_id: &str,
) -> Result<(), RepositoryError> {
    operation_log.push_str("Starting fix_ledger_2\n");
    Ok(())
}

fn fix_ledger_3(
    _connection: &StorageConnection,
    operation_log: &mut String,
    _stock_line_id: &str,
) -> Result<(), RepositoryError> {
    operation_log.push_str("Starting fix_ledger_3\n");
    Ok(())
}
