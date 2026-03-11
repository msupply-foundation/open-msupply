use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
    inbound_shipment::check_inbound_shipment_mutation_permission,
};
use repository::{InvoiceRow, InvoiceType, StorageConnection};

use super::{DeleteInboundShipment, DeleteInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    input: &DeleteInboundShipment,
    store_id: &str,
    user_id: &str,
) -> Result<InvoiceRow, DeleteInboundShipmentError> {
    use DeleteInboundShipmentError::*;

    let invoice = check_invoice_exists(&input.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }

    // Check permission before revealing further invoice details
    let is_external = invoice.purchase_order_id.is_some();
    check_inbound_shipment_mutation_permission(connection, store_id, user_id, is_external)?;

    if !check_invoice_type(&invoice, InvoiceType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    Ok(invoice)
}
