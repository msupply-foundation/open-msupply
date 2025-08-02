use crate::ledger_fix::find_ledger_discrepancies::FindStockLineLedgerDiscrepanciesError;

use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceStatus,
    RepositoryError, StockLineRowRepository, StorageConnection,
};
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
) -> Result<bool, RepositoryError> {
    let ledger_lines = StockLineLedgerRepository::new(connection).query_by_filter(
        StockLineLedgerFilter::new().stock_line_id(EqualFilter::equal_to(stock_line_id)),
    )?;

    if ledger_lines.iter().any(|line| line.running_balance < 0.0) {
        return Ok(false);
    }

    let reserved_not_picked = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .stock_line_id(EqualFilter::equal_to(stock_line_id))
            .r#type(InvoiceLineType::StockOut.equal_to())
            .invoice_status(InvoiceStatus::equal_any(vec![
                InvoiceStatus::Allocated,
                InvoiceStatus::New,
            ])),
    )?;

    let reserved_not_picked_summed = reserved_not_picked
        .iter()
        .map(|line| line.invoice_line_row.number_of_packs * line.invoice_line_row.pack_size)
        .sum::<f64>();

    // Unwrap is safe stock_line must exist at this pont
    let stock_line = StockLineRowRepository::new(connection)
        .find_one_by_id(stock_line_id)?
        .unwrap();

    let available = stock_line.available_number_of_packs * stock_line.pack_size;
    let total = stock_line.total_number_of_packs * stock_line.pack_size;

    if available > 0.0 || total > 0.0 && ledger_lines.is_empty() {
        return Ok(false);
    }

    match ledger_lines.last() {
        Some(last_line) => {
            return Ok(available + reserved_not_picked_summed == total
                && total == last_line.running_balance);
        }
        None => {
            return Ok(available == 0.0 || total == 0.0);
        }
    }
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
