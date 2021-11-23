use crate::WithDBError;
use repository::{
    schema::{InvoiceLineRow, InvoiceRow, ItemRow},
    InvoiceLineRowRepository, ItemRepository, RepositoryError, StorageConnection,
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

pub struct NumberOfPacksBelowOne;

pub fn check_number_of_packs(
    number_of_packs_option: Option<u32>,
) -> Result<(), NumberOfPacksBelowOne> {
    if let Some(number_of_packs) = number_of_packs_option {
        if number_of_packs < 1 {
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
    let item_result = ItemRepository::new(connection).find_one_by_id(item_id);

    match item_result {
        Ok(item) => Ok(item),
        Err(RepositoryError::NotFound) => Err(WithDBError::err(ItemNotFound {})),
        Err(error) => Err(WithDBError::db(error)),
    }
}

pub struct LineDoesNotExist;

pub fn check_line_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, WithDBError<LineDoesNotExist>> {
    let result = InvoiceLineRowRepository::new(connection).find_one_by_id(id);

    match result {
        Ok(line) => Ok(line),
        Err(RepositoryError::NotFound) => Err(WithDBError::err(LineDoesNotExist)),
        Err(error) => Err(WithDBError::db(error)),
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
