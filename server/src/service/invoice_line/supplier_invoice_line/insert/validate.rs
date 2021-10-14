use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceRow, ItemRow},
    },
    domain::{invoice::InvoiceType, supplier_invoice::InsertSupplierInvoiceLine},
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
        },
        invoice_line::{
            supplier_invoice_line::check_pack_size,
            validate::{
                check_item, check_line_does_not_exists, check_number_of_packs, ItemNotFound,
                LineAlreadyExists, NumberOfPacksBelowOne,
            },
            PackSizeBelowOne,
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
    check_invoice_type(&invoice, InvoiceType::SupplierInvoice)?;
    check_invoice_finalised(&invoice)?;

    Ok((item, invoice))
}

impl From<ItemNotFound> for InsertSupplierInvoiceLineError {
    fn from(_: ItemNotFound) -> Self {
        InsertSupplierInvoiceLineError::ItemNotFound
    }
}

impl From<NumberOfPacksBelowOne> for InsertSupplierInvoiceLineError {
    fn from(_: NumberOfPacksBelowOne) -> Self {
        InsertSupplierInvoiceLineError::NumberOfPacksBelowOne
    }
}

impl From<PackSizeBelowOne> for InsertSupplierInvoiceLineError {
    fn from(_: PackSizeBelowOne) -> Self {
        InsertSupplierInvoiceLineError::PackSizeBelowOne
    }
}

impl From<LineAlreadyExists> for InsertSupplierInvoiceLineError {
    fn from(_: LineAlreadyExists) -> Self {
        InsertSupplierInvoiceLineError::LineAlreadyExists
    }
}

impl From<WrongInvoiceType> for InsertSupplierInvoiceLineError {
    fn from(_: WrongInvoiceType) -> Self {
        InsertSupplierInvoiceLineError::NotASupplierInvoice
    }
}

impl From<InvoiceIsFinalised> for InsertSupplierInvoiceLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        InsertSupplierInvoiceLineError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for InsertSupplierInvoiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        InsertSupplierInvoiceLineError::InvoiceDoesNotExist
    }
}
