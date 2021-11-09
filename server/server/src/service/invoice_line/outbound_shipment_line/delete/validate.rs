use crate::service::{
    invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_type,
        validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
    },
    invoice_line::validate::{
        check_line_belongs_to_invoice, check_line_exists, LineDoesNotExist, NotInvoiceLine,
    },
};
use domain::{invoice::InvoiceType, outbound_shipment::DeleteOutboundShipmentLine};
use repository::{repository::StorageConnection, schema::InvoiceLineRow};

use super::DeleteOutboundShipmentLineError;

pub fn validate(
    input: &DeleteOutboundShipmentLine,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteOutboundShipmentLineError> {
    let line = check_line_exists(&input.id, connection)?;
    let invoice = check_invoice_exists(&input.invoice_id, connection)?;

    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceType::OutboundShipment)?;
    check_invoice_finalised(&invoice)?;

    Ok(line)
}

impl From<LineDoesNotExist> for DeleteOutboundShipmentLineError {
    fn from(_: LineDoesNotExist) -> Self {
        DeleteOutboundShipmentLineError::LineDoesNotExist
    }
}

impl From<WrongInvoiceType> for DeleteOutboundShipmentLineError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteOutboundShipmentLineError::NotAnOutboundShipment
    }
}

impl From<InvoiceIsFinalised> for DeleteOutboundShipmentLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        DeleteOutboundShipmentLineError::CannotEditFinalised
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
