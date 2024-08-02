use crate::{
    check_location_exists,
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        stock_in_line::check_pack_size,
        validate::{check_item_exists, check_line_exists, check_number_of_packs},
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
    if (check_line_exists(connection, &input.id)?).is_some() {
        return Err(LineAlreadyExists);
    }
    if !check_pack_size(Some(input.pack_size)) {
        return Err(PackSizeBelowOne);
    }
    if !check_number_of_packs(Some(input.number_of_packs)) {
        return Err(NumberOfPacksBelowZero);
    }

    let item = check_item_exists(connection, &input.item_id)?.ok_or(ItemNotFound)?;
    if !check_location_exists(connection, store_id, &input.location)? {
        return Err(LocationDoesNotExist);
    }

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    };
    if !check_invoice_type(&invoice, input.r#type.to_domain()) {
        return Err(NotAStockIn);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    // TODO: LocationDoesNotBelongToCurrentStore

    Ok((item, invoice))
}
