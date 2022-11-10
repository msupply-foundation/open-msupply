use crate::{
    invoice::{
        check_invoice_exists_option, check_invoice_is_editable, check_invoice_type, check_store,
    },
    invoice_line::{
        check_batch, check_location_exists, check_pack_size,
        validate::{
            check_item, check_line_exists_option, check_number_of_packs, ItemNotFound,
            NotInvoiceLine, NumberOfPacksBelowOne,
        },
        BatchIsReserved, LocationDoesNotExist, PackSizeBelowOne,
    },
};
use repository::{InvoiceLineRow, InvoiceRow, InvoiceRowType, ItemRow, StorageConnection};

use super::{UpdateInboundShipmentLine, UpdateInboundShipmentLineError};

pub fn validate(
    input: &UpdateInboundShipmentLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, Option<ItemRow>, InvoiceRow), UpdateInboundShipmentLineError> {
    use UpdateInboundShipmentLineError::*;

    let line = check_line_exists_option(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    check_pack_size(input.pack_size.clone())?;
    check_number_of_packs(input.number_of_packs.clone())?;

    let item = check_item_option(&input.item_id, connection)?;

    let invoice =
        check_invoice_exists_option(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }

    if !check_batch(&line, connection)? {
        return Err(BatchIsReserved);
    }

    if !check_location_exists(&input.location_id, connection)? {
        return Err(LocationDoesNotExist);
    }

    // TODO: StockLineDoesNotBelongToCurrentStore
    // TODO: LocationDoesNotBelongToCurrentStore

    Ok((line, item, invoice))
}

fn check_item_option(
    item_id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<Option<ItemRow>, UpdateInboundShipmentLineError> {
    if let Some(item_id) = item_id_option {
        Ok(Some(check_item(item_id, connection)?))
    } else {
        Ok(None)
    }
}

impl From<ItemNotFound> for UpdateInboundShipmentLineError {
    fn from(_: ItemNotFound) -> Self {
        UpdateInboundShipmentLineError::ItemNotFound
    }
}

impl From<LocationDoesNotExist> for UpdateInboundShipmentLineError {
    fn from(_: LocationDoesNotExist) -> Self {
        UpdateInboundShipmentLineError::LocationDoesNotExist
    }
}

impl From<NumberOfPacksBelowOne> for UpdateInboundShipmentLineError {
    fn from(_: NumberOfPacksBelowOne) -> Self {
        UpdateInboundShipmentLineError::NumberOfPacksBelowOne
    }
}

impl From<PackSizeBelowOne> for UpdateInboundShipmentLineError {
    fn from(_: PackSizeBelowOne) -> Self {
        UpdateInboundShipmentLineError::PackSizeBelowOne
    }
}

impl From<NotInvoiceLine> for UpdateInboundShipmentLineError {
    fn from(error: NotInvoiceLine) -> Self {
        UpdateInboundShipmentLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<BatchIsReserved> for UpdateInboundShipmentLineError {
    fn from(_: BatchIsReserved) -> Self {
        UpdateInboundShipmentLineError::BatchIsReserved
    }
}
