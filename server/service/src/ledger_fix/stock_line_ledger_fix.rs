use repository::{RepositoryError, StorageConnection};
use thiserror::Error;

use crate::ledger_fix::{
    fixes::{
        adjust_all_to_match_available, adjust_historic_incoming_invoices, adjust_invoice_status,
        adjust_total_to_match_ledger, fix_cancellations, inventory_adjustment_to_balance,
        LedgerFixError,
    },
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
    // Ledger fix that adjusts status on an invoice may fix several lines, so need to recheck needing the fix at the start
    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    adjust_invoice_status::fix(connection, operation_log, stock_line_id)?;

    // TODO only check this if some action was done in ledger fix
    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    adjust_historic_incoming_invoices::fix(connection, operation_log, stock_line_id)?;

    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    inventory_adjustment_to_balance::fix(connection, operation_log, stock_line_id)?;

    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    adjust_total_to_match_ledger::fix(connection, operation_log, stock_line_id)?;

    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    fix_cancellations::fix(connection, operation_log, stock_line_id)?;

    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    adjust_all_to_match_available::fix(connection, operation_log, stock_line_id)?;

    if is_ledger_fixed(connection, stock_line_id)? {
        return Ok(true);
    }

    Ok(false)
}
