use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceLineRow, InvoiceRow, ItemRow},
    },
    domain::supplier_invoice::UpdateSupplierInvoiceLine,
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            CommonError as CommonInvoiceError,
        },
        invoice_line::{
            supplier_invoice_line::{
                check_batch, check_item as check_item_common, check_line_belongs_to_invoice,
                check_line_exists, check_number_of_packs, check_pack_size,
            },
            CommonError as CommonLineError, InsertAndDeleteError,
        },
    },
};

use super::UpdateSupplierInvoiceLineError;

pub fn validate(
    input: &UpdateSupplierInvoiceLine,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, Option<ItemRow>, InvoiceRow), UpdateSupplierInvoiceLineError> {
    let line = check_line_exists(&input.id, connection)?;
    check_pack_size(input.pack_size.clone())?;
    check_number_of_packs(input.number_of_packs.clone())?;

    let item = check_item(&input.item_id, connection)?;

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice)?;
    check_invoice_finalised(&invoice)?;

    check_batch(&line, connection)?;

    Ok((line, item, invoice))
}

fn check_item(
    item_id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<Option<ItemRow>, UpdateSupplierInvoiceLineError> {
    if let Some(item_id) = item_id_option {
        Ok(Some(check_item_common(item_id, connection)?))
    } else {
        Ok(None)
    }
}

impl From<CommonLineError> for UpdateSupplierInvoiceLineError {
    fn from(error: CommonLineError) -> Self {
        use UpdateSupplierInvoiceLineError::*;
        match error {
            CommonLineError::PackSizeBelowOne => PackSizeBelowOne,
            CommonLineError::NumberOfPacksBelowOne => NumberOfPacksBelowOne,
            CommonLineError::ItemNotFound => ItemNotFound,
            CommonLineError::DatabaseError(error) => DatabaseError(error),
        }
    }
}

impl From<CommonInvoiceError> for UpdateSupplierInvoiceLineError {
    fn from(error: CommonInvoiceError) -> Self {
        use UpdateSupplierInvoiceLineError::*;
        match error {
            CommonInvoiceError::InvoiceDoesNotExists => InvoiceDoesNotExist,
            CommonInvoiceError::DatabaseError(error) => DatabaseError(error),
            CommonInvoiceError::InvoiceIsFinalised => CannotEditFinalised,
            CommonInvoiceError::NotASupplierInvoice => NotASupplierInvoice,
        }
    }
}

impl From<InsertAndDeleteError> for UpdateSupplierInvoiceLineError {
    fn from(error: InsertAndDeleteError) -> Self {
        use UpdateSupplierInvoiceLineError::*;
        match error {
            InsertAndDeleteError::LineDoesNotExist => LineDoesNotExist,
            InsertAndDeleteError::NotInvoiceLine(invoice_id) => NotThisInvoiceLine(invoice_id),
            InsertAndDeleteError::DatabaseError(error) => DatabaseError(error),
            InsertAndDeleteError::BatchIsReserved => BatchIsReserved,
        }
    }
}
