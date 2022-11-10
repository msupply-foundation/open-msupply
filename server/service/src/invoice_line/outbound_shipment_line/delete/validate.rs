use crate::{
    invoice::{
        check_invoice_exists_option, check_invoice_is_editable, check_invoice_type, check_store,
    },
    invoice_line::validate::{check_line_exists_option, NotInvoiceLine},
};
use repository::{InvoiceLineRow, InvoiceRowType, StorageConnection};

use super::{DeleteOutboundShipmentLine, DeleteOutboundShipmentLineError};

pub fn validate(
    input: &DeleteOutboundShipmentLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteOutboundShipmentLineError> {
    use DeleteOutboundShipmentLineError::*;

    let line = check_line_exists_option(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice =
        check_invoice_exists_option(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditInvoice);
    }

    Ok(line)
}

impl From<NotInvoiceLine> for DeleteOutboundShipmentLineError {
    fn from(error: NotInvoiceLine) -> Self {
        DeleteOutboundShipmentLineError::NotThisInvoiceLine(error.0)
    }
}
