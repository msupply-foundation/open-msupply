use crate::{
    check_item_variant_exists, check_location_exists,
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        stock_in_line::{check_batch, check_pack_size},
        validate::{
            check_item_exists, check_line_belongs_to_invoice, check_line_exists,
            check_number_of_packs,
        },
    },
    NullableUpdate,
};
use repository::{InvoiceLine, InvoiceRow, ItemRow, StorageConnection};

use super::{UpdateStockInLine, UpdateStockInLineError};

pub fn validate(
    input: &UpdateStockInLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(InvoiceLine, Option<ItemRow>, InvoiceRow), UpdateStockInLineError> {
    use UpdateStockInLineError::*;

    let line = check_line_exists(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let line_row = &line.invoice_line_row;

    if !check_pack_size(input.pack_size) {
        return Err(PackSizeBelowOne);
    }
    if !check_number_of_packs(input.number_of_packs) {
        return Err(NumberOfPacksBelowZero);
    }

    let item = check_item_option(&input.item_id, connection)?;

    let invoice =
        check_invoice_exists(&line_row.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_invoice_type(&invoice, input.r#type.to_domain()) {
        return Err(NotAStockIn);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }

    if !check_batch(line_row, connection)? {
        return Err(BatchIsReserved);
    }
    if !check_location_exists(connection, store_id, &input.location)? {
        return Err(LocationDoesNotExist);
    }
    match &input.item_variant_id {
        Some(NullableUpdate {
            value: Some(item_variant_id),
        }) => {
            if check_item_variant_exists(connection, item_variant_id)?.is_none() {
                return Err(ItemVariantDoesNotExist);
            }
        }
        _ => {} //  We don't need to check item_variant if it's not being updated, or if it's being updated to None
    }

    if !check_line_belongs_to_invoice(line_row, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_line_row.invoice_id));
    }

    Ok((line, item, invoice))
}

fn check_item_option(
    item_id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<Option<ItemRow>, UpdateStockInLineError> {
    if let Some(item_id) = item_id_option {
        Ok(Some(
            check_item_exists(connection, item_id)?.ok_or(UpdateStockInLineError::ItemNotFound)?,
        ))
    } else {
        Ok(None)
    }
}
