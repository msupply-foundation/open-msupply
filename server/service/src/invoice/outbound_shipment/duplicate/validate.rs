use crate::invoice::{check_invoice_exists, check_invoice_type, check_store};
use crate::validate::get_other_party;
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

    let customer_is_active = get_other_party(connection, store_id, &source_invoice.name_id)?
        .map(|customer| customer.is_visible())
        .unwrap_or(false);
    if !customer_is_active {
        return Err(CustomerIsInactive);
    }

    Ok(source_invoice)
}
