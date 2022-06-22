use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_type,
        validate::InvoiceIsNotEditable, InvoiceDoesNotExist, WrongInvoiceRowType,
    },
    invoice_line::{
        validate::{
            check_line_exists, LineDoesNotExist, NotInvoiceLine,
        },
        DeleteOutboundShipmentLine,
    },
};
use repository::{InvoiceLineRow, InvoiceRowType, StorageConnection};

use super::DeleteOutboundShipmentServiceLineError;

pub fn validate(
    input: &DeleteOutboundShipmentLine,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteOutboundShipmentServiceLineError> {
    let line = check_line_exists(&input.id, connection)?;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?;

    check_invoice_type(&invoice, InvoiceRowType::OutboundShipment)?;
    check_invoice_is_editable(&invoice)?;

    Ok(line)
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
        DeleteOutboundShipmentServiceLineError::CannotEditInvoice
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
