use crate::invoice::{
    check_invoice_exists, check_invoice_is_empty, check_invoice_is_not_finalised,
    check_invoice_type, InvoiceDoesNotExist, InvoiceIsFinalised, InvoiceLinesExist,
    WrongInvoiceType,
};
use domain::{inbound_shipment::DeleteInboundShipment, invoice::InvoiceType};
use repository::{schema::InvoiceRow, StorageConnection};

use super::DeleteInboundShipmentError;

pub fn validate(
    input: &DeleteInboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteInboundShipmentError> {
    let invoice = check_invoice_exists(&input.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::InboundShipment)?;
    check_invoice_is_not_finalised(&invoice)?;
    check_invoice_is_empty(&input.id, connection)?;

    Ok(invoice)
}

impl From<WrongInvoiceType> for DeleteInboundShipmentError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteInboundShipmentError::NotAnInboundShipment
    }
}

impl From<InvoiceIsFinalised> for DeleteInboundShipmentError {
    fn from(_: InvoiceIsFinalised) -> Self {
        DeleteInboundShipmentError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for DeleteInboundShipmentError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteInboundShipmentError::InvoiceDoesNotExist
    }
}

impl From<InvoiceLinesExist> for DeleteInboundShipmentError {
    fn from(error: InvoiceLinesExist) -> Self {
        DeleteInboundShipmentError::InvoiceLinesExists(error.0)
    }
}
