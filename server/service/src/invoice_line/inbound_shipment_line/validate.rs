use repository::{
    InvoiceLineRow, LocationRowRepository, RepositoryError, StockLineRow, StockLineRowRepository,
    StorageConnection,
};

pub fn check_pack_size(pack_size_option: Option<u32>) -> bool {
    if let Some(pack_size) = pack_size_option {
        if pack_size < 1 {
            return false;
        }
    }
    return true;
}

pub fn check_batch(
    line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    if let Some(batch_id) = &line.stock_line_id {
        match StockLineRowRepository::new(connection).find_one_by_id(batch_id) {
            Ok(batch) => return check_batch_stock_reserved(line, batch),
            Err(error) => return Err(error),
        };
    }
    return Ok(true);
}

pub fn check_batch_stock_reserved(
    line: &InvoiceLineRow,
    batch: StockLineRow,
) -> Result<bool, RepositoryError> {
    if line.number_of_packs != batch.available_number_of_packs {
        return Ok(false);
    }
    Ok(true)
}

pub fn check_location_exists(
    location_id: &Option<String>,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    if let Some(location_id) = location_id {
        let location = LocationRowRepository::new(connection).find_one_by_id(location_id)?;
        if location.is_none() {
            return Ok(false);
        }
    }
    Ok(true)
}
