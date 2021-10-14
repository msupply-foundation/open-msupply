use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceLineRow, InvoiceRow, ItemRow},
    },
    domain::{invoice::InvoiceType, supplier_invoice::UpdateSupplierInvoiceLine},
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
        },
        invoice_line::{
            supplier_invoice_line::{check_batch, check_pack_size},
            validate::{
                check_item_option, check_line_belongs_to_invoice, check_line_exists,
                check_number_of_packs, ItemNotFound, LineDoesNotExist, NotInvoiceLine,
                NumberOfPacksBelowOne,
            },
            BatchIsReserved, PackSizeBelowOne,
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

    let item = check_item_option(&input.item_id, connection)?;

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceType::SupplierInvoice)?;
    check_invoice_finalised(&invoice)?;

    check_batch(&line, connection)?;

    Ok((line, item, invoice))
}

impl From<ItemNotFound> for UpdateSupplierInvoiceLineError {
    fn from(_: ItemNotFound) -> Self {
        UpdateSupplierInvoiceLineError::ItemNotFound
    }
}

impl From<NumberOfPacksBelowOne> for UpdateSupplierInvoiceLineError {
    fn from(_: NumberOfPacksBelowOne) -> Self {
        UpdateSupplierInvoiceLineError::NumberOfPacksBelowOne
    }
}

impl From<PackSizeBelowOne> for UpdateSupplierInvoiceLineError {
    fn from(_: PackSizeBelowOne) -> Self {
        UpdateSupplierInvoiceLineError::PackSizeBelowOne
    }
}

impl From<LineDoesNotExist> for UpdateSupplierInvoiceLineError {
    fn from(_: LineDoesNotExist) -> Self {
        UpdateSupplierInvoiceLineError::LineDoesNotExist
    }
}

impl From<WrongInvoiceType> for UpdateSupplierInvoiceLineError {
    fn from(_: WrongInvoiceType) -> Self {
        UpdateSupplierInvoiceLineError::NotASupplierInvoice
    }
}

impl From<InvoiceIsFinalised> for UpdateSupplierInvoiceLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        UpdateSupplierInvoiceLineError::CannotEditFinalised
    }
}

impl From<NotInvoiceLine> for UpdateSupplierInvoiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        UpdateSupplierInvoiceLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<BatchIsReserved> for UpdateSupplierInvoiceLineError {
    fn from(_: BatchIsReserved) -> Self {
        UpdateSupplierInvoiceLineError::BatchIsReserved
    }
}

impl From<InvoiceDoesNotExist> for UpdateSupplierInvoiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        UpdateSupplierInvoiceLineError::InvoiceDoesNotExist
    }
}
