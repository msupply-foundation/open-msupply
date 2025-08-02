use repository::{RepositoryError, StorageConnection};
use thiserror::Error;

use crate::ledger_fix::{
    fixes::{adjust_historic_incoming_invoices, LedgerFixError},
    is_ledger_fixed,
};

#[derive(Error, Debug)]
pub(crate) enum StockLineLedgerFixError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    LedgerFixError(#[from] LedgerFixError),
}

pub(super) fn stock_line_ledger_fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result</* fixed fully */ bool, StockLineLedgerFixError> {
    adjust_historic_incoming_invoices(connection, operation_log, stock_line_id)?;

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

fn fix_ledger_2(
    _connection: &StorageConnection,
    operation_log: &mut String,
    _stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting fix_ledger_2\n");
    Ok(())
}

fn fix_ledger_3(
    _connection: &StorageConnection,
    operation_log: &mut String,
    _stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting fix_ledger_3\n");
    Ok(())
}
