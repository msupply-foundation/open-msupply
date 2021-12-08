use domain::invoice::InvoiceType;
use repository::{schema::InvoiceRow, StorageConnection};

use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_is_empty, check_invoice_type,
    InvoiceDoesNotExist, InvoiceIsNotEditable, InvoiceLinesExist, WrongInvoiceType,
};

use super::DeleteOutboundShipmentError;

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteOutboundShipmentError> {
    let invoice = check_invoice_exists(&id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::OutboundShipment)?;
    check_invoice_is_editable(&invoice)?;
    check_invoice_is_empty(&id, connection)?;

    Ok(invoice)
}

impl From<WrongInvoiceType> for DeleteOutboundShipmentError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteOutboundShipmentError::NotAnOutboundShipment
    }
}

impl From<InvoiceIsNotEditable> for DeleteOutboundShipmentError {
    fn from(_: InvoiceIsNotEditable) -> Self {
        DeleteOutboundShipmentError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for DeleteOutboundShipmentError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteOutboundShipmentError::InvoiceDoesNotExist
    }
}

impl From<InvoiceLinesExist> for DeleteOutboundShipmentError {
    fn from(error: InvoiceLinesExist) -> Self {
        DeleteOutboundShipmentError::InvoiceLinesExists(error.0)
    }
}
