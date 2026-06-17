use crate::invoice::{check_invoice_exists, check_invoice_type, check_store};
use repository::{InvoiceRow, InvoiceType, StorageConnection};

use super::DuplicateOutboundShipmentError;

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    source_id: &str,
) -> Result<InvoiceRow, DuplicateOutboundShipmentError> {
    use DuplicateOutboundShipmentError::*;

    let source_invoice = check_invoice_exists(source_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&source_invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }

    if !check_invoice_type(&source_invoice, InvoiceType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }

    Ok(source_invoice)
}
