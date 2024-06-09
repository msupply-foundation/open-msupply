use repository::{
    InvoiceLineRow, LocationRowRepository, RepositoryError, StockLineRow, StockLineRowRepository,
    StorageConnection,
};

pub fn check_pack_size(pack_size_option: Option<f64>) -> bool {
    if let Some(pack_size) = pack_size_option {
        if pack_size < 1.0 {
            return false;
        }
    }
    true
}

pub fn check_batch(
    line: &InvoiceLineRow,
    new_total_number_of_packs: f64,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    if let Some(batch_id) = &line.stock_line_id {
        match StockLineRowRepository::new(connection).find_one_by_id(batch_id) {
            Ok(batch) => return check_batch_stock_reserved(batch, new_total_number_of_packs),
            Err(error) => return Err(error),
        };
    }
    Ok(true)
}

pub fn check_batch_stock_reserved(
    batch: Option<StockLineRow>,
    new_total_number_of_packs: f64,
) -> Result<bool, RepositoryError> {
    if let Some(batch) = batch {
        let reserved_stock = batch.total_number_of_packs - batch.available_number_of_packs;

        if new_total_number_of_packs < reserved_stock {
            return Ok(false);
        }
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
