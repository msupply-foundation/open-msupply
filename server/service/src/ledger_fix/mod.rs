use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceStatus,
    RepositoryError, StockLineRowRepository, StorageConnection,
};

pub mod find_ledger_discrepancies;
mod fixes;
pub mod ledger_fix_driver;
pub mod stock_line_ledger_fix;

pub(crate) fn is_ledger_fixed(
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
