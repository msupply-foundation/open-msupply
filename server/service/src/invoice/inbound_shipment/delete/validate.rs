use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
};
use repository::{InvoiceRow, InvoiceType, StorageConnection};

use super::{super::InboundShipmentType, DeleteInboundShipment, DeleteInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    input: &DeleteInboundShipment,
    store_id: &str,
    r#type: InboundShipmentType,
) -> Result<InvoiceRow, DeleteInboundShipmentError> {
    use DeleteInboundShipmentError::*;

    let invoice = check_invoice_exists(&input.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }

    if !check_invoice_type(&invoice, InvoiceType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !r#type.matches_input(invoice.purchase_order_id.is_some()) {
        return Err(WrongInboundShipmentType);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }

    Ok(invoice)
}
