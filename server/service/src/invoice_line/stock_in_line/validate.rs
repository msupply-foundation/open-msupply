use repository::{
    vvm_status::vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
    EqualFilter, InvoiceLineRow, RepositoryError, StockLineRow, StockLineRowRepository,
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

pub fn check_number_of_packs(number_of_packs_option: Option<f64>) -> bool {
    if let Some(number_of_packs) = number_of_packs_option {
        if number_of_packs <= 0.0 {
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

pub fn get_existing_vvm_status_log_id(
    connection: &StorageConnection,
    stock_line_id: &str,
    invoice_line_id: &str,
) -> Result<Option<String>, RepositoryError> {
    Ok(VVMStatusLogRepository::new(connection)
        .query_by_filter(
            VVMStatusLogFilter::new()
                .stock_line_id(EqualFilter::equal_to(stock_line_id))
                .invoice_line_id(EqualFilter::equal_to(invoice_line_id)),
        )?
        .first()
        .map(|log| log.id.clone()))
}
