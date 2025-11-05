use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository, StockLineLedgerRow},
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
        StockLineLedgerFilter::new()
            .stock_line_id(EqualFilter::equal_to(stock_line_id.to_string())),
    )?;

    if ledger_lines.iter().any(|line| line.running_balance < 0.0) {
        return Ok(false);
    }

    let balance_summary = ledger_balance_summary(connection, &ledger_lines, stock_line_id)?;

    return Ok(balance_summary.is_fixed);
}

#[derive(Debug)]
pub(crate) struct LedgerBalanceSummary {
    is_fixed: bool,
    available: f64,
    total: f64,
    running_balance: f64,
    reserved_not_picked: f64,
}

pub(crate) fn ledger_balance_summary(
    connection: &StorageConnection,
    ledger_lines: &[StockLineLedgerRow],
    stock_line_id: &str,
) -> Result<LedgerBalanceSummary, RepositoryError> {
    let reserved_not_picked = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .stock_line_id(EqualFilter::equal_to(stock_line_id.to_string()))
            .r#type(InvoiceLineType::StockOut.equal_to())
            .invoice_status(InvoiceStatus::equal_any(vec![
                InvoiceStatus::Allocated,
                InvoiceStatus::New,
            ])),
    )?;

    let reserved_not_picked = reserved_not_picked
        .iter()
        .map(|line| line.invoice_line_row.number_of_packs * line.invoice_line_row.pack_size)
        .sum::<f64>();

    // Some ledger fixes may delete the stock_line, so subsequent checks of the ID should handle it safely.
    let Some(stock_line) = StockLineRowRepository::new(connection).find_one_by_id(stock_line_id)?
    else {
        return Ok(LedgerBalanceSummary {
            is_fixed: true,
            available: 0.0,
            total: 0.0,
            running_balance: 0.0,
            reserved_not_picked: 0.0,
        });
    };

    let available = stock_line.available_number_of_packs * stock_line.pack_size;
    let total = stock_line.total_number_of_packs * stock_line.pack_size;
    let running_balance = ledger_lines
        .last()
        .map(|line| line.running_balance)
        .unwrap_or(0.0);

    if (available > 0.0 || total > 0.0) && ledger_lines.is_empty() {
        return Ok(LedgerBalanceSummary {
            is_fixed: false,
            available,
            total,
            running_balance,
            reserved_not_picked,
        });
    }

    Ok(LedgerBalanceSummary {
        is_fixed: (available + reserved_not_picked) == total && total == running_balance,
        available,
        total,
        running_balance,
        reserved_not_picked,
    })
}
