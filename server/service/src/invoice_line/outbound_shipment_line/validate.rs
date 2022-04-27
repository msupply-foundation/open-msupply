use crate::WithDBError;
use repository::{
    schema::StockLineRow, InvoiceLineRow, InvoiceLineRowRepository, ItemRow, LocationRowRepository,
    RepositoryError, StockLineRowRepository, StorageConnection,
};

pub struct StockLineNotFound;

pub fn check_batch_exists(
    batch_id: &str,
    connection: &StorageConnection,
) -> Result<StockLineRow, WithDBError<StockLineNotFound>> {
    let batch_result = StockLineRowRepository::new(connection).find_one_by_id(batch_id);

    match batch_result {
        Ok(batch) => Ok(batch),
        Err(RepositoryError::NotFound) => Err(WithDBError::err(StockLineNotFound)),
        Err(error) => Err(WithDBError::db(error)),
    }
}

pub struct StockLineAlreadyExistsInInvoice(pub String);

pub fn check_unique_stock_line(
    invoice_line_id: &str,
    invoice_id: &str,
    batch_id_option: Option<String>,
    connection: &StorageConnection,
) -> Result<(), WithDBError<StockLineAlreadyExistsInInvoice>> {
    let find_another_line =
        |invoice_line: &&InvoiceLineRow| -> bool { invoice_line.id != invoice_line_id };

    if let Some(batch_id) = batch_id_option {
        match InvoiceLineRowRepository::new(connection)
            .find_many_by_invoice_and_batch_id(&batch_id, &invoice_id)
        {
            Ok(lines) => {
                if let Some(line) = lines.iter().find(find_another_line) {
                    Err(WithDBError::err(StockLineAlreadyExistsInInvoice(
                        line.id.to_string(),
                    )))
                } else {
                    Ok(())
                }
            }
            Err(error) => Err(WithDBError::db(error)),
        }
    } else {
        Ok(())
    }
}

pub struct ItemDoesNotMatchStockLine;

pub fn check_item_matches_batch(
    batch: &StockLineRow,
    item: &ItemRow,
) -> Result<(), ItemDoesNotMatchStockLine> {
    if batch.item_id != item.id {
        Err(ItemDoesNotMatchStockLine)
    } else {
        Ok(())
    }
}
pub struct BatchIsOnHold;

pub fn check_batch_on_hold(batch: &StockLineRow) -> Result<(), BatchIsOnHold> {
    if batch.on_hold {
        Err(BatchIsOnHold {})
    } else {
        Ok(())
    }
}

pub enum LocationIsOnHoldError {
    LocationIsOnHold,
    LocationNotFound,
}

pub fn check_location_on_hold(
    batch: &StockLineRow,
    connection: &StorageConnection,
) -> Result<(), WithDBError<LocationIsOnHoldError>> {
    use LocationIsOnHoldError::*;
    match &batch.location_id {
        Some(location_id) => {
            let location = LocationRowRepository::new(connection)
                .find_one_by_id(&location_id)
                .map_err(WithDBError::db)?;

            match location {
                Some(location) if location.on_hold => Err(WithDBError::err(LocationIsOnHold)),
                Some(_) => Ok(()),
                None => Err(WithDBError::err(LocationNotFound)),
            }
        }
        None => Ok(()),
    }
}
