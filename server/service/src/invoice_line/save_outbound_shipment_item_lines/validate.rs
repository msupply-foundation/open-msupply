use repository::{InvoiceType, StorageConnection};

use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::save_outbound_shipment_item_lines::SaveOutboundShipmentLinesError,
};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<(), SaveOutboundShipmentLinesError> {
    use SaveOutboundShipmentLinesError::*;

    let outbound = check_invoice_exists(id, connection)?.ok_or(OutboundShipmentNotFound)?;

    if !check_store(&outbound, store_id) {
        return Err(InvoiceDoesNotBelongToCurrentStore);
    }
    if !check_invoice_is_editable(&outbound) {
        return Err(InvoiceNotEditable);
    }
    if !check_invoice_type(&outbound, InvoiceType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }

    Ok(())
}
