use crate::invoice::{
    check_invoice_exists_option, check_invoice_is_editable, check_invoice_type, check_store,
    InvoiceLinesExist,
};
use repository::{InvoiceRow, InvoiceRowType, StorageConnection};

use super::{DeleteInboundShipment, DeleteInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    input: &DeleteInboundShipment,
    store_id: &str,
) -> Result<InvoiceRow, DeleteInboundShipmentError> {
    use DeleteInboundShipmentError::*;

    let invoice = check_invoice_exists_option(&input.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    // check_invoice_is_empty(&input.id, connection)?; https://github.com/openmsupply/remote-server/issues/839

    Ok(invoice)
}

impl From<InvoiceLinesExist> for DeleteInboundShipmentError {
    fn from(error: InvoiceLinesExist) -> Self {
        DeleteInboundShipmentError::InvoiceLinesExists(error.0)
    }
}
