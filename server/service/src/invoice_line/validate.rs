use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceRow, ItemRow, ItemRowRepository, RepositoryError,
    StockLineFilter, StockLineRepository, StorageConnection,
};

pub fn check_number_of_packs(number_of_packs_option: Option<f64>) -> bool {
    if let Some(number_of_packs) = number_of_packs_option {
        // Don't use <= 0.0 or else can't 0 out inbound shipment lines
        if number_of_packs < 0.0 {
            return false;
        }
    }
    true
}

pub fn check_item_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<ItemRow>, RepositoryError> {
    ItemRowRepository::new(connection).find_active_by_id(id)
}

pub fn check_line_row_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<InvoiceLineRow>, RepositoryError> {
    InvoiceLineRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_line_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<InvoiceLine>, RepositoryError> {
    Ok(InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().id(EqualFilter::equal_to(id)))?
        .pop())
}

pub fn check_line_belongs_to_invoice(line: &InvoiceLineRow, invoice: &InvoiceRow) -> bool {
    if line.invoice_id != invoice.id {
        return false;
    }
    true
}

pub fn check_line_not_associated_with_stocktake(
    connection: &StorageConnection,
    id: &str,
    store_id: String,
) -> bool {
    let result = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new().item_id(EqualFilter::equal_to(id)),
        Some(store_id),
    );
    match result {
        Ok(line) => line.is_empty(),
        Err(RepositoryError::NotFound) => true,
        Err(_error) => false,
    }
}
