use crate::{
    database::{
        repository::{InvoiceLineRepository, RepositoryError, StorageConnection},
        schema::{InvoiceRow, ItemRow},
    },
    domain::supplier_invoice::InsertSupplierInvoiceLine,
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            CommonError as CommonInvoiceError,
        },
        invoice_line::{
            supplier_invoice_line::{check_item, check_number_of_packs, check_pack_size},
            CommonError as CommonLineError,
        },
    },
};

use super::InsertSupplierInvoiceLineError;

pub fn validate(
    input: &InsertSupplierInvoiceLine,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), InsertSupplierInvoiceLineError> {
    check_line_does_not_exists(&input.id, connection)?;
    check_pack_size(Some(input.pack_size))?;
    check_number_of_packs(Some(input.number_of_packs))?;
    let item = check_item(&input.item_id, connection)?;

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice)?;
    check_invoice_finalised(&invoice)?;

    Ok((item, invoice))
}

fn check_line_does_not_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertSupplierInvoiceLineError> {
    let result = InvoiceLineRepository::new(connection).find_one_by_id(id);

    match result {
        Ok(_) => Err(InsertSupplierInvoiceLineError::LineAlreadyExists),
        Err(RepositoryError::NotFound) => Ok(()),
        Err(error) => Err(error.into()),
    }
}

impl From<CommonLineError> for InsertSupplierInvoiceLineError {
    fn from(error: CommonLineError) -> Self {
        use InsertSupplierInvoiceLineError::*;
        match error {
            CommonLineError::PackSizeBelowOne => PackSizeBelowOne,
            CommonLineError::NumberOfPacksBelowOne => NumberOfPacksBelowOne,
            CommonLineError::ItemNotFound => ItemNotFound,
            CommonLineError::DatabaseError(error) => DatabaseError(error),
        }
    }
}

impl From<CommonInvoiceError> for InsertSupplierInvoiceLineError {
    fn from(error: CommonInvoiceError) -> Self {
        use InsertSupplierInvoiceLineError::*;
        match error {
            CommonInvoiceError::InvoiceDoesNotExists => InvoiceDoesNotExist,
            CommonInvoiceError::DatabaseError(error) => DatabaseError(error),
            CommonInvoiceError::InvoiceIsFinalised => CannotEditFinalised,
            CommonInvoiceError::NotASupplierInvoice => NotASupplierInvoice,
        }
    }
}
