use repository::{InvoiceType, ItemRow, ItemType, StorageConnection};

use crate::{
    invoice::{
        check_invoice_exists, check_store, is_generated_dispensation,
        prescriber_prescribed_quantity,
    },
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

    // On a generated dispensation the figure is the prescriber's: shown, never
    // offered for entry, and refused here if a change reaches the wire anyway
    // (spec/prescriptions § prescribed quantity). Read-only covers the whole
    // record, so an item the dispenser adds — one the prescriber ordered none
    // of — has no writable figure either, and stays at nothing.
    //
    // Re-sending the prescriber's own figure passes: both front ends echo it
    // back on every line save of the item, so refusing on mention rather than
    // on change would break allocation on exactly the records this protects.
    // Measured against the REQUEST, not the dispensation's own lines — the save
    // that allocates stock deletes the line holding the figure before
    // re-applying it, so a line-based comparison refused the dispenser's first
    // allocation on every prescribed item.
    if is_generated_dispensation(&invoice_row)
        && prescriber_prescribed_quantity(connection, &invoice_row, &input.item_id)?
            != Some(input.prescribed_quantity)
    {
        return Err(SetPrescribedQuantityError::CannotChangePrescribedQuantity);
    }

    Ok(item_row)
}
