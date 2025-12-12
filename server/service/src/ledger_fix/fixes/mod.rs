use crate::number::next_number;
use chrono::TimeDelta;
use chrono::Utc;
use repository::stock_line_ledger::StockLineLedgerRow;
use repository::CurrencyFilter;
use repository::CurrencyRepository;
use repository::EqualFilter;
use repository::InvoiceLineRow;
use repository::InvoiceLineRowRepository;
use repository::InvoiceLineType;
use repository::InvoiceRow;
use repository::InvoiceRowRepository;
use repository::InvoiceStatus;
use repository::InvoiceType;
use repository::ItemRowRepository;
use repository::NameRowRepository;
use repository::NumberRowType;
use repository::Pagination;
use repository::RepositoryError;
use repository::Sort;
use repository::StockLineRowRepository;
use repository::StocktakeFilter;
use repository::StocktakeLineFilter;
use repository::StocktakeRepository;
use repository::StocktakeSortField;
use repository::StocktakeStatus;
use repository::StorageConnection;
use thiserror::Error;
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;
use util::constants::SYSTEM_USER_ID;
use util::uuid::uuid;

pub(crate) mod adjust_historic_incoming_invoices;

pub(crate) mod adjust_all_to_match_available;
pub(crate) mod adjust_total_to_match_ledger;
pub(crate) mod delete_unused_orphan_stock_lines;
pub(crate) mod fix_cancellations;
pub(crate) mod inventory_adjustment_to_balance;

#[derive(Error, Debug)]
pub(crate) enum LedgerFixError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("{0}")]
    Other(String),
}

impl LedgerFixError {
    pub(crate) fn other(msg: &str) -> Result<(), LedgerFixError> {
        Err(LedgerFixError::Other(msg.to_string()))
    }
}

pub(crate) fn is_omsupply_uuid(stock_line_id: &str) -> bool {
    stock_line_id.contains("-")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_omsupply_uuid() {
        // mSupply
        assert_eq!(is_omsupply_uuid("124E66C23F893C48A1B7EDB9501B9247"), false);
        // mSupply mobile
        assert_eq!(is_omsupply_uuid("8b050f904b1011f0ba48e743cf9b07a9"), false);
        // omSupply
        assert_eq!(
            is_omsupply_uuid("0197bfbf-90ef-71e0-b929-589da7c29507"),
            true
        );
    }
}

pub(crate) fn adjust_ledger_running_balance(
    connection: &StorageConnection,
    operation_log: &mut String,
    ledger_lines: &[StockLineLedgerRow],
    current_end_balance: f64,
    new_end_balance: f64,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    let adjustment = new_end_balance - current_end_balance;
    // If adjustment is positive, we can add positive adjustment at the start of the ledger safely (without causing negative balance)
    if adjustment > 0.0 {
        operation_log.push_str(
            "Adjustment is positive, adding positive adjustment at the start of the ledger.\n",
        );
        create_inventory_adjustment(
            connection,
            operation_log,
            ledger_lines.first(),
            adjustment,
            stock_line_id,
        )?;

        return Ok(());
    }

    // if adjustment is negative we need to add negative adjustment as far back in history as possible (without causing negative balance)
    let mut backdate_at_ledger_line = None;

    for ledger_line in ledger_lines.iter().rev() {
        if ledger_line.running_balance + adjustment < 0.0 {
            break;
        }
        backdate_at_ledger_line = Some(ledger_line);
    }

    operation_log.push_str("Adjustment is negative, adding negative inventory adjustment.\n");

    create_inventory_adjustment(
        connection,
        operation_log,
        backdate_at_ledger_line.or(ledger_lines.last()),
        adjustment,
        stock_line_id,
    )?;
    Ok(())
}

fn create_inventory_adjustment(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_ledger_row: Option<&StockLineLedgerRow>,
    adjustment: f64,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    let Some(stock_line) =
        StockLineRowRepository::new(connection).find_one_by_id(&stock_line_id)?
    else {
        return LedgerFixError::other("Stock line not found");
    };

    let store_id = stock_line.store_id;

    let datetime = match stock_line_ledger_row {
        Some(r) => r.datetime.clone(),
        None => {
            find_latest_finalised_stocktake_for_stock_line(connection, stock_line_id, &store_id)?
        }
    };

    let inventory_adjustment_name_id = NameRowRepository::new(connection)
        .find_one_by_code(INVENTORY_ADJUSTMENT_NAME_CODE)?
        .ok_or(RepositoryError::NotFound)?
        .id;

    let Some(item) =
        ItemRowRepository::new(connection).find_one_by_item_link_id(&stock_line.item_link_id)?
    else {
        return LedgerFixError::other("Item not found for inventory adjustment");
    };

    operation_log.push_str(&format!(
        "Adding {adjustment} adjustment for date {datetime:?}.\n"
    ));
    // Datetime offset to make sure stock is in before out and out before it's in
    let datetime_offset = TimeDelta::seconds(1);
    let (invoice_type, number_type, invoice_line_type, datetime) = if adjustment > 0.0 {
        let Some(datetime) = datetime.checked_sub_signed(datetime_offset) else {
            return LedgerFixError::other("Failed to adjust datetime by 1 second");
        };
        (
            InvoiceType::InventoryAddition,
            NumberRowType::InventoryAddition,
            InvoiceLineType::StockIn,
            datetime,
        )
    } else {
        let Some(datetime) = datetime.checked_add_signed(datetime_offset) else {
            return LedgerFixError::other("Failed to adjust datetime by 1 second");
        };
        (
            InvoiceType::InventoryReduction,
            NumberRowType::InventoryReduction,
            InvoiceLineType::StockOut,
            datetime,
        )
    };

    let invoice_number = next_number(connection, &number_type, &store_id)?;

    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(LedgerFixError::DatabaseError(RepositoryError::NotFound))?;

    // Similar to stock take
    let adjustment_invoice = InvoiceRow {
        id: uuid(),
        name_link_id: inventory_adjustment_name_id,
        currency_id: Some(currency.currency_row.id),
        currency_rate: currency.currency_row.rate,
        r#type: invoice_type,
        status: InvoiceStatus::Verified,
        store_id,
        user_id: Some(SYSTEM_USER_ID.to_string()),
        invoice_number,
        comment: Some(format!(
            "Ledger balance for stock line batch {} id {}",
            stock_line.batch.unwrap_or_default(),
            stock_line_id
        )),
        created_datetime: datetime,
        verified_datetime: Some(datetime),
        ..Default::default()
    };

    let line = InvoiceLineRow {
        id: uuid(),
        invoice_id: adjustment_invoice.id.clone(),
        item_link_id: stock_line.item_link_id, // Note if item is unmerged in the future, we should expect the invoice line item to match the stock line item
        item_name: item.name,
        item_code: item.code,
        stock_line_id: Some(stock_line.id),
        r#type: invoice_line_type,
        number_of_packs: adjustment.abs() / stock_line.pack_size,
        pack_size: stock_line.pack_size,
        ..Default::default()
    };

    InvoiceRowRepository::new(connection).upsert_one(&adjustment_invoice)?;

    InvoiceLineRowRepository::new(connection).upsert_one(&line)?;

    Ok(())
}

fn find_latest_finalised_stocktake_for_stock_line(
    connection: &StorageConnection,
    stock_line_id: &str,
    store_id: &String,
) -> Result<chrono::NaiveDateTime, LedgerFixError> {
    let filter = StocktakeFilter::new()
        .store_id(EqualFilter::equal_to(store_id.to_string()))
        .status(EqualFilter {
            equal_to: Some(StocktakeStatus::Finalised),
            ..Default::default()
        })
        .stocktake_line(
            StocktakeLineFilter::new()
                .stock_line_id(EqualFilter::equal_to(stock_line_id.to_string())),
        );
    Ok(StocktakeRepository::new(connection)
        .query(
            Pagination::all(),
            Some(filter),
            Some(Sort {
                key: StocktakeSortField::FinalisedDatetime,
                desc: None,
            }),
        )?
        .first()
        .and_then(|s| s.finalised_datetime)
        .unwrap_or_else(|| Utc::now().naive_utc()))
}
