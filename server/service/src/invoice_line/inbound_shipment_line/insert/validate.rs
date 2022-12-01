use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        check_location_exists,
        inbound_shipment_line::check_pack_size,
        validate::{check_item_exists, check_line_does_not_exist, check_number_of_packs},
    },
};
use repository::{InvoiceRow, InvoiceRowType, ItemRow, StorageConnection};

use super::{InsertInboundShipmentLine, InsertInboundShipmentLineError};

pub fn validate(
    input: &InsertInboundShipmentLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), InsertInboundShipmentLineError> {
    use InsertInboundShipmentLineError::*;

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

    if !check_location_exists(&input.location_id, connection)? {
        return Err(LocationDoesNotExist);
    }

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    };
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    // TODO: StockLineDoesNotBelongToCurrentStore
    // TODO: LocationDoesNotBelongToCurrentStore

    Ok((item, invoice))
}
