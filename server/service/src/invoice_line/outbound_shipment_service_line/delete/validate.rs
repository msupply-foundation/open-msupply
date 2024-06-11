use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        stock_out_line::delete::DeleteStockOutLine,
        validate::{check_line_belongs_to_invoice, check_line_row_exists},
    },
};
use repository::{InvoiceLineRow, InvoiceType, StorageConnection};

use super::DeleteOutboundShipmentServiceLineError;

pub fn validate(
    input: &DeleteStockOutLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteOutboundShipmentServiceLineError> {
    use DeleteOutboundShipmentServiceLineError::*;

    let line = check_line_row_exists(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditInvoice);
    }
    if !check_line_belongs_to_invoice(&line, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_id));
    }

    Ok(line)
}
