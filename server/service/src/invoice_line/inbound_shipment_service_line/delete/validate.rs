use crate::{
    invoice::{
        check_invoice_exists_option, check_invoice_is_editable, check_invoice_type, check_store,
    },
    invoice_line::{
        validate::{check_line_exists_option, NotInvoiceLine},
        DeleteInboundShipmentLine,
    },
};
use repository::{InvoiceLineRow, InvoiceRowType, StorageConnection};

use super::DeleteInboundShipmentServiceLineError;

pub fn validate(
    input: &DeleteInboundShipmentLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteInboundShipmentServiceLineError> {
    use DeleteInboundShipmentServiceLineError::*;

    let line = check_line_exists_option(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice =
        check_invoice_exists_option(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditInvoice);
    }

    Ok(line)
}

impl From<NotInvoiceLine> for DeleteInboundShipmentServiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        DeleteInboundShipmentServiceLineError::NotThisInvoiceLine(error.0)
    }
}
