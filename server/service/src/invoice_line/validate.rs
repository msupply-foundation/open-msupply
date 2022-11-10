use crate::WithDBError;
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, ItemRow, ItemRowRepository,
    RepositoryError, StorageConnection,
};

pub struct LineAlreadyExists;

pub fn check_line_does_not_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), WithDBError<LineAlreadyExists>> {
    let result = InvoiceLineRowRepository::new(connection).find_one_by_id(id);

    match result {
        Ok(_) => Err(WithDBError::err(LineAlreadyExists {})),
        Err(RepositoryError::NotFound) => Ok(()),
        Err(error) => Err(WithDBError::db(error)),
    }
}

// TODO use this one instead of check_line_does_not_exists
pub fn check_line_does_not_exists_new(
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

pub struct NumberOfPacksBelowOne;

pub fn check_number_of_packs(
    number_of_packs_option: Option<f64>,
) -> Result<(), NumberOfPacksBelowOne> {
    if let Some(number_of_packs) = number_of_packs_option {
        if number_of_packs < 1.0 {
            Err(NumberOfPacksBelowOne {})
        } else {
            Ok(())
        }
    } else {
        Ok(())
    }
}

pub struct ItemNotFound;

pub fn check_item(
    item_id: &str,
    connection: &StorageConnection,
) -> Result<ItemRow, WithDBError<ItemNotFound>> {
    let item_result = ItemRowRepository::new(connection).find_one_by_id(item_id)?;

    match item_result {
        Some(item) => Ok(item),
        None => Err(WithDBError::err(ItemNotFound {})),
    }
}

// TODO use this one instead of check_item
pub fn check_item_exists_option(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<ItemRow>, RepositoryError> {
    ItemRowRepository::new(connection).find_one_by_id(id)
}

pub struct LineDoesNotExist;

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

pub struct NotInvoiceLine(pub String);

pub fn check_line_belongs_to_invoice(
    line: &InvoiceLineRow,
    invoice: &InvoiceRow,
) -> Result<(), NotInvoiceLine> {
    if line.invoice_id != invoice.id {
        Err(NotInvoiceLine(line.invoice_id.clone()))
    } else {
        Ok(())
    }
}
