use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        stock_in_line::DeleteStockInLine,
        validate::{check_line_belongs_to_invoice, check_line_row_exists_option},
    },
};
use repository::{InvoiceLineRow, InvoiceType, StorageConnection};

use super::DeleteInboundShipmentServiceLineError;

pub fn validate(
    input: &DeleteStockInLine,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteInboundShipmentServiceLineError> {
    use DeleteInboundShipmentServiceLineError::*;

    let line = check_line_row_exists(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let invoice = check_invoice_exists(&line.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditInvoice);
    }
    if !check_line_belongs_to_invoice(&line, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_id));
    }

    Ok(line)
}
