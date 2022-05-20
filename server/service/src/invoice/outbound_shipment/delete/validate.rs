use super::DeleteOutboundShipmentError;
use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, InvoiceDoesNotExist,
    InvoiceIsNotEditable, InvoiceLinesExist, WrongInvoiceRowType,
};
use repository::{InvoiceRow, InvoiceRowType, StorageConnection};

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteOutboundShipmentError> {
    let invoice = check_invoice_exists(&id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceRowType::OutboundShipment)?;
    check_invoice_is_editable(&invoice)?;

    // check_invoice_is_empty(&id, connection)?; https://github.com/openmsupply/remote-server/issues/839

    Ok(invoice)
}

impl From<WrongInvoiceRowType> for DeleteOutboundShipmentError {
    fn from(_: WrongInvoiceRowType) -> Self {
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
