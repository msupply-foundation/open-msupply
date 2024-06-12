use repository::{
    InvoiceLineRow, RepositoryError, StockLineRow, StockLineRowRepository, StorageConnection,
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
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    if let Some(batch_id) = &line.stock_line_id {
        match StockLineRowRepository::new(connection).find_one_by_id(batch_id) {
            Ok(batch) => return check_batch_stock_reserved(line, batch),
            Err(error) => return Err(error),
        };
    }
    Ok(true)
}

pub fn check_batch_stock_reserved(
    line: &InvoiceLineRow,
    batch: Option<StockLineRow>,
) -> Result<bool, RepositoryError> {
    if let Some(batch) = batch {
        if line.number_of_packs != batch.available_number_of_packs {
            return Ok(false);
        }
    }
    Ok(true)
}
