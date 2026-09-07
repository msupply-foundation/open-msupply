use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceType, ItemRow, ItemType,
    StorageConnection,
};

use crate::{
    invoice::{check_invoice_exists, check_store, is_generated_dispensation},
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
    // (spec/prescriptions § prescribed quantity). Re-sending the recorded value
    // passes — both front ends echo it back on every line save of the item, so
    // refusing on mention rather than on change would break allocation on
    // exactly the records this protects.
    if is_generated_dispensation(&invoice_row)
        && recorded_prescribed_quantity(connection, &input.invoice_id, &input.item_id)?
            != Some(input.prescribed_quantity)
    {
        return Err(SetPrescribedQuantityError::CannotChangePrescribedQuantity);
    }

    Ok(item_row)
}

/// The prescribed quantity recorded for an item on an invoice. It lives on
/// whichever ONE of the item's lines carries it — `set_prescribed_quantity`
/// keeps it to a single line — so this reads the first that has one.
fn recorded_prescribed_quantity(
    connection: &StorageConnection,
    invoice_id: &str,
    item_id: &str,
) -> Result<Option<f64>, SetPrescribedQuantityError> {
    let lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_id.to_string()))
            .item_id(EqualFilter::equal_to(item_id.to_string())),
    )?;

    Ok(lines
        .iter()
        .find_map(|line| line.invoice_line_row.prescribed_quantity))
}
