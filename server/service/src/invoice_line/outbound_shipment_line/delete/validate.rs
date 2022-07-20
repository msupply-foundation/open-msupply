use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_type,
        validate::InvoiceIsNotEditable, InvoiceDoesNotExist, WrongInvoiceRowType,
    },
    invoice_line::validate::{check_line_exists, LineDoesNotExist, NotInvoiceLine},
};
use repository::{InvoiceLineRow, InvoiceRowType, StorageConnection};

use super::{DeleteOutboundShipmentLine, DeleteOutboundShipmentLineError};

pub fn validate(
    input: &DeleteOutboundShipmentLine,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteOutboundShipmentLineError> {
    let line = check_line_exists(&input.id, connection)?;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?;

    check_invoice_type(&invoice, InvoiceRowType::OutboundShipment)?;
    check_invoice_is_editable(&invoice)?;

    Ok(line)
}

impl From<LineDoesNotExist> for DeleteOutboundShipmentLineError {
    fn from(_: LineDoesNotExist) -> Self {
        DeleteOutboundShipmentLineError::LineDoesNotExist
    }
}

impl From<WrongInvoiceRowType> for DeleteOutboundShipmentLineError {
    fn from(_: WrongInvoiceRowType) -> Self {
        DeleteOutboundShipmentLineError::NotAnOutboundShipment
    }
}

impl From<InvoiceIsNotEditable> for DeleteOutboundShipmentLineError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        DeleteOutboundShipmentLineError::CannotEditInvoice
    }
}

impl From<NotInvoiceLine> for DeleteOutboundShipmentLineError {
    fn from(error: NotInvoiceLine) -> Self {
        DeleteOutboundShipmentLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<InvoiceDoesNotExist> for DeleteOutboundShipmentLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteOutboundShipmentLineError::InvoiceDoesNotExist
    }
}
