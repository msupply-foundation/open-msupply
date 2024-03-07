use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        check_location_exists, check_pack_size,
        validate::{check_item_exists, check_line_does_not_exist, check_number_of_packs},
    },
};
use repository::{InvoiceRow, ItemRow, StorageConnection};

use super::{InsertStockInLine, InsertStockInLineError};

pub fn validate(
    input: &InsertStockInLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), InsertStockInLineError> {
    use InsertStockInLineError::*;

    if !check_line_does_not_exist(connection, &input.id)? {
        return Err(LineAlreadyExists);
    }
    if !check_pack_size(Some(input.pack_size)) {
        return Err(PackSizeBelowOne);
    }
    if !check_number_of_packs(Some(input.number_of_packs)) {
        return Err(NumberOfPacksBelowOne);
    }

    let item = check_item_exists(connection, &input.item_id)?.ok_or(ItemNotFound)?;
    if let Some(location) = &input.location {
        if !check_location_exists(&location.value, connection)? {
            return Err(LocationDoesNotExist);
        }
    }

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    };
    if !check_invoice_type(&invoice, input.r#type.to_domain()) {
        return Err(NotAnStockIn);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    // TODO: StockLineDoesNotBelongToCurrentStore
    // TODO: LocationDoesNotBelongToCurrentStore

    Ok((item, invoice))
}
