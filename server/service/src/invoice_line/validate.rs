use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, ItemRow, ItemRowRepository,
    RepositoryError, StorageConnection,
};

pub fn check_line_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let result = InvoiceLineRowRepository::new(connection).find_one_by_id(id);

    match result {
        Err(RepositoryError::NotFound) => Ok(true),
        Err(error) => Err(error),
        Ok(_) => Ok(false),
    }
}

pub fn check_number_of_packs(number_of_packs_option: Option<f64>) -> bool {
    if let Some(number_of_packs) = number_of_packs_option {
        if number_of_packs < 1.0 {
            return false;
        }
    }
    return true;
}

pub fn check_item_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<ItemRow>, RepositoryError> {
    ItemRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_line_exists_option(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<InvoiceLineRow>, RepositoryError> {
    let result = InvoiceLineRowRepository::new(connection).find_one_by_id(id);

    match result {
        Ok(line) => Ok(Some(line)),
        Err(RepositoryError::NotFound) => Ok(None),
        Err(error) => Err(error),
    }
}

pub fn check_line_belongs_to_invoice(line: &InvoiceLineRow, invoice: &InvoiceRow) -> bool {
    if line.invoice_id != invoice.id {
        return false;
    }
    return true;
}
