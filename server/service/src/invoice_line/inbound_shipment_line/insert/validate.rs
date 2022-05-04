use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_type,
        validate::InvoiceIsNotEditable, InvoiceDoesNotExist, WrongInvoiceRowType,
    },
    invoice_line::{
        check_location_exists,
        inbound_shipment_line::check_pack_size,
        validate::{
            check_item, check_line_does_not_exists, check_number_of_packs, ItemNotFound,
            LineAlreadyExists, NumberOfPacksBelowOne,
        },
        LocationDoesNotExist, PackSizeBelowOne,
    },
};
use repository::{InvoiceRow, InvoiceRowType, ItemRow, StorageConnection};

use super::{InsertInboundShipmentLine, InsertInboundShipmentLineError};

pub fn validate(
    input: &InsertInboundShipmentLine,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), InsertInboundShipmentLineError> {
    check_line_does_not_exists(&input.id, connection)?;
    check_pack_size(Some(input.pack_size))?;
    check_number_of_packs(Some(input.number_of_packs))?;
    let item = check_item(&input.item_id, connection)?;

    check_location_exists(&input.location_id, connection)?;

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    check_invoice_type(&invoice, InvoiceRowType::InboundShipment)?;
    check_invoice_is_editable(&invoice)?;

    // TODO: InvoiceDoesNotBelongToCurrentStore
    // TODO: StockLineDoesNotBelongToCurrentStore
    // TODO: LocationDoesNotBelongToCurrentStore

    Ok((item, invoice))
}

impl From<ItemNotFound> for InsertInboundShipmentLineError {
    fn from(_: ItemNotFound) -> Self {
        InsertInboundShipmentLineError::ItemNotFound
    }
}

impl From<LocationDoesNotExist> for InsertInboundShipmentLineError {
    fn from(_: LocationDoesNotExist) -> Self {
        InsertInboundShipmentLineError::LocationDoesNotExist
    }
}

impl From<NumberOfPacksBelowOne> for InsertInboundShipmentLineError {
    fn from(_: NumberOfPacksBelowOne) -> Self {
        InsertInboundShipmentLineError::NumberOfPacksBelowOne
    }
}

impl From<PackSizeBelowOne> for InsertInboundShipmentLineError {
    fn from(_: PackSizeBelowOne) -> Self {
        InsertInboundShipmentLineError::PackSizeBelowOne
    }
}

impl From<LineAlreadyExists> for InsertInboundShipmentLineError {
    fn from(_: LineAlreadyExists) -> Self {
        InsertInboundShipmentLineError::LineAlreadyExists
    }
}

impl From<WrongInvoiceRowType> for InsertInboundShipmentLineError {
    fn from(_: WrongInvoiceRowType) -> Self {
        InsertInboundShipmentLineError::NotAnInboundShipment
    }
}

impl From<InvoiceIsNotEditable> for InsertInboundShipmentLineError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        InsertInboundShipmentLineError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for InsertInboundShipmentLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        InsertInboundShipmentLineError::InvoiceDoesNotExist
    }
}
