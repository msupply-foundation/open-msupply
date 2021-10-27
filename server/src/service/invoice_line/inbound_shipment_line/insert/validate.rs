use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceRow, ItemRow},
    },
    domain::{inbound_shipment::InsertInboundShipmentLine, invoice::InvoiceType},
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
        },
        invoice_line::{
            inbound_shipment_line::check_pack_size,
            validate::{
                check_item, check_line_does_not_exists, check_number_of_packs, ItemNotFound,
                LineAlreadyExists, NumberOfPacksBelowOne,
            },
            PackSizeBelowOne,
        },
    },
};

use super::InsertInboundShipmentLineError;

pub fn validate(
    input: &InsertInboundShipmentLine,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), InsertInboundShipmentLineError> {
    check_line_does_not_exists(&input.id, connection)?;
    check_pack_size(Some(input.pack_size))?;
    check_number_of_packs(Some(input.number_of_packs))?;
    let item = check_item(&input.item_id, connection)?;

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::InboundShipment)?;
    check_invoice_finalised(&invoice)?;

    Ok((item, invoice))
}

impl From<ItemNotFound> for InsertInboundShipmentLineError {
    fn from(_: ItemNotFound) -> Self {
        InsertInboundShipmentLineError::ItemNotFound
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

impl From<WrongInvoiceType> for InsertInboundShipmentLineError {
    fn from(_: WrongInvoiceType) -> Self {
        InsertInboundShipmentLineError::NotAnInboundShipment
    }
}

impl From<InvoiceIsFinalised> for InsertInboundShipmentLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        InsertInboundShipmentLineError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for InsertInboundShipmentLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        InsertInboundShipmentLineError::InvoiceDoesNotExist
    }
}
