use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_not_finalised, check_invoice_type,
        validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
    },
    invoice_line::validate::{
        check_item, check_line_belongs_to_invoice, check_line_exists, ItemNotFound,
        LineDoesNotExist, NotInvoiceLine,
    },
};
use domain::{invoice::InvoiceType, outbound_shipment::DeleteOutboundShipmentLine};
use repository::{
    schema::{InvoiceLineRow, ItemType},
    StorageConnection,
};

use super::DeleteOutboundShipmentServiceLineError;

pub fn validate(
    input: &DeleteOutboundShipmentLine,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteOutboundShipmentServiceLineError> {
    let line = check_line_exists(&input.id, connection)?;
    let invoice = check_invoice_exists(&input.invoice_id, connection)?;

    let item = check_item(&line.item_id, connection)?;
    if item.r#type != ItemType::Service {
        return Err(DeleteOutboundShipmentServiceLineError::NotAServiceItem);
    }

    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceType::OutboundShipment)?;
    check_invoice_is_not_finalised(&invoice)?;

    Ok(line)
}

impl From<ItemNotFound> for DeleteOutboundShipmentServiceLineError {
    fn from(_: ItemNotFound) -> Self {
        DeleteOutboundShipmentServiceLineError::ItemNotFound
    }
}

impl From<LineDoesNotExist> for DeleteOutboundShipmentServiceLineError {
    fn from(_: LineDoesNotExist) -> Self {
        DeleteOutboundShipmentServiceLineError::LineDoesNotExist
    }
}

impl From<WrongInvoiceType> for DeleteOutboundShipmentServiceLineError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteOutboundShipmentServiceLineError::NotAnOutboundShipment
    }
}

impl From<InvoiceIsFinalised> for DeleteOutboundShipmentServiceLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        DeleteOutboundShipmentServiceLineError::CannotEditFinalised
    }
}

impl From<NotInvoiceLine> for DeleteOutboundShipmentServiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        DeleteOutboundShipmentServiceLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<InvoiceDoesNotExist> for DeleteOutboundShipmentServiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteOutboundShipmentServiceLineError::InvoiceDoesNotExist
    }
}
