use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_type,
        validate::InvoiceIsNotEditable, InvoiceDoesNotExist, WrongInvoiceRowType,
    },
    invoice_line::{validate::{
        check_item, check_line_belongs_to_invoice, check_line_exists, ItemNotFound,
        LineDoesNotExist, NotInvoiceLine,
    }, DeleteOutboundShipmentLine},
};
use repository::{
    schema::{InvoiceLineRow, ItemRowType, InvoiceRowType},
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
    if item.r#type != ItemRowType::Service {
        return Err(DeleteOutboundShipmentServiceLineError::NotAServiceItem);
    }

    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceRowType::OutboundShipment)?;
    check_invoice_is_editable(&invoice)?;

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

impl From<WrongInvoiceRowType> for DeleteOutboundShipmentServiceLineError {
    fn from(_: WrongInvoiceRowType) -> Self {
        DeleteOutboundShipmentServiceLineError::NotAnOutboundShipment
    }
}

impl From<InvoiceIsNotEditable> for DeleteOutboundShipmentServiceLineError {
    fn from(_: InvoiceIsNotEditable) -> Self {
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
