use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
    InvoiceDoesNotExist, InvoiceIsNotEditable, InvoiceLinesExist, NotThisStoreInvoice,
    WrongInvoiceRowType,
};
use repository::{InvoiceRow, InvoiceRowType, StorageConnection};

use super::{DeleteInboundShipment, DeleteInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    input: &DeleteInboundShipment,
    store_id: &str,
) -> Result<InvoiceRow, DeleteInboundShipmentError> {
    let invoice = check_invoice_exists(&input.id, connection)?;

    check_store(&invoice, store_id)?;
    check_invoice_type(&invoice, InvoiceRowType::InboundShipment)?;
    check_invoice_is_editable(&invoice)?;

    // check_invoice_is_empty(&input.id, connection)?; https://github.com/openmsupply/remote-server/issues/839

    Ok(invoice)
}

impl From<WrongInvoiceRowType> for DeleteInboundShipmentError {
    fn from(_: WrongInvoiceRowType) -> Self {
        DeleteInboundShipmentError::NotAnInboundShipment
    }
}

impl From<InvoiceIsNotEditable> for DeleteInboundShipmentError {
    fn from(_: InvoiceIsNotEditable) -> Self {
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

impl From<NotThisStoreInvoice> for DeleteInboundShipmentError {
    fn from(_: NotThisStoreInvoice) -> Self {
        DeleteInboundShipmentError::NotThisStoreInvoice
    }
}
