use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, ItemRow, LocationRowRepository, RepositoryError,
    StockLineRow, StockLineRowRepository, StorageConnection,
};

pub fn check_batch_exists(
    batch_id: &str,
    connection: &StorageConnection,
) -> Result<Option<StockLineRow>, RepositoryError> {
    let batch_result = StockLineRowRepository::new(connection).find_one_by_id(batch_id);

    match batch_result {
        Ok(batch) => Ok(Some(batch)),
        Err(RepositoryError::NotFound) => Ok(None),
        Err(error) => Err(error),
    }
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
            .find_many_by_invoice_and_batch_id(&batch_id, &invoice_id)
        {
            Ok(lines) => {
                if let Some(line) = lines.iter().find(find_another_line) {
                    return Ok(Some(line.clone()));
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

pub fn check_item_matches_batch(batch: &StockLineRow, item: &ItemRow) -> bool {
    if batch.item_id != item.id {
        return false;
    }
    return true;
}

pub fn check_batch_on_hold(batch: &StockLineRow) -> bool {
    if batch.on_hold {
        return false;
    }
    return true;
}

pub enum LocationIsOnHoldError {
    LocationIsOnHold,
    LocationNotFound,
}

pub fn check_location_on_hold(
    batch: &StockLineRow,
    connection: &StorageConnection,
) -> Result<(), LocationIsOnHoldError> {
    use LocationIsOnHoldError::*;

    match &batch.location_id {
        Some(location_id) => {
            let location = LocationRowRepository::new(connection)
                .find_one_by_id(&location_id)
                .map_err(|_| LocationNotFound)?;

            match location {
                Some(location) if location.on_hold => Err(LocationIsOnHold),
                Some(_) => Ok(()),
                None => Err(LocationNotFound),
            }
        }
        None => Ok(()),
    }
}
