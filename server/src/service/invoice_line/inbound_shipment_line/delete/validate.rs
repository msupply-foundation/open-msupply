use crate::{
    database::{repository::StorageConnection, schema::InvoiceLineRow},
    domain::{inbound_shipment::DeleteInboundShipmentLine, invoice::InvoiceType},
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
        },
        invoice_line::{
            inbound_shipment_line::check_batch,
            validate::{
                check_line_belongs_to_invoice, check_line_exists, LineDoesNotExist, NotInvoiceLine,
            },
            BatchIsReserved,
        },
    },
};

use super::DeleteInboundShipmentLineError;

pub fn validate(
    input: &DeleteInboundShipmentLine,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteInboundShipmentLineError> {
    let line = check_line_exists(&input.id, connection)?;

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceType::InboundShipment)?;
    check_invoice_finalised(&invoice)?;
    check_batch(&line, connection)?;

    Ok(line)
}

impl From<LineDoesNotExist> for DeleteInboundShipmentLineError {
    fn from(_: LineDoesNotExist) -> Self {
        DeleteInboundShipmentLineError::LineDoesNotExist
    }
}

impl From<WrongInvoiceType> for DeleteInboundShipmentLineError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteInboundShipmentLineError::NotAnInboundShipment
    }
}

impl From<InvoiceIsFinalised> for DeleteInboundShipmentLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        DeleteInboundShipmentLineError::CannotEditFinalised
    }
}

impl From<NotInvoiceLine> for DeleteInboundShipmentLineError {
    fn from(error: NotInvoiceLine) -> Self {
        DeleteInboundShipmentLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<BatchIsReserved> for DeleteInboundShipmentLineError {
    fn from(_: BatchIsReserved) -> Self {
        DeleteInboundShipmentLineError::BatchIsReserved
    }
}

impl From<InvoiceDoesNotExist> for DeleteInboundShipmentLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteInboundShipmentLineError::InvoiceDoesNotExist
    }
}
