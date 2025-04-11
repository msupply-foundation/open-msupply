use repository::{InvoiceType, ItemRow, ItemType, StorageConnection};

use crate::{
    invoice::{check_invoice_exists, check_store},
    invoice_line::validate::check_item_exists,
};

use super::{SetPrescribedQuantity, SetPrescribedQuantityError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &SetPrescribedQuantity,
) -> Result<ItemRow, SetPrescribedQuantityError> {
    let item_row = check_item_exists(connection, &input.item_id)?
        .ok_or(SetPrescribedQuantityError::ItemNotFound)?;

    if item_row.r#type != ItemType::Stock {
        return Err(SetPrescribedQuantityError::NotAStockItem);
    }

    let invoice_row = check_invoice_exists(&input.invoice_id, connection)?
        .ok_or(SetPrescribedQuantityError::InvoiceDoesNotExist)?;
    if !check_store(&invoice_row, store_id) {
        return Err(SetPrescribedQuantityError::NotThisStoreInvoice);
    }

    if invoice_row.r#type != InvoiceType::Prescription {
        return Err(SetPrescribedQuantityError::NotAPrescription);
    }

    Ok(item_row)
}
