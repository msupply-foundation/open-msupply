use domain::invoice::InvoiceType;
use repository::{
    schema::{InvoiceRow, ItemRow, ItemType},
    StorageConnection,
};

use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_not_finalised, check_invoice_type,
        InvoiceDoesNotExist, InvoiceIsFinalised, WrongInvoiceType,
    },
    invoice_line::validate::{
        check_item, check_line_does_not_exists, ItemNotFound, LineAlreadyExists,
    },
};

use super::{InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError};

pub fn validate(
    input: &InsertOutboundShipmentServiceLine,
    connection: &StorageConnection,
) -> Result<(ItemRow, InvoiceRow), InsertOutboundShipmentServiceLineError> {
    check_line_does_not_exists(&input.id, connection)?;
    let item = check_item(&input.item_id, connection)?;
    if item.r#type != ItemType::Service {
        return Err(InsertOutboundShipmentServiceLineError::NotAServiceItem);
    }
    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::OutboundShipment)?;
    check_invoice_is_not_finalised(&invoice)?;

    Ok((item, invoice))
}

impl From<LineAlreadyExists> for InsertOutboundShipmentServiceLineError {
    fn from(_: LineAlreadyExists) -> Self {
        InsertOutboundShipmentServiceLineError::LineAlreadyExists
    }
}

impl From<ItemNotFound> for InsertOutboundShipmentServiceLineError {
    fn from(_: ItemNotFound) -> Self {
        InsertOutboundShipmentServiceLineError::ItemNotFound
    }
}

impl From<InvoiceDoesNotExist> for InsertOutboundShipmentServiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        InsertOutboundShipmentServiceLineError::InvoiceDoesNotExist
    }
}

impl From<WrongInvoiceType> for InsertOutboundShipmentServiceLineError {
    fn from(_: WrongInvoiceType) -> Self {
        InsertOutboundShipmentServiceLineError::NotAnOutboundShipment
    }
}

impl From<InvoiceIsFinalised> for InsertOutboundShipmentServiceLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        InsertOutboundShipmentServiceLineError::CannotEditFinalised
    }
}
