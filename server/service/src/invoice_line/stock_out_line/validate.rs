use repository::{
    EqualFilter, InvoiceLineRow, InvoiceLineRowRepository, ItemRow, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository, StorageConnection,
};

pub fn check_batch_exists(
    store_id: &str,
    batch_id: &str,
    connection: &StorageConnection,
) -> Result<Option<StockLine>, RepositoryError> {
    Ok(StockLineRepository::new(connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(batch_id)),
            Some(store_id.to_string()),
        )?
        .pop())
}

pub fn check_unique_stock_line(
    invoice_line_id: &str,
    invoice_id: &str,
    batch_id_option: Option<String>,
    connection: &StorageConnection,
) -> Result<Option<InvoiceLineRow>, RepositoryError> {
    let find_another_line =
        |invoice_line: &&InvoiceLineRow| -> bool { invoice_line.id != invoice_line_id };

    if let Some(batch_id) = batch_id_option {
        match InvoiceLineRowRepository::new(connection)
            .find_many_by_invoice_and_batch_id(&batch_id, invoice_id)
        {
            Ok(lines) => {
                if let Some(line) = lines.iter().find(find_another_line) {
                    Ok(Some(line.clone()))
                } else {
                    Ok(None)
                }
            }
            Err(_) => Ok(None),
        }
    } else {
        Ok(None)
    }
}

pub fn check_item_matches_batch(batch: &StockLine, item: &ItemRow) -> bool {
    if batch.item_row.id != item.id {
        return false;
    }
    true
}

pub fn check_batch_on_hold(batch: &StockLine) -> bool {
    if batch.stock_line_row.on_hold {
        return false;
    }
    true
}

pub enum LocationIsOnHoldError {
    LocationIsOnHold,
}

pub fn check_location_on_hold(batch: &StockLine) -> Result<(), LocationIsOnHoldError> {
    use LocationIsOnHoldError::*;

    match &batch.location_row {
        Some(location) => {
            if location.on_hold {
                return Err(LocationIsOnHold);
            }
            Ok(())
        }
        None => Ok(()),
    }
}
